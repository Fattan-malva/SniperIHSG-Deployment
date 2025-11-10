const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const parse = require('csv-parse/sync'); // install: npm i csv-parse

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Fungsi untuk mengambil semua kode saham dari file lokal
function getAllIDXStockCodes() {
    const csvText = fs.readFileSync('./resource/stockcode.csv', 'utf8');
    const records = parse.parse(csvText, { columns: true, skip_empty_lines: true });
    return records.map(rec => rec.Code?.trim() + '.JK').filter(Boolean);
}

// Fungsi untuk mengambil data saham
async function getStockData() {
    try {
        console.log('Mengambil data saham dari Yahoo Finance...');
        const IDX_STOCKS = getAllIDXStockCodes(); // <-- dinamis
        const results = await yahooFinance.quote(IDX_STOCKS);
        const formattedData = results.map(stock => ({
            symbol: stock.symbol,
            name: stock.shortName || stock.longName || 'N/A',
            price: stock.regularMarketPrice || 0,
            change: stock.regularMarketChange || 0,
            changePercent: stock.regularMarketChangePercent || 0,
            volume: stock.regularMarketVolume || 0,
            marketCap: stock.marketCap || 0,
            currency: stock.currency || 'IDR',
            lastUpdated: new Date().toISOString(),
            dayHigh: stock.regularMarketDayHigh || 0,
            dayLow: stock.regularMarketDayLow || 0,
            open: stock.regularMarketOpen || 0,
            previousClose: stock.regularMarketPreviousClose || 0
        }));
        return formattedData;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw error;
    }
}

// Tambahkan cache dan waktu update
let cachedStocks = [];
let lastUpdate = null;

// Fungsi untuk refresh cache
async function refreshStockCache() {
    try {
        cachedStocks = await getStockData();
        lastUpdate = new Date();
        console.log(`[CACHE] Data saham di-refresh pada ${lastUpdate.toLocaleTimeString()}`);
    } catch (err) {
        console.error('[CACHE] Gagal refresh data saham:', err.message);
    }
}

// Refresh pertama saat server start
refreshStockCache();
// Set interval refresh setiap 1 menit
setInterval(refreshStockCache, 60 * 1000);

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'IDX Stock Market API',
        endpoints: {
            allStocks: '/api/stocks',
            singleStock: '/api/stocks/:symbol',
            marketSummary: '/api/summary'
        },
        documentation: 'Gunakan endpoint di atas untuk mendapatkan data saham IDX'
    });
});

// Get all stocks
app.get('/api/stocks', (req, res) => {
    res.json({
        success: true,
        count: cachedStocks.length,
        data: cachedStocks,
        lastUpdate,
        timestamp: new Date().toISOString()
    });
});

// Get single stock by symbol
app.get('/api/stocks/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        
        // Pastikan symbol memiliki .JK
        const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.JK`;
        
        const stock = await yahooFinance.quote(formattedSymbol);
        
        const formattedData = {
            symbol: stock.symbol,
            name: stock.shortName || stock.longName || 'N/A',
            price: stock.regularMarketPrice || 0,
            change: stock.regularMarketChange || 0,
            changePercent: stock.regularMarketChangePercent || 0,
            volume: stock.regularMarketVolume || 0,
            marketCap: stock.marketCap || 0,
            currency: stock.currency || 'IDR',
            lastUpdated: new Date().toISOString(),
            dayHigh: stock.regularMarketDayHigh || 0,
            dayLow: stock.regularMarketDayLow || 0,
            open: stock.regularMarketOpen || 0,
            previousClose: stock.regularMarketPreviousClose || 0,
            fullData: stock
        };
        
        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Saham tidak ditemukan',
            error: error.message
        });
    }
});

// Get market summary
app.get('/api/summary', (req, res) => {
    const stocks = cachedStocks;
    const summary = {
        totalStocks: stocks.length,
        totalMarketCap: stocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0),
        gainers: stocks.filter(stock => stock.change > 0).length,
        losers: stocks.filter(stock => stock.change < 0).length,
        unchanged: stocks.filter(stock => stock.change === 0).length,
        topGainers: stocks.filter(stock => stock.change > 0)
                        .sort((a, b) => b.changePercent - a.changePercent)
                        .slice(0, 5),
        topLosers: stocks.filter(stock => stock.change < 0)
                        .sort((a, b) => a.changePercent - b.changePercent)
                        .slice(0, 5),
        mostActive: stocks.slice().sort((a, b) => b.volume - a.volume).slice(0, 5),
        lastUpdate,
        timestamp: new Date().toISOString()
    };
    res.json({
        success: true,
        data: summary
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan internal server',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📊 API Stock IDX siap digunakan`);
    console.log(`📍 Endpoint: http://localhost:${PORT}/api/stocks`);
});
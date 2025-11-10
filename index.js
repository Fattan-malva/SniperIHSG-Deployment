const readline = require("readline");
const colors = require("colors");

// Theme
colors.setTheme({
  main: "green",
  accent: "brightGreen",
  warn: "yellow",
  danger: "red",
  info: "cyan",
  faded: "grey",
  highlight: ["black", "bgGreen"],
  tableHead: ["green", "bold"],
  tableCell: "brightGreen",
});

// buat rl global
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log(
    `
========================================
     IDX SCALPING SNIPER MENU UTAMA
========================================
1. Screening Saham Momentum Scalping
2. Analisa Saham Tertentu
3. Screening Warran
0. Keluar
`.info
  );

  rl.question("Pilih menu (1/2/3/0): ", (answer) => {
    if (answer === "1") {
      const runScreeningOnce = require("./logic/Screnning");
      runScreeningOnce(showMenu, rl);
    } else if (answer === "2") {
      const runAnalisaSaham = require("./logic/AnalisaSaham");
      runAnalisaSaham(showMenu, rl);
    } else if (answer === "3") {
      const runWarrantScreener = require("./logic/WarrantScreener");
      runWarrantScreener(showMenu, rl);
    } else {
      console.log("Keluar...".faded);
      rl.close();
      process.exit(0);
    }
  });
}

showMenu();

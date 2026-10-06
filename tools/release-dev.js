// Gera dropdowntable-dev.json apontando para o commit atual (HEAD) via jsDelivr.
//
//   node tools/release-dev.js           → gera o JSON
//   node tools/release-dev.js --check   → gera e confere no CDN (precisa do push feito)
//
// O widget DEV usa id "dropdowntable_dev" e tags "-dev" (passados via ?tag=), então convive
// com o widget de produção na mesma story.
const lib = require("./lib");

async function main() {
  lib.assertCommitted([lib.MAIN_FILE, lib.STYLE_FILE]);
  // Último commit que alterou o widget/painel: o JSON não muda ao commitar só o próprio JSON
  const sha = lib.git(["log", "-1", "--format=%H", "--", lib.MAIN_FILE, lib.STYLE_FILE]).toString().trim();
  const base = lib.readJson("dropdowntable.json");

  const dev = JSON.parse(JSON.stringify(base));
  dev.id = "dropdowntable_dev";
  dev.name = base.name + " (DEV)";
  dev.newInstancePrefix = "dropdowntableDev";
  dev.description = "[DEV @ " + sha.slice(0, 7) + "] " + base.description;

  const files = { main: lib.MAIN_FILE, styling: lib.STYLE_FILE };
  for (const wc of dev.webcomponents) {
    const file = files[wc.kind];
    if (!file) { continue; }
    wc.tag = wc.tag.replace(/-dev$/, "") + "-dev";
    wc.url = lib.cdnUrl(sha, file, wc.tag);
    wc.integrity = lib.sriOf(sha, file);
  }
  lib.writeJson("dropdowntable-dev.json", dev);
  console.log("dropdowntable-dev.json → " + sha.slice(0, 7) + " (v" + dev.version + ")");

  if (process.argv.includes("--check")) {
    for (const wc of dev.webcomponents) {
      console.log("  " + wc.kind + ": " + await lib.verifyUrl(wc.url, wc.integrity));
    }
  } else {
    console.log("Depois do push, rode com --check para conferir o CDN; então importe o JSON no SAC.");
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

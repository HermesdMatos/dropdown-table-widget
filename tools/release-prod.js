// Atualiza dropdowntable.json (produção) para uma versão marcada com tag git.
//
//   git tag v2.13.0 && git push origin v2.13.0
//   node tools/release-prod.js v2.13.0 --check
//
// As URLs ficam fixas no tag via jsDelivr (imutável). Para voltar atrás basta reimportar
// no SAC o JSON da versão anterior — o GitHub Pages sobrescrevia o arquivo e impedia isso.
const lib = require("./lib");

async function main() {
  const tag = process.argv[2];
  if (!tag || tag.startsWith("--")) {
    throw new Error("Uso: node tools/release-prod.js <tag> [--check]   (ex: v2.13.0)");
  }
  lib.resolveRef(tag); // falha se o tag não existir
  const prod = lib.readJson("dropdowntable.json");
  prod.version = tag.replace(/^v/, "");

  const files = { main: lib.MAIN_FILE, styling: lib.STYLE_FILE };
  for (const wc of prod.webcomponents) {
    const file = files[wc.kind];
    if (!file) { continue; }
    wc.tag = wc.tag.replace(/-dev$/, "");
    wc.url = lib.cdnUrl(tag, file);
    wc.integrity = lib.sriOf(tag, file);
  }
  lib.writeJson("dropdowntable.json", prod);
  console.log("dropdowntable.json → " + tag);

  if (process.argv.includes("--check")) {
    for (const wc of prod.webcomponents) {
      console.log("  " + wc.kind + ": " + await lib.verifyUrl(wc.url, wc.integrity));
    }
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

// Gera o pacote para hospedar o widget no próprio SAC (sem GitHub/jsDelivr):
// um JSON com URLs relativas + um .zip com os arquivos, para
// "Criar widget personalizado a partir de arquivo" (Arquivo JSON + Arquivo de recurso).
//
//   node tools/release-sac.js v2.14.0          → dist/dropdowntable-v2.14.0.json + .zip
//   node tools/release-sac.js v2.14.0 --dev    → widget DEV (id/tags -dev), convive com o de produção
//   node tools/release-sac.js dev --dev        → DEV a partir de uma branch/commit (testes antes da tag)
//
// Os arquivos saem do git (git show <ref>:arquivo), como no release-prod.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const lib = require("./lib");

// ── zip mínimo (deflate) sem dependências ──
const CRC_TABLE = (function() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) { c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); }
  return (c ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const data = zlib.deflateRawSync(e.data);
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // versão
    local.writeUInt16LE(0x0800, 6);        // nomes em UTF-8
    local.writeUInt16LE(8, 8);             // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);         // 1980-01-01 (data fixa: zip reprodutível)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat(locals.concat([cd, end]));
}

function sri(buf) { return "sha256-" + crypto.createHash("sha256").update(buf).digest("base64"); }

function main() {
  const ref = process.argv[2];
  const dev = process.argv.includes("--dev");
  if (!ref || ref.startsWith("--")) { throw new Error("Uso: node tools/release-sac.js <tag|branch|commit> [--dev]   (ex: v2.14.0, dev, HEAD)"); }
  const sha = lib.resolveRef(ref); // falha se a ref não existir
  // Produção: sempre uma tag de versão. DEV: aceita branch/commit (o rótulo leva o commit)
  const isTag = /^v\d+\.\d+\.\d+$/.test(ref);
  if (!isTag && !dev) { throw new Error("Produção exige uma tag de versão (ex: v2.14.0). Para testar uma branch, use --dev."); }
  const label = isTag ? ref : ref.replace(/[^A-Za-z0-9._-]/g, "-") + "@" + sha.slice(0, 7);

  const json = JSON.parse(lib.git(["show", ref + ":dropdowntable.json"]).toString("utf8"));
  if (isTag) { json.version = ref.replace(/^v/, ""); }
  if (dev) {
    // Mesmo id/tags do widget DEV atual: o import substitui o DEV que estiver no SAC
    const devJson = lib.readJson("dropdowntable-dev.json");
    json.id = devJson.id;
    json.newInstancePrefix = devJson.newInstancePrefix;
    json.name = devJson.name.replace(/\s*\[.*$/, "") + " [SAC " + label + "]";
  }

  const files = { main: lib.MAIN_FILE, styling: lib.STYLE_FILE };
  const entries = [];
  for (const wc of json.webcomponents) {
    const file = files[wc.kind];
    if (!file) { continue; }
    let text = lib.git(["show", ref + ":" + file]).toString("utf8");
    const baseTag = wc.tag.replace(/-dev$/, "");
    wc.tag = dev ? baseTag + "-dev" : baseTag;
    if (dev) {
      // Sem ?tag= na URL hospedada: o nome do elemento DEV vai direto no padrão do arquivo
      const from = '"' + baseTag + '";';
      if (text.indexOf(from) === -1) { throw new Error("Tag padrão não encontrada em " + file + ": " + from); }
      text = text.replace(from, '"' + wc.tag + '";');
    }
    const data = Buffer.from(text, "utf8");
    entries.push({ name: file, data: data });
    wc.url = "/" + file;
    wc.integrity = sri(data);
    wc.ignoreIntegrity = false;
  }

  const base = "dropdowntable-" + label.replace("@", "-") + (dev ? "-dev" : "");
  const dist = path.join(lib.ROOT, "dist");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, base + ".json"), JSON.stringify(json, null, 2) + "\n");
  fs.writeFileSync(path.join(dist, base + ".zip"), zip(entries));
  console.log("dist/" + base + ".json");
  console.log("dist/" + base + ".zip  (" + entries.map(function(e) { return e.name; }).join(", ") + ")");
  console.log("id: " + json.id + "  tags: " + json.webcomponents.map(function(w) { return w.tag; }).join(", "));
}

try { main(); } catch (e) { console.error(e.message); process.exit(1); }

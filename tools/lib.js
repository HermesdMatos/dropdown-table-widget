// Utilitários compartilhados pelos scripts de release (sem dependências externas).
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPO = "HermesdMatos/dropdown-table-widget";
const MAIN_FILE = "dropdown-table-widget-v2.js";
const STYLE_FILE = "style-panel.js";

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "buffer" });
}

// SHA-256 (SRI) do arquivo como está no git — é exatamente o que o jsDelivr serve.
// Não usar o arquivo local: com core.autocrlf=true os bytes podem diferir.
function sriOf(ref, file) {
  const bytes = git(["show", ref + ":" + file]);
  return "sha256-" + crypto.createHash("sha256").update(bytes).digest("base64");
}

function resolveRef(ref) {
  return git(["rev-parse", ref + "^{commit}"]).toString().trim();
}

// Arquivo publicado diferente do commitado → o hash não bateria com o que foi editado
function assertCommitted(files) {
  const dirty = git(["status", "--porcelain", "--", ...files]).toString().trim();
  if (dirty) {
    throw new Error("Há alterações não commitadas em:\n" + dirty + "\nFaça commit antes de gerar o JSON.");
  }
}

function cdnUrl(ref, file, tag) {
  return "https://cdn.jsdelivr.net/gh/" + REPO + "@" + ref + "/" + file + (tag ? "?tag=" + tag : "");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(obj, null, 2) + "\n");
}

// Confere no CDN se o arquivo publicado tem o hash esperado (Node 18+ tem fetch)
async function verifyUrl(url, expectedSri) {
  try {
    const res = await fetch(url);
    if (!res.ok) { return "HTTP " + res.status; }
    const buf = Buffer.from(await res.arrayBuffer());
    const sri = "sha256-" + crypto.createHash("sha256").update(buf).digest("base64");
    return sri === expectedSri ? "ok" : "hash diferente (" + sri + ")";
  } catch (e) {
    return "erro: " + e.message;
  }
}

module.exports = { ROOT, MAIN_FILE, STYLE_FILE, git, sriOf, resolveRef, assertCommitted, cdnUrl, readJson, writeJson, verifyUrl };

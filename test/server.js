// Servidor local de testes (sem dependências).
//
//   node test/server.js        → http://127.0.0.1:5180/            (testes automáticos)
//                                http://127.0.0.1:5180/coexist.html (PROD da main + DEV juntos)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 5180;

// Versão de produção atual (branch main), para o teste de convivência PROD + DEV
function fromMain(file) {
  return execFileSync("git", ["show", "main:" + file], { cwd: ROOT });
}

const routes = {
  "/": () => fs.readFileSync(path.join(__dirname, "harness.html")),
  "/coexist.html": () => fs.readFileSync(path.join(__dirname, "coexist.html")),
  "/mock-binding.js": () => fs.readFileSync(path.join(__dirname, "mock-binding.js")),
  "/dropdown-table-widget-v2.js": () => fs.readFileSync(path.join(ROOT, "dropdown-table-widget-v2.js")),
  "/style-panel.js": () => fs.readFileSync(path.join(ROOT, "style-panel.js")),
  "/prod/dropdown-table-widget-v2.js": () => fromMain("dropdown-table-widget-v2.js"),
  "/prod/style-panel.js": () => fromMain("style-panel.js")
};

http.createServer((req, res) => {
  const route = routes[req.url.split("?")[0]];
  if (!route) { res.writeHead(404); res.end("not found"); return; }
  try {
    const body = route();
    const type = req.url.split("?")[0].endsWith(".js") ? "text/javascript" : "text/html";
    res.writeHead(200, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
  } catch (e) {
    res.writeHead(500); res.end(String(e.message));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log("Testes: http://127.0.0.1:" + PORT + "/   |   Convivência PROD+DEV: http://127.0.0.1:" + PORT + "/coexist.html");
});

/* ============================================================
   serve.js — Servidor estático mínimo para desarrollo.
   Uso:  node serve.js         (después: http://localhost:5599)
         node serve.js 8080    (para elegir otro puerto)

   Por qué existe y no usamos "python -m http.server":
   en Windows ese servidor entrega archivos grandes recortados de a
   ratos — a three.min.js (600 KB) le come 100 KB y el script no
   ejecuta, así que el cubo del hero desaparece sin ningún error
   visible. Este sirve con streams de Node y no tiene ese problema.

   Sin dependencias: solo módulos que ya trae Node.
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2]) || 5599;
const root = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

http
  .createServer(function (req, res) {
    let rel = decodeURIComponent(req.url.split("?")[0]);
    if (rel.endsWith("/")) rel += "index.html";

    // Nada de salirse de la carpeta del proyecto con ../
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) {
      res.writeHead(403).end("403");
      return;
    }

    fs.stat(file, function (err, stat) {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 — no existe " + rel);
        return;
      }

      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": "no-cache"
      });

      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(port, function () {
    console.log("Mi Dashboard en http://localhost:" + port);
  });

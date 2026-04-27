const fs = require("fs");
const path = require("path");
const http = require("http");

const port = Number(process.env.PORT || 3100);
const basePath = (process.env.APPLICATION_PROXY_BASE_PATH || "/").replace(/\/+$/, "") || "/";
const publicDir = path.join(__dirname, "public");

function isWithinBase(requestPath) {
  if (basePath === "/") return true;
  return requestPath === basePath || requestPath.startsWith(`${basePath}/`);
}

function stripBase(requestPath) {
  if (basePath === "/") return requestPath;
  const stripped = requestPath.slice(basePath.length);
  return stripped || "/";
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", application: "embedded-demo-application" }));
    return;
  }

  const pathname = req.url.split("?")[0];
  if (!isWithinBase(pathname)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const relative = stripBase(pathname) === "/" ? "/index.html" : stripBase(pathname);
  const target = path.normalize(path.join(publicDir, relative));
  if (!target.startsWith(publicDir)) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const contentType = target.endsWith(".css") ? "text/css" : "text/html";
    res.writeHead(200, { "content-type": contentType });
    res.end(data);
  });
});

server.listen(port, "0.0.0.0");

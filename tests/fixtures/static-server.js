const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const port = 4173;
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

const server = http.createServer((request, response) => {
  const requestedPath = request.url.split("?")[0];
  const filePath = requestedPath === "/dashboard" || requestedPath === "/"
    ? path.join(root, "index.html")
    : path.join(root, requestedPath.replace(/^\/+/, ""));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(content);
  });
});

server.listen(port, "127.0.0.1");

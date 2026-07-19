import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";

const BACKEND_PORT = Number(process.env.BACKEND_PORT) || 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  // --- Proxy all /api/* traffic to the standalone backend service ---
  // (Express + Prisma + PostgreSQL, running on localhost only, see /server)
  // No body parser is registered on this app, so the raw request stream is
  // untouched and can be piped straight through to the backend, which parses
  // it itself. Express strips the "/api" mount prefix before invoking this
  // middleware, so we restore it via pathRewrite.
  app.use(
    "/api",
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      pathRewrite: (path) => `/api${path}`,
    })
  );

  // --- Vite Dev Middleware and Production Static Serves ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting backend in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting backend in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[JustCarSale server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

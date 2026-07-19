import { app } from "./app";

const PORT = Number(process.env.BACKEND_PORT) || 3001;

app.listen(PORT, "localhost", () => {
  console.log(`[JustCarSale backend] Listening on http://localhost:${PORT}`);
});

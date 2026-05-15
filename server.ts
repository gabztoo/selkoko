import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Track active viewers
  let baseCount = 8; // Random base simulation number to start
  io.on("connection", (socket) => {
    // Add some random simulated users to make the page feel busy as requested
    const currentActive = io.engine.clientsCount + baseCount + Math.floor(Math.random() * 5);
    io.emit("active_users", currentActive);

    socket.on("disconnect", () => {
      const newActive = io.engine.clientsCount + baseCount + Math.floor(Math.random() * 3);
      io.emit("active_users", Math.max(1, newActive));
    });
  });

  // API route example (can be used to process mock payment)
  app.use(express.json());
  app.post("/api/checkout", (req, res) => {
    // Fake payment processing
    setTimeout(() => {
      res.json({ success: true, link: "https://t.me/+fake_invite_link_123" });
    }, 1500);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

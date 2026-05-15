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
  const checkouts = new Map<string, { status: "pending" | "approved" | "failed"; link?: string }>();
  
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
    const origin = req.headers.origin || `http://localhost:${PORT}`;
    const { contact = "" } = req.body ?? {};
    const checkoutId = `chk_${Date.now()}`;
    checkouts.set(checkoutId, { status: "pending" });

    const gatewayBaseUrl = process.env.GATEWAY_CHECKOUT_URL;
    let redirectUrl = `${origin}/checkout/pending?checkout_id=${checkoutId}`;

    // If configured, redirect straight to the real gateway checkout screen.
    if (gatewayBaseUrl) {
      const gatewayUrl = new URL(gatewayBaseUrl);
      gatewayUrl.searchParams.set("checkout_id", checkoutId);
      gatewayUrl.searchParams.set("contact", String(contact));
      gatewayUrl.searchParams.set("success_url", `${origin}/checkout/success?checkout_id=${checkoutId}`);
      gatewayUrl.searchParams.set("pending_url", `${origin}/checkout/pending?checkout_id=${checkoutId}`);
      gatewayUrl.searchParams.set("failure_url", `${origin}/checkout/failure?checkout_id=${checkoutId}`);
      redirectUrl = gatewayUrl.toString();
    }

    res.json({
      success: true,
      checkoutId,
      redirectUrl,
    });
  });

  app.get("/api/checkout-status/:checkoutId", (req, res) => {
    const { checkoutId } = req.params;
    const checkout = checkouts.get(checkoutId);
    if (!checkout) {
      res.status(404).json({ success: false, message: "Checkout nao encontrado" });
      return;
    }
    res.json({ success: true, checkoutId, ...checkout });
  });

  // Webhook de exemplo para o gateway confirmar pagamento.
  // Ajuste o payload conforme a ParadisePags enviar.
  app.post("/api/paradisepags/webhook", (req, res) => {
    const checkoutId = String(req.body?.checkout_id || req.body?.reference || "");
    const statusRaw = String(req.body?.status || "").toLowerCase();
    if (!checkoutId || !checkouts.has(checkoutId)) {
      res.status(200).json({ received: true });
      return;
    }

    const current = checkouts.get(checkoutId)!;
    if (statusRaw === "approved" || statusRaw === "paid") {
      checkouts.set(checkoutId, { status: "approved", link: "https://t.me/+fake_invite_link_123" });
    } else if (statusRaw === "failed" || statusRaw === "rejected" || statusRaw === "cancelled") {
      checkouts.set(checkoutId, { status: "failed" });
    } else {
      checkouts.set(checkoutId, { ...current, status: "pending" });
    }
    res.status(200).json({ received: true });
  });

  // Redirect targets to configure in your payment gateway dashboard.
  app.get("/checkout/success", (req, res) => {
    const checkoutId = String(req.query.checkout_id || "");
    res.redirect(`/?payment=pending&checkout_id=${checkoutId}`);
  });

  app.get("/checkout/pending", (req, res) => {
    const checkoutId = String(req.query.checkout_id || "");
    res.redirect(`/?payment=pending&checkout_id=${checkoutId}`);
  });

  app.get("/checkout/failure", (req, res) => {
    const checkoutId = String(req.query.checkout_id || "");
    res.redirect(`/?payment=failed&checkout_id=${checkoutId}`);
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

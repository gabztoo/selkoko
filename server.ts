import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const gatewayBaseUrlRaw = process.env.GATEWAY_CHECKOUT_URL;
  if (!gatewayBaseUrlRaw) {
    throw new Error("GATEWAY_CHECKOUT_URL nao configurada no servidor");
  }

  let gatewayCheckoutBase: URL;
  try {
    gatewayCheckoutBase = new URL(gatewayBaseUrlRaw);
  } catch {
    throw new Error(`GATEWAY_CHECKOUT_URL invalida: ${gatewayBaseUrlRaw}`);
  }

  console.log(`[checkout] GATEWAY_CHECKOUT_URL carregada para ${gatewayCheckoutBase.origin}`);

  const app = express();
  const PORT = 3000;
  type CheckoutPhase = "created" | "redirected" | "pending" | "approved" | "failed";
  type CheckoutRecord = {
    status: CheckoutPhase;
    contact: string;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    failedAt?: string;
    link?: string;
    lastGatewayStatus?: string;
  };
  const checkouts = new Map<string, CheckoutRecord>();

  const nowIso = () => new Date().toISOString();
  const normalizePublicStatus = (status: CheckoutPhase): "pending" | "approved" | "failed" => {
    if (status === "approved") return "approved";
    if (status === "failed") return "failed";
    return "pending";
  };
  const mapGatewayStatus = (statusRaw: string): CheckoutPhase => {
    if (statusRaw === "approved" || statusRaw === "paid") return "approved";
    if (statusRaw === "failed" || statusRaw === "rejected" || statusRaw === "cancelled") return "failed";
    return "pending";
  };
  
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
    const { contact = "" } = req.body ?? {};
    const checkoutId = `chk_${Date.now()}`;
    const createdAt = nowIso();
    checkouts.set(checkoutId, {
      status: "created",
      contact: String(contact),
      createdAt,
      updatedAt: createdAt,
    });

    if (!gatewayCheckoutBase?.href) {
      res.status(500).json({
        success: false,
        code: "checkout_init_failed",
        message: "GATEWAY_CHECKOUT_URL nao configurada no servidor",
      });
      return;
    }

    let redirectUrl: string;
    try {
      redirectUrl = gatewayCheckoutBase.toString();
    } catch {
      res.status(500).json({
        success: false,
        code: "checkout_init_failed",
        message: "GATEWAY_CHECKOUT_URL invalida no servidor",
      });
      return;
    }
    const current = checkouts.get(checkoutId);
    if (current) {
      checkouts.set(checkoutId, { ...current, status: "redirected", updatedAt: nowIso() });
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
    res.json({
      success: true,
      checkoutId,
      status: normalizePublicStatus(checkout.status),
      link: checkout.link,
      lastGatewayStatus: checkout.lastGatewayStatus,
      updatedAt: checkout.updatedAt,
    });
  });

  // Webhook de exemplo para o gateway confirmar pagamento.
  // Ajuste o payload conforme a ParadisePags enviar.
  app.post("/api/paradisepags/webhook", (req, res) => {
    const checkoutId = String(req.body?.checkout_id || req.body?.reference || req.body?.external_reference || "");
    const statusRaw = String(req.body?.status || "").toLowerCase();
    if (!checkoutId || !checkouts.has(checkoutId)) {
      console.log("[webhook] checkout not found", { checkoutId, statusRaw });
      res.status(200).json({ received: true });
      return;
    }

    const current = checkouts.get(checkoutId)!;
    const mappedStatus = mapGatewayStatus(statusRaw);
    const currentPublic = normalizePublicStatus(current.status);
    const mappedPublic = normalizePublicStatus(mappedStatus);

    // Idempotent path
    if (current.lastGatewayStatus === statusRaw && currentPublic === mappedPublic) {
      res.status(200).json({ received: true, idempotent: true });
      return;
    }

    // Avoid status regression after approval
    const nextStatus =
      current.status === "approved" && mappedStatus !== "approved" ? "approved" : mappedStatus;

    const next: CheckoutRecord = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso(),
      lastGatewayStatus: statusRaw,
    };

    if (nextStatus === "approved") {
      next.approvedAt = next.approvedAt || nowIso();
      next.link = next.link || "https://t.me/+fake_invite_link_123";
    }
    if (nextStatus === "failed") {
      next.failedAt = next.failedAt || nowIso();
    }
    checkouts.set(checkoutId, next);
    res.status(200).json({ received: true });
  });

  // Redirect targets to configure in your payment gateway dashboard.
  app.get("/checkout/success", (req, res) => {
    const checkoutId = String(req.query.checkout_id || "");
    if (!checkoutId || !checkouts.has(checkoutId)) {
      res.redirect("/?payment=failed&reason=missing_checkout_id");
      return;
    }
    const current = checkouts.get(checkoutId)!;
    if (current.status !== "approved" && current.status !== "failed") {
      checkouts.set(checkoutId, { ...current, status: "pending", updatedAt: nowIso() });
    }
    res.redirect(`/?payment=pending&checkout_id=${checkoutId}`);
  });

  app.get("/checkout/pending", (req, res) => {
    const checkoutId = String(req.query.checkout_id || "");
    if (!checkoutId || !checkouts.has(checkoutId)) {
      res.redirect("/?payment=failed&reason=missing_checkout_id");
      return;
    }
    const current = checkouts.get(checkoutId)!;
    if (current.status !== "approved" && current.status !== "failed") {
      checkouts.set(checkoutId, { ...current, status: "pending", updatedAt: nowIso() });
    }
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

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido ao iniciar o servidor";
  console.error(`[startup] ${message}`);
  process.exit(1);
});

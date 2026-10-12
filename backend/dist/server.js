"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const beats_js_1 = __importDefault(require("./routes/beats.js"));
const orders_js_1 = __importDefault(require("./routes/orders.js"));
const payments_js_1 = __importDefault(require("./routes/payments.js"));
const cart_js_1 = __importDefault(require("./routes/cart.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const app = (0, express_1.default)();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean);
app.use((0, cors_1.default)({ origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin))
        return callback(null, true); return callback(new Error('CORS origin not allowed')); } }));
app.use(express_1.default.json({
    limit: '1mb',
    // Paystack signs the exact raw request bytes, not JSON.stringify(req.body).
    verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); },
}));
app.get('/health', (_, res) => res.json({ ok: true, service: 'Ahmarny API', apiVersion: 'v1' }));
// /api remains available for the current web app. /api/v1 is the stable
// contract for future Android/iOS clients so mobile releases can evolve safely.
for (const prefix of ['/api', '/api/v1']) {
    app.use(`${prefix}/auth`, auth_js_1.default);
    app.use(`${prefix}/beats`, beats_js_1.default);
    app.use(`${prefix}/orders`, orders_js_1.default);
    app.use(`${prefix}/cart`, cart_js_1.default);
    app.use(`${prefix}/payments`, payments_js_1.default);
    app.use(`${prefix}/admin`, admin_js_1.default);
}
app.use((_, res) => res.status(404).json({ message: 'Route not found' }));
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Ahmarny API running on http://localhost:${port}`));

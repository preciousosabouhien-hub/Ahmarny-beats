"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_js_1 = require("../lib/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const r = (0, express_1.Router)();
const secretKey = () => process.env.PAYSTACK_SECRET_KEY;
r.post('/paystack/initialize', auth_js_1.auth, async (req, res) => {
    try {
        const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
        if (!orderId)
            return res.status(400).json({ message: 'Order ID is required' });
        const order = await prisma_js_1.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        if (order.userId !== req.user.id)
            return res.status(403).json({ message: 'You cannot pay for this order' });
        if (order.status === 'PAID')
            return res.status(409).json({ message: 'This order has already been paid' });
        if (order.status !== 'PENDING')
            return res.status(409).json({ message: 'This order is not payable' });
        if (!secretKey())
            return res.status(503).json({ message: 'Paystack is not configured' });
        if (!Number.isInteger(order.amountKobo) || order.amountKobo <= 0)
            return res.status(400).json({ message: 'Invalid order amount' });
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: order.email,
                amount: order.amountKobo,
                currency: order.currency,
                reference: order.reference,
                callback_url: `${frontendUrl}/payment/callback`,
                metadata: { orderId: order.id, orderReference: order.reference },
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.status || !data.data?.authorization_url || !data.data?.reference) {
            return res.status(400).json({ message: data.message || 'Payment initialization failed' });
        }
        await prisma_js_1.prisma.order.update({ where: { id: order.id }, data: { paystackReference: data.data.reference } });
        return res.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
    }
    catch (error) {
        console.error('Paystack initialization error:', error);
        return res.status(500).json({ message: 'Could not start payment. Please try again.' });
    }
});
r.get('/paystack/verify', async (req, res) => {
    const reference = String(req.query.reference || '').trim();
    if (!reference)
        return res.status(400).json({ message: 'Payment reference is required' });
    if (!secretKey())
        return res.status(503).json({ message: 'Paystack is not configured' });
    try {
        const order = await prisma_js_1.prisma.order.findFirst({ where: { OR: [{ reference }, { paystackReference: reference }] } });
        if (!order)
            return res.status(404).json({ message: 'Order not found for this payment reference' });
        if (order.status === 'PAID')
            return res.json({ status: 'PAID', reference: order.reference });
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${secretKey()}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.status)
            return res.status(400).json({ message: data.message || 'Could not verify payment' });
        const tx = data.data;
        const valid = tx?.status === 'success'
            && tx?.reference === reference
            && Number(tx?.amount) === order.amountKobo
            && tx?.currency === order.currency;
        if (valid) {
            await prisma_js_1.prisma.order.updateMany({
                where: { id: order.id, status: 'PENDING' },
                data: { status: 'PAID', paidAt: new Date(), paystackReference: reference },
            });
            const latest = await prisma_js_1.prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
            return res.json({ status: latest?.status || 'PENDING', reference: order.reference });
        }
        if (tx?.status === 'failed' && order.status === 'PENDING') {
            await prisma_js_1.prisma.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'FAILED' } });
            return res.json({ status: 'FAILED', reference: order.reference });
        }
        return res.json({ status: 'PENDING', reference: order.reference });
    }
    catch (error) {
        console.error('Paystack verification error:', error);
        return res.status(500).json({ message: 'Payment verification failed. Please try again.' });
    }
});
r.post('/paystack/webhook', async (req, res) => {
    const secret = secretKey();
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.rawBody;
    if (!secret || typeof signature !== 'string' || !rawBody)
        return res.sendStatus(401);
    const expected = node_crypto_1.default.createHmac('sha512', secret).update(rawBody).digest();
    let supplied;
    try {
        supplied = Buffer.from(signature, 'hex');
    }
    catch {
        return res.sendStatus(401);
    }
    if (supplied.length !== expected.length || !node_crypto_1.default.timingSafeEqual(supplied, expected))
        return res.sendStatus(401);
    try {
        if (req.body?.event === 'charge.success') {
            const tx = req.body?.data;
            const reference = typeof tx?.reference === 'string' ? tx.reference : '';
            if (reference && tx?.status === 'success') {
                const order = await prisma_js_1.prisma.order.findFirst({ where: { OR: [{ reference }, { paystackReference: reference }] } });
                // Never fulfil an order from a webhook unless amount, currency and reference match.
                if (order && Number(tx.amount) === order.amountKobo && tx.currency === order.currency && order.status === 'PENDING') {
                    await prisma_js_1.prisma.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'PAID', paidAt: new Date(), paystackReference: reference } });
                }
            }
        }
        return res.sendStatus(200);
    }
    catch (error) {
        console.error('Paystack webhook processing error:', error);
        return res.sendStatus(500);
    }
});
exports.default = r;

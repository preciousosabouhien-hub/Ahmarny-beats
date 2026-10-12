"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../lib/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const r = (0, express_1.Router)();
const schema = zod_1.z.object({
    email: zod_1.z.email(),
    customerName: zod_1.z.string().trim().min(2).max(100),
    items: zod_1.z.array(zod_1.z.object({ beatId: zod_1.z.string().min(1), licenseId: zod_1.z.string().min(1) })).min(1).max(20),
});
r.post('/', auth_js_1.auth, async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Enter a valid email, customer name and at least one licensed beat.' });
    try {
        const licenseIds = parsed.data.items.map(item => item.licenseId);
        if (new Set(licenseIds).size !== licenseIds.length) {
            return res.status(400).json({ message: 'The same licence cannot be added to an order more than once.' });
        }
        const licenses = await prisma_js_1.prisma.license.findMany({
            where: { id: { in: licenseIds }, beat: { isPublished: true } },
            include: { beat: true },
        });
        if (licenses.length !== parsed.data.items.length) {
            return res.status(400).json({ message: 'One or more selected beats or licences are unavailable. Refresh the store and try again.' });
        }
        const byId = new Map(licenses.map(license => [license.id, license]));
        let amountKobo = 0;
        const items = parsed.data.items.map(item => {
            const license = byId.get(item.licenseId);
            if (!license || license.beatId !== item.beatId)
                throw new Error('INVALID_LICENSE_SELECTION');
            if (!Number.isInteger(license.priceKobo) || license.priceKobo <= 0)
                throw new Error('INVALID_LICENSE_PRICE');
            amountKobo += license.priceKobo;
            return {
                beatId: license.beatId,
                licenseId: license.id,
                beatTitle: license.beat.title,
                licenseName: license.name,
                priceKobo: license.priceKobo,
            };
        });
        const order = await prisma_js_1.prisma.order.create({
            data: {
                reference: `AHM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                email: parsed.data.email.toLowerCase(),
                customerName: parsed.data.customerName,
                amountKobo,
                userId: req.user.id,
                items: { create: items },
            },
            include: { items: true },
        });
        return res.status(201).json(order);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'INVALID_LICENSE_SELECTION') {
            return res.status(400).json({ message: 'A selected licence does not match its beat. Refresh the store and try again.' });
        }
        if (error instanceof Error && error.message === 'INVALID_LICENSE_PRICE') {
            return res.status(400).json({ message: 'A selected licence has an invalid price. Please contact the store.' });
        }
        console.error('Order creation error:', error);
        return res.status(500).json({ message: 'Could not create your order. Please try again.' });
    }
});
r.get('/mine', auth_js_1.auth, async (req, res) => {
    const orders = await prisma_js_1.prisma.order.findMany({
        where: { userId: req.user.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
});
exports.default = r;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../lib/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const r = (0, express_1.Router)();
const itemSchema = zod_1.z.object({ beatId: zod_1.z.string().min(1), licenseId: zod_1.z.string().min(1) });
const cartSchema = zod_1.z.object({ items: zod_1.z.array(itemSchema).max(20) });
r.get('/', auth_js_1.auth, async (req, res, next) => {
    try {
        const rows = await prisma_js_1.prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: { beat: { include: { licenses: true } }, license: true },
            orderBy: { createdAt: 'asc' },
        });
        // Return the same { beat, license } shape used by the React store.
        res.json(rows.map(({ beat, license }) => ({ beat, license })));
    }
    catch (error) {
        next(error);
    }
});
r.put('/', auth_js_1.auth, async (req, res, next) => {
    const parsed = cartSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: 'Cart must contain up to 20 valid beat/licence selections.' });
    const { items } = parsed.data;
    if (new Set(items.map((item) => item.licenseId)).size !== items.length) {
        return res.status(400).json({ message: 'A licence can only appear once in your cart.' });
    }
    try {
        const licenses = items.length ? await prisma_js_1.prisma.license.findMany({
            where: { id: { in: items.map((item) => item.licenseId) }, beat: { isPublished: true } },
            select: { id: true, beatId: true },
        }) : [];
        if (licenses.length !== items.length) {
            return res.status(400).json({ message: 'One or more selected beats or licences are unavailable. Refresh the store.' });
        }
        const byLicense = new Map(licenses.map((license) => [license.id, license]));
        if (items.some((item) => byLicense.get(item.licenseId)?.beatId !== item.beatId)) {
            return res.status(400).json({ message: 'A selected licence does not match its beat.' });
        }
        await prisma_js_1.prisma.$transaction(async (tx) => {
            await tx.cartItem.deleteMany({ where: { userId: req.user.id } });
            if (items.length) {
                await tx.cartItem.createMany({
                    data: items.map((item) => ({ userId: req.user.id, beatId: item.beatId, licenseId: item.licenseId })),
                });
            }
        });
        const rows = await prisma_js_1.prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: { beat: { include: { licenses: true } }, license: true },
            orderBy: { createdAt: 'asc' },
        });
        return res.json(rows.map(({ beat, license }) => ({ beat, license })));
    }
    catch (error) {
        next(error);
    }
});
exports.default = r;

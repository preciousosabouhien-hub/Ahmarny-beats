"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const r = (0, express_1.Router)();
r.get('/', async (req, res) => { const { genre, mood, q } = req.query; const beats = await prisma_js_1.prisma.beat.findMany({ where: { isPublished: true, ...genre ? { genre: String(genre) } : {}, ...mood ? { mood: String(mood) } : {}, ...q ? { OR: [{ title: { contains: String(q), mode: 'insensitive' } }, { genre: { contains: String(q), mode: 'insensitive' } }] } : {} }, include: { licenses: true }, orderBy: { createdAt: 'desc' } }); res.json(beats); });
r.get('/:slug', async (req, res) => { const b = await prisma_js_1.prisma.beat.findUnique({ where: { slug: req.params.slug }, include: { licenses: true } }); if (!b)
    return res.status(404).json({ message: 'Beat not found' }); res.json(b); });
exports.default = r;

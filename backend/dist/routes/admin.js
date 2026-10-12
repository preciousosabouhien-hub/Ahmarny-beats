"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const prisma_js_1 = require("../lib/prisma.js");
const storage_js_1 = require("../lib/storage.js");
const auth_js_1 = require("../middleware/auth.js");
const r = (0, express_1.Router)();
r.use(auth_js_1.auth, auth_js_1.admin);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const isAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'].includes(file.mimetype);
        const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (!isAudio && !isImage)
            return cb(new Error('Unsupported file type. Upload MP3/WAV audio or JPG/PNG/WebP cover art.'));
        cb(null, true);
    },
});
r.get('/stats', async (_req, res, next) => {
    try {
        const [users, beats, orders, paid] = await Promise.all([
            prisma_js_1.prisma.user.count(),
            prisma_js_1.prisma.beat.count(),
            prisma_js_1.prisma.order.count(),
            prisma_js_1.prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amountKobo: true } }),
        ]);
        res.json({ users, beats, orders, revenueKobo: paid._sum.amountKobo || 0 });
    }
    catch (error) {
        next(error);
    }
});
r.get('/orders', async (_req, res, next) => {
    try {
        res.json(await prisma_js_1.prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } }));
    }
    catch (error) {
        next(error);
    }
});
// Uploads go to persistent object storage, not the temporary Render filesystem.
// The Supabase bucket must exist and be configured as public for storefront previews/covers.
r.post('/uploads/audio', upload.single('file'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ message: 'Choose an MP3 or WAV file first.' });
        const ext = (0, node_path_1.extname)(file.originalname).toLowerCase();
        const allowed = ['.mp3', '.wav'];
        if (!allowed.includes(ext))
            return res.status(400).json({ message: 'Audio file must have an .mp3 or .wav extension.' });
        const client = (0, storage_js_1.getStorageClient)();
        const path = `beats/${req.user.id}/${(0, node_crypto_1.randomUUID)()}${ext}`;
        const { error } = await client.storage.from((0, storage_js_1.getStorageBucket)()).upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
            cacheControl: '3600',
        });
        if (error)
            return res.status(502).json({ message: `Audio upload failed: ${error.message}` });
        const { data } = client.storage.from((0, storage_js_1.getStorageBucket)()).getPublicUrl(path);
        res.status(201).json({ url: data.publicUrl, path, originalName: file.originalname, size: file.size });
    }
    catch (error) {
        next(error);
    }
});
r.post('/uploads/cover', upload.single('file'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ message: 'Choose a cover image first.' });
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return res.status(400).json({ message: 'Cover must be JPG, PNG, or WebP.' });
        }
        const ext = (0, node_path_1.extname)(file.originalname).toLowerCase() || '.jpg';
        const client = (0, storage_js_1.getStorageClient)();
        const path = `covers/${req.user.id}/${(0, node_crypto_1.randomUUID)()}${ext}`;
        const { error } = await client.storage.from((0, storage_js_1.getStorageBucket)()).upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
            cacheControl: '3600',
        });
        if (error)
            return res.status(502).json({ message: `Cover upload failed: ${error.message}` });
        const { data } = client.storage.from((0, storage_js_1.getStorageBucket)()).getPublicUrl(path);
        res.status(201).json({ url: data.publicUrl, path, originalName: file.originalname, size: file.size });
    }
    catch (error) {
        next(error);
    }
});
r.post('/beats', async (req, res, next) => {
    try {
        const { title, slug, genre, mood, bpm, musicalKey, description, coverUrl, previewUrl } = req.body;
        if (!title?.trim() || !slug?.trim() || !genre?.trim() || !musicalKey?.trim()) {
            return res.status(400).json({ message: 'Title, genre, slug and musical key are required.' });
        }
        const numericBpm = Number(bpm);
        if (!Number.isInteger(numericBpm) || numericBpm < 1 || numericBpm > 400) {
            return res.status(400).json({ message: 'BPM must be a number between 1 and 400.' });
        }
        const beat = await prisma_js_1.prisma.beat.create({
            data: {
                title: title.trim(), slug: slug.trim(), genre: genre.trim(), mood: mood || null,
                bpm: numericBpm, musicalKey: musicalKey.trim(), description: description || null,
                coverUrl: coverUrl || null, previewUrl: previewUrl || null, isPublished: true,
                licenses: { create: [
                        { type: 'MP3_LEASE', name: 'MP3 Lease', priceKobo: 1500000, details: 'MP3 lease licence' },
                        { type: 'WAV_LEASE', name: 'WAV Lease', priceKobo: 2500000, details: 'WAV lease licence' },
                        { type: 'TRACKOUT', name: 'Trackout', priceKobo: 5000000, details: 'Trackout licence' },
                        { type: 'EXCLUSIVE', name: 'Exclusive', priceKobo: 15000000, details: 'Exclusive licence; availability should be confirmed manually' },
                    ] },
            },
            include: { licenses: true },
        });
        res.status(201).json(beat);
    }
    catch (error) {
        if (error?.code === 'P2002')
            return res.status(409).json({ message: 'A beat with this slug already exists. Change the title and try again.' });
        next(error);
    }
});
r.patch('/beats/:id', async (req, res, next) => {
    try {
        res.json(await prisma_js_1.prisma.beat.update({ where: { id: req.params.id }, data: req.body }));
    }
    catch (error) {
        next(error);
    }
});
r.delete('/beats/:id', async (req, res, next) => {
    try {
        await prisma_js_1.prisma.beat.delete({ where: { id: req.params.id } });
        res.sendStatus(204);
    }
    catch (error) {
        next(error);
    }
});
exports.default = r;

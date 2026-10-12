"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_js_1 = require("../lib/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const r = (0, express_1.Router)();
const schema = zod_1.z.object({ name: zod_1.z.string().min(2).max(80), email: zod_1.z.email(), password: zod_1.z.string().min(8).max(100) });
function token(u) { return jsonwebtoken_1.default.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' }); }
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role }; }
r.post('/register', async (req, res) => {
    const p = schema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ message: 'Invalid registration details' });
    const { name, email, password } = p.data;
    const normalizedEmail = email.toLowerCase();
    const exists = await prisma_js_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists)
        return res.status(409).json({ message: 'Email already registered' });
    const u = await prisma_js_1.prisma.user.create({ data: { name, email: normalizedEmail, passwordHash: await bcryptjs_1.default.hash(password, 12) } });
    res.status(201).json({ token: token(u), user: publicUser(u) });
});
r.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const u = await prisma_js_1.prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
    if (!u || !(await bcryptjs_1.default.compare(password || '', u.passwordHash)))
        return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: token(u), user: publicUser(u) });
});
// Shared by the website and future mobile apps.
r.get('/me', auth_js_1.auth, async (req, res) => {
    const u = await prisma_js_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u)
        return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(u) });
});
exports.default = r;

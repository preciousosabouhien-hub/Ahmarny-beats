"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
exports.admin = admin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function auth(req, res, next) { const h = req.headers.authorization; if (!h?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Authentication required' }); try {
    req.user = jsonwebtoken_1.default.verify(h.slice(7), process.env.JWT_SECRET);
    next();
}
catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
} }
function admin(req, res, next) { if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ message: 'Admin access required' }); next(); }

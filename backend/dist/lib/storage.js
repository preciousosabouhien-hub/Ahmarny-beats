"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageClient = getStorageClient;
exports.getStorageBucket = getStorageBucket;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
function getStorageClient() {
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
function getStorageBucket() {
    return process.env.SUPABASE_STORAGE_BUCKET || 'ahmarny-assets';
}

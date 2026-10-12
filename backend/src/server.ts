import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import auth from './routes/auth.js';
import beats from './routes/beats.js';
import orders from './routes/orders.js';
import payments from './routes/payments.js';
import cart from './routes/cart.js';
import admin from './routes/admin.js';

const app=express();
const allowedOrigins=(process.env.FRONTEND_URL||'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({origin:(origin,callback)=>{if(!origin||allowedOrigins.includes(origin))return callback(null,true);return callback(new Error('CORS origin not allowed'));}}));
app.use(express.json({
  limit: '1mb',
  // Paystack signs the exact raw request bytes, not JSON.stringify(req.body).
  verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); },
}));

app.get('/health',(_,res)=>res.json({ok:true,service:'Ahmarny API',apiVersion:'v1'}));

// /api remains available for the current web app. /api/v1 is the stable
// contract for future Android/iOS clients so mobile releases can evolve safely.
for(const prefix of ['/api','/api/v1']){
  app.use(`${prefix}/auth`,auth);
  app.use(`${prefix}/beats`,beats);
  app.use(`${prefix}/orders`,orders);
  app.use(`${prefix}/cart`,cart);
  app.use(`${prefix}/payments`,payments);
  app.use(`${prefix}/admin`,admin);
}

app.use((_,res)=>res.status(404).json({message:'Route not found'}));

const port=Number(process.env.PORT||4000);
app.listen(port,()=>console.log(`Ahmarny API running on http://localhost:${port}`));

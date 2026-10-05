import {Router} from 'express';
import crypto from 'crypto';
import {prisma} from '../lib/prisma.js';
import {auth, AuthRequest} from '../middleware/auth.js';

const r=Router();

r.post('/paystack/initialize',auth,async(req:AuthRequest,res)=>{
  const {orderId}=req.body||{};
  const order=await prisma.order.findUnique({where:{id:orderId}});
  if(!order)return res.status(404).json({message:'Order not found'});
  if(order.userId && order.userId!==req.user!.id)return res.status(403).json({message:'You cannot pay for this order'});
  if(!process.env.PAYSTACK_SECRET_KEY)return res.status(503).json({message:'Paystack is not configured'});
  const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email:order.email,amount:order.amountKobo,reference:order.reference,callback_url:`${process.env.FRONTEND_URL}/payment/callback`})});
  const data=await response.json();
  if(!response.ok||!data.status)return res.status(400).json({message:data.message||'Payment initialization failed'});
  await prisma.order.update({where:{id:order.id},data:{paystackReference:data.data.reference}});
  res.json({authorization_url:data.data.authorization_url,reference:data.data.reference});
});

r.post('/paystack/webhook',async(req,res)=>{
  const signature=req.headers['x-paystack-signature'];
  const hash=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY||'').update(JSON.stringify(req.body)).digest('hex');
  if(signature!==hash)return res.status(401).end();
  if(req.body?.event==='charge.success'){
    const ref=req.body.data?.reference;
    await prisma.order.updateMany({where:{OR:[{reference:ref},{paystackReference:ref}]},data:{status:'PAID',paidAt:new Date()}});
  }
  res.sendStatus(200);
});

export default r;

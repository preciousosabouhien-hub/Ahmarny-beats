import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {auth, AuthRequest} from '../middleware/auth.js';

const r=Router();
const schema=z.object({name:z.string().min(2).max(80),email:z.email(),password:z.string().min(8).max(100)});

function token(u:any){return jwt.sign({id:u.id,role:u.role},process.env.JWT_SECRET!,{expiresIn:'7d'})}
function publicUser(u:any){return {id:u.id,name:u.name,email:u.email,role:u.role}}

r.post('/register',async(req,res)=>{
  const p=schema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Invalid registration details'});
  const {name,email,password}=p.data;
  const normalizedEmail=email.toLowerCase();
  const exists=await prisma.user.findUnique({where:{email:normalizedEmail}});
  if(exists)return res.status(409).json({message:'Email already registered'});
  const u=await prisma.user.create({data:{name,email:normalizedEmail,passwordHash:await bcrypt.hash(password,12)}});
  res.status(201).json({token:token(u),user:publicUser(u)});
});

r.post('/login',async(req,res)=>{
  const {email,password}=req.body||{};
  const u=await prisma.user.findUnique({where:{email:String(email||'').toLowerCase()}});
  if(!u||!(await bcrypt.compare(password||'',u.passwordHash)))return res.status(401).json({message:'Invalid email or password'});
  res.json({token:token(u),user:publicUser(u)});
});

// Shared by the website and future mobile apps.
r.get('/me',auth,async(req:AuthRequest,res)=>{
  const u=await prisma.user.findUnique({where:{id:req.user!.id}});
  if(!u)return res.status(404).json({message:'User not found'});
  res.json({user:publicUser(u)});
});

export default r;

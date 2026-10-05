import {Request,Response,NextFunction} from 'express'; import jwt from 'jsonwebtoken';
export type AuthRequest=Request&{user?:{id:string;role:string}};
export function auth(req:AuthRequest,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({message:'Authentication required'});try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET!) as any;next()}catch{return res.status(401).json({message:'Invalid or expired token'})}}
export function admin(req:AuthRequest,res:Response,next:NextFunction){if(req.user?.role!=='ADMIN')return res.status(403).json({message:'Admin access required'});next()}

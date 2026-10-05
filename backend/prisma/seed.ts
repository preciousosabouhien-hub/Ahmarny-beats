import { PrismaClient, LicenseType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
const beats = [
 {title:'After Hours',slug:'after-hours',genre:'Afrobeats',mood:'Late Night',bpm:104,musicalKey:'F# Min',description:'Dark, melodic Afrobeats with warm percussion and space for a memorable hook.',previewUrl:'/audio/after-hours.mp3',coverUrl:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80'},
 {title:'Lagos Nights',slug:'lagos-nights',genre:'Afro R&B',mood:'Smooth',bpm:96,musicalKey:'A Min',description:'Smooth late-night Afro R&B with lush chords and a clean pocket.',previewUrl:'/audio/lagos-nights.mp3',coverUrl:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80'},
 {title:'No Pressure',slug:'no-pressure',genre:'Trap',mood:'Confident',bpm:142,musicalKey:'C# Min',description:'Hard drums, atmospheric melodies and room for confident vocals.',previewUrl:'/audio/no-pressure.mp3',coverUrl:'https://images.unsplash.com/photo-1571266028243-d220c9c3bfcf?auto=format&fit=crop&w=900&q=80'},
 {title:'Palm Wine',slug:'palm-wine',genre:'Afrobeats',mood:'Feel Good',bpm:110,musicalKey:'D Maj',description:'Bright guitar-led Afrobeats for summer records and feel-good releases.',previewUrl:'/audio/palm-wine.mp3',coverUrl:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80'}
];
async function main(){
 const hash=await bcrypt.hash('ChangeMe123!',12);
 await p.user.upsert({where:{email:'admin@ahmarny.com'},update:{},create:{name:'Ahmarny Admin',email:'admin@ahmarny.com',passwordHash:hash,role:'ADMIN'}});
 for(const b of beats){ const beat=await p.beat.upsert({where:{slug:b.slug},update:b,create:b});
  const prices:[LicenseType,string,number,string][]=[['MP3_LEASE','MP3 Lease',150000,'MP3 file, up to 2,500 copies'],['WAV_LEASE','WAV Lease',250000,'WAV file, up to 5,000 copies'],['TRACKOUT','Trackout / Stems',500000,'WAV stems and multitracks'],['EXCLUSIVE','Exclusive',1500000,'Beat ownership transfer and all files']];
  for(const [type,name,price,details] of prices) await p.license.upsert({where:{beatId_type:{beatId:beat.id,type}},update:{name,priceKobo:price,details},create:{beatId:beat.id,type,name,priceKobo:price,details}});
 }
}
main().finally(()=>p.$disconnect());

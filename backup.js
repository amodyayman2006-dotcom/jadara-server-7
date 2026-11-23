// نسخة احتياطية منطقية: تصدّر كل الجداول إلى JSON (+ نسخ الملفات المحلية إن وُجدت).
// الأفضل في الإنتاج: pg_dump دوري من سيرفر الجامعة. هذا السكربت إضافي ومستقل.
import pg from 'pg';import fs from 'node:fs';import path from 'node:path';
const c=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL=='1'?{rejectUnauthorized:false}:undefined});await c.connect();
const out=path.resolve(process.env.BACKUP_DIR||'./backups',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true});
const dump={};for(const t of['users','items','comments','newsletter','kv','visits','views','sources','logs'])dump[t]=(await c.query(`SELECT * FROM ${t}`)).rows;
delete dump.sessions;dump.users=dump.users.map(u=>({...u}));fs.writeFileSync(out+'/db.json',JSON.stringify(dump));
const up=path.resolve(process.env.DATA_DIR||'./data','uploads');if(fs.existsSync(up))fs.cpSync(up,out+'/uploads',{recursive:true});
const dir=path.dirname(out),l=fs.readdirSync(dir).sort();for(const d of l.slice(0,Math.max(0,l.length-(+process.env.BACKUP_KEEP||14))))fs.rmSync(path.join(dir,d),{recursive:true,force:true});
await c.end();console.log('Backup saved to',out,'(يحتوي كلمات مرور مشفّرة: احفظه في مكان آمن)');

// استعادة نسخة احتياطية أنشأها npm run backup.
// الاستخدام: npm run restore -- backups/<تاريخ>/db.json --yes   (يمسح البيانات الحالية!)
import pg from 'pg';import fs from 'node:fs';
const f=process.argv[2];if(!f||!process.argv.includes('--yes')){console.error('الاستخدام: npm run restore -- backups/<تاريخ>/db.json --yes\nتحذير: يستبدل كل البيانات الحالية.');process.exit(1)}
const dump=JSON.parse(fs.readFileSync(f,'utf8')),c=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL=='1'?{rejectUnauthorized:false}:undefined});await c.connect();
const order=['users','items','comments','newsletter','kv','visits','views','sources','logs'];
try{await c.query('BEGIN');await c.query('TRUNCATE sessions,logs,sources,views,visits,kv,newsletter,comments,items,users RESTART IDENTITY CASCADE');
for(const t of order)for(const r of dump[t]||[]){const k=Object.keys(r);await c.query(`INSERT INTO ${t}(${k.map(x=>'"'+x+'"').join(',')}) VALUES(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>r[x]))}
for(const t of['users','logs'])await c.query(`SELECT setval(pg_get_serial_sequence('${t}','id'),GREATEST((SELECT COALESCE(MAX(id),1) FROM ${t}),1))`);
await c.query('COMMIT');console.log('✔ تمت الاستعادة:',order.map(t=>t+'='+(dump[t]||[]).length).join(' '),'\nالملفات المرفوعة محلياً تُنسخ يدوياً من مجلد uploads في النسخة.')}catch(e){await c.query('ROLLBACK');console.error('فشلت الاستعادة، لم يتغير شيء:',e.message);process.exit(1)}finally{await c.end()}

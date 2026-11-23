// إعادة تعيين كلمة مرور مدير النظام عند فقدانها (يتطلب صلاحية الوصول إلى الخادم/القاعدة).
// الاستخدام: npm run reset-admin -- "كلمة_مرور_مؤقتة_جديدة"   (8 أحرف فأكثر) ويُطلب تغييرها عند الدخول.
import pg from 'pg';import bcrypt from 'bcryptjs';
const np=process.argv[2];if(!np||np.length<8){console.error('الاستخدام: npm run reset-admin -- "كلمة_مرور_جديدة_8_أحرف_فأكثر"');process.exit(1)}
if(!process.env.DATABASE_URL){console.error('DATABASE_URL غير محدد');process.exit(1)}
const c=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL=='1'?{rejectUnauthorized:false}:undefined});await c.connect();
const rows=(await c.query('SELECT id,hash FROM users')).rows;for(const r of rows)if(await bcrypt.compare(np,r.hash)){console.error('كلمة المرور مستخدمة من حساب آخر. اختر غيرها.');process.exit(1)}
const a=(await c.query("SELECT id,name FROM users WHERE role='admin' ORDER BY id LIMIT 1")).rows[0];if(!a){console.error('لا يوجد حساب مدير');process.exit(1)}
await c.query('UPDATE users SET hash=$1,must=1 WHERE id=$2',[await bcrypt.hash(np,12),a.id]);await c.query('DELETE FROM sessions WHERE uid=$1',[a.id]);
await c.query('INSERT INTO logs(t,x) VALUES($1,$2)',[new Date().toISOString(),'إعادة تعيين كلمة مرور المدير من الخادم']);await c.end();
console.log('✔ تمت إعادة تعيين كلمة مرور «'+a.name+'». ادخل بها ثم غيّرها فوراً.');

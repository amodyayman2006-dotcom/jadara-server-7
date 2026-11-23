// ينشئ ملف .env للتشغيل المحلي (لا يستبدل ملفاً موجوداً). الاستخدام: npm run setup
import fs from 'node:fs';
if(fs.existsSync('.env')){console.log('.env موجود مسبقاً، لم يُغيَّر.');process.exit(0)}
const db=process.env.DATABASE_URL||'postgres://localhost:5432/jadara',pw=process.env.ADMIN_INITIAL_PASSWORD||'Ayman@2006';
fs.writeFileSync('.env',`# تشغيل محلي للعرض. ملف خاص بجهازك، لا يُرفع إلى أي مستودع (مستثنى في .gitignore)
DATABASE_URL=${db}
DATABASE_SSL=0
NODE_ENV=development
PORT=${process.env.PORT||3000}
COOKIE_SECURE=0
TRUST_PROXY=0
SITE_URL=http://localhost:${process.env.PORT||3000}
ADMIN_INITIAL_PASSWORD=${pw}
ADMIN_FORCE_CHANGE=0
SEED_DEMO=1
DATA_DIR=./data
BACKUP_DIR=./backups
BACKUP_KEEP=14
`);
console.log('✔ تم إنشاء .env\n  قاعدة البيانات: '+db);

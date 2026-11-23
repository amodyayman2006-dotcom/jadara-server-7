// اختبار شامل للباك إند: node scripts/smoke.mjs  (يتطلب خادماً يعمل وكلمة المرور الأولية في ADMIN_PW)
import fs from 'node:fs';
const B=process.env.BASE||'http://localhost:'+(process.env.PORT||3000),PW=process.env.ADMIN_PW||process.env.ADMIN_INITIAL_PASSWORD,H={'X-Requested-With':'fetch'};let pass=0,fail=0;
const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m));if(c&&process.env.V)console.log('ok:',m)};
class J{c='';async f(p,o={}){const h={...H,...(this.c?{cookie:this.c}:{}),...(o.json?{'Content-Type':'application/json'}:{}),...(o.headers||{})};const r=await fetch(B+p,{method:o.method||(o.json||o.form?'POST':'GET'),headers:h,body:o.json?JSON.stringify(o.json):o.form});const sc=r.headers.get('set-cookie');if(sc&&sc.includes('jsid='))this.c=sc.split(';')[0].replace(/^jsid=;?$/,'');let j={};try{j=await r.clone().json()}catch(e){}return{s:r.status,j,r}}}
const png=(n)=>{const b=Buffer.alloc(n,7);Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(b);return b};
const up=(j,buf,type,name)=>{const f=new FormData();f.append('file',new Blob([buf],{type}),name);return j.f('/api/admin/upload',{form:f})};
const anon=new J(),adm=new J(),ed=new J();
ok((await anon.f('/healthz')).s==200,'healthz');
let st=(await anon.f('/api/state')).j;ok(st.items.length>0&&!st.items.some(i=>i.type=='sub'),'public state, no submissions');
ok((await fetch(B+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status==403,'csrf header required');
ok((await anon.f('/api/admin/state')).s==401,'admin state needs auth');
ok((await anon.f('/api/login',{json:{password:'wrong-pass'}})).s==401,'wrong password rejected');
let r=await adm.f('/api/login',{json:{password:PW}});ok(r.s==200&&r.j.user.role=='admin','admin login');ok(/HttpOnly/.test(r.r.headers.get('set-cookie')),'cookie HttpOnly');
let as=(await adm.f('/api/admin/state')).j;ok(as.items.length>=st.items.length&&as.us.length>=1,'admin state');
// users & RBAC
ok((await adm.f('/api/admin/users',{json:{n:'محرر',r:'editor',p:'Editor#2026'}})).s==200,'create editor');
ok((await adm.f('/api/admin/users',{json:{n:'x',r:'editor',p:'Editor#2026'}})).s==409,'duplicate password rejected');
ok((await ed.f('/api/login',{json:{password:'Editor#2026'}})).j.user.role=='editor','editor login');
const nb=as.n;let id=nb+1;
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb,n:id,items:[{id,type:'news',sec:1,title:'مسودة المحرر',st:'مسودة',date:'2026-11-15'}]}})).s==200,'editor saves draft');
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb:id,items:[{id:id+1,type:'news',sec:1,title:'نشر مباشر',st:'منشور',date:'2026-11-15'}]}})).s==403,'editor cannot publish');
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb:id,items:[{id:1,type:'news',sec:1,title:'تعديل',st:'منشور',date:'2026-11-14'}]}})).s==403,'editor cannot edit published');
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb:id,del:[2]}})).s==403,'editor cannot delete');
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb:id,set:{name:'x'}}})).s==403,'editor cannot change settings');
ok((await ed.f('/api/admin/users',{json:{n:'z',r:'admin',p:'Hackhack1'}})).s==403,'editor cannot create users');
// editor full-payload save (what the real UI sends) must not be rejected for untouched settings
ok((await ed.f('/api/admin/state',{method:'PUT',json:{nb:id+5,items:[],set:{name:'مجلة جامعة جدارا الإلكترونية',email:'',tick:'',soc:[],nums:[['التصنيفات',''],['الاعتمادات',''],['الجوائز',''],['الاتفاقيات','']]},hp:{},cm:[],del:[],delcm:[]}})).s==200,'editor UI-style save with untouched settings');
// settings sanitization (javascript: links must never be stored)
r=await adm.f('/api/admin/state',{method:'PUT',json:{nb:id+5,set:{name:'M',soc:['javascript:alert(1)','https://x.com/a','',' ','data:text/html,x'],bu:'javascript:alert(2)',bt:'ب'}}});ok(r.s==200,'admin saves settings');
st=(await anon.f('/api/state')).j;ok(st.set.soc[0]===''&&st.set.soc[1]=='https://x.com/a'&&st.set.soc[4]===''&&st.set.bu==='','unsafe URLs stripped from settings');
await adm.f('/api/admin/state',{method:'PUT',json:{nb:id+5,set:{name:'مجلة جامعة جدارا الإلكترونية',soc:[],bt:'',bu:''}}});
// collision remap
r=await adm.f('/api/admin/state',{method:'PUT',json:{nb,n:id,items:[{id,type:'news',sec:1,title:'خبر المدير',st:'منشور',date:'2026-11-15'}]}});ok(r.s==200&&r.j.map[id]>id,'id collision remapped');const newId=r.j.map[id];
// uploads: several sizes/types
const sizes=[['tiny',200],['small',150e3],['medium',3e6],['large',12e6]];const urls=[];
for(const[n,s]of sizes){const u=await up(adm,png(s),'image/png',n+'.png');ok(u.s==200&&u.j.url,'upload '+n+' ('+s+' bytes)');urls.push(u.j)}
const jp=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(5000,1)]);ok((await up(adm,jp,'image/jpeg','a.jpg')).s==200,'upload jpeg');
ok((await up(adm,Buffer.from('%PDF-1.4 test'),'application/pdf','a.pdf')).s==200,'upload pdf');
ok((await up(adm,Buffer.from('<script>alert(1)</script>'),'text/html','a.html')).s==415,'html rejected');
ok((await up(adm,Buffer.from('MZ fake exe'),'image/png','evil.png')).s==415,'fake image rejected');
ok((await up(adm,png(64e6),'image/png','huge.png')).s==413,'over 60MB rejected');
ok((await up(anon,png(100),'image/png','a.png')).s==401,'upload needs auth');
if(!urls[0].url.startsWith('http')){const g=await fetch(B+urls[2].url);ok(g.status==200&&g.headers.get('content-type')=='image/png','uploaded image is served');}
// attach to item, public sees it
as=(await adm.f('/api/admin/state')).j;const it=as.items.find(i=>i.id==newId);
r=await adm.f('/api/admin/state',{method:'PUT',json:{nb:as.n,items:[{...it,cover:urls[2],gal:[urls[0],urls[1]]}]}});ok(r.s==200,'attach cover+gallery');
st=(await anon.f('/api/state')).j;const pub=st.items.find(i=>i.id==newId);ok(pub&&pub.cover&&pub.cover.url==urls[2].url&&pub.gal.length==2,'public sees cover and gallery');
await adm.f('/api/admin/state',{method:'PUT',json:{nb:as.n,items:[{...it,cover:{url:'javascript:alert(1)'},gal:[urls[0],urls[1]]}]}});as=(await adm.f('/api/admin/state')).j;ok(as.items.find(i=>i.id==newId).cover===null,'unsafe cover url is dropped by the server');
// comments, newsletter, submission
ok((await anon.f('/api/comment',{json:{item:newId,name:'زائر',text:'تعليق'}})).s==200,'comment accepted');
ok(!(await anon.f('/api/state')).j.cm.length,'comment hidden until approved');
as=(await adm.f('/api/admin/state')).j;const cm=as.cm[0];r=await adm.f('/api/admin/state',{method:'PUT',json:{nb:as.n,cm:[{...cm,st:'معتمد'}]}});ok(r.s==200&&(await anon.f('/api/state')).j.cm.length==1,'approved comment visible');
ok((await anon.f('/api/newsletter',{json:{e:'A@B.com'}})).s==200&&(await anon.f('/api/newsletter',{json:{e:'a@b.com'}})).s==200,'newsletter (dedupe)');ok((await anon.f('/api/newsletter',{json:{e:'bad'}})).s==400,'bad email rejected');
const f=new FormData();for(const[k,v]of Object.entries({author:'طالب',email:'s@u.jo',sub:'هندسة',kind:'مقال',title:'مشاركة اختبار',body:'نص'}))f.append(k,v);f.append('file',new Blob([png(2000)],{type:'image/png'}),'p.png');
ok((await anon.f('/api/submission',{form:f})).s==200,'student submission');as=(await adm.f('/api/admin/state')).j;ok(as.items.some(i=>i.type=='sub'&&i.title=='مشاركة اختبار'&&i.st=='جديدة'),'submission in admin');ok(!(await anon.f('/api/state')).j.items.some(i=>i.type=='sub'),'submission not public');
// SEO: pages, OG, JSON-LD, sitemap, escaping
const xss=(await adm.f('/api/admin/state',{method:'PUT',json:{nb:(await adm.f('/api/admin/state')).j.n,n:9999,items:[{id:9999,type:'news',sec:1,title:'"><script>alert(1)</script> عنوان',sub:"x'y",body:'<img src=x onerror=alert(2)>\nسطر',st:'منشور',date:'2026-11-15'}]}}));const xid=xss.j.map[9999]||9999;
let pg=await fetch(B+'/a/'+xid+'/slug');let ph=await pg.text();ok(pg.status==200&&ph.includes('og:title')&&ph.includes('rel="canonical"')&&ph.includes('application/ld+json')&&ph.includes('og:image'),'article URL has OG + canonical + JSON-LD');
ok(!ph.includes('<script>alert(1)')&&!ph.includes('<img src=x'),'article SEO page escapes HTML');ok(ph.includes('class="det"'),'article text server-rendered for crawlers');
ok((await fetch(B+'/a/99999999')).status==404,'unknown article is 404');
const sm=await (await fetch(B+'/sitemap.xml')).text();ok(sm.includes('/a/'+xid)&&sm.includes('/s/1')&&sm.includes('/p/about'),'sitemap lists articles, sections, pages');
ok((await fetch(B+'/s/3')).status==200&&(await fetch(B+'/s/99')).status==404,'section URLs');ok((await (await fetch(B+'/robots.txt')).text()).includes('/sitemap.xml'),'robots.txt');
const home=await (await fetch(B+'/')).text();ok(home.includes('og:image')&&home.includes('<title>'),'home has OG tags');
await adm.f('/api/admin/state',{method:'PUT',json:{nb:(await adm.f('/api/admin/state')).j.n,del:[xid]}});ok((await fetch(B+'/a/'+xid)).status==404,'deleted article leaves 404');
// analytics
await anon.f('/api/visit',{json:{ref:'https://google.com/x'}});await anon.f('/api/view/'+newId,{method:'POST'});as=(await adm.f('/api/admin/state')).j;ok(Object.keys(as.day).length>0&&as.v[newId]>=1&&as.src['google.com'],'analytics recorded');
// password
ok((await adm.f('/api/admin/password',{json:{cur:'bad',new:'NewPass#2027'}})).s==403,'password change needs current');
ok((await adm.f('/api/admin/password',{json:{cur:PW,new:'NewPass#2027'}})).s==200,'password changed');ok((await new J().f('/api/login',{json:{password:PW}})).s==401,'old password dead');
// delete
r=await adm.f('/api/admin/state',{method:'PUT',json:{nb:as.n,del:[newId]}});ok(r.s==200&&!(await anon.f('/api/state')).j.items.some(i=>i.id==newId),'admin deletes item (cascade)');
// rate limit
let c429=0;for(let i=0;i<12;i++)if((await new J().f('/api/login',{json:{password:'x'+i}})).s==429)c429++;ok(c429>0,'login rate limited');
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);

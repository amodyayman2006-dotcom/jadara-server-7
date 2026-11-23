// اختبار واجهة حقيقي: يحمّل الصفحة في jsdom ويشغّل سكربت الواجهة فعلياً على الخادم الحقيقي.
// BASE=http://localhost:3000 ADMIN_PW=... node scripts/ui.test.mjs
import {JSDOM,VirtualConsole} from 'jsdom';
const B=process.env.BASE||'http://localhost:'+(process.env.PORT||3000),PW=process.env.ADMIN_PW||process.env.ADMIN_INITIAL_PASSWORD;let pass=0,fail=0,errs=[];
const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let jar='';const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errs.push(e.message)});
const html=await (await fetch(B+'/')).text();
const dom=new JSDOM(html,{url:B+'/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.fetch=async(u,o={})=>{const h={...(o.headers||{})};if(jar)h.cookie=jar;const r=await fetch(new URL(u,B),{...o,headers:h});const sc=r.headers.get('set-cookie');if(sc&&sc.includes('jsid='))jar=sc.split(';')[0].replace(/^jsid=$/,'');return r};w.addEventListener('error',e=>errs.push(String(e.message)))}});
const w=dom.window,d=w.document,$=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const until=async(f,ms=4000)=>{const t=Date.now();while(Date.now()-t<ms){try{if(f())return true}catch(e){}await sleep(50)}return false};
const go=async h=>{w.location.hash=h;await sleep(120)};
ok(await until(()=>$('.hero')),'home renders hero from API');
ok($$('.ics a').length==12,'12 section icons');ok($$('.n').length>=4,'news cards');ok($('.hero img.art'),'hero uses real campus image');
ok($('.logo').src.endsWith('/assets/logo.png'),'new logo in header');ok($('#mt')&&$('.dmn'),'mobile menu button + demo notice bar');ok(!$('.hero .dm')&&!$('.n .dm'),'no per-card demo badges on public cards');ok(!/admin|إدارة|دخول/i.test($('header').textContent+$('footer').textContent+$('#ub').textContent),'no visible hint of admin entry');
$('#mt').click();ok($('header .bar').classList.contains('open'),'mobile menu opens');$('#mt').click();ok($('#ub').textContent.includes('نوفمبر 2026'),'issue label in top bar');ok($$('.soc a svg').length>=5,'social icons are SVG');
ok($$('.soc a').every(a=>a.href.startsWith('https://')),'social links are https');
const routes=[...Array(12)].map((_,i)=>'sec-'+(i+1)).concat(['p-stu','p-conf','p-ach','p-iss','p-agenda','p-vid','p-arch','p-sub','p-about','p-pol','p-priv','item-1','item-999999']);
for(const r of routes){await go(r);const m=$('#main').textContent.trim();ok(m.length>20,'route '+r+' renders');}
await go('item-1');ok($('.det h1')&&$('.bc')&&$('.meta')&&$('#rp'),'article page: breadcrumb, meta, progress bar');
await go('sec-1');ok($('.ph.sec svg')&&$$('.chips button').length>=2,'section page: header icon + type filters');const nAll=$$('#main .n').length;$$('.chips button')[1].click();await sleep(100);ok($$('#main .n').length<=nAll&&$('.chips button.on').dataset.sf,'section filter chip works');
await go('sec-12');ok($$('#main .mos a').length>=5,'photo section uses mosaic');await go('item-1');ok($('#cmf'),'comment form present');
await go('p-about');ok($('#main table')&&$$('#main li').length>=19,'about page has frequency table + 12 sections');
$('#sq').value='جدارا';$('#sf').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await sleep(200);ok($('#main').textContent.includes('نتيجة'),'search works');
// direct article URL (/a/ID) opens the article
{const h2=await (await fetch(B+'/a/1')).text();const d2=new JSDOM(h2,{url:B+'/a/1/x',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w2){w2.scrollTo=()=>{};w2.fetch=(u,o)=>fetch(new URL(u,B),o)}});await sleep(900);const D2=d2.window.document;ok(D2.querySelector('.det h1')&&d2.window.location.hash=='#item-1','/a/ID URL routes to the article');
ok((D2.querySelector('.shr button').dataset.u||'').includes('/a/1/'),'share link uses canonical /a/ID URL');d2.window.close()}
// admin login via logo double-click
await go('home');$('.logo').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));ok($('#lo').classList.contains('on'),'dblclick on logo opens login');w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));ok(!$('#lo').classList.contains('on'),'Escape closes login modal');$('.logo').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));$('#lc').click();ok(!$('#lo').classList.contains('on'),'cancel button closes login modal');$('.logo').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));
ok(!$('#lo input[type=text]')&&$$('#lf input').length==1,'login has password field only');
$('#pw').value='wrong-pass-x';$('#lf').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));ok(await until(()=>$('#lm').textContent.length>3,3000),'wrong password shows error');
$('#pw').value=PW;$('#lf').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));ok(await until(()=>$('#adm').classList.contains('on')),'admin panel opens after login');
const keys=$$('#sb button').map(b=>b.dataset.k);ok(keys.length>=15,'admin menu has all sections');
for(const k of keys.filter(k=>k!='out')){$(`#sb button[data-k="${k}"]`).click();await sleep(250);ok($('#ct').textContent.trim().length>15,'admin section '+k+' renders')}
// add news through the real form -> API -> DB
$(`#sb button[data-k="news"]`).click();await sleep(250);$('[data-add="news"]').click();await sleep(50);
const F=$('#ff');F.querySelector('[name=title]').value='خبر من اختبار الواجهة';F.querySelector('[name=body]').value='## عنوان فرعي\n**غامق** و[رابط](https://example.com) و[سيئ](javascript:alert(1))\n<script>alert(1)</script>\n- أ\n- ب\n> اقتباس';ok(!!$('#ff .tb [data-fmt="b"]'),'editor toolbar present');F.querySelector('[name=st]').value='منشور';
F.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await sleep(900);
const pub=await (await fetch(B+'/api/state')).json();const it=pub.items.find(i=>i.title=='خبر من اختبار الواجهة');ok(!!it,'item added from admin UI is in DB and public');
// formatted body renders safely
w.location.hash='item-'+(it?it.id:0);await sleep(200);ok($('.det h2')&&$('.det strong')&&$$('.det ul li').length==2&&$('.det blockquote'),'rich text renders (h2, bold, list, quote)');
ok($$('.det a').some(a=>a.href=='https://example.com/')&&!$$('.det a').some(a=>a.href.startsWith('javascript')),'safe links only');ok(!$('.det script')&&!$$('.det p').some(p=>p.innerHTML.includes('<script')),'script text escaped');
w.location.hash='admin';await sleep(300);
// edit
if(it){$(`[data-ed="${it.id}"]`).click();await sleep(50);$('#ff [name=title]').value='خبر معدّل';$('#ff').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await sleep(900);
const p2=await (await fetch(B+'/api/state')).json();ok(p2.items.some(i=>i.id==it.id&&i.title=='خبر معدّل'),'edit persisted');
// delete
w.confirm=()=>true;$(`[data-del="${it.id}"]`).click();await sleep(900);const p3=await (await fetch(B+'/api/state')).json();ok(!p3.items.some(i=>i.id==it.id),'delete persisted')}
// settings: javascript: link
$(`#sb button[data-k="set"]`).click();await sleep(250);$('#sf2 [name=s0]').value='javascript:alert(1)';$('#sf2').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await sleep(700);
const p4=await (await fetch(B+'/api/state')).json();ok(p4.set.soc[0]==='','unsafe social link not stored (UI path)');
// logout
$(`#sb button[data-k="out"]`).click();await sleep(400);ok(!$('#adm').classList.contains('on'),'logout returns to site');ok((await fetch(B+'/api/admin/state',{headers:{cookie:jar}})).status==401,'session invalid after logout');
ok(errs.length==0,'no JS errors: '+errs.slice(0,3).join(' | '));
console.log(`\nUI: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);

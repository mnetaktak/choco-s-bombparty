const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const rd=f=>fs.readFileSync(path.join(__dirname,f));
const WORDS=new Set(rd('words.txt').toString().split(' ')),SYL=rd('syl.txt').toString().split(' '),HTML=rd('public/index.html');
const server=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(HTML)});
const wss=new WebSocketServer({server,maxPayload:8192});
const rooms=new Map(),hist=[];let uid=0;
const tx=(c,o)=>{if(c.readyState===1)c.send(JSON.stringify(o))};
const all=o=>wss.clients.forEach(c=>tx(c,o));
const fuse=()=>Date.now()+8000+Math.random()*7000;
const pick=a=>a[Math.random()*a.length|0];
const mem=r=>{const m=[...r.m].map(c=>({id:c.id,n:c.n,a:c.a}));r.m.forEach(c=>tx(c,{t:'mem',host:r.host.id,m}))};
const st=r=>{const o={t:'st',ph:r.ph,pl:r.pl,cur:r.cur,syl:r.syl,rem:Math.max(0,r.end-Date.now()),win:r.win,lw:r.lw,sc:r.used.size,ex:r.ex,fb:r.fb};r.m.forEach(c=>tx(c,o))};
const lobbies=()=>{const l=[...rooms.values()].filter(r=>r.pub).map(r=>({c:r.c,h:r.host.n,n:r.m.size,p:r.ph==='p'?1:0}));wss.clients.forEach(c=>{if(!c.r)tx(c,{t:'lobbies',l})})};
function adv(r){
 const a=r.pl.filter(p=>p.l>0);
 if(a.length<Math.min(2,r.pl.length)){r.ph='o';r.win=r.pl.length>1&&a[0]?a[0].id:0}
 else{let i=r.cur;do i=(i+1)%r.pl.length;while(r.pl[i].l<1);r.cur=i;r.syl=pick(SYL)}
 st(r);lobbies();
}
const boom=r=>{const p=r.pl[r.cur];p.l--;r.ex={n:(r.ex?r.ex.n:0)+1,id:p.id};r.end=fuse();adv(r)};
function enter(c,r){c.r=r;r.m.add(c);tx(c,{t:'joined',c:r.c});mem(r);st(r);lobbies()}
function leave(c){
 const r=c.r;if(!r)return;c.r=null;r.m.delete(c);
 if(!r.m.size)rooms.delete(r.c);
 else{
  if(r.host===c)r.host=[...r.m][0];
  const p=r.pl.find(x=>x.id===c.id);
  if(p&&r.ph==='p'){
   p.l=0;const a=r.pl.filter(x=>x.l>0);
   if(r.pl[r.cur]===p)adv(r);
   else{if(a.length<Math.min(2,r.pl.length)){r.ph='o';r.win=a[0]?a[0].id:0}st(r)}
  }
  mem(r);
 }
 lobbies();
}
setInterval(()=>rooms.forEach(r=>{if(r.ph==='p'&&Date.now()>=r.end)boom(r)}),200);
wss.on('connection',ws=>{
 ws.id=++uid;ws.n='Player';ws.a='';ws.r=null;ws.cnt=0;ws.lc=0;
 tx(ws,{t:'hi',id:ws.id});hist.forEach(h=>tx(ws,h));lobbies();
 ws.on('message',d=>{
  if(++ws.cnt>40)return ws.terminate();
  let m;try{m=JSON.parse(d)}catch(e){return}
  if(!m||typeof m!=='object')return;
  const r=ws.r;
  switch(m.t){
   case 'hello':
    ws.n=String(m.n||'').trim().slice(0,14)||'Player';
    ws.a=typeof m.a==='string'&&m.a.length<4000&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(m.a)?m.a:'';
    if(r)mem(r);break;
   case 'create':{
    if(r||rooms.size>=300)return;
    const k='abcdefghjkmnpqrstuvwxyz23456789';let c;
    do{c='';for(let i=0;i<5;i++)c+=k[Math.random()*k.length|0]}while(rooms.has(c));
    const x={c,host:ws,m:new Set(),pub:!!m.pub,ph:'l',pl:[],cur:0,syl:'',end:0,win:0,lw:'',ex:null,fb:null,used:new Set()};
    rooms.set(c,x);enter(ws,x);break}
   case 'join':{
    if(r)return;
    const x=rooms.get(String(m.c||'').toLowerCase());
    if(!x)return tx(ws,{t:'err',m:'Lobby not found.'});
    if(x.m.size>=16)return tx(ws,{t:'err',m:'Lobby is full.'});
    enter(ws,x);break}
   case 'leave':leave(ws);break;
   case 'start':
    if(r&&r.host===ws&&r.ph!=='p'){
     r.pl=[...r.m].slice(0,8).sort(()=>Math.random()-.5).map(c=>({id:c.id,l:2}));
     Object.assign(r,{cur:0,syl:pick(SYL),end:fuse(),used:new Set(),lw:'',win:0,ph:'p'});st(r);lobbies();
    }break;
   case 'again':if(r&&r.host===ws&&r.ph==='o'){r.ph='l';r.pl=[];st(r);lobbies()}break;
   case 'word':{
    if(!r||r.ph!=='p'||r.pl[r.cur].id!==ws.id)return;
    const w=String(m.w||'').toLowerCase().trim();
    if(/^[a-z]{3,30}$/.test(w)&&w.includes(r.syl)&&!r.used.has(w)&&WORDS.has(w)){r.used.add(w);r.lw=w;adv(r)}
    else{r.fb={p:ws.id,n:(r.fb?r.fb.n:0)+1};st(r)}
    break}
   case 'type':
    if(r&&r.ph==='p'&&r.pl[r.cur].id===ws.id){const v=String(m.v||'').slice(0,30);r.m.forEach(c=>tx(c,{t:'ty',id:ws.id,v}))}break;
   case 'chat':{
    const t=String(m.m||'').trim().slice(0,140);
    if(!t||Date.now()-ws.lc<700)return;ws.lc=Date.now();
    const o={t:'chat',n:ws.n,m:t};hist.push(o);if(hist.length>30)hist.shift();all(o);break}
  }
 });
 ws.on('close',()=>leave(ws));
});
setInterval(()=>wss.clients.forEach(c=>c.cnt=0),1000);
setInterval(()=>wss.clients.forEach(c=>c.ping()),25000);
server.listen(process.env.PORT||3000,()=>console.log('Choco’s BombParty is running'));

// Render preview stills: node stills.js 1 4.5 8 ...
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('LOG',m.text()));
  await p.goto('file://'+__dirname+'/index.html');await p.evaluate(()=>document.fonts.ready);
  const out=process.env.OUT||'stills';require('fs').mkdirSync(out,{recursive:true});
  for(const t of process.argv.slice(2).map(Number)){await p.evaluate(t=>{for(let x=Math.max(0,t-3);x<t;x+=.1)render(x);render(t)},t);await p.screenshot({path:`${out}/t${t.toFixed(2)}.jpg`,type:'jpeg',quality:70})}
  await b.close();
})();

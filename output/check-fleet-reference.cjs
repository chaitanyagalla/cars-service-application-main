const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');

async function main() {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
  if (!chrome) throw new Error('Chrome was not found');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'universal-mockup-'));
  const port = 19441;
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-allow-origins=*', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide:true, stdio:['ignore','ignore','pipe'] });
  let browserLog='';
  child.stderr.on('data',chunk=>{browserLog+=chunk.toString();});
  child.on('error',error=>console.error('Browser launch:',error.message));
  let ws;
  try {
    let pages;
    for (let i = 0; i < 100; i++) {
      try { pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (pages.some(p => p.type === 'page')) break; } catch {}
      await new Promise(r => setTimeout(r,100));
    }
    if (!pages) throw new Error('Could not connect to the isolated preview browser: '+browserLog.slice(-1500));
    console.log('Connected to isolated browser');
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Browser WebSocket timeout: '+browserLog.slice(-1500))),8000); ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true}); ws.addEventListener('error',e=>{clearTimeout(timer);reject(e);},{once:true}); ws.addEventListener('close',()=>{clearTimeout(timer);reject(new Error('Browser socket closed: '+browserLog.slice(-1500)));},{once:true}); });
    let seq = 0;
    const pending = new Map();
    const errors = [];
    ws.addEventListener('message',e => {
      const message = JSON.parse(e.data);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg=>arg.value || arg.description || '').join(' '));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
      if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
    });
    const call = (method,params={}) => new Promise((resolve,reject) => { const id = ++seq; const timer=setTimeout(()=>reject(new Error('CDP timeout: '+method+' '+browserLog.slice(-1000))),10000); pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}}); ws.send(JSON.stringify({id,method,params})); });
    const evaluate = async expression => { const r = await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const assert = (result,label) => { if (!result) throw new Error('Failed: '+label); console.log('PASS '+label); };
    await call('Runtime.enable');
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});

    await call('Page.navigate',{url:'http://localhost:3000'});
    for(let i=0;i<150;i++) { if(await evaluate("document.querySelectorAll('.fleet-slide').length > 1")) break; await new Promise(r=>setTimeout(r,200)); }
    assert(await evaluate("document.querySelectorAll('.fleet-slide').length > 1"),'live carousel loaded');
    await evaluate('document.fonts.ready');
    await new Promise(r=>setTimeout(r,2500));


    await evaluate("document.getElementById('cars').scrollIntoView({block:'start',behavior:'instant'})");
    await new Promise(r=>setTimeout(r,1000));
    const active = () => evaluate(`document.querySelector('.fleet-slide[data-slot="0"]').getAttribute("aria-label")`);
    const initial = await active();
    await evaluate(`document.querySelector('button[aria-label="Next car"]').click()`);
    await new Promise(r=>setTimeout(r,1000));
    assert(await active() !== initial, 'next arrow advances');
    await evaluate(`document.querySelector('button[aria-label="Previous car"]').click()`);
    await new Promise(r=>setTimeout(r,1000));
    assert(await active() === initial, 'previous arrow returns');
    await evaluate(`document.querySelector('button[aria-label="Show car 1"]').click()`);
    await new Promise(r=>setTimeout(r,1000));
    assert(await evaluate(`document.querySelector('.fleet-dot[aria-current="true"]').getAttribute("aria-label")`) === 'Show car 1', 'pagination selects car');
    await evaluate(`document.querySelector('button[aria-label="Pause automatic sliding"]').click()`);
    const paused = await active();
    await new Promise(r=>setTimeout(r,5200));
    assert(await active() === paused, 'pause stops autoplay');
    await evaluate(`document.querySelector('button[aria-label="Resume automatic sliding"]').click()`);
    await new Promise(r=>setTimeout(r,5200));
    assert(await active() !== paused, 'autoplay resumes at five seconds');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    for (const [width,height] of [[1672,1040],[1280,900],[390,844],[360,800]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate("document.getElementById('cars').scrollIntoView({block:'start',behavior:'instant'})");
      await new Promise(r=>setTimeout(r,500));
      const geometry = await evaluate(`(()=>{const c=document.querySelector('.fleet-slide[data-slot="0"] .car-card');const a=[...document.querySelectorAll(".fleet-nav")].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top}}); return {pageWidth:document.documentElement.scrollWidth,width:innerWidth,card:c.getBoundingClientRect().width,border:getComputedStyle(c).borderColor,arrows:a,fonts:[getComputedStyle(document.body).fontFamily,getComputedStyle(document.getElementById("fleet-heading")).fontFamily]}})()`);
      assert(geometry.pageWidth <= width,'no horizontal overflow '+width);
      assert(geometry.arrows.every(a=>a.left>=0 && a.right<=width),'side arrows visible '+width);
      assert(geometry.border==='rgb(255, 255, 255)','white card borders '+width);
      console.log(JSON.stringify(geometry));
      const shot=await call('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(__dirname,'fleet-reference-'+width+'.png'),Buffer.from(shot.data,'base64'));
    }

    assert(await evaluate('document.querySelectorAll(".fleet-dot").length') === 3, 'three visible pagination dots');
    assert(await evaluate('getComputedStyle(document.querySelector(".car-title-row h3")).color') === 'rgb(173, 88, 0)', 'orange car names');
    for (const [route, selector, label] of [['/', '.hero', 'home'], ['/cars', '.catalog-page', 'catalog']]) {
      await call('Page.navigate',{url:'http://localhost:3000'+route});
      for(let i=0;i<100;i++) { if(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')')) break; await new Promise(r=>setTimeout(r,200)); }
      for (const [width,height] of [[1440,1000],[390,844]]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        await evaluate('scrollTo({top:0,behavior:"instant"})');
        await new Promise(r=>setTimeout(r,600));
        assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'),label+' no overflow '+width);
        const shot=await call('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join(__dirname,'orange-'+label+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    assert(errors.length===0, 'no browser errors '+errors.join('; '));
  } finally {
    if(ws) ws.close();
    child.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

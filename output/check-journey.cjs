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


    await call('Emulation.setDeviceMetricsOverride',{width:1536,height:864,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://localhost:3000'});
    for(let i=0;i<120;i++) { if(await evaluate("document.querySelectorAll('.journey-tab').length===4")) break; await new Promise(r=>setTimeout(r,200)); }
    await evaluate('document.fonts.ready');
    await new Promise(r=>setTimeout(r,1500));
    await evaluate('document.getElementById("how-it-works").scrollIntoView({block:"start",behavior:"instant"})');
    assert(await evaluate('document.querySelectorAll(\'.journey-tab[aria-selected="true"]\').length===1'),'exactly one process step selected');
    const initialHeight=await evaluate('document.querySelector(".journey-panels").getBoundingClientRect().height');
    const screenshot=async(name)=>{const s=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,name),Buffer.from(s.data,'base64'));};
    await screenshot('journey-desktop-check.png');
    for(let i=1;i<4;i++) {
      await evaluate('document.querySelectorAll(".journey-tab")['+i+'].click()');
      await new Promise(r=>setTimeout(r,450));
      assert(await evaluate('document.querySelectorAll(".journey-tab")['+i+'].getAttribute("aria-selected")==="true" && document.querySelectorAll(".journey-panel")['+i+'].inert===false && document.querySelectorAll(\'.journey-panel[aria-hidden="false"]\').length===1'),'step '+(i+1)+' updates its accessible detail panel');
      assert(Math.abs(await evaluate('document.querySelector(".journey-panels").getBoundingClientRect().height')-initialHeight)<1,'detail panel does not jump between steps');
    }
    await evaluate('document.querySelectorAll(".journey-tab")[2].click()');
    await new Promise(r=>setTimeout(r,450));
    assert(await evaluate('document.querySelectorAll(".journey-panel")[2].querySelector("a").href.startsWith("https://wa.me/")'),'confirmation step links to the configured WhatsApp enquiry');
    await screenshot('journey-confirm-check.png');
    await evaluate('document.querySelectorAll(".journey-tab")[2].focus()');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
    assert(await evaluate('document.querySelectorAll(".journey-tab")[3]===document.activeElement && document.activeElement.getAttribute("aria-selected")==="true"'),'arrow keys change steps and move keyboard focus');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});
    await evaluate('document.querySelectorAll(".journey-panel")[0].querySelector(".journey-next").click()');
    assert(await evaluate('document.querySelectorAll(".journey-tab")[1].getAttribute("aria-selected")==="true"'),'next step button moves forward');
    await evaluate('for(let i=0;i<12;i++)document.querySelectorAll(".journey-tab")[i%4].click()');
    await new Promise(r=>setTimeout(r,450));
    assert(await evaluate('document.querySelectorAll(".journey-tab")[3].getAttribute("aria-selected")==="true" && getComputedStyle(document.querySelectorAll(".journey-panel")[3]).opacity==="1"'),'rapid selection settles on the last chosen step');
    for(const width of [1536,1024,768,390,320]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:864,deviceScaleFactor:1,mobile:false});
      await evaluate('document.getElementById("how-it-works").scrollIntoView({block:"start",behavior:"instant"})');
      await new Promise(r=>setTimeout(r,150));
      assert(await evaluate('[...document.querySelectorAll(".booking-journey, .booking-journey *")].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth}) && [...document.querySelectorAll(".journey-tab")].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth})'),'process section fits '+width+'px');
      if(width===390)await screenshot('journey-mobile-check.png');
    }
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert(await evaluate('getComputedStyle(document.querySelector(".journey-panel")).transitionDuration==="0s"'),'reduced motion is respected');
    assert(errors.length===0,'no browser errors: '+errors.join('; '));
    console.log('Journey checks passed.');
  } finally {
    if(ws) ws.close();
    child.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

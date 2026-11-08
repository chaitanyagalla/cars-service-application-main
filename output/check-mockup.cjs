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
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
      if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
    });
    const call = (method,params={}) => new Promise((resolve,reject) => { const id = ++seq; const timer=setTimeout(()=>reject(new Error('CDP timeout: '+method+' '+browserLog.slice(-1000))),10000); pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}}); ws.send(JSON.stringify({id,method,params})); });
    const evaluate = async expression => { const r = await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const assert = (result,label) => { if (!result) throw new Error('Failed: '+label); console.log('PASS '+label); };
    await call('Runtime.enable');
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:pathToFileURL(path.join(__dirname,'universal-interactive-mockup.html')).href});
    for(let i=0;i<150;i++) { try { if(await evaluate("document.querySelectorAll('.car-card').length === 3")) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
    assert(await evaluate("document.querySelectorAll('.car-card').length === 3"),'initial fleet render');
    assert(await evaluate("document.querySelector('[data-filter=Sedan]').click(); document.querySelectorAll('.car-card').length === 1 && document.querySelector('.car-top h3').textContent === 'Maruti Dzire'"),'category filter');
    assert(await evaluate("document.querySelector('[data-filter=SUV]').click(); !!document.querySelector('[data-reset]')"),'empty filter state');
    assert(await evaluate("document.querySelector('[data-reset]').click(); document.querySelectorAll('.car-card').length === 3"),'reset filters');
    assert(await evaluate("document.getElementById('car-search').value='tiago'; document.getElementById('car-search').dispatchEvent(new Event('input')); document.querySelectorAll('.car-card').length === 1 && document.querySelector('.car-top h3').textContent === 'Tata Tiago'"),'name search');
    await evaluate("document.getElementById('show-all').click()");
    assert(await evaluate("document.getElementById('hero-next').click(); document.getElementById('hero-car-name').textContent === 'Tata Tiago'"),'featured car carousel');
    assert(await evaluate("document.querySelector('[data-palette-choice=blue]').click(); document.documentElement.dataset.palette === 'blue'"),'palette switch');
    await evaluate("document.querySelector('[data-palette-choice=coast]').click()");
    assert(await evaluate("document.querySelector('[data-details=swift]').click(); document.getElementById('preview-dialog').open && document.querySelector('.detail-summary h2').textContent === 'Maruti Swift'"),'car details dialog');
    assert(await evaluate("document.querySelector('[data-start-enquiry]').click(); !!document.getElementById('enquiry-form')"),'enquiry preview');
    assert(await evaluate("document.querySelector('[name=customerName]').value='Sample Driver'; document.querySelector('[name=customerPhone]').value='9876543210'; document.querySelector('[name=pickupLocation]').value='Gachibowli'; document.getElementById('enquiry-form').requestSubmit(); document.querySelector('.message-preview').textContent.includes('Sample Driver') && document.querySelector('.message-preview').textContent.includes('Maruti Swift')"),'local enquiry message generation');
    await evaluate("document.getElementById('preview-dialog').close()");
    assert(await evaluate("document.querySelector('[data-step=\"2\"]').click(); document.getElementById('step-description').textContent.includes('WhatsApp')"),'process step interaction');
    assert(await evaluate("document.querySelector('[data-area=Gachibowli]').click(); document.getElementById('location-note').textContent.startsWith('Gachibowli selected')"),'area selection');
    assert(await evaluate("document.querySelectorAll('.faq-list details')[1].open=true; document.querySelectorAll('.faq-list details')[1].open"),'FAQ expandable state');
    await evaluate("Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})))");
    assert(await evaluate("Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)"),'self-contained images load');
    await evaluate("document.getElementById('hero-prev').click(); document.querySelector('[data-step=\"0\"]').click(); document.querySelector('[data-area=Vanasthalipuram]').click(); document.querySelectorAll('.faq-list details')[1].open=false");
    const desktop = await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(__dirname,'mockup-desktop.png'),Buffer.from(desktop.data,'base64'));
    for(const width of [1440,1024,768,390,320]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await new Promise(r=>setTimeout(r,80));
      const layout = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,over:Array.from(document.querySelectorAll("body *")).filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1 || r.left < -1) && !e.closest(".car-image,.hero-photo,.detail-photo,.hero-stage,.symbols,dialog")}).map(e=>e.className).slice(0,12)})');
      assert(layout.scroll<=layout.width,`layout fits ${width}px ${JSON.stringify(layout)}`);
      if(width===390) {
        const mobile = await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
        fs.writeFileSync(path.join(__dirname,'mockup-mobile.png'),Buffer.from(mobile.data,'base64'));
      }
    }
    assert(errors.length===0,'no browser JavaScript exceptions: '+errors.join('; '));
    console.log('All preview checks passed.');
  } finally {
    if(ws) ws.close();
    child.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

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

    const heroLayout=await evaluate('({fleetTop:document.getElementById("cars").getBoundingClientRect().top,height:innerHeight,subtitle:document.body.textContent.includes("From fuel-efficient hatchbacks")})');
    assert(heroLayout.fleetTop>=heroLayout.height-2 && !heroLayout.subtitle,'fleet begins below the hero viewport and subtitle is removed');
    await evaluate("document.querySelector('.fleet-carousel').scrollIntoView({block:'center'})");
    await new Promise(r=>setTimeout(r,1200));
    await evaluate("document.querySelector('.fleet-carousel').scrollIntoView({block:'center',behavior:'instant'})");
    await evaluate("window.fleetChanges=[]; new MutationObserver(()=>{const e=document.querySelector('.fleet-slide[data-slot=\"0\"]'); if(window.fleetChanges.at(-1)?.label!==e.getAttribute('aria-label'))window.fleetChanges.push({label:e.getAttribute('aria-label'),time:performance.now()})}).observe(document.querySelector('.fleet-stage'),{subtree:true,attributes:true,attributeFilter:['data-slot']})");
    await new Promise(r=>setTimeout(r,8500));
    const changes=await evaluate('window.fleetChanges');
    assert(changes.length>=2 && Math.abs(changes[1].time-changes[0].time-4000)<400,'automatic rotation every four seconds '+JSON.stringify(changes));
    // Synchronize with a rotation, then inspect hover before the next timer tick.
    const before=await evaluate('window.fleetChanges.length');
    for(let i=0;i<45;i++){if(await evaluate('window.fleetChanges.length')>before)break;await new Promise(r=>setTimeout(r,100));}
    await new Promise(r=>setTimeout(r,1000));
    const point=await evaluate('(()=>{const e=document.querySelector(\'.fleet-slide[data-slot="-1"]\'); const r=e.getBoundingClientRect(); const s=document.querySelector(".fleet-stage").getBoundingClientRect(); window.hoverTarget=e; return {x:Math.round(Math.max(r.left,s.left)+35),y:Math.round(r.top+r.height/2),transform:getComputedStyle(e).transform,width:e.firstElementChild.getBoundingClientRect().width}})()');
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});

    const cornerSamples=[];
    for(let frame=0;frame<8;frame++) {
      cornerSamples.push(await evaluate('({radius:getComputedStyle(hoverTarget.firstElementChild).borderRadius,overflow:getComputedStyle(hoverTarget.firstElementChild).overflow,clip:getComputedStyle(hoverTarget.querySelector(".car-card")).clipPath})'));
      if(frame===2) {
        const frameImage=await call('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join(__dirname,'fleet-corners-mid-transition.png'),Buffer.from(frameImage.data,'base64'));
      }
      await new Promise(r=>setTimeout(r,80));
    }
    assert(cornerSamples.every(s=>s.radius==='20px' && s.overflow==='hidden' && s.clip==='inset(0px round 20px)'),'rounded clipping remains constant throughout hover animation');
    await new Promise(r=>setTimeout(r,400));
    const hover=await evaluate('({slot:hoverTarget.dataset.slot,hovered:hoverTarget.dataset.hovered,transform:getComputedStyle(hoverTarget).transform,width:hoverTarget.firstElementChild.getBoundingClientRect().width,blur:getComputedStyle(hoverTarget).filter,inert:hoverTarget.firstElementChild.inert})');
    assert(hover.slot==='-1' && hover.transform===point.transform,'hover preserves the card position');
    assert(hover.hovered==='true' && hover.width>point.width*1.15 && hover.blur==='none' && !hover.inert,'hover smoothly enlarges and reveals the card '+JSON.stringify(hover));
    const center=await evaluate('(()=>{const e=document.querySelector(\'.fleet-slide[data-slot="0"]\');return {muted:e.dataset.muted,width:e.firstElementChild.getBoundingClientRect().width,opacity:getComputedStyle(e).opacity,blur:getComputedStyle(e).filter}})()');
    assert(center.muted==='true' && center.width<hover.width && center.opacity==='1' && center.blur==='none','middle card stays crisp and opaque while smaller than hovered card');
    const screenshot=await call('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(__dirname,'fleet-hover-check.png'),Buffer.from(screenshot.data,'base64'));
    const hoverChanges=await evaluate('window.fleetChanges.length');
    await new Promise(r=>setTimeout(r,4500));
    assert(await evaluate('window.fleetChanges.length')===hoverChanges,'rotation stays paused while hovering');
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
    const leaveTime=await evaluate('performance.now()');
    await new Promise(r=>setTimeout(r,1100));
    const restored=await evaluate('(()=>{const e=document.querySelector(\'.fleet-slide[data-slot="0"]\');return {muted:e.dataset.muted,width:e.firstElementChild.getBoundingClientRect().width,opacity:getComputedStyle(e).opacity,blur:getComputedStyle(e).filter}})()');
    assert(restored.muted==='false' && restored.width>hover.width && restored.opacity==='1' && restored.blur==='none','middle card smoothly regains main focus on unhover');
    await new Promise(r=>setTimeout(r,2300));
    assert(await evaluate('window.fleetChanges.length')===hoverChanges,'no immediate rotation after unhover');
    await new Promise(r=>setTimeout(r,900));
    const resumed=await evaluate('window.fleetChanges');
    assert(resumed.length===hoverChanges+1 && Math.abs(resumed.at(-1).time-leaveTime-4000)<400,'rotation resumes after a fresh four-second delay');

    await new Promise(r=>setTimeout(r,1000));
    const activeLabel='document.querySelector(\'.fleet-slide[data-slot="0"]\').getAttribute("aria-label")';
    const initial=await evaluate(activeLabel);
    const clickNav=async(label)=>{
      const point=await evaluate('(()=>{const e=document.querySelector(\'button[aria-label="'+label+'"]\');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
      await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    };
    await clickNav('Next car');
    await new Promise(r=>setTimeout(r,1100));
    assert(await evaluate(activeLabel)!==initial,'next circular button advances the car');
    await clickNav('Previous car');
    await new Promise(r=>setTimeout(r,1100));
    assert(await evaluate(activeLabel)===initial,'previous circular button returns to the car');
    assert(await evaluate('getComputedStyle(document.querySelector(".fleet-slide")).transitionDuration.includes("0.9s")'),'navigation uses smooth transitions');
    const controlsImage=await call('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(__dirname,'fleet-controls-check.png'),Buffer.from(controlsImage.data,'base64'));

    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    const reducedChanges=await evaluate('window.fleetChanges.length');
    await new Promise(r=>setTimeout(r,4500));
    assert(await evaluate('window.fleetChanges.length')>reducedChanges,'reduced-motion preference preserves four-second rotation');

    for(const [width,height] of [[1536,776],[1280,800],[390,844]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate('scrollTo({top:0,behavior:"instant"})');
      await new Promise(r=>setTimeout(r,250));
      const layout=await evaluate('({fleetTop:document.getElementById("cars").getBoundingClientRect().top,viewport:innerHeight,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,cardWidth:parseFloat(getComputedStyle(document.querySelector(".fleet-slide")).width)})');
      assert(layout.fleetTop>=height-2 && layout.scrollWidth<=width && layout.cardWidth<=464,'compact responsive layout '+width+'px '+JSON.stringify(layout));
      if(width===1536) {
        const heroImage=await call('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join(__dirname,'hero-full-viewport-check.png'),Buffer.from(heroImage.data,'base64'));
        await evaluate('scrollTo({top:document.getElementById("cars").offsetTop-80,behavior:"instant"})');
        await new Promise(r=>setTimeout(r,200));
        const compactImage=await call('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join(__dirname,'fleet-compact-check.png'),Buffer.from(compactImage.data,'base64'));
      }
    }
    assert(errors.length===0,'no browser JavaScript exceptions: '+errors.join('; '));
    console.log('Fleet checks passed.');
  } finally {
    if(ws) ws.close();
    child.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

// Contacts are enabled only in intercepted test responses, not in project files.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
  const base=process.env.BASE_URL||'http://127.0.0.1:8080/';
  const context=await browser.newContext();const page=await context.newPage();
  const config=fs.readFileSync(path.join(__dirname,'../assets/config.js'),'utf8').replace('contactsConfigured: false','contactsConfigured: true');
  await page.route('**/assets/config.js',route=>route.fulfill({contentType:'application/javascript',body:config}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');let mail='';cdp.on('Page.windowOpen',e=>{if(e.url.startsWith('mailto:'))mail=e.url});
  await page.goto(new URL('constructor.html',base).href);await page.waitForSelector('#price');await page.locator('#request-button').click();
  await page.locator('[name=name]').fill('Тестовый заказчик');await page.locator('[name=phone]').fill('+7 999 123-45-67');await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=comment]').fill('Нужен отвал для трактора');
  assert(await page.locator('#request-form').evaluate(f=>f.checkValidity()));
  await page.locator('#request-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#form-status')?.textContent.includes('Отправка не подтверждена'));
  assert(mail.startsWith('mailto:sales@example.com?'));assert(decodeURIComponent(mail).includes('Тестовый заказчик'));assert(decodeURIComponent(mail).includes('КОМПЛЕКТАЦИЯ'));assert(page.url().includes('constructor.html'));assert.deepEqual(errors,[]);
  console.log('PASS mailto includes customer details and specification, keeps project open and does not claim delivery');
  await context.close();
  const offline=await browser.newContext();await offline.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());const op=await offline.newPage();await op.goto(new URL('constructor.html',base).href);await op.waitForSelector('#builder-scene[data-ready=true]');assert((await op.locator('#price').innerText()).includes('₽'));console.log('PASS no external network required for 3D and calculator');
  const touch=await browser.newPage({viewport:{width:320,height:760},isMobile:true,hasTouch:true});await touch.goto(new URL('constructor.html',base).href);await touch.waitForSelector('#price');assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await touch.locator('#width-number').fill('4000');await touch.locator('#height-number').fill('1500');await touch.locator('#height-number').blur();await touch.screenshot({path:'/tmp/otval-320.png'});assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));console.log('PASS 320px viewport and maximum blade dimensions');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

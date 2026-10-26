const assert=require('node:assert/strict');const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const go=async url=>{await page.goto((process.env.BASE_URL||'http://127.0.0.1:8080/')+url);await page.waitForSelector('main h1');};
 let count=0;const ok=m=>{console.log('PASS',m);count++};
 await go('constructor.html');await page.waitForSelector('#builder-scene[data-ready=true]');
 const original=await page.locator('#price').innerText();
 await page.locator('#width-number').fill('3200');await page.locator('#width-number').blur();assert.notEqual(await page.locator('#price').innerText(),original);assert.equal(await page.locator('input[type=range][name=width]').inputValue(),'3200');ok('Width updates price and range in real time');
 const before=await page.locator('#builder-scene canvas').screenshot();
 await page.locator('input[name=type][value=v]').check();await page.waitForTimeout(150);const after=await page.locator('#builder-scene canvas').screenshot();assert(!before.equals(after));ok('Changing type visibly changes live 3D geometry');
 for(const n of [3,4,5,6,7])await page.locator('.config-step').nth(n-1).evaluate(el=>el.open=true);
 await page.locator('[name=material][value=wear]').check();await page.locator('[name=mount]').selectOption('front');
 await page.locator('[name=mechanism]').selectOption('none');assert.equal(await page.locator('#hydraulic-fields').isVisible(),false);
 await page.locator('[name=mechanism]').selectOption('hydraulic');assert.equal(await page.locator('#hydraulic-fields').isVisible(),true);
 await page.locator('[name=cylinders]').selectOption('1');await page.locator('[name=options][value=wings]').check();
 const colorBefore=await page.locator('#builder-scene canvas').screenshot();await page.locator('[name=color][value="#2563eb"]').check();await page.waitForTimeout(150);assert(!(await page.locator('#builder-scene canvas').screenshot()).equals(colorBefore));ok('Material, attachment, hydraulics, options and color controls work');
 await page.locator('#width-number').fill('9999');await page.locator('#width-number').blur();assert.equal(await page.locator('#width-number').inputValue(),'4000');
 await page.locator('#height-number').fill('-50');await page.locator('#height-number').blur();assert.equal(await page.locator('#height-number').inputValue(),'400');ok('Out-of-range dimensions clamp to safe limits');
 const price=await page.locator('#price').innerText();await page.reload();await page.waitForSelector('#builder-scene[data-ready=true]');assert.equal(await page.locator('#price').innerText(),price);assert.equal(await page.locator('#width-number').inputValue(),'4000');ok('Full draft restored after reload');
 await page.locator('#save-project').click();await page.locator('[name=projectName]').fill('Мой V-отвал');await page.locator('#save-form button[type=submit]').click();assert.equal(await page.locator('#projects-count').innerText(),'1');
 await page.locator('#projects-button').click();assert(await page.locator('.projects-list').innerText().then(t=>t.includes('Мой V-отвал')));await page.locator('[data-load]').click();await page.waitForSelector('#price');assert.equal(await page.locator('#price').innerText(),price);ok('Named projects save and restore');
 const downloadPromise=page.waitForEvent('download');await page.locator('#download-config').click();const download=await downloadPromise;const path=await download.path();const text=fs.readFileSync(path,'utf8');assert(text.includes('4000 мм'));assert(text.includes('V-образный'));assert(text.includes('Предварительный расчёт'));ok('Downloaded specification contains chosen dimensions and type');
 await page.locator('#request-button').click();assert(await page.locator('#request-form button[type=submit]').isDisabled());await page.locator('.request-summary details summary').click();assert((await page.locator('.request-summary pre').innerText()).includes('Износостойкая'));await page.locator('#edit-config').click();ok('Order summary is complete; placeholder email cannot produce false success');
 for(const view of ['front','side','top','back','perspective']){await page.locator(`[data-view=${view}]`).click();assert((await page.locator(`[data-view=${view}]`).getAttribute('class')).includes('active'));}ok('All five camera views work');
 await page.locator('#fullscreen').click();assert(await page.evaluate(()=>Boolean(document.fullscreenElement)||document.querySelector('.viewer-card').classList.contains('expanded')));await page.locator('#fullscreen').click();ok('Fullscreen enters and exits');
 await go('catalog.html');assert.equal(await page.locator('.product-card').count(),6);await page.locator('[data-filter=skid]').click();assert.equal(await page.locator('.product-card').count(),1);await page.locator('[data-filter=all]').click();await page.locator('#sort').selectOption('price');const prices=await page.locator('.product-bottom>span').allInnerTexts();const nums=prices.map(t=>Number(t.replace(/\D/g,'')));assert.deepEqual(nums,[...nums].sort((a,b)=>a-b));ok('Catalog filters and price sorting work');
 await page.goto(new URL('constructor.html?product=3',process.env.BASE_URL||'http://127.0.0.1:8080/').href);await page.waitForSelector('#price');assert.equal(await page.locator('[name=mount]').inputValue(),'front');assert.equal(await page.locator('#width-number').inputValue(),'3000');ok('Catalog preconfigures selected model');
 await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));
 for(const url of ['index.html','catalog.html','constructor.html','production.html','delivery.html','contacts.html']){
  await mp.goto((process.env.BASE_URL||'http://127.0.0.1:8080/')+url);await mp.waitForSelector('main h1');
  assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),url+' mobile horizontal overflow');
  if(url==='index.html'){await mp.waitForSelector('#hero-model[data-ready=true]');await mp.waitForTimeout(300);await mp.screenshot({path:'/tmp/otval-mobile.png',fullPage:true});}
 }
 await mp.locator('.menu-toggle').click();assert.equal(await mp.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await mp.locator('#main-nav a[href="constructor.html"]').click();await mp.waitForSelector('#builder-scene[data-ready=true]');await mp.locator('#mobile-request').click();assert(await mp.locator('#info-dialog').isVisible());ok('Six mobile pages fit viewport; menu and sticky order button work');
 await mp.locator('#info-dialog .close-dialog').click();await mp.screenshot({path:'/tmp/otval-mobile-builder.png',fullPage:true});
 assert.deepEqual(errors,[]);ok('No browser JavaScript or resource errors');
 console.log('TOTAL',count,'PASSED');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

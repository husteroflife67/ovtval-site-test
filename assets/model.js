import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

export function createViewer(host, initial, {hero=false}={}) {
  const loading=host.querySelector('.scene-loading');
  let renderer;
  try { renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<2,alpha:true,preserveDrawingBuffer:true}); }
  catch { if(loading) loading.innerHTML='3D недоступно в этом браузере. Попробуйте включить WebGL.<br>Все настройки и расчёт продолжают работать.'; return {update(){},view(){},dispose(){}}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.4;
  renderer.domElement.setAttribute('aria-label','Интерактивная 3D-модель отвала. Вращайте мышью или пальцем, используйте колесо или два пальца для масштаба.');
  renderer.domElement.setAttribute('role','img'); host.prepend(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.05,100);
  const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07;
  controls.minDistance=2.5; controls.maxDistance=12; controls.maxPolarAngle=Math.PI*.49; controls.enablePan=false;
  controls.autoRotate=hero&&!matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed=.35;
  controls.addEventListener('start',()=>controls.autoRotate=false);
  scene.add(new THREE.HemisphereLight(0xe5efff,0x55535a,3));
  const sun=new THREE.DirectionalLight(0xfff0df,5); sun.position.set(-3,6,5); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4}); sun.shadow.bias=-.001; scene.add(sun);
  const rim=new THREE.DirectionalLight(0xffffff,4); rim.position.set(3,2,-3); scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:hero?.32:.13})); floor.rotation.x=-Math.PI/2; floor.position.y=-.035; floor.receiveShadow=true; scene.add(floor);
  let assembly;
  let frameScale=Math.max(1,initial.width/2800,initial.height/1000);
  const dark=new THREE.MeshStandardMaterial({color:0x252b32,metalness:.7,roughness:.38});
  const steel=new THREE.MeshStandardMaterial({color:0x9ca7af,metalness:.88,roughness:.26});
  const rubber=new THREE.MeshStandardMaterial({color:0x17181a,roughness:.95});
  function mesh(g,m,parent=assembly,x=0,y=0,z=0) {const a=new THREE.Mesh(g,m); a.position.set(x,y,z); a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
  const box=(w,h,d,m,p,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
  function rod(a,b,r,mat,parent=assembly){const dir=new THREE.Vector3().subVectors(b,a);const o=mesh(new THREE.CylinderGeometry(r,r,dir.length(),12),mat,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return o;}
  function update(c){
    if(assembly){scene.remove(assembly);assembly.traverse(o=>{o.geometry?.dispose();if(o.material?.userData.temporary)o.material.dispose();});}
    assembly=new THREE.Group();scene.add(assembly);
    const paint=new THREE.MeshStandardMaterial({color:c.color,metalness:.42,roughness:.31,side:THREE.DoubleSide});paint.userData.temporary=true;
    const white=new THREE.MeshStandardMaterial({color:0xf8f5e9,roughness:.5});white.userData.temporary=true;
    const red=new THREE.MeshStandardMaterial({color:0xe43b21,roughness:.6});red.userData.temporary=true;
    const w=c.width/1000,h=c.height/1000,t=c.thickness/1000;
    const count=c.type==='v'?2:1;
    for(let side=0;side<count;side++){
      const group=new THREE.Group();assembly.add(group);
      const width=count===2?w/2:w;
      if(count===2){group.position.x=(side===0?-1:1)*w/4;group.rotation.y=(side===0?-1:1)*.34;group.position.z=-.12;}
      const shape=new THREE.Shape();
      const curvature={straight:.18,swivel:.32,v:.28,snow:.43,reinforced:.24,custom:.36}[c.type];
      const zAt=f=>curvature*Math.pow(f-.42,2)*2.4;
      shape.moveTo(zAt(0),0);
      for(let j=1;j<=24;j++){const f=j/24;shape.lineTo(zAt(f),f*h);}
      for(let j=24;j>=0;j--){const f=j/24;shape.lineTo(zAt(f)+t,f*h);}
      shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,steps:1});
      // Cross-section x is depth and extrusion z is width.
      geo.rotateY(-Math.PI/2);geo.translate(width/2,0,0);
      mesh(geo,paint,group);
      box(width,.11,c.edge/1000,c.options.includes('rubber')?rubber:dark,group,0,.045,.14);
      box(width+.025,c.type==='reinforced'?.085:.045,.045,paint,group,0,h,zAt(1));
      const ribCount=c.options.includes('ribs')||c.type==='reinforced'?Math.max(4,Math.round(width/.32)):3;
      for(let i=0;i<ribCount;i++){
        const x=-width/2+.1+i*(width-.2)/(ribCount-1);
        box(.035,h*.84,.18,paint,group,x,h*.5,-.12);
        for(const y of [.045,.12]){const bolt=mesh(new THREE.CylinderGeometry(.014,.014,.034,6),steel,group,x,y,.165);bolt.rotation.x=Math.PI/2;}
      }
      box(width*.9,.075,.075,dark,group,0,h*.5,-.25);
      if(c.options.includes('protection'))box(width,.13,.045,dark,group,0,h*.86,.18);
      if(c.options.includes('reflectors'))for(const s of [-1,1]){box(.18,.07,.025,white,group,s*(width/2-.18),h*.82,.23);box(.05,.07,.027,red,group,s*(width/2-.18),h*.82,.25);}
    }
    // Distinct attachment geometry behind the blade.
    const mountW={universal:.7,mtz:.65,skid:1.1,front:1.25,custom:.9}[c.mount];
    box(mountW,.12,.12,dark,assembly,0,h*.4,-.5);
    for(const s of [-1,1]){
      rod(new THREE.Vector3(s*.2,h*.3,-.2),new THREE.Vector3(s*mountW/2,h*.35,-.8),.045,dark);
      box(.1,c.mount==='front'?.55:.35,.14,dark,assembly,s*mountW/2,h*.4,-.8);
      if(c.mount==='mtz')rod(new THREE.Vector3(s*mountW/2-.08,h*.5,-.8),new THREE.Vector3(s*mountW/2+.08,h*.5,-.8),.035,steel);
    }
    if(c.type==='swivel'){const pivot=mesh(new THREE.CylinderGeometry(.14,.14,.12,24),dark,assembly,0,h*.42,-.4);pivot.rotation.z=Math.PI/2;}
    if(c.mount==='skid')box(mountW,.38,.06,dark,assembly,0,h*.42,-.86);
    if(c.mount==='custom')box(mountW*.7,.07,.42,paint,assembly,0,h*.68,-.65);
    if(c.mechanism==='hydraulic')for(let i=0;i<c.cylinders;i++){
      const x=c.cylinders===1?0:(i===0?-.36:.36);
      const a=new THREE.Vector3(x,h*.5,-.24),b=new THREE.Vector3(x*.6,h*.45,-.72);
      const mid=a.clone().lerp(b,.55);rod(a,mid,.045,steel);rod(mid,b,.067,dark);
      const curve=new THREE.CatmullRomCurve3([b,new THREE.Vector3(x+.1,h*.7,-.6),new THREE.Vector3(x+.08,h*.55,-.3)]);mesh(new THREE.TubeGeometry(curve,12,.012,5,false),rubber);
    }
    if(c.mechanism==='mechanical')rod(new THREE.Vector3(0,h*.4,-.2),new THREE.Vector3(.2,h*.4,-.8),.03,steel);
    if(c.options.includes('wings'))for(const s of [-1,1]){const wing=box(.045,h*.7,.43,paint,assembly,s*w/2,h*.38,.23);wing.rotation.y=s*-.15;}
    if(c.options.includes('skis'))for(const s of [-1,1]){box(.18,.035,.38,dark,assembly,s*w*.35,.01,-.17);rod(new THREE.Vector3(s*w*.35,0,-.17),new THREE.Vector3(s*w*.35,.32,-.17),.025,steel);}
    if(c.options.includes('flags'))for(const s of [-1,1]){rod(new THREE.Vector3(s*(w/2-.04),h,-.02),new THREE.Vector3(s*(w/2+.07),h+.48,-.02),.012,steel);box(.19,.14,.012,red,assembly,s*(w/2+.14),h+.4,-.02);}
    if(c.type==='snow')box(w,.09,.06,rubber,assembly,0,h+.04,.24);
    if(c.type==='custom')for(const s of [-1,1])box(.12,h,.24,paint,assembly,s*w*.38,h*.5,-.2);
    assembly.rotation.y=c.mechanism==='hydraulic'?(c.angle-25)*Math.PI/180:0;
    const scale=Math.max(1,c.width/2800,c.height/1000);
    camera.position.sub(controls.target).multiplyScalar(scale/frameScale).add(controls.target);frameScale=scale;
    controls.target.set(0,h*.5,0);
    host.dataset.ready='true';if(loading)loading.hidden=true;
  }
  function view(which='perspective'){
    const positions={perspective:[2.6,1.7,3.7],front:[0,1.1,4.8],side:[4.8,1.1,0],top:[0,4.8,.01],back:[-2.6,1.8,-3.7]};
    camera.position.set(...(positions[which]||positions.perspective)).multiplyScalar(frameScale);controls.update();
  }
  view();update(initial);
  const ro=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}});ro.observe(host);
  let visible=true;const io=new IntersectionObserver(es=>visible=es[0].isIntersecting);io.observe(host);
  let frame;function animate(){frame=requestAnimationFrame(animate);if(visible&&!document.hidden){controls.update();renderer.render(scene,camera);}}animate();
  return {update,view,renderer,dispose(){cancelAnimationFrame(frame);ro.disconnect();io.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();});dark.dispose();steel.dispose();rubber.dispose();renderer.dispose();}};
}

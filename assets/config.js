// Редактируемые контакты и демонстрационные расценки. Все суммы в рублях.
export const COMPANY = {
  name: 'ОТВАЛ', descriptor: 'ИНЖЕНЕРИЯ СИЛЫ',
  phone: '+7 (000) 000-00-00', email: 'sales@example.com',
  address: 'Ваш город, адрес производства', hours: 'Пн–Пт, 09:00–18:00',
  contactsConfigured: false,
};
export const PRICING = {
  base: 24500, steelKg: 135, paintPerM2: 950, density: 7850,
  types: { straight: 1, swivel: 1.15, v: 1.38, snow: 1.12, reinforced: 1.4, custom: 1.5 },
  materials: { st3: 1, low: 1.28, wear: 1.75 },
  mounts: { universal: 8500, mtz: 12000, skid: 15500, front: 22000, custom: 28000 },
  mechanisms: { none: 0, mechanical: 9000, hydraulic: 28500 },
  options: { ribs: 6500, rubber: 4800, protection: 5500, wings: 11000, skis: 6200, flags: 1800, reflectors: 1200 },
  customPaint: 3500, hydraulicCylinder: 6500,
};
export const TYPES = { straight: 'Прямой', swivel: 'Поворотный', v: 'V-образный', snow: 'Снегоуборочный', reinforced: 'Усиленный', custom: 'Индивидуальный' };
export const MATERIALS = { st3: 'Сталь Ст3', low: 'Сталь 09Г2С', wear: 'Износостойкая сталь' };
export const MOUNTS = { universal: 'Универсальное', mtz: 'Для МТЗ', skid: 'Для мини-погрузчика', front: 'Для фронтального погрузчика', custom: 'Индивидуальное' };
export const MECHANISMS = { none: 'Без поворота', mechanical: 'Механический', hydraulic: 'Гидравлический' };
export const OPTIONS = { ribs: 'Усиленные рёбра', rubber: 'Резиновая кромка', protection: 'Дополнительная защита', wings: 'Боковые крылья', skis: 'Опорные лыжи', flags: 'Сигнальные флажки', reflectors: 'Светоотражатели' };
export const DEFAULT = { type:'swivel', width:2400, height:800, thickness:6, edge:12, material:'low', mount:'mtz', mechanism:'hydraulic', cylinders:2, angle:25, options:['ribs','flags'], color:'#ff6b00', customColor:false, model:'ОТ-2400' };
export function normalize(raw={}) {
  const c={...DEFAULT,...raw};
  for(const [k,values] of Object.entries({type:TYPES,material:MATERIALS,mount:MOUNTS,mechanism:MECHANISMS})) if(!Object.hasOwn(values,c[k])) c[k]=DEFAULT[k];
  for(const [k,min,max] of [['width',1200,4000],['height',400,1500],['thickness',3,12],['edge',6,20],['cylinders',1,2],['angle',0,35]]) c[k]=Math.max(min,Math.min(max,Math.round(Number.isNaN(Number(c[k]))?DEFAULT[k]:Number(c[k]))));
  c.options=Array.isArray(c.options)?[...new Set(c.options.filter(x=>Object.hasOwn(OPTIONS,x)))]:[...DEFAULT.options];
  if(!/^#[0-9a-f]{6}$/i.test(c.color)) c.color=DEFAULT.color;
  c.customColor=Boolean(c.customColor); c.model=String(c.model||DEFAULT.model).slice(0,70);
  return c;
}
export function calculate(c) {
  const area=c.width*c.height/1e6;
  const shell=area*1.14*c.thickness/1000*PRICING.density;
  const edge=c.width/1000*.12*c.edge/1000*PRICING.density;
  const optionMass={ribs:18,rubber:12,protection:15,wings:26,skis:16,flags:1,reflectors:.4};
  const mountMass={universal:36,mtz:48,skid:55,front:75,custom:65};
  const mass=shell+edge+mountMass[c.mount]+c.options.reduce((n,k)=>n+optionMass[k],0)+(c.mechanism==='hydraulic'?18*c.cylinders:c.mechanism==='mechanical'?12:0);
  const base=Math.round(PRICING.base*PRICING.types[c.type]);
  const materials=Math.round((shell+edge)*PRICING.steelKg*PRICING.materials[c.material]);
  const equipment=PRICING.mounts[c.mount]+PRICING.mechanisms[c.mechanism]+(c.mechanism==='hydraulic'?(c.cylinders-1)*PRICING.hydraulicCylinder:0);
  const options=c.options.reduce((n,k)=>n+PRICING.options[k],0);
  const paint=Math.round(area*2*PRICING.paintPerM2)+(c.customColor?PRICING.customPaint:0);
  return {base,materials,equipment,options,paint,total:base+materials+equipment+options+paint,mass:Math.round(mass)};
}
export const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';

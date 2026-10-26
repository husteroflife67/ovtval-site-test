import assert from 'node:assert/strict';
import {DEFAULT,PRICING,TYPES,MATERIALS,MOUNTS,MECHANISMS,OPTIONS,normalize,calculate} from '../assets/config.js';
const c=normalize(DEFAULT),base=calculate(c);
assert.equal(base.total,base.base+base.materials+base.equipment+base.options+base.paint);
for(const key of ['width','height','thickness','edge']) assert(calculate(normalize({...c,[key]:c[key]+1})).total>=base.total,`${key} must not reduce price`);
for(const [key,variants] of Object.entries({type:TYPES,material:MATERIALS,mount:MOUNTS,mechanism:MECHANISMS})){
 for(const value of Object.keys(variants)){
  const result=calculate(normalize({...c,[key]:value}));
  assert(Number.isFinite(result.total)&&result.total>0,`${key}: ${value} price`);
  assert(Number.isFinite(result.mass)&&result.mass>0,`${key}: ${value} mass`);
 }
}
const noOptions=normalize({...c,options:[]});
for(const option of Object.keys(OPTIONS)){
 const plain=calculate(noOptions), selected=calculate({...noOptions,options:[option]});
 assert.equal(selected.total-plain.total,PRICING.options[option]);
 assert(selected.mass>plain.mass,`${option} adds mass`);
}
const changed=normalize({...c,width:Infinity,height:-1,thickness:999,edge:0,options:['unknown','ribs','ribs'],color:'bad',type:'bad'});
assert.equal(changed.width,4000);assert.equal(changed.height,400);assert.equal(changed.thickness,12);assert.equal(changed.edge,6);assert.deepEqual(changed.options,['ribs']);assert.equal(changed.type,DEFAULT.type);assert.equal(changed.color,DEFAULT.color);
assert.equal(calculate({...c,customColor:true}).total-base.total,PRICING.customPaint);
console.log('Pricing: totals, all variants, seven options, monotonicity, bounds and custom paint passed.');

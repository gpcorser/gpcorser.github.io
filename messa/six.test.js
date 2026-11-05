const assert=require('node:assert/strict'),{six}=require('./scenario'),{defaults}=require('./engine');
const people=[0,1].map(()=>({medical:0,visits:0,visitPrice:0,visitCopay:0,uncovered:0}));
let r=six(people,[0,0],[true,false]);assert.equal(r.length,6);
for(let i=0;i<3;i++){
 const direct=r[i*2+1];assert.ok(Math.abs(direct.total-defaults[i].premium*12-6000)<1e-6);assert.equal(direct.rx,0);assert.equal(direct.excluded,6000);
 direct.rows.forEach((v,m)=>assert.ok(Math.abs(v.cumulative-v.total*(m+1))<1e-6));
}
assert.equal(r[4].rx,480);assert.equal(r[2].rx,4400);assert.equal(r[0].rx,5460);
let zero=six(people,[0,0],[false,false]);zero.forEach((v,i)=>assert.ok(Math.abs(v.total-defaults[Math.floor(i/2)].premium*12)<1e-6));
let both=six(people,[0,0],[true,true]);assert.equal(both[1].excluded,12000);
people[0].medical=200;let medical=six(people,[54.73,0],[true,false]);assert.equal(medical[1].medical,2400);assert.ok(medical[0].medical<medical[1].medical);
for(const v of medical)assert.ok(Math.abs(v.rows[11].cumulative-v.total)<1e-6);
console.log('Passed: six scenarios, insured price, direct cost outside limits, no deductible credit, two users, zero inputs, regular Rx retained, cumulative totals.');
console.log(r.map(v=>v.name+': $'+v.total.toFixed(2)).join('\n'));

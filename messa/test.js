const assert=require('node:assert/strict');const {defaults,simulate}=require('./engine');
const people=[0,1].map(()=>({medical:0,visits:0,visitPrice:150,visitCopay:20,uncovered:0})),schedule=Array.from({length:12},()=>({medical:1,rx:1}));
function drug(price,copay,person=0){return {person,price,copays:Object.fromEntries(defaults.map(p=>[p.name,copay])),free:{}};}
for(const p of defaults){const r=simulate(p,people,[],schedule);assert.ok(Math.abs(r.total-p.premium*12)<.001);}
let r=simulate(defaults[2],people,[drug(10000,1000)],schedule);assert.equal(r.rx,2000);
r=simulate(defaults[2],people,[drug(10000,1000),drug(10000,1000,1)],schedule);assert.equal(r.rx,4000);
r=simulate(defaults[1],people,[drug(10000,1000)],schedule);assert.equal(r.rx,8000);
r=simulate(defaults[0],people,[drug(10000,1000)],schedule);assert.equal(r.rx,8700);
let d=drug(10000,1000);d.free['ABC 2']=true;assert.equal(simulate(defaults[1],people,[d],schedule).rx,0);
const pp=structuredClone(people);pp[0].medical=10000;assert.equal(simulate(defaults[2],pp,[],schedule).medical,1000);assert.equal(simulate(defaults[1],pp,[],schedule).medical,4000);
pp[0].uncovered=100;assert.equal(simulate(defaults[1],pp,[],schedule).excluded,1200);
r=simulate(defaults[1],people,[drug(500,30)],schedule);assert.equal(r.rx,4120);assert.ok(Math.abs(r.rows[11].cumulative-r.total)<.001);
console.log('Passed: premiums, separate PPO Rx caps, ABC combined caps, preventive Rx, embedded and aggregate deductibles, noncovered costs, deductible crossing, cumulative totals.');

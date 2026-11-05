/* Calendar-year claim simulator. Monetary inputs are insurer-approved prices. */
(function(root){
'use strict';
const defaults=[
{name:'ABC 2.5',premium:133.60,dedSingle:2550,dedFamily:5100,medSingle:4550,medFamily:8700,rxSingle:0,rxFamily:0,combined:true,embedded:false,coins:0,hsa:0},
{name:'ABC 2',premium:181.84,dedSingle:2000,dedFamily:4000,medSingle:4000,medFamily:8000,rxSingle:0,rxFamily:0,combined:true,embedded:false,coins:0,hsa:0},
{name:'Choices PPO',premium:526.29,dedSingle:1000,dedFamily:2000,medSingle:2000,medFamily:4000,rxSingle:2000,rxFamily:4000,combined:false,embedded:true,coins:0,hsa:0}];
function simulate(plan,people,drugs,schedule,order='medical'){
 const family=people.length>1, n=people.length;
 const s={ded:0,di:Array(n).fill(0),med:0,mi:Array(n).fill(0),rx:0,ri:Array(n).fill(0)};
 const ded=family?plan.dedFamily:plan.dedSingle, medCap=family?plan.medFamily:plan.medSingle,rxCap=family?plan.rxFamily:plan.rxSingle;
 const rows=[];
 function pay(person,type,wanted){
  const used=plan.combined?s.med+s.rx:s[type];
  const cap=plan.combined?medCap:type==='med'?medCap:rxCap;
  const individualUsed=plan.combined?s.mi[person]+s.ri[person]:type==='med'?s.mi[person]:s.ri[person];
  // PPO individual ceilings are embedded. ABC summaries provide only the coverage-tier combined ceiling.
  const icap=family&&!plan.combined?(type==='med'?plan.medSingle:plan.rxSingle):Infinity;
  const paid=Math.max(0,Math.min(wanted,cap-used,icap-individualUsed));
  s[type]+=paid;(type==='med'?s.mi:s.ri)[person]+=paid;return paid;
 }
 function claim(person,type,price,copay){
  let total=0,remaining=price;
  const subject=type==='med'||plan.combined;
  if(subject){
   const need=Math.max(0,Math.min(ded-s.ded,plan.embedded?plan.dedSingle-s.di[person]:Infinity));
   const portion=Math.min(remaining,need),paid=pay(person,type,portion);
   total+=paid;s.ded+=paid;s.di[person]+=paid;remaining-=portion;
  }
  if(remaining>0)total+=pay(person,type,type==='rx'?Math.min(copay,remaining):Math.min(remaining,copay+remaining*plan.coins/100));
  return total;
 }
 for(let m=0;m<12;m++){
  const beforeMed=s.med,beforeRx=s.rx;
  const medical=()=>people.forEach((p,i)=>{
   const factor=schedule[m].medical;
   claim(i,'med',p.medical*factor,0);
   for(let v=0;v<p.visits;v++)claim(i,'med',p.visitPrice*factor,plan.combined?0:p.visitCopay);
   // Uncovered costs never reduce deductibles or ceilings.
  });
  const rx=()=>drugs.forEach(d=>{if(d.free[plan.name])return;claim(d.person,'rx',d.price*schedule[m].rx,d.copays[plan.name]);});
  if(order==='rx'){rx();medical();}else{medical();rx();}
  const excluded=people.reduce((t,p)=>t+p.uncovered,0);
  const med=s.med-beforeMed,rxPaid=s.rx-beforeRx,total=plan.premium+med+rxPaid+excluded;
  rows.push({month:m+1,premium:plan.premium,medical:med,rx:rxPaid,excluded,total,cumulative:total+(rows[m-1]?.cumulative||0)});
 }
 const sum=k=>rows.reduce((t,r)=>t+r[k],0);
 return {name:plan.name,rows,premium:sum('premium'),medical:sum('medical'),rx:sum('rx'),excluded:sum('excluded'),total:sum('total'),hsa:plan.hsa,net:sum('total')-plan.hsa};
}
const api={defaults,simulate};if(typeof module!=='undefined')module.exports=api;else root.PlanEngine=api;
})(typeof globalThis==='undefined'?this:globalThis);

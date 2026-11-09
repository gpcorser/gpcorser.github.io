/* Published MESSA five-tier working amounts. Drug category remains a scenario choice. */
(function(root){
const engine=typeof module!=='undefined'?require('./engine'):root.PlanEngine;
function tierCopay(price,tier){return Math.min(price,tier===1?10:tier===2?40:tier===3?80:Math.min(price*.2,tier===4?150:300));}
function compare(people,rxPrices,flags,mounjaroPrice=500,tier=2){
 const schedule=Array.from({length:12},()=>({medical:1,rx:1}));
 const regular=rxPrices.map((price,person)=>({person,price,copays:Object.fromEntries(engine.defaults.map(p=>[p.name,tierCopay(price,tier)])),free:{}}));
 const added=flags.flatMap((checked,person)=>checked?[{person,price:mounjaroPrice,copays:Object.fromEntries(engine.defaults.map(p=>[p.name,tierCopay(mounjaroPrice,2)])),free:{}}]:[]);
 const run=drugs=>engine.defaults.map(p=>engine.simulate(p,people,drugs,schedule));
 return {baseline:run(regular),selected:run([...regular,...added])};
}
function six(people,rxPrices,flags,tier=2){
 const outcome=compare(people,rxPrices,flags,1464.54,tier),count=flags.filter(Boolean).length;
 return outcome.selected.flatMap((insured,i)=>{
  const direct=structuredClone(outcome.baseline[i]);
  direct.rows.forEach((r,m)=>{r.excluded+=500*count;r.total+=500*count;r.cumulative+=500*count*(m+1);});
  direct.excluded+=6000*count;direct.total+=6000*count;direct.net+=6000*count;
  insured.name+=' · Mounjaro insured';direct.name+=' · Mounjaro direct';
  insured.route='Insurance';direct.route='Direct purchase';
  return [insured,direct];
 });
}
const api={compare,tierCopay,six};if(typeof module!=='undefined')module.exports=api;else root.PlanScenario=api;
})(globalThis);

/* Compare using coverage as entered and buying every prescription at market price. */
(function(root){
 const engine=typeof module!=='undefined'?require('./engine'):root.PlanEngine;
 const api=typeof module!=='undefined'?module.exports:root.PlanScenario;
 api.comparePrescriptions=function(people){
  const schedule=Array.from({length:12},()=>({medical:1,rx:1}));
  return engine.defaults.flatMap(plan=>[false,true].map(market=>{
   const drugs=[];
   const members=people.map((person,index)=>{
    let uncovered=0;
    for(const rx of person.prescriptions){
     if(market||!rx.covered) uncovered+=rx.market;
     else drugs.push({person:index,price:rx.negotiated,copays:{[plan.name]:api.tierCopay(rx.negotiated,rx.tier)},free:{}});
    }
    return {medical:person.medical/12,visits:0,uncovered};
   });
   const result=engine.simulate(plan,members,drugs,schedule);
   return {...result,name:plan.name+(market?' · All at market price':' · Coverage as entered')};
  }));
 };
 api.fsaBreakdown=function(rows,election){
  let available=election;
  return rows.map(row=>{
   const eligible=row.medical+row.rx+row.excluded;
   const reimbursement=Math.min(available,eligible);
   available-=reimbursement;
   return {premium:row.premium,fsa:election/12,remainder:Math.max(0,eligible-reimbursement)};
  });
 };
})(globalThis);

'use strict';
const $ = id => document.getElementById(id);
const money = value => value.toLocaleString('en-US',{style:'currency',currency:'USD'});
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const storageKey = 'health-plan-comparison-v5';
const tierNames = ['$10 generic','$40 preferred brand','$80 nonpreferred brand','20%, max $150 preferred specialty','20%, max $300 nonpreferred specialty'];
let results = [];
let election = 0;
let catchup = 0;
let preferred = '';

function syncAccounts() {
 preferred = $('preferred').value;
 $('fsaGroup').disabled = preferred !== 'ppo';
 $('hsaGroup').disabled = !['abc25','abc2'].includes(preferred);
 election = $('fsaGroup').disabled ? 0 : Number($('fsa').value);
 catchup = $('hsaGroup').disabled ? 0 : Number($('catchup').value);
 $('fsaMonthly').textContent = money(election/12)+'/month';
 $('hsaMonthly').textContent = money(catchup/12)+'/month · about '+money(catchup/26)+' per paycheck (26)';
}

function addPrescription(person, entry = {}) {
 const row = document.createElement('div');
 row.className = 'drug';
 row.innerHTML = '<label>Prescription<input class="rx-name"></label><label>Negotiated ($)<input type="number" min="0" step=".01" class="negotiated"></label><label>Market price ($)<input type="number" min="0" step=".01" class="market"></label><label>Covered tier<select class="tier"></select></label><label class="check"><input type="checkbox" class="covered">Covered</label><button type="button">Remove</button>';
 row.querySelector('.rx-name').value = entry.name ?? '';
 row.querySelector('.negotiated').value = entry.negotiated ?? '';
 row.querySelector('.market').value = entry.market ?? '';
 const tier = row.querySelector('.tier');
 tierNames.forEach((name,index)=>tier.add(new Option(name,index+1)));
 tier.value = entry.tier ?? 2;
 const covered = row.querySelector('.covered');
 covered.checked = entry.covered ?? true;
 tier.disabled = !covered.checked;
 covered.onchange = () => { tier.disabled = !covered.checked; };
 row.querySelector('button').onclick = () => { row.remove(); recalculate(); };
 person.querySelector('.drugs').append(row);
}

function addPerson(entry = {}) {
 const person = document.createElement('section');
 person.className = 'person';
 person.innerHTML = '<div class="bar"><h3></h3><label>Annual medical bills ($)<input type="number" min="0" step=".01" class="medical"></label><button type="button" class="remove-person">Remove person</button></div><details><summary></summary><div class="drugs"></div><button type="button" class="add-rx">+ Add prescription</button></details>';
 person.querySelector('.medical').value = entry.medical ?? '';
 person.querySelector('.remove-person').onclick = () => {
  if ($('people').children.length > 1) { person.remove(); recalculate(); }
 };
 person.querySelector('.add-rx').onclick = () => { addPrescription(person); recalculate(); };
 $('people').append(person);
 (entry.prescriptions ?? []).forEach(rx => addPrescription(person,rx));
}

function readPeople() {
 return [...$('people').children].map(person => ({
  medical:Number(person.querySelector('.medical').value),
  prescriptions:[...person.querySelectorAll('.drug')].map(row => ({
   name:row.querySelector('.rx-name').value,
   negotiated:Number(row.querySelector('.negotiated').value),
   market:Number(row.querySelector('.market').value),
   tier:Number(row.querySelector('.tier').value),
   covered:row.querySelector('.covered').checked
  }))
 }));
}

function recalculate(event) {
 event?.preventDefault();
 syncAccounts();
 if (preferred && !$('form').checkValidity()) return;
 const people = readPeople();
 const route = $('barRoute').value;
 try { localStorage.setItem(storageKey, JSON.stringify({people,election:Number($('fsa').value),catchup:Number($('catchup').value),preferred,route})); }
 catch { $('error').textContent = 'Browser storage is unavailable. Entries may reset when you close this page.'; }
 [...$('people').children].forEach((node,index)=>{
  const {prescriptions} = people[index];
  const covered = prescriptions.filter(rx=>rx.covered).reduce((sum,rx)=>sum+rx.negotiated,0);
  const uncovered = prescriptions.filter(rx=>!rx.covered).reduce((sum,rx)=>sum+rx.market,0);
  node.querySelector('h3').textContent = 'Person '+(index+1);
  node.querySelector('summary').textContent = 'Monthly prescriptions · Covered '+money(covered)+' negotiated · Not covered '+money(uncovered)+' market';
  node.querySelector('.remove-person').disabled = people.length===1;
 });
 $('fsaMonthly').textContent = money(election/12)+'/month';
 results = PlanScenario.comparePrescriptions(people);
 $('summary').innerHTML = '<thead><tr><th>Plan and prescription route</th><th>Premium</th><th>Medical</th><th>Covered Rx</th><th>Market Rx</th><th>Total before account</th></tr></thead><tbody>'+
  results.map(r=>'<tr><th>'+r.name+'</th>'+[r.premium,r.medical,r.rx,r.excluded,r.total].map(v=>'<td>'+money(v)+'</td>').join('')+'</tr>').join('')+'</tbody>';
 document.querySelectorAll('.legend:not(#stackLegend)').forEach(legend=>{
  legend.innerHTML=results.map((r,i)=>'<span><svg width="24" height="12" aria-hidden="true"><line x1="1" x2="23" y1="6" y2="6" stroke="'+colors[i]+'" stroke-width="3" '+(i%2?'stroke-dasharray="2 4"':'')+'/></svg> '+r.name+'</span>').join('');
 });
 drawAll();
}
const colors=['#1c7565','#1c7565','#8251a4','#8251a4','#c46b16','#c46b16'];
function draw(id,key){const svg=$(id),w=Math.max(300,svg.clientWidth),h=320,left=74,right=18,top=20,bottom=48,max=Math.max(1,...results.flatMap(r=>r.rows.map(x=>x[key])))*1.12;const x=i=>left+i*(w-left-right)/11,y=v=>h-bottom-v/max*(h-top-bottom);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);let content='<title>'+ (key==='total'?'Monthly cash spending':'Cumulative annual spending')+'</title>';
 for(let i=0;i<=4;i++){let val=max*i/4,yy=y(val);content+=`<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" stroke="#dce4e9"/><text x="${left-8}" y="${yy+4}" text-anchor="end" fill="#42566a">$${Math.round(val).toLocaleString()}</text>`;}
 months.forEach((m,i)=>{if(w<500&&i%3!==0&&i!==11)return;content+=`<text x="${x(i)}" y="${h-23}" text-anchor="middle" fill="#42566a">${m}</text>`;});
 results.forEach((r,j)=>{content+=`<polyline fill="none" stroke="${colors[j]}" stroke-width="3" ${j%2?'stroke-dasharray="2 5"':''} points="${r.rows.map((v,i)=>`${x(i)},${y(v[key])}`).join(' ')}"/>`;r.rows.forEach((v,i)=>{content+=`<circle cx="${x(i)}" cy="${y(v[key])}" r="4" fill="${colors[j]}"><title>${r.name}, ${months[i]}: ${money(v[key])}</title></circle>`;});});content+='<text x="8" y="14" fill="#42566a">Dollars</text>';svg.innerHTML=content;}
function drawAll(){if(results.length){draw('monthly','total');draw('cumulative','cumulative');drawStacked();}}


function drawStacked(){
 const offset=Number($('barRoute').value);
 const scenarios=[0,1,2].map(i=>results[i*2+offset]);
 const stacks=scenarios.map((r,i)=>{
  if (['abc25','abc2'][i] !== preferred) return PlanScenario.fsaBreakdown(r.rows,i===2?election:0);
  let balance=0;
  return r.rows.map(row=>{
   const contribution=catchup/12;
   balance+=contribution;
   const expenses=row.medical+row.rx+row.excluded;
   const paid=Math.min(balance,expenses);
   balance-=paid;
   return {premium:row.premium,fsa:contribution,remainder:expenses-paid};
  });
 });
 const svg=$('stacked'), w=Math.max(660,svg.clientWidth), h=300;
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
 const left=72,bottom=264,group=(w-left-12)/12,width=group*.24;
 const max=Math.max(1,...stacks.flat().map(v=>v.premium+v.fsa+v.remainder))*1.08;
 const keys=['premium','fsa','remainder'], fills=['#244f70','#47958b','#d18a36'];
 const labels=['Premium','FSA / HSA Catchup contribution','Remaining out of pocket'];
 let chart='';
 for(let i=0;i<=4;i++){
  const y=bottom-i*60;
  chart+=`<line x1="${left}" x2="${w-10}" y1="${y}" y2="${y}" stroke="#dce4e9"/><text x="${left-6}" y="${y+4}" text-anchor="end">${money(max*i/4)}</text>`;
 }
 months.forEach((month,m)=>{
  chart+=`<text x="${left+group*(m+.5)}" y="286" text-anchor="middle">${month}</text>`;
  stacks.forEach((rows,i)=>{
   const x=left+group*(m+.1)+width*i,yStart=bottom;
   let y=yStart;
   keys.forEach((key,k)=>{
    const height=rows[m][key]/max*240;
    y-=height;
    chart+=`<rect x="${x}" y="${y}" width="${width-2}" height="${height}" fill="${fills[k]}"><title>${month} · ${scenarios[i].name} · ${labels[k]}: ${money(rows[m][key])}</title></rect>`;
   });
  });
 });
 svg.innerHTML=chart;
 $('stackLegend').innerHTML=labels.map((label,i)=>`<span><span class="dot" style="background:${fills[i]}"></span>${label}</span>`).join('');
 const unused=Math.max(0,election-scenarios[2].medical-scenarios[2].rx-scenarios[2].excluded);
 $('fsaNote').textContent='Eligible prescriptions bought at market price can be reimbursed by the FSA. Estimated unused PPO election: '+money(unused)+'.';
 $('stackTable').innerHTML='<thead><tr><th>Month</th><th>Plan</th><th>Premium</th><th>Account contribution</th><th>Remaining out of pocket</th><th>Total paid</th></tr></thead><tbody>'+months.flatMap((m,j)=>stacks.map((rows,i)=>{
  const {premium,fsa,remainder}=rows[j];
  return '<tr><th>'+m+'</th><td>'+PlanEngine.defaults[i].name+'</td>'+[premium,fsa,remainder,premium+fsa+remainder].map(value=>'<td>'+money(value)+'</td>').join('')+'</tr>';
 })).join('')+'</tbody>';
}

let saved;
try { saved=JSON.parse(localStorage.getItem(storageKey)); } catch {}
const defaults=[{prescriptions:[{name:'Mounjaro',negotiated:1464.54,market:500,tier:2,covered:true}]},{}];
(saved?.people?.length?saved.people:defaults).forEach(addPerson);
$('fsa').value=saved?.election??3500;
$('catchup').value=saved?.catchup??0;
$('preferred').value=saved?.preferred??'';
$('barRoute').value=saved?.route??'0';
$('addPerson').onclick=()=>{addPerson();recalculate();};
$('form').addEventListener('input',recalculate);
$('form').addEventListener('submit',recalculate);
$('barRoute').onchange=recalculate;
recalculate();
new ResizeObserver(drawAll).observe($('monthly'));

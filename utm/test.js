const assert=require('node:assert/strict');const {UTM,example,CONTROL}=require('./utm.js');
let seed=461;function rand(n){seed=(1664525*seed+1013904223)>>>0;return seed%n;}
let tested=0;
for(let k=0;k<120;k++){
 let Q=['s','t','qa','qr'],G=['_','0','1','X'];let ds=[];
 for(let q of Q.slice(0,2))for(let r of G)ds.push([q,r,Q[rand(4)],G[rand(4)],rand(2)?'L':'R']);
 let w=Array.from({length:rand(5)},()=>String(rand(2))).join('');let text=`({${Q}},{0,1},{${G}},{${ds.map(([q,r,n,w,d])=>`((${q},${r}),(${n},${w},${d}))`)}},s,qa,qr),${w||'eps'}`;
 let tape=[...w],head=0,q='s',n=0;for(;n<30&&!['qa','qr'].includes(q);n++){let d=ds.find(x=>x[0]===q&&x[1]===(tape[head]||'_'));tape[head]=d[3];head=Math.max(0,head+(d[4]==='R'?1:-1));q=d[2];}
 let u=new UTM(text);let budget=300000;while(budget--&&u.simulatedSteps<n&&u.step());
 // Finish halt detection or stop at boundary after matching number of transitions.
 if(['qa','qr'].includes(q)){let result=u.run(300000);assert.equal(result,q==='qa'?'ACCEPT':'REJECT');}
 assert.notEqual(u.state,'ERROR');tested++;
}
assert.equal(new UTM(example).run(),'ACCEPT');assert.equal(new UTM(example.replace('11011','eps')).run(),'REJECT');
let looping='({s,a,r},{0},{0,_},{((s,0),(s,0,R)),((s,_),(s,_,R))},s,a,r),0';assert.equal(new UTM(looping).run(10000),'INCONCLUSIVE');
assert.throws(()=>new UTM(example.replace('((q0,0),(q0,0,R)),','')));
for(let n of Object.values(CONTROL.g)){for(let f of ['next','yes','no'])if(n[f])assert.ok(CONTROL.g[n[f]]||['ACCEPT','REJECT','ERROR'].includes(n[f]));}
console.log('Passed',tested,'generated-machine checks, examples, loop limit, validation and control graph checks.');

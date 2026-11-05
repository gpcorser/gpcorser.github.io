/* Educational five-tape UTM. The compiler builds a FIXED finite control graph.
   The execution engine reads only current cells; it never inspects M's table.
   Front-end parsing/encoding is separate from the UTM. No dependencies. */
(function(root){
'use strict';
function parse(text){
 text=text.replace(/<blank>|□|⊔/g,'_');
 let p=0; const ws=()=>{while(/\s/.test(text[p]||'')&&p<text.length)p++;};
 function value(){ws();let c=text[p++];if(c==='('||c==='{'){let a=[],end=c==='('?')':'}';ws();if(text[p]===end){p++;return {kind:c,a};}while(true){a.push(value());ws();let d=text[p++];if(d===end)break;if(d!==',')throw Error('Expected comma at position '+p);}return {kind:c,a};}let start=p-1;while(p<text.length&&!/[\s,(){}<>]/.test(text[p]))p++;let s=text.slice(start,p);if(!/^[A-Za-z0-9_]+$/.test(s))throw Error('Invalid token near '+start);return s;}
 ws();let angle=text[p]==='<';if(angle)p++;let m=value();ws();if(text[p++]!==',')throw Error('Expected comma between M and w');let tail=text.slice(p).trim();if(angle){if(!tail.endsWith('>'))throw Error('Missing closing >');tail=tail.slice(0,-1).trim();}tail=tail.replace(/\s/g,'');if(tail==='eps'||tail==='ε')tail='';tail=tail.replace(/_*(?:\.\.\.)?$/,'');if(!/^[0-9]*$/.test(tail))throw Error('w must contain digits, optionally followed by blanks and ...');
 const seq=(x,k,n)=>{if(!x||x.kind!==k||(n!==undefined&&x.a.length!==n))throw Error('Expected '+(k==='{'?'set':'tuple')+(n?' of length '+n:''));return x.a;};
 const set=x=>{let a=seq(x,'{');if(a.some(v=>typeof v!=='string')||new Set(a).size!==a.length)throw Error('Set elements must be distinct names');return a;};
 let [Q,S,G,D,start,accept,reject]=seq(m,'(',7);Q=set(Q);S=set(S);G=set(G);D=seq(D,'{');
 if(!Q.length||![start,accept,reject].every(q=>Q.includes(q))||accept===reject)throw Error('Invalid start/accept/reject states');
 if(!G.includes('_')||S.includes('_')||S.some(s=>!/^\d$/.test(s)||!G.includes(s)))throw Error('Sigma must contain digits; Gamma must include Sigma and _');
 if([...tail].some(s=>!S.includes(s)))throw Error('Input symbol outside Sigma');
 let transitions=[],seen=new Set();for(let d of D){let [a,b]=seq(d,'(',2);let [q,r]=seq(a,'(',2),[n,w,dir]=seq(b,'(',3);if(!Q.includes(q)||!Q.includes(n)||!G.includes(r)||!G.includes(w)||!['L','R'].includes(dir)||[accept,reject].includes(q))throw Error('Invalid transition');let key=q+'\0'+r;if(seen.has(key))throw Error('Duplicate transition');seen.add(key);transitions.push([q,r,n,w,dir]);}
 for(let q of Q)if(q!==accept&&q!==reject)for(let s of G)if(!seen.has(q+'\0'+s))throw Error('Missing transition for ('+q+', '+s+')');
 return {Q,S,G,start,accept,reject,transitions,w:tail};
}
function encode(m){
 const symbols=['_',...m.G.filter(x=>x!=='_')];const sym=x=>'1'.repeat(symbols.indexOf(x)+1);
 const states=m.Q.filter(x=>x!==m.accept&&x!==m.reject);const state=x=>x===m.accept?'A':x===m.reject?'R':'1'.repeat(states.indexOf(x)+1);
 return {tape:'^'+state(m.start)+'|'+[...m.w].reverse().map(sym).map(x=>x+',').join('')+'$'+m.transitions.map(([q,r,n,w,d])=>state(q)+':'+sym(r)+':'+state(n)+':'+sym(w)+':'+d+';').join('')+'#',symbols,states};
}
// Graph builder: each node is one primitive write/move or current-cell branch.
// All subroutines are expanded at build time; no runtime call stack or registers.
function build(){
 let g={},i=0;const node=o=>{let n='u'+i++;g[n]=o;return n;};
 const branch=(t,c,yes,no)=>node({op:'test',t,c,yes,no});
 const write=(t,c,next)=>node({op:'write',t,c,next});
 const move=(t,d,next)=>node({op:'move',t,d,next});
 const loop=(test,body,next)=>{let n=node({});let b=body(n);g[n]={op:'test',...test,yes:b,no:next};return n;};
 const rewind=(t,next)=>loop({t,c:'^'},()=>next, // replaced below for inverse test
 next);
 function home(t,next){let n=node({});g[n]={op:'test',t,c:'^',yes:move(t,1,next),no:move(t,-1,n)};return n;}
 function clear(t,next){return home(t,loop({t,c:'_'},()=>next,next));}
 function erase(t,next){let n=node({});g[n]={op:'test',t,c:'_',yes:home(t,next),no:write(t,'_',move(t,1,n))};return home(t,n);}
 function copyUntil(src,dst,end,next){let n=node({}), chain;chain=branch(src,'1',write(dst,'1',move(src,1,move(dst,1,n))),branch(src,'A',write(dst,'A',move(src,1,move(dst,1,n))),branch(src,'R',write(dst,'R',move(src,1,move(dst,1,n))),'ERROR')));g[n]={op:'test',t:src,c:end,yes:next,no:chain};return n;}
 // Stack head always points at the first blank after its last comma.
 function push(stack,next){return home(2,copyUntil(2,stack,'_',write(stack,',',move(stack,1,next))));}
 function pop(stack,next){let end=home(2,next),n=node({});g[n]={op:'test',t:stack,c:'1',yes:write(stack,'_',move(stack,-1,write(2,'1',move(2,1,n)))),no:move(stack,1,end)};
 return erase(2,move(stack,-1,branch(stack,'^',move(stack,1,write(2,'1',home(2,next))),write(stack,'_',move(stack,-1,n)))));}
 let cycle=node({}),scan=node({});
 function seekRule(next){let n=node({});g[n]={op:'test',t:0,c:'$',yes:move(0,1,next),no:move(0,1,n)};return home(0,n);}
 let boundary=branch(1,'A','ACCEPT',branch(1,'R','REJECT',seekRule(scan)));
 g[cycle]={op:'goto',next:home(1,boundary),boundary:true};
 let right=push(3,pop(4,cycle));
 // Left boundary: if left stack is empty, keep the newly written current cell.
 let left=move(3,-1,branch(3,'^',move(3,1,cycle),move(3,1,push(4,pop(3,cycle)))));
 let direction=branch(0,'R',right,branch(0,'L',left,'ERROR'));
 let loadWrite=erase(2,copyUntil(0,2,':',move(0,1,direction)));
 let loadState=erase(1,copyUntil(0,1,':',move(0,1,loadWrite)));
 let skip=node({});g[skip]={op:'test',t:0,c:';',yes:move(0,1,scan),no:branch(0,'#','ERROR',move(0,1,skip))};
 function compare(t,next){let n=node({});let mismatch=skip;g[n]={op:'test',t:0,c:':',yes:branch(t,'_',move(0,1,next),mismatch),no:branch(0,'1',branch(t,'1',move(0,1,move(t,1,n)),mismatch),mismatch)};return home(t,n);}
 g[scan]={op:'test',t:0,c:'#',yes:'ERROR',no:compare(1,compare(2,loadState))};
 // Initialize blank work tapes with left-end markers using U transitions.
 let initInput=node({});let afterInput=move(0,1,pop(4,cycle));
 g[initInput]={op:'test',t:0,c:'$',yes:afterInput,no:copyUntil(0,4,',',write(4,',',move(4,1,move(0,1,initInput))))};
 let init=move(0,1,copyUntil(0,1,'|',move(0,1,initInput)));
 for(let t=4;t>=1;t--)init=write(t,'^',move(t,1,init));
 return {g,init,cycle};
}
const CONTROL=build();
class UTM{
 constructor(text){this.machine=parse(text);this.encoding=encode(this.machine);this.tapes=[...Array(5)].map(()=>new Map());[...this.encoding.tape].forEach((c,i)=>this.tapes[0].set(i,c));this.heads=[0,0,0,0,0];this.state=CONTROL.init;this.steps=0;this.simulatedSteps=-1;}
 read(t){return this.tapes[t].get(this.heads[t])||'_';}
 step(){if(['ACCEPT','REJECT','ERROR'].includes(this.state))return false;let n=CONTROL.g[this.state];if(!n)throw Error('Unknown U state');if(n.boundary)this.simulatedSteps++;switch(n.op){case 'test':this.state=this.read(n.t)===n.c?n.yes:n.no;break;case 'write':if(n.c==='_')this.tapes[n.t].delete(this.heads[n.t]);else this.tapes[n.t].set(this.heads[n.t],n.c);this.state=n.next;break;case 'move':this.heads[n.t]=Math.max(0,this.heads[n.t]+n.d);this.state=n.next;break;case 'goto':this.state=n.next;break;}this.steps++;return true;}
 run(limit=100000){for(let i=0;i<limit&&this.step();i++);return ['ACCEPT','REJECT','ERROR'].includes(this.state)?this.state:'INCONCLUSIVE';}
 window(t,radius=35){let h=this.heads[t],a=Math.max(0,h-radius),b=h+radius;return Array.from({length:b-a+1},(_,j)=>{let k=a+j,c=this.tapes[t].get(k)||'_';return k===h?'['+c+']':c;}).join('');}
}
const example='({q0,q1,qa,qr},{0,1},{0,1,_},{\n ((q0,0),(q0,0,R)), ((q0,1),(q1,1,R)), ((q0,_),(qr,_,R)),\n ((q1,0),(q0,0,R)), ((q1,1),(q1,1,R)), ((q1,_),(qa,_,R))\n},q0,qa,qr),11011';
root.UTMLab={parse,encode,UTM,CONTROL,example};if(typeof module!=='undefined')module.exports=root.UTMLab;
})(typeof globalThis!=='undefined'?globalThis:window);

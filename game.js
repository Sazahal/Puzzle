(()=>{'use strict';
const $=s=>document.querySelector(s),board=$('#board'),message=$('#message');
const directions=[{x:0,y:-1,k:'up'},{x:0,y:1,k:'down'},{x:-1,y:0,k:'left'},{x:1,y:0,k:'right'}];
const config={easy:{w:7,h:7,blocks:11,min:5,warps:0},normal:{w:9,h:9,blocks:23,min:8,warps:0},hard:{w:11,h:11,blocks:36,min:10,warps:3}};
let game=null,history=[],moves=0,record=+(localStorage.getItem('ricochet-record')||0),solved=false;
const equal=(a,b)=>a.x===b.x&&a.y===b.y;
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function slide(p,d,m){let pos={...p},steps=0,usedWarp=false;
 for(let i=0;i<m.w*m.h+2;i++){
  let x=pos.x+d.x,y=pos.y+d.y;
  if(x<0||y<0||x>=m.w||y>=m.h||m.walls.has(y*m.w+x))break;
  pos={x,y};steps++;
  let wi=m.warps.findIndex(w=>equal(w,pos));
  if(wi>=0){let mate=m.warps[wi^1];pos={x:mate.x,y:mate.y};usedWarp=true;break;}
 }
 return {pos,steps,usedWarp};
}
function shortest(m,start,goal,withoutWarp=false){let q=[{p:start,path:[],warp:false,stops:[]}],seen=new Set([start.y*m.w+start.x]);
 for(let i=0;i<q.length;i++){
  let cur=q[i];if(equal(cur.p,goal))return cur;
  for(let d of directions){let res=slide(cur.p,d,withoutWarp?{...m,warps:[]}:m),p=res.pos,k=p.y*m.w+p.x;
   if(equal(p,cur.p)||seen.has(k))continue;
   seen.add(k);q.push({p,path:[...cur.path,d.k],warp:cur.warp||res.usedWarp,stops:[...cur.stops,{...p}]});
  }
 }
 return null;
}
function candidates(m){let a=[];for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(!m.walls.has(y*m.w+x)&&!m.warps.some(w=>w.x===x&&w.y===y))a.push({x,y});return a}
function generate(){let levels=['easy','normal','hard'];let level=levels[rnd(levels.length)],c=config[level],best=null,bestScore=-1;
 for(let attempt=0;attempt<1800;attempt++){
  let m={w:c.w,h:c.h,walls:new Set(),warps:[],level};
  while(m.walls.size<c.blocks){let x=1+rnd(m.w-2),y=1+rnd(m.h-2);m.walls.add(y*m.w+x)}
  let free=candidates(m);if(free.length<10)continue;
  if(c.warps){let warpCount=2+rnd(c.warps);let places=shuffle(free.slice());for(let i=0;i<warpCount*2;i++)m.warps.push(places.pop());free=candidates(m)}
  if(free.length<2)continue;
  let start=free[rnd(free.length)],goals=shuffle(free.filter(p=>Math.abs(p.x-start.x)+Math.abs(p.y-start.y)>c.w/2));
  for(let goal of goals.slice(0,12)){
   let sol=shortest(m,start,goal);if(!sol)continue;
   let uniqueStops=new Set(sol.stops.map(p=>p.y*m.w+p.x)).size;
   let turns=sol.path.slice(1).filter((k,i)=>k!==sol.path[i]).length;
   let wallUses=sol.stops.filter(p=>p.x>0&&p.y>0&&p.x<m.w-1&&p.y<m.h-1).length;
   let warpRequired=c.warps?(!shortest(m,start,goal,true)&&sol.warp):true;
   let score=sol.path.length*4+turns*2+wallUses+uniqueStops+(warpRequired?12:0);
   if(sol.path.length>=c.min&&turns>=Math.floor(c.min/2)&&wallUses>=2&&warpRequired){game={...m,start,goal,player:{...start},optimal:sol.path.length};history=[];moves=0;solved=false;render();message.textContent='新しいランダム迷宮！ ★を目指してください。';return;}
   if(score>bestScore&&sol.path.length>=3){best={...m,start,goal,player:{...start},optimal:sol.path.length};bestScore=score}
  }
 }
 // Even when the strict difficulty target cannot be reached, only accept a BFS-verified solvable board.
 if(best){game=best;history=[];moves=0;solved=false;render();message.textContent='新しいランダム迷宮！ ★を目指してください。';return}
 // Retry rather than showing an unverified or unsolvable map.
 setTimeout(generate,0);
}
function render(){board.style.gridTemplateColumns=`repeat(${game.w},minmax(0,1fr))`;board.innerHTML='';
 for(let y=0;y<game.h;y++)for(let x=0;x<game.w;x++){
  let idx=y*game.w+x,el=document.createElement('div');el.className='cell';let char='·';
  if(game.walls.has(idx)){el.classList.add('wall');char='█'}
  let warpIndex=game.warps.findIndex(w=>w.x===x&&w.y===y);
  if(warpIndex>=0){el.classList.add('warp','warp'+Math.floor(warpIndex/2)%4);char=String.fromCharCode(65+Math.floor(warpIndex/2))}
  if(equal(game.goal,{x,y})){el.classList.add('goal');char='★'}
  if(equal(game.player,{x,y})){el.classList.add('player');char=equal(game.player,game.goal)?'✦':'@'}
  el.textContent=char;board.append(el);
 }
 $('#moves').textContent=moves;$('#best').textContent=game.optimal;
 $('#stageLabel').textContent=`${game.level.toUpperCase()} / ${game.w}×${game.h}`;
 $('#record').textContent=`クリア記録: ${record} ｜ 最短手数: ${game.optimal}`;
 document.querySelectorAll('.level').forEach(b=>b.classList.toggle('active',b.dataset.level===game.level));
}
function move(k){if(solved)return;let d=directions.find(d=>d.k===k);if(!d)return;let result=slide(game.player,d,game);
 if(equal(result.pos,game.player)){message.textContent='その方向には進めません。';return}
 history.push({p:{...game.player},moves});game.player=result.pos;moves++;render();
 if(equal(game.player,game.goal)){solved=true;record++;localStorage.setItem('ricochet-record',record);render();message.innerHTML=`<strong>MISSION CLEAR!</strong> ${moves}手で到達。次の問題へ！`;setTimeout(()=>{if(solved)generate()},1100)}
 else message.textContent=result.usedWarp?'ワープ！ 出口で停止しました。':`滑走完了。手数 ${moves}。`;
}
function undo(){if(!history.length){message.textContent='戻せる手がありません。';return}let h=history.pop();game.player=h.p;moves=h.moves;solved=false;render();message.textContent='1手戻しました。'}
function hint(){let sol=shortest(game,game.player,game.goal);if(!sol||!sol.path.length){message.textContent='ゴール済み、または経路がありません。';return}let k=sol.path[0];message.innerHTML=`ヒント：次の一手は <strong>${{up:'▲ 上',down:'▼ 下',left:'◀ 左',right:'▶ 右'}[k]}</strong>`}
document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>move(b.dataset.dir));
// Difficulty is chosen by the generator, not the player.
document.querySelectorAll('.level').forEach(b=>{b.disabled=true;b.title='難易度は毎回ランダムで決まります'});
$('#undo').onclick=undo;$('#hintBtn').onclick=hint;$('#newGame').onclick=generate;
$('#resetRecord').onclick=()=>{record=0;localStorage.removeItem('ricochet-record');render();message.textContent='記録をリセットしました。'};
document.onkeydown=e=>{let k={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(k){e.preventDefault();move(k)}};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));generate();
})();

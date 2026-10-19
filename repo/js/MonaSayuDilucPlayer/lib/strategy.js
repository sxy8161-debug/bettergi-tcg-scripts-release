/* GPL-3.0. One-step execution; bounded resource lookahead stops at random draws/combat. */
(function(T) {
  "use strict";
  const copy=x=>JSON.parse(JSON.stringify(x));
  const target=s=>s.enemies?.find(e=>T.alive(e)&&e.active);
  const living=s=>(s.enemies||[]).filter(T.alive);
  function damageEstimate(s,m,who,skill) {
    const enemy=target(s),element=skill==="NA"?(who===0?"Hydro":who===2&&m.pyroInfusion>0?"Pyro":"Physical"):T.team[who].element;
    if(!enemy)return {element,base:0,weapon:0,reaction:{name:null,bonus:0},raw:0,direct:0,
      guaranteed:null,target:null,splash:[],prepared:0,conditionalPrepared:false,total:0};
    const reaction=T.elementReaction(element,enemy?.auraKnown?enemy.aura:[]);
    const base=who===0?(skill==="Q"?4:1):who===1?(skill==="NA"?2:1):skill==="Q"?8:skill==="E"?3+(m.dilucE===2?2:0):2;
    const weapon=m.weaponKinds[who]==="wolf"?(enemy?.hp<=6?3:1):0;
    const shatter=enemy.frozen===true&&["Physical","Pyro"].includes(element)?2:0;
    const raw=(base+weapon+reaction.bonus+shatter)*(m.bubble?2:1);
    const hit=T.damageAgainst(enemy,raw,element);
    const splash=living(s).filter(e=>e!==enemy).map(e=>{
      const r=reaction.spread?T.elementReaction(reaction.spread,e.auraKnown?e.aura:[]):null;
      const damage=reaction.spread?T.damageAgainst(e,1+r.bonus+(e.frozen===true&&reaction.spread==="Pyro"?2:0),reaction.spread):
        reaction.piercing?T.damageAgainst(e,1,"Physical",true):{direct:0,guaranteed:0};
      return {index:s.enemies.indexOf(e),...damage};
    });
    // The second Sayu packet happens AFTER the opponent's reply. It is a conditional
    // contribution, never an immediate kill/refund or a cast-completion predicate.
    let prepared=0;
    if(who===1&&skill==="E"&&hit.direct<enemy.hp) {
      const e={...enemy,hp:enemy.hp-hit.direct,
        shield:T.known(enemy.shield)?Math.max(0,enemy.shield-hit.shieldSpent):enemy.shield};
      const secondElement=reaction.spread||"Anemo";
      const aura=(enemy?.auraKnown?enemy.aura:[]).filter(x=>x!==reaction.consumed);
      const r=T.elementReaction(secondElement,aura);
      prepared=Math.min(e.hp,T.damageAgainst(e,2+(m.weaponKinds[who]==="wolf"?(e.hp<=6?3:1):0)+r.bonus+
        (e.frozen===true&&secondElement==="Pyro"?2:0),secondElement).direct);
    }
    return {element,base,weapon,reaction,shatter,raw,direct:hit.direct,guaranteed:hit.guaranteed,
      target:enemy,splash,prepared,conditionalPrepared:who===1&&skill==="E",
      total:Math.min(enemy?.hp||0,hit.direct)+splash.reduce((n,d)=>n+Math.min(s.enemies[d.index].hp,d.direct),0)};
  }
  function carry(s,m) {
    const water=target(s)?.auraKnown&&target(s).aura.includes("Hydro");
    const order=living(s).length>=3||living(s).length>1&&water?[1,2,0]:[2,1,0];
    return order.find(i=>T.alive(s.characters[i])&&!s.characters[i].frozen)??s.active;
  }
  function enumerate(s,m) {
    const actions=[];
    const add=a=>{if(!T.actionRefused(s,m,a))actions.push(a);};
    for(const skill of ["NA","E","Q"]) {
      const a={type:"skill",who:s.active,skill};if(T.skillLegal(s,a,m))add(a);
    }
    if(T.payment(s.dice,T.switchCost(m),T.team[s.active].element))for(let i=0;i<3;i++)
      if(i!==s.active&&T.alive(s.characters[i])&&!s.characters[i].frozen)add({type:"switch",target:i});
    for(const h of s.hand) {
      const c=T.byId[h.id];if(!c)continue;
      const targets=c.type==="talent"?[c.target]:["weapon","artifact","recycle"].includes(c.type)?[0,1,2]:[null];
      for(const to of targets) {
        const a={type:"card",id:h.id,index:h.index,target:to};
        if(!T.cardLegal(s,a,m))continue;
        if(c.type==="weapon"&&m.weaponKinds[to]===h.id)continue;
        if(c.type==="artifact"&&m.artifactKinds[to]===h.id)continue;
        if(h.id==="garden"&&(m.garden||!s.hand.some(x=>["wolf","gilded"].includes(x.id))))continue;
        if(h.id==="boar"&&(m.boar>0||!m.artifacts.some(Boolean)&&!m.weapons.some(Boolean)))continue;
        if(h.id==="shift"&&(m.freeSwitch||!s.characters.some((c,i)=>i!==s.active&&T.alive(c))))continue;
        if(h.id==="lyre"&&!s.hand.some(x=>T.byId[x.id]?.type==="artifact"))continue;
        if(c.type==="support"&&m.supports.some(x=>x.id===h.id)&&h.id!=="liben")continue;
        if(c.type==="draw"&&s.hand.length>=9)continue;
        add(a);
      }
    }
    const element=T.team[s.active].element;
    if(Object.entries(s.dice).some(([e,n])=>n>0&&e!==element&&e!=="Omni")) {
      // Tuning only when it unlocks an actual affordable skill; never burn an arbitrary card.
      const tuned={...s.dice};let needed=false;
      const available=s.hand.filter(h=>h.canTune!==false&&!h.attachments?.noTuning).length;
      for(let n=0;n<available&&!needed;n++) {
        const bad=Object.keys(tuned).find(e=>tuned[e]>0&&e!==element&&e!=="Omni");if(!bad)break;
        tuned[bad]--;tuned[element]=(tuned[element]||0)+1;
        needed=["NA","E","Q"].some(skill=>!T.skillLegal(s,{who:s.active,skill},m)&&T.skillLegal({...s,dice:tuned},{who:s.active,skill},m));
      }
      if(needed)for(const h of s.hand)if(h.canTune!==false&&!h.attachments?.noTuning)
        add({type:"tune",id:h.id,index:h.index,element});
    }
    add({type:"end"});return actions;
  }
  function handValue(id,s,m) {
    if((id||"").startsWith("countdown"))return .5; // discard evolves it; future draw is not guaranteed
    if(id==="wolf"&&!m.weaponKinds[carry(s,m)])return 2;
    if(id==="flowingFlame"&&T.alive(s.characters[2])&&!m.talents[2])return 1.8;
    if(id==="skivingNewAndImproved"&&T.alive(s.characters[1])&&!m.talents[1])return 1.5;
    if(["garden","gilded","lyre"].includes(id))return 1.3;
    return .65;
  }
  function project(s,m,a) {
    const n=copy(s),v=copy(m),cost=a.type==="skill"?T.skillCost(a.who,a.skill,m,s):
      a.type==="card"?T.cardCost(a.id,a.target,m,s):a.type==="switch"?T.switchCost(m):{};
    const paid=T.payment(s.dice,cost,T.team[s.active].element);if(!paid)return null;
    n.dice=paid.remaining;
    let value=-T.size(cost)*.25-.12,stop=false,estimate=null,terminal=false;
    const focus=carry(s,m),c=T.byId[a.id],cast=a.type==="skill"?a:a.type==="card"?c?.combatSkill:null;
    if(a.type==="end") {
      const ready=m.supports.filter(x=>x.id==="liben").some(x=>Object.values(s.dice).filter(v=>v>0).length+x.collected>=3);
      return {state:n,memory:v,value:ready?1.1:-.2,stop:true,terminal:false};
    }
    if(a.type==="switch") {
      n.active=a.target;value-=s.active===0&&!m.monaFastUsed?0:.1;
      if(a.target===focus)value+=.3;
      if(s.characters[s.active].hp<=3&&s.characters[a.target].hp>=6)value+=.35;
    }
    if(a.type==="tune") {
      const bad=Object.keys(n.dice).find(e=>n.dice[e]>0&&e!==a.element&&e!=="Omni");if(!bad)return null;
      n.dice[bad]--;T.generateDice(n.dice,a.element,1);value-=handValue(a.id,s,m);
    }
    if(a.type==="card"||a.type==="tune")n.hand=T.indexedHand(n.hand.filter((_,i)=>i!==a.index));
    if(a.type==="card") {
      for(const [e,k]of Object.entries(T.cardRefund(a,m,s)))T.generateDice(n.dice,e,k);
      if(a.id.startsWith("countdown")||a.id==="show")n.dice={Omni:T.total(n.dice)};
      if(c.type==="draw") {
        const count=a.id==="draw"?2:4;
        value+=Math.min(count,10-n.hand.length)*.75+(a.id==="draw"?0:T.total(n.dice)*.18);stop=true;
      }
      if(c.type==="support") {
        value+=({dunyarzad:2.1,timaeus:2.5,liben:1.0,house:1.2}[a.id]||0)*(m.round<=2?1:.45);
        if(["timaeus","dunyarzad","liben"].includes(a.id)&&(a.id==="timaeus"||m.supports.some(x=>x.id==="dunyarzad"&&!x.drawUsed)))stop=true;
      }
      if(a.id==="wolf")value+=(a.target===focus?2.5:1.1);
      if(a.id==="gilded")value+=1+T.total(T.cardRefund(a,m,s))*.35;
      if(a.id==="troupe")value+=a.target!==s.active&&m.round<=2?1.2:.1;
      if(a.id==="gambler")value+=a.target===focus&&living(s).some(e=>e.hp<=6)?1.2:.15;
      if(a.id==="lyre") {n.hand.push(T.observedCard(T.byId[m.artifactKinds[a.target]].name,n.hand.length));value-=.35;}
      if(c.type==="talent"&&!m.talents[c.target])value+=.8;
    }
    if(cast) {
      estimate=damageEstimate(s,m,cast.who,cast.skill);stop=true;
      value+=estimate.total+estimate.prepared*(s.characters[cast.who].hp>4?.55:.2);
      const all=living(s);
      terminal=all.length>0&&all.every(e=>{
        const d=e===estimate.target?estimate:estimate.splash.find(x=>s.enemies[x.index]===e);
        return d?.guaranteed!==null&&d?.guaranteed>=e.hp;
      });
      if(estimate.direct>=estimate.target?.hp)value+=1.2;
      if(terminal)value+=100;
      if(cast.who===0&&cast.skill==="E"&&!m.reflection)value+=1.6;
      if(cast.who===0&&cast.skill==="Q"&&T.alive(s.characters[2]))
        value+=s.characters[2].energy===3&&T.total(n.dice)>=T.size(T.switchCost(m))+4?6:2;
      if(cast.who===1&&cast.skill==="Q"&&m.sayuSummon<2)value+=1.3+s.characters.filter(T.alive).reduce((v,c)=>v+Math.min(2,10-c.hp)*.2,0);
      if(cast.skill!=="Q")value+=.3;
    }
    T.commit(v,a,s,n);
    return {state:n,memory:v,value,stop,estimate,terminal};
  }
  function choose(s,m) {
    if(!T.legalState(s))throw new Error("策略仅接受完整原生行动牌桌");
    // Only hypothetical fast resource prefixes are explored. Every actual card is
    // confirmed and observed again; no sequence is queued for later execution.
    let frontier=[{state:s,memory:m,value:0,sequence:[],opponentReply:false}],best=null,used=0;
    for(let depth=0;depth<5&&frontier.length;depth++) {
      const next=[];
      for(const node of frontier)for(const a of enumerate(node.state,node.memory)) {
        if(a.type==="switch"&&node.sequence.some(x=>x.type==="switch"))continue;
        if(used>=320)break;
        used++;
        const p=project(node.state,node.memory,a);if(!p)continue;
        const sequence=[...node.sequence,a],opponentReply=node.opponentReply||
          a.type==="switch"&&!(node.state.active===0&&!node.memory.monaFastUsed);
        // A combat switch gives the opponent a reply. Its follow-up is useful
        // for choosing a direction, but cannot inherit an immediate-lethal bonus.
        const terminal=p.terminal&&!opponentReply,score=node.value+p.value-(p.terminal&&opponentReply?100:0);
        if((p.stop||depth===4)&&(!best||score>best.score))best={action:sequence[0],score,sequence,estimate:p.estimate,terminal};
        if(!p.stop&&depth<4)next.push({...p,value:score,sequence,opponentReply});
      }
      if(used>=320)break;
      frontier=next.sort((a,b)=>b.value-a.value).slice(0,10);
    }
    if(!best)best={action:{type:"end"},score:0,sequence:[{type:"end"}]};
    // A skill whose estimated discount is insufficient gets one existing read-only probe.
    if(best.action.type==="end")for(const skill of ["E","Q"]) {
      const a={type:"probe",who:s.active,skill};
      if(!s.characters[s.active].frozen&&(skill!=="Q"||s.characters[s.active].energy===T.team[s.active].maxEnergy)&&
        T.total(s.dice)>0&&!T.skillProbeAttempted(s,m,a)&&!T.actionRefused(s,m,a))return a;
    }
    return {...best.action,planning:{score:best.score,sequence:best.sequence.map(T.actionKey),terminal:!!best.terminal,
      estimate:best.estimate},projections:{used,limit:320,exhausted:used>=320}};
  }
  function replacement(s,m) {
    const choices=s.characters.flatMap((c,i)=>T.alive(c)?[{who:i,score:(c.frozen?-5:0)+(i===carry(s,m)?3:0)+c.hp*.1+(m.weapons[i]?1:0)}]:[]);
    return choices.sort((a,b)=>b.score-a.score)[0]||null;
  }
  Object.assign(T,{damageEstimate,enumerate,project,choose,replacement});
})(globalThis.TCG);

globalThis.TCG.registerStrategy("default", globalThis.TCG.choose);

globalThis.TCG.selectStrategy(globalThis.TCG.defaultStrategy);

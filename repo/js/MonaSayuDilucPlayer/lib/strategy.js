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
    const order=living(s).length>=3||living(s).length>1&&(water||s.active===1&&m.used[1]>0)?[1,2,0]:[2,1,0];
    return order.find(i=>T.alive(s.characters[i])&&!s.characters[i].frozen)??s.active;
  }
  function projectedPayment(s,cost) {
    const element=T.team[s.active].element,paid=T.payment(s.dice,cost,element);
    if(!paid||!cost.aligned)return paid;
    // The native auto-selection does not use our payment indices (slot06 Wolf:
    // Cryo+Omni, not the model's Pyro+Pyro). Explore from a conservative LEGAL
    // remainder instead of promising that native payment will preserve setup dice.
    // This is only a search scenario; confirmation always adopts observed dice.
    const worth=d=>(d[element]||0)+(d.Omni||0)*1.1;
    let remaining=paid.remaining,conditional=false;
    for(const e of T.diceOrder.filter(e=>e!=="Omni"))for(let colored=0;colored<=cost.aligned;colored++) {
      const omni=cost.aligned-colored;
      if((s.dice[e]||0)<colored||(s.dice.Omni||0)<omni)continue;
      const d={...s.dice};if(colored)d[e]-=colored;if(omni)d.Omni-=omni;
      if(T.diceOrder.some(e=>(d[e]||0)!==(paid.remaining[e]||0)))conditional=true;
      if(worth(d)<worth(remaining))remaining=d;
    }
    return {remaining,conditional};
  }
  function hydroSetup(s,m,cast,estimate,remaining) {
    const enemy=estimate.target;
    // Value ONE follow-up's reaction gain, not a queued combat line.
    // Unknown aura is only a conditional scenario; never write it into observations.
    if(cast.who!==0||!enemy||estimate.direct>=enemy.hp||enemy.immuneElements?.includes("Hydro")||
      enemy.auraKnown&&(enemy.aura.includes("Hydro")||estimate.reaction.consumed))return null;
    const after=copy(s),memory=copy(m),index=s.enemies.indexOf(enemy);
    after.dice={...remaining};after.enemies[index].hp-=estimate.direct;
    if(T.known(enemy.shield))after.enemies[index].shield=Math.max(0,enemy.shield-estimate.raw);
    T.commit(memory,cast,s,after);
    const switched=T.payment(after.dice,T.switchCost(memory),"Hydro");
    if(switched)after.dice=switched.remaining;
    const fodder=after.hand.filter(h=>h.canTune!==false&&!h.attachments?.noTuning&&
      !h.id.startsWith("countdown")).sort((a,b)=>handValue(a.id,s,m)-handValue(b.id,s,m));
    let best=null;
    for(const who of [1,2]) {
      if(!T.alive(after.characters[who])||after.characters[who].frozen)continue;
      const dry={...after,active:who},wet=copy(dry);
      wet.enemies[index].aura=["Hydro"];wet.enemies[index].auraKnown=true;
      for(const skill of ["E","Q","NA"]) {
        const a={type:"skill",who,skill};if(T.actionRefused(dry,memory,a))continue;
        const payable={...dry,dice:{...dry.dice}};let tunes=0,discard=0;
        while(!T.skillLegal(payable,a,memory)&&tunes<Math.min(3,fodder.length)) {
          const bad=Object.keys(payable.dice).find(e=>payable.dice[e]>0&&e!==T.team[who].element&&e!=="Omni");
          if(!bad)break;
          payable.dice[bad]--;T.generateDice(payable.dice,T.team[who].element,1);
          discard+=handValue(fodder[tunes++].id,s,m);
        }
        const gain=Math.max(0,damageEstimate(wet,memory,who,skill).total-damageEstimate(dry,memory,who,skill).total);
        const affordable=!!switched&&T.skillLegal(payable,a,memory);
        // First water setup also serves the next round. Do not invent next-round
        // dice, actions or aura, or repeat this credit after Mona has already acted.
        const deferred=!affordable&&m.used[0]===0&&who===carry(s,m)&&
          (skill!=="Q"||s.characters[who].energy>=T.team[who].maxEnergy);
        if(!affordable&&!deferred)continue;
        // Opponent reply, switching and uncertain aura can invalidate this gain.
        // Do not add future lethal, Gambler refunds, random draws or the prepared kick.
        const value=affordable?gain*.75-discard:gain*.55;
        if(value>0&&(!best||value>best.value))best={value,gain,who,skill,tunes:affordable?tunes:0,
          conditional:true,requiresFreshObservation:true,requiresNextRound:!affordable};
      }
    }
    return best;
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
    const paid=projectedPayment(s,cost);if(!paid)return null;
    n.dice=paid.remaining;
    let value=-T.size(cost)*.25-.12,stop=false,estimate=null,terminal=false;
    const focus=carry(s,m),c=T.byId[a.id],cast=a.type==="skill"?a:a.type==="card"?c?.combatSkill:null;
    if(a.type==="end") {
      const ready=m.supports.filter(x=>x.id==="liben").some(x=>Object.values(s.dice).filter(v=>v>0).length+x.collected>=3);
      return {state:n,memory:v,value:ready?1.1:-.2,stop:true,terminal:false};
    }
    if(a.type==="switch") {
      n.active=a.target;value-=s.active===0&&!m.monaFastUsed?0:.1;
      // A preferred carry alone is not progress: drawing/support cards can be
      // played before switching, retaining Mona's setup and once-per-round fast exit.
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
        if(["timaeus","dunyarzad","liben"].includes(a.id)) {
          const draws=Number(a.id==="timaeus")+m.supports.filter(x=>x.id==="dunyarzad"&&!x.drawUsed).length;
          value+=Math.min(draws,10-n.hand.length)*.75;
          if(draws)stop=true; // value retrieval without inventing its random identity
        }
      }
      if(a.id==="wolf")value+=(a.target===focus?2.5:1.1);
      if(a.id==="gilded") {
        const output=s.active===0&&m.used[0]===0?0:focus;
        const useful=e=>e==="Omni"||e===T.team[output].element;
        value+=1+Object.entries(T.cardRefund(a,m,s)).reduce((v,[e,k])=>v+k*(useful(e) ? .35 : .1),0);
      }
      if(a.id==="troupe")value+=a.target!==s.active&&m.round<=2?1.2:.1;
      if(a.id==="gambler")value+=a.target===focus&&living(s).some(e=>e.hp<=6)?1.2:.15;
      if(a.id==="lyre") {n.hand.push(T.observedCard(T.byId[m.artifactKinds[a.target]].name,n.hand.length));value-=.35;}
      if(c.type==="talent"&&!m.talents[c.target])value+=.8;
    }
    if(cast) {
      estimate=damageEstimate(s,m,cast.who,cast.skill);stop=true;
      estimate.hydroSetup=hydroSetup(s,m,cast,estimate,n.dice);
      value+=estimate.hydroSetup?.value||0;
      // HP alone does not prove the opponent can interrupt the kick. Keep it
      // conditional at every HP, without the unsupported <=4HP scoring cliff.
      value+=estimate.total+estimate.prepared*.55;
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
    return {state:n,memory:v,value,stop,estimate,terminal,conditionalPayment:!!paid.conditional};
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
        const paymentUncertain=!!node.paymentUncertain||p.conditionalPayment,
          terminal=p.terminal&&!opponentReply&&!paymentUncertain,
          score=node.value+p.value-(p.terminal&&!terminal?100:0);
        if((p.stop||depth===4)&&(!best||score>best.score))best={action:sequence[0],score,sequence,estimate:p.estimate,terminal,paymentUncertain};
        if(!p.stop&&depth<4)next.push({...p,value:score,sequence,opponentReply,paymentUncertain});
      }
      if(used>=320)break;
      frontier=next.sort((a,b)=>b.value-a.value).slice(0,10);
    }
    if(!best)best={action:{type:"end"},score:0,sequence:[{type:"end"}]};
    // The guide also cashes equipment lost on defeat, not just replacement.
    // A free Boar before a low-HP equipped carry attacks is insurance, not a
    // prediction of death or extra spendable dice. Do not delay a proven win.
    if(!best.terminal&&!m.boar&&s.characters[s.active].hp<=3&&
      (m.weapons[s.active]||m.artifacts[s.active]||m.talents[s.active])&&
      (best.action.type==="skill"||best.action.type==="card"&&T.byId[best.action.id]?.combatSkill)) {
      const h=s.hand.find(h=>h.id==="boar"),a=h&&{type:"card",id:h.id,index:h.index,target:null};
      if(a&&T.size(T.cardCost(a.id,null,m))===0&&T.cardLegal(s,a,m)&&!T.actionRefused(s,m,a))
        return {...a,planning:{sequence:[T.actionKey(a)],terminal:false,reason:"equipment-loss-insurance"},
          projections:{used,limit:320,exhausted:used>=320}};
    }
    // Random retrieval is a search boundary, not a reason to put Liben before
    // Dunyarzad. Reorder only a pair already chosen, or the cost-neutral
    // Dunyarzad -> Timaeus pair; do not force buying a support before a lethal.
    if(!best.terminal&&best.action.type==="card"&&["liben","timaeus"].includes(best.action.id)&&m.supportSlots<=2&&
      !m.supports.some(x=>x.id==="dunyarzad")) {
      const h=s.hand.find(h=>h.id==="dunyarzad"),d=h&&{type:"card",id:h.id,index:h.index,target:null};
      if(d&&T.cardLegal(s,d,m)&&!T.actionRefused(s,m,d)&&
        (best.sequence.some(a=>a.id==="dunyarzad")||best.action.id==="timaeus"&&T.size(T.cardCost("timaeus",null,m))>=2))
        return {...d,planning:{sequence:[T.actionKey(d)],terminal:false,reason:"partner-before-retrieval"},
          projections:{used,limit:320,exhausted:used>=320}};
    }
    // A skill whose estimated discount is insufficient gets one existing read-only probe.
    if(best.action.type==="end")for(const skill of ["E","Q"]) {
      const a={type:"probe",who:s.active,skill};
      if(!s.characters[s.active].frozen&&(skill!=="Q"||s.characters[s.active].energy===T.team[s.active].maxEnergy)&&
        T.total(s.dice)>0&&!T.skillProbeAttempted(s,m,a)&&!T.actionRefused(s,m,a))return a;
    }
    return {...best.action,planning:{score:best.score,sequence:best.sequence.map(T.actionKey),terminal:!!best.terminal,
      estimate:best.estimate,conditionalPayment:!!best.paymentUncertain},projections:{used,limit:320,exhausted:used>=320}};
  }
  function replacement(s,m) {
    const choices=s.characters.flatMap((c,i)=>T.alive(c)?[{who:i,score:(c.frozen?-5:0)+(i===carry(s,m)?3:0)+c.hp*.1+(m.weapons[i]?1:0)}]:[]);
    return choices.sort((a,b)=>b.score-a.score)[0]||null;
  }
  Object.assign(T,{damageEstimate,enumerate,project,choose,replacement});
})(globalThis.TCG);

globalThis.TCG.registerStrategy("default", globalThis.TCG.choose);

globalThis.TCG.selectStrategy(globalThis.TCG.defaultStrategy);

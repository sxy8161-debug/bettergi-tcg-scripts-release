// Generated from 牌手共享. Edit layered source, not this standalone output.
/* GPL-3.0. Confirmed-action accounting; projections never replace native facts. */
(function(root) {
  "use strict";
  const team=[
    {name:"莫娜",element:"Hydro",maxHp:10,maxEnergy:3,weapon:"catalyst",skills:{NA:"因果点破",E:"水中幻愿",Q:"星命定轨"}},
    {name:"早柚",element:"Anemo",maxHp:10,maxEnergy:2,weapon:"claymore",skills:{NA:"忍刀·终末番",E:"呜呼流·风隐急进",Q:"呜呼流·影貉缭乱"}},
    {name:"迪卢克",element:"Pyro",maxHp:10,maxEnergy:3,weapon:"claymore",skills:{NA:"淬炼之剑",E:"逆焰之刃",Q:"黎明"}}
  ];
  const cards=[
    ["flowingFlame","流火焦灼",{element:"Pyro",n:3},"talent",2,2],
    ["skivingNewAndImproved","偷懒的新方法",{element:"Anemo",n:3},"talent",2,1],
    ["wolf","狼的末路",{aligned:3},"weapon",2],
    ["gambler","赌徒的耳环",{aligned:1},"artifact",2],
    ["gilded","饰金之梦",{aligned:3},"artifact",2],
    ["troupe","黄金剧团的奖赏",{},"artifact",2],
    ["house","黄金屋",{},"support",1],
    ["timaeus","蒂玛乌斯",{aligned:2},"support",2],
    ["liben","立本",{},"support",2],
    ["dunyarzad","迪娜泽黛",{aligned:1},"support",2],
    ["garden","旧时庭园",{},"legend",1],
    ["shift","换班时间",{},"switch",2],
    ["draw","运筹帷幄",{aligned:1},"draw",2],
    ["lyre","琴音之诗",{},"recycle",2],
    ["boar","野猪公主",{},"event",2],
    ["countdown3","幻戏倒计时：3",{aligned:3},"draw",2],
    ["countdown2","幻戏倒计时：2",{aligned:2},"draw",0],
    ["countdown1","幻戏倒计时：1",{aligned:1},"draw",0],
    ["show","幻戏开始！",{},"draw",0]
  ].map(([id,name,cost,type,copies,target])=>({id,name,cost,type,copies,
    ...(type==="talent"?{target,combatSkill:{who:target,skill:"E"}}:{})}));
  const byId=Object.fromEntries(cards.map(c=>[c.id,c]));
  const cardTitleAliases={运筹惟:"运筹帷幄"},characterAliases={};
  const norm = (t) =>
    String(t || "")
      .replace(/[\s:：·!！。，,（）()「」『』【】\[\]“”"‘’']/g, "")
      .replace(/迴/g, "回");
  function identify(text) {
  const title = norm(text);
  // User-approved two-glyph anchor. Other titles remain exact aliases only.
  if (title.includes("运筹") && byId.draw) return byId.draw;
  const canonical = cardTitleAliases[title] || title;
  return cards.find(c => norm(c.name) === norm(canonical)) || null;
}
  function observedCard(text, index) {
    const name = String(text || "").trim(), t = norm(name), c = identify(name);
    if (c) return { index, id: c.id, name: c.name, supported: true };
    if (t.length < 2 || t.length > 24 || !/[\u3400-\u9fffA-Za-z]/.test(t) ||
        !/^[\u3400-\u9fffA-Za-z0-9「」『』\-—]+$/.test(t) ||
        /^(初始手牌|请选择要替换的手牌|确定|取消|出战角色|回合结束|元素调和)$/.test(t)) return null;
    return { index, id: "unsupported:" + t, name, supported: false };
  }
  function handCardKnown(h) {
    if (!h || typeof h.id !== "string") return false;
    if (byId[h.id]) return h.supported !== false;
    const parsed = observedCard(h.name, h.index);
    return h.supported === false && parsed && parsed.supported === false && parsed.id === h.id;
  }
  let handInstanceSerial = 0;
function indexedHand(hand) {
    if (!Array.isArray(hand) || !hand.every(handCardKnown)) throw new Error("手牌缓存身份不完整");
    return hand.map((h, index) => ({ ...h, index,
      instanceIds: h.instanceIds?.length ? h.instanceIds.slice() : [++handInstanceSerial] }));
  }
function handInstanceFacts(h) {
    return [h.currentCost ?? null, ...["empowered", "noTuning", "effectless", "reduction", "increase"]
      .map(k => h.attachments?.[k] ?? null)];
  }
// Quotes and failed attempts belong to one observed board, not a whole round.
// Card-fact probeKeys are independent and are never cleared here.
function skillQuoteKey(a) { return [a.who,a.skill,a.technique ?? null].join("/"); }
function skillQuote(s,m,a) {
    return m.skillCosts?.key === boardKey(s) ? m.skillCosts.entries[skillQuoteKey(a)] : undefined;
  }
function skillProbeAttempted(s,m,a) { return skillQuote(s,m,a) !== undefined; }
function recordSkillCost(s,m,a,n,source="native-skill-preview") {
    const key=boardKey(s);
    if(m.skillCosts?.key!==key)m.skillCosts={key,entries:{}};
    m.skillCosts.entries[skillQuoteKey(a)]={n,source};
  }
function clearSkillCosts(m) { m.skillCosts=null; }
function refreshSkillCosts(m,s) {
    if(m?.skillCosts&&m.skillCosts.key!==boardKey(s))clearSkillCosts(m);
  }
function drawConsumptionProven(a,b,s) {
    const r=s?.drawConsumption,h=b?.hand?.[a?.index];
    return a?.type==="card"&&byId[a.id]?.type==="draw"&&s.phase==="board"&&s.turn==="user"&&
      r?.kind==="native-paid-draw"&&r.beforeKey===boardKey(b)&&r.id===a.id&&r.index===a.index&&
      r.target===(a.target??null)&&r.inputSent===true&&r.stableReads===2&&r.cost>0&&
      h?.id===a.id&&r.sourceInstanceIds?.length>0&&JSON.stringify(r.sourceInstanceIds)===JSON.stringify(h.instanceIds)&&
      r.diceKey===JSON.stringify(diceOrder.map(e=>s.dice?.[e]||0));
  }
// Positive native rejection proves that input did not mutate the hand. Only
// that recovery may bind an unchanged complete ordered row directly. Else use
// native cost/attachment distinctions; indistinguishable copies stay ambiguous.
function reconcileHand(previous, observed, unchanged = false, uncertainRecords = []) {
    const next = indexedHand(observed), prior = previous || [],
      continuous = unchanged && prior.length === next.length && prior.every((h, i) => h.id === next[i].id),
      compatible = (a, b) => handInstanceFacts(a).every((v, i) => v === null || handInstanceFacts(b)[i] === null || v === handInstanceFacts(b)[i]);
    return next.map((h, index) => {
      if (continuous && prior[index].instanceIds?.length) return { ...h,
        instanceIds: prior[index].instanceIds.slice(), ...(prior[index].instanceAmbiguous ? {instanceAmbiguous:true} : {}) };
      const old = prior.filter(c => c.id === h.id && (compatible(c, h) ||
        uncertainRecords.some(r => r.id === c.id && (!r.instanceIds || r.instanceIds.some(id => c.instanceIds?.includes(id)))))),
        origins = [...new Set(old.flatMap(c => c.instanceIds || []))];
      if (!origins.length || h.instanceIds.every(id => origins.includes(id))) return h;
      if (old.length === 1 && next.filter(c => c.id === h.id && compatible(c, old[0])).length === 1)
        return { ...h, instanceIds: origins, ...(old[0].instanceAmbiguous ? {instanceAmbiguous:true} : {}) };
      return { ...h, instanceIds: [...new Set([...origins, ...h.instanceIds])], instanceAmbiguous: true };
    });
  }
function refusalScope(s, action, m) {
    const a = action.cardAction || action,
      handAction = ["card", "tune"].includes(a.type) || a.type === "probe" && a.scope === "card",
      card = handAction && s?.hand?.[a.index], actor = s?.characters?.[a.who ?? s.active],
      target = s?.characters?.[a.target], cost = s && root.TCG.refusalCost?.(s,m,a);
    return { type: a.type, id: a.id ?? null, target: a.target ?? null,
      who: a.who ?? null, skill: a.skill ?? null, technique: a.technique ?? null,
      element: a.type === "tune" ? a.element ?? team[s?.active]?.element ?? null : null,
      active: a.type === "card" && a.target == null ? s?.active ?? null : null,
      handAction, instanceIds: card?.id === a.id ? card.instanceIds?.slice() || null : null,
      conditions: s ? JSON.stringify([cost ? Object.keys(cost).sort().map(k => [k,cost[k]]) : null,
        diceOrder.map(e => s.dice?.[e] || 0), actor?.frozen, actor?.dead,
        a.skill === "Q" ? actor?.energy : null, target && [target.hp,target.dead,target.frozen],
        card ? handInstanceFacts(card) : null]) : null };
  }
function blockAction(m, action, before, uncertain = false) {
    const key = actionKey(action), scope = refusalScope(before, action, m);
    m.uncertainActions ||= [];
    if (!m.uncertainActions.includes(key)) m.uncertainActions.push(key);
    m.refusedActions ||= [];
    const record = { key, round: m.round, uncertain, ...scope };
    if (!m.refusedActions.some(r => JSON.stringify(r) === JSON.stringify(record))) m.refusedActions.push(record);
  }
function actionRefused(s, m, action) {
    const key = actionKey(action);
    const records = (m.refusedActions || []).filter(r => r.round === m.round && r.key === key);
    // Old callers may still supply display-only blocks. New records are never
    // interpreted as a name-wide ban through this compatibility path.
    if (!records.length) return (m.uncertainActions || []).includes(key);
    const scope = refusalScope(s, action, m);
    return records.some(r => ["type", "id", "target", "who", "skill", "technique", "element", "active"]
      .every(k => r[k] === scope[k] || ["active", "element"].includes(k) && (r[k] === null || scope[k] === null)) &&
      (!r.handAction || !r.instanceIds || !scope.instanceIds || r.instanceIds.some(id => scope.instanceIds.includes(id))) &&
      (r.uncertain || r.conditions === null || scope.conditions === null || r.conditions === scope.conditions));
  }
  function characterName(text) {
  const title=norm(text),canonical=characterAliases[title]||title;
  return team.findIndex(c=>norm(c.name)===norm(canonical));
}
  const diceOrder = ["Pyro","Hydro","Anemo","Electro","Dendro","Cryo","Geo","Omni"];
  const known = n => Number.isInteger(n) && n >= 0;
  const alive = (c) => !!c && c.dead === false && known(c.hp) && c.hp > 0;
  const total = dice => Object.values(dice || {}).reduce((sum, n) => sum + n, 0);
  const size = cost => (cost.n || 0) + (cost.any || 0) + (cost.aligned || 0);
  function boardKey(s) {
    return JSON.stringify([s.active,diceOrder.map(e=>s.dice?.[e]||0),s.characters,
      (s.hand||[]).map(h=>h.id),s.enemies,s.quicken||null,s.supportCounts||null,s.eye||null,s.dendroCore||null]);
  }
  function actionKey(action) {
    return action.type + ":" + (action.id || (["skill","probe"].includes(action.type) ? action.who + ":" + action.skill : action.target));
  }
  function enemyCount(s) {
    const es=s?.enemies;
    if(!Array.isArray(es) || !es.length || !es.every(e=>e.dead===true || alive(e)))return null;
    return es.filter(alive).length;
  }
  function bag(hand) {
    const out = {};
    for (const h of hand || []) out[h.id] = (out[h.id] || 0) + 1;
    return out;
  }
  function cardCountDecreased(before, after, id) {
    // Unrelated hand growth or sent input cannot prove this card was consumed.
    return Array.isArray(before) && Array.isArray(after) &&
      (bag(before)[id] || 0) > (bag(after)[id] || 0);
  }
  function removedOne(before, after, id) {
    const b = bag(before), a = bag(after);
    return before.length === after.length + 1 && Object.keys({ ...b, ...a }).every(k => (b[k] || 0) - (a[k] || 0) === (k === id ? 1 : 0));
  }
  class OpeningFlow {
    constructor(entry) {
      if (!["opening", "pick", "roll", "board"].includes(entry)) throw new Error("请在起手、首次选人、首次掷骰或未行动的新开局牌桌启动");
      this.entry = entry;
      this.route = [entry];
      this.opened = false;
      this.picked = false;
      this.rolled = false;
      this.complete = false;
    }
    record(stage) {
      const property = { opening: "opened", pick: "picked", roll: "rolled" }[stage];
      if (!property || this.complete || this[property]) throw new Error("开局阶段已确认或已结束，不重复执行：" + stage);
      this[property] = true;
      if (this.route[this.route.length - 1] !== stage) this.route.push(stage);
    }
    enterBoard(memory) {
      if (this.complete) return null;
      if (!known(memory.round) || memory.round > 1) throw new Error("开局回合状态不一致，不接管中途对局");
      const seeded = memory.round === 0;
      if (seeded) nextRound(memory);
      this.complete = true;
      if (this.route[this.route.length - 1] !== "board") this.route.push("board");
      return { entry: this.entry, route: this.route.slice(), round: memory.round, roundSeeded: seeded, midgameRestore: false };
    }
  }
  function freshActionBoard(s) {
    // Visible checks reject obvious midgame positions, but cannot prove that
    // a zero-cost hidden status was never played. An explicit user declaration
    // is additionally required by main before admitting a board entry.
    return !!s && s.phase === "board" && ["user", "enemy"].includes(s.turn) &&
      legalState({ ...s, turn: "user", hand: [] }) && total(s.dice) === 8 &&
      s.characters.every((c, i) => c.hp === team[i].maxHp && c.energy === 0 && c.dead === false && c.frozen === false);
  }
  function rerollCounter(text) {
    const t=norm(text),values=[];
    for(const match of t.matchAll(/(?:还可重投([12])轮|(?:可重投次数|剩余重投次数|剩余次数)([12]))/g))
      values.push(Number(match[1]||match[2]));
    return values.length===1?values[0]:null;
  }
  function elementReaction(element,aura=[],lunar=false) {
  const pair=(a,b)=>(element===a&&aura.includes(b))||(element===b&&aura.includes(a));
  const result=(name,bonus,consumed,extra={})=>({name,bonus,consumed,...extra});
  if(element==="Anemo"){
    const spread=["Cryo","Hydro","Pyro","Electro"].find(e=>aura.includes(e));
    if(spread)return result("swirl",0,spread,{spread});
  }
  if(pair("Hydro","Cryo"))return result("freeze",1,element==="Hydro"?"Cryo":"Hydro",{freeze:true});
  if(pair("Pyro","Hydro")||pair("Pyro","Cryo"))return result(pair("Pyro","Hydro")?"vaporize":"melt",2,
    element==="Pyro"?(aura.includes("Hydro")?"Hydro":"Cryo"):"Pyro");
  if(pair("Electro","Pyro"))return result("overload",2,element==="Electro"?"Pyro":"Electro",{forceSwitch:true});
  if(pair("Electro","Hydro")||pair("Electro","Cryo")){
    const water=pair("Electro","Hydro");
    return result(water?(lunar?"lunar-charged":"charged"):"superconduct",1,
      element==="Electro"?(water?"Hydro":"Cryo"):"Electro",water&&lunar?{lunar:true,futureUnknown:true}:{piercing:1});
  }
  if(pair("Dendro","Hydro"))return result(lunar?"lunar-bloom":"bloom",1,element==="Dendro"?"Hydro":"Dendro",
    lunar?{lunar:true}:{futureUnknown:true});
  if(pair("Dendro","Pyro")||pair("Dendro","Electro"))return result("dendro",1,
    element==="Dendro"?(aura.includes("Pyro")?"Pyro":"Electro"):"Dendro",{futureUnknown:true});
  return {name:null,bonus:0};
}
  function damageAgainst(target,amount,element,piercing=false) {
  if(!target)return {direct:amount,shieldSpent:0,guaranteed:null};
  const immune=!piercing&&target.immuneElements?.includes(element),
    shieldSpent=!piercing&&!immune&&known(target.shield)?Math.min(target.shield,amount):0,
    direct=immune?0:Math.max(0,amount-shieldSpent);
  return {direct,shieldSpent,guaranteed:target.defenseKnown===true?direct:null};
}
  function payment(dice,cost,preserve="Hydro") {
    const secondaryPaymentWeights={},emptyPaymentWeight={weight:0};
        const groups = Object.entries(dice || {}), need = size(cost),
      count = groups.reduce((n, [, amount]) => n + amount, 0);
    if (need > count || count > 16) return null;
    if (!need) return { indices: [], remaining: { ...dice }, ...emptyPaymentWeight };
    const counts = Array(groups.length).fill(0), offsets = [];
    let offset = 0, best = null;
    for (const [, amount] of groups) { offsets.push(offset); offset += amount; }
    function visit(at, left, weight, matching, aligned) {
      if (best && weight > best.weight) return;
      if (left === 0) {
        if (cost.n && matching < cost.n) return;
        const indices = counts.flatMap((n, i) => Array.from({ length: n }, (_, j) => offsets[i] + j));
        // Original subset enumeration chose the earliest slot list on equal
        // weight. Count enumeration preserves that tie without identical dice subsets.
        if (best && weight === best.weight) {
          const different = indices.findIndex((n, i) => n !== best.indices[i]);
          if (different < 0 || indices[different] > best.indices[different]) return;
        }
        const remaining = { ...dice };
        groups.forEach(([element], i) => { remaining[element] -= counts[i]; });
        best = { indices, remaining, weight }; return;
      }
      if (at === groups.length) return;
      const [element, amount] = groups[at],
        fee = element === "Omni" ? 10 : element === preserve ? 6 : secondaryPaymentWeights[element] || 1;
      for (let n = 0; n <= Math.min(amount, left); n++) {
        if (n && cost.aligned && element !== "Omni" && aligned && aligned !== element) continue;
        counts[at] = n;
        visit(at + 1, left - n, weight + n * fee,
          matching + (element === cost.element || element === "Omni" ? n : 0),
          n && element !== "Omni" ? element : aligned);
      }
      counts[at] = 0;
    }
    visit(0, need, 0, 0, null);
    return best;
  }
  function freshMemory() {
    return {round:0,used:[0,0,0],defeated:[false,false,false],lastActive:0,
      freeSwitch:false,fastSwitch:false,monaFastUsed:false,monaStarted:false,bubble:false,pyroInfusion:0,dilucE:0,
      weapons:[false,false,false],weaponKinds:[null,null,null],artifacts:[false,false,false],artifactKinds:[null,null,null],
      talents:[false,false,false],troupe:[0,0,0],gamblerUsed:[0,0,0],enemyAliveCount:null,
      supports:[],supportSlots:0,supportStateKnown:true,garden:false,legendUsed:false,lyre:0,boar:0,firstCard:true,
      sayuSummon:0,reflection:0,skillCosts:null,uncertainActions:[],refusedActions:[],probeKeys:[]};
  }
  function nextRound(m) {
    if(m.round>0) {
      for(let i=0;i<3;i++)if(m.artifactKinds[i]==="troupe"&&!m.defeated[i]&&m.lastActive!==i)m.troupe[i]=Math.min(2,m.troupe[i]+1);
      for(const x of m.supports)if(x.id==="timaeus"&&known(x.materials))x.materials++;
      m.supports=m.supports.filter(x=>x.id!=="liben"||x.collected<3);
      m.pyroInfusion=Math.max(0,m.pyroInfusion-1);m.sayuSummon=Math.max(0,m.sayuSummon-1);m.reflection=0;
    }
    m.round++;m.dilucE=0;m.monaFastUsed=false;m.fastSwitch=false;
    m.garden=false;m.lyre=0;m.boar=0;m.firstCard=true;
    m.uncertainActions=[];m.refusedActions=[];clearSkillCosts(m);
    m.supportSlots=m.supportStateKnown?m.supports.length:4;
  }
  function legalState(s) {
    return !!s&&s.phase==="board"&&s.turn==="user"&&Array.isArray(s.characters)&&s.characters.length===3&&
      known(s.active)&&s.active<3&&alive(s.characters[s.active])&&s.diceKnown===true&&s.dice&&
      Object.keys(s.dice).every(e=>diceOrder.includes(e))&&Object.values(s.dice).every(known)&&total(s.dice)<=16&&
      Array.isArray(s.hand)&&s.hand.every(handCardKnown)&&s.characters.every((c,i)=>c&&(c.dead===true||
        alive(c)&&typeof c.frozen==="boolean"&&known(c.energy)&&c.energy<=team[i].maxEnergy));
  }
  function switchCost(m){return {any:m.freeSwitch?0:1};}
  function skillCost(who,skill,m,s=null) {
    const base=skill==="NA"?{element:team[who].element,n:1,any:2}:{element:team[who].element,n:who===2&&skill==="Q"?4:3};
    if(skill==="E")base.n=Math.max(0,base.n-(m.troupe[who]||0)-(who===2&&m.talents[2]&&[1,2].includes(m.dilucE)?1:0));
    const quote=s&&skillQuote(s,m,{who,skill});
    if(quote?.source==="native-skill-preview"&&known(quote.n)&&quote.n<= (who===2&&skill==="Q"?4:3)) {
      if(skill==="NA"){base.n=Math.min(1,quote.n);base.any=Math.max(0,quote.n-1);}else base.n=quote.n;
    }
    return base;
  }
  function skillLegal(s,a,m) {
    return ["NA","E","Q"].includes(a.skill)&&s.active===a.who&&alive(s.characters[a.who])&&
      s.characters[a.who].frozen===false&&(a.skill!=="Q"||s.characters[a.who].energy>=team[a.who].maxEnergy)&&
      !!payment(s.dice,skillCost(a.who,a.skill,m,s),team[a.who].element);
  }
  // All-dice replacement (Timaeus) precedes ordinary die reductions. Within
  // ordinary reductions, combat statuses precede supports in installation order.
  // Return the actual reducers as well as the price, so only a confirmed play consumes them.
  function cardPrice(id,target,m) {
    const c=byId[id],base={...c.cost},effects=[];let n=size(base);
    if(c.type==="talent")n=Math.max(0,n-(m.troupe[target]||0));
    if(c.type==="artifact"&&n>0) {
      const i=m.supports.findIndex(x=>x.id==="timaeus"&&x.round!==m.round&&known(x.materials)&&x.materials>=n);
      if(i>=0){effects.push({kind:"support",i,n});n=0;}
    }
    if(["weapon","artifact"].includes(c.type)) {
      if(m.garden&&n>0){n=Math.max(0,n-2);effects.push({kind:"garden"});}
      if(c.type==="artifact"&&m.lyre&&n>0){n=Math.max(0,n-m.lyre);effects.push({kind:"lyre"});}
    }
    for(let i=0;i<m.supports.length;i++) {
      const x=m.supports[i];if(x.round===m.round)continue;
      if(x.id==="house"&&x.left>0&&["weapon","artifact"].includes(c.type)&&n>=3){n--;effects.push({kind:"support",i,n:1});}
      if(x.id==="dunyarzad"&&["timaeus","liben","dunyarzad"].includes(id)&&n>0){n--;effects.push({kind:"support",i,n:1});}
    }
    if(base.aligned!==undefined)base.aligned=n;else if(base.n!==undefined)base.n=n;
    return {cost:base,effects};
  }
  function cardCost(id,target,m){return cardPrice(id,target,m).cost;}
  function cardLegal(s,a,m) {
    const c=byId[a.id];if(!c||s.hand[a.index]?.id!==a.id)return false;
    if(a.target!=null&&(!known(a.target)||a.target>2||!alive(s.characters[a.target])))return false;
    if(["weapon","artifact","recycle","talent"].includes(c.type)&&a.target==null)return false;
    if(!["weapon","artifact","recycle","talent"].includes(c.type)&&a.target!==null)return false;
    if(c.type==="weapon"&&team[a.target].weapon!=="claymore")return false;
    if(c.type==="talent"&&(a.target!==c.target||s.active!==c.target||s.characters[c.target].frozen))return false;
    if(a.id==="lyre"&&!m.artifactKinds[a.target])return false;
    if(a.id==="garden"&&(m.legendUsed||!m.weapons.some(Boolean)&&!m.artifacts.some(Boolean)))return false;
    if(c.type==="support"&&m.supportSlots>=4)return false;
    return !!payment(s.dice,cardCost(a.id,a.target,m,s),team[s.active].element);
  }
  function generateDice(dice,element,count){const n=Math.min(count,Math.max(0,16-total(dice)));if(n)dice[element]=(dice[element]||0)+n;return n;}
  function cardRefund(a,m,b) {
    if(a.type!=="card")return {};
    const c=byId[a.id],out={},paid=payment(b.dice,cardCost(a.id,a.target,m,b),team[b.active].element);
    if(!paid)return out;
    if(a.id==="gilded")out[team[a.target].element]=generateDice(paid.remaining,team[a.target].element,2);
    if(["weapon","artifact","talent"].includes(c.type)&&m.boar>0&&
      (c.type==="weapon"?m.weapons[a.target]:c.type==="talent"?m.talents[a.target]:m.artifacts[a.target]))
      out.Omni=generateDice(paid.remaining,"Omni",1);
    return out;
  }
  const gamblerRemaining=(m,i)=>Math.max(0,3-(m.gamblerUsed[i]||0));
  function noteBoard(m,s,owner=m.lastActive) {
    if(!s?.characters)return;
    s.characters.forEach((c,i)=>{if(c.dead===true&&!m.defeated[i]) {
      m.defeated[i]=true;m.boar=Math.max(0,m.boar-Number(m.weapons[i])-Number(m.artifacts[i])-Number(m.talents[i]));
      m.weapons[i]=m.artifacts[i]=m.talents[i]=false;m.weaponKinds[i]=m.artifactKinds[i]=null;m.troupe[i]=0;
    }});
    const n=enemyCount(s);
    if(n!==null){if(m.enemyAliveCount!==null&&m.artifactKinds[owner]==="gambler")m.gamblerUsed[owner]=Math.min(3,m.gamblerUsed[owner]+Math.max(0,m.enemyAliveCount-n));m.enemyAliveCount=n;}
    if(known(s.active))m.lastActive=s.active;
  }
  function commit(m,a,b,after) {
    const oldFirst=m.firstCard;clearSkillCosts(m);
    if(a.type==="end") {
      // Multiple Libens collect sequentially; actual next-round dice still come from OCR.
      const pool={...b.dice};
      for(const x of m.supports)if(x.id==="liben"&&known(x.collected))for(const e of diceOrder)
        if(x.collected<3&&pool[e]>0){pool[e]--;x.collected++;}
    }
    if(a.type==="switch"){if(b.active===0)m.monaFastUsed=true;m.freeSwitch=false;}
    let cast=a.type==="skill"?a:a.type==="card"?byId[a.id]?.combatSkill:null;
    if(a.type==="card") {
      const c=byId[a.id];
      const price=cardPrice(a.id,a.target,m);
      for(const e of price.effects) {
        if(e.kind==="garden")m.garden=false;
        if(e.kind==="lyre")m.lyre=0;
        if(e.kind==="support") {const x=m.supports[e.i];x.round=m.round;if(x.id==="house")x.left--;if(x.id==="timaeus")x.materials-=e.n;}
      }
      if(["weapon","artifact"].includes(c.type)) {
        const weapon=c.type==="weapon",flags=weapon?m.weapons:m.artifacts,kinds=weapon?m.weaponKinds:m.artifactKinds;
        if(flags[a.target])m.boar=Math.max(0,m.boar-1);
        flags[a.target]=true;kinds[a.target]=a.id;if(!weapon)m.troupe[a.target]=0;
        if(a.id==="gambler")m.gamblerUsed[a.target]=0;
      }
      if(c.type==="talent"){if(m.talents[c.target])m.boar=Math.max(0,m.boar-1);m.talents[c.target]=true;}
      if(c.type==="support") {
        for(const x of m.supports)if(x.id==="dunyarzad"&&["timaeus","liben","dunyarzad"].includes(a.id))x.drawUsed=true;
        m.supports.push({id:a.id,round:-1,...(a.id==="house"?{left:2}:a.id==="timaeus"?{materials:2}:a.id==="liben"?{collected:0}:{drawUsed:false})});
      }
      if(a.id==="garden"){m.garden=true;m.legendUsed=true;}
      if(a.id==="lyre"){m.artifacts[a.target]=false;m.artifactKinds[a.target]=null;m.troupe[a.target]=0;m.lyre=oldFirst?2:1;}
      if(a.id==="boar")m.boar=2;
      if(a.id==="shift")m.freeSwitch=true;
      m.firstCard=false;
    }
    if(cast) {
      m.used[cast.who]++;m.bubble=false;
      if(cast.skill==="E")m.troupe[cast.who]=0;
      if(cast.who===0){if(cast.skill==="E"){m.monaStarted=true;m.reflection=1;}if(cast.skill==="Q")m.bubble=true;}
      if(cast.who===1&&cast.skill==="Q")m.sayuSummon=2;
      if(cast.who===2){if(cast.skill==="E"&&known(m.dilucE))m.dilucE++;if(cast.skill==="Q")m.pyroInfusion=2;}
    }
    m.supports=m.supports.filter(x=>x.id!=="house"||x.left>0);m.supportSlots=m.supportStateKnown?m.supports.length:4;
    noteBoard(m,after,cast?.who??b.active);
    m.fastSwitch=m.lastActive===0&&!m.monaFastUsed;
  }
  function rejectAction(m,a,b){clearSkillCosts(m);blockAction(m,a,b);}
  function deferUncertain(m,a,b) {
    clearSkillCosts(m);blockAction(m,a,b,true);
    // Never book an unconfirmed discount/equipment. Unknown reducers use their upper price.
    m.garden=false;m.lyre=0;m.boar=0;m.bubble=false;m.freeSwitch=false;m.monaFastUsed=true;m.fastSwitch=false;
    if(a.type==="skill"||byId[a.id]?.combatSkill){m.dilucE=null;m.pyroInfusion=0;m.troupe=[0,0,0];}
    if(a.type==="card") {
      if(a.id==="garden")m.legendUsed=true;
      if(byId[a.id]?.type==="support"){m.supportSlots=4;m.supportStateKnown=false;}
      for(const x of m.supports){x.round=m.round;if(x.id==="timaeus")x.materials=null;}
      if(a.target!=null){m.weapons[a.target]=m.artifacts[a.target]=m.talents[a.target]=false;m.weaponKinds[a.target]=m.artifactKinds[a.target]=null;}
    }
  }
  function handPlan(a,b,m) {
    const h=indexedHand(b.hand),c=byId[a.id];
    if(a.type==="probe"||a.type==="switch")return {mode:"unchanged",hand:h};
    // Swirls and reaction artifacts can insert cards; do not trust the old empty hand.
    if(a.type==="skill")return m?.talents[1]||m?.artifactKinds.includes("gilded")?{mode:"full"}:{mode:"unchanged",hand:h};
    if(a.type==="card"&&(["draw","recycle","talent","support"].includes(c?.type)))return {mode:"full"};
    if(a.type==="card"||a.type==="tune") {
      if(h[a.index]?.id!==a.id)throw new Error("手牌索引与身份不一致");
      return {mode:"remove",hand:indexedHand(h.filter((_,i)=>i!==a.index))};
    }
    return {mode:"full"};
  }
  function verify(a,b,c,transition=false) {
    if(!a||!b||!c)return false;if(c.result)return true;
    if(a.type==="end")return c.turn==="enemy"||["roll","settlement"].includes(c.phase);
    if(a.type==="switch")return c.active===a.target&&b.active!==a.target;
    if(a.type==="skill")return transition||c.turn==="enemy"||!!c.dice&&(total(c.dice)<total(b.dice)||
      known(c.characters?.[a.who]?.energy)&&c.characters[a.who].energy!==b.characters[a.who].energy||
      enemyCount(c)!==null&&JSON.stringify(c.enemies.map(e=>e.hp))!==JSON.stringify(b.enemies.map(e=>e.hp)));
    if(a.type==="tune")return c.turn==="user"&&removedOne(b.hand,c.hand,a.id)&&total(c.dice)===total(b.dice)&&(c.dice[a.element]||0)===(b.dice[a.element]||0)+1;
    if(a.type!=="card"||!c.hand)return false;
    if(byId[a.id]?.type==="draw")return drawConsumptionProven(a,b,c)||cardCountDecreased(b.hand,c.hand,a.id);
    if(a.id==="lyre")return cardCountDecreased(b.hand,c.hand,a.id)&&c.hand.length===b.hand.length;
    if(["support","talent"].includes(byId[a.id]?.type))return cardCountDecreased(b.hand,c.hand,a.id);
    return removedOne(b.hand,c.hand,a.id);
  }
  function openingSetting(){return "优先装备与启动牌";}
  function openingContext(c={}){return {enemyCount:enemyCount({enemies:c.enemies})??c.enemyCount??null};}
  function keepOpening(id,hand=[],index=null) {
    if(["dunyarzad","timaeus","liben","countdown3","draw"].includes(id))return true;
    if(id==="troupe")return hand.find(h=>h.id===id)?.index===index;
    if(id==="garden")return hand.some(h=>["draw","countdown3","timaeus"].includes(h.id));
    return false;
  }
  function openingPlan(hand,original) {
    if(hand?.length!==5||!hand.every(handCardKnown)||original?.length!==5||!original.every(x=>typeof x==="boolean"))throw new Error("起手五张手牌未核实");
    const replace=hand.map((h,i)=>h.supported?!keepOpening(h.id,hand,i):original[i]);
    return {replace,keep:hand.filter((h,i)=>!replace[i]),duplicateWeapons:[]};
  }
  function rerollPlan(items,m) {
    const primary=team[m.defeated[m.lastActive]?m.defeated.findIndex(v=>!v):m.lastActive]?.element||"Hydro";
    const secondary=primary==="Hydro"?(m.openingContext?.enemyCount<=2?"Pyro":"Anemo"):null;
    const indices=items.flatMap((d,i)=>d.element==="Omni"||d.element===primary||d.element===secondary?[i]:[]);
    return {primary,secondary,elements:[primary,secondary,"Omni"].filter(Boolean),indices};
  }
  root.TCG={team,cards,byId,norm,identify,observedCard,handCardKnown,indexedHand,reconcileHand,actionRefused,blockAction,
    skillQuote,skillProbeAttempted,recordSkillCost,clearSkillCosts,refreshSkillCosts,drawConsumptionProven,characterName,diceOrder,
    known,alive,total,size,payment,boardKey,actionKey,freshMemory,nextRound,OpeningFlow,legalState,freshActionBoard,
    switchCost,skillCost,skillLegal,cardPrice,cardCost,cardLegal,cardRefund,generateDice,enemyCount,elementReaction,damageAgainst,
    gamblerRemaining,noteBoard,commit,deferUncertain,rejectAction,handPlan,verify,verifyResynchronized:(a,b,c,t)=>legalState(c)&&verify(a,b,c,t),
    emptyHandEffect:()=>false,removalEffect:()=>false,openingSetting,openingContext,keepOpening,openingPlan,rerollPlan,rerollCounter,
    drawPayment:(s,a,m)=>byId[a.id]?.type==="draw"?cardCost(a.id,a.target,m,s):null,
    refusalCost:(s,m,a)=>a.type==="skill"?skillCost(a.who,a.skill,m,s):a.type==="card"?cardCost(a.id,a.target,m,s):a.type==="switch"?switchCost(m):{}};
})(globalThis);

globalThis.TCG.version = "0.1.1";
globalThis.TCG.sharedVersion = "1.6.1";
globalThis.TCG.defaultStrategy = "default";
(function (T) {
  const strategies = new Map();
  T.registerStrategy = function (id, choose) {
    if (!/^[a-z][a-z0-9-]*$/.test(id) || typeof choose !== "function" || strategies.has(id))
      throw new Error("策略标识无效、重复或缺少决策函数：" + id);
    strategies.set(id, choose);
  };
  T.selectStrategy = function (id) {
    if (!strategies.has(id)) throw new Error("未注册策略：" + id);
    T.choose = strategies.get(id);
    T.activeStrategy = id;
  };
  T.availableStrategies = function () { return [...strategies.keys()]; };
})(globalThis.TCG);

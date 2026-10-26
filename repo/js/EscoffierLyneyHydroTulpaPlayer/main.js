// @module core
/* GPL-3.0. Card names/costs are game rules; the guide supplies the 30-card list. */
globalThis.TCGAilinCatalog = {
  shareCode:"IaFRwxkPIBCy8RgPITCA85cPCUBx9DMTE7ExupMbGaIwA8YgDDJgBtEgDWER1EodFEAA",
  guide:"https://www.miyoushe.com/ys/article/73568256",
  team:[
    {name:"爱可菲",element:"Cryo",maxHp:10,maxEnergy:2,weapon:"pole",skills:{NA:"后厨手艺",E:"低温烹饪",Q:"花刀技法"}},
    {name:"林尼",element:"Pyro",maxHp:10,maxEnergy:2,weapon:"bow",skillOrder:["NA","CA","E","Q"],
      skills:{NA:"迫牌易位式",CA:"隐具魔术箭",E:"眩惑光戏法",Q:"大魔术·灵迹巡游"}},
    {name:"水形幻人",element:"Hydro",maxHp:10,maxEnergy:3,weapon:null,skills:{NA:"涌浪",E:"汛波",Q:"洪啸"}}
  ],
  cards:[
    ["teaParty","虹彩缤纷的甜点茶话",{element:"Cryo",n:4},"talent",2],
    ["gambler","赌徒的耳环",{aligned:1},"artifact",2],
    ["heart","灵光明烁之心",{},"artifact",2],
    ["gladiator","角斗士的凯旋",{},"artifact",2],
    ["chef","卯师傅",{aligned:1},"support",2],
    ["dunyarzad","迪娜泽黛",{aligned:1},"support",2],
    ["silver","西尔弗和迈勒斯",{aligned:1},"support",2],
    ["pilgrimage","归火圣夜巡礼",{},"legend",1],
    ["companion","最好的伙伴！",{any:2},"dice",2],
    ["toss","一掷乾坤",{},"reroll",2],
    ["draw","运筹帷幄",{aligned:1},"draw",2],
    ["boar","野猪公主",{},"event",1],
    ["surf","强劲冲浪拍档！",{},"combat",2],
    ["dragon","「邪龙」的苏醒",{aligned:2},"summon",2],
    ["blessingM","「魔女M的祝福」",{},"summon-discard",2],
    ["soup","奇瑰之汤",{aligned:1},"food",2],
    ["gildedHall","鎏金殿堂",{},"food",0],
    ["autumnFrost","雾凇秋分",{},"food",0],
    ["wavekissedSands","白浪拂沙",{any:2},"team-food",0],
    ["verdantGift","一捧绿野",{aligned:1},"team-food",0]
  ].map(([id,name,cost,type,copies])=>({id,name,cost,type,copies,
    ...(id==="teaParty"?{target:0,combatSkill:{who:0,skill:"E"}}:{}),
    ...(["surf","wavekissedSands","verdantGift"].includes(id)?{combatAction:true}:{})})),
  soupOptions:{"奇瑰之汤·疗愈":"healing","奇瑰之汤·助佑":"discount","奇瑰之汤·激愤":"fury",
    "奇瑰之汤·宁静":"shield","奇瑰之汤·安神":"soothing","奇瑰之汤·鼓舞":"maxhp"}
};

// Generated from 牌手共享. Edit layered source, not this standalone output.
/* GPL-3.0. Only confirmed own actions are booked; HP/dice/hand remain observations. */
(function(root){
  "use strict";
  const {team,cards,soupOptions,shareCode,guide}=root.TCGAilinCatalog;
  const byId=Object.fromEntries(cards.map(c=>[c.id,c]));
  const cardTitleAliases={运筹:"运筹帷幄",运筹惟:"运筹帷幄",卵师傅:"卯师傅",雾松秋分:"雾凇秋分"},characterAliases={};
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
    // Eligibility comes from the deck's drawPayment adapter at receipt creation
    // and proof validation; retrieval supports need not have display type draw.
    return a?.type==="card"&&!!byId[a.id]&&s.phase==="board"&&s.turn==="user"&&
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
        card ? handInstanceFacts(card) : null,
        ...(a.summonIndex != null ? [s.summons?.find(x => x.index === a.summonIndex) || null] : [])]) : null };
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
      (s.hand||[]).map(h=>h.id),s.enemies,s.quicken||null,s.supportCounts||null,s.eye||null,s.dendroCore||null,
      ...(s.summonLayout ? [s.summonLayout] : []),
      ...(s.skillFees ? [s.skillFees] : [])]);
  }
  function actionKey(action) {
    return action.type + ":" + (action.id || (["skill","probe"].includes(action.type) ? action.who + ":" + action.skill : action.target)) +
      (action.summonIndex != null ? ":summon:" + action.summonIndex + ":" + action.summonName : "");
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
  function payment(dice,cost,preserve="Pyro") {
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
  function freshMemory(){
    return {round:0,used:[0,0,0],defeated:[false,false,false],lastActive:0,
      props:0,talents:[false,false,false],artifactKinds:[null,null,null],
      gladiatorUsed:[false,false,false],gamblerUsed:[0,0,0],food:[false,false,false],
      foodDiscount:[0,0,0],nextDamage:[0,0,0],gildedDamage:[0,0,0],soupDiscount:[0,0,0],soupDamage:[0,0,0],extraMaxHp:[0,0,0],
      supports:[{id:"cooking",slot:0,remaining:2}],supportStateKnown:true,supportSlots:1,disposedSupports:0,
      coldSummon:0,catSummon:0,summonsKnown:true,talentColdUsed:false,
      legendUsed:false,boar:0,freeSwitch:false,fastSwitch:false,
      enemyAliveCount:null,skillCosts:null,probeKeys:[],uncertainActions:[],refusedActions:[]};
  }
  function nextRound(m){
    m.round++;m.gladiatorUsed=[false,false,false];m.gamblerUsed=[0,0,0];m.food=[false,false,false];
    m.soupDiscount=[0,0,0];m.soupDamage=[0,0,0];m.gildedDamage=[0,0,0];
    m.talentColdUsed=false;m.boar=0;m.freeSwitch=false;
    if(m.round>1){m.coldSummon=Math.max(0,m.coldSummon-1);m.catSummon=Math.max(0,m.catSummon-1);}
    m.refusedActions=[];m.uncertainActions=[];clearSkillCosts(m);
  }
  function legalState(s){
    return !!s&&s.phase==="board"&&s.turn==="user"&&known(s.active)&&s.active<3&&
      Array.isArray(s.characters)&&s.characters.length===3&&alive(s.characters[s.active])&&
      s.diceKnown===true&&s.dice&&Object.keys(s.dice).every(e=>diceOrder.includes(e))&&
      Object.values(s.dice).every(known)&&total(s.dice)<=16&&
      Array.isArray(s.hand)&&s.hand.every(handCardKnown)&&s.characters.every((c,i)=>
        c?.dead===true||alive(c)&&typeof c.frozen==="boolean"&&known(c.energy)&&c.energy<=team[i].maxEnergy);
  }
  function skillReduction(who,skill,m,s){
    let reduction=(m.foodDiscount[who]||0)+(m.soupDiscount[who]||0);
    if(["NA","CA"].includes(skill)&&m.artifactKinds[who]==="gladiator"&&!m.gladiatorUsed[who]&&s?.hand?.length<=2)reduction++;
    return reduction;
  }
  function skillCost(who,skill,m,s=null){
    const base=skill==="NA"?{element:team[who].element,n:1,any:2}:{element:team[who].element,n:3},
      reduction=skillReduction(who,skill,m,s);
    const any=Math.min(base.any||0,reduction);if(base.any)base.any-=any;base.n=Math.max(0,base.n-(reduction-any));
    const quote=s&&skillQuote(s,m,{who,skill});
    const observed=s?.skillFees?.who===who?s.skillFees.entries[skill]:null;
    if(skill!=="NA"&&known(observed?.n)){
      // Projections change only our known discounts. The current native fee
      // (including increases) travels with the observed board, not its dice key.
      base.n=Math.max(0,observed.n+(observed.reduction??reduction)-reduction);
    }
    if(quote?.source==="native-skill-preview"&&known(quote.n)){
      base.n=base.any===undefined?quote.n:Math.min(base.n,quote.n);
      if(base.any!==undefined)base.any=Math.max(0,quote.n-base.n);
    }
    return base;
  }
  function skillLegal(s,a,m){
    return a.who===s.active&&!!team[a.who]?.skills[a.skill]&&alive(s.characters[a.who])&&
      s.characters[a.who].frozen===false&&(a.skill!=="Q"||s.characters[a.who].energy>=team[a.who].maxEnergy)&&
      !!payment(s.dice,skillCost(a.who,a.skill,m,s),team[a.who].element);
  }
  function cardCost(id,target,m){
    const cost={...byId[id].cost};
    if(byId[id].type==="support"&&m.supportStateKnown&&m.supports.some(x=>x.id==="dunyarzad"&&x.discountRound!==m.round))cost.aligned=Math.max(0,(cost.aligned||0)-1);
    return cost;
  }
  const switchCost=m=>({any:m.freeSwitch?0:1});
  function cardLegal(s,a,m){
    const c=byId[a.id];if(!c||s.hand[a.index]?.id!==a.id)return false;
    const targeted=["artifact","food","talent"].includes(c.type);
    if(targeted&&(!known(a.target)||a.target>2||!alive(s.characters[a.target])))return false;
    if(!targeted&&a.target!=null)return false;
    if(c.type==="talent"&&(a.target!==0||s.active!==0||s.characters[0].frozen))return false;
    if(c.type==="food"&&m.food[a.target]!==false)return false;
    if(c.type==="team-food"&&s.characters.some((ch,i)=>alive(ch)&&m.food[i]!==false))return false;
    if(c.type==="support"&&(!m.supportStateKnown||m.supportSlots>=4))return false;
    if(c.type==="legend"&&(m.legendUsed||!m.supportStateKnown||m.supportSlots>=4))return false;
    if(a.id==="surf"&&!(s.summonCountKnown&&s.summonCount+s.enemySummonCount>=2))return false;
    if(a.id==="dragon"&&!(s.summonCountKnown&&s.summonCount<4))return false;
    if(a.id==="blessingM"&&!(s.summonCountKnown&&s.summons?.some(x=>x.index===a.summonIndex&&x.name===a.summonName&&known(x.uses))))return false;
    return !!payment(s.dice,cardCost(a.id,a.target,m),team[s.active].element);
  }
  function gamblerRemaining(m,i){return Math.max(0,3-(m.gamblerUsed[i]||0));}
  function cardRefund(a,m,b){
    if(a.type!=="card")return {};
    if(byId[a.id]?.type==="artifact"&&m.boar>0&&m.artifactKinds[a.target])return {Omni:1};
    if(a.id==="companion")return {Omni:2};
    return {};
  }
  function noteBoard(m,s,owner=m.lastActive){
    if(!s?.characters)return;
    s.characters.forEach((ch,i)=>{if(ch.dead===true&&!m.defeated[i]){
      m.defeated[i]=true;m.artifactKinds[i]=null;m.talents[i]=false;
      m.foodDiscount[i]=m.soupDiscount[i]=m.soupDamage[i]=m.nextDamage[i]=m.gildedDamage[i]=0;if(i===1)m.props=0;
    }});
    const n=enemyCount(s);if(n!==null){
      if(m.enemyAliveCount!==null&&m.artifactKinds[owner]==="gambler")m.gamblerUsed[owner]=Math.min(3,m.gamblerUsed[owner]+Math.max(0,m.enemyAliveCount-n));
      m.enemyAliveCount=n;
    }
    if(known(s.active))m.lastActive=s.active;
    if(s.ailinFacts?.source==="native-character-status"&&known(s.ailinFacts.props)&&s.ailinFacts.props<=3)m.props=s.ailinFacts.props;
    if(s.summonCountKnown){
      m.summonsKnown=s.summons.every(x=>!!x.name);
      m.coldSummon=s.summons.find(x=>x.name==="厨艺机关·低温冷藏模式")?.uses??(m.summonsKnown?0:null);
      m.catSummon=s.summons.find(x=>x.name==="怪笑猫猫帽")?.uses??(m.summonsKnown?0:null);
    }else if(s.summonCountKnown===false){m.summonsKnown=false;m.coldSummon=m.catSummon=null;}
    const native=s.supportCounts;
    if(native?.source==="native-support-rims"){
      if(!native.known){m.supportStateKnown=false;return;}
      m.supports=m.supports.filter(support=>{
        if(known(support.slot)&&native.slots[support.slot]?.present===false){m.disposedSupports++;return false;}
        return true;
      });
      const claimed=new Set(m.supports.filter(x=>known(x.slot)).map(x=>x.slot));
      for(const support of m.supports.filter(x=>!known(x.slot))){
        const candidates=(support.emptyBefore||[]).filter(i=>native.slots[i]?.present===true&&!claimed.has(i));
        if(candidates.length===1){support.slot=candidates[0];claimed.add(support.slot);delete support.emptyBefore;}
      }
      for(const support of m.supports){
        const n=native.slots[support.slot]?.counter;
        if(support.id==="cooking"&&known(n)&&n<=2)support.remaining=n;
        if(support.id==="silver"&&known(n)&&n<=4)support.elementCount=n;
      }
      m.supportSlots=native.count;
      m.supportStateKnown=m.supports.every(x=>known(x.slot))&&native.slots.every(slot=>
        slot.present!==true||claimed.has(slot.index));
    }
  }
  function soupReceiptValid(a,b,after){const r=after?.soupReceipt;return r?.exited===true&&r.origin===actionKey(a)+"/"+boardKey(b)&&r.target===a.target&&Object.values(soupOptions).includes(r.effect);}
  function commit(m,a,b,after){
    if(after.confirmed!==true)throw Error("未确认动作不能记账");
    clearSkillCosts(m);
    const cast=a.type==="skill"?a:a.type==="card"?byId[a.id]?.combatSkill:null;
    if(cast){
      const who=cast.who;m.used[who]++;
      if(a.type==="skill"){
        if(["NA","CA"].includes(cast.skill)&&m.artifactKinds[who]==="gladiator"&&b.hand.length<=2)m.gladiatorUsed[who]=true;
        m.foodDiscount[who]=0;m.soupDiscount[who]=0;
      }
      m.nextDamage[who]=0;m.gildedDamage[who]=0;if(m.soupDamage[who]>0)m.soupDamage[who]--;
      if(who===0&&cast.skill==="E")m.coldSummon=2;
      if(who===1){
        if(["CA","Q"].includes(cast.skill)){m.props=known(m.props)?Math.min(3,m.props+1):null;m.catSummon=Math.min(2,m.catSummon+1);}
        if(cast.skill==="E")m.props=0;
      }
      if(who!==0&&["NA","CA"].includes(cast.skill)&&m.talents[0]&&!m.talentColdUsed&&m.coldSummon>0)m.talentColdUsed=true;
      if(who===2&&["E","Q"].includes(cast.skill))m.summonsKnown=false;
    }
    if(a.type==="card"){
      const c=byId[a.id];
      if(c.type==="artifact"){
        if(m.boar>0&&m.artifactKinds[a.target])m.boar--;
        m.artifactKinds[a.target]=a.id;
      }
      if(c.type==="talent")m.talents[0]=true;
      if(c.type==="support"){
        const reducer=m.supports.find(x=>x.id==="dunyarzad"&&x.discountRound!==m.round);
        if(reducer)reducer.discountRound=m.round;
        for(const x of m.supports)if(x.id==="dunyarzad")x.drawUsed=true;
        m.supports.push({id:a.id,discountRound:-1,refundRound:-1,drawUsed:false,
          emptyBefore:b.supportCounts?.known?b.supportCounts.slots.filter(s=>s.present===false).map(s=>s.index):[]});
        m.supportSlots++;m.supportStateKnown=false;
      }
      if(c.type==="legend"){
        m.legendUsed=true;
        if(!m.supports.some(s=>s.id==="flame")){
          m.supports.push({id:"flame",emptyBefore:b.supportCounts?.known?b.supportCounts.slots.filter(s=>s.present===false).map(s=>s.index):[]});
          m.supportSlots++;m.supportStateKnown=false;
        }
      }
      if(a.id==="boar")m.boar=2;
      if(["food","team-food"].includes(c.type)){
        const targets=c.type==="team-food"?b.characters.flatMap((ch,i)=>alive(ch)?[i]:[]):[a.target];
        for(const i of targets)m.food[i]=true;
        if(a.id==="wavekissedSands")for(const i of targets)m.foodDiscount[i]=1;
        if(a.id==="verdantGift")for(const i of targets)m.nextDamage[i]=1;
        if(a.id==="gildedHall")m.gildedDamage[a.target]=2;
        if(a.id==="autumnFrost")m.extraMaxHp[a.target]++;
        if(a.id==="soup"&&soupReceiptValid(a,b,after)){
          if(after.soupReceipt.effect==="discount")m.soupDiscount[a.target]=2;
          if(after.soupReceipt.effect==="fury")m.soupDamage[a.target]=2;
          if(after.soupReceipt.effect==="maxhp")m.extraMaxHp[a.target]++;
        }
        for(const x of m.supports)if(x.id==="chef"){x.refundRound=m.round;x.drawUsed=true;}
      }
      if(["surf","dragon","blessingM"].includes(a.id))m.summonsKnown=false;
    }
    if(a.type==="switch")m.freeSwitch=false;
    noteBoard(m,after,cast?.who??b.active);
  }
  function rejectAction(m,a,b){clearSkillCosts(m);blockAction(m,a,b);}
  function deferUncertain(m,a,b){
    clearSkillCosts(m);blockAction(m,a,b,true);m.summonsKnown=false;
    if(a.type==="skill"||byId[a.id]?.combatSkill){m.props=null;m.soupDiscount=[0,0,0];m.foodDiscount=[0,0,0];m.nextDamage=[0,0,0];m.gildedDamage=[0,0,0];m.soupDamage=[0,0,0];}
    if(a.type==="card"){
      const c=byId[a.id];if(c.type==="support"||c.type==="legend")m.supportStateKnown=false;
      if(c.type==="legend")m.legendUsed=true;
      if(["food","team-food"].includes(c.type)){
        if(c.type==="team-food")m.food=[null,null,null];else m.food[a.target]=null;
      }
    }
  }
  function handPlan(a,b,m){
    const h=indexedHand(b.hand),c=byId[a.id];
    if(a.type==="probe")return {mode:"unchanged",hand:h};
    if((a.type==="card"||a.type==="tune")&&h[a.index]?.id!==a.id)throw Error("手牌索引与身份不一致");
    const remaining=indexedHand(h.filter((_,i)=>a.type!=="card"||i!==a.index));
    // These actions consume only their source, never reorder or replace the
    // remaining cards. Newly generated/drawn cards are read from the row;
    // an equal native count retains the complete old hand in its known order.
    const retains=["card","skill","switch"].includes(a.type);
    const full=(refreshAfterConsumption=false)=>({mode:"full",refreshAfterConsumption,
      ...(retains?{retainedHand:remaining,retainedHandOrder:true}:{})});
    // A partner entry only draws when an existing Dunyarzad still owns its
    // one-time trigger. Rechecking the row is not itself a pending draw.
    if(a.type==="card"&&c?.type==="support"&&m?.supportStateKnown&&
        m.supports.every(s=>s.id!=="dunyarzad"||s.drawUsed===true))
      return {mode:"remove",hand:remaining};
    // A quick food has no opponent handoff or Cryo reaction. Once every
    // current Chef's one-time draw is used (or no Chef is present), it only
    // consumes its own card. Unknown support ownership cannot authorize this.
    if(a.type==="card"&&c?.type==="food"&&!c.combatAction&&m?.supportStateKnown&&
        m.supports.every(s=>s.id!=="chef"||s.drawUsed===true))
      return {mode:"remove",hand:remaining};
    // Either player can react with Cryo, the boiler can insert a dish, and
    // Heart/partners can draw. Full means read actual identities, not predict them.
    if(a.type==="skill"||a.type==="switch"||a.type==="end")return full();
    if(a.type==="card"&&(["draw","support","talent","food","team-food","combat","summon","summon-discard"].includes(c?.type)))
      return full(["draw","support","talent","food","team-food","combat"].includes(c.type));
    if(a.type==="card"||a.type==="tune"){
      return {mode:"remove",hand:indexedHand(h.filter((_,i)=>i!==a.index))};
    }
    return {mode:"full"};
  }
  function verify(a,b,c,transition=false){
    if(!a||!b||!c)return false;if(c.result)return true;
    if(a.type==="end")return c.turn==="enemy"||["roll","settlement"].includes(c.phase);
    if(a.type==="switch")return c.active===a.target&&b.active!==a.target;
    if(a.type==="skill")return transition||c.turn==="enemy"||!!c.dice&&(
      total(c.dice)<total(b.dice)||known(c.characters?.[a.who]?.energy)&&c.characters[a.who].energy!==b.characters[a.who].energy||
      Array.isArray(c.enemies)&&JSON.stringify(c.enemies.map(e=>e.hp))!==JSON.stringify(b.enemies.map(e=>e.hp)));
    if(a.type==="tune")return c.turn==="user"&&removedOne(b.hand,c.hand,a.id)&&total(c.dice)===total(b.dice)&&(c.dice[a.element]||0)===(b.dice[a.element]||0)+1;
    if(a.type!=="card"||!Array.isArray(c.hand))return false;
    if(a.id==="soup"&&!soupReceiptValid(a,b,c))return false;
    if(a.id==="blessingM"){
      const r=c.summonReceipt;
      if(r?.exited!==true||r.origin!==actionKey(a)+"/"+boardKey(b)||r.id!==a.id||r.index!==a.summonIndex||r.name!==a.summonName)return false;
    }
    return drawConsumptionProven(a,b,c)||cardCountDecreased(b.hand,c.hand,a.id);
  }
  function emptyHandEffect(a,b,c){
    if(handPlan(a,b,freshMemory()).mode!=="remove"||b.hand.length!==1||c.phase!=="board"||c.turn!=="user"||c.active!==b.active)return false;
    const p=c.handEvidence;
    return p?.kind==="native-empty-fan"&&p.stableReads>=2&&p.inputSent===true&&p.sourceCount===1&&
      p.id===a.id&&p.index===a.index&&p.target===(a.target??null)&&p.beforeKey===boardKey(b);
  }
  function keepOpening(id,hand=[],index=null){
    // One dice-fixing card in total; keep the leftmost, regardless of its name.
    if(index!==null&&["companion","toss"].includes(id))
      return hand.findIndex(h=>["companion","toss"].includes(h.id))===index;
    return ["teaParty","heart","gladiator","dunyarzad","chef","silver","pilgrimage","companion","toss"].includes(id);
  }
  function openingPlan(hand,original){
    if(hand?.length!==5||!hand.every(handCardKnown)||original?.length!==5)throw Error("起手五张手牌未核实");
    const replace=hand.map((h,i)=>h.supported?!keepOpening(h.id,hand,i):original[i]);return {replace,keep:hand.filter((_,i)=>!replace[i]),duplicateWeapons:[]};
  }
  function rerollPlan(items,m){
    const who=m.used[0]===0&&!m.defeated[0]?0:m.lastActive===0&&!m.defeated[1]?1:
      m.defeated[m.lastActive]?m.defeated.findIndex(v=>!v):m.lastActive,
      primary=team[who].element,secondary=who===0&&!m.defeated[1]?"Pyro":null;
    let kept=0;return {primary,secondary,elements:[primary,secondary,"Omni"].filter(Boolean),
      indices:items.flatMap((x,i)=>x.element==="Omni"||x.element===primary||x.element===secondary&&kept++<3?[i]:[])};
  }
  root.TCG={team,cards,byId,soupOptions,shareCode,guide,norm,identify,observedCard,handCardKnown,indexedHand,reconcileHand,
    actionRefused,blockAction,skillQuote,skillProbeAttempted,recordSkillCost,clearSkillCosts,refreshSkillCosts,drawConsumptionProven,
    characterName,diceOrder,known,alive,total,size,payment,boardKey,actionKey,freshMemory,nextRound,OpeningFlow,
    legalState,freshActionBoard,switchCost,skillReduction,skillCost,skillLegal,cardCost,cardLegal,cardRefund,gamblerRemaining,
    enemyCount,elementReaction,damageAgainst,noteBoard,commit,rejectAction,deferUncertain,handPlan,verify,
    verifyResynchronized:(a,b,c,t)=>legalState(c)&&verify(a,b,c,t),emptyHandEffect,removalEffect:()=>false,soupReceiptValid,
    openingSetting:()=>"优先装备与启动牌",openingContext:()=>({}),keepOpening,openingPlan,rerollPlan,rerollCounter,
    drawPayment:(s,a,m)=>byId[a.id]?.type==="draw"?cardCost(a.id,a.target,m):null,
    refusalCost:(s,m,a)=>a.type==="skill"?skillCost(a.who,a.skill,m,s):a.type==="card"?cardCost(a.id,a.target,m):a.type==="switch"?switchCost(m):{}};
})(globalThis);

globalThis.TCG.version = "1.9.7";
globalThis.TCG.sharedVersion = "1.9.7";
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

;
// @module strategy
/* GPL-3.0. Guide opening with resource-aware, one-action replanning. */
(function(T){
  "use strict";
  const copy=x=>JSON.parse(JSON.stringify(x));
  const activeEnemy=s=>s.enemies?.find(e=>e.active&&T.alive(e));
  function damageEstimate(s,m,who,skill){
    const target=activeEnemy(s),element=skill==="NA"&&who!==2?"Physical":T.team[who].element,
      base=who===0?(skill==="NA"?2:1):who===1?(skill==="NA"||skill==="CA"?2:skill==="E"?3+(T.known(m.props)?m.props:0):3):skill==="NA"?1:skill==="E"?2:4,
      reaction=T.elementReaction(element,target?.auraKnown?target.aura:[]),
      bonus=(m.nextDamage[who]||0)+(m.gildedDamage[who]||0)+(m.soupDamage[who]>0?1:0),
      shatter=target?.frozen===true&&["Physical","Pyro"].includes(element)?2:0,
      hit=T.damageAgainst(target,base+bonus+reaction.bonus+shatter,element);
    const summons=s.summonCountKnown?s.summons:[],possible=who===2&&["E","Q"].includes(skill)?summons:[],
      values=possible.map(x=>x.name==="厨艺机关·低温冷藏模式"||x.name==="怪笑猫猫帽"||x.name==="半幻人"?1:0),
      followup=skill==="Q"?values.reduce((n,v)=>n+v,0):values.length?values.reduce((n,v)=>n+v,0)/values.length:0,
      talent=who!==0&&["NA","CA"].includes(skill)&&m.talents[0]&&!m.talentColdUsed&&m.coldSummon>0?1:0;
    return {element,base,reaction,bonus,shatter,direct:target?hit.direct:0,guaranteed:target?hit.guaranteed:null,
      conditionalFollowup:followup+talent,randomSummon:who===2&&skill==="E",selfDamage:who===1&&skill==="CA"&&s.characters[1].hp>=6?1:who===2&&skill==="E"&&s.characters[2].hp>=2?1:0};
  }
  function skillValue(s,m,a){
    const e=damageEstimate(s,m,a.who,a.skill),target=activeEnemy(s);if(!target)return -Infinity;
    let value=Math.min(target.hp,e.direct)+e.conditionalFollowup*.6-e.selfDamage*.25;
    if(e.guaranteed!==null&&e.guaranteed>=target.hp)value+=4;
    if(a.who===0&&a.skill==="E")value+=m.coldSummon===0?2.2:.2;
    if(a.who===1&&["CA","Q"].includes(a.skill))value+=(T.known(m.catSummon)&&m.catSummon<2?1:0)+(T.known(m.props)&&m.props<3?.4:0);
    if(a.who===1&&a.skill==="E"&&T.known(m.props))value+=Math.min(m.props,Math.max(0,10+m.extraMaxHp[1]-s.characters[1].hp))*.6;
    if(a.who===0&&a.skill==="Q")value+=s.characters.reduce((n,c,i)=>n+Math.min(2,Math.max(0,T.team[i].maxHp+m.extraMaxHp[i]-c.hp))*.55,0);
    if(a.skill==="Q")value-=.15;
    return value-.05;
  }
  function cardValue(s,m,a){
    const id=a.id,c=T.byId[id],ch=s.characters[a.target??s.active];
    if(c.type==="artifact"){
      if(m.artifactKinds[a.target]===id)return -Infinity;
      // Gladiator's discount earns priority with an actually funded followup,
      // not a fixed bonus for putting it on an off-field Lyney near the finish.
      return id==="heart"?(a.target===s.active?1.25:.1):id==="gladiator"?.1:
        a.target===s.active&&T.enemyCount(s)>1&&s.enemies.some(e=>T.alive(e)&&e.hp<=5)?1.3:.05;
    }
    if(id==="teaParty")return skillValue(s,m,{who:0,skill:"E"})+(m.talents[0]?-.8:1.5);
    if(id==="pilgrimage")return m.round<=2?.8:.05;
    if(c.type==="support")return m.round<=2?(id==="dunyarzad"&&s.hand.some(h=>T.byId[h.id]?.type==="support"&&h.index!==a.index)?1.2:.7):.1;
    if(id==="boar")return s.hand.filter(h=>T.byId[h.id]?.type==="artifact").length&&m.artifactKinds.some(Boolean)?.7:-Infinity;
    if(id==="draw")return s.hand.length<=3?.7:.1;
    if(id==="companion")return Object.entries(s.dice).some(([e,n])=>n>0&&e!=="Omni"&&e!==T.team[s.active].element)?.5:-Infinity;
    if(id==="toss")return T.total(s.dice)>=3&&(s.dice[T.team[s.active].element]||0)+(s.dice.Omni||0)<3?.4:-Infinity;
    if(id==="soup"){
      const healing=Math.max(0,10+m.extraMaxHp[a.target]-ch.hp),remaining=T.total(s.dice)-T.size(T.cardCost(id,a.target,m));
      return healing>0?healing*.2:a.target===s.active&&remaining>=1?1.2:-Infinity;
    }
    if(id==="autumnFrost")return .7+Math.min(1,Math.max(0,10+m.extraMaxHp[a.target]-ch.hp))*.8+(a.target===s.active?.1:0);
    // Attack preparations receive a value only together with a payable
    // followup below, never merely because the dice total looks sufficient.
    if(["gildedHall","wavekissedSands","verdantGift"].includes(id))return -Infinity;
    if(id==="dragon")return s.summonCountKnown&&s.summonCount<3?1.3:-Infinity;
    if(id==="blessingM")return a.summonName==="半幻人"?1.8:-Infinity;
    if(id==="surf")return s.summonCountKnown&&s.summonCount>s.enemySummonCount?1:-Infinity;
    return -Infinity;
  }
  function candidates(s,m){
    const out=[];
    for(const skill of Object.keys(T.team[s.active].skills)){
      const a={type:"skill",who:s.active,skill};if(T.skillLegal(s,a,m)&&!T.actionRefused(s,m,a))out.push({...a,value:skillValue(s,m,a)});
    }
    for(const h of s.hand){
      const c=T.byId[h.id];if(!c)continue;
      const targets=["artifact","food","talent"].includes(c.type)?s.characters.flatMap((ch,i)=>T.alive(ch)?[i]:[]):[null];
      for(const target of targets){
        const variants=c.type==="summon-discard"?(s.summons||[]).filter(x=>x.name==="半幻人").map(x=>({summonIndex:x.index,summonName:x.name})): [{}];
        for(const extra of variants){const a={type:"card",id:h.id,index:h.index,target,...extra};
          if(T.cardLegal(s,a,m)&&!T.actionRefused(s,m,a))out.push({...a,value:cardValue(s,m,a)});
        }
      }
    }
    return out;
  }
  function standingRisk(s,who){
    const hp=s.characters[who].hp;
    if(hp>3)return 0;
    const healthier=Math.max(hp,...s.characters.filter((ch,i)=>i!==who&&T.alive(ch)&&ch.frozen===false).map(ch=>ch.hp));
    // A preference between executable routes, not a prediction of the next
    // enemy hit. Without a payable relay this cannot suppress a legal attack.
    return healthier>=hp+3?Math.min(8,healthier-hp)*.35:0;
  }
  function carryPlan(s,m){
    let best={who:s.active,value:-Infinity};
    for(let who=0;who<3;who++){
      if(!T.alive(s.characters[who])||s.characters[who].frozen)continue;
      if(who!==s.active&&T.actionRefused(s,m,{type:"switch",target:who}))continue;
      const p=T.payment(s.dice,who===s.active?{}:T.switchCost(m),T.team[who].element);if(!p)continue;
      const next={...s,active:who,dice:p.remaining};
      const direct=candidates(next,m),plans=direct.filter(attack).concat(attackPreparations(next,m,direct),fundedAttacks(next,m)),
        score=Math.max(-Infinity,...plans.map(a=>a.value))-(who===s.active?0:1.2)-standingRisk(s,who);
      if(score>best.value)best={who,value:score};
    }
    return best;
  }
  function carry(s,m){return carryPlan(s,m).who;}
  const attack=a=>a.type==="skill"||a.type==="card"&&a.id==="teaParty";
  const cast=a=>a.type==="skill"?a:T.byId[a.id].combatSkill;
  const attackValue=(s,m,a)=>a.type==="skill"?skillValue(s,m,a):cardValue(s,m,a);
  function attackGoals(s){
    return Object.keys(T.team[s.active].skills).map(skill=>({type:"skill",who:s.active,skill})).concat(
      s.active===0?s.hand.filter(h=>h.id==="teaParty").map(h=>({type:"card",id:h.id,index:h.index,target:0})):[]);
  }
  function goalAt(a,s){
    if(a.type!=="card")return a;
    // Projections preserve source indices separately; no projected index can
    // escape as a native action. Only the first original action is returned.
    const index=s.hand.findIndex(h=>h.sourceIndex===a.index);
    return {...a,index};
  }
  function goalLegal(s,m,a){return a.type==="skill"?T.skillLegal(s,a,m):T.cardLegal(s,a,m);}
  function attackPreparations(s,m,list){
    const out=[],who=s.active;
    for(const prep of list.filter(a=>a.type==="card"&&(a.target===who||a.target==null)&&
      ["heart","gladiator","gildedHall","companion","wavekissedSands","verdantGift"].includes(a.id))){
      const fee=T.cardCost(prep.id,prep.target,m),paid=T.payment(s.dice,fee,T.team[who].element);
      if(!paid||T.byId[prep.id].type==="artifact"&&m.artifactKinds[who])continue;
      if(prep.id==="companion"&&Object.entries(s.dice).reduce((n,[e,v])=>n+(e!==T.team[who].element&&e!=="Omni"?v:0),0)<2)continue;
      const next=copy(s),memory=copy(m);
      if(next.skillFees?.who===who)for(const [skill,fee]of Object.entries(next.skillFees.entries))
        fee.reduction=T.skillReduction(who,skill,m,s);
      next.dice={...paid.remaining};
      if(prep.id==="companion")next.dice.Omni=(next.dice.Omni||0)+2;
      next.hand=T.indexedHand(s.hand.filter(h=>h.index!==prep.index).map(h=>({...h,sourceIndex:h.index})));
      if(prep.id==="gildedHall")memory.gildedDamage[who]=2;
      else if(prep.id==="wavekissedSands"){for(let i=0;i<3;i++)if(T.alive(s.characters[i]))memory.foodDiscount[i]=1;}
      else if(prep.id==="verdantGift"){for(let i=0;i<3;i++)if(T.alive(s.characters[i]))memory.nextDamage[i]=1;}
      else if(T.byId[prep.id].type==="artifact")memory.artifactKinds[who]=prep.id;
      for(const original of attackGoals(s)){
        const goal=goalAt(original,next),skill=cast(original),estimate=damageEstimate(s,m,skill.who,skill.skill);
        if(T.actionRefused(s,m,original)||!goalLegal(next,memory,goal))continue;
        // A known immediate finish takes precedence over optional setup.
        if(goalLegal(s,m,original)&&estimate.guaranteed!==null&&estimate.guaranteed>=activeEnemy(s).hp)continue;
        const saving=original.type==="skill"?T.size(T.skillCost(who,skill.skill,m,s))-T.size(T.skillCost(who,skill.skill,memory,next)):0,
          draw=prep.id==="heart"&&estimate.selfDamage>0&&next.hand.length<10?.9:0;
        if(prep.id==="heart"&&!draw||prep.id==="gladiator"&&saving<=0)continue;
        const value=attackValue(next,memory,goal)+draw+Math.max(0,saving)*.4-.1-T.size(fee)*.15;
        if(!goalLegal(s,m,original)||value>attackValue(s,m,original))out.push({...prep,value,followup:original});
      }
    }
    return out;
  }
  function discardValue(s,m,h){
    const c=T.byId[h.id];if(!c)return 0;
    const duplicate=s.hand.filter(x=>x.id===h.id).length>1;
    if(h.id==="teaParty")return m.talents[0]||m.used[0]>0?.4:2;
    if(h.id==="heart"||h.id==="gladiator")return m.artifactKinds.every(Boolean)||duplicate?.5:1.5;
    if(c.type==="support")return m.round<=2&&!duplicate?1.1:.4;
    if(h.id==="dragon"||h.id==="surf")return s.summonCountKnown&&s.summonCount>=2?.9:.2;
    if(c.type==="food"||c.type==="team-food")return .8;
    return .5;
  }
  function fundedAttacks(s,m){
    const out=[],element=T.team[s.active].element;
    for(const goal of attackGoals(s)){
      if(goalLegal(s,m,goal)||T.actionRefused(s,m,goal))continue;
      if(goal.type==="card"&&(m.used[0]>0||m.talents[0]))continue;
      const next=copy(s),removed=new Set(),discards=s.hand.filter(h=>h.canTune!==false&&
        !h.attachments?.noTuning&&T.byId[h.id]?.type!=="legend"&&!(goal.type==="card"&&h.index===goal.index))
        .sort((a,b)=>discardValue(s,m,a)-discardValue(s,m,b)||a.index-b.index);
      let first=null,loss=0,steps=0;
      for(const h of discards){
        const a={type:"tune",id:h.id,index:h.index,element};
        if(!first&&T.actionRefused(s,m,a))continue;
        const bad=T.diceOrder.find(e=>e!==element&&e!=="Omni"&&next.dice[e]>0);
        if(!bad||steps>=3)break;
        next.dice[bad]--;next.dice[element]=(next.dice[element]||0)+1;
        removed.add(h.index);next.hand=T.indexedHand(s.hand.filter(h=>!removed.has(h.index)).map(h=>({...h,sourceIndex:h.index})));
        first||=a;loss+=discardValue(s,m,h);steps++;
        const ready=goalAt(goal,next);
        if(goalLegal(next,m,ready)){
          out.push({...first,value:attackValue(next,m,ready)-.2*steps-.15*loss,followup:goal});break;
        }
      }
    }
    return out;
  }
  function choose(s,m){
    if(!T.legalState(s))return {type:"stop",reason:"牌桌资源、角色或手牌尚未完整识别"};
    const direct=candidates(s,m),finish=direct.find(a=>{
      if(!attack(a))return false;
      const c=cast(a),e=damageEstimate(s,m,c.who,c.skill);
      // Prefer a payable direct finish over preparing future summons. Unknown
      // defense is not a guaranteed kill, but it must not award extra setup
      // for the last target when our own damage estimate already covers it.
      return e.guaranteed!==null&&e.guaranteed>=activeEnemy(s)?.hp||
        T.enemyCount(s)===1&&e.direct>=activeEnemy(s)?.hp;
    });
    if(finish)return finish;
    const list=direct.concat(attackPreparations(s,m,direct),fundedAttacks(s,m)).sort((a,b)=>b.value-a.value),actor=s.active;
    let best=list[0];
    // Optional development must not spend the last payable attack. Compare
    // the existing funded route with a known one-card payment/refund only;
    // random draws and prospective Gambler kills are not spendable dice.
    if(best?.type==="card"&&!best.followup&&["artifact","support","draw"].includes(T.byId[best.id].type)){
      const fee=T.cardCost(best.id,best.target,m),paid=T.payment(s.dice,fee,T.team[actor].element),
        output=list.find(a=>a.value>0&&attack(a.followup||a));
      if(T.size(fee)>0&&paid&&output){
        const next={...s,hand:T.indexedHand(s.hand.filter(h=>h.index!==best.index))},memory=copy(m),
          remaining=T.total(paid.remaining)+T.total(T.cardRefund(best,m,s));
        if(T.byId[best.id].type==="artifact"){
          memory.artifactKinds[best.target]=best.id;
        }
        const canStillFund=attackGoals(next).some(goal=>{
          if(T.actionRefused(s,m,goal))return false;
          const c=cast(goal);
          if(s.characters[c.who].frozen||c.skill==="Q"&&s.characters[c.who].energy<T.team[c.who].maxEnergy)return false;
          const cost=goal.type==="skill"?T.skillCost(c.who,c.skill,memory,next):T.cardCost(goal.id,goal.target,memory);
          return remaining>=T.size(cost);
        });
        if(!canStillFund)best=output;
      }
    }
    // Use the opening the guide describes only while it can still be paid.
    if(actor===0&&m.used[0]===0){
      const setup=list.find(a=>{const goal=a.followup||a;return goal.type==="card"&&goal.id==="teaParty"||goal.type==="skill"&&goal.skill==="E";});
      if(setup)return setup;
    }
    // The guide's startup is E -> Lyney charged arrow, not repeated physical
    // attacks while the cold summon ticks away. A one-hit ranking charges the
    // switch now but misses the arrow's setup for the next round. Apply this
    // opening preference only to a currently funded CA route; no future dice,
    // reaction, damage or successful switch is booked in observed state.
    if(actor===0&&m.round>=1&&m.round<=2&&m.used[0]>0&&m.used[1]===0&&m.coldSummon>0&&
        T.alive(s.characters[1])&&s.characters[1].frozen===false&&standingRisk(s,1)===0&&
        !T.actionRefused(s,m,{type:"switch",target:1})){
      const paid=T.payment(s.dice,T.switchCost(m),"Pyro");
      if(paid){
        const relay={...s,active:1,dice:paid.remaining},available=candidates(relay,m),
          plans=available.concat(attackPreparations(relay,m,available),fundedAttacks(relay,m));
        if(plans.some(a=>{const goal=a.followup||a;return a.value>0&&goal.type==="skill"&&goal.skill==="CA";}))
          return {type:"switch",target:1};
      }
    }
    const next=carryPlan(s,m);
    if(next.who!==actor&&(!best||best.value-standingRisk(s,actor)<next.value))return {type:"switch",target:next.who};
    if(best&&best.value>0)return best;
    return {type:"end",reason:"当前资源没有可兑现的行动"};
  }
  function soupChoice(options,s,target,m=T.freshMemory()){
    const ch=s.characters[target],missing=Math.max(0,10+m.extraMaxHp[target]-ch.hp),
      rank={healing:Math.min(2,missing)*.8,discount:target===s.active&&T.total(s.dice)>=1?1.9:.2,
        fury:target===s.active&&T.total(s.dice)>=3?1.6:.1,shield:ch.hp<=5?1.2:.2,soothing:ch.hp<=5?1.4:.3,maxhp:.5};
    return options.slice().sort((a,b)=>(rank[b.effect]??-1)-(rank[a.effect]??-1))[0]||null;
  }
  function replacement(s,m){
    if(!Array.isArray(s.characters)||s.characters.length!==3||
      s.characters.some(ch=>ch?.dead!==true&&!T.alive(ch)))return null;
    const choices=s.characters.flatMap((ch,who)=>{
      if(!T.alive(ch)||typeof ch.frozen!=="boolean")return [];
      const next={...s,active:who},skills=Object.keys(T.team[who].skills)
        .filter(skill=>!ch.frozen&&s.diceKnown&&T.skillLegal(next,{who,skill},m));
      const output=Math.max(0,...skills.map(skill=>skillValue(next,m,{who,skill})));
      return [{who,value:output+ch.hp*.12-(ch.frozen?2:0)}];
    });
    return choices.sort((a,b)=>b.value-a.value)[0]||null;
  }
  function actionRerollGoal(s,m){
    const who=carry(s,m);
    return {element:T.team[T.alive(s.characters[who])?who:s.active].element};
  }
  T.damageEstimate=damageEstimate;T.candidates=candidates;T.carry=carry;T.soupChoice=soupChoice;T.choose=choose;
  T.replacement=replacement;T.actionRerollGoal=actionRerollGoal;
})(globalThis.TCG);

globalThis.TCG.registerStrategy("default", globalThis.TCG.choose);

globalThis.TCG.selectStrategy(globalThis.TCG.defaultStrategy);

;
// @module bgi
// Generated from 牌手共享. Edit layered source, not this standalone output.
// Common host assembled from the maintained fragments. Deck rules are overrides.
(function (root) {
  "use strict";
  const elements = ["Pyro", "Hydro", "Anemo", "Electro", "Dendro", "Cryo", "Geo", "Omni"];
  const handX = {
    1: [1120],
    2: [1019, 1222],
    3: [914, 1117, 1322],
    4: [812, 1013, 1216, 1424],
    5: [719, 913, 1115, 1319, 1528],
    6: [614, 811, 1012, 1216, 1423, 1625],
    7: [635, 799, 961, 1117, 1279, 1438, 1603],
    8: [605, 751, 893, 1042, 1177, 1325, 1471, 1618],
    9: [587, 716, 847, 976, 1103, 1225, 1352, 1492, 1634],
    10: [570, 690, 810, 930, 1050, 1170, 1290, 1410, 1530, 1650],
  };
  const charX = [750, 960, 1175];
  function costMarkerLayout(rects, measuredCount = null, transform = null) {
    if (transform && (transform.scale !== 1 || transform.dx || transform.dy)) {
      const {scale,dx,dy}=transform;
      const layout=costMarkerLayout(rects.map(r=>({x:(r.x-dx)/scale,y:(r.y-dy)/scale,w:r.w/scale,h:r.h/scale})),measuredCount);
      return layout && {...layout, points:layout.points.map(x=>x*scale+dx),
        markers:layout.markers.map(m=>({x:m.x*scale+dx,y:m.y*scale+dy}))};
    }
    if (
      !rects.length ||
      rects.some(
        (r) =>
          ![r.x, r.y, r.w, r.h].every(Number.isFinite) ||
          r.w !== 10 ||
          r.h !== 30 ||
          r.x < 450 ||
          r.x > 1750 ||
          r.y < 750 ||
          r.y > 920,
      )
    )
      return null;
    const groups = [];
    for (const r of rects.slice().sort((a, b) => a.x - b.x || a.y - b.y)) {
      const near = groups.find((g) => Math.abs(r.x - g[0].x) <= 14 && Math.abs(r.y - g[0].y) <= 10);
      if (near) near.push(r);
      else groups.push([r]);
    }
    // FindMulti has no confidence scalar. Deterministic rectangle-group means
    // keep this identical to saved-pixel validation, without invented scores.
    const marks = groups.map((g) => ({
        x: g.reduce((s, m) => s + m.x, 0) / g.length,
        y: g.reduce((s, m) => s + m.y, 0) / g.length,
      })),
      layouts = new Map();
    // Optional count is a current-frame native rim measurement, never a
    // projected/cache count. It binds the whole fan before artwork is filtered.
    if (measuredCount !== null && (!Number.isInteger(measuredCount) || !handX[measuredCount]))
      return null;
    for (const seed of marks) {
      const band = marks.filter((m) => Math.abs(m.y - seed.y) <= 35).sort((a, b) => a.x - b.x);
      // Crowded 5–10-card rows have a calibrated grid even when the badge/rim
      // is hidden. Interior artwork peaks do not add cards. Low-count fans
      // retain their native rim binding and the original whole-row route.
      const counts=measuredCount!==null?[measuredCount]:[...new Set([band.length,5,6,7,8,9,10])];
      for(const candidateCount of counts){
      if(!handX[candidateCount])continue;
      let row = band;
      if (measuredCount !== null || candidateCount>=5) {
        row = handX[candidateCount].map((x) => {
          const choices = band.filter((m) => Math.abs(m.x + 103 - x) <= 32)
            .sort((a, b) => Math.abs(a.x + 103 - x) - Math.abs(b.x + 103 - x));
          // No invented confidence: equal geometric fits remain ambiguous.
          return choices.length && (choices.length === 1 ||
            Math.abs(choices[0].x + 103 - x) < Math.abs(choices[1].x + 103 - x))
            ? choices[0] : null;
        });
        if (row.some((m) => !m) || new Set(row).size !== candidateCount) continue;
      }
      const n = row.length;
      if (
        !handX[n] ||
        row.some((m, i) => Math.abs(m.x + 103 - handX[n][i]) > 32) ||
        row.some((m, i) => i > 0 && m.x - row[i - 1].x < 75) ||
        Math.max(...row.map((m) => m.y)) - Math.min(...row.map((m) => m.y)) > 35 ||
        // An inner artwork subrow cannot conceal outer markers above it.
        // A same-frame measured count bounds the final card by its native rim,
        // not by its left cost corner: artwork inside that card is not a new slot.
        // Without independent count keep the stricter outer-marker conflict.
        marks.some((m) => m.y <= Math.max(...row.map((r) => r.y)) &&
          (m.x < row[0].x - 32 || m.x > (measuredCount === null
            ? row[n - 1].x + 32 : handX[n][n - 1] + 95)))
      )
        continue;
      layouts.set(JSON.stringify(row.map((m) => [m.x, m.y])), {
        count: n,
        measuredCount,
        markers: row.map((m) => ({ x: m.x, y: m.y })),
        points: row.map((m) => m.x + 103),
      });
      }
    }
    return layouts.size === 1 ? [...layouts.values()][0] : null;
  }
  function costDigitRows(rows) {
    // Repeated zeroes are separate rectangles. Never deduplicate by text,
    // normalize O/D to 0/1, or interpret any cost value as a card identity.
    return rows
      .filter(
        (r) =>
          /^\d{1,2}$/.test(r.text) &&
          [r.x, r.y, r.w, r.h].every(Number.isFinite) &&
          r.w > 0 &&
          r.h > 0,
      )
      .map((r) => ({ value: Number(r.text), x: r.x + r.w / 2, y: r.y + r.h / 2 }));
  }
  function costNumbersAt(marker, numbers) {
    return numbers.filter(
      (r) => Math.abs(r.x - marker.x - 28) <= 16 && Math.abs(r.y - marker.y - 15) <= 18,
    );
  }
  function costHandSample(layout, numbers) {
    if (!layout) return null;
    const assigned = layout.markers.map((m) => costNumbersAt(m, numbers));
    // Without an independent count, an extra number can be the missing outer
    // card of a shorter apparent row. Preserve that real layout conflict.
    if(layout.measuredCount===null&&numbers.some(n=>!assigned.some(a=>a.includes(n))&&
      (n.x<layout.markers[0].x+12||n.x>layout.markers.at(-1).x+44)))return null;
    // Geometry is already bound to native evidence. One missing/ambiguous digit
    // invalidates that slot's price, not the row, positions or other prices.
    const costs = assigned.map(a => a.length === 1 &&
      assigned.filter(other => other.includes(a[0])).length === 1 ? a[0].value : null);
    return {
      count: layout.count,
      points: layout.points.slice(),
      markerYs: layout.markers.map((m) => m.y),
      costs,
    };
  }
  function handLayoutCount(edges) {
    // Entire low-count layout, not a matching subset of a larger hand. Extra
    // interior rim matches are harmless; any edge outside the fan rejects it.
    const candidates = [];
    for (let n = 1; n <= 4; n++) {
      const xs = handX[n];
      if (
        edges.length &&
        edges.every((x) => x >= xs[0] - 120 && x <= xs[n - 1] + 130) &&
        xs.every((c) => edges.some((x) => Math.abs(x - c - 95) <= 32))
      )
        candidates.push(n);
    }
    return candidates.length === 1 ? candidates[0] : null;
  }
  const enemyHpXs = { 1: [856], 2: [751, 962], 3: [646, 856, 1066], 4: [541, 751, 961, 1171] };
  // This asset is the tooltip ABOVE the control, not its clickable area.
  // Use it only as a scene marker. First-pick confirmation uses the official
  // character-card path, not the separate tooltip/control geometry.
  const pickLabelROI = [1730, 820, 190, 100];
  const number = (text) =>
    /^\d{1,2}$/.test(String(text).trim()) ? Number(String(text).trim()) : null;
  function captureSize(f) {
    const width = Number(f.width ?? f.Width),
      height = Number(f.height ?? f.Height);
    return {
      width: Number.isInteger(width) && width > 0 ? width : null,
      height: Number.isInteger(height) && height > 0 ? height : null,
    };
  }
  function requireCaptureSize(size) {
    if (size.width !== 1920 || !(size.height === 1080 || size.height === 1200)) {
      throw captureGeometryError(
        "仅支持归一帧1920×1080或1920×1200；当前帧 " +
          (size.width ?? "未知") +
          "×" +
          (size.height ?? "未知") +
          "。请在开局前使用1920×1080、2560×1440或2560×1600客户区",
      );
    }
  }
  function captureGeometry(f, hostScale) {
    const frameSize = captureSize(f), owner = f.Prev;
    // CaptureContent creates Desktop -> GameCaptureRegion -> optional resize.
    // The raw 1080 frame's owner is Desktop, never the actual game region.
    const normalized = !!owner?.Prev, raw = normalized ? owner : f;
    if (!raw.Prev || raw.Prev.Prev) throw captureGeometryError("游戏捕获区域所有者链无效");
    const actualSize = captureSize(raw), scale = actualSize.width / 1920;
    if (!(scale > 0) || !Number.isFinite(hostScale) || Math.abs(scale - hostScale) > 1e-6 ||
        normalized !== (actualSize.width > 1920) || frameSize.width !== 1920 ||
        frameSize.height !== actualSize.height / scale) {
      throw captureGeometryError("实际客户区、归一帧与宿主缩放比例不一致，请重新启动捕获器及牌手");
    }
    requireCaptureSize(frameSize);
    const accepted = [[1920,1080],[2560,1440],[2560,1600]];
    if (!accepted.some(([w, h]) => actualSize.width === w && actualSize.height === h))
      throw captureGeometryError("仅支持1920×1080、2560×1440或2560×1600游戏客户区");
    return { actualSize, frameSize, hostScale, layoutKey: frameSize.height === 1200 ? "16:10" : "16:9" };
  }
function captureGeometryError(message) {
    const error = new Error(message);
    error.code = "TCG_CAPTURE_GEOMETRY";
    return error;
  }
  // Explicit semantic panels. 16:9 remains identity; 16:10 uses native
// manual-layout measurements, not y-range anchor guesses.
const panelLayouts = {
    "16:9": Object.fromEntries(["phase", "board", "details", "choice", "opening",
      "handFolded", "handExpanded", "viewport", "header", "bottom", "mainDice", "rollDice"]
      .map(name => [name, { scale: 1, dx: 0, dy: 0 }])),
    "16:10": {
      phase: {scale:1,dx:0,dy:60}, board: {scale:1,dx:0,dy:60},
      details: {scale:1,dx:0,dy:0}, choice: {scale:1,dx:0,dy:60},
      header: {scale:1,dx:0,dy:24}, bottom: {scale:1,dx:0,dy:120},
      mainDice: {scale:1,dx:0,dy:0}, rollDice: {scale:10/9,dx:-960/9,dy:0},
      opening: {scale:.965,dx:33.6,dy:78.5},
      handFolded: {scale:1,dx:0,dy:55}, handExpanded: {scale:1,dx:0,dy:55},
      viewport: {scale:1,dx:0,dy:0,extraHeight:120},
    },
  };
function panelRegion(layoutKey, panel, rect, observed = false) {
    const transform = panelLayouts[layoutKey]?.[panel];
    if (!transform || !Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite) ||
        rect[2] <= 0 || rect[3] <= 0) throw captureGeometryError("布局或识别区域无效：" + panel);
    const { scale, dx, dy } = transform;
    return { rect: observed ? rect.slice() : [rect[0] * scale + dx, rect[1] * scale + dy,
      rect[2] * scale, rect[3] * scale + (transform.extraHeight || 0)], scale, layoutKey, panel };
  }
  function mousePoint(x, y, size = { width: 1920, height: 1080 }) {
    // ClearScript binds Click/MoveMouseTo to Action<int,int>. Odd-sized template
    // and OCR rectangles have half-pixel centers; do not pass them to the host.
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= size.width || y >= size.height) {
      throw captureGeometryError("鼠标坐标无效或超出当前归一帧：(" + x + "," + y + ")");
    }
    const point = [Math.round(x), Math.round(y)];
    if (point[0] >= size.width || point[1] >= size.height) throw captureGeometryError("鼠标坐标取整后超出当前归一帧");
    return point;
  }
  function boardDifferences(before, after, details = false) {
    const fields={active:s=>s.active,dice:s=>TCG.diceOrder.map(e=>s.dice?.[e]||0),
      own:s=>s.characters,enemy:s=>s.enemies,quicken:s=>s.quicken||null,support:s=>s.supportCounts||null,
      eye:s=>s.eye||null,dendroCore:s=>s.dendroCore||null,summons:s=>s.summonLayout||null};
    const changed=Object.entries(fields).filter(([,read])=>JSON.stringify(read(before))!==JSON.stringify(read(after)));
    return details ? Object.fromEntries(changed.map(([name,read])=>[name,{before:read(before),after:read(after)}])) : changed.map(([name])=>name);
  }
  class BetterGIHost {
    constructor(options) {
      this.options = options;
      this.templates = new Map();
      this.roCache = new Map();
      // Ten reusable slots: LimitedFile can overwrite, but has no delete API.
      // Select a slot lazily on the first event, not merely on construction.
      this.path = "logs/run-slot-01.log";
      this.logAppend = null;
      this.emptyHandProven = false;
      this.expectedDice = null;
      this.gamblerBudget = null;
      this.hpReadKeys = new Map();
      this.diceReadKeys = new Map();
      this.handFanReady = false;
      this.handNeedsReset = false;
      this.handCountHint = null;
      this.handCache = null;
      this.handContinuation = null;
      this.handScanSerial = 0;
      this.precisionBoard = false;
      this.forcedPickSession = null;
      this.boardReady = false;
      this.choiceSession = null;
      this.pendingChoiceCard = null;
      this.lastObservedState = null;
      this.tossSession = null;
      this.diagnosticKeys = new Set();
      this.frameMemo = null;
      this.captureGeometry = null;
      this.captureGeometryError = null;
      this.metrics = {frames:0,captureMs:0,frameWorkMs:0,ocrCalls:0,ocrMs:0,memoHits:0,geometryChecks:0,geometryMs:0};
      this.runStage = "entry";
      this.runDiagnostics = { startedAt: Date.now(), phase: null,
        timing: { observationMs: 0, planningMs: 0, inputMs: 0, settlementMs: 0, postActionMs: 0 },
        counts: { planned: 0, submitted: 0, confirmed: 0 }, lastAction: null,
        missing: { board: null, hand: null }, lastMissing: null };
      this.inputRevision = 0;
      this.lastCostSample = null;
      this.handPositionProof = null;
      this.lastObservedAt = 0;
      this.lastObservedRevision = -1;
      this.consumptionReceipt = null;
      this.pendingHandEvidence = null;
      file.createDirectory("logs");
    }
    requireMatchTime() {
      if (Date.now() >= (this.matchDeadline ?? Infinity)) {
        const error = new Error("达到单局时间上限，不再开始观察或发送输入");
        error.code = "TCG_MATCH_TIMEOUT";
        throw error;
      }
    }
    clickAt(x, y) {
      const point = this.moveTo(x, y);
      this.requireMatchTime();
      this.boardReady = false;
      leftButtonClick();
      this.inputRevision++;
      this.handPositionProof = null;
      return point;
    }
    moveTo(x, y) {
      const point = mousePoint(x, y, this.captureGeometry?.frameSize);
      this.requireMatchTime();
      // Recheck actual geometry even if the last OCR frame has the same size.
      // This also guards each interpolation step of a held drag, without OCR.
      this.checkInputGeometry();
      this.requireMatchTime();
      GameCaptureRegion.GameRegion1080PPosMove(point[0], point[1]);
      return point;
    }
    trace(event, data) {
      const now = Date.now();
      this.recordRunDiagnostic(event, data, now);
      if (["result", "stop", "terminal-entry"].includes(event)) {
        const summary = this.runSummary(event, data, now);
        data = { ...data, summary };
        this.reportRunSummary(summary);
      }
      const text = JSON.stringify({ at: new Date().toISOString(), event, data });
      if (this.logAppend === null) {
        const indexPath = "logs/tcg-log-index.json";
        let next = 0;
        if (file.isExists(indexPath)) {
          try {
            const index = JSON.parse(file.readTextSync(indexPath));
            if (Number.isInteger(index?.next) && index.next >= 0 && index.next < 10) next = index.next;
            else log.warn("日志轮转索引无效，从第一个日志槽继续。");
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
            log.warn("日志轮转索引损坏，从第一个日志槽继续。");
          }
        }
        this.path = "logs/run-slot-" + String(next + 1).padStart(2, "0") + ".log";
        if (!file.writeTextSync(indexPath, JSON.stringify({ next: (next + 1) % 10 }), false))
          throw new Error("无法写入日志轮转索引：" + indexPath);
        this.logAppend = false;
      }
      if (!file.writeTextSync(this.path, text + "\n", this.logAppend))
        throw new Error("无法写入对局日志：" + this.path);
      this.logAppend = true;
    }
    recordRunDiagnostic(event, data, now) {
      const d = this.runDiagnostics;
      if (event === "start") d.startedAt = now;
      if (event === "observation-timing") d.timing.observationMs += data.ms;
      if (event === "action-timing") {
        for (const key of ["planningMs", "inputMs", "settlementMs", "postActionMs"])
          d.timing[key] += data[key] || 0;
        // A recovered execute() can return sent:false after native confirmation.
        // Never overwrite that evidence, or infer submission from execute.sent.
        if (d.lastAction?.key === data.action && d.lastAction.status === "planned")
          d.lastAction.status = data.outcome === "failed" ? "failed-before-submission" : data.outcome;
      }
      if (event === "decision") {
        d.counts.planned++;
        d.lastAction = { key: TCG.actionKey(data), status: "planned", at: now };
      }
      const status = { "input-submitted": "pending", confirmed: "confirmed",
        "action-uncertain": "unconfirmed", "native-input-rejected": "rejected",
        "tuning-retry-alternative": "rejected" }[event];
      if (status && data.action) {
        d.lastAction = { key: TCG.actionKey(data.action), status, at: now };
        if (event === "input-submitted") d.counts.submitted++;
        if (event === "confirmed") d.counts.confirmed++;
      }
      const gap = (kind, fields) => {
        const previous = d.missing[kind];
        if (!fields.length) {
          if (previous) d.lastMissing = { ...previous, resolved: true, resolvedAt: now };
          d.missing[kind] = null;
        } else {
          const same = previous && JSON.stringify(previous.fields) === JSON.stringify(fields);
          d.missing[kind] = { fields: [...fields], firstAt: same ? previous.firstAt : now, lastAt: now, resolved: false };
          d.lastMissing = d.missing[kind];
        }
      };
      if (Array.isArray(data?.missing)) {
        if (data.missing.length || event === "board-settle-wait") gap("board", data.missing);
      } else if (data?.code === "TCG_DICE_RETRY") gap("board", ["dice"]);
      if (["hand-count-unresolved", "hand-read-deferred"].includes(event) ||
          ["TCG_HAND_RETRY", "TCG_HAND_UNRESOLVED"].includes(data?.code))
        gap("hand", [event === "hand-count-unresolved" ? "hand.count" : "hand"]);
      if (event === "hand-read-completed" && Number.isInteger(data.count)) gap("hand", []);
      const state = event === "state" ? data.state :
        ["state-resynced", "confirmed"].includes(event) ? data.after : null;
      if (state?.phase === "board" && state.turn === "user" && TCG.legalState(state) && !this.observationIssues(state).length) {
        gap("board", []);
        if (Array.isArray(state.hand)) gap("hand", []);
      }
    }
    runSummary(event, data, now) {
      const d = this.runDiagnostics, elapsedMs = now - d.startedAt;
      const describe = gap => gap && { ...gap,
        spanMs: (gap.resolved ? gap.resolvedAt : now) - gap.firstAt,
        lastSeenAgoMs: now - gap.lastAt };
      return { outcome: event === "result" ? "completed" : event === "terminal-entry" ? "already-ended" : "stopped",
        result: data.result || null, reason: data.reason, code: data.code,
        stage: this.runStage, phase: d.phase && { ...d.phase, ageMs: now - d.phase.at }, elapsedMs,
        timing: { ...d.timing, otherMs: Math.max(0, elapsedMs - Object.values(d.timing).reduce((a,b) => a+b, 0)) },
        counts: { ...d.counts }, lastAction: d.lastAction && { ...d.lastAction },
        missing: Object.values(d.missing).filter(Boolean).map(describe), lastMissing: describe(d.lastMissing),
        recognition: this.metricSnapshot() };
    }
    reportRunSummary(s) {
      const seconds = ms => (ms / 1000).toFixed(1) + "秒";
      const stages = { entry: "启动", "phase-wait": "阶段等待", observation: "观察", planning: "决策",
        input: "输入及恢复", confirmation: "效果确认", "post-action": "确认后记账",
        opening: "起手", pick: "选人", replacement: "阵亡换人", roll: "重投", choice: "挑选卡牌" };
      const statuses = { planned: "仅计划", pending: "已提交、待确认", confirmed: "已确认",
        unconfirmed: "未确认", rejected: "游戏拒绝", "not-submitted": "未完成提交", probed: "仅检视",
        "failed-before-submission": "未形成提交记录即失败" };
      const fieldName = field => {
        const match = /^own\[(\d)\]\.(energy|hp|status)$/.exec(field);
        return match ? (TCG.team[Number(match[1])]?.name || match[1]) +
          { energy: "充能", hp: "生命", status: "状态" }[match[2]] :
          ({ dice: "骰子", active: "出战角色", hand: "手牌", "hand.count": "手牌数量", phase: "页面阶段", turn: "行动方" }[field] || field);
      };
      const outcome = s.outcome === "completed" ? "正常结束（" + (s.result === "win" ? "胜利" : s.result === "lose" ? "失败" : "结果未知") + "）" :
        s.outcome === "already-ended" ? "启动时已在结束页，不计本轮结果" : "脚本停止";
      const missing = s.missing.length ? s.missing.map(g => g.fields.map(fieldName).join("、") +
        "（未解决记录跨度" + seconds(g.spanMs) + "，距末次缺读" + seconds(g.lastSeenAgoMs) + "）").join("；") : "无未解决的缺读记录";
      log.info("[对局摘要] " + outcome + "；处理阶段：" + (stages[s.stage] || s.stage) +
        "；总用时" + seconds(s.elapsedMs) + "，观察" + seconds(s.timing.observationMs) +
        "，输入/恢复" + seconds(s.timing.inputMs) + "，确认" + seconds(s.timing.settlementMs) +
        "（均含重试，非纯等待）" + "；计划/提交/确认：" + s.counts.planned + "/" + s.counts.submitted + "/" + s.counts.confirmed +
        "；最后动作：" + (s.lastAction ? s.lastAction.key + " " + (statuses[s.lastAction.status] || s.lastAction.status) : "无") +
        "；缺读：" + missing + (s.reason ? "；停止原因：" + s.reason : ""));
    }
    frame(fn) {
      this.requireMatchTime();
      const started = Date.now(),
        previousMemo = this.frameMemo;
      const f = captureGameRegion();
      const captured = Date.now();
      this.metrics.frames++;
      this.metrics.captureMs += captured - started;
      this.frameMemo = new WeakMap();
      try {
        this.adoptCapture(f);
        this.requireMatchTime();
        const result = fn(f);
        this.requireMatchTime();
        return result;
      } finally {
        this.metrics.frameWorkMs += Date.now() - captured;
        this.frameMemo = previousMemo;
        f.dispose();
      }
    }
    adoptCapture(f) {
      if (this.captureGeometryError) throw this.captureGeometryError;
      try {
        const geometry = captureGeometry(f, Number(genshin.scaleTo1080PRatio));
        if (this.captureGeometry && JSON.stringify(geometry) !== JSON.stringify(this.captureGeometry))
          throw captureGeometryError("本局客户区或归一帧尺寸已变化，请重新启动捕获器及牌手后开新局");
        this.captureGeometry = geometry;
        return geometry;
      } catch (error) {
        if (error.code !== "TCG_CAPTURE_GEOMETRY") throw error;
        this.captureGeometryError = error;
        this.boardReady = false;
        this.handPositionProof = null;
        this.preparedHandInput = null;
        throw error;
      }
    }
    checkInputGeometry() {
      this.requireMatchTime();
      if (this.captureGeometryError) throw this.captureGeometryError;
      const started = Date.now(), f = captureGameRegion();
      this.metrics.geometryChecks++;
      this.metrics.frames++;
      this.metrics.captureMs += Date.now() - started;
      try { this.adoptCapture(f); }
      finally { f.dispose(); this.metrics.geometryMs += Date.now() - started; }
      this.requireMatchTime();
    }
    memoFrame(f, key, read) {
      if (!this.frameMemo) return read();
      let cache = this.frameMemo.get(f);
      if (!cache) {
        cache = new Map();
        this.frameMemo.set(f, cache);
      }
      if (cache.has(key)) {
        this.metrics.memoHits++;
        return cache.get(key);
      }
      const value = read();
      cache.set(key, value);
      return value;
    }
    roi(panel, rect) {
      return panelRegion(this.captureGeometry?.layoutKey || "16:9", panel, rect);
    }
    observedRoi(panel, rect) {
      return panelRegion(this.captureGeometry?.layoutKey || "16:9", panel, rect, true);
    }
    panelTransform(panel) {
      const transform = panelLayouts[this.captureGeometry?.layoutKey || "16:9"]?.[panel];
      if (!transform) throw captureGeometryError("未知面板：" + panel);
      return transform;
    }
    point(panel, x, y) {
      const {scale,dx,dy} = this.panelTransform(panel);
      return mousePoint(x * scale + dx, y * scale + dy, this.captureGeometry?.frameSize);
    }
    referencePoint(panel, x, y) {
      const {scale,dx,dy} = this.panelTransform(panel);
      return [(x-dx)/scale,(y-dy)/scale];
    }
    checkedRoi(f, area) {
      const size = captureSize(f), layoutKey = this.captureGeometry?.layoutKey || "16:9";
      if (!area || Array.isArray(area) || !Array.isArray(area.rect) || area.rect.length !== 4 ||
          area.layoutKey !== layoutKey || area.scale !== panelLayouts[layoutKey]?.[area.panel]?.scale ||
          !area.rect.every(Number.isFinite)) throw captureGeometryError("识别区域缺少已接纳的布局/尺度契约");
      const rect = area.rect.map(Math.round), [x, y, w, h] = rect;
      const [rawX, rawY, rawW, rawH] = area.rect;
      if (rawX < 0 || rawY < 0 || rawW <= 0 || rawH <= 0 || rawX + rawW > size.width || rawY + rawH > size.height ||
          x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > size.width || y + h > size.height)
        throw captureGeometryError("必需识别区域越界：" + area.panel);
      return rect;
    }
    findOcr(f, roi, multiple, contextKey) {
      const key = "ocr/" + contextKey;
      if (!this.roCache.has(key)) this.roCache.set(key, RecognitionObject.Ocr(...roi));
      const started = Date.now();
      this.metrics.ocrCalls++;
      try {
        if (!multiple) {
          const r = f.Find(this.roCache.get(key));
          return r.isExist() ? String(r.text ?? r.Text ?? "").trim() : "";
        }
        const found = f.FindMulti(this.roCache.get(key)), rows = [];
        for (let i = 0; i < found.count; i++) {
          const r = found[i];
          rows.push({ text: String(r.text ?? r.Text ?? "").trim(), x: Number(r.x ?? r.X),
            y: Number(r.y ?? r.Y), w: Number(r.width ?? r.Width), h: Number(r.height ?? r.Height) });
        }
        return rows;
      } finally { this.metrics.ocrMs += Date.now() - started; }
    }
    localOcr(f, area, zoom, multiple) {
      const roi = this.checkedRoi(f, area);
      if (!Number.isFinite(zoom) || zoom <= 0) throw captureGeometryError("局部OCR倍率无效");
      const key = JSON.stringify(["localOcr", area, roi, zoom, multiple]);
      return this.memoFrame(f, key, () => {
        let crop = null, resized = null, region = null;
        const width = Math.round(roi[2] * zoom / area.scale), height = Math.round(roi[3] * zoom / area.scale);
        if (width <= 0 || height <= 0) throw captureGeometryError("局部OCR尺寸无效");
        try {
          crop = f.DeriveCrop(...roi);
          resized = crop.SrcMat.Resize(new OpenCvSharp.OpenCvSharp.Size(width, height));
          region = new ImageRegion(resized, 0, 0);
          const read = this.findOcr(region, [0, 0, width, height], multiple, key);
          if (!multiple) return read;
          // Round-trip through actual integer crop/output sizes, not a nominal
          // scale. Returned rectangles are already F; callers must not map again.
          const sx = roi[2] / width, sy = roi[3] / height;
          return read.map(r => ({ text: r.text, x: roi[0] + r.x * sx, y: roi[1] + r.y * sy,
            w: r.w * sx, h: r.h * sy }));
        } finally {
          if (region) region.dispose();
          else if (resized) resized.dispose();
          if (crop) crop.dispose();
        }
      });
    }
    artworkScore(f, area, filename, pad, rank) {
      const required=this.checkedRoi(f,area),size=captureSize(f);
      if(!Number.isFinite(pad)||pad<0)throw captureGeometryError("牌面搜索边距无效");
      const key=JSON.stringify(["artwork",area,filename,pad]);
      return this.memoFrame(f,key,()=>{
        if(!this.templates.has(filename)){
          const mat=this.readTemplateImage(filename);
          if(mat.empty()){mat.dispose();throw new Error("缺少牌面模板："+filename);}
          this.templates.set(filename,mat);
        }
        const margin=pad*area.scale,[x,y,w,h]=required,
          left=Math.max(0,Math.floor(x-margin)),top=Math.max(0,Math.floor(y-margin)),
          right=Math.min(size.width,Math.ceil(x+w+margin)),bottom=Math.min(size.height,Math.ceil(y+h+margin));
        let crop=null,normalized=null;
        try {
          crop=(f.srcMat??f.SrcMat).SubMat(top,bottom,left,right);
          if(area.scale!==1)normalized=crop.Resize(new OpenCvSharp.OpenCvSharp.Size(
            Math.round((right-left)/area.scale),Math.round((bottom-top)/area.scale)));
          return rank(normalized||crop,this.templates.get(filename));
        } finally { if(normalized)normalized.dispose();if(crop)crop.dispose(); }
      });
    }
    metricSnapshot() {
      return { ...this.metrics };
    }
    metricDelta(before) {
      return Object.fromEntries(
        Object.keys(this.metrics).map((k) => [k, this.metrics[k] - (before?.[k] || 0)]),
      );
    }
    async waitForCapture() {
      // Give an in-progress window transition a bounded chance to settle.
      // Bind both actual and normalized sizes; no OCR or input during settling.
      let stable = 0,
        last = null, lastError = null, lastKey = "";
      for (let attempt = 0; attempt < 20; attempt++) {
        this.requireMatchTime();
        if (this.captureGeometryError) throw this.captureGeometryError;
        const f = captureGameRegion(), frameSize = captureSize(f);
        try {
          last = captureGeometry(f, Number(genshin.scaleTo1080PRatio));
          lastError = null;
        } catch (error) {
          if (error.code !== "TCG_CAPTURE_GEOMETRY") throw error;
          lastError = error;
          last = null;
        } finally {
          f.dispose();
        }
        const key = JSON.stringify(last || { frameSize, error: lastError.message });
        stable = last ? key === lastKey ? stable + 1 : 1 : 0;
        if (key !== lastKey) {
          this.trace("capture-size", { ...last, error: lastError?.message, attempt });
          lastKey = key;
        }
        if (stable >= 2) {
          if (this.captureGeometry && JSON.stringify(last) !== JSON.stringify(this.captureGeometry))
            throw captureGeometryError("本局捕获尺寸已变化，不能重新绑定旧局");
          this.captureGeometry = last;
          this.trace("capture-ready", last);
          return;
        }
        if (attempt < 19) await sleep(300);
      }
      throw lastError || captureGeometryError("游戏客户区及归一帧尺寸未稳定");
    }
    ocr(f, area) {
      if (area.scale !== 1) return this.localOcr(f, area, 1, false);
      const roi = this.checkedRoi(f, area), key = JSON.stringify(["ocr", area, roi]);
      return this.memoFrame(f, key, () => this.findOcr(f, roi, false, key));
    }
    ocrRows(f, area) {
      if (area.scale !== 1) return this.localOcr(f, area, 1, true);
      const roi = this.checkedRoi(f, area), key = JSON.stringify(["ocrRows", area, roi]);
      return this.memoFrame(f, key, () => this.findOcr(f, roi, true, key));
    }
    
    
    matches(f, asset, area, threshold = 0.88, useColor = false) {
      const roi = this.checkedRoi(f, area);
      if (area.scale !== 1) {
        return this.memoFrame(f,JSON.stringify(["localMatch",asset,area,threshold,useColor]),()=>{
          let crop=null,resized=null,region=null;
          const width=Math.round(roi[2]/area.scale),height=Math.round(roi[3]/area.scale);
          try {
            crop=f.DeriveCrop(...roi);
            resized=crop.SrcMat.Resize(new OpenCvSharp.OpenCvSharp.Size(width,height));
            region=new ImageRegion(resized,0,0);
            const local={rect:[0,0,width,height],scale:1,layoutKey:area.layoutKey,panel:"details"};
            return this.matches(region,asset,local,threshold,useColor).map(r=>({
              x:roi[0]+r.x*roi[2]/width,y:roi[1]+r.y*roi[3]/height,
              w:r.w*roi[2]/width,h:r.h*roi[3]/height}));
          } finally { if(region)region.dispose();else if(resized)resized.dispose();if(crop)crop.dispose(); }
        });
      }
      const key = asset + "/" + JSON.stringify([area, roi, threshold, useColor]);
      return this.memoFrame(f, "matches/"+key, () => {
      if (!this.roCache.has(key)) {
        if (!this.templates.has(asset)) {
          const mat = this.readTemplateImage("assets/" + asset + ".png");
          if (mat.empty()) { mat.dispose(); throw new Error("缺少模板：" + asset); }
          this.templates.set(asset, mat);
        }
        const ro = RecognitionObject.TemplateMatch(this.templates.get(asset), ...roi);
        ro.threshold = threshold;
        ro.Use3Channels = useColor;
        this.roCache.set(key, ro);
      }
      const found = f.FindMulti(this.roCache.get(key));
      const results = [];
      for (let i = 0; i < found.count; i++) {
        const r = found[i];
        // Copy managed scalar data while the source image is still alive.
        results.push({ x: Number(r.x ?? r.X), y: Number(r.y ?? r.Y),
          w: Number(r.width ?? r.Width), h: Number(r.height ?? r.Height) });
      }
      return results;
      });
    }
    has(f, asset, roi, threshold) {
      return this.matches(f, asset, roi, threshold).length > 0;
    }
    button(asset, roi = this.roi("viewport", [0, 540, 1920, 540])) {
      return this.frame((f) => this.matches(f, "core/" + asset, roi)[0] || null);
    }
    async clickButton(asset, roi) {
      if (asset === "出战角色") throw new Error("出战角色模板是提示文字，不是按钮");
      const b = this.button(asset, roi);
      if (!b) throw new Error("没有识别到按钮：" + asset);
      const point = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
      this.trace("button-clicked", { asset, point });
      await sleep(200);
    }
    phaseIn(f) {
      const p = this.memoFrame(f, "phase", () => this.readPhaseIn(f));
      this.runDiagnostics.phase = { phase: p.phase, turn: p.turn, at: Date.now() };
      return p;
    }
    readPhaseIn(f) {
      // Native victory animation starts around y=500 before moving upward.
      // The old y=101..482 crop missed that exact terminal frame (20:11).
      const result = this.ocr(f, this.roi("phase", [763, 101, 394, 600]));
      if (/对局胜利/.test(result)) return { phase: "result", result: "win", turn: "none" };
      if (/对局失败/.test(result)) return { phase: "result", result: "lose", turn: "none" };
      const title = this.ocr(f, this.roi("header", [844, 167, 232, 65]));
      if (title.includes("初始手牌")) return { phase: "opening", turn: "none" };
      if (title.includes("重投骰子")) return { phase: "roll", turn: "none" };
      if(TCG.norm(title)==="挑选卡牌")return this.choiceIn(f) ||
        {phase:"choice",turn:"none",choiceKind:"unknown",options:[],recognized:false};
      // A hover tooltip is not a persistent scene marker. During defeat picks
      // it vanishes when the cursor moves onto the selected character.
      // Exclude the player-name row; saved native pixels passed 9 shifted/
      // brightness variants at native scale. No additional detail clicks.
      const pickPrompt=TCG.norm(this.ocr(f,this.roi("bottom", [138,1020,280,48])));
      if (/^(请选择|选择)出战角色/.test(pickPrompt) || this.has(f, "core/出战角色", this.roi("bottom", pickLabelROI))) return { phase: "pick", turn: "none" };
      if (this.has(f, "core/回合结算阶段", this.roi("viewport", [0, 0, 384, 1080]))) return { phase: "settlement", turn: "none" };
      // Native action banners can coexist with the user-turn icon, while HP,
      // generated cards and the hand-count badge are still animating.
      const banner = TCG.norm(this.ocr(f, this.roi("phase", [560, 508, 790, 70])));
      if (banner === "支援区已满需先选择一张支援牌弃置")
        return { phase:"choice", turn:"none", choiceKind:"support-discard", recognized:true };
      if (this.automaticBanners?.includes(banner)) return { phase: "automatic", turn: "none", automatic: banner };
      // Target previews can show future summons and HP deltas. A declared
      // target banner outranks a still-visible turn icon; it is not a board.
      if (this.targetBanners?.includes(banner)) return { phase: "unknown", turn: "none", cardTarget: true };
      if (["我方行动", "对方行动", "行动阶段", "回合开始"].includes(banner)) return { phase: "transition", turn: "none" };
      const user = this.has(f, "user_turn", this.roi("phase", [64, 518, 33, 42]), 0.9);
      const enemy = this.has(f, "enemy_turn", this.roi("phase", [64, 518, 33, 42]), 0.9);
      const opponent = this.has(f, "core/对方行动中", this.roi("viewport", [0, 0, 384, 1080]));
      if (user && !enemy && !opponent) return { phase: "board", turn: "user" };
      if (enemy && !user || opponent) return { phase: "board", turn: "enemy" };
      const choice=this.choiceIn(f);
      if(choice)return choice;
      return { phase: "unknown", turn: "none" };
    }
    phase(read = null) {
      // Optional pure readers bind their controls to this exact phase frame.
      // The usual phase-adoption invalidation below remains the sole owner.
      const p=this.frame(f=>{const phase=this.phaseIn(f);if(read)read(f,phase);return phase;});
      return this.adoptPhase(p);
    }
    adoptPhase(p) {
      if(p.phase!=="board"||p.turn!=="user") { this.boardReady=false; this.lastObservedAt=0; this.preparedHandInput=null; }
      return p;
    }
    async admitFreshActionBoard() {
      // Read-only admission, before reset/hand expansion/any game input.
      // User declaration covers hidden history; visible checks are necessary,
      // not a claim that we can infer all past zero-cost actions from pixels.
      let previous = "", last = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        try { last = this.board(); } catch (e) {
          if (!["TCG_DICE_RETRY", "TCG_BOARD_RETRY"].includes(e.code)) throw e;
          previous = ""; await sleep(300); continue;
        }
        if (last.result || !["board", "unknown", "transition"].includes(last.phase)) throw new Error("行动页开局检查期间页面改变");
        const valid = TCG.freshActionBoard(last);
        const key = valid ? JSON.stringify([last.phase, last.turn, last.active, TCG.diceOrder.map(e => last.dice[e] || 0), last.characters]) : "";
        if (valid && key === previous) {
          this.trace("fresh-action-entry-accepted", { active: last.active, dice: last.dice,
            characters: last.characters, proof: "explicit-user-declaration-and-two-stable-visible-opening-boards", historyRestored: false });
          return last;
        }
        previous = key;
        if (attempt < 7) await sleep(300);
      }
      throw new Error("当前行动牌桌不符合新开局未行动条件");
    }
    characterOverviewIn(f) {
      // Native 17:18: the character overview has a role title, not a skill title.
      // Its right-hand section varies with equipment/statuses. Read this only
      // on a probe failure, never in the normal skill-confirm path.
      const name = this.ocr(f, this.roi("details", [311, 115, 341, 50]));
      const who = TCG.characterName(name);
      if (who < 0) return null;
      const heading = this.ocr(f, this.roi("details", [740, 123, 280, 44]));
      if (["角色装备", "角色状态", "阵营出战状态"].includes(TCG.norm(heading))) return { name, heading };
      const text = TCG.norm(this.ocr(f, this.roi("details", [350, 210, 300, 270])));
      const skills = Object.values(TCG.team[who].skills).filter(skill => text.includes(TCG.norm(skill)));
      return skills.length >= 2 ? { name, heading: "角色技能", skills } : null;
    }
    async dismissCharacterOverview(reason) {
      // Only an unreadable board calls this. A payment/choice/unknown page is
      // never a blank-click opportunity; a persistent panel gets one attempt.
      if (this.overviewClearRevision === this.inputRevision) return false;
      const read = () => this.frame(f => {
        const phase = this.phaseIn(f);
        return { phase, panel: phase.phase === "board" && phase.turn === "user"
          ? this.characterOverviewIn(f) : null };
      });
      const first = read();
      if (!first.panel) return false;
      const revision = this.inputRevision;
      await sleep(120);
      const second = read();
      if (!second.panel || this.inputRevision !== revision ||
          TCG.norm(first.panel.name) !== TCG.norm(second.panel.name) ||
          TCG.norm(first.panel.heading) !== TCG.norm(second.panel.heading) ||
          JSON.stringify(first.panel.skills || []) !== JSON.stringify(second.panel.skills || [])) return false;
      const point = this.clickAt(...this.point("board",1190,545));
      this.overviewClearRevision = this.inputRevision;
      this.moveTo(...this.point("board",1555,545));
      this.trace("character-overview-dismissed", { reason, panel: second.panel, point });
      await sleep(300);
      return true;
    }
    diceIn(f, roll = false, expectedRollCount = 8, actionLayout = false) {
      const inAction = roll && (actionLayout || expectedRollCount !== 8);
      const roi = inAction
        ? [320, 280, 1280, 560]
        : roll
          ? [553, 330, 819, 411]
          : [1848, 177, 38, 737];
      // BetterGI0.66.0 uses COLOR dice assets and thresholds0.73/0.7,
      // not DSTCG gray crops at0.9. Keep the two asset/mode pairs together.
      const threshold = roll ? 0.73 : 0.7;
      const area=this.roi(roll ? "rollDice" : "mainDice",roi), mapped=area.rect;
      let items = [];
      for (const e of elements) {
        for (const r of this.matches(
          f,
          "dice/Native" + (roll ? "Roll" : "Main") + e,
          area,
          threshold,
          true,
        )) {
          const [x, y] = mousePoint(r.x + r.w / 2, r.y + r.h / 2, this.captureGeometry?.frameSize);
          items.push({ element: e, x, y });
        }
      }
      const fail = (reason) => {
        this.trace("dice-read", { roll, roi, threshold, color: true, items, error: reason });
        const error = new Error(reason);
        error.code = "TCG_DICE_RETRY";
        throw error;
      };
      if (!roll) {
        const groups = [];
        for (const item of items) {
          const group = groups.find((g) =>
            g.some((d) => Math.hypot(d.x - item.x, d.y - item.y) < 14),
          );
          if (group) group.push(item);
          else groups.push([item]);
        }
        items = groups.map((group) => {
          if (group.length === 1) return group[0];
          // Official0.66 compares scores across templates before suppressing
          // overlaps. FindMulti exposes positions only: bound each score via
          // six threshold probes in this slot. A fixed0.8 loses real0.783 dice.
          const localROI = [1848, Math.max(177, Math.min(...group.map((d) => d.y)) - 22), 38, 48];
          const ranked = [];
          for (const e of new Set(group.map((d) => d.element))) {
            let low = 0.7,
              high = 1,
              best = group.find((d) => d.element === e);
            for (let probe = 0; probe < 6; probe++) {
              const threshold = (low + high) / 2;
              const hits = this.matches(f, "dice/NativeMain" + e, this.observedRoi("board", localROI), threshold, true)
                .map((r) => {
                  const [x, y] = mousePoint(r.x + r.w / 2, r.y + r.h / 2);
                  return { element: e, x, y };
                })
                .filter((d) => group.some((g) => Math.hypot(g.x - d.x, g.y - d.y) < 14));
              if (hits.length === 1) {
                low = threshold;
                best = hits[0];
              } else high = threshold;
            }
            ranked.push({ ...best, low, high });
          }
          ranked.sort((a, b) => b.low - a.low);
          // Keep the official0.7 threshold. Margin0.03 is over six times the
          // probe interval0.0046875; near ties still cannot be classified.
          const accepted = ranked[0].low - ranked[1].high >= 0.03;
          this.trace("dice-conflict-recheck", {
            group,
            roi: localROI,
            probes: 6,
            ranked,
            minScore: 0.7,
            minMargin: 0.03,
            accepted,
          });
          if (!accepted) fail("同一骰子跨模板分数复核后仍不唯一或分差不足，停止");
          const { element, x, y } = ranked[0];
          return { element, x, y };
        });
      }
      // Reject ambiguous classifications instead of double-counting an Omni die.
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          if (Math.hypot(items[i].x - items[j].x, items[i].y - items[j].y) < 14)
            fail("同一骰子被多模板识别，停止");
        }
      const dice = Object.fromEntries(
        elements.map((e) => [e, items.filter((d) => d.element === e).length]),
      );
      if (items.length > 16 || (roll && items.length !== expectedRollCount))
        fail("骰子识别数量异常：" + items.length);
      if (inAction) items.sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
      if (roll && !inAction) {
        // Counting8 alone could hide a missing slot plus a side-face duplicate.
        const slots = new Set();
        for (const die of items) {
          const col = Math.floor((die.x - mapped[0]) / (mapped[2] / 4));
          const row = die.y < this.point("rollDice",960,540)[1] ? 0 : 1;
          if (col < 0 || col > 3 || die.y < mapped[1] || die.y >= mapped[1] + mapped[3])
            fail("重投骰子位置超出已验证的八格布局");
          die.slot = row * 4 + col;
          if (slots.has(die.slot))
            fail("重投骰子位置重复：第 " + (die.slot + 1) + " 格；不能用重复命中凑八颗");
          slots.add(die.slot);
        }
        if (slots.size !== 8) fail("重投骰子八个位置未识别完整");
        items.sort((a, b) => a.slot - b.slot);
      }
      const key = JSON.stringify(items),
        domain = inAction ? "action-roll" : roll ? "roll" : "main";
      if (this.diceReadKeys.get(domain) !== key) {
        this.diceReadKeys.set(domain, key);
        this.trace("dice-read", { roll, roi, threshold, color: true, items, dice });
      }
      return { dice, items };
    }
    async readRollDice() {
      let previousKey = "",
        observed = null,
        lastError = "骰子尚未稳定";
      for (let attempt = 0; attempt < 12; attempt++) {
        const p = this.phase();
        if (p.phase !== "roll" && p.phase !== "unknown")
          throw new Error("稳定识别骰子前已离开投骰页");
        if (p.phase === "roll") {
          try {
            observed = this.frame((f) => this.diceIn(f, true));
            const key = JSON.stringify(observed.items.map((d) => [d.slot, d.element]));
            this.trace("roll-dice-wait", {
              attempt,
              stable: key === previousKey,
              count: observed.items.length,
            });
            if (key === previousKey) return observed;
            previousKey = key;
            lastError = "八颗骰子的分类尚未取得连续两帧一致";
          } catch (e) {
            if (e.code !== "TCG_DICE_RETRY") throw e;
            previousKey = "";
            lastError = String(e.message || e);
            this.trace("roll-dice-wait", { attempt, stable: false, error: lastError });
          }
        } else previousKey = "";
        if (attempt < 11) await sleep(500);
      }
      throw new Error("重投骰子识别12次未稳定：" + lastError);
    }
    async actionReroll(before, memory = TCG.freshMemory()) {
      const count = TCG.total(before.dice);
      if (count < 1 || count > 16) throw new Error("战中重投的真实骰数无效");
      const goal = TCG.actionRerollGoal(before, memory);
      if (!this.tossSession)
        this.tossSession = {
          sent: 0,
          expected: 2,
          selection: null,
          wanted: goal?.element || TCG.team[before.active].element,
          transitioned: false,
          previousDice: null,
          blankReady: false,
          blankSent: false,
        };
      const session = this.tossSession,
        counterROI = [700, 835, 520, 65];
      let stable = 0,
        key = "",
        lastTrace = "",
        lastError = "重投页面尚未稳定";
      for (let attempt = 0; attempt < 60; attempt++) {
        let page;
        try {
          page = this.frame((f) => {
            const phase = this.phaseIn(f);
            if (phase.phase !== "roll") return { phase };
            const text = this.ocr(f, this.roi("bottom", counterROI)),
              remaining = TCG.rerollCounter(text);
            const blank = remaining === null && TCG.norm(text) === "";
            return {
              phase,
              text,
              remaining,
              blank,
              blankHeader: blank
                ? TCG.norm(this.ocr(f, this.roi("header", [844, 167, 232, 65]))) === "重投骰子" &&
                  TCG.norm(this.ocr(f, this.roi("header", [700, 230, 520, 50]))) === "请选择要重投的骰子"
                : false,
              buttons: this.matches(f, "core/确定", this.roi("bottom", [500, 900, 920, 150])),
              dice:
                !session.selection &&
                (remaining === session.expected ||
                  (blank && session.sent === 1) ||
                  (session.blankSent && session.sent === 2 && remaining === 1))
                  ? this.diceIn(f, true, count, true)
                  : null,
            };
          });
        } catch (e) {
          if (e.code !== "TCG_DICE_RETRY") throw e;
          lastError = e.message;
          stable = 0;
          key = "";
          await sleep(300);
          continue;
        }
        const p = page.phase;
        if (session.sent > 0 && p.phase !== "roll") session.transitioned = true;
        if (p.phase === "board" && p.turn === "user" && session.sent < 2) {
          const observed = await this.settledBoard(true);
          if (observed.phase === "board" && observed.turn === "user") {
            this.tossSession = null;
            this.trace("action-reroll-resolved", { count, confirmations:session.sent,
              wanted:session.wanted, recovery:"complete-native-board", unresolved:true });
            return { confirmations:session.sent, inputConfirmations:session.sent, unresolved:true };
          }
          stable = 0; key = ""; await sleep(300); continue;
        }
        if (p.result || (p.phase === "board" && p.turn === "user" && session.sent >= 2)) {
          const current = JSON.stringify([p.phase, p.turn, p.result]);
          stable = current === key ? stable + 1 : 1;
          key = current;
          if (stable >= 2) {
            this.trace("action-reroll-resolved", {
              count,
              confirmations: session.sent,
              wanted: session.wanted,
            });
            this.tossSession = null;
            return { confirmations: 2, inputConfirmations: session.sent };
          }
          await sleep(300);
          continue;
        }
        const traceKey = JSON.stringify([p.phase, page.remaining, page.text, page.buttons?.length]);
        if (traceKey !== lastTrace) {
          this.trace("action-reroll-page", {
            phase: p.phase,
            remaining: page.remaining,
            text: page.text,
            expected: session.expected,
            count,
            wanted: session.wanted,
          });
          lastTrace = traceKey;
        }
        const diceKey = page.dice ? JSON.stringify(page.dice.items) : null;
        const blankOK =
          page.blank &&
          page.blankHeader &&
          session.sent === 1 &&
          (session.blankReady ||
            session.transitioned ||
            (diceKey !== null && diceKey !== session.previousDice));
        // A counterless page may be either the second selection or an interim
        // acknowledgement. Only an explicit subsequent "1" permits a third
        // button confirmation; never repeat a counterless page after sending it.
        const countedOK =
          (page.remaining === session.expected && session.sent < 2) ||
          (session.blankSent && session.sent === 2 && page.remaining === 1);
        if (
          p.phase !== "roll" ||
          !(countedOK || blankOK) ||
          page.buttons.length !== 1 ||
          session.sent >= 3
        ) {
          lastError = page.remaining === null ? "战中重投次数未识别" : "战中重投页面未就绪";
          stable = 0;
          key = "";
          await sleep(300);
          continue;
        }
        if (!session.selection) {
          const bad = page.dice.items.filter(
            (d) => d.element !== session.wanted && d.element !== "Omni",
          );
          // Persist selection BEFORE any input. A delayed OCR/control cannot
          // cause a second click to toggle the same die back off.
          session.blankReady = blankOK;
          session.selection = {
            remaining: page.remaining,
            selected: bad.length,
            diceKey,
            blank: blankOK,
          };
          for (const die of bad) {
            this.clickAt(die.x, die.y);
            await sleep(120);
          }
          stable = 0;
          key = "";
          await sleep(250);
          continue;
        }
        // Fresh same-frame phase, exact counter and unique control after dice
        // selection. Empty OCR retries read-only; no selection replay.
        const b = page.buttons[0];
        this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
        // 1440 can restore the raised fan on leaving reroll. Let the existing
        // action-board boundary fold it before reading HP/death/status again.
        const actual = this.captureGeometry?.actualSize;
        if (actual?.width === 2560 && [1440,1600].includes(actual.height)) this.handNeedsReset = true;
        session.sent++;
        session.expected = page.remaining === null ? 0 : page.remaining - 1;
        const selected = session.selection.selected;
        session.previousDice = session.selection.diceKey;
        session.blankSent ||= session.selection.blank;
        session.selection = null;
        session.blankReady = false;
        session.transitioned = false;
        this.trace("action-reroll-confirmed", {
          remaining: page.remaining,
          selected,
          count,
          wanted: session.wanted,
        });
        stable = 0;
        key = "";
        await sleep(1000);
      }
      this.trace("action-reroll-layout", { reason: lastError });
      const error = new Error("战中重投等待超时：" + lastError);
      error.code = "TCG_DICE_RETRY";
      throw error;
    }
    
    skillX(action) {
      const actor=TCG.team[action.who],order=actor?.skillOrder||["NA","E","Q"],index=order.indexOf(action.skill);
      if(!actor||![3,4].includes(order.length)||new Set(order).size!==order.length||
        order.some(skill=>!actor.skills[skill])||index<0)
        throw new Error("技能槽位或当前出战角色不符");
      // Skills stay right-aligned. Lyney's second normal attack adds one slot
      // on the left; E/Q retain the existing calibrated positions.
      return 1824-108*(order.length-1-index);
    }
    async probeSkill(action,before,memory) {
      const x=this.skillX(action);
      if(action.who!==before.active)throw new Error("费用检视只能用于当前角色的固定技能槽");
      this.clickAt(...this.point("bottom",x,957));await sleep(1200);
      let fee=null,last=null,stable=0;
      for(let i=0;i<4;i++){
        const sample=this.frame(f=>({phase:this.phaseIn(f),fee:this.skillFeeIn(f,action)}));
        this.requireHandObservation(sample.phase,"skill-fee-probe");
        const n=sample.fee;stable=n!==null&&n===last?stable+1:1;last=n;
        if(n!==null&&stable>=2){fee=n;break;}await sleep(180);
      }
      // A fee probe NEVER casts. Cancel, then prove unchanged real resources.
      this.boardReady=false;await this.reset();await this.requireUnchangedBoard(before);
      TCG.recordSkillCost(before,memory,action,fee);
      this.trace("skill-fee-probed",{who:action.who,skill:action.skill,fee,unchanged:true,castInputs:0});
      return {...before,confirmed:false,probed:true};
    }
    numericAt(f, area, scale) {
      return this.localOcr(f, area, scale, false);
    }
    enlargedOcrRows(f, area, scale) {
      return this.localOcr(f, area, scale, true);
    }
    hpAt(f, x, y) {
      // V4's detector returns no boxes for the native 58x40 HP ROIs.
      // Keep the native capture/coordinates; enlarge only the numeric crop.
      // Exact ROIs and scale were checked on the saved 17:06 native frame.
      // Recovery profile adds horizontal context, not overlapping vertical HP
      // slots. Saved-pixel 11-HP stress test: wide4=9/9, original=7/9.
      const roi = this.precisionBoard ? [x + 2, y, 56, 40] : [x + 8, y, 44, 40];
      const raw = this.numericAt(f, this.roi("board", roi), this.precisionBoard ? 4 : 3);
      if (number(raw) !== null || !this.precisionBoard) return raw;
      // Same-frame, read-only retry with vertical context. Saved 1-HP / empty
      // regions were stress-tested; no cached-health or digit substitution.
      return this.numericAt(f, this.roi("board", [x, y - 6, 62, 52]), 4);
    }
    diceCountIn(f) {
      // Official MyDiceCountRect. A missing badge is unknown, never zero.
      const raw = this.numericAt(f, this.roi("board", [68, 642, 25, 31]), 4),
        count = number(raw);
      if (count !== null) return count <= 16 ? count : null;
      // Keep the 1080 path unchanged. Only a bound 1440 client may retry an
      // unreadable single zero at another scale, in this very same frame/ROI.
      const actual = this.captureGeometry?.actualSize;
      if (actual?.width === 2560 && [1440,1600].includes(actual.height)) {
        const retry = this.numericAt(f, this.roi("board", [68, 642, 25, 31]), 3);
        if (retry === "0") {
          this.trace("dice-zero-recovered", { raw, retry, scale: 3, roi: [68, 642, 25, 31],
            proof: "same-frame-exact-native-zero", actualSize: actual });
          return 0;
        }
      }
      return null;
    }
    usePrecisionBoard(reason) {
      if (this.precisionBoard) return;
      this.precisionBoard = true;
      this.trace("board-recovery", {
        reason,
        hpROI: ["x+2", "y", 56, 40],
        hpScale: 4,
        diceBadgeCrossCheck: true,
      });
    }
    releasePrecisionBoard(reason) {
      if (!this.precisionBoard) return;
      this.precisionBoard = false;
      this.trace("board-recovery-complete", { reason, nextHpScale: 3, diceBadgeCrossCheck: true });
    }
    normalHpProfileIn(f, characters, enemies) {
      // Downgrade only when the ordinary crops independently reproduce the
      // accepted HP and raised/lowered positions in this SAME native frame.
      // Read only the accepted enemy layout, not all four layout candidates.
      if (
        !Array.isArray(characters) ||
        characters.length !== 3 ||
        !Array.isArray(enemies) ||
        !enemyHpXs[enemies.length] ||
        TCG.enemyCount({ enemies }) === null
      )
        return false;
      const at = (x, raisedY, loweredY, c, raised) => {
        if (c.dead === true) return true;
        if (!TCG.alive(c) || typeof raised !== "boolean") return false;
        const a = number(this.numericAt(f, this.roi("board", [x + 8, raisedY, 44, 40]), 3)),
          b = number(this.numericAt(f, this.roi("board", [x + 8, loweredY, 44, 40]), 3));
        return raised ? a === c.hp && b === null : b === c.hp && a === null;
      };
      return (
        characters.every((c, i) => at(enemyHpXs[3][i], 600, 640, c, c.raised)) &&
        enemies.every((c, i) => at(enemyHpXs[enemies.length][i], 170, 212, c, !c.active))
      );
    }
    characterIn(f, who, enemy = false, enemyLayoutCount = 3, readStatus = false) {
      const count = enemy ? enemyLayoutCount : 3;
      const hpXs = enemy ? enemyHpXs[count] : enemyHpXs[3];
      const hpX = hpXs[who];
      const stateX = hpX + 17;
      const stateY = enemy ? 105 : 545;
      // This current-frame positive marker already determines hp=0 below.
      // Do not OCR two empty/covered HP crops only to discard both results.
      // An absent marker still requires both native HP positions; never use
      // a prior death, cached HP, or a missing number as this proof.
      const dead = this.has(f, "disable", this.roi("board", [stateX, stateY, 167, 382]), 0.9);
      const rawRaised = dead ? null : this.hpAt(f, hpX, enemy ? 170 : 600);
      const rawLowered = dead ? null : this.hpAt(f, hpX, enemy ? 212 : 640);
      const raised = number(rawRaised),
        lowered = number(rawLowered);
      // NPC/modified character cards can start above 10 (native current match
      // shows two 11-HP opponents). Do not turn every such slot into unknown.
      // This bounds a two-digit observation, not an assumed enemy max HP.
      const maxHp = enemy
        ? 99
        : TCG.team[who].maxHp +
          (this.memory?.extraMaxHp?.[who] || 0) +
          (this.pendingMaxHpAllowance?.(who) || 0) +
          (this.soupReceipt?.effect === "maxhp" && this.soupReceipt.exited === true &&
            this.soupReceipt.origin === this.confirmationSession?.key &&
            this.confirmationSession?.plan?.action?.target === who &&
            this.soupReceipt.target === who ? 1 : 0);
      const validHp = (value) => value !== null && value >= 1 && value <= maxHp;
      const raisedValid = validHp(raised),
        loweredValid = validHp(lowered);
      // Two positions containing numbers is not proof of either HP or active slot.
      const conflict = raisedValid && loweredValid;
      const hp = dead ? 0 : conflict ? null : raisedValid ? raised : loweredValid ? lowered : null;
      const key = JSON.stringify([rawRaised, rawLowered, dead, hp]);
      const slotKey = (enemy ? "enemy" + count + "/" : "own") + who;
      if (this.hpReadKeys.get(slotKey) !== key) {
        this.hpReadKeys.set(slotKey, key);
        this.trace("hp-read", {
          side: enemy ? "enemy" : "own",
          index: who,
          rois: this.precisionBoard
            ? [
                [hpX + 2, enemy ? 170 : 600, 56, 40],
                [hpX + 2, enemy ? 212 : 640, 56, 40],
              ]
            : [
                [hpX + 8, enemy ? 170 : 600, 44, 40],
                [hpX + 8, enemy ? 212 : 640, 44, 40],
              ],
          scale: this.precisionBoard ? 4 : 3,
          raw: [rawRaised, rawLowered],
          hpSource: dead ? "native-death-marker" : "native-hp-ocr",
          hp,
          dead,
          conflict,
        });
      }
      if (enemy) {
        // Positive aura matches only. Missing templates do NOT prove no aura.
        const aura = readStatus && !dead ? this.auraIn(f, hpX, loweredValid ? 212 : 170) : [];
        const frozen = readStatus && !dead &&
          this.has(f, "state/StateFreeze", this.roi("board", [stateX, stateY, 167, 382]), 0.9);
        return {
          hp,
          dead: dead ? true : hp === null ? null : false,
          active: !dead && loweredValid && !conflict,
          aura,
          auraKnown: aura.length > 0 && aura.length <= 2,
          frozen: frozen ? true : null,
        };
      }
      const cx = [812, 1022, 1233][who];
      const charged = dead ? 0 : this.matches(f, "charge", this.roi("board", [cx, 612, 32, 180]), 0.86).length;
      const empty = dead ? 0 : this.matches(f, "uncharge", this.roi("board", [cx, 612, 32, 180]), 0.86).length;
      const energy = charged + empty === TCG.team[who].maxEnergy ? charged : null;
      const statusROI = [stateX, stateY, 167, 382];
      const frozen =
        this.has(f, "state/StateFreeze", this.roi("board", statusROI), 0.9) ||
        ["角色状态_冻结", "角色状态_冻结2", "角色状态_水泡"].some((name) =>
          this.has(f, "core/" + name, this.roi("board", statusROI), 0.9),
        );
      return {
        hp,
        dead: dead ? true : hp === null ? null : false,
        energy: dead ? 0 : energy,
        frozen,
        raised: !dead && raisedValid && !conflict,
      };
    }
    enemiesIn(f) {
      // Defeated cards may remain in their slots OR disappear and recenter.
      // Every slot needs positive live HP or an explicit death-template match,
      // with exactly one lowered LIVING active card.
      // Ambiguous/partial layouts remain unknown; they never become deaths.
      const observations = [],
        candidates = [];
      // These four native layouts already have calibrated HP geometry. Do not
      // silently crop a four-opponent mode to the configured default of three.
      for (let count = 1; count <= 4; count++) {
        const cards = Array.from({ length: count }, (_, i) =>
          this.characterIn(f, i, true, count, false),
        );
        const row = { count, cards, xs: enemyHpXs[count] };
        observations.push(row);
        if (
          cards.every((c) => TCG.alive(c) || (c.dead === true && c.hp === 0 && !c.active)) &&
          cards.filter((c) => TCG.alive(c) && c.active).length === 1
        )
          candidates.push(row);
      }
      // Placeholder shape is not an observed enemy count or strategy setting.
      const unknown = () =>
        Array.from({ length: 3 }, () => ({ hp: null, dead: null, active: null }));
      if (!candidates.length) return unknown();
      const best = candidates.sort((a, b) => b.count - a.count)[0];
      // Three vs one and four vs two overlap at inner HP positions. Accept a
      // smaller candidate only as the EXACT same subset, not a second team.
      for (const row of candidates.slice(1))
        for (let i = 0; i < row.count; i++) {
          const j = best.xs.findIndex((x) => Math.abs(x - row.xs[i]) <= 12);
          if (
            j < 0 ||
            row.cards[i].hp !== best.cards[j].hp ||
            row.cards[i].dead !== best.cards[j].dead ||
            row.cards[i].active !== best.cards[j].active
          )
            return unknown();
        }
      // A temporarily unreadable outer card must not shrink a 4-card team to
      // its readable middle pair (or a 3-card team to its middle card).
      for (const row of observations.filter((r) => r.count > best.count))
        if (
          row.cards.some(
            (c, i) =>
              (TCG.alive(c) || c.dead === true) &&
              !best.xs.some((x) => Math.abs(x - row.xs[i]) <= 12),
          )
        )
          return unknown();
      return best.cards.map((c, i) => {
        // Freeze, like aura, does not select a layout. Read only admitted slots
        // in this same frame, after overlap and unreadable-outer-card checks.
        const aura = c.dead === true ? [] : this.auraIn(f, best.xs[i], c.active ? 212 : 170);
        const frozen = c.dead !== true &&
          this.has(f, "state/StateFreeze", this.roi("board", [best.xs[i] + 17, 105, 167, 382]), 0.9);
        return { ...c, aura, auraKnown: aura.length > 0 && aura.length <= 2, frozen: frozen ? true : null };
      });
    }
    auraIn(f, hpX, hpY) {
      // Only the strip above this card, not its artwork/statuses. Official
      // 15px glyphs score 0.824 on the saved Hydro frame; 0.9 rejected it.
      const roi = [hpX + 60, hpY - 70, 95, 62],
        hits = [];
      for (const element of ["Cryo", "Hydro", "Pyro", "Electro", "Dendro"])
        for (const r of this.matches(f, "state/State" + element, this.roi("board", roi), 0.8, true))
          hits.push({ ...r, element });
      if (
        hits.some((a, i) =>
          hits
            .slice(i + 1)
            .some((b) => a.element !== b.element && Math.hypot(a.x - b.x, a.y - b.y) < 15),
        )
      )
        return [];
      const aura = [...new Set(hits.map((h) => h.element))];
      return aura.length <= 2 ? aura : [];
    }
    
    board(actionOnly = false, pickTransition = false) {
      return this.frame(f => {
        const phase = this.phaseIn(f);
        // A terminal screen has no character/dice/hand UI. Do not run board
        // readers first and discover the result only after they have failed.
        if (phase.result) return { ...phase, hand: null };
        if(pickTransition && !["pick","board"].includes(phase.phase))return {...phase,hand:null};
        if(actionOnly && (phase.phase!=="board" || phase.turn!=="user"))return {...phase,hand:null};
        const characters = [0, 1, 2].map(i => this.characterIn(f, i));
        const actives = characters.map((c, i) => c.raised && !c.dead ? i : -1).filter(i => i >= 0);
        const dice = this.diceIn(f);
        const badgeCount=phase.phase==="board" && phase.turn==="user" ? this.diceCountIn(f) : null;
        if(badgeCount!==null && badgeCount!==TCG.total(dice.dice)) {
          this.trace("dice-count-mismatch",{badgeCount,templateCount:TCG.total(dice.dice),dice:dice.dice});
          const error=new Error("实际骰数徽标与元素模板不一致");
          error.code="TCG_DICE_RETRY";throw error;
        }
        const enemies=this.enemiesIn(f);
        const normalHpReadable=this.precisionBoard ? this.normalHpProfileIn(f,characters,enemies) : true;
        return { ...phase, normalHpReadable, pickSelection:phase.phase==="pick"?this.pickSelectionIn(f):null, characters, active: actives.length === 1 ? actives[0] : null,
          enemies, ...this.boardExtrasIn(f,phase,actives.length === 1 ? actives[0] : null),
          // Observation truth is independent of the predicted action budget.
          dice: dice.dice, diceKnown: phase.phase === "board" && (TCG.total(dice.dice) > 0 || badgeCount === 0),
          diceObservation: { badge: badgeCount, templates: TCG.total(dice.dice) }, hand: null };
      });
    }
    observationIssues(state) {
      const issues = [];
      if (state.phase !== "board") issues.push("phase");
      if (state.turn !== "user") issues.push("turn");
      if (state.diceKnown !== true) issues.push("dice");
      if (!Number.isInteger(state.active) || !TCG.alive(state.characters?.[state.active])) issues.push("active");
      if (!Array.isArray(state.characters) || state.characters.length !== 3) issues.push("own");
      else state.characters.forEach((c, i) => {
        if (c?.dead === true) return;
        if (!TCG.alive(c)) issues.push(`own[${i}].hp`);
        if (!Number.isInteger(c?.energy) || c.energy < 0 || c.energy > TCG.team[i].maxEnergy) issues.push(`own[${i}].energy`);
        if (typeof c?.frozen !== "boolean") issues.push(`own[${i}].status`);
      });
      if (TCG.enemyCount(state) === null) issues.push("enemy");
      if (!issues.length && !TCG.legalState({ ...state, hand: [] })) issues.push("board-rules");
      return issues;
    }
    finishObservation(state, pendingAction, handRead, observedAt = Date.now()) {
      if (!TCG.legalState(state) || TCG.enemyCount(state) === null) {
        const error = new Error("完整观察仍有未知字段：" + this.observationIssues(state).join("、"));
        error.code = "TCG_BOARD_RETRY"; throw error;
      }
      let resynchronized = false;
      TCG.refreshSkillCosts(this.memory,state);
      if (!pendingAction) {
        if (!this.diceBudgetMatches(state)) {
          this.trace("state-resync", { reason: "observation-budget", expectedDice: this.expectedDice, observedDice: TCG.total(state.dice) });
          this.adoptObservedState(state, "observation-resync"); resynchronized = true;
          this.trace("state-resynced", { reason: "observation-budget", after: state });
        }
        if (!resynchronized) this.acceptHand(state.hand, "observed-stable-board");
      }
      this.boardReady = true; this.lastObservedState = state; this.lastObservedAt = observedAt;
      this.lastObservedRevision = this.inputRevision;
      return { ...state, handRead, ...(resynchronized ? { resynchronized: true } : {}) };
    }
    async observedResourceProof(state) {
      if (!TCG.legalState(state) || this.autoRisk || this.handNeedsReset || this.handFanReady) return null;
      const revision = this.inputRevision, count = TCG.total(state.dice);
      for (let attempt = 0; attempt < 2; attempt++) {
        const sampledAt = Date.now();
        let sample;
        try { sample = this.frame(f => {
          const phase = this.phaseIn(f);
          if (phase.phase !== "board" || phase.turn !== "user") return phase;
          return { ...phase, dice: this.diceIn(f).dice, badge: this.diceCountIn(f) };
        }); } catch (e) { if (e.code === "TCG_DICE_RETRY") return null; throw e; }
        if (sample.phase !== "board" || sample.turn !== "user" || sample.badge !== count ||
            !TCG.diceOrder.every(e => (sample.dice?.[e] || 0) === (state.dice[e] || 0)) ||
            TCG.total(sample.dice) !== count || this.inputRevision !== revision) return null;
        const remaining = 120 - (Date.now() - sampledAt);
        if (attempt === 0 && remaining > 0) await sleep(remaining);
      }
      const proof = { kind: "two-fresh-element-and-count-frames", count, stableReads: 2, revision };
      this.trace("resource-native-proof", { ...proof, expectedDice: this.expectedDice, attributedEffect: null });
      return proof;
    }
    
    async reset() {
      if (this.boardReady && !this.handNeedsReset && !this.handFanReady) {
        this.trace("hand-reset-skipped", { reason: "already-clean-board" });
        return;
      }
      this.handFanReady = false;
      this.clickAt(...this.point("board",1190,545));
      this.moveTo(...this.point("board",1555,545));
      await sleep(300);
      this.handNeedsReset = false;
      this.boardReady = true;
      this.trace("hand-reset", {});
    }
    async expand(resetFirst = true) {
      // The native control is a toggle. Card selection does not close the fan;
      // never click that control again while the same layout remains ready.
      const readView = f => {
        if (!this.raisedHandIn) return null;
        if (this.raisedHandIn(f)) return "expanded";
        return this.collapsedLayoutIn(f).status === "readable" ? "folded" : null;
      };
      let needsReset;
      let view = this.frame(f => {
        this.requireHandObservation(this.adoptPhase(this.phaseIn(f)), "before-hand-expand");
        needsReset = resetFirst && !this.boardReady && !this.handFanReady;
        return needsReset ? null : readView(f);
      });
      if (needsReset) {
        await this.reset();
        view = this.frame(f => {
          this.requireHandObservation(this.phaseIn(f), "before-hand-view-toggle");
          return readView(f);
        });
      }
      // Draw/choice animations can raise or fold the fan independently of
      // our last click. A complete native layout outranks the view hint.
      // Unknown layout is not permission to toggle an already-open fan.
      if (view === "expanded") {
        if (!this.handFanReady) this.handPositionProof = null;
        this.handFanReady = this.handNeedsReset = true;
        this.boardReady = false;
        this.trace("hand-expand-skipped", { reason: "native-expanded-layout" });
        return;
      }
      if (view === "folded" && this.handFanReady) {
        this.handFanReady = false;
        this.handPositionProof = null;
        this.trace("hand-view-reconciled", { view, reason: "native-layout-contradicts-hint" });
      }
      if (this.handFanReady) {
        this.trace("hand-expand-skipped", { reason: "fan-already-ready" });
        return;
      }
      this.clickAt(...this.point("handFolded",967,1041));
      this.moveTo(...this.point("bottom",1791,917));
      await sleep(180);
      this.handFanReady = true;
      this.handNeedsReset = true;
      this.trace("hand-expanded", { resetFirst });
    }
    requireHandObservation(phase = this.phase(), stage = "hand") {
      // Details may legitimately hide the turn icon (unknown). Only positive
      // phase evidence interrupts observation; unreadable titles on a stable
      // board remain genuine errors, never converted into a fabricated win.
      if (
        phase.result ||
        ["pick", "roll", "settlement", "transition", "choice", "automatic"].includes(phase.phase) ||
        phase.turn === "enemy"
      ) {
        this.handFanReady = false;
        const error = new Error("读牌期间页面变化：" + phase.phase + "/" + phase.turn);
        error.code = "TCG_OBSERVATION_INTERRUPTED";
        error.phase = { ...phase, hand: null };
        this.trace("hand-phase-interrupted", { stage, ...phase });
        throw error;
      }
    }
    titleIn(f, roi, kind = "card", names = null) {
      const native = this.ocr(f, this.roi("details", roi));
      const identify = text => names ? names.some(name => TCG.norm(name) === TCG.norm(text)) :
        kind === "character" ? TCG.characterName(text) >= 0 : !!TCG.identify(text);
      const card = kind === "card" ? TCG.identify(native) : null;
      if (card && TCG.norm(native) !== TCG.norm(card.name)) {
        this.trace("title-exact-alias", { native, canonical:card.name, id:card.id, additionalInputs:0 });
        return card.name;
      }
      if (identify(native) || !native) return native;
      const enlarged = this.numericAt(f, this.roi("details", roi), 3);
      if (identify(enlarged)) {
        this.trace("title-pixel-recovery", { roi, kind, native, enlarged, scale:3, additionalInputs:0 });
        return enlarged;
      }
      const key = "unknown-title:" + TCG.norm(native);
      if (kind !== "character" && !this.diagnosticKeys.has(key)) {
        this.diagnosticKeys.add(key);
        this.trace("unresolved-title", { kind, roi, native, enlarged });
      }
      return native;
    }
    async inspectHandCard(action, x, before = null) {
      // A fresh native artwork identity is sufficient for ordinary input.
      // Details are only opened for unknown identities or actual deck facts.
      if (before && !this.needsCardDetails?.(action, before) && this.expandedHandIn) {
        let slot;
        try {
          slot=this.frame(f => {
            const target=this.expandedHandIn(f, before.hand.length, action.index)
              ?.slots.find(s => s.index === action.index);
            if(!target?.titleCandidates)return target;
            // The target already established this frame's complete layout.
            const row=this.expandedHandIn(f,before.hand.length),
              cards=row.slots.map(s=>s.id?TCG.observedCard(TCG.byId[s.id].name,s.index):null);
            this.fillHandVariants(cards,row.slots,before.hand,[],true);
            return cards[action.index]?{...row.slots[action.index],id:cards[action.index].id}:target;
          });
        }
        catch(e) {
          if(e.code!=="TCG_HAND_RETRY")throw e;
          await this.refreshHandBeforeInput("目标牌面读取时数量已变化，重新核对手牌");
        }
        if (slot?.id) {
          if (slot.id !== action.id)
            await this.refreshHandBeforeInput("目标槽牌面已变化，重新核对手牌");
          this.trace("hand-input-artwork", { id:action.id,index:action.index,additionalInputs:0 });
          return slot.point;
        }
      }
      const raw = await this.titleAt(x, 945, false, false, "card", action.id, true);
      if (!raw) {
        // The target may have left after a delayed effect. A board-only
        // refresh would keep selecting the same cached, nonexistent card.
        await this.refreshHandBeforeInput("目标手牌标题为空，重新读取当前手牌");
      }
      if (TCG.observedCard(raw, action.index)?.id !== action.id)
        await this.refreshHandBeforeInput("目标手牌卡名校验失败，重新核对手牌");
    }
    takePreparedHandInput(action, before) {
      const prepared = this.preparedHandInput;
      this.preparedHandInput = null;
      const inspecting = action.type === "probe" && action.scope === "card";
      const sameSlot = !!prepared && prepared.id === action.id && prepared.index === action.index;
      const target = before.hand.find(h => h.index === action.index);
      const age = prepared ? Date.now() - prepared.at : Infinity;
      if (!prepared || !(inspecting || action.type === "card" || action.type === "tune") ||
          !inspecting && (!Number.isInteger(action.index) || action.index < 0 || action.index >= before.hand.length ||
            target?.id !== action.id || !TCG.handCardKnown(target)) ||
          prepared.revision !== this.inputRevision || !Number.isFinite(age) || age < 0 || age > 5000 ||
          prepared.beforeKey !== TCG.boardKey(before)) return null;
      const count = this.frame(f => {
        this.requireHandObservation(this.phaseIn(f), "after-card-inspection");
        return this.nativeHandCountIn(f);
      });
      if (count !== null && count !== before.hand.length) return null;
      // A new direct target may keep the fan only with a definite current
      // native count. Missing count falls back to the full board/input path.
      if (!sameSlot && !inspecting && count !== before.hand.length) return null;
      const viewOnly = inspecting || !sameSlot;
      this.trace("hand-input-inspection-reused", { id:action.id, index:action.index,
        viewOnly, additionalInputs:0 });
      // View authority carries no selected position, identity, price or count
      // proof from the inspected slot. The next target establishes its own.
      return viewOnly ? { viewOnly:true } : prepared;
    }
    async titleAt(
      x,
      y,
      opening = false,
      hover = false,
      kind = "card",
      expected = null,
      watchPhase = false,
    ) {
      if (watchPhase) this.requireHandObservation(this.phase(), "before-title-input");
      // Opening/character arguments are reference points. Hand x is already
      // measured in F; only its reference row y needs the hand-panel transform.
      if (opening || kind === "character") [x,y]=this.point(opening?"opening":"board",x,y);
      else y=this.point("handExpanded",0,y)[1];
      if (!opening && kind === "card") this.selectedCostProof = this.handPositionProof;
      if (hover) this.moveTo(x, y);
      else this.clickAt(x, y);
      // Official DSTCG getHandMsg clicks consecutive titles on one raised fan.
      // A hand-card click is not evidence of collapse. An empty/unstable title
      // leaves layout unknown and is normalized before any further toggle.
      if (!hover && !opening) this.handNeedsReset = true;
      if (!hover && (opening || kind === "character")) this.handFanReady = false;
      // Known input targets can be sampled early: an old neighbouring title
      // cannot pass the expected identity. Blind title discovery keeps its delay.
      await sleep(expected === null ? 350 : 120);
      const roi = opening ? [58, 112, 339, 53] : [311, 115, 341, 50];
      const reads = [];
      let previousKey = "",
        lastStable = "";
      const attempts = expected === null ? 6 : 10;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const sampledAt = Date.now();
        const raw = this.frame((f) => {
          if (watchPhase) this.requireHandObservation(this.phaseIn(f), "title-sampling");
          const title = this.titleIn(f, roi, kind);
          // A known target needs one positive identity, not a second copy of
          // the same OCR. Blind discovery still corroborates an unknown title.
          if (!opening && kind === "card" && (expected !== null
              ? TCG.observedCard(title, 0)?.id === expected
              : previousKey === "title:" + TCG.norm(title))) {
            const card = TCG.identify(title);
            if (card) this.readSelectedCardFacts?.(f, card, x);
          }
          return title;
        });
        reads.push(raw);
        const who = kind === "character" ? TCG.characterName(raw) : -1;
        const key = raw ? (who >= 0 ? "character:" + who : "title:" + TCG.norm(raw)) : "";
        const stable = !!key && key === previousKey;
        lastStable = stable ? raw : "";
        const matchesExpected = expected === null || (kind === "character"
          ? who === expected : TCG.observedCard(raw, 0)?.id === expected);
        if ((stable || expected !== null) && matchesExpected) {
          this.trace("title-read", {
            point: [x, y],
            roi,
            kind,
            expected,
            reads,
            stable,
            matchesExpected: true,
          });
          return raw;
        }
        // A positively identified, stable different card is a stale target,
        // not an animation worth polling eight more times.
        if (stable && expected !== null && kind === "card" && TCG.identify(raw)) {
          this.trace("title-read", { point:[x,y],roi,kind,expected,reads,stable:true,matchesExpected:false });
          return raw;
        }
        previousKey = key;
        const remaining = (expected === null ? 150 : 120) - (Date.now() - sampledAt);
        if (attempt < attempts - 1 && remaining > 0) await sleep(remaining);
      }
      this.trace("title-read", {
        point: [x, y],
        roi,
        kind,
        expected,
        reads,
        stable: !!lastStable,
        matchesExpected: false,
      });
      if (!hover && !opening) this.handFanReady = false;
      // A stable wrong character remains wrong; preserve its raw title for the error.
      return kind === "character" || expected !== null ? lastStable : "";
    }
    invalidateHand(reason, continuation = null) {
      if (this.handCache !== null)
        this.trace("hand-cache-invalidated", { reason, count: this.handCache.length });
      this.handCache = null;
      this.handContinuation = continuation;
      this.handCountHint = null;
      this.handPositionProof = null;
      this.emptyHandProven = false;
      this.pendingHandEvidence = null;
      if (this.confirmationSession) this.confirmationSession.handObservation = null;
    }
    acceptHand(hand, reason) {
      this.handCache = TCG.reconcileHand(this.handProvenance, hand, false,
        (this.memory?.refusedActions || []).filter(r => r.uncertain && r.round === this.memory.round));
      // Publish the same provenance into the observation returned to planning.
      hand.forEach((card, index) => Object.assign(card, this.handCache[index]));
      this.handProvenance = this.handCache;
      this.trace("hand-cache-updated", { reason, count: this.handCache.length });
    }
    handCostMarkersIn(f, roi, useColor = roi.layoutKey === "16:10" && roi.panel === "handExpanded") {
      // In the 1600 fan, grayscale card decorations can merge into a real
      // corner and move its artwork anchor. Match the corner's own colors;
      // this is not a table/background test or a lower acceptance threshold.
      const threshold = roi.panel === "handFolded" && roi.layoutKey === "16:10" ? .88 : .9;
      return ["hand_cost_neutral", "hand_cost_element", "hand_cost_dendro", "hand_cost_electro", "hand_cost_matching", "hand_cost_pyro"]
        .flatMap(asset => this.matches(f, asset, roi, threshold, useColor));
    }
    handCostLayoutIn(f, nativeCount = null) {
      return this.memoFrame(f, "costLayout:" + nativeCount, () => {
        const measured = nativeCount ?? (this.handFanReady ? this.memoFrame(f, "hand/rim-count", () =>
          handLayoutCount(this.matches(f, "hand_rim", this.roi("handExpanded", [500, 900, 1260, 135]), 0.85, false).map(r => r.x))) : null);
        return costMarkerLayout(this.handCostMarkersIn(f, this.roi("handExpanded", [450, 750, 1310, 200])), measured, this.panelTransform("handExpanded"));
      });
    }
    handPriceIn(f, marker) {
      const area = this.observedRoi("handExpanded", [Math.round(marker.x + 12), Math.round(marker.y - 5), 36, 42]);
      const cost = number(this.numericAt(f, area, 4));
      // A larger surrounding crop still loses the native green digit in the
      // saved selected-card frames. Re-read the same digit at its useful scale.
      return cost !== null ? { cost, reads: 1 } : {
        cost: number(this.numericAt(f, area, 3)), reads: 2,
      };
    }
    costHandIn(f, nativeCount = null) {
      return this.memoFrame(f, "costHand:" + nativeCount, () => {
        const roi = [450, 750, 1310, 200];
        const matches = this.handCostMarkersIn(f, this.roi("handExpanded", roi)), layout = this.handCostLayoutIn(f, nativeCount);
        const unresolved = (reason, detail = {}) => {
          const key = "hand-cost-unresolved:" + reason;
          if (!this.diagnosticKeys.has(key)) {
            this.diagnosticKeys.add(key);
            this.trace("hand-cost-unresolved", { reason, matches, layout, nativeCount, ...detail });
          }
          return null;
        };
        if (!layout) return unresolved("geometry");
        const yy = Math.floor(
          Math.max(this.point("handExpanded",0,750)[1], Math.min(this.point("handExpanded",0,840)[1], Math.min(...layout.markers.map((m) => m.y)) - 40)),
        );
        const numbers = costDigitRows(this.enlargedOcrRows(f, this.observedRoi("handExpanded", [470, yy, 1290, 110]), 3));
        let localRecoveryCalls = 0;
        for (const m of layout.markers) {
          const found = costNumbersAt(m, numbers);
          if (found.length > 1) { unresolved("ambiguous-digit", { marker: m, numbers }); continue; }
          if (found.length === 1 && found[0].value < 10) continue;
          if (found.length === 1) {
            // Whole-row OCR can concatenate neighbouring strokes (native 1→11).
            // Verify only this digit in its tight crop; legal two-digit prices
            // are retained, never clamped to the printed card cost.
            numbers.splice(numbers.indexOf(found[0]),1);
            const value=number(this.numericAt(f,this.observedRoi("handExpanded", [Math.round(m.x+12),Math.round(m.y-5),36,42]),4));
            localRecoveryCalls++;
            if(value!==null)numbers.push({...found[0],value});
            continue;
          }
          // The tight crop also reads zeroes that a broad OCR row drops.
          // Use the same numeric ROI as selected/folded prices before wider rows.
          const digit=number(this.numericAt(f,this.observedRoi("handExpanded", [Math.round(m.x+12),Math.round(m.y-5),36,42]),4));
          localRecoveryCalls++;
          if(digit!==null){numbers.push({value:digit,x:m.x+28,y:m.y+15});continue;}
          // Only missing locations: at most three wider crops on the SAME frame.
          // No clicks, title expansion, guessed values, or unbounded ROI search.
          let recovered = false;
          for (const [dx, dy, w, h] of [
            [0, -30, 60, 90],
            [8, -18, 44, 68],
            [-4, -30, 68, 90],
          ]) {
            const local = costNumbersAt(
              m,
              costDigitRows(
                this.enlargedOcrRows(f, this.observedRoi("handExpanded", [Math.floor(m.x + dx), Math.floor(m.y + dy), w, h]), 4),
              ),
            );
            localRecoveryCalls++;
            if (local.length > 1) {
              numbers.push(...local);
              unresolved("ambiguous-digit", { marker: m, numbers, local });
              recovered = true;
              break;
            }
            if (local.length === 1) {
              numbers.push(local[0]);
              recovered = true;
              break;
            }
          }
          if (!recovered)
            unresolved("missing-digit", { marker: m, numbers, localRecoveryCalls });
        }
        const sample = costHandSample(layout, numbers);
        return { ...sample, localRecoveryCalls };
      });
    }
    selectedCardCostIn(f, x) {
      const roi = [Math.round(x - 125), this.point("handExpanded",0,750)[1], 80, 140];
      const marks = this.handCostMarkersIn(f, this.observedRoi("handExpanded", roi))
        .filter(m => Math.abs(m.x + 103 - x) <= 32).sort((a,b) => a.y - b.y);
      if (!marks.length) return null;
      const m = marks[0];
      const read = this.handPriceIn(f, m);
      let cost = read.cost;
      if (read.reads > 1) {
        this.trace("selected-cost-retry", { point:x, cost, additionalInputs:0 });
      }
      if (cost === null) {
        const p = this.selectedCostProof, age = p ? Date.now() - p.at : Infinity;
        const index = p ? p.points.indexOf(x) : -1;
        if (p && this.inputRevision === p.revision + 1 && age >= 0 && age <= 5000 && TCG.known(p.costs[index])) {
          cost = p.costs[index];
          this.trace("selected-cost-reused", { index, cost, proof:"two-native-cost-frames-before-selection", additionalInputs:0 });
        }
      }
      if (cost === null) this.trace("selected-cost-unread", { point:x, marker:m });
      return cost;
    }
    handSample(f, priceIndex = null) {
      this.lastCostSample = null;
      const count = this.handCountIn(f);
      let cost = this.lastCostSample;
      // Quantity/positions need corners, not every digit. Only the impending
      // target gets a price proof on these same preselection frames.
      if (count > 0 && this.handFanReady) {
        const layout = this.handCostLayoutIn(f, count);
        if (layout) {
          cost = { ...costHandSample(layout, []), revision: this.inputRevision, at: Date.now() };
          if (priceIndex !== null && priceIndex < count)
            cost.costs[priceIndex] = this.handPriceIn(f, layout.markers[priceIndex]).cost;
        }
      }
      return { count, cost, source: this.lastHandCountSource };
    }
    foldedHandCostsIn(f, layout) {
      // The same native digits (including green prices), on an already bound
      // folded row. A missing price does not invalidate any card identity.
      const numbers=costDigitRows(this.enlargedOcrRows(f,this.roi("handFolded", [430,965,1050,70]),3));
      const costs=layout.slots.map(({marker})=>{
        const found=costNumbersAt(marker,numbers);
        if(found.length===1&&found[0].value<10)return found[0].value;
        if(found.length>1)return null;
        return number(this.numericAt(f,this.observedRoi("handFolded", [marker.x+12,marker.y-5,36,42]),4));
      });
      return {costs,source:"native-folded-cost-markers"};
    }
    handEmpowermentIn(f, markers) {
      // A covered/missing badge is unknown, never proof of no empowerment.
      return markers.map(m => this.matches(f, "hand_empowered",
        this.observedRoi("handExpanded", [Math.round(m.x + 68), Math.round(m.y - 12), 68, 66]), .92, true).length ? true : null);
    }
    publishHandPositions(samples, count) {
      this.handPositionProof = null;
      if (samples.length < 2 || !this.handFanReady) return;
      const [a, b] = samples.slice(-2),
        p = a.cost,
        q = b.cost;
      if (
        !p ||
        !q ||
        a.count !== count ||
        b.count !== count ||
        p.count !== count ||
        q.count !== count ||
        p.revision !== this.inputRevision ||
        q.revision !== this.inputRevision ||
        p.points.length !== count ||
        q.points.length !== count ||
        p.costs.length !== count ||
        q.costs.length !== count ||
        p.markerYs.length !== count ||
        q.markerYs.length !== count ||
        [p, q].some(
          (s) => !Number.isFinite(s.at) || Date.now() - s.at < 0 || Date.now() - s.at > 5000,
        ) ||
        p.points.some(
          (x, i) =>
            !Number.isFinite(x) || !Number.isFinite(q.points[i]) || Math.abs(x - q.points[i]) > 8,
        ) ||
        p.markerYs.some(
          (y, i) =>
            !Number.isFinite(y) ||
            !Number.isFinite(q.markerYs[i]) ||
            Math.abs(y - q.markerYs[i]) > 8,
        )
      )
        return;
      this.handPositionProof = {
        count,
        points: q.points.slice(),
        costs: q.costs.map((cost, i) => cost === p.costs[i] ? cost : null),
        revision: this.inputRevision,
        at: q.at,
      };
      this.trace(this.handPositionProof.costs.some(TCG.known)?"hand-cost-proof":"hand-position-proof", {
        count,
        points: q.points,
        costs: this.handPositionProof.costs,
        stableReads: 2,
        localRecoveryCalls: q.localRecoveryCalls,
        additionalInputs: 0,
      });
    }
    handPoints(count) {
      const p = this.handPositionProof,
        age = p ? Date.now() - p.at : Infinity;
      return p &&
        p.count === count &&
        p.revision === this.inputRevision &&
        age >= 0 &&
        age <= 5000 &&
        this.handFanReady
        ? p.points.slice()
        : (handX[count] || []).slice();
    }
    handCountIn(f) {
      this.lastCostSample = null;
      this.lastHandCountSource = null;
      const counts = [];
      for (let n = 5; n <= 10; n++)
        if (this.has(f, "num/Hand" + n, this.roi("handExpanded", [1463, 700, 439, 124]), 0.92)) counts.push(n);
      if (counts.length > 1) {
        const error = new Error("手牌数量模板相互冲突：" + JSON.stringify(counts));
        error.code = "TCG_HAND_RETRY";
        throw error;
      }
      if (counts.length === 1) {
        this.lastHandCountSource = "native-badge";
        return counts[0];
      }
      const n = number(this.ocr(f, this.roi("handExpanded", [1730, 700, 170, 124])));
      if (n !== null && n <= 10) {
        this.lastHandCountSource = "native-badge";
        return n;
      }
      if (!this.handFanReady) return null;
      const layout = this.handCostLayoutIn(f);
      if (layout) {
        // An unbound row still checks outer numeric evidence. No per-slot
        // digit recovery is needed just to establish quantity/positions.
        const y=Math.floor(Math.max(this.point("handExpanded",0,750)[1],Math.min(this.point("handExpanded",0,840)[1],Math.min(...layout.markers.map(m=>m.y))-40))),
          numbers=layout.measuredCount===null?costDigitRows(this.enlargedOcrRows(f,this.observedRoi("handExpanded", [470,y,1290,110]),3)):[],
          sample=costHandSample(layout,numbers);
        if(sample){
          this.lastHandCountSource = "full-cost-layout";
          this.lastCostSample = { ...sample, revision: this.inputRevision, at: Date.now() };
          return layout.count;
        }
      }
      // Grayscale rim gradient: usable-card gold glow must not change count.
      const rimCount = this.memoFrame(f, "hand/rim-count", () => handLayoutCount(
        this.matches(f, "hand_rim", this.roi("handExpanded", [500, 900, 1260, 135]), 0.85, false).map((r) => r.x),
      ));
      if (rimCount !== null) this.lastHandCountSource = "full-rim-layout";
      return rimCount;
    }
    recordHandLayout(count) {
      const key = "hand-layout:" + count;
      if (count >= 1 && count <= 4 && !this.diagnosticKeys.has(key)) {
        this.trace("hand-layout", { count });
        this.diagnosticKeys.add(key);
      }
    }
    async handCount(expected = null) {
      await this.expand();
      const readCount = () =>
        this.frame((f) => {
          // The fan's count badge is transient. Collect consecutive read-only
          // count frames quickly; full phase OCR between them can outlive it.
          // A fresh phase guard follows the bounded sampling BEFORE any input.
          const sample = this.handSample(f);
          return { ...sample, presence: (sample.count === null || sample.count === 0)
            ? this.handPresenceIn(f) : { state:"present", reason:"positive-count" } };
        });
      const reads = [],
        samples = [];
      let previous = null, emptySince = null;
      const revision = this.inputRevision;
      for (let attempt = 0; attempt < 8; attempt++) {
        const sampledAt = Date.now();
        const sample = readCount(),
          result =
            Number.isInteger(sample.count) && sample.count >= 0 && sample.count <= 10
              ? sample.count
              : null;
        reads.push(result);
        samples.push(sample);
        // Zero requires fresh structural absence as well as a stable view.
        // A lone OCR zero, an old empty flag, or missing fee digits is not zero.
        const empty = sample.presence.state === "absent";
        const resolved = empty ? 0 : result === 0 ? null : result;
        if (empty) emptySince ??= Date.now(); else emptySince = null;
        reads[reads.length - 1] = resolved;
        if (this.inputRevision !== revision) {
          const error = new Error("手牌计数期间输入已变化"); error.code = "TCG_HAND_RETRY"; throw error;
        }
        if (resolved !== null && resolved === previous &&
            (resolved !== 0 || Date.now() - emptySince >= 600)) {
          this.requireHandObservation(this.phase(), "hand-count-resolved");
          this.publishHandPositions(samples, resolved);
          if (this.emptyHandProven && resolved > 0) {
            this.emptyHandProven = false;
            this.invalidateHand("visible-cards-after-empty-hand");
          }
          this.trace("hand-count", { count: resolved, reads,
            source: resolved === 0 ? "card-structure-absence" : sample.source,
            ...(resolved === 0 ? { stableMs:Date.now()-emptySince, revision, presence:sample.presence } : {}) });
          this.recordHandLayout(resolved);
          return resolved;
        }
        previous = resolved;
        // Recycle/discount and drawn-card animations can outlast the transient
        // badge. Keep the same raised fan and wait read-only, rather than
        // immediately toggling it. The normal two-clean-frame path is unchanged.
        const remaining = (attempt < 3 ? 120 : 300) - (Date.now() - sampledAt);
        if (attempt < 7 && remaining > 0) await sleep(remaining);
      }
      this.requireHandObservation(this.phase(), "hand-count-unresolved");
      this.trace("hand-count-unresolved", {
        expected, revision,
        samples:samples.map((s,i)=>({ count:reads[i], source:s.source, presence:s.presence })),
      });
      const knownCounts = [...new Set(reads.filter((n) => n !== null))];
      if (knownCounts.length > 0) {
        const error = new Error(
          (knownCounts.length > 1 ? "手牌计数复读不稳定：" : "手牌计数未得到连续证据：") +
            JSON.stringify(reads),
        );
        error.code = "TCG_HAND_RETRY";
        throw error;
      }
      // Missing badge/rim evidence is never a guessed zero or a reason to
      // click candidate positions. Retry read-only on the same raised fan.
      const error = new Error("无法确认手牌数量");
      error.code = "TCG_HAND_RETRY";
      throw error;
    }
    async readHandTitles(cards, points, scan = { titles: 0 }) {
      for (let i = 0; i < cards.length; i++) if (!cards[i]) {
        scan.titles++;
        const raw = await this.titleAt(points[i], 945, false, false, "card", null, true);
        const card = TCG.observedCard(raw, i);
        if (!card || scan.titleCandidates?.[i] && !scan.titleCandidates[i].includes(card.id)) {
          const error = new Error("第 " + (i + 1) + " 张手牌卡名无法可靠读取：" + (raw || "OCR为空"));
          error.code = "TCG_HAND_RETRY";
          throw error;
        }
        cards[i] = card;
      }
    }
    async readHand(expected = this.handCountHint, evidence = null, scan = { titles: 0 }) {
      const started = Date.now(), titlesBefore = scan.titles;
      let observed = null, failure = null;
      try {
        // One owner for the read transaction. The artwork adapter only seeds
        // identities/count; it cannot finish a second title/reset lifecycle.
        if (!scan.cards && this.readFoldedHand)
          evidence = await this.readFoldedHand(expected, evidence, scan);
        // Evidence passed here was obtained in this very observation, not an
        // estimated count or the previous action's projected hand.
        const n = evidence ? evidence.count : await this.handCount(expected);
        // This scratch list belongs to one observe() call: no submitted action,
        // phase transition or next round can inherit it. A changed native count
        // replaces it; a failed title alone does not erase successful slots.
        if (scan.cards && scan.cards.length !== n) scan.titleCandidates = null;
        const hand = scan.cards?.length === n ? scan.cards : Array(n).fill(null);
        scan.cards = hand;
        // Establish the expanded fan once. Selecting a card only raises that
        // card; it does not require resetting/re-expanding the whole hand.
        if (n > 0 && !hand.every(Boolean) && !this.handFanReady) {
          await this.expand();
        }
        this.handScanSerial++;
        // Copy all positions before the first title click invalidates the proof.
        // Selection raises one card but does not reorder the rest of this fan.
        const points = this.handPoints(n);
        await this.prepareHandObservation?.(n);
        if (!scan.route) scan.route = "expanded-artwork-fallback";
        this.trace("hand-scan", { count: n, expected, reusedCount: !!evidence, route: scan.route });
        await this.fillHandArtwork?.(hand, scan);
        await this.readHandTitles(hand, points, scan);
        observed = this.finishHandObservation ? this.finishHandObservation(hand, scan) : hand;
        if (this.handFanReady || this.handNeedsReset) {
          this.requireHandObservation(this.phase(), "before-hand-reset");
          // A proven empty fan cannot obscure the board; there is nothing to fold.
          if (n === 0) {
            this.handFanReady = false;
            this.handNeedsReset = false;
            this.boardReady = true;
          } else await this.reset();
        }
        this.handCountHint = null;
        return observed;
      } catch (e) { failure = e; throw e; }
      finally {
        // Do not click in finally: a failed title retains this observation's
        // known slots; a changed phase belongs to the recovery/phase owner.
        try { this.trace("hand-read-completed", { route: scan.route || "expanded-artwork-fallback",
          count: observed?.length ?? null, titleSlots: scan.titles - titlesBefore,
          elapsedMs: Date.now() - started }); } catch (e) { if (!failure) throw e; }
      }
    }
    async observedHand(plan = null, scan = { titles: 0 }) {
      if (!plan && this.handContinuation) Object.assign(scan, this.handContinuation);
      // The action guarantees these old cards survive in the same order.
      // If the current native count is exactly that list's length, there is
      // no unidentified insertion to scan. Keep identity separate from view
      // and price; a changed/missing count follows the normal full reader.
      const retained = plan?.mode === "full" ? plan : !plan ? this.handContinuation : null;
      if (retained?.retainedHandOrder === true && retained.retainedHand?.length > 0) {
        const count = this.frame(f => {
          this.requireHandObservation(this.phaseIn(f), "before-retained-hand-reuse");
          const native = this.handCountIn(f);
          if (native !== null || this.handFanReady || this.handNeedsReset) return native;
          const row = this.collapsedLayoutIn?.(f);
          if (row?.status !== "readable") return null;
          this.lastHandCountSource = "full-folded-layout";
          return row.count;
        });
        if (count === retained.retainedHand.length) {
          if (this.handFanReady || this.handNeedsReset) await this.reset();
          this.trace("hand-retained-reused", { count, source:this.lastHandCountSource,
            proof:"retained-order-and-current-native-count", titleInputs:0 });
          return TCG.indexedHand(retained.retainedHand);
        }
      }
      if (plan?.mode === "full") {
        const session = this.confirmationSession,
          observed = session?.handObservation;
        if (observed && observed.revision === this.inputRevision) {
          session.handObservation = null;
          const count = this.frame(f => {
            this.requireHandObservation(this.phaseIn(f), "before-pending-hand-reuse");
            return this.handCountIn(f);
          });
          if (count === null || count === observed.hand.length) {
            session.handObservation = observed;
            this.trace("hand-full-read-reused", { count: observed.hand.length, visibleCount: count,
              proof: "completed-native-read-in-same-pending-action", additionalInputs: 0 });
            return TCG.indexedHand(observed.hand);
          }
        }
        scan.retainedHand = plan.retainedHand || plan.rejectedHand;
        scan.retainedHandOrder = plan.retainedHandOrder === true || !!plan.rejectedHand;
        scan.retainedVariantFamilies = plan.retainedVariantFamilies;
        scan.settling = true;
        this.invalidateHand("generated-drawn-or-replaced-card", this.handContinuation);
        let hand = await this.readHand(plan.expectedCount ?? null, null, scan);
        if (plan.rejectedHand && !this.autoRisk)
          hand = TCG.reconcileHand(plan.rejectedHand, hand, true);
        if (session) session.handObservation = { hand: TCG.indexedHand(hand), revision: this.inputRevision };
        return hand;
      }
      if (plan?.mode === "remove") {
        const proof = plan.preResetEvidence,
          receipt = this.consumptionReceipt;
        const age = proof ? Date.now() - proof.at : Infinity;
        if (
          proof &&
          receipt?.inputSent &&
          ["card", "tune"].includes(plan.action?.type) &&
          proof.beforeKey === TCG.boardKey(plan.before) &&
          proof.id === plan.action.id &&
          proof.index === plan.action.index &&
          proof.target === (plan.action.target ?? null) &&
          proof.beforeKey === receipt.beforeKey &&
          proof.id === receipt.id &&
          proof.index === receipt.index &&
          proof.target === receipt.target &&
          proof.count === plan.hand.length &&
          proof.stableReads >= 2 &&
          proof.revision === this.inputRevision &&
          age >= 0 &&
          age <= 5000 &&
          !this.handFanReady &&
          !this.handNeedsReset
        ) {
          const count = this.frame((f) => this.handCountIn(f));
          if (count === null || count === proof.count) {
            this.trace("hand-incremental", {
              mode: "remove",
              count: proof.count,
              proof: "two-native-counts-before-single-reset",
            });
            return TCG.indexedHand(plan.hand);
          }
          this.invalidateHand("unexpected-count-after-pre-reset-proof");
          return await this.readHand(null, null, scan);
        }
        if (plan.effectProven || plan.paidProven) {
          // The settled board proves consumption independently. A visible count
          // disagreement still forces a real scan; unreadable badge is not zero.
          const count = this.frame(f => this.handCountIn(f));
          if (count === null || count === plan.hand.length) {
            this.trace("hand-incremental", { mode:"remove", count:plan.hand.length,
              proof:plan.paidProven?"confirmed-paid-card-current-board":"independent-native-effect", visibleCount:count });
            return TCG.indexedHand(plan.hand);
          }
          this.emptyHandProven = false;
          this.invalidateHand("unexpected-post-effect-count");
          return await this.readHand(null, null, scan);
        }
        // Publishing the projected list requires native count evidence first.
        // The independent resource/HP/energy effect is still checked by confirm.
        if (plan.hand.length === 0 && this.emptyHandProven) {
          this.trace("hand-incremental", { mode:"remove", count:0, proof:"independent-empty-hand-effect" });
          return TCG.indexedHand(plan.hand);
        }
        const n = plan.countObservation?.revision === this.inputRevision
          ? plan.countObservation.count : await this.handCount(plan.hand.length);
        if (n === plan.hand.length) {
          this.requireHandObservation(this.phase(), "before-incremental-reset");
          await this.reset();
          this.trace("hand-incremental", { mode:"remove", count:n, proof:"native-count" });
          return TCG.indexedHand(plan.hand);
        }
        this.invalidateHand("unexpected-post-action-count");
        return await this.readHand(null,{count:n},scan);
      }
      const cached = plan?.mode === "unchanged" ? plan.hand : this.handCache;
      if (cached !== null && cached !== undefined) {
        // A preceding hand-changing action can insert/reorder cards without a
        // net count change. Compare that current row before reusing its order.
        const {count,row}=this.frame(f=>({count:this.handCountIn(f),
          row:!plan&&this.handContinuation&&!(this.handContinuation.retainedHandOrder===true&&
            this.handContinuation.retainedHand?.length===cached.length)&&!this.handFanReady&&!this.handNeedsReset
            ?this.collapsedIn?.(f):null}));
        const changed=row?.status==="readable"&&(row.count!==cached.length||
          row.slots.some(s=>s.id&&s.id!==cached[s.index]?.id));
        if (!changed && (count === null || count === cached.length)) {
          this.trace("hand-cache-reused", { count:cached.length, mode:plan?.mode || "cached", visibleCount:count });
          return TCG.indexedHand(cached);
        }
        this.invalidateHand(changed ? "current-hand-row-changed" : "unexpected-visible-count", this.handContinuation);
        if(row?.status==="readable")scan.foldedRead={...row,nativeCount:count,
          countConflict:count!==null&&count!==row.count};
      }
      return await this.readHand(null, null, scan);
    }
    async settledBoard(_pendingAction = false, firstBoard = null) {
      // A failed hand read or completed choice can leave cards/details raised.
      // Normalize at the full-board boundary, never OCR obscured HP in a loop.
      if (this.handFanReady || this.handNeedsReset) {
        const phase = this.phase();
        if (phase.phase !== "board" || phase.turn !== "user") return { ...phase, hand: null };
        await this.reset();
        firstBoard = null;
      }
      this.prepareBoardObservation?.();
      const requiredReads = this.autoRisk ? 2 : 1;
      let stableReads = 0, hpGapReads = 0;
      let last = null, previousBoard = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        const sampledAt = Date.now();
        try { last = attempt === 0 && firstBoard ? firstBoard : this.board(true); }
        catch (e) {
          if (e.code !== "TCG_DICE_RETRY") throw e;
          previousBoard = null; stableReads = 0; hpGapReads = 0;
          this.trace("board-settle-wait", { attempt, missing: ["dice"], reason: e.message });
          const remaining = 400 - (Date.now() - sampledAt);
          if (attempt < 11 && remaining > 0) await sleep(remaining);
          continue;
        }
        if (last.result || ["pick", "roll", "settlement", "choice"].includes(last.phase) || last.turn === "enemy") {
          this.releasePrecisionBoard("scene-exit");
          return { ...last, hand: null };
        }
        const issues = this.observationIssues(last);
        const hpGap = last.phase === "board" && last.turn === "user" &&
          [...(last.characters || []), ...(last.enemies || [])].some(c => c?.dead !== true && !TCG.alive(c));
        hpGapReads = hpGap ? hpGapReads + 1 : 0;
        if (hpGapReads === 1 && await this.dismissCharacterOverview("board-hp-gap")) {
          previousBoard = null; stableReads = 0; hpGapReads = 0;
          continue;
        }
        if (!issues.length) {
          if (this.boardsMatch(previousBoard,last)) stableReads++;
          else stableReads = 1;
          // Ordinary actions need a complete current board, not repeated
          // equality. Combat/automatic effects retain one corroborating frame.
          if (stableReads >= requiredReads) {
            if (this.autoRisk) this.trace("automatic-settled", { active: last.active, proof: "two-complete-native-boards" });
            this.autoRisk = false;
            if (last.normalHpReadable === true) this.releasePrecisionBoard("complete-normal-hp-profile");
            const observed=previousBoard ? this.stabilizeBoardExtras?.(previousBoard,last)||last : last;
            return { ...observed, nativeStability: { reads: stableReads, key: TCG.boardKey({ ...observed, hand: [] }), inputRevision: this.inputRevision } };
          }
        } else stableReads = 0;
        const changes=previousBoard?boardDifferences(previousBoard,last,true):{};
        previousBoard = issues.length ? null : last;
        this.trace("board-settle-wait", { attempt, phase: last.phase, turn: last.turn,
          valid: issues.length === 0, missing: issues, hpGapReads, changed:Object.keys(changes),changes });
        if (hpGapReads === 3 && !this.precisionBoard) {
          this.usePrecisionBoard("three-consecutive-user-hp-gaps");
          previousBoard = null; stableReads = 0;
        }
        const remaining = 400 - (Date.now() - sampledAt);
        if (attempt < 11 && remaining > 0) await sleep(remaining);
      }
      const missing = last ? this.observationIssues(last) : ["capture"];
      const error = new Error("行动页12次读取未稳定" + (missing.length ? "：" + missing.join("、") : ""));
      error.code = "TCG_BOARD_RETRY"; error.missing = missing;
      throw error;
    }
    diceBudgetMatches(state) {
      if (this.expectedDice !== null && state.phase === "board" && state.turn === "user") {
        const extra = TCG.total(state.dice) - this.expectedDice;
        const gambler = this.gamblerBudget,
          afterCount = TCG.enemyCount(state);
        // Gambler refunds require actual defeats while its wearer is active,
        // and can never exceed the remaining match-wide uses. An arbitrary
        // +2/+4/+6 resource discrepancy is not evidence that this effect fired.
        const defeats =
          gambler?.enemies !== null && gambler?.enemies !== undefined && afterCount !== null
            ? Math.max(0, gambler.enemies - afterCount)
            : 0;
        const refund =
          gambler?.remaining > 0 && state.active === gambler.owner
            ? 2 * Math.min(gambler.remaining, defeats)
            : 0;
        return extra === 0 || extra > 0 && Array.from({length:refund/2},(_,i)=>
          Math.min(16,this.expectedDice+2*(i+1))-this.expectedDice).includes(extra);
      }
      return true;
    }
    requireDiceBudget(state) {
      if (!this.diceBudgetMatches(state))
        throw new Error("骰子识别与已确认行动预算不符：预期 " + this.expectedDice + "，读取 " + TCG.total(state.dice));
    }
    async observe(pendingAction = false, plan = null) {
      // The first fresh action-only board already contains its phase. Reuse it
      // instead of a separate full phase capture. Combat alone corroborates
      // a second board; ordinary complete observations do not wait for equality.
      const p = this.initialObservationBoard?.() || null;
      if (p && (p.phase !== "board" || p.turn !== "user")) return { ...p, hand: null };
      let hand = null;
      const scanBefore = this.handScanSerial;
      const handScan = { titles: 0 };
      // One recovery budget per pending action, not per 45-second poll.
      const recovery = this.confirmationSession
        ? (this.confirmationSession.handRecovery ||= { failures:0 })
        : { failures:0 };
      this.emptyHandProven = false;
      this.pendingHandEvidence = null;
      let reusableSettled = null,
        reusableSettledAt = 0;
      let settled = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        // A failed quantity/title read may leave the same fan raised. Keep it
        // for read-only retries; only the single explicit re-anchor folds it.
        if (!settled) settled = await this.settledBoard(true, attempt === 0 ? p : null);
        if (settled.phase !== "board" || settled.turn !== "user") return { ...settled, hand: null };
        if (!this.handNeedsReset && !this.handFanReady) this.boardReady = true;
        const handReadStart = Date.now(),
          handInputRevision = this.inputRevision;
        if (
          plan?.mode === "remove" &&
          plan.hand.length === 0 &&
          plan.action &&
          TCG.emptyHandEffect(
            plan.action,
            plan.before,
            settled,
            plan.transitionPassed === true,
          )
        ) {
          this.emptyHandProven = true;
          this.trace("empty-hand-proof", {
            action: plan.action,
            proof: "independent-native-effect",
            transition: plan.transitionPassed === true,
          });
        }
        const effectProven =
          plan?.mode === "remove" &&
          plan.action &&
          (TCG.removalEffect(plan.action, plan.before, settled) ||
            (plan.action.type === "card" &&
              plan.action.id === "toss" &&
              plan.rerollConfirmed === true &&
              settled.active === plan.before.active &&
              TCG.total(settled.dice) === TCG.total(plan.before.dice)));
        try {
          if (plan?.mode === "remove" && plan.hand.length === 0 && !this.emptyHandProven)
            await this.proveEmptyHand(plan, settled);
          const paidProven = this.paidRemovalProven?.(plan, settled) === true;
          hand = await this.observedHand(effectProven || paidProven ? { ...plan, effectProven, paidProven } : plan, handScan);
          if(this.handScanSerial===scanBefore&&this.refreshHandFacts)
            hand=this.refreshHandFacts(hand);
          if (this.pendingChoiceCard) {
            const { id, oldCount } = this.pendingChoiceCard;
            // Cached identities cannot prove that generation failed. Read the
            // current hand once, then accept its negative evidence too rather
            // than retrying until a predicted card appears.
            if (oldCount !== 10 && !hand.some(c => c.id === id) && this.handScanSerial === scanBefore)
              hand = await this.observedHand({ mode:"full", expectedCount:null }, handScan);
            const present = hand.some(c => c.id === id), overflowPossible = oldCount === 10,
              unresolved = !present && !overflowPossible;
            if (this.choiceReceipt)
              this.choiceReceipt = { ...this.choiceReceipt, generatedPresent:present, overflowPossible, unresolved };
            this.trace("choice-card-verified", {
              id,
              count: hand.length,
              present, overflowPossible, unresolved,
            });
            this.pendingChoiceCard = null;
          }
          if (
            attempt === 0 && this.inputRevision === handInputRevision &&
            !this.handFanReady &&
            !this.handNeedsReset
          ) {
            if (Date.now() - handReadStart <= 700) {
              if(this.handScanSerial>scanBefore){
                const phase=this.phase();
                if(phase.result||phase.phase!=="board"||phase.turn!=="user")return {...phase,hand:null};
              }
              reusableSettled = settled;
              reusableSettledAt = handReadStart;
            }
          }
          break;
        } catch (e) {
          if (e.code === "TCG_OBSERVATION_INTERRUPTED") return { ...e.phase, hand: null };
          if (e.code !== "TCG_HAND_RETRY") throw e;
          recovery.failures++;
          this.trace("hand-read-deferred", { attempt, failures:recovery.failures, error: String(e.message || e) });
          if (recovery.failures >= 3) {
            const error = new Error("手牌观察三次仍未核实，已停止本局；保留已提交动作，不重复出牌。原因：" + e.message);
            error.code = "TCG_HAND_UNRESOLVED";
            error.cause = e;
            throw error;
          }
          if (recovery.failures === 2) {
            // A genuine second failed observation, not every normal scan.
            // Re-anchor once, then require new evidence; never resend a card.
            try {
              this.requireHandObservation(this.phase(), "before-hand-reanchor");
            } catch (interrupted) {
              if (interrupted.code === "TCG_OBSERVATION_INTERRUPTED")
                return { ...interrupted.phase, hand: null };
              throw interrupted;
            }
            this.invalidateHand("two-unresolved-hand-observations");
            this.boardReady = false;
            await this.reset();
            settled = null;
            this.trace("hand-reanchored", {
              attempt,
              maximumPerPendingAction: 1,
              replayedAction: false,
            });
          }
          await sleep(400);
        }
      }
      const handRead = this.handScanSerial > scanBefore ||
        plan?.mode === "full" && this.confirmationSession?.handObservation?.revision === this.inputRevision
        ? "full" : "cached";
      // Board snapshot comes after closing card-detail overlays.
      if (reusableSettled) {
        const state = { ...reusableSettled, hand, ...(this.pendingHandEvidence ? { handEvidence: this.pendingHandEvidence } : {}) };
        this.trace("board-snapshot-reused", {
          scope: "same-settled-observation-no-input",
          handCount: hand.length,
        });
        return this.finishObservation(state, pendingAction, handRead, reusableSettledAt);
      }
      let last = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const sampledAt = Date.now();
        try {
          last = this.board(true);
        } catch (e) {
          if (e.code !== "TCG_DICE_RETRY") throw e;
          this.trace("board-read-wait", { attempt, error: String(e.message || e) });
          const remaining = 300 - (Date.now() - sampledAt);
          if (attempt < 5 && remaining > 0) await sleep(remaining);
          continue;
        }
        if (
          last.result ||
          ["pick", "roll", "settlement", "choice"].includes(last.phase) ||
          last.turn === "enemy"
        ) {
          this.trace("observation-interrupted", { attempt, phase: last.phase, turn: last.turn });
          return { ...last, hand: null };
        }
        const state = { ...last, hand, ...(this.pendingHandEvidence ? { handEvidence: this.pendingHandEvidence } : {}) };
        if (!this.observationIssues(last).length && TCG.legalState(state)) {
          return this.finishObservation(state, pendingAction, handRead);
        }
        const remaining = 300 - (Date.now() - sampledAt);
        if (attempt < 5 && remaining > 0) await sleep(remaining);
      }
      this.trace("board-unstable", { last, pendingAction });
      // Preserve the already-read hand: another unstable board must NOT trigger
      // another hand scan. Recovery still requires a complete current board.
      settled = await this.settledBoard(true);
      if (settled.phase !== "board" || settled.turn !== "user") return { ...settled, hand: null };
      const recovered = { ...settled, hand, ...(this.pendingHandEvidence ? { handEvidence: this.pendingHandEvidence } : {}) };
      return this.finishObservation(recovered, pendingAction, handRead);
    }
    handPresenceIn(f) {
      // Presence and unreadability are different facts. This is a same-frame
      // observation, not another cache, predicted count or table-skin matcher.
      if (!this.handFanReady || this.choiceSession || this.pendingChoiceCard)
        return { state:"unknown", reason:"view-not-ready" };
      const phase = this.phaseIn(f);
      if (phase.result || phase.phase !== "board" || phase.turn !== "user")
        return { state:"unknown", reason:"phase", phase };
      // Incomplete card structure still vetoes zero. Keep both views: a
      // failed fan toggle can leave real folded cards. Prices are irrelevant.
      for (const [panel, rect] of [
        ["handExpanded", [450,750,1310,200]], ["handFolded", [430,977,1050,42]],
      ]) {
        const markers = this.handCostMarkersIn(f, this.roi(panel, rect), true);
        if (markers.length) return { state:"present", reason:"cost-marker", panel, markers };
      }
      const rims = this.matches(f, "hand_rim", this.roi("handExpanded", [500,900,1260,135]), .85, false);
      if (rims.length) return { state:"present", reason:"card-rim", rims };
      // Read the WHOLE header row, then assign text to the existing title
      // panels by position. Cropping the legacy skill title first can turn the
      // neighbouring opponent HUD into a false title ("已宣布结束" -> "束").
      // Unknown titles inside a panel remain blockers; no word allowlist or
      // special case for any opponent, language fragment or tablecloth.
      const titleAreas = [[311,115,341,50], [135,122,238,42]].map(rect => this.roi("details", rect).rect),
        rows = this.ocrRows(f, this.roi("details", [0,100,700,85])).filter(r => TCG.norm(r.text));
      for (const row of rows) {
        if (![row.x,row.y,row.w,row.h].every(Number.isFinite) || row.w <= 0 || row.h <= 0)
          return { state:"unknown", reason:"title-location-unreadable", row };
        // Top enemy-support counters can overlap the detail-title rectangle.
        // A full numeric row belongs to that badge only with a current card
        // rim beneath it. An open detail panel hides that rim, so its unknown
        // title still blocks absence. Neither a digit alone nor a missed OCR
        // is permission to ignore an overlay.
        const supportCounter = /^\d+$/.test(TCG.norm(row.text)) && [0,1].some(col => {
          const [x,y,w,h] = this.roi("board",[350+170*col,120,80,65]).rect,
            cx=row.x+row.w/2,cy=row.y+row.h/2;
          return cx>=x&&cx<=x+w&&cy>=y&&cy<=y+h&&
            this.matches(f,"hand_rim",this.roi("board",[350+170*col,130,80,190]),.85,false)
              .some(r=>Math.abs(r.x-cx)<=30&&r.y>=row.y+row.h);
        });
        if (supportCounter) continue;
        if (titleAreas.some(([x,y,w,h]) =>
          row.x >= x && row.x < x+w && row.y+row.h/2 >= y && row.y+row.h/2 <= y+h))
          return { state:"unknown", reason:"detail-title", row };
      }
      const banner = this.ocr(f, this.roi("phase", [600,510,720,65]));
      if (banner) return { state:"unknown", reason:"central-banner", text:banner };
      if (this.matches(f, "core/确定", this.roi("bottom", [770,900,380,90])).length ||
          this.cardPaymentControlsIn(f).length)
        return { state:"unknown", reason:"payment-control" };
      return { state:"absent", reason:"no-card-structure", outsideTitleRows:rows };
    }
    async proveEmptyHand(plan,settled) {
      const receipt=this.consumptionReceipt,a=plan?.action,b=plan?.before;
      if(plan?.mode!=="remove" || plan.hand.length!==0 || b?.hand?.length!==1 || !a ||
          !receipt?.inputSent || receipt.beforeKey!==TCG.boardKey(b) || receipt.id!==a.id ||
          receipt.index!==a.index || receipt.target!==(a.target??null) ||
          settled.phase!=="board" || settled.turn!=="user")return false;
      const count = await this.handCount();
      // Share this observation with the ordinary removal path, even if a
      // deck's effect verifier needs more than empty-hand evidence.
      plan.countObservation = { count, revision: this.inputRevision };
      if (count !== 0) return false;
      const proof = { ...receipt, kind:"native-empty-fan", stableReads:2, sourceCount:1,
        method:"card-structure-absence", revision:this.inputRevision };
      if (!TCG.emptyHandEffect(a,b,{...settled,handEvidence:proof},false)) return false;
      this.pendingHandEvidence=proof;this.emptyHandProven=true;
      // With zero cards, expansion cannot cover the board. No fold toggle.
      this.handFanReady=false;this.handNeedsReset=false;this.boardReady=true;
      this.trace("empty-hand-proof",{action:a,proof,netDice:TCG.total(settled.dice)-TCG.total(b.dice)});
      return true;
    }
    
    async confirmOpening(data) {
      if (this.phase().phase !== "opening") throw new Error("确认起手前页面已改变");
      this.moveTo(1791, 860);
      await sleep(150);
      await this.clickButton("确定", this.roi("bottom", [720, 880, 480, 140]));
      // Confirm exactly once, then prove progression; no blind double-click.
      let stable = 0,
        previous = "";
      for (let attempt = 0; attempt < 40; attempt++) {
        const p = this.phase();
        const accepted = ["pick", "roll"].includes(p.phase);
        stable = accepted ? (p.phase === previous ? stable + 1 : 1) : 0;
        if (p.phase !== previous || attempt === 0)
          this.trace("opening-confirm-wait", { attempt, phase: p.phase });
        previous = p.phase;
        if (stable >= 2) {
          this.trace("opening-confirmed", { ...data, phase: p.phase });
          return p;
        }
        if (!["opening", "unknown", "transition", "pick", "roll"].includes(p.phase))
          throw new Error("起手确认后出现意外页面：" + p.phase);
        if (attempt < 39) await sleep(400);
      }
      throw new Error("初始手牌确认未生效：未进入稳定的选人或掷骰页");
    }
    async opening() {
      const startingXs = [383, 665, 960, 1248, 1535];
      if (TCG.openingSetting(this.options.mulligan) === "全部保留") {
        await this.confirmOpening({
          policy: "confirm-current",
          reason: "keep-setting",
          selectedByScript: [],
        });
        return;
      }
      // User and native tests confirmed hover does not reveal these titles.
      // One click reads a title AND toggles replacement; track the actual
      // marker, then adjust only the final mismatches. No hover probe.
      const original = await this.openingSelections(startingXs);
      let selected = original.slice(), pendingInspection = null;
      const cards = [];
      const recordInput = (index, purpose, observed) => {
        const verified = !!observed && observed.every((value, i) => value === (i === index ? !selected[i] : selected[i]));
        this.trace("opening-card-input", {index, purpose, before:selected[index], after:observed?.[index]??null, verified});
        return verified;
      };
      const toggle = async (index, purpose) => {
        // First card's centre is covered by its own left detail panel.
        this.clickAt(...this.point("opening",startingXs[index]+70,540));
        await sleep(350);
        let observed;
        try { observed = await this.openingSelections(startingXs); }
        catch (error) { recordInput(index, purpose, null); throw error; }
        if (!recordInput(index, purpose, observed)) {
          throw new Error("起手置换标记未证实，不重复点击第" + (index + 1) + "张牌");
        }
        selected = observed;
      };
      try {
        for (let i = 0; i < 5; i++) {
          pendingInspection = i;
          const raw = await this.titleAt(startingXs[i] + 70, 540, true, false);
          let observed;
          try { observed = await this.openingSelections(startingXs); }
          catch (error) { recordInput(i, "inspect-unknown", null); pendingInspection = null; throw error; }
          const verified = recordInput(i, "inspect-unknown", observed); pendingInspection = null;
          if (!verified) {
            throw new Error("起手读牌后的置换标记不符，不猜测选择状态");
          }
          selected = observed;
          const c = TCG.observedCard(raw, i);
          if (!c) throw new Error("第" + (i + 1) + "张初始牌标题未读清，不自动确认开局");
          cards.push(c);
          this.trace("opening-title-method", { index: i, method: "click", selectionChanged: true });
        }
      } catch (error) {
        // Recover only when the actual marker can still be read. Do not
        // confirm a game whose initial cards or selected replacements are unknown.
        let observed;
        try { observed = await this.openingSelections(startingXs); }
        catch (failure) { if(pendingInspection!==null)recordInput(pendingInspection,"inspect-unknown",null); throw failure; }
        if(pendingInspection!==null)recordInput(pendingInspection,"inspect-unknown",observed);
        selected = observed;
        for (let i = 0; i < 5; i++) if (selected[i] !== original[i]) await toggle(i, "rollback");
        throw error;
      }
      this.trace("opening", cards);
      const context = TCG.openingContext({});
      const plan = TCG.openingPlan(cards, original, context);
      this.openingCards = plan.keep;
      const wanted = plan.replace;
      this.trace("opening-plan", {
        cards,
        keep: cards.filter((h) => !wanted[h.index]).map((h) => h.id),
        replace: cards.filter((h) => wanted[h.index]).map((h) => h.id),
        replaceIndices: wanted.map((v, i) => (v ? i : -1)).filter((i) => i >= 0),
        duplicateWeaponIndices: plan.duplicateWeapons,
        context,
      });
      const final = wanted;
      // Settle kept inspection marks first; no undo after final replacements start.
      for (let i = 0; i < 5; i++) if (selected[i] && !final[i]) await toggle(i, "reconcile");
      for (let i = 0; i < 5; i++) if (!selected[i] && final[i]) await toggle(i, "reconcile");
      this.moveTo(1791, 860);
      this.trace("opening-selection-verified", {
        original,
        selected,
        proof: "two-stable-native-replace-labels-per-input",
      });
      await this.confirmOpening({
        policy: "known-priority",
        selectedByScript: selected.map((s, i) => (s ? i : -1)).filter((i) => i >= 0),
      });
    }
    async openingSelections(xs) {
      let previous = "",
        stable = 0;
      for (let attempt = 0; attempt < 8; attempt++) {
        const observation = this.frame((f) => ({
          phase: this.phaseIn(f).phase,
          labels: xs.map((x) => TCG.norm(this.ocr(f, this.roi("opening", [x - 100, 730, 200, 60])))),
        }));
        if (observation.phase !== "opening") throw new Error("起手置换检查期间页面改变");
        if (observation.labels.some((t) => t !== "" && t !== "替换")) {
          previous = "";
          stable = 0;
        } else {
          const key = JSON.stringify(observation.labels);
          stable = key === previous ? stable + 1 : 1;
          previous = key;
          if (stable >= 2) return observation.labels.map((t) => t === "替换");
        }
        await sleep(200);
      }
      throw new Error("初始牌置换标记未稳定");
    }
    async removalEvidenceBeforeReset(plan) {
      const r = this.consumptionReceipt,
        a = plan?.action,
        b = plan?.before;
      // Ordinary consumption only. Draw/recycle/talent and the final-card
      // empty-fan branch keep their existing independent native proofs.
      if (
        plan?.mode !== "remove" ||
        plan.hand.length === 0 ||
        !["card", "tune"].includes(a?.type) ||
        !r?.inputSent ||
        r.beforeKey !== TCG.boardKey(b) ||
        r.id !== a.id ||
        r.index !== a.index ||
        r.target !== (a.target ?? null) ||
        !this.handFanReady
      )
        return null;
      const revision = this.inputRevision;
      let stable = 0,
        last = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const sampledAt = Date.now();
        const p = this.frame((f) => {
          const phase = this.phaseIn(f);
          return {
            ...phase,
            count: phase.phase === "board" && phase.turn === "user" ? this.handCountIn(f) : null,
          };
        });
        // This sample is newer than confirm()'s entry phase. A late choice
        // or unreadable transition must interrupt, not authorize a reset
        // through the ordinary "no consumption evidence" return value.
        if (p.result || p.phase !== "board" || p.turn !== "user") {
          const error = new Error("收牌前消费核验期间页面变化：" + p.phase + "/" + p.turn);
          error.code = "TCG_OBSERVATION_INTERRUPTED";
          error.phase = { ...p, hand: null };
          throw error;
        }
        if (this.inputRevision !== revision) return null;
        stable =
          p.count === plan.hand.length && p.count === last
            ? stable + 1
            : p.count === plan.hand.length
              ? 1
              : 0;
        last = p.count;
        const remaining = 120 - (Date.now() - sampledAt);
        if (attempt === 0 && remaining > 0) await sleep(remaining);
      }
      this.trace("hand-pre-reset-proof", {
        id: a.id,
        count: last,
        expected: plan.hand.length,
        stableReads: stable,
        additionalInputs: 0,
      });
      return stable >= 2
        ? { ...r, count: last, stableReads: stable, at: Date.now(), revision }
        : null;
    }
    
    markNativeCardConfirmation(action,layout) {
      const r=this.consumptionReceipt;
      if(r?.inputSent===true && r.id===action.id && r.index===action.index && r.target===(action.target??null)) {
        r.nativeConfirmed=true;r.confirmationLayout=layout;
      }
    }
    firstPickObservation() {
      // Read the already-opened target title and phase from ONE fresh frame.
      // No startup inspection of all roles and no extra character-detail click.
      return this.frame((f) => {
        const p = this.phaseIn(f);
        return {
          ...p,
          selectedTarget:
            p.phase === "pick" ? TCG.characterName(this.ocr(f, this.roi("details", [311, 115, 341, 50]))) : null,
        };
      });
    }
    async pick(target, first = true) {
      if (!Number.isInteger(target) || target < 0 || target >= charX.length) throw new Error("出战角色索引无效");
      if(!first)return this.pickForced(target);
      if (this.phase().phase !== "pick") throw new Error("当前不是出战页");
      this.clickAt(...this.point("board",charX[target],720));
      this.trace("pick-target-clicked", { target, name:TCG.team[target].name, first, point:[charX[target],720] });
      await sleep(500);
      // A preselected card can confirm on the FIRST click (native 11:07 run).
      // Otherwise ChooseFirst uses the same card again, but only after positive
      // selected-target evidence. Never send a second input to a roll/board.
      let confirmationSent = false;
      let stable = 0, lastKey = "", last = { phase: "unknown", turn: "none" };
      for (let attempt = 0; attempt < 60; attempt++) {
        last = this.firstPickObservation();
        if (last.phase === "pick" && !confirmationSent && last.selectedTarget === target) {
          this.trace("pick-selected", { target, name:TCG.team[target].name, first, proof:"exact-target-title-on-pick-page" });
          this.clickAt(...this.point("board",charX[target],720));
          confirmationSent = true;
          this.trace("pick-confirm-clicked", { target, first, point:[charX[target],720], method:"official-character-card" });
          this.moveTo(1555, 860);
          stable = 0; lastKey = "";
          await sleep(500);
          continue;
        }
        let accepted = last.phase === "roll" || !!last.result;
        if (last.phase === "board" && ["user", "enemy"].includes(last.turn)) {
          try { last = this.board(); } catch (e) {
            if (!["TCG_BOARD_RETRY", "TCG_DICE_RETRY"].includes(e.code)) throw e;
            stable = 0; lastKey = ""; await sleep(400); continue;
          }
          accepted = last.phase === "board" && ["user", "enemy"].includes(last.turn) && last.active === target &&
            TCG.total(last.dice) > 0 && TCG.legalState({ ...last, turn: "user", hand: [] });
        }
        const key = JSON.stringify([last.phase, last.turn, last.result, last.active, last.characters,
          last.dice ? TCG.diceOrder.map(e => last.dice[e] || 0) : null]);
        stable = accepted ? key === lastKey ? stable + 1 : 1 : 0;
        if (key !== lastKey) this.trace("pick-wait", { target, first, attempt, phase: last.phase, turn: last.turn });
        lastKey = key;
        if (stable >= 2) { this.trace("pick-confirmed", { target, first, phase:last.phase, turn:last.turn,
          characterInputs:confirmationSent ? 2 : 1, method:"official-character-card" }); return last; }
        if (!["pick","unknown","transition","settlement","roll","board","result"].includes(last.phase)) {
          throw new Error("首次出战后出现意外页面：" + last.phase);
        }
        if (attempt < 59) await sleep(400);
      }
      throw new Error("出战角色确认未生效：未进入投骰页或完整稳定牌桌；最后页面 " + last.phase);
    }
    pickSelectionIn(f) {
      // Native forced selection can leave ALL character cards lowered. The
      // selected card opens its exact identity and a dedicated selection banner.
      return {
        who: TCG.characterName(this.ocr(f, this.roi("details", [311, 115, 341, 50]))),
        banner: TCG.norm(this.ocr(f, this.roi("phase", [700, 508, 580, 65]))),
      };
    }
    async pickForced(target) {
      // Official Character.SwitchWhenTakenOut selects and confirms on the
      // character card itself. Do not reuse first-pick tooltip/icon geometry.
      if(this.forcedPickSession)target=this.forcedPickSession.target;
      if(!this.forcedPickSession) {
        const initial=this.board(false, true);
        if(initial.result)return initial;
        if(initial.phase!=="pick" || !TCG.alive(initial.characters?.[target])) {
          const e=new Error("强制换人局面尚未核实");e.code="TCG_PICK_RETRY";throw e;
        }
        this.clickAt(...this.point("board",charX[target],720));
        this.forcedPickSession={target,confirmed:false};
        this.trace("forced-pick-selected",{target,name:TCG.team[target].name});
        await sleep(500);
      }
      let confirmed=this.forcedPickSession.confirmed,stable=0,key="",last=null;
      for(let attempt=0;attempt<40;attempt++) {
        try{last=this.board(false, true);}catch(e){
          if(!["TCG_DICE_RETRY","TCG_BOARD_RETRY"].includes(e.code))throw e;
          stable=0;key="";
          this.trace("forced-pick-read-deferred",{target,attempt,code:e.code});await sleep(400);continue;
        }
        if(last.result){this.forcedPickSession=null;return last;}
        const c=last.characters?.[target];
        const selected=last.pickSelection?.who===target &&
          ["请选择一位角色出战","请选择一个角色出战"].includes(last.pickSelection.banner);
        if(last.phase==="pick" && TCG.alive(c) && (c.raised===true || selected) && !confirmed) {
          // Positive selected-card evidence; exactly one confirmation input.
          this.clickAt(...this.point("board",charX[target],720));confirmed=true;this.forcedPickSession.confirmed=true;
          this.trace("forced-pick-confirm-clicked",{target,point:[charX[target],720],method:"official-character-card",
            proof:selected?"exact-target-title-and-pick-banner":"raised-living-target"});
          stable=0;key="";
        } else if(last.phase==="board" && ["user","enemy"].includes(last.turn) &&
            last.active===target && TCG.alive(c)) {
          const next=JSON.stringify([last.phase,last.turn,last.active]);
          stable=next===key?stable+1:1;key=next;
          if(stable>=2) {
            this.trace("forced-pick-confirmed",{target,phase:last.phase,turn:last.turn,confirmationInputs:confirmed?1:0});
            this.forcedPickSession=null;
            if (last.enemies?.some(e => e.dead !== true &&
                (!Number.isInteger(e.hp) || e.dead !== false)) &&
                await this.dismissCharacterOverview("forced-pick-handoff"))
              return this.board(false, true);
            return last;
          }
        } else if(last.phase==="board"&&last.turn==="user"&&last.active!==target) {
          const observed=await this.settledBoard(true,last);
          if(observed.phase==="board"&&observed.turn==="user"&&observed.active!==target){
            this.trace("forced-pick-handoff",{target,actualActive:observed.active,
              confirmationInputs:confirmed?1:0,proof:"complete-native-board-overrides-planned-target"});
            this.forcedPickSession=null;return observed;
          }
          stable=0;key="";
        } else if(["settlement","choice","roll"].includes(last.phase)) {
          // End-phase damage can require a replacement BEFORE remaining summons,
          // a blessing choice, and next-round dice. Hand off the stable native
          // phase; it is not proof of the target's final active/alive state.
          // A preselected target can finish on the FIRST card click. Native
          // phase exit is enough to transfer page ownership, never to assert
          // a cast, card consumption, or an unobserved active character.
          const next=JSON.stringify(["handoff",last.phase,last.turn]);
          stable=next===key?stable+1:1;key=next;
          if(stable>=2) {
            this.trace("forced-pick-handoff",{target,attempt,phase:last.phase,turn:last.turn,
              selectionInputs:1,confirmationInputs:confirmed?1:0,
              proof:"selection-input-and-two-stable-native-phase-exit-frames"});
            this.forcedPickSession=null;
            return {phase:last.phase,turn:last.turn};
          }
        } else {
          stable=0;key="";
          if(confirmed && last.phase==="pick" && c?.dead===true) {
            this.trace("forced-pick-defeated-again",{target});this.forcedPickSession=null;return last;
          }
          if(["opening","roll"].includes(last.phase))throw new Error("阵亡换人出现非预期起手/投骰页");
        }
        this.trace("forced-pick-wait",{target,attempt,phase:last.phase,turn:last.turn,confirmationSent:confirmed});
        await sleep(400);
      }
      const error = new Error("阵亡换人长时间未取得完整出战证据");
      error.code = "TCG_PICK_RETRY";
      throw error;
    }
    async roll(memory, { allowInitialPick = false } = {}) {
      // Only a first roll can lead to the still-pending first character pick.
      const mayPick = allowInitialPick && memory.round === 0;
      if (this.phase().phase !== "roll") throw new Error("当前不是投骰页");
      const observed = await this.readRollDice();
      if (this.phase().phase !== "roll") throw new Error("选择骰子前页面已改变");
      const plan = TCG.rerollPlan(observed.items, memory, memory.openingContext || {});
      const keep = plan.elements;
      for (let i = 0; i < observed.items.length; i++)
        if (!plan.indices.includes(i)) {
          const die = observed.items[i];
          this.clickAt(die.x, die.y);
          await sleep(130);
        }
      this.trace("reroll-plan", plan);
      if (this.phase().phase !== "roll") throw new Error("重投确认前已离开投骰页");
      await this.clickButton("确定");
      let stable = 0,
        lastKey = "",
        last = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        last = this.phase();
        const accepted =
          !!last.result ||
          (last.phase === "board" && ["user", "enemy"].includes(last.turn)) ||
          (mayPick && last.phase === "pick");
        const key = JSON.stringify([last.phase, last.turn, last.result]);
        stable = accepted ? (key === lastKey ? stable + 1 : 1) : 0;
        if (key !== lastKey)
          this.trace("roll-wait", { attempt, phase: last.phase, turn: last.turn });
        lastKey = key;
        if (stable >= 2) break;
        if (last.phase === "opening" || (last.phase === "pick" && !mayPick))
          throw new Error("重投确认后出现意外页面：" + last.phase);
        if (attempt < 29) await sleep(500);
      }
      if (stable < 2) throw new Error("重投确认未生效；最后页面 " + last.phase);
      TCG.nextRound(memory);
      const nextCount = this.handCache === null ? null : Math.min(10, this.handCache.length + 2);
      this.invalidateHand("new-round-draw-order-unknown");
      this.handCountHint = nextCount; // Common round draw is a candidate, not proof.
      this.handFanReady = false;
      this.handNeedsReset = false;
      this.boardReady = false;
      this.emptyHandProven = false; // Round draw adds two known cards (before deck exhaustion).
      this.consumptionReceipt = null;
      this.lastObservedAt = 0;
      this.lastObservedRevision = -1;
      this.expectedDice = 8;
      this.gamblerBudget = null;
      this.trace("round", { round: memory.round, keep });
      return last;
    }
    async drag(x, y, toX, toY) {
      // Validate BOTH endpoints before any movement or button press.
      const size = this.captureGeometry?.frameSize;
      const start = mousePoint(x, y, size), end = mousePoint(toX, toY, size);
      this.moveTo(start[0], start[1]);
      await sleep(60);
      this.requireMatchTime();
      this.checkInputGeometry();
      leftButtonDown();
      this.inputRevision++;
      this.handPositionProof = null;
      try {
        // Let the game acquire the selected card before the first long move.
        // Match official tuning's down/arrival holds; do not retry the drag.
        await sleep(100);
        for (let i = 1; i <= 10; i++) {
          this.moveTo(start[0] + (end[0] - start[0]) * i / 10, start[1] + (end[1] - start[1]) * i / 10);
          await sleep(15);
        }
        await sleep(100);
      } finally { leftButtonUp(); }
      await sleep(350);
    }
    warnings(frame = null) {
      const read = (f) => ({
        lack: this.has(f, "core/元素骰子不足", this.roi("viewport", [960, 0, 960, 1080])),
        text: this.ocr(f, this.roi("bottom", [1490, 790, 410, 250])),
      });
      return frame ? read(frame) : this.frame(read);
    }
    cardPaymentControlsIn(f) {
      // OCR Find returns only its first item, which may be a key hint. Read
      // complete native rows; confirmation still requires a unique exact label.
      return this.ocrRows(f, this.roi("bottom", [770, 900, 380, 90])).filter(
        (row) => TCG.norm(row.text) === "打出手牌",
      );
    }
    cardConfirmationEntryIn(f, targetedBanners = []) {
      const banner = this.cardBannerIn ? this.cardBannerIn(f) : this.ocr(f, this.roi("phase", [740, 510, 450, 65]));
      const phase = this.phaseIn(f);
      // A real target page owns a different input. Do not OCR its payment
      // control until the target owner has selected the character.
      const paymentPhase = phase.phase === "unknown" && phase.turn === "none";
      const targeted = paymentPhase && targetedBanners.includes(TCG.norm(banner));
      // Callers can reuse entry controls only in this phase. Other entries
      // still take their original fresh payment frames; no unused OCR here.
      return { banner, phase, ...(paymentPhase && !targeted ? { targets: this.cardPaymentControlsIn(f) } : {}) };
    }
    cardChoicePreviewIn(f, kind, phase = this.phaseIn(f)) {
      const banner = TCG.norm(this.ocr(f, this.roi("choice", kind === "target" ? [600, 510, 720, 65] : [740, 510, 450, 65]))),
        controls = this.cardPaymentControlsIn(f);
      return {
        banner, phase, controls,
        ...(kind === "target" && !controls.length ? { buttons: this.matches(f, "core/确定", this.roi("bottom", [770, 900, 380, 90])) } : {}),
      };
    }
    async waitForSample(sampledAt, interval, revision = this.inputRevision) {
      // Pure observation already spent part (or all) of the sampling interval.
      // An intervening click starts a new animation boundary: keep the full
      // old post-input wait rather than charging pre-input OCR against it.
      const remaining = revision === this.inputRevision ? interval - (Date.now() - sampledAt) : interval;
      const wait = Math.min(remaining, (this.matchDeadline ?? Infinity) - Date.now());
      if (wait > 0) await sleep(wait);
      this.requireMatchTime();
    }
    cardTargetPreviewIn(f) {
      const banner = TCG.norm(this.cardBannerIn ? this.cardBannerIn(f) : this.ocr(f, this.roi("phase", [740, 510, 450, 65]))),
        buttons = this.matches(f, "core/确定", this.roi("bottom", [770, 900, 380, 90]));
      return {
        banner, buttons,
        ...(!buttons.length ? { rows: this.ocrRows(f, this.roi("bottom", [770, 900, 380, 90])) } : {}),
        phase: this.phaseIn(f), warning: this.warnings(f),
      };
    }
    async requireNoWarning(warning = this.warnings()) {
      if (warning.lack || /无法|不足|不能|充能未满/.test(warning.text)) {
        const e = new Error("游戏拒绝动作：" + warning.text);
        e.code = "TCG_NATIVE_REJECTION";
        throw e;
      }
    }
    async requireSwitchPreview(action, memory) {
      // Native normal switching has NO bottom action label. Only the fast
      // status displays 快速行动; absence alone never identifies this overlay.
      const expectedSpeed = memory.fastSwitch ? "快速行动" : "";
      for (let attempt = 0; attempt < 10; attempt++) {
        const sampledAt = Date.now();
        const preview = this.frame((f) => ({
          phase: this.phaseIn(f),
          banner: this.ocr(f, this.roi("phase", [700, 508, 580, 65])),
          control: this.ocr(f, this.roi("bottom", [1720, 835, 195, 75])),
          speed: this.ocr(f, this.roi("bottom", [850, 972, 260, 60])),
          warning: this.warnings(f),
        }));
        await this.requireNoWarning(preview.warning);
        this.requireHandObservation(preview.phase, "switch-preview");
        const matched =
          preview.phase.phase === "unknown" &&
          preview.phase.turn === "none" &&
          TCG.norm(preview.banner) === "将所选角色切换为出战角色" &&
          TCG.norm(preview.control) === "切换角色" &&
          ["", "快速行动"].includes(TCG.norm(preview.speed));
        this.trace("switch-preview", {
          attempt,
          target: action.target,
          expectedSpeed,
          matched,
          ...preview,
        });
        if (preview.phase.phase === "board" && preview.phase.turn === "user" &&
            TCG.norm(preview.banner) === "元素骰子不足") {
          const error = new Error("游戏拒绝动作：" + preview.banner);
          error.code = "TCG_NATIVE_REJECTION";
          throw error;
        }
        const actualSpeed = TCG.norm(preview.speed);
        if (matched) return { fast: actualSpeed === "快速行动", speed: actualSpeed };
        if (preview.phase.phase === "board" && preview.phase.turn === "user" &&
            !TCG.norm(preview.banner) && !TCG.norm(preview.control)) {
          // The first click did not open payment (native handoff was still
          // running). Nothing was submitted: return to the existing state
          // owner, rather than polling a nonexistent overlay or confirming it.
          this.autoRisk = true;
          const error = new Error("切换付款页未打开，交回当前牌桌重新决策");
          error.code = "TCG_STATE_REFRESH";
          throw error;
        }
        const remaining = 300 - (Date.now() - sampledAt);
        if (attempt < 9 && remaining > 0) await sleep(remaining);
      }
      throw new Error("切换确认页未核实横幅、控件与行动类型");
    }
    
    boardsMatch(before, after, purpose = "observation", _action = null) {
      const key=s=>JSON.stringify([s.phase,s.turn,s.active,TCG.diceOrder.map(e=>s.dice?.[e]||0),s.characters,s.enemies,
        s.quicken||null,s.supportCounts||null,...(purpose==="observation"?[s.eye||null,s.dendroCore||null]:[]),s.summonLayout||null]);
      return !!before && !!after && key(before)===key(after);
    }
    async requireUnchangedBoard(before, action = null) {
      // One pre-input owner: a clean board is read with its phase in the same
      // frame. Only an actually raised view needs a phase guard and a reset.
      let entryPhasePending = !this.boardReady && !this.handFanReady && !this.handNeedsReset;
      if (this.handFanReady || this.handNeedsReset) {
        const phase = this.phase();
        if (phase.phase !== "board" || phase.turn !== "user") {
          const error = new Error("执行前页面/回合已变化");
          error.code = "TCG_OBSERVATION_INTERRUPTED"; error.phase = { ...phase, hand: null };
          throw error;
        }
        if (this.handFanReady || this.handNeedsReset) await this.reset();
      }
      // Dice maps are unordered and zero entries may be omitted. Compare
      // resources semantically, not by host dictionary insertion order.
      const matches=(a,b)=>this.boardsMatch(a,b,"execution",action);
      const recent=this.boardReady && matches(this.lastObservedState,before) &&
        this.lastObservedRevision===this.inputRevision && Date.now()-this.lastObservedAt<=1500 && !this.autoRisk;
      if (recent) {
        const phase = this.phase();
        if (phase.phase !== "board" || phase.turn !== "user") {
          const error = new Error("执行前页面/回合已变化");
          error.code = "TCG_OBSERVATION_INTERRUPTED"; error.phase = { ...phase, hand: null };
          throw error;
        }
        return before;
      }
      let last=null;
      for(let attempt=0;attempt<6;attempt++) {
        const sampledAt = Date.now();
        // A clean but unready entry has no reset/input between its phase and
        // full-board reads. Let this same fresh frame prove both.
        const entryPhase = entryPhasePending; entryPhasePending = false;
        try{last=this.board(true);if(entryPhase)this.adoptPhase(last);}catch(e){
          if(e.code!=="TCG_DICE_RETRY")throw e;
          this.trace("execution-board-wait",{attempt,error:String(e.message||e)});
          const remaining = 300 - (Date.now() - sampledAt);
          if(attempt<5 && remaining>0)await sleep(remaining);continue;
        }
        if(last.phase!=="board" || last.turn!=="user") {
        const error=new Error("执行前页面/回合已变化");
          error.code=!entryPhase && last.phase==="unknown" ? "TCG_STATE_REFRESH" : "TCG_OBSERVATION_INTERRUPTED";
          error.phase={...last,hand:null};this.boardReady=false;throw error;
        }
        const complete=!this.observationIssues(last).length;
        const matched=complete&&matches(before,last);
        const changes=matched?{}:boardDifferences(before,last,true);
        if(matched)return last;
        this.trace("execution-board-wait",{attempt,matched,active:last.active,dice:last.dice,changed:Object.keys(changes),changes});
        // A changed complete board invalidates the old decision immediately.
        // Only missing observations retry; never wait for old resources back.
        if(complete){
          const error=new Error("执行前局面已变化，重新决策");
          error.code="TCG_STATE_REFRESH";throw error;
        }
        const remaining = 300 - (Date.now() - sampledAt);
        if(attempt<5 && remaining>0)await sleep(remaining);
      }
      const error = new Error("执行前六次读取仍有缺失字段");
      error.code = "TCG_STATE_REFRESH";
      throw error;
    }
    async execute(action, before, memory) {
      this.consumptionReceipt = null;
      this.pendingHandEvidence = null;
      this.currentAction = action;
      this.actionSubmittedAt = null;
      const startedAt = Date.now();
      try {
        if (action.type === "tune" && !TCG.handCardKnown(before.hand.find(
            h => h.index === action.index && h.id === action.id)))
          throw new Error("未核实身份的牌禁止调和");
        const result = await this.executeInput(action, before, memory);
        if (!result?.probed) {
          this.handContinuation = null;
          this.actionSubmittedAt = Date.now();
          this.trace("input-submitted", { action, ms: this.actionSubmittedAt - startedAt,
            inputRevision: this.inputRevision, awaitingChoice: !!this.choiceSession });
        }
        return result;
      } catch (e) {
        if (this.consumptionReceipt?.inputSent || e.code === "TCG_NATIVE_REJECTION")
          this.handContinuation = null;
        this.consumptionReceipt = null;
        this.pendingHandEvidence = null;
        const nativeRejection = e.code === "TCG_NATIVE_REJECTION";
        if (!nativeRejection && !(action.type === "tune" && e.code === "TCG_TUNE_UNCONFIRMED"))
          throw e;
        if (nativeRejection) e.code = "TCG_INPUT_REJECTED";
        // Dismiss the existing preview once. A missing tuning button is NOT a
        // rejection proof: Player must reread hand/resources before retrying.
        this.boardReady = false;
        await this.reset();
        throw e;
      } finally {
        this.currentAction = null;
      }
    }
    
    async inputHand(action,before,memory,prepared=null) {
      const current = before.hand;
      const h = current.find(c => c.index === action.index);
      if (!h || h.id !== action.id) throw new Error("执行前重新核对卡名失败");
      const selected = prepared && !prepared.viewOnly;
      if (prepared?.viewOnly && !this.handFanReady) await this.requireUnchangedBoard(before,action);
      const priceIndex = action.type==="card"&&this.checkCardInput?action.index:null;
      // Non-selected inputs always enter inspectHandCard below. Its fresh
      // pre-click phase owns the boundary; quantity reads stay independent.
      let sourceCount=selected?prepared.sourceCount:await this.prepareHandInput(before.hand.length,priceIndex,false,true);
      if (prepared?.viewOnly && !sourceCount) {
        // No title/drag has been sent for this target. Unknown new quantity
        // cannot authorize bypassing the ordinary complete-board preflight.
        await this.requireUnchangedBoard(before,action);
        sourceCount=await this.prepareHandInput(before.hand.length,priceIndex,false,true);
      }
      let x = selected?prepared.x:this.handPoints(current.length)[action.index];
      if (!selected) x = await this.inspectHandCard(action, x, before) ?? x;
      await this.checkCardInput?.(action,before,x,memory);
      const phase = this.phase();
      if (phase.turn !== "user") {
        // No drag/payment was sent. The phase owner must resume from fresh
        // observations at every supported size, not treat 1080 as fatal.
        const error = new Error("拖牌前回合已改变");
        error.code = "TCG_OBSERVATION_INTERRUPTED"; error.phase = { ...phase, hand: null };
        this.boardReady = false; this.preparedHandInput = null; this.autoRisk = true;
        this.trace("hand-input-interrupted", { action, stage: "before-drag", phase: phase.phase,
          turn: phase.turn, inputSubmitted: false });
        throw error;
      }
      const targeted = action.type === "card" && action.target !== null;
      const drawCost = action.type === "card" ? TCG.drawPayment(before,action,memory) : null;
      this.consumptionReceipt={id:action.id,index:action.index,target:action.target??null,
        beforeKey:TCG.boardKey(before),inputSent:false,
        ...(drawCost?{sourceInstanceIds:h.instanceIds?.slice()||[],cost:drawCost}:{}),
        ...(sourceCount?{sourceCountProof:sourceCount}:{})};
      const destination=action.type==="tune"?this.point("phase",1867,518):
        targeted?this.point("board",charX[action.target],720):[x,this.point("board",0,595)[1]];
      await this.drag(x, this.point("handExpanded",0,945)[1], ...destination);
      this.consumptionReceipt.inputSent=true;
      if (action.type === "tune") await this.confirmTune();
      else await this.cardConfirm(action,before);
    }
    async confirmTune() {
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.requireNoWarning();
        const b = this.button("元素调和");
        if (b) {
          const point = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
          this.trace("button-clicked", { asset: "元素调和", point });
          await sleep(120);
          return;
        }
        if (attempt < 2) await sleep(300);
      }
      const error = new Error("调和确认按钮未读清，核对实际手牌与骰子后再选择");
      error.code = "TCG_TUNE_UNCONFIRMED";
      throw error;
    }
    async inputSkill(action, before) {
      // executeInput already verified the current actor, board and resources.
      // Fixed role + fixed slot identifies the skill; no title/type OCR.
      const x = this.skillX(action);
      if (action.who !== before.active) throw new Error("技能槽位或当前出战角色不符");
      this.clickAt(...this.point("bottom",x,957));
      await sleep(1200);
      const preview = this.frame(f => ({ phase:this.phaseIn(f), warning:this.warnings(f) }));
      this.requireHandObservation(preview.phase, "before-skill-confirm");
      await this.requireNoWarning(preview.warning);
      this.clickAt(...this.point("bottom",x,957));
      // Sent is not confirmed. The existing pending session observes payment
      // and native effects; no missing tooltip or successful click proves a cast.
      this.trace("skill-confirm-clicked", { who:action.who, skill:action.skill, point:this.point("bottom",x,957) });
    }
    
    async inputSwitch(action,before,memory) {
      if (!Number.isInteger(action.target) || action.target < 0 || action.target > 2 ||
          action.target === before.active || before.characters[action.target].dead !== false)
        throw new Error("切换目标非法");
      // Opening details verifies the target before the payment overlay.
      const raw = await this.titleAt(charX[action.target], 720, false, false, "character", action.target, true);
      this.requireHandObservation(this.phase(), "before-switch-payment");
      if (TCG.characterName(raw) !== action.target) throw new Error("切换目标角色标题未核实");
      this.clickAt(...this.point("bottom",1820,958));
      await sleep(120);
      const preview = await this.requireSwitchPreview(action, memory);
      this.clickAt(...this.point("bottom",1820,958));
      this.trace("switch-confirm-clicked", {
        target: action.target,
        point: this.point("bottom",1820,958),
        fast: preview.fast,
        predictedFast: memory.fastSwitch,
      });
    }
    async inputEnd() {
      await this.clickButton("回合结束", this.roi("viewport", [0, 0, 384, 1080]));
      // Official RoundEnd waits 1000ms for the popup animation. clickButton
      // already waited 200ms; confirm inside the native five-second window.
      await sleep(800);
      if (this.phase().turn === "user") await this.clickButton("回合结束", this.roi("viewport", [0, 0, 384, 1080]));
    }
    async prepareHandInput(expected, priceIndex = null, requireReusableCount = false, deferToTitle = false) {
      // execute already normalized and verified the board; do not blank-click
      // a second time simply to raise the fan.
      await this.expand(false);
      // Known order/count comes from this session's confirmed hand. Look for
      // visible anomalies without the redundant 1–4-card boundary/title loop.
      const revision = this.inputRevision, samples = [], sampledTimes = [];
      const validCount = s => s.count === expected && Number.isInteger(s.count) &&
        ["native-badge", "full-cost-layout", "full-rim-layout"].includes(s.source);
      const requireRevision = () => {
        if (this.inputRevision === revision) return;
        this.handPositionProof = null;
        const error = new Error("执行前手牌采样期间输入已变化");
        error.code = "TCG_STATE_REFRESH";
        throw error;
      };
      let sampledAt;
      const sample = (recovery = false) => {
        sampledAt = Date.now();
        sampledTimes.push(sampledAt);
        return this.frame(f => {
          if (recovery) this.requireHandObservation(this.phaseIn(f), "target-count-recovery");
          return this.handSample(f, priceIndex);
        });
      };
      try {
        samples.push(sample());
        const remaining = 120 - (Date.now() - sampledAt);
        if (remaining > 0) await sleep(remaining);
        requireRevision();
        samples.push(sample());
        // Only a read-only inspection requests reusable count authority. A
        // first-frame miss may recover once; positive conflicts and unknown
        // sources never authorize another attempt or a fabricated stable pair.
        if (requireReusableCount === true && samples[0].count === null && validCount(samples[1])) {
          const remaining = 120 - (Date.now() - sampledAt);
          if (remaining > 0) await sleep(remaining);
          requireRevision();
          samples.push(sample(true));
        }
      } catch (e) {
        if (e.code !== "TCG_HAND_RETRY") throw e;
        await this.refreshHandBeforeInput("执行前手牌数量证据冲突");
      }
      const reads = samples.map((s) => s.count), sources = samples.map((s) => s.source);
      // Ordinary input immediately enters inspectHandCard, whose artwork or
      // title path takes a fresh phase before input. Keep that later check,
      // rather than capturing two adjacent phase-only frames with no input
      // between them. Price-only probes/standalone callers keep this guard.
      if (deferToTitle !== true) this.requireHandObservation(this.phase(), "before-target-title");
      requireRevision();
      this.trace("hand-input-check", {
        expected, reads, sources, boundaryProbe: false,
      });
      if (reads.some((n) => n !== null && n !== expected)) {
        await this.refreshHandBeforeInput("执行前手牌张数已变化");
      }
      this.publishHandPositions(samples, expected);
      // Reuse the existing read-only count frames; no extra hand expansion.
      const stableSamples = samples.slice(-2);
      if (stableSamples.every(validCount)) this.recordHandLayout(expected);
      // Layout sources already validate every slot, expected spacing and extra
      // edges/markers. A single raw hit or two unreadable samples is NOT proof.
      // The transient badge can replace a complete calibrated row between
      // frames. Stable quantity needs two native counts, not identical readers.
      return stableSamples.every(validCount) && sampledTimes.slice(-2).every(at =>
        Date.now() - at >= 0 && Date.now() - at <= 5000)
        ? { count: expected, stableReads: 2, source: stableSamples[0].source, reads, sources } : null;
    }
    async refreshHandBeforeInput(reason) {
      // No card was submitted: a delayed insertion changes positions, not the
      // preceding action's guarantee that its old cards stayed in the hand.
      this.invalidateHand(reason, this.handContinuation);
      this.requireHandObservation(this.phase(), "before-cache-refresh-reset");
      await this.reset();
      const error = new Error(reason);
      error.code = "TCG_HAND_REFRESH";
      throw error;
    }
    async confirm(action, before, memory = TCG.freshMemory()) {
      let pending = false;
      try { return await this.confirmPending(action, before, memory); }
      catch (e) {
        pending = ["TCG_CONFIRMATION_RETRY", "TCG_BOARD_RETRY", "TCG_DICE_RETRY", "TCG_HAND_RETRY"].includes(e.code);
        throw e;
      }
      finally {
        if (!pending) {
          this.confirmationSession = null;
          this.actionSubmittedAt = null;
          this.consumptionReceipt = null;
          this.pendingHandEvidence = null;
          this.soupReceipt = null;
        }
      }
    }
    async confirmPending(action, before, memory = TCG.freshMemory()) {
      const key = TCG.actionKey(action) + "/" + TCG.boardKey(before);
      if (this.confirmationSession && this.confirmationSession.key !== key)
        throw new Error("上一个动作仍待确认，禁止提交另一动作");
      const session = this.confirmationSession || { key, transition: false, submittedAt: this.actionSubmittedAt ?? null,
        plan: action.type === "end" ? null : { ...TCG.handPlan(action, before, memory), action, before } };
      this.confirmationSession = session;
      const deadline = Math.min(Date.now() + 45000, this.matchDeadline ?? Infinity);
      let lastPhase = null;
      let sampledAt = 0;
      // Polling intervals include this cycle's OCR/observation work. This does
      // not shorten the input helpers' animation waits or replay an input.
      const waitForSample = async interval => {
        const remaining = Math.min(interval - (Date.now() - sampledAt), deadline - Date.now());
        if (remaining > 0) await sleep(remaining);
      };
      const combat = ["skill", "switch", "end"].includes(action.type) ||
        action.type === "card" && (TCG.byId[action.id]?.combatSkill || TCG.byId[action.id]?.combatAction || ["floralSidewinder", "skivingNewAndImproved", "wedge", "penance"].includes(action.id));
      // The existing combat flag also owns switch/end recovery. This new
      // refresh policy is only for casts, not ordinary fast/manual switches.
      const effectAction = combat && !["switch", "end"].includes(action.type);
      // The pending action owns both identity synchronization and whether
      // consumption might still precede insertion. The lifecycle must not
      // reconstruct that plan after commit has changed the deck memory.
      const completed = (after, confirmed) => ({
        ...after, ...this.confirmationExtras?.(), confirmed,
        // A card may enter combat confirmation as a skill (e.g. a kernel).
        // That adapter preserves cardAction; its hand effects remain a card's.
        handRefreshRequired: confirmed && (action.cardAction || action).type === "card" &&
          session.plan?.refreshAfterConsumption === true &&
          Array.isArray(after.hand) && after.hand.length <= before.hand.length,
        // The observation owner, not the finished confirmation session, owns
        // retained identities through a later insertion from this action.
        handContinuation: confirmed && session.plan?.retainedHand ? {
          retainedHand: session.plan.retainedHand,
          retainedVariantFamilies: session.plan.retainedVariantFamilies || [],
          retainedHandOrder: session.plan.retainedHandOrder === true,
        } : null,
        // Edict consumption can precede healing. Both it and a cast without
        // observed handoff need the existing corroborated board, not predicted HP.
        freshObservationRequired: confirmed && (effectAction && !session.transition ||
          action.type === "card" && action.id === "edict"),
      });
      while (Date.now() < deadline) {
        sampledAt = Date.now();
        const p = this.phase();
        lastPhase = p;
        if (p.result) return { ...p, confirmed: true };
        if (p.choiceKind === "support-discard") {
          const error = new Error("支援区已满，卡牌尚未完成出牌；停止本局，不自动弃置已有支援或重复出牌");
          error.code = "TCG_SUPPORT_FULL";
          throw error;
        }
        if (p.turn === "enemy" || ["choice", "roll", "pick", "settlement"].includes(p.phase)) {
          session.handObservation = null;
          session.skillViewClosed = true;
        }
        if (this.choiceSession || p.phase === "choice") {
          session.handObservation = null;
          try { await this.resolveChoice(before, memory); }
          catch (e) { if (e.code !== "TCG_CHOICE_RETRY") throw e;
            this.trace("choice-deferred", { action, reason: e.message }); await waitForSample(300); continue; }
          // A verified payment/target exit is not a generated-card choice.
          // Keep simple removal only when this action owns the completed exit.
          const receipt = this.soupReceipt || this.choiceReceipt;
          if (!(session.plan?.mode === "remove" && receipt?.origin === session.key &&
              receipt.exited === true && (this.soupReceipt === receipt || ["payment", "target"].includes(receipt.kind))))
            session.plan = { ...session.plan, mode: "full", action, before, expectedCount: this.handCountHint };
          continue;
        }
        if (action.type === "card" && action.id === "toss" && (this.tossSession || p.phase === "roll")) {
          const proof = await this.actionReroll(before, memory);
          session.plan = { ...session.plan, rerollConfirmed: proof?.confirmations === 2 }; continue;
        }
        if (p.turn === "enemy") session.transition = true;
        if (action.type === "end" && TCG.verify(action, before, p)) return { ...p, confirmed: true };
        // End-turn confirmation is a phase transition, not a hand effect.
        // While its animation still reports our board, keep the same submitted
        // session; no full observation, hand invalidation or second click.
        if (action.type === "end" && p.phase === "board" && p.turn === "user") { await waitForSample(450); continue; }
        if (p.phase === "pick") {
          if (session.plan?.mode === "unchanged") this.acceptHand(session.plan.hand, "forced-pick-unchanged-action");
          else this.invalidateHand("forced-character-pick-hand-changing-action");
          const independent = combat && !session.transition && await this.forcedActionProof(action, before);
          const confirmed = combat && (session.transition || independent);
          this.trace("confirmation-forced-pick", { action, transition: session.transition, independent, confirmed });
          return { ...p, confirmed };
        }
        if (p.turn === "user") {
          let after;
          try {
            this.requireHandObservation(p, "before-confirm-reset");
            // Finish the submitted view on our board and preserve its native
            // consumption evidence. Never fold enemy/choice pages.
            const receipt = await this.removalEvidenceBeforeReset(session.plan);
            if (p.phase === "board" && (this.handNeedsReset || this.handFanReady)) await this.reset();
            if (receipt && this.inputRevision >= receipt.revision && this.inputRevision <= receipt.revision + 1)
              session.plan = { ...session.plan, preResetEvidence: { ...receipt, revision: this.inputRevision } };
            after = await this.observe(true, session.plan ? { ...session.plan, transitionPassed: session.transition } : null);
          } catch (e) {
            if (["TCG_BOARD_RETRY", "TCG_DICE_RETRY", "TCG_HAND_RETRY"].includes(e.code)) {
              this.trace("confirmation-read-deferred", { action, code: e.code, missing: e.missing, reason: e.message });
              await waitForSample(400); continue;
            }
            if (e.code !== "TCG_OBSERVATION_INTERRUPTED") throw e;
            after = { ...e.phase, hand: null };
          }
          if (after.result) return { ...after, confirmed: true };
          if (after.phase !== "board" || after.turn !== "user") {
            if (after.turn === "enemy" || ["choice", "roll", "pick", "settlement"].includes(after.phase)) {
              session.handObservation = null;
              session.skillViewClosed = true;
            }
            if (after.turn === "enemy") session.transition = true;
            this.trace("confirmation-deferred", { action, phase: after.phase, turn: after.turn });
            await waitForSample(450); continue;
          }
          // Consumed source can precede a late soup page. Keep its owner even
          // after a complete resync; neither success nor uncertain exit closes it.
          if (TCG.confirmationReady && !TCG.confirmationReady(action, before, after)) {
            session.handObservation = null;
            await waitForSample(250); continue;
          }
          await this.provePaidDraw(action,before,after,memory);
          const verified = TCG.verify(action, before, after, session.transition);
          const budgetMatches = this.diceBudgetMatches(after);
          // Begin observing immediately after submission. A positive effect may
          // confirm early; the unchanged pre-animation board cannot reject or
          // resynchronize the action during the former fixed 1200ms wait.
          if (!verified && !session.transition && session.submittedAt !== null &&
              Date.now() - session.submittedAt < 1200) {
            this.trace("confirmation-awaiting-effect", { action, elapsed: Date.now() - session.submittedAt });
            await waitForSample(120); continue;
          }
          if (verified && budgetMatches) {
            this.acceptHand(after.hand, "confirmed-" + (session.plan?.mode || "full"));
            // Resource/consumption proof can precede the combat's visible
            // effects. Keep that cast confirmed (never resend it), but do not
            // hand this early snapshot straight to the next planner. A new
            // full observation is required when no enemy turn was observed;
            // it must not wait for predicted damage or exclude zero damage.
            return completed(after, true);
          }
          if (!budgetMatches && !await this.observedResourceProof(after)) {
            this.trace("budget-reconciliation-wait", { action, expectedDice: this.expectedDice,
              observedDice: TCG.total(after.dice), missing: ["native-dice-count-proof"] });
            await waitForSample(400); continue;
          }
          this.trace("state-resync", { action, verified, budgetMatches, expectedDice: this.expectedDice,
            observedDice: TCG.total(after.dice), reuseFullRead: verified && after.handRead === "full" });
          // A completed read is not proof that its identities are correct.
          // If the action contradicts it, invalidate the pending snapshot too
          // and use the existing single resync read before an uncertain exit.
          if (!verified && session.plan?.mode !== "unchanged") {
            this.invalidateHand("post-action-state-mismatch");
            after = await this.observe(true, { mode: "full", expectedCount: null });
          }
          if (after.result) return { ...after, confirmed: true };
          if (after.phase !== "board" || after.turn !== "user") {
            if (after.turn === "enemy" || ["choice", "roll", "pick", "settlement"].includes(after.phase))
              session.skillViewClosed = true;
            if (after.turn === "enemy") session.transition = true;
            await waitForSample(450); continue;
          }
          if (!TCG.legalState(after)) {
            await waitForSample(400); continue;
          }
          if (TCG.confirmationReady && !TCG.confirmationReady(action, before, after)) {
            session.handObservation = null;
            await waitForSample(250); continue;
          }
          await this.provePaidDraw(action,before,after,memory);
          const confirmed = TCG.verifyResynchronized(action, before, after, session.transition);
          this.adoptObservedState(after, "post-action-resync");
          this.trace("state-resynced", { action, confirmed, after });
          return { ...completed(after, confirmed), resynchronized: true };
        }
        if (p.phase === "roll" && combat) return { ...p, confirmed: session.transition };
        // A skill detail can cover the turn marker if a submitted click did
        // not finish the cast. Reuse the existing blank-area reset once after
        // the same effect-start window, only until a native scene exit closes
        // that opportunity. Later unknown frames cannot reopen an old detail.
        // A new native observation, not dismissing the view, decides the outcome.
        if (action.type === "skill" && !action.cardAction && !action.technique &&
            p.phase === "unknown" && p.turn === "none" && !p.cardTarget &&
            !session.skillViewClosed && session.submittedAt !== null &&
            Date.now() - session.submittedAt >= 1200) {
          session.skillViewClosed = true;
          await this.reset();
          this.trace("skill-view-reset", { action, reason: "unresolved-phase-after-skill-input" });
          continue;
        }
        await waitForSample(450);
      }
      const error = new Error("动作仍待核实，保留本次输入并继续观察");
      error.code = "TCG_CONFIRMATION_RETRY";
      error.phase = lastPhase;
      error.elapsedMs = session.submittedAt === null ? null : Date.now() - session.submittedAt;
      throw error;
    }
    async provePaidDraw(action,before,after,memory) {
      const r=this.consumptionReceipt,h=before.hand?.[action.index],cost=r?.cost,p=r?.sourceCountProof;
      if(TCG.drawConsumptionProven(action,before,after))return true;
      if(action.type!=="card"||after.handRead!=="full"||
          this.confirmationSession?.key!==TCG.actionKey(action)+"/"+TCG.boardKey(before)||
          this.confirmationSession.transition||
          !TCG.legalState(after)||before.diceKnown!==true||after.diceKnown!==true||this.autoRisk||
          after.active!==before.active||JSON.stringify(after.characters)!==JSON.stringify(before.characters)||
          JSON.stringify(after.enemies)!==JSON.stringify(before.enemies)||!r?.inputSent||
          r.beforeKey!==TCG.boardKey(before)||r.id!==action.id||r.index!==action.index||r.target!==(action.target??null)||
          h?.id!==action.id||!h.instanceIds?.length||JSON.stringify(r.sourceInstanceIds)!==JSON.stringify(h.instanceIds)||
          p?.count!==before.hand.length||p.stableReads!==2||
          !["native-badge","full-cost-layout","full-rim-layout"].includes(p.source)||
          !cost||TCG.size(cost)<=0)return false;
      // Exact payment is the default. A deck may additionally prove a native
      // conversion, but never infer consumption from hand growth or total alone.
      const current=TCG.drawPayment(before,action,memory);
      if(!current||JSON.stringify(current)!==JSON.stringify(cost))return false;
      const spent=Object.fromEntries(TCG.diceOrder.map(e=>[e,(before.dice[e]||0)-(after.dice[e]||0)]));
      const exactPaid=Object.values(spent).every(n=>Number.isInteger(n)&&n>=0)&&TCG.total(spent)===TCG.size(cost)&&
          !!TCG.payment(spent,cost,TCG.team[before.active].element);
      if(TCG.drawPaymentMatches?!TCG.drawPaymentMatches(before,action,after,memory,cost,exactPaid,r):!exactPaid)return false;
      const decreased=after.hand.filter(h=>h.id===action.id).length<before.hand.filter(h=>h.id===action.id).length;
      // Ordinary confirmed consumption needs no extra dice OCR. Only the
      // same-name ambiguity adds the existing independent resource proof.
      if(!decreased||!TCG.verify(action,before,after)){
        const native=await this.observedResourceProof(after);if(!native)return false;
        after.drawConsumption={kind:"native-paid-draw",...r,cost:TCG.size(cost),stableReads:2,
          revision:native.revision,diceKey:JSON.stringify(TCG.diceOrder.map(e=>after.dice[e]||0))};
      }
      // Remove the selected old item, never every possible origin of another copy.
      const retained=before.hand.filter((_,i)=>i!==action.index);
      after.hand=TCG.reconcileHand(retained,after.hand.map(({instanceIds,instanceAmbiguous,...card})=>card),false,
        (memory.refusedActions||[]).filter(a=>a.uncertain&&a.round===memory.round));
      this.handProvenance=retained;
      this.trace("draw-consumption-proven",{id:action.id,index:action.index,proof:after.drawConsumption||"native-source-count-decrease"});
      return true;
    }
    async forcedActionProof(action, before) {
      // Death/energy reset is not proof of a cast. Preserve deck verification,
      // but require two fresh identical frames and a positive resource effect.
      if (action.type !== "skill") return false;
      const revision = this.inputRevision;
      let previous = "";
      for (let i = 0; i < 2; i++) {
        const sampledAt = Date.now();
        let after;
        try { after = this.board(); }
        catch (e) { if (["TCG_BOARD_RETRY", "TCG_DICE_RETRY"].includes(e.code)) return false; throw e; }
        const caster = after.characters?.[action.who], oldCaster = before.characters?.[action.who];
        const paid = after.diceKnown===true&&before.diceKnown===true&&TCG.total(after.dice) < TCG.total(before.dice);
        const charged = TCG.alive(caster) && Number.isInteger(caster.energy) &&
          Number.isInteger(oldCaster?.energy) && caster.energy > oldCaster.energy;
        if (after.phase !== "pick" || this.inputRevision !== revision || !(paid || charged)) return false;
        const key = JSON.stringify([after.phase, after.characters, after.dice, after.enemies]);
        if (i === 1) return key === previous;
        previous = key;
        const remaining = 120 - (Date.now() - sampledAt);
        if (remaining > 0) await sleep(remaining);
      }
      return false;
    }
    adoptObservedState(state, reason) {
      if (!TCG.legalState(state)) throw new Error("重同步状态无效，不能作为下一动作基线");
      this.expectedDice = TCG.total(state.dice);
      this.gamblerBudget = null;
      this.emptyHandProven = state.hand.length === 0;
      this.boardReady=true;
      this.lastObservedState=state;
      this.lastObservedAt=0;this.lastObservedRevision=-1;
      this.consumptionReceipt=null;this.pendingHandEvidence=null;
      this.acceptHand(state.hand, reason);
    }
    reportStop(reason, code) {
      // Preserve the original stop even if its final log write fails.
      try {
        this.trace("stop", { reason, code });
      } catch (e) {
        log.warn("停止日志保存失败：" + e.message);
      }
    }
    dispose() {
      const gray = new Set();
      for (const ro of this.roCache.values()) {
        const mat = ro.templateImageGreyMat ?? ro.TemplateImageGreyMat;
        if (mat && !gray.has(mat)) {
          gray.add(mat);
          mat.dispose();
        }
      }
      for (const mat of this.templates.values()) mat.dispose();
      this.templates.clear();
      this.roCache.clear();
    }
  }
  root.TCGBetterGI = { BetterGIHost, handX, handLayoutCount, charX, number, mousePoint, captureSize, costMarkerLayout, costDigitRows, costNumbersAt, costHandSample, boardDifferences };
})(globalThis);
(function(root){
  "use strict";
  const {charX,number,mousePoint}=root.TCGBetterGI;
  class BetterGIHost extends root.TCGBetterGI.BetterGIHost{
    constructor(options){super(options);this.soupReceipt=null;this.summonReceipt=null;this.talentTargets={teaParty:0};
      this.targetBanners=["对所选我方召唤物生效"];}
    // Shared Mystique Soup native labels, one selection and action-bound exit receipt.
    choiceIn(f) {
      const header = TCG.norm(this.ocr(f, this.roi("header", [700, 155, 520, 130])));
      if (!header.includes("挑选卡牌") || !header.includes("请选择一张卡牌")) return null;
      // Native supplied 1920x1080 screenshot: names below the two cards at
      // y=742, cards centred at y=540. Anchor to exact OCR title rectangles,
      // not a fixed left/right preference or a guessed generic choice page.
      const rows = this.ocrRows(f, this.roi("choice", [250, 705, 1430, 90])),
        options = [];
      for (const r of rows) {
        const entry = Object.entries(TCG.soupOptions).find(
          ([name]) => TCG.norm(name) === TCG.norm(r.text),
        );
        if (!entry) continue;
        const point = [r.x + r.w / 2, r.y + r.h / 2 - 200];
        const reference = this.referencePoint("choice", ...point);
        if (
          ![r.x, r.y, r.w, r.h, ...point].every(Number.isFinite) ||
          r.w <= 0 ||
          r.h <= 0 ||
          reference[0] < 250 ||
          reference[0] > 1680 ||
          reference[1] < 470 ||
          reference[1] > 600
        )
          continue;
        options.push({
          id: entry[0],
          effect: entry[1],
          point: mousePoint(...point),
          title: r.text,
        });
      }
      return {
        phase: "choice",
        turn: "none",
        choiceKind: "soup",
        options,
        recognized: options.length === 3 && new Set(options.map((c) => c.id)).size === 3,
      };
    }
    async resolveChoice(before = null, memory = TCG.freshMemory()) {
      const owner = this.confirmationSession, action = owner?.plan?.action;
      let stable = 0,
        key = "",
        last = null;
      for (let attempt = 0; attempt < 24; attempt++) {
        const sampledAt = Date.now(), revision = this.inputRevision;
        last = this.phase();
        if (last.phase !== "choice") {
          if (
            !this.choiceSession ||
            !["board", "pick", "roll", "settlement", "result"].includes(last.phase) ||
            (last.phase === "board" && !["user", "enemy"].includes(last.turn))
          ) {
            stable = 0;
            key = "";
          } else {
            const current = JSON.stringify([last.phase, last.turn, last.result]);
            stable = current === key ? stable + 1 : 1;
            key = current;
            if (stable >= 2) {
              const session = this.choiceSession;
              this.choiceSession = null;
              // Soup applies an effect immediately; it generates NO hand card.
              this.soupReceipt = { origin: session.origin, target: session.target,
                effect: session.effect, exited: true };
              this.pendingChoiceCard = null;
              this.handFanReady = false;
              this.handNeedsReset = true;
              this.emptyHandProven = false;
              this.boardReady = false;
              this.trace("choice-resolved", {
                id: session.id,
                confirmationInputs: session.confirmed ? 1 : 0,
                phase: last.phase,
                turn: last.turn,
              });
              return last;
            }
          }
        } else if (!this.choiceSession) {
          if (last.choiceKind !== "soup" || !last.recognized || action?.id !== "soup" || action.type !== "card") {
            stable = 0;
            key = "";
          } else {
            const basis = owner.plan.before;
            const paid =
              basis &&
              TCG.payment(
                basis.dice,
                TCG.cardCost("soup", action.target, memory, basis),
                TCG.team[basis.active].element,
              );
            const choiceState = paid ? { ...basis, dice: paid.remaining } : basis;
            const target = TCG.soupChoice(
                last.options,
                choiceState,
                action.target,
                memory,
              ),
              id = target?.id;
            if (target) {
              this.choiceSession = {
                origin: owner.key, target: action.target,
                id,
                effect: target.effect,
                confirmed: false,
              };
              this.clickAt(...target.point);
              this.trace("choice-selected", {
                id,
                point: target.point,
                proof: "native-card-labels-and-choice-header",
              });
              stable = 0;
              key = "";
              await sleep(120);
            }
          }
        } else if (!this.choiceSession.confirmed) {
          // The supplied screenshot has no confirm button before selection.
          // The session owns the selected option. A unique confirm template
          // authorizes one click without rereading its title.
          const preview = this.frame((f) => ({
            phase: this.phaseIn(f),
            buttons: this.matches(f, "core/确定", this.roi("choice", [500, 800, 920, 240])),
          }));
          if (["choice", "unknown"].includes(preview.phase.phase) && preview.phase.turn === "none" && preview.buttons.length === 1) {
            const b = preview.buttons[0];
            this.choiceSession.confirmed = true;
            const point = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
            this.trace("choice-confirm-clicked", { id: this.choiceSession.id, point });
            stable = 0;
            key = "";
            await sleep(120);
          }
        }
        if (attempt < 23) await this.waitForSample(sampledAt, 250, revision);
      }
      const error = new Error("挑选卡牌状态未读清");
      error.code = "TCG_CHOICE_RETRY";
      error.phase = last;
      throw error;
    }
    initialObservationBoard(){return this.board(true);}
    readSelectedCardFacts(f,card){
      // Reuse the existing stable-title frame only for an intended tune.
      // A generated food is not inherently untunable: this is a current
      // native attachment, not a rule inferred from the card name or NPC.
      const action=this.currentAction;
      if(action?.type!=="tune"||action.id!==card.id)return;
      const rows=this.ocrRows(f,this.roi("details",[680,100,355,620])).map(r=>TCG.norm(r.text)),
        heading=rows.findIndex(t=>t==="附着效果状态"||t==="附着状态");
      if(heading>=0&&rows.slice(heading+1).includes("不可调和")){
        const error=Error("游戏当前手牌附着禁止调和："+card.name);
        error.code="TCG_NATIVE_REJECTION";throw error;
      }
    }
    boardsMatch(before,after,purpose="observation",action=null){
      // Optional OCR availability is not a turn/HP/dice transition. Decisions
      // receive only current, two-sample extras below. Inputs whose legality
      // depends on those extras still compare their exact source facts.
      if(!before||!after)return false;
      if(purpose==="execution"&&!action)return super.boardsMatch(before,after,purpose,action);
      const support=purpose==="execution"&&action.type==="card"&&["support","legend"].includes(TCG.byId[action.id]?.type),
        summon=purpose==="execution"&&action.type==="card"&&["blessingM","surf","dragon"].includes(action.id);
      const core=s=>({...s,supportCounts:null,summonLayout:null}),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      if(!super.boardsMatch(core(before),core(after),purpose,action))return false;
      if(purpose==="execution"&&before.skillFees?.who===after.skillFees?.who&&
          ["E","Q"].some(skill=>{const a=before.skillFees?.entries[skill]?.n,b=after.skillFees?.entries[skill]?.n;
            return TCG.known(a)&&TCG.known(b)&&a!==b;}))return false;
      // A positive count/name/occupancy change still resets the quiet window.
      // Only unavailable optional fields are ignored, never known differences.
      const compatible=(a,b,fields)=>!a||!b||a.length===b.length&&a.every((slot,i)=>
        fields.every(k=>slot[k]==null||b[i][k]==null||same(slot[k],b[i][k])));
      return (support?same(before.supportCounts,after.supportCounts):
        compatible(before.supportCounts?.slots,after.supportCounts?.slots,["index","present","counter"]))&&
        (summon?same([before.summonCountKnown,before.summonLayout],[after.summonCountKnown,after.summonLayout]):
          ["own","enemy"].every(side=>compatible(before.summonLayout?.[side],after.summonLayout?.[side],["index","present","name","uses"])));
    }
    stabilizeBoardExtras(previous,current){
      if(!previous)return current;
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),result={...current};
      if(!same(previous.supportCounts,current.supportCounts)){
        // Never let fluctuating rim/counter reads dispose a known partner or
        // authorize a vacant slot/discount. No old positive value is returned.
        result.supportCounts={...current.supportCounts,known:false};
      }
      if(!same(previous.summonLayout,current.summonLayout))result.summonCountKnown=false;
      return result;
    }
    pendingMaxHpAllowance(who){
      const owner=this.confirmationSession,a=owner?.plan?.action,r=this.consumptionReceipt;
      // Only widen this read's upper bound. Native HP and independent card
      // consumption still prove the effect; no predicted healing is returned.
      return a?.type==="card"&&a.id==="autumnFrost"&&a.target===who&&r?.inputSent===true&&
        r.id===a.id&&r.index===a.index&&r.target===who&&
        owner.key===TCG.actionKey(a)+"/"+r.beforeKey?1:0;
    }
    prepareBoardObservation(){this.moveTo(...this.point("board",1555,545));}
    supportSlotsIn(f){
      const slots=[];
      for(let index=0;index<4;index++){
        const col=index%2,row=Math.floor(index/2),y=600+198*row,
          // The hand's tall right-edge crop includes artwork/glints on these
          // small cards. Read the support's short left border first, outside
          // the artwork; keep the existing right rim as a second structure.
          left=this.matches(f,"ailin/support-rim",this.roi("board",[248+164*col,585+190*row,30,165]),.90,false),
          rims=left.length?left:this.matches(f,"hand_rim",this.roi("board",[305+170*col,585+198*row,100,175]),.85,false),
          // The badge is fixed to the slot, not to a successfully matched rim
          // or a remembered owner. The old no-rim crop cut its right half and
          // could turn an occupied cooking slot into a confirmed departure.
          counter=number(this.numericAt(f,this.roi("board",[350+170*col,y-25,80,90]),3)),
          conflict=rims.length>1&&Math.max(...rims.map(r=>r.x))-Math.min(...rims.map(r=>r.x))>12;
        slots.push({index,present:conflict?null:rims.length>0||counter!==null,counter});
      }
      return {source:"native-support-rims",known:slots.every(s=>s.present!==null),
        count:slots.filter(s=>s.present===true).length,slots};
    }
    summonSlotsIn(f,enemy=false){
      const slots=[];
      for(let index=0;index<4;index++){
        const x=1395+170*(index%2),y=(enemy?123:600)+198*Math.floor(index/2),
          rims=this.matches(f,"hand_rim",this.roi("board",[x+55,y-15,100,175]),.85,false),
          left=this.matches(f,"ailin/summon-rim",this.roi("board",[x-45,y-15,65,175]),.90,false),
          rim=rims.length>0||left.length>0,conflict=rims.length>1&&Math.max(...rims.map(r=>r.x))-Math.min(...rims.map(r=>r.x))>12,
          // The ordinary board's badge is left of the enlarged target-page
          // edge. Read the complete badge in this slot, even when a rim misses.
          uses=number(this.numericAt(f,this.roi("board",[x+65,y-25,100,90]),3));
        const matches=enemy?[]:[[["cold","cold-native","cold-board","cold-board-slot07"],"厨艺机关·低温冷藏模式"],[["cat","cat-native","cat-board"],"怪笑猫猫帽"],[["half","half-board"],"半幻人"]]
          .filter(([assets])=>assets.some(asset=>this.matches(f,"ailin/"+asset,this.roi("board",[x-45,y+10,165,125]),.90,true).length));
        // Card frames vary with summon type. A cold-summon border must not
        // veto a positively matched cat/half. Conversely unreadable uses on
        // visible artwork/border is unknown, never an empty slot.
        if(!rim&&uses===null&&matches.length===0){slots.push({index,present:false});continue;}
        if(conflict||uses===null||uses<1||uses>16||matches.length>1){slots.push({index,present:null});continue;}
        slots.push({index,present:true,uses,name:matches.length===1?matches[0][1]:null,
          point:this.point("board",x+65,y+80)});
      }
      return slots;
    }
    boardExtrasIn(f,phase,active=null){
      if(phase.phase!=="board")return {};
      const own=this.summonSlotsIn(f),enemy=this.summonSlotsIn(f,true),
        complete=[...own,...enemy].every(s=>s.present!==null),receipt=this.summonReceipt;
      // The visible badges already expose modified fees. Read them with the
      // board, without opening previews or adding an input/wait cycle.
      const skillFees=phase.turn==="user"&&active!==null?{who:active,entries:Object.fromEntries(
        ["E","Q"].map(skill=>[skill,{n:this.skillFeeIn(f,{who:active,skill})}]))}:null;
      return {summons:own.filter(s=>s.present===true),enemySummons:enemy.filter(s=>s.present===true),
        summonCount:own.filter(s=>s.present===true).length,enemySummonCount:enemy.filter(s=>s.present===true).length,
        summonCountKnown:complete,summonLayout:{own,enemy},supportCounts:this.supportSlotsIn(f),
        soupReceipt:this.soupReceipt,summonReceipt:receipt,skillFees};
    }
    skillFeeIn(f,a){
      const x=a.skill==="Q"?1780:a.skill==="E"?1698:a.skill==="CA"?1590:null;
      if(x===null)return null;const n=number(this.numericAt(f,this.roi("bottom",[x,1010,36,35]),4));
      return n!==null&&n>=0&&n<=16?n:null;
    }
    // Equipment / recycle / talent confirmation shared by compatible adapters.
    cardBannerIn(f) {
      // A short crop cut the real recycle prompt after 「角」. All card
      // confirmation stages must read the same complete banner, not accept
      // a truncated prefix or infer scope from the central payment button.
      return this.ocr(f, this.roi("phase", [560, 508, 790, 70]));
    }
    namedCardBannerMatches(action, banner) {
      const text = TCG.norm(banner),
        prefix = "打出手牌";
      if (!text.startsWith(prefix)) return false;
      const card = TCG.identify(text.slice(prefix.length));
      return !!card && card.id === action.id;
    }
    async cardConfirm(action, before = null) {
      await this.requireNoWarning();
      const type = TCG.byId[action.id].type;
      const weaponKind = ["moon", "tassel"].includes(action.id)
        ? "pole"
        : ["wolf", "greatsword"].includes(action.id)
          ? "claymore"
          : null;
      const weaponLabel = { pole: "长柄武器", claymore: "双手剑" }[weaponKind];
      const targetedBanners = {
        food: ["请选择一个角色食用料理"],
        legend: ["请选择一个角色", "对所选角色生效"],
        recycle: [
          "请选择一个角色",
          "请选择要卸下圣遗物的角色",
          "请选择一个角色卸下圣遗物",
          "请选择一个装备了圣遗物的角色",
          "对所选角色生效",
        ],
        artifact: [
          "请选择要装备圣遗物的角色",
          "请选择一个角色装备圣遗物",
          "请选择一个角色",
          "对所选角色生效",
        ],
        weapon: [
          "请选择要装备武器的角色",
          "请选择一个角色装备武器",
          "请选择一个角色",
          "对所选角色生效",
          "请选择要装备" + weaponLabel + "的角色",
          "请选择一个角色装备" + weaponLabel,
        ],
      };
      const entrySampledAt = Date.now(), entryRevision = this.inputRevision;
      const foodPage = this.frame((f) => this.cardConfirmationEntryIn(f, targetedBanners[type] || []));
      this.trace("card-page", { id: action.id, target: action.target, type, ...foodPage });
      if (foodPage.phase.choiceKind === "support-discard") {
        const error = new Error("支援区已满，卡牌尚未完成出牌；停止本局，不自动弃置已有支援或重复出牌");
        error.code = "TCG_SUPPORT_FULL";
        throw error;
      }
      if (
        type === "weapon" &&
        (!weaponKind ||
          TCG.team[action.target]?.weapon !== weaponKind ||
          !before ||
          !TCG.alive(before.characters?.[action.target]))
      )
        throw new Error("装备确认目标与武器类型不适配");
      if (
        targetedBanners[type]?.includes(TCG.norm(foodPage.banner)) &&
        foodPage.phase.phase === "unknown" &&
        foodPage.phase.turn === "none"
      ) {
        if (
          !Number.isInteger(action.target) ||
          action.target < 0 ||
          action.target > 2 ||
          !before ||
          !TCG.alive(before.characters?.[action.target])
        )
          throw new Error("卡牌目标不合法或已经倒下");
        const layout = type === "food" ? "food" : "targeted";
        const point = this.clickAt(...this.point("board",charX[action.target],720));
        this.trace("card-target-clicked", {
          id: action.id,
          target: action.target,
          point,
          layout,
          banner: foodPage.banner,
        });
        await sleep(120);
        for (let attempt = 0; attempt < 6; attempt++) {
          const sampledAt = Date.now();
          const selected = this.frame((f) => this.cardTargetPreviewIn(f));
          await this.requireNoWarning(selected.warning);
          // A direct native resolution is verified by confirm(), not assumed
          // successful here. Never send a second selection or a skill input.
          if (
            selected.phase.result ||
            (selected.phase.phase === "board" && selected.phase.turn === "user") ||
            (action.id === "soup" && selected.phase.phase === "choice" &&
              selected.phase.choiceKind === "soup" && selected.phase.recognized)
          ) {
            this.trace("card-target-resolved", {
              id: action.id,
              target: action.target,
              proof: "native-page-exit-only",
            });
            return;
          }
          const controls = selected.buttons.length ? selected.buttons : selected.rows.filter((r) => TCG.norm(r.text) === "打出手牌" ||
            type === "food" && TCG.norm(r.text) === "确定");
          const otherTarget = Object.values(targetedBanners).some(labels => labels.includes(selected.banner)) &&
            !targetedBanners[type].includes(selected.banner);
          const matched =
            !otherTarget &&
            controls.length === 1 &&
            selected.phase.phase === "unknown" &&
            selected.phase.turn === "none";
          this.trace("card-target-preview", {
            id: action.id,
            target: action.target,
            attempt,
            matched,
            ...selected,
          });
          if (matched) {
            const b = controls[0];
            const confirmPoint = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
            this.trace("card-confirm-clicked", {
              id: action.id,
              target: action.target,
              point: confirmPoint,
              layout,
            });
            
            return;
          }
          if (attempt < 5) await this.waitForSample(sampledAt, 250);
        }
        this.trace("targeted-card-unresolved", {id:action.id,target:action.target,reason:"目标卡牌选人后确认页未核实"});
        throw new Error("目标卡牌选人后确认页未核实");
      }
      // Native 星天之兆 opens a payment page with a CENTER button. Its detail
      // panel is gone and the right skill buttons are not the confirmation.
      const centralScopeMatches = (banner) => {
        const card = TCG.byId[action.id];
        const activeScope =
          ["stars", "voltage", "calx", "lost"].includes(action.id) &&
          banner === "对我方出战角色生效";
        const namedEvent =
          [
            "dice",
            "draw",
            "switch",
            "energy",
            "support",
            "reroll",
            "recovery",
            "event",
            "legend",
            "food",
            "recycle",
            "combat",
            "summon",
            "team-food",
          ].includes(card.type) && this.namedCardBannerMatches(action, banner);
        const teamEvent =
          ((action.id === "sing" || card.type === "team-food") && ["对我方所有角色生效", "对所有我方角色生效"].includes(banner)) ||
          (["garden", "boar"].includes(action.id) &&
            ["对我方生效", "对我方全体生效"].includes(banner));
        const talentWho = this.talentTargets?.[action.id] ?? (action.id === "skivingNewAndImproved" ? 2 : null);
        const activeTalent =
          talentWho !== null &&
          action.target === talentWho &&
          before?.active === talentWho &&
          TCG.alive(before.characters?.[talentWho]) &&
          !before.characters[talentWho].frozen &&
          banner === "装备给出战中的" + TCG.norm(TCG.team[talentWho].name);
        return (action.target === null && (activeScope || namedEvent || teamEvent)) ||
          activeTalent || (action.id === "lyre" && namedEvent);
      };
      const entryReused = this.inputRevision === entryRevision && foodPage.targets?.length === 1 &&
        foodPage.phase.phase === "unknown" && foodPage.phase.turn === "none" &&
        centralScopeMatches(TCG.norm(foodPage.banner));
      const central = entryReused ? foodPage : this.frame((f) => {
        // Find() returns only the first OCR row, which can be the O hint.
        // Read complete control rows once; scope authorizes one payment click.
        const targets = this.cardPaymentControlsIn(f);
        return { banner: this.cardBannerIn(f), targets, phase: this.phaseIn(f) };
      });
      if (entryReused) this.trace("card-payment-entry-reused", { id: action.id, banner: central.banner, entrySampledAt });
      if (central.targets.length) {
        const banner = TCG.norm(central.banner);
        if (
          central.targets.length !== 1 ||
          !centralScopeMatches(banner) ||
          central.phase.phase !== "unknown" ||
          central.phase.turn !== "none"
        ) {
          throw new Error("中央出牌确认页的卡牌类型/作用范围未核实");
        }
        const b = central.targets[0];
        // A talent is already selected on its active wearer. Confirm the
        // observed payment button once; the card itself invokes the skill.
        // Never add a target click or a separate skill cast here.
        const point = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
        const receipt = this.consumptionReceipt;
        if (receipt?.inputSent && before && receipt.beforeKey === TCG.boardKey(before) &&
            receipt.id === action.id && receipt.index === action.index &&
            receipt.target === (action.target ?? null))
          receipt.paymentSubmitted = true;
        this.trace("card-confirm-clicked", {
          id: action.id,
          point,
          layout: "central",
          banner: central.banner,
        });
        
        return;
      }
      if (
        action.target !== null &&
        ["food", "artifact", "weapon", "talent", "legend", "recycle"].includes(type)
      ) {
        // Only click a target while the selected card is still displayed in its detail panel.
        const title = this.frame((f) => this.ocr(f, this.roi("details", [311, 115, 341, 50])));
        // A drag directly onto the intended character may already resolve the card.
        // In that case, issue no more input; the state verifier must prove acceptance.
        if (!title) return;
        if (TCG.identify(title)?.id !== action.id) throw new Error("出牌后的选目标页面未确认");
        this.clickAt(...this.point("board",charX[action.target],720));
        await sleep(120);
      }
      // Zero-cost untargeted events can resolve immediately. Never click a skill button
      // as a fallback confirmation for those events.
      const text = this.frame((f) => this.ocr(f, this.roi("bottom", [1550, 850, 360, 190])));
      if (/确认|使用|打出/.test(text) && !/无法|不足|不能/.test(text)) {
        const targets = this.frame(f => this.ocrRows(f, this.roi("bottom", [1550, 850, 360, 190]))
          .filter(r => /^(确认|使用|打出)(卡牌)?$/.test(r.text.replace(/\s/g, ""))));
        if (targets.length !== 1) throw new Error("无法唯一识别出牌确认按钮");
        const b = targets[0];
        const point = this.clickAt(b.x + b.w / 2, b.y + b.h / 2);
        this.trace("card-confirm-clicked", { id: action.id, point });
        
      }
    }
    selectedSummonsIn(f,before){
      // Search only pre-action real slots. A half-tulpa drawn by the game's
      // outcome preview is not a new selectable target or an observed summon.
      return (before.summons||[]).filter(s=>s.point&&this.matches(f,"ailin/target-selected",
        this.observedRoi("board",[s.point[0]-65,s.point[1]-65,130,130]),.90,true).length===1);
    }
    async confirmSummonDiscard(a,b){
      const expected=b.summons?.find(s=>s.index===a.summonIndex&&s.name===a.summonName);
      if(!expected||!b.summonCountKnown)throw Error("召唤物目标没有当前观察依据");
      const origin=TCG.actionKey(a)+"/"+TCG.boardKey(b);
      if(this.choiceSession&&this.choiceSession.origin!==origin)throw Error("另一个选择仍待完成");
      this.choiceSession||={kind:"summon-target",origin,target:expected.index,name:expected.name,
        uses:expected.uses,point:expected.point.slice(),selectedInputSent:false,confirmed:false};
      // The shared pending-action owner resumes this page. A timeout cannot
      // re-drag M, reselect the target, or send the confirm a second time.
    }
    async resolveSummonTarget(before){
      const session=this.choiceSession,owner=this.confirmationSession,a=owner?.plan?.action;
      if(session?.kind!=="summon-target"||a?.id!=="blessingM"||
        session.origin!==owner.key||!before||TCG.actionKey(a)+"/"+TCG.boardKey(before)!==owner.key)
        throw Error("召唤物选择没有当前动作归属");
      let exitKey="",exitReads=0;
      for(let attempt=0;attempt<24;attempt++){
        const sampledAt=Date.now(),revision=this.inputRevision;
        const sample=this.frame(f=>({phase:this.phaseIn(f),banner:this.cardBannerIn(f),
          selected:this.selectedSummonsIn(f,before),
          controls:this.ocrRows(f,this.roi("bottom",[770,900,380,90])).filter(r=>TCG.norm(r.text)==="确定"),
          warning:this.warnings(f)}));
        await this.requireNoWarning(sample.warning);
        if(session.confirmed&&["board","pick","roll","settlement","result"].includes(sample.phase.phase)){
          const key=JSON.stringify(sample.phase);
          exitReads=key===exitKey?exitReads+1:1;exitKey=key;
          if(exitReads>=2){this.summonReceipt={...this.summonReceipt,exited:true};this.choiceSession=null;
            this.handNeedsReset=true;this.boardReady=false;
            this.trace("summon-target-exited",this.summonReceipt);return sample.phase;}
        }else {exitReads=0;exitKey="";}
        const targetPage=sample.phase.phase==="unknown"&&sample.phase.turn==="none"&&
          TCG.norm(sample.banner)==="对所选我方召唤物生效";
        if(targetPage&&!session.confirmed){
          const selected=sample.selected.length===1&&sample.selected[0].index===session.target;
          if(!selected&&!session.selectedInputSent){
            session.selectedInputSent=true;this.clickAt(...session.point);await sleep(120);continue;
          }
          if(selected&&sample.controls.length===1){
            const button=sample.controls[0];session.confirmed=true;
            this.summonReceipt={origin:session.origin,id:a.id,index:session.target,name:session.name,
              uses:session.uses,exited:false};
            this.clickAt(button.x+button.w/2,button.y+button.h/2);
            this.trace("summon-target-confirmed",this.summonReceipt);await sleep(120);continue;
          }
        }
        await this.waitForSample(sampledAt,250,revision);
      }
      const e=Error("召唤物目标或确认控件仍待核实");e.code="TCG_CHOICE_RETRY";throw e;
    }
    async executeInput(a,b,m){
      this.soupReceipt=null;this.summonReceipt=null;
      if(a.type==="skill"&&!TCG.skillLegal(b,a,m))throw Error("技能资源/充能预检失败");
      if(a.type==="card"&&!TCG.cardLegal(b,a,m))throw Error("卡牌目标、费用或前置条件不合法");
      await this.requireUnchangedBoard(b,a);
      if(a.type==="probe")return this.probeSkill(a,b,m);
      const cost=a.type==="skill"?TCG.size(TCG.skillCost(a.who,a.skill,m,b)):a.type==="card"?
        TCG.size(TCG.cardCost(a.id,a.target,m)):a.type==="switch"?TCG.size(TCG.switchCost(m)):0,
        randomRefund=a.type==="card"&&(a.id==="blessingM"||a.id==="toss"||
          ["food","team-food"].includes(TCG.byId[a.id]?.type)&&m.supports.some(x=>x.id==="chef"&&x.refundRound!==m.round));
      this.expectedDice=a.type==="end"||randomRefund?null:TCG.total(b.dice)-cost+TCG.total(TCG.cardRefund(a,m,b));
      const wearer=a.type==="switch"?a.target:b.active;
      this.gamblerBudget=m.artifactKinds[wearer]==="gambler"?{owner:wearer,remaining:TCG.gamblerRemaining(m,wearer),enemies:TCG.enemyCount(b)}:null;
      this.boardReady=false;
      if(a.type==="card"||a.type==="tune")await this.inputHand(a,b,m);
      else if(a.type==="skill")await this.inputSkill(a,b);
      else if(a.type==="switch")await this.inputSwitch(a,b,m);
      else if(a.type==="end")await this.inputEnd();
      else throw Error("未支持的动作："+a.type);
      this.autoRisk=a.type==="skill"||a.type==="card"&&!!(TCG.byId[a.id]?.combatSkill||TCG.byId[a.id]?.combatAction);
    }
    confirmationExtras(){return {soupReceipt:this.soupReceipt,summonReceipt:this.summonReceipt};}
  }
  // Equipment/food payment stays common; M alone owns its summon target page.
  const equipmentConfirm=BetterGIHost.prototype.cardConfirm;
  BetterGIHost.prototype.cardConfirm=function(a,b){return a.id==="blessingM"?this.confirmSummonDiscard(a,b):equipmentConfirm.call(this,a,b);};
  const soupResolve=BetterGIHost.prototype.resolveChoice;
  BetterGIHost.prototype.resolveChoice=function(b,m){return this.choiceSession?.kind==="summon-target"?
    this.resolveSummonTarget(b):soupResolve.call(this,b,m);};
  root.TCGBetterGI={...root.TCGBetterGI,BetterGIHost};
})(globalThis);

;
// @module player
// Generated from 牌手共享. Edit layered source, not this standalone output.
(function(root) {
  "use strict";
  const T=root.TCG;
  const BOARD_RETRIES = ["TCG_BOARD_RETRY", "TCG_DICE_RETRY"];
  const INPUT_REFRESHES = ["TCG_OBSERVATION_INTERRUPTED", "TCG_HAND_REFRESH", "TCG_STATE_REFRESH"];
  const BUDGET_FIELDS = [
    "expectedDice",
    "emptyHandProven",
    "gamblerBudget",
  ];
  const OPENING_DEFAULT="优先装备与启动牌";
  function playerOptions(settings = {}) {
  const supplied=settings||{};
  const defaultMinutes=TCG.defaultMaxMinutes||15;
  const options={enemyCount:3,maxMinutes:Number(supplied.maxMinutes||defaultMinutes),
    mulligan:TCG.openingSetting(supplied.mulligan),
    actionEntry:supplied.actionEntry||"禁止从行动页启动"};
  if(![10,15,20,30,defaultMinutes].includes(options.maxMinutes)||
    !["全部保留","优先装备与启动牌"].includes(options.mulligan)||
    !["禁止从行动页启动","确认新开局未行动"].includes(options.actionEntry))throw new Error("设置值无效");
  return options;
}
  const ELEMENT_NAMES = {
    Pyro: "火",
    Hydro: "水",
    Anemo: "风",
    Electro: "雷",
    Dendro: "草",
    Cryo: "冰",
    Geo: "岩",
    Omni: "万能",
  };
  function actionCommentary(a,s,m) {
    let text;
    if(a.type==="skill") {
      text=T.team[a.who].name+"使用「"+T.team[a.who].skills[a.skill]+"」";
      const purpose={"0:E":"挂冰并铺设低温冷藏机关", "1:CA":"积累隐具余数，为战技做准备", "1:E":"释放积攒的隐具余数，集中打伤害"}[a.who+":"+a.skill];
      if(purpose)text+="，"+purpose;
    }else if(a.type==="switch")text="切换"+T.team[a.target].name+"接力";
    else if(a.type==="card")text="使用「"+T.byId[a.id].name+"」"+(a.target!=null?"，目标"+T.team[a.target].name:"");
    else if(a.type==="tune")text="调和「"+(T.byId[a.id]?.name||s.hand[a.index].name)+"」，补充"+(ELEMENT_NAMES[a.element]||"当前角色所需元素")+"骰";
    else if(a.type==="probe")return a.scope==="card"?"查看「"+T.byId[a.id].name+"」的费用与效果，安排接下来的出牌。":"查看技能费用，安排接下来的输出。";
    else return "结束回合，准备下一轮。";
    if(a.followup?.type==="skill")text+="。接下来准备让"+T.team[a.followup.who].name+"使用「"+T.team[a.followup.who].skills[a.followup.skill]+"」";
    return text+"。";
  }
  // One owner for lifecycle/progress. Host owns native evidence and input;
  // strategy owns the next plan. Recovery never replays a submitted action.
  class Player {
    constructor(host, options) {
      this.host = host;
      this.options = options;
      this.memory = T.freshMemory();
      if(T.openingContext)this.memory.openingContext=T.openingContext({});
      host.memory=this.memory;
      this.deadline = Date.now() + options.maxMinutes * 60000;
      host.matchDeadline = this.deadline;
      this.actions = 0;
      this.lastProgress = Date.now();
      this.readyState = null;
      this.openingFlow = null;
      this.actionEntryHandPending = false;
      this.lastNotice = null;
    }
    progress() {
      this.lastProgress = Date.now();
      this.lastNotice = null;
    }
    notice(key, text) {
      if (this.lastNotice !== key) {
        this.lastNotice = key;
        log.info(text);
      }
    }
    checkStalled(message) {
      if (Date.now() >= this.deadline) throw new Error("达到单局时间上限，仍有未恢复的状态");
      if (Date.now() - this.lastProgress > 60000)
        this.notice("recovery:" + message, "[等待恢复] " + message.replace(/超时（60秒）/, "暂未读清") + "，继续核对，不重复输入。");
    }
    async defer(error, codes, event, message) {
      if (!codes.includes(error.code)) throw error;
      this.checkStalled(message);
      this.host.trace(event, { code: error.code, missing: error.missing, phase: error.phase,
        reason: String(error.message || error) });
      await sleep(400);
    }
    finishOpening() {
      const accepted = this.openingFlow.enterBoard(this.memory);
      if (!accepted) return;
      T.initializeOpening?.(this.memory);
      if (accepted.roundSeeded)
        this.host.trace("round", {
          round: this.memory.round,
          source: "verified-opening-board",
          keep: null,
        });
      this.host.trace("opening-ready", accepted);
    }
    reportResult(p) { log.info(p.result === "win" ? "对局胜利" : "对局失败"); }
    admitActionHand(state) {
      if (!this.actionEntryHandPending) return;
      if (state.hand?.length !== 7)
        throw new Error("新开局手牌数量不符：应有7张未使用的初始手牌，当前" + state.hand?.length + "张");
      this.host.trace("fresh-action-hand-verified", { count: state.hand.length, reusedFirstRead: true });
      this.actionEntryHandPending = false;
    }
    async enter() {
      const host = this.host;
      const manifest = JSON.parse(file.readTextSync("manifest.json"));
      host.trace("start", {
        version: manifest.version,
        scriptName: manifest.name,
        sharedVersion: T.sharedVersion,
        options: this.options,
      });
      host.trace("team-assumed", {
        names: T.team.map((c) => c.name),
        order: "left-to-right",
        userConfirmed: true,
      });
      await host.waitForCapture();
      const initial = host.phase();
      if (initial.phase === "result") {
        host.trace("terminal-entry", initial);
        log.info("当前对局已结束，请进入新对局后再启动。");
        return false;
      }
      this.openingFlow = new T.OpeningFlow(initial.phase);
      host.trace("opening-entry", {
        entry: initial.phase,
        actionEntry: this.options.actionEntry,
        midgameRestore: false,
      });
      if (initial.phase === "board") {
        if (this.options.actionEntry !== "确认新开局未行动")
          throw new Error("行动页启动需要选择“确认新开局未行动”");
        const board = await host.admitFreshActionBoard();
        host.expectedDice = T.total(board.dice);
        this.actionEntryHandPending = true;
        this.finishOpening();
      }
      return true;
    }
    async opening() {
      this.host.runStage = "opening";
      const flow = this.openingFlow;
      if (flow.opened || flow.picked || flow.rolled || flow.complete)
        throw new Error("开局阶段异常：再次出现初始手牌");
      await this.host.opening();
      const kept = this.host.openingCards;
      if (this.options.mulligan === "全部保留") log.info("[起手] 按设置确认当前手牌，不主动置换。");
      else if (Array.isArray(kept))
        log.info(
          "[起手] " +
            (kept.length === 5
              ? "保留全部五张手牌，不置换。"
              : kept.length
                ? `保留${kept.map((c) => `「${c.name}」`).join("、")}，其余${5 - kept.length}张置换，寻找更合适的启动牌。`
                : "置换全部五张手牌，重新寻找启动牌。"),
        );
      this.memory.openingIds = (this.host.openingCards || []).map((c) => c.id);
      flow.record("opening");
      this.progress();
    }
    async choice() {
      this.host.runStage = "choice";
      try {
        await this.host.resolveChoice(null, this.memory);
        this.progress();
      } catch (e) {
        await this.defer(e, ["TCG_CHOICE_RETRY"], "choice-deferred", "挑选卡牌等待超时（60秒）");
      }
      this.readyState = null;
    }
    planOpening(stage) {
      this.memory.openingTarget=0;
      this.host.trace("opening-character-plan",{target:0,stage:stage||"initial-pick",route:"爱可菲挂冰后按实际资源接力林尼或水形幻人"});
      return {target:0};
    }
    async replacement() {
      this.host.runStage = "replacement";
      const host = this.host,
        memory = this.memory;
      this.readyState = null;
      try {
        if (host.forcedPickSession) {
          const after = await host.pick(host.forcedPickSession.target, false);
          if (after) T.noteBoard(memory, after);
          this.progress();
          return;
        }
        const board = host.board();
        T.noteBoard(memory, board);
        const wanted = T.replacement(board, memory);
        if (!wanted) {
          const error = new Error("阵亡后的存活角色未读清");
          error.code = "TCG_PICK_RETRY";
          throw error;
        }
        host.trace("replacement-plan", {
          target: wanted.who,
          characters: board.characters,
          dice: board.dice,
        });
        host.trace("replacement-hand-policy", {
          mode: host.handCache === null ? "full-read-required" : "reuse-with-visible-count-check",
        });
        const defeated = board.characters.flatMap((c, i) =>
          c.dead === true ? [T.team[i].name] : [],
        );
        this.notice(
          "replacement:" + defeated.join(",") + ":" + wanted.who,
          "[接力] " +
            (defeated.length ? defeated.join("、") + "已阵亡，" : "") +
            "准备切换" +
            T.team[wanted.who].name +
            "继续作战。",
        );
        const after = await host.pick(wanted.who, false);
        if (after) T.noteBoard(memory, after);
        this.progress();
      } catch (error) {
        await this.defer(
          error,
          ["TCG_PICK_RETRY", ...BOARD_RETRIES],
          "replacement-deferred",
          "阵亡换人识别超时（60秒）",
        );
      }
    }
    async pick() {
      this.host.runStage = "pick";
      if (this.openingFlow.complete || this.actions > 0) return this.replacement();
      if (this.openingFlow.picked) throw new Error("开局阶段异常：首次出战后再次出现选人页");
      const choice = this.planOpening();
      const after = await this.host.pick(choice.target, true);
      this.memory.lastActive = choice.target;
      this.openingFlow.record("pick");
      if (after?.phase === "board") this.finishOpening();
      this.progress();
    }
    async roll() {
      this.host.runStage = "roll";
      const flow = this.openingFlow;
      if (!flow.complete && flow.rolled) throw new Error("开局阶段异常：首次掷骰后再次出现重投页");
      if (!flow.complete && !flow.picked && this.memory.openingTarget === null)
        this.planOpening("before-initial-roll");
      const after = await this.host.roll(this.memory, {
        allowInitialPick: !flow.complete && !flow.picked,
      });
      if (!flow.complete) {
        flow.record("roll");
        if (after?.phase === "board") this.finishOpening();
      }
      this.progress();
    }
    async observe() {
      const host = this.host, start = Date.now(), metrics = host.metricSnapshot?.(),
        reused = !!this.readyState;
      host.runStage = "observation";
      let state, outcome = "failed", failure = null, readError = null;
      try {
        try { state = this.readyState || (await host.observe()); }
        catch (e) {
          readError = e;
          this.readyState = null;
          await this.defer(e, [...BOARD_RETRIES, "TCG_HAND_RETRY"], "observation-deferred", "牌桌识别超时（60秒）");
          outcome = "deferred";
          return null;
        }
        if (this.readyState)
          host.trace("decision-state-reused", { handCount: this.readyState.hand.length });
        this.readyState = null;
        if (state.phase !== "board" || state.turn !== "user") {
          host.trace("decision-deferred", { phase: state.phase, turn: state.turn });
          await sleep(300);
          outcome = "deferred";
          return null;
        }
        this.admitActionHand(state);
        if (!this.openingFlow.complete) this.finishOpening();
        T.refreshSkillCosts(this.memory,state);
        T.noteBoard(this.memory, state);
        host.trace("state", { round: this.memory.round, state, memory: this.memory });
        outcome = "complete";
        return state;
      } catch (e) { failure = e; throw e; }
      finally {
        try {
          host.trace("observation-timing", { ms: Date.now() - start, reused, outcome,
            handRead: state?.handRead, code: readError?.code, missing: readError?.missing,
            recognition: host.metricDelta?.(metrics) });
        } catch (e) { if (!failure) throw e; } // Secondary diagnostic failure must not replace the original error.
      }
    }
    rejectUnchangedTune(action, before, after) {
      if (action.type !== "tune" || !T.legalState(after) || T.boardKey(before) !== T.boardKey(after))
        return false;
      T.rejectAction(this.memory, action, before);
      this.host.trace("tuning-retry-alternative", { action, proof: "full-hand-and-board-unchanged" });
      const card = before.hand[action.index]?.name || "这张牌";
      this.notice("tune-rejected:" + action.id, `[调和] 「${card}」未调和成功，手牌与骰子未变，改用其他牌或行动。`);
      return true;
    }
    async recoverRejectedInput(error, action, state, previousBudget) {
      const tune = action.type === "tune";
      if (error.code !== "TCG_INPUT_REJECTED" && !(tune && error.code === "TCG_TUNE_UNCONFIRMED")) return false;
      const host = this.host;
      this.readyState = null;
      Object.assign(host, previousBudget);
      if (error.code === "TCG_INPUT_REJECTED") T.rejectAction(this.memory, action, state);
      let after = await this.awaitObservation({ mode: "full",
        ...(error.code === "TCG_INPUT_REJECTED" ? { rejectedHand: state.hand } : {}) });
      if (tune && error.code === "TCG_TUNE_UNCONFIRMED") {
        if (T.verifyResynchronized(action, state, after, false)) {
          // The same native effect predicate has confirmed recovery. Carry
          // that fact to commit, without changing the raw observed frame.
          after = { ...after, confirmed: true };
          T.commit(this.memory, action, state, after);
          host.trace("confirmed", { action, after, memory: this.memory, source: "tuning-recovery" });
          log.info("[调和] 已核实手牌消耗与元素骰变化，继续后续行动。");
        } else if (!this.rejectUnchangedTune(action, state, after)) {
          T.deferUncertain(this.memory, action, state);
          host.trace("action-uncertain", { action, after, memory: this.memory });
          log.warn("[调整] 调和结果未能确认，按实际牌面继续，不重复烧牌。");
        }
      } else {
        this.notice("input-rejected", tune
          ? "[调和] 当前牌未被游戏接受，改用其他牌或行动。"
          : "[调整] 当前行动未被游戏接受，重新同步后换一种选择。");
        host.trace("native-input-rejected", { action, reason: error.message });
      }
      if (T.legalState(after)) {
        host.adoptObservedState(after, tune ? "tuning-recovery-resync" : "native-rejection-resync");
        this.readyState = after;
      }
      T.noteBoard(this.memory, after);
      this.actions++;
      this.progress();
      return true;
    }
    async awaitConfirmation(action, before, memory = this.memory) {
      this.host.matchDeadline = this.deadline;
      while (Date.now() < this.deadline) {
        try { return await this.host.confirm(action, before, memory); }
        catch (e) {
          if (!["TCG_CONFIRMATION_RETRY", "TCG_BOARD_RETRY", "TCG_DICE_RETRY", "TCG_HAND_RETRY"].includes(e.code)) throw e;
          this.notice("pending:" + T.actionKey(action), "[等待恢复] 动作已经提交，继续核对结果，不重复输入。");
          this.host.trace("confirmation-pending", { action, code: e.code, missing: e.missing,
            phase: e.phase?.phase, turn: e.phase?.turn, elapsedMs: e.elapsedMs, reason: e.message });
          const remaining = this.deadline - Date.now();
          if (remaining > 0) await sleep(Math.min(400, remaining));
        }
      }
      throw new Error("达到单局时间上限，待确认动作未能安全恢复");
    }
    async awaitObservation(plan) {
      while (Date.now() < this.deadline) {
        try { return await this.host.observe(true, plan); }
        catch (e) {
          await this.defer(e, [...BOARD_RETRIES, "TCG_HAND_RETRY"], "recovery-read-deferred", "牌桌重新同步超时（60秒）");
        }
      }
      throw new Error("达到单局时间上限，实际牌面仍未读清");
    }
    async recoverBeforeConfirmation(error, action, state, previousBudget) {
      const host = this.host;
      this.readyState = null;
      if (await this.recoverRejectedInput(error, action, state, previousBudget)) return;
      if (!INPUT_REFRESHES.includes(error.code)) throw error;
      Object.assign(host, previousBudget);
      host.trace("execution-deferred", { action, phase: error.phase?.phase, turn: error.phase?.turn,
        code: error.code, reason: String(error.message || error) });
      if (error.code !== "TCG_OBSERVATION_INTERRUPTED") {
        this.notice("resync", "[调整] 牌面发生变化，重新同步后继续。");
          let refreshed;
          try { refreshed = await host.observe(true, error.code === "TCG_HAND_REFRESH"
            ? { mode: "full", ...host.handContinuation } : { mode: "unchanged", hand: state.hand });
          } catch (e) {
            await this.defer(e, [...BOARD_RETRIES, "TCG_HAND_RETRY"], "execution-resync-deferred", "牌桌重新同步超时（60秒）");
            return;
          }
          if (refreshed.phase === "board" && refreshed.turn === "user" && T.legalState(refreshed)) {
            host.adoptObservedState(refreshed, "before-input-resync"); this.readyState = refreshed;
          }
      }
      await sleep(300);
    }
    async execute(action, state) {
      const budget = Object.fromEntries(BUDGET_FIELDS.map(key => [key, this.host[key]]));
      try { return { sent: true, result: await this.host.execute(action, state, this.memory) }; }
      catch (e) { await this.recoverBeforeConfirmation(e, action, state, budget); return { sent: false }; }
    }
    async act() {
      const state = await this.observe();
      if (!state) return;
      const host = this.host, memory = this.memory, started = Date.now(), metrics = host.metricSnapshot?.();
      let action, inputAt = null, confirmationAt = null, postActionAt = null,
        outcome = "failed", confirmed = false, failure = null;
      host.runStage = "planning";
      try {
        action = T.choose(state, memory);
        host.trace("decision", action);
        if (action.type === "stop") throw new Error(action.reason);
        inputAt = Date.now(); host.runStage = "input";
        const execution = await this.execute(action, state);
        if (!execution.sent) { outcome = "not-submitted"; return; }
        log.info("[第" + memory.round + "回合] " + actionCommentary(action, state, memory));
        if (action.type === "probe" && execution.result?.probed) {
          outcome = "probed"; this.readyState = execution.result; this.progress(); return;
        }
        confirmationAt = Date.now(); host.runStage = "confirmation";
        const after = await this.awaitConfirmation(action, state, memory);
        postActionAt = Date.now(); host.runStage = "post-action";
        confirmed = !!after.confirmed;
        if (after.confirmed) {
          T.commit(memory, action, state, after);
          host.trace("confirmed", { action, after, memory });
        } else if (!(after.handRead === "full" && this.rejectUnchangedTune(action, state, after))) {
          T.deferUncertain(memory, action, state);
          host.trace("action-uncertain", { action, after, memory });
          log.warn("动作效果未确认，已重新同步，不重复输入。");
        }
        T.noteBoard(memory, after);
        host.handContinuation = after.handContinuation || null;
        const refreshHand = after.confirmed && after.handRefreshRequired === true;
        if (refreshHand) {
          // Consumption can precede card insertion (native draw 3 -> 2). Do not
          // plan from that partial hand. This also covers non-draw categories
          // explicitly declaring delayed insertion. No predicted count or replayed input.
          host.invalidateHand("consumed-hand-changing-card-needs-fresh-hand", host.handContinuation);
          host.trace("draw-hand-refresh-required", { id: action.id, beforeCount: state.hand.length,
            observedCount: after.hand.length, handPlanMode: "full", consumptionConfirmed: true, effectsComplete: false });
        }
        if (refreshHand || after.confirmed && after.freshObservationRequired) {
          // A new observe(), not a blanket sleep or a model-damage predicate.
          // Drop the recent-board shortcut too; unchanged hand identity may stay.
          this.readyState = null;
          host.boardReady = false; host.lastObservedAt = 0; host.lastObservedRevision = -1;
          host.preparedHandInput = null;
          if (after.freshObservationRequired) host.autoRisk = true;
          host.trace("post-confirmation-refresh-required", { action, handRefresh: refreshHand,
            combatWithoutObservedTransition: after.freshObservationRequired === true,
            quietObservationRequired: after.freshObservationRequired === true,
            consumptionConfirmed: after.confirmed, effectsComplete: false });
        } else if (after.phase === "board" && after.turn === "user" && T.legalState(after)) this.readyState = after;
        this.actions++; this.progress();
        outcome = confirmed ? "confirmed" : "unconfirmed";
      } catch (e) { failure = e; throw e; }
      finally {
        const ended = Date.now();
        try {
          host.trace("action-timing", { action: action ? T.actionKey(action) : null, outcome, confirmed,
            planningMs: (inputAt ?? ended) - started,
            inputMs: (confirmationAt ?? ended) - (inputAt ?? ended),
            settlementMs: (postActionAt ?? ended) - (confirmationAt ?? ended),
            postActionMs: ended - (postActionAt ?? ended), totalMs: ended - started,
            recognition: host.metricDelta?.(metrics), scope: "actual-runtime-not-offline-estimate" });
        } catch (e) { if (!failure) throw e; } // Keep cancellation/program errors intact.
      }
    }
    async run() {
      try {
        this.host.runStage = "entry";
        if (await this.enter() === false) return;
        while (Date.now() < this.deadline && this.actions < 180) {
          this.host.runStage = "phase-wait";
          const sampledAt = Date.now();
          const p = this.host.phase();
          if (p.phase !== "board" || p.turn !== "user") this.readyState = null;
          if (p.result) {
            this.host.trace("result", p);
            this.reportResult(p);
            return;
          }
          if (this.host.forcedPickSession) await this.replacement();
          else if (this.host.choiceSession || p.phase === "choice") await this.choice();
          else if (p.phase === "opening") await this.opening();
          else if (p.phase === "pick") await this.pick();
          else if (p.phase === "roll") await this.roll();
          else if (p.turn === "user") await this.act();
          else {
            this.checkStalled("对局等待超时（60秒）");
            const remaining = 500 - (Date.now() - sampledAt);
            if (remaining > 0) await sleep(remaining);
          }
        }
        throw new Error("达到单局时间或动作上限");
      } catch (e) {
        const reason = String(e.message || e);
        this.host.reportStop(reason, e.code);
        log.error("牌手停止：" + reason);
        throw e;
      } finally {
        this.host.dispose();
      }
    }
  }
  root.TCGPlayer = { Player, playerOptions, actionCommentary };
})(globalThis);

;
// @module collapsed-hand
// Shared no-input folded-hand layout and identity reader.
(function(root) {
  "use strict";
  const ROI=[430,977,1050,42], STEP=85.3, CENTER=862.7;
  const median=xs=>{const s=xs.slice().sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
  function locateRow(matches) {
    const groups=[];
    for(const m of matches.filter(m=>Number.isFinite(m.x)&&Number.isFinite(m.y)&&m.y>=978&&m.y<=989).sort((a,b)=>a.x-b.x)){
      const last=groups[groups.length-1];
      if(last&&m.x-last[last.length-1].x<=12)last.push(m);else groups.push([m]);
    }
    // BetterGI FindMulti need not expose correlation values: use the central
    // native row, not an off-row art peak. Entire row, not an equal-spaced subset.
    // Interior artwork can match the edge template. Choose the complete native
    // grid, not the number of raw peaks; never accept a subset hiding outer edges.
    const candidates=[];
    for(let n=1;n<=10;n++){
      const first=CENTER-(n-1)*STEP/2;
      // The existing locator allows up to4px whole-row drift plus5px local
      // jitter. Candidate collection must not narrow that accepted envelope;
      // the median-row checks below still enforce each bound separately.
      const selected=Array.from({length:n},(_,i)=>groups.filter(g=>g.some(m=>Math.abs(m.x-first-i*STEP)<=9)));
      if(selected.some(g=>g.length!==1)||new Set(selected.map(g=>g[0])).size!==n)continue;
      if(groups.some(g=>g.every(m=>m.x<first-9||m.x>first+(n-1)*STEP+9)))continue;
      candidates.push(selected.map(g=>g[0]));
    }
    if(candidates.length!==1)return {status:groups.length?"unknown":"unavailable",reason:groups.length?"incomplete-or-moved-row":"no-visible-cost-row",count:null,slots:[]};
    const selected=candidates[0],firstExpected=CENTER-(selected.length-1)*STEP/2;
    const distance=(m,i)=>Math.abs(m.x-firstExpected-i*STEP)+Math.abs(m.y-983);
    const marks=selected.map((g,i)=>g.slice().sort((a,b)=>distance(a,i)-distance(b,i)||Math.abs(a.y-983)-Math.abs(b.y-983))[0]);
    const n=marks.length;
    const first=median(marks.map((m,i)=>m.x-i*STEP)),yy=median(marks.map(m=>m.y));
    if(Math.abs(first+(n-1)*STEP/2-CENTER)>4||Math.abs(yy-983)>4||
      marks.some((m,i)=>Math.abs(m.x-first-i*STEP)>5||Math.abs(m.y-yy)>4))
      return {status:"unknown",reason:"incomplete-or-moved-row",count:null,slots:[]};
    return {status:"readable",reason:"whole-cost-row",count:n,slots:marks.map((m,index)=>({
      index,marker:{x:Math.round(first+index*STEP),y:Math.round(yy)},id:null,
      // Two visible interior patches; never a digit, gold border, or next slot.
      rect:[Math.round(first+index*STEP)+34,Math.round(yy)+48,46,48],
      visibleMask:[[0,0,46,22],[0,26,46,22]]
    }))};
  }
  function locate(width,height,matches,transform=null) {
    if(transform&&width===1920&&height===1200){
      const {scale,dx,dy}=transform;
      const read=locateRow(matches.map(m=>({...m,x:(m.x-dx)/scale,y:(m.y-dy)/scale})));
      return {...read,slots:read.slots.map(s=>({...s,
        marker:{x:s.marker.x*scale+dx,y:s.marker.y*scale+dy},
        rect:[s.rect[0]*scale+dx,s.rect[1]*scale+dy,s.rect[2]*scale,s.rect[3]*scale]}))};
    }
    if(width!==1920||height!==1080)return {status:"unavailable",reason:"capture-size",count:null,slots:[]};
    return locateRow(matches);
  }
  function scoreFloor(entry,bank) {
    if(entry&&entry.scoreFloor!==undefined)return entry.scoreFloor;
    return bank.scoreFloor;
  }
  function identify(layout,bank,score) {
    if(layout.status!=="readable")return layout;
    const views=bank.entries.flatMap(entry=>(entry.views??[{name:"original",patches:entry.patches}]).map(view=>({
      id:entry.id,name:view.name??"original",scoreFloor:scoreFloor(entry,bank),titleCandidates:entry.titleCandidates,
      patches:Array.isArray(view.patches)&&view.patches.length===bank.patches.length
        ?Array.from(view.patches,file=>typeof file==="string"?file:null):[]
    })));
    return {...layout,slots:layout.slots.map(slot=>{
      // A view owns a complete pair. Never splice the best individual patches
      // of different views; runner-up is another identity, not the same card.
      const identities=new Map();
      for(const view of views){
          const scores=view.patches.map((file,k)=>file===null?NaN:score(slot,bank.patches[k],file));
          const rank={id:view.id,view:view.name,scores,scoreFloor:view.scoreFloor,titleCandidates:view.titleCandidates,
            score:scores.length===bank.patches.length&&scores.length>0&&scores.every(Number.isFinite)?Math.min(...scores):-1};
          // Explicit same-art variants (such as countdown stages) compete as
          // one unresolved family. Distinct artwork competes by exact card ID.
          const identity=view.titleCandidates?"family:"+view.titleCandidates.slice().sort().join("/"):view.id;
          if(!identities.has(identity)||rank.score>identities.get(identity).score)identities.set(identity,rank);
      }
      const ranks=[...identities.values()].sort((a,b)=>b.score-a.score);
      const best=ranks[0],gap=best&&ranks[1]?best.score-ranks[1].score:0;
      const floor=scoreFloor(best,bank);
      const accepted=best&&best.score>=floor&&gap>=bank.runnerUpGap;
      const titleCandidates=accepted?best.titleCandidates:null;
      const id=accepted&&!titleCandidates?best.id:null;
      let rejectionReason=null;
      if(!id){
        if(titleCandidates)rejectionReason="variant-title";
        else if(!best)rejectionReason="no-candidate";
        else if(best.score<floor)rejectionReason="score-floor";
        else rejectionReason="runner-up-gap";
      }
      return {...slot,id,rejectionReason,score:best?.score??-1,gap,view:best?.view??null,
        ...(titleCandidates?{titleCandidates}:{}),
        candidate:best?.id??null,patchScores:best?.scores??[],
        runnerUp:ranks[1]?{id:ranks[1].id,score:ranks[1].score}:null};
    })};
  }
  function readCollapsedHand(frame,bank) {
    return identify(locate(frame.width,frame.height,frame.matches()),bank,frame.score);
  }
  const api={ROI,locate,locateRow,identify,readCollapsedHand};
  root.TCGCollapsedHand=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(globalThis);

;
// @module opening-hand
// Shared direct opening reader. Deck policies and input proofs are reused.
(function(root){
  "use strict";
  const xs=[383,665,960,1248,1535];
  // Click targets are not art centres. Slot 1 was six pixels left of its art.
  const artXs=[383,671,960,1248,1535];
  function rank(bank,score){
    return artXs.map((x,index)=>{
      const ranks=bank.entries.map(entry=>{
        const views=entry.views??[{patches:entry.patches}];
        return views.map(view=>{
          const scores=bank.patches.map((patch,k)=>score(x,patch,view.patches[k]));
          return {id:entry.id,view:view.name??"original",scores,
            value:scores.every(Number.isFinite)?Math.min(...scores):-1};
        }).sort((a,b)=>b.value-a.value)[0];
      }).sort((a,b)=>b.value-a.value);
      const best=ranks[0],gap=ranks.length>1?best.value-ranks[1].value:0;
      const winners=bank.patches.map((_,k)=>ranks.filter(r=>Number.isFinite(r.scores[k]))
        .sort((a,b)=>b.scores[k]-a.scores[k])[0]?.id);
      const floor=bank.entries.find(entry=>entry.id===best?.id)?.scoreFloor??bank.scoreFloor;
      const id=best&&winners.every(id=>id===best.id)&&best.value>=floor&&gap>=bank.runnerUpGap?best.id:null;
      return {index,id,score:best?.value??-1,gap,view:best?.view??null};
    });
  }
  async function read(host,bank,env,score){
    if(!bank)return null;
    const clean=f=>host.phaseIn(f).phase==="opening"&&!env.TCG.norm(host.ocr(f,host.roi("details", [58,112,339,53])))&&
      xs.every(x=>!env.TCG.norm(host.ocr(f,host.roi("opening", [x-100,730,200,60]))));
    const sample=()=>host.frame(f=>{
      if(!clean(f))return null;
      return rank(bank,(x,p,file)=>score(host,env,f,x+p[0],p[1],p[2],p[3],file,3,
        host.roi("opening",[x+p[0],p[1],p[2],p[3]])));
    });
    const sampledAt=Date.now(),first=sample();if(!first)return null;
    if(first.every(slot=>slot.id))return first.map(slot=>slot.id);
    const remaining=120-(Date.now()-sampledAt);
    if(remaining>0)await env.sleep(remaining);
    const second=sample();return second?second.map(slot=>slot.id):null;
  }
  async function opening(host,T,sleep,ids){
    const original=await host.openingSelections(xs);
    let selected=original.slice(),pendingInspection=null;
    const cards=ids.map((id,index)=>id&&T.byId[id]?T.observedCard(T.byId[id].name,index):null);
    const recordInput=(index,purpose,actual)=>{
      const verified=!!actual&&actual.every((v,i)=>v===(i===index?!selected[i]:selected[i]));
      host.trace("opening-card-input",{index,purpose,before:selected[index],after:actual?.[index]??null,verified});
      return verified;
    };
    const verify=async(index,purpose)=>{
      let actual;
      try{actual=await host.openingSelections(xs);}
      catch(error){recordInput(index,purpose,null);pendingInspection=null;throw error;}
      const verified=recordInput(index,purpose,actual);pendingInspection=null;
      if(!verified)
        throw Error("起手置换标记未证实，不重复点击第"+(index+1)+"张牌");
      selected=actual;
    };
    const toggle=async(index,purpose)=>{
      if(host.phase().phase!=="opening")throw Error("起手置换前页面已改变");
      host.clickAt(...host.point("opening",xs[index]+70,540));await sleep(350);await verify(index,purpose);
    };
    try{
      for(let i=0;i<cards.length;i++)if(!cards[i]){
        if(host.phase().phase!=="opening")throw Error("起手补读前页面已改变");
        pendingInspection=i;
        const raw=await host.titleAt(xs[i]+70,540,true,false);
        await verify(i,"inspect-unknown");cards[i]=T.observedCard(raw,i);
        if(!cards[i])throw Error("第"+(i+1)+"张初始牌标题未读清，不自动确认开局");
        host.trace("opening-title-method",{index:i,method:"unknown-only",selectionChanged:true});
      }
    }catch(error){
      let actual;
      try{actual=await host.openingSelections(xs);}
      catch(failure){if(pendingInspection!==null)recordInput(pendingInspection,"inspect-unknown",null);throw failure;}
      if(pendingInspection!==null)recordInput(pendingInspection,"inspect-unknown",actual);
      selected=actual;
      for(let i=0;i<5;i++)if(selected[i]!==original[i])await toggle(i,"rollback");
      throw error;
    }
    const context=T.openingContext({}),plan=T.openingPlan(cards,original,context);
    host.openingCards=plan.keep;
    host.trace("opening",cards);
    host.trace("opening-plan",{cards,keep:plan.keep.map(c=>c.id),
      replace:cards.filter(c=>plan.replace[c.index]).map(c=>c.id),
      replaceIndices:plan.replace.flatMap((v,i)=>v?[i]:[]),duplicateWeaponIndices:plan.duplicateWeapons,context});
    // Restore kept inspection marks before starting final replacements.
    // Each mismatch still receives exactly one proven single-bit toggle.
    for(let i=0;i<5;i++)if(selected[i]&&!plan.replace[i])await toggle(i,"reconcile");
    for(let i=0;i<5;i++)if(!selected[i]&&plan.replace[i])await toggle(i,"reconcile");
    host.trace("opening-selection-verified",{original,selected,proof:"two-stable-native-replace-labels-per-input"});
    return host.confirmOpening({policy:"known-priority",recognition:"direct-art-unknown-title-fallback",
      selectedByScript:selected.flatMap((v,i)=>v?[i]:[])});
  }
  root.TCGOpeningHand={xs,artXs,rank,read,opening};
  if(typeof module!=="undefined"&&module.exports)module.exports=root.TCGOpeningHand;
})(globalThis);

;
// @module hand-recognition
// Shared recognition adapter. Combat input and deck policies remain unchanged.
(function(root){
  "use strict";
  const C=root.TCGCollapsedHand;
  function peak(search,template,cv){
    let input=null,response=null,columns=null,maximum=null;
    try{
      input=cv.InputArray.Create(template);
      response=search.MatchTemplate(input,cv.TemplateMatchModes.CCoeffNormed,null);
      columns=response.Reduce(cv.ReduceDimension.Row,cv.ReduceTypes.Max,-1);
      maximum=columns.Reduce(cv.ReduceDimension.Column,cv.ReduceTypes.Max,-1);
      const value=Number(maximum.Mean(null).Val0);
      if(!Number.isFinite(value)||value < -1.0001||value > 1.0001)throw Error("无效的牌面相关分数");
      return value;
    }finally{
      for(const mat of new Set([maximum,columns,response]))if(mat)mat.dispose();
      if(input)input.Dispose();
    }
  }
  function score(host,env,f,x,y,w,h,filename,pad,area=host.observedRoi("handFolded",[x,y,w,h])){
    return host.artworkScore(f,area,filename,pad,
      (search,template)=>peak(search,template,env.OpenCvSharp.OpenCvSharp));
  }
  function checkedBank(T,bank){
    if(!bank||!Number.isFinite(bank.scoreFloor)||bank.scoreFloor<=0||bank.scoreFloor>1||
      bank.runnerUpGap!==.20||!Array.isArray(bank.entries))
      throw Error("手牌识别库格式不正确");
    for(const entry of bank.entries){
      if(!entry.name||!T.byId[entry.id]||T.norm(entry.name)!==T.norm(T.byId[entry.id].name))
        throw Error("手牌识别库与牌组身份不匹配："+entry.id);
      checkedThreshold(entry,"scoreFloor");
      checkedThreshold(entry,"stableScore");
      if(entry.titleCandidates!==undefined&&(!Array.isArray(entry.titleCandidates)||
        entry.titleCandidates.length<2||!entry.titleCandidates.includes(entry.id)||
        new Set(entry.titleCandidates).size!==entry.titleCandidates.length||entry.titleCandidates.some(id=>!T.byId[id])))
        throw Error("牌面变体身份不正确："+entry.id);
      if(entry.animated!==undefined&&typeof entry.animated!=="boolean")
        throw Error("动态牌面标记不正确："+entry.id);
      const views=entry.views??[{patches:entry.patches}];
      if(!views.length||views.some(view=>!Array.isArray(view.patches)||
        view.patches.length!==bank.patches.length||view.patches.some(file=>typeof file!=="string")))
        throw Error("牌面完整视图不正确："+entry.id);
    }
    return bank;
  }
  function checkedThreshold(entry,field){
    const value=entry[field];
    if(value!==undefined&&(!Number.isFinite(value)||value<=0||value>1))
      throw Error("单牌识别门槛不正确："+entry.id);
  }
  function classes(env,bank,openingBank=null){
    const T=env.TCG;
    checkedBank(T,bank);
    if(bank.expanded)checkedBank(T,bank.expanded);
    if(openingBank)checkedBank(T,openingBank);
    const atlas=new Map();
    function addTemplate(filename,item,ui=false){
      const r=item?.rect;
      if(!item||!(ui?item.file==="assets/card-atlas/ui.png":/^assets\/card-atlas\/(hand|opening|expanded)\.png$/.test(item.file))||
        !Array.isArray(r)||r.length!==4||!r.every(Number.isInteger)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0)
        throw Error("模板图集索引无效："+filename);
      if(atlas.has(filename)&&JSON.stringify(atlas.get(filename))!==JSON.stringify(item))throw Error("模板图集索引冲突："+filename);
      atlas.set(filename,item);
    }
    for(const library of [bank,openingBank].filter(Boolean)){
      for(const part of [library,library.expanded].filter(Boolean))for(const entry of part.entries){
        for(const filename of [...(entry.patches||[]),...(entry.views||[]).flatMap(view=>view.patches)]){
          addTemplate(filename,library.atlas?.[filename]);
        }
      }
    }
    for(const [filename,item]of Object.entries(bank.uiAtlas||{}))addTemplate(filename,item,true);
    class Host extends env.TCGBetterGI.BetterGIHost{
      readTemplateImage(filename){
        const item=atlas.get(filename);
        if(!item)throw Error("缺少模板图集索引："+filename);
        const key="@atlas/"+item.file;
        if(!this.templates.has(key)){
          const image=env.file.readImageMatSync(item.file);
          if(image.empty()){image.dispose();throw Error("缺少模板图集："+item.file);}
          this.templates.set(key,image);
        }
        const image=this.templates.get(key),[x,y,w,h]=item.rect;
        if(x+w>Number(image.Cols)||y+h>Number(image.Rows))throw Error("模板图集区域越界："+filename);
        let region=null;
        try{
          region=image.SubMat(y,y+h,x,x+w);
          return region.Clone();
        }finally{if(region)region.dispose();}
      }
      nativeHandCountIn(f){
        return this.memoFrame(f,"collapsed/native-count",()=>super.handCountIn(f));
      }
      handCountIn(f){
        const native=this.nativeHandCountIn(f);
        if(native!==null||this.handFanReady||this.handNeedsReset||!Array.isArray(this.handCache))return native;
        const phase=this.phaseIn(f);
        if(phase.phase!=="board"||phase.turn!=="user")return null;
        const row=this.collapsedLayoutIn(f);
        if(row.status!=="readable"||row.count<this.handCache.length)return null;
        this.lastHandCountSource="full-folded-layout";
        return row.count;
      }
      collapsedLayoutIn(f){
        return this.memoFrame(f,"collapsed/layout",()=>C.locate(
          Number(f.width??f.Width),Number(f.height??f.Height),
          this.handCostMarkersIn(f,this.roi("handFolded", C.ROI),
            this.captureGeometry?.actualSize.width===2560),this.panelTransform("handFolded")));
      }
      raisedHandIn(f){
        const roi=[450,750,1310,200];
        return !!env.TCGBetterGI.costMarkerLayout(this.handCostMarkersIn(f,this.roi("handExpanded", roi)),null,this.panelTransform("handExpanded"));
      }
      collapsedIn(f){
        return this.memoFrame(f,"collapsed/identities",()=>{
          const read=C.identify(this.collapsedLayoutIn(f),bank,(slot,p,filename)=>{
          const [dx,dy,w,h]=p;
          return score(this,env,f,slot.marker.x+dx,slot.marker.y+dy,w,h,filename,2);
          });
          // Report native rejection once per row; external diagnostics own images.
          const missing=read.slots.filter(s=>!s.id&&!s.titleCandidates);
          if(read.status!=="readable"&&!this.diagnosticKeys.has("hand-layout-miss")){
            this.diagnosticKeys.add("hand-layout-miss");
            this.trace("hand-layout-miss",{reason:read.reason,inputs:0});
          }
          const key="hand-art-miss:"+JSON.stringify(read.slots.map(s=>s.id||s.candidate||null));
          if(missing.length&&!this.diagnosticKeys.has(key)){
            this.diagnosticKeys.add(key);
            this.trace("hand-art-miss",{count:read.count,slots:read.slots,inputs:0});
          }
          return read;
        });
      }
      readSelectedCardFacts(f,card,x){
        super.readSelectedCardFacts?.(f,card,x);
        const key="hand-unlisted:"+card.id;
        if(!bank.entries.some(e=>e.id===card.id)&&!this.diagnosticKeys.has(key)){
          this.diagnosticKeys.add(key);
          this.trace("hand-unlisted",{id:card.id,name:card.name,point:[x,945],inputs:0});
        }
      }
      expandedHandIn(f,count,targetIndex=null){
        if(!bank.expanded)return null;
        this.requireHandObservation(this.phaseIn(f),"expanded-hand-artwork");
        const native=this.nativeHandCountIn(f);
        if(native!==null&&native!==count){
          const error=Error("展开手牌数量已变化");error.code="TCG_HAND_RETRY";throw error;
        }
        const layout=this.handCostLayoutIn(f,count);
        if(!layout)return null;
        const slots=layout.markers.map((marker,index)=>({index,marker,point:layout.points[index]}));
        const read=C.identify({status:"readable",count,slots:targetIndex===null?slots:slots.filter(s=>s.index===targetIndex)},
          bank.expanded,(slot,p,filename)=>score(this,env,f,Math.round(slot.marker.x)+p[0],
            Math.round(slot.marker.y)+p[1],p[2],p[3],filename,2,
            this.observedRoi("handExpanded",[Math.round(slot.marker.x)+p[0],Math.round(slot.marker.y)+p[1],p[2],p[3]])));
        if(read.slots.every(s=>!s.id)&&!this.diagnosticKeys.has("expanded-art-miss")){
          this.diagnosticKeys.add("expanded-art-miss");
          this.trace("expanded-art-miss",{count,slots:read.slots,inputs:0});
        }
        return read;
      }
      async fillHandArtwork(cards,scan){
        if(!bank.expanded||!cards.length||cards.every(Boolean))return;
        const revision=this.inputRevision,started=Date.now();
        let read=this.frame(f=>this.expandedHandIn(f,cards.length));
        if(!read){
          // The first frame after the fan toggle may still be moving. Give
          // that same view one read-only follow-up, never another toggle.
          const remaining=120-(Date.now()-started);
          if(remaining>0)await env.sleep(remaining);
          if(this.inputRevision!==revision){
            const error=Error("展开牌面补帧期间输入已变化");error.code="TCG_HAND_RETRY";throw error;
          }
          read=this.frame(f=>this.expandedHandIn(f,cards.length));
        }
        if(!read)return;
        scan.titleCandidates??=[];
        for(const slot of read.slots)if(!cards[slot.index]){
          if(slot.id)cards[slot.index]=T.observedCard(T.byId[slot.id].name,slot.index);
          else if(slot.titleCandidates)scan.titleCandidates[slot.index]=slot.titleCandidates;
        }
        this.fillHandVariants(cards,read.slots,scan.retainedHand,scan.retainedVariantFamilies,scan.retainedHandOrder);
        this.trace("expanded-hand-artwork",{count:cards.length,known:cards.filter(Boolean).length,
          unknown:cards.flatMap((c,i)=>c?[]:[i]),inputs:0});
      }
      fillHandVariants(cards,slots,retainedHand,retainedFamilies=[],retainedOrder=false){
        // The deck owns variant rules; this layer only intersects a rule proof
        // with the observed artwork family. Prices never identify a variant.
        const proof=T.handVariantProof?.(this.memory,this.confirmationSession?.plan?.action);
        if(proof)for(const slot of slots)if(!cards[slot.index]&&slot.titleCandidates){
          const possible=slot.titleCandidates.filter(id=>proof.ids.includes(id));
          if(possible.length===1&&slot.titleCandidates.every(id=>proof.family.includes(id))){
            cards[slot.index]=T.observedCard(T.byId[possible[0]].name,slot.index);
            this.trace("hand-variant-inferred",{id:possible[0],index:slot.index,proof:proof.source,inputs:0});
          }
        }
        // Only an explicit rule guarantee can retain old identities across a
        // full sync. Artwork must classify all members of the current family.
        // Equal counts plus a unique identity or an explicit relative-order
        // contract resolve old members; new family members still need titles.
        if(!retainedHand)return;
        // Folded and expanded readers fill the same observation. An identity
        // already read in the folded row is not lost when its expanded art
        // misses; use the combined current evidence for family counting.
        const observed=slots.map(s=>cards[s.index]?{...s,id:cards[s.index].id}:s);
        const complete=observed.every(s=>s.id||s.titleCandidates);
        const done=new Set();
        for(const slot of slots)if(!slot.id&&slot.titleCandidates){
          const family=slot.titleCandidates,key=family.slice().sort().join("/");
          if(done.has(key))continue;done.add(key);
          // A rule-proven no-new-member action (e.g. kernel generation) keeps
          // the family count exact even if an unrelated card needs a title.
          const unchangedFamily=retainedFamilies.some(ids=>ids.length===family.length&&ids.every(id=>family.includes(id)));
          if(!complete&&!unchangedFamily)continue;
          const prior=retainedHand.filter(c=>family.includes(c.id)),ids=new Set(prior.map(c=>c.id));
          const current=observed.filter(s=>s.id?family.includes(s.id):
            s.titleCandidates?.length===family.length&&s.titleCandidates.every(id=>family.includes(id)));
          if(!prior.length||prior.length!==current.length||ids.size!==1&&!retainedOrder)continue;
          if(current.some((s,i)=>s.id&&s.id!==(retainedOrder?prior[i].id:prior[0].id)))continue;
          const indices=[];
          for(const [i,s] of current.entries())if(!cards[s.index]){
            const id=retainedOrder?prior[i].id:prior[0].id;
            cards[s.index]=T.observedCard(T.byId[id].name,s.index);indices.push(s.index);
          }
          if(indices.length)this.trace("hand-variants-reused",{id:ids.size===1?prior[0].id:null,ids:indices.map(i=>cards[i].id),indices,
            proof:retainedOrder?"retained-family-order-and-native-family-count":unchangedFamily?"rule-proven-unchanged-family-and-native-family-count":
              "retained-native-identities-and-complete-current-family-count",inputs:0});
        }
      }
      async folded(mode,settling=false){
        if(this.handFanReady||this.handNeedsReset)return null;
        const started=Date.now(),revision=this.inputRevision;
        const sample=()=>this.frame(f=>{
          const phase=this.phaseIn(f);
          if(phase.result||this.inputRevision!==revision||(mode==="pick"
            ?phase.phase!=="pick":phase.phase!=="board"||phase.turn!=="user"))return null;
          const read=this.collapsedIn(f);
          if(mode==="board"&&read.status!=="readable"&&this.raisedHandIn(f)){
            // Generation can raise the fan after our last reset. Trust this
            // native view, not the stale flag; the caller folds it once.
            this.handFanReady=true;this.handNeedsReset=true;
            return {read:{status:"raised",count:null,slots:[]},nativeCount:this.nativeHandCountIn(f)};
          }
          return {read,nativeCount:mode==="board"?this.nativeHandCountIn(f):5};
        });
        let read=null,failure=null,unavailableReason="first-frame-unavailable";
        try{
          let sampledAt=Date.now();
          const a=sample();if(!a)return null;
          if(a.read.status==="raised"){
            read={...a.read,nativeCount:a.nativeCount,stableReads:1};return read;
          }
          if(a.read.status==="readable"&&(a.nativeCount===null||a.nativeCount===a.read.count)&&a.read.slots.every(slot=>slot.id||slot.titleCandidates)){
            read={...a.read,nativeCount:a.nativeCount,countConflict:false,stableReads:1};
            return read;
          }
          // With neither a row nor a positive count, let handCount inspect the actual
          // view now. Only its stable structural absence can prove zero.
          if(settling&&a.read.reason==="no-visible-cost-row"&&!(a.nativeCount>0)){
            unavailableReason="no-row-count-next";return null;
          }
          unavailableReason="second-frame-unavailable";
          const remaining=120-(Date.now()-sampledAt);
          if(remaining>0)await env.sleep(remaining);
          sampledAt=Date.now();
          let b=sample(),reads=2;
          // A known draw/generation can outlast the board animation. Wait only
          // for missing/moving geometry, without input or mandatory extra reads
          // on a complete row. A phase/input change ends the wait immediately.
          while(settling&&b&&b.read.status!=="readable"&&b.read.status!=="raised"&&reads<6){
            const remaining=240-(Date.now()-sampledAt);
            if(remaining>0)await env.sleep(remaining);
            sampledAt=Date.now();b=sample();reads++;
          }
          if(b?.read.status==="raised"){
            read={...b.read,nativeCount:b.nativeCount,stableReads:reads};return read;
          }
          if(b?.read.status!=="readable"){
            unavailableReason="second-frame-"+(b?.read.reason||"unavailable");return null;
          }
          // Supplement a conflict with the latest observation, not cached facts
          // or an obligatory agreement with the incomplete first capture.
          read={...b.read,nativeCount:b.nativeCount,
            countConflict:b.nativeCount!==null&&b.nativeCount!==b.read.count,stableReads:reads};
          // No input occurred between these captures. Keep a first-frame
          // identity only when the same slot still ranks that identity first
          // and only its animated score fell below the floor. A moved row,
          // count conflict or positive identity change uses the latest frame.
          const sameRow=reads===2&&a.read.status==="readable"&&a.read.count===read.count&&
            (a.nativeCount===null||a.nativeCount===read.count)&&!read.countConflict&&
            read.slots.every((s,i)=>{
              const old=a.read.slots[i];
              return Math.abs(s.marker.x-old.marker.x)<=2&&Math.abs(s.marker.y-old.marker.y)<=2&&
                !(s.id&&old.id&&s.id!==old.id);
            });
          if(sameRow)read.slots=read.slots.map((s,i)=>{
            const old=a.read.slots[i];
            return !s.id&&old.id&&s.candidate===old.id&&s.rejectionReason==="score-floor"
              ?{...old,marker:s.marker,identityFrame:1}:s;
          });
          return read;
        }catch(e){failure=e;throw e;}
        finally{
          // Keep the original OCR/cancellation error; otherwise report diagnostic failures.
          try{this.trace("folded-hand",{mode,count:read?.count??null,nativeCount:read?.nativeCount??null,
            reason:!read?"unavailable":read.status==="raised"?"raised-fan":read.countConflict?"count-conflict":read.slots.every(s=>s.id)?"full":"partial",
            ...(!read?{unavailableReason}:{}),
            ids:read?.slots.map(s=>s.id)??[],
            reads:read?.stableReads??0,
            rejected:read?.slots.filter(s=>!s.id).map(s=>({index:s.index,candidate:s.candidate??null,
              score:Number.isFinite(s.score)?Number(s.score.toFixed(4)):null,
              gap:Number.isFinite(s.gap)?Number(s.gap.toFixed(4)):null,view:s.view??null,
              reason:s.rejectionReason??null}))??[],
            elapsedMs:Date.now()-started,inputs:0});}catch(e){if(!failure)throw e;}
        }
      }
      async readFoldedHand(expected,evidence,scan){
        // Full synchronization always tries the native artwork bank first.
        // A raised fan is a view state, not evidence that every identity failed.
        if(this.handFanReady||this.handNeedsReset){
          this.requireHandObservation(this.phase(),"before-hand-artwork");
          if(this.handFanReady){
            const count=this.frame(f=>this.nativeHandCountIn(f));
            if(count!==null)evidence={count};
          }
          await this.reset();
        }
        let read=scan.foldedRead || await this.folded("board",scan.settling===true);
        delete scan.foldedRead;
        if(read?.status==="raised"){
          this.requireHandObservation(this.phase(),"raised-hand-before-folded-read");
          if(read.nativeCount!==null)evidence={count:read.nativeCount};
          await this.reset();
          read=await this.folded("board",scan.settling===true);
        }
        const cards=read?.slots.map(s=>s.id?T.observedCard(T.byId[s.id].name,s.index):null);
        if(!read||read.status==="raised"||read.countConflict||(evidence&&evidence.count!==read.count))
          return evidence;
        // Resolve missing count from native evidence without discarding the
        // artwork identities merely because an older count hint disagrees.
        let count=evidence?evidence.count:read.nativeCount;
        // A complete calibrated native row measures count and slots together.
        // Only an actual disagreement requires another measurement; a missing
        // expanded badge alone is not a reason to toggle an already folded fan.
        if(count===null && expected!==null && expected!==read.count){
          count=await this.handCount(expected);
        }
        count??=read.count;
        if(count!==read.count)return {count};
        // Kept opening cards are already observed identities. Before the
        // first action/read, reuse that evidence through the same complete
        // family/count checks; never infer a countdown stage from its price.
        const retained=scan.retainedHand??(this.handScanSerial===0&&!this.currentAction&&read.count===5
          ?this.openingCards:null);
        this.fillHandVariants(cards,read.slots,retained,scan.retainedVariantFamilies,scan.retainedHandOrder);
        scan.cards=cards;
        scan.route=cards.every(Boolean)
          ?this.handFanReady?"folded-identities-native-count":"folded-full"
          :"local-title-fallback";
        scan.titleCandidates=read.slots.map(s=>s.titleCandidates);
        return {count};
      }
      async opening(){
        if(!openingBank||T.openingSetting(this.options.mulligan)==="全部保留")return super.opening();
        const ids=await env.TCGOpeningHand.read(this,openingBank,env,score);
        if(!ids||!ids.some(Boolean))return super.opening();
        this.trace("opening-art",{ids,known:ids.filter(Boolean).length,inputs:0});
        return env.TCGOpeningHand.opening(this,T,env.sleep,ids);
      }
    }
    class Player extends env.TCGPlayer.Player{
      async pick(){
        if(!this.openingFlow.complete&&!this.openingFlow.picked&&this.actions===0){
          const read=await this.host.folded("pick"),slots=read?.count===5?read.slots:[];
          const complete=!read?.countConflict&&slots.length===5&&slots.every(s=>s.id);
          if(complete)this.memory.openingIds=slots.map(s=>s.id);
          this.memory.openingObservation={source:complete?"folded-post-mulligan":"stable-kept-cards",count:read?.count??null,complete};
          this.host.trace("folded-opening",{...this.memory.openingObservation,ids:this.memory.openingIds||[],inputs:0});
        }
        return super.pick();
      }
    }
    return {Host,Player};
  }
  root.TCGHandRecognition={classes,peak,checkedBank};
  if(typeof module!=="undefined"&&module.exports)module.exports=root.TCGHandRecognition;
})(globalThis);

;
// @tcg-entry
(async function () {
  "use strict";
  const options = TCGPlayer.playerOptions(typeof settings === "undefined" ? {} : settings);
  const {Host, Player} = TCGHandRecognition.classes(globalThis, JSON.parse(file.readTextSync("hand-bank.json")), JSON.parse(file.readTextSync("opening-bank.json")));
  return new Player(new Host(options), options).run();
})();

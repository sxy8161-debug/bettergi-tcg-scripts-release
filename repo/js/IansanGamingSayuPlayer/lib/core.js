// Generated from 牌手共享. Edit layered source, not this standalone output.
/* GPL-3.0. Generic accounting adapted from 雷柯刻0.4.6; new team rules.
 * Memory records confirmed own actions, not OCR of invisible statuses.
 * Projected resources/damage are search estimates; never publish them as observations. */
(function (root) {
  "use strict";
  // One synchronous decision, including nested helpers and failed projections.
// No cross-decision cache; exhaustion is not evidence of action illegality.
const projectionBudget = (() => {
  let current = null;
  return {
    run(limit, decide) {
      if (current) return decide();
      current = { used: 0, limit };
      try {
        const result = decide();
        return { ...result, projections: { ...current, exhausted: current.used >= current.limit } };
      } finally { current = null; }
    },
    available() { return !current || current.used < current.limit; },
    take() {
      if (!current) return true; // Standalone rule projection, not a decision.
      if (current.used >= current.limit) return false;
      current.used++; return true;
    },
  };
})();
  // Opening knowledge is required for the deck's route-sensitive first pick.
  function openingSetting(value) {
    if (value && !["全部保留", "优先装备与启动牌"].includes(value)) throw new Error("设置值无效");
    return "优先装备与启动牌";
  }
  const team = [
    {
      name: "伊安珊",
      element: "Electro",
      maxHp: 11,
      maxEnergy: 2,
      weapon: "pole",
      skills: { NA: "负重锥击", E: "电掣雷驰", Q: "力的三原理" },
    },
    {
      name: "嘉明",
      element: "Pyro",
      maxHp: 10,
      maxEnergy: 3,
      weapon: "claymore",
      skills: { NA: "刃爪悬星", E: "瑞兽登高楼", Q: "璨焰金猊舞" },
    },
    {
      name: "早柚",
      element: "Anemo",
      maxHp: 10,
      maxEnergy: 2,
      weapon: "claymore",
      skills: { NA: "忍刀·终末番", E: "呜呼流·风隐急进", Q: "呜呼流·影貉缭乱" },
    },
  ];
  const cards = [
    ["skivingNewAndImproved", "偷懒的新方法", { element: "Anemo", n: 3 }, "talent", 2],
    ["wolf", "狼的末路", { aligned: 3 }, "weapon", 2],
    ["moon", "贯月矢", { aligned: 3 }, "weapon", 2],
    ["gambler", "赌徒的耳环", { aligned: 1 }, "artifact", 2],
    ["gilded", "饰金之梦", { aligned: 3 }, "artifact", 2],
    ["troupe", "黄金剧团的奖赏", {}, "artifact", 2],
    ["heart", "灵光明烁之心", {}, "artifact", 1],
    ["opera", "欧庇克莱歌剧院", { aligned: 1 }, "support", 2],
    ["house", "黄金屋", {}, "support", 2],
    ["draw", "运筹帷幄", { aligned: 1 }, "draw", 2],
    ["lyre", "琴音之诗", {}, "recycle", 2],
    ["boar", "野猪公主", {}, "event", 2],
    ["garden", "旧时庭园", {}, "legend", 1],
    ["revel", "「狂欢节奏」", { any: 2 }, "draw", 2],
    ["shift", "换班时间", {}, "switch", 2],
    ["soup", "奇瑰之汤", { aligned: 1 }, "food", 1],
    ["sing", "纵声欢唱", { any: 3 }, "food", 1],
    // Optional starter-account substitutes, not required by the 30-card deck.
    ["sweet", "甜甜花酿鸡", {}, "food", 0],
    ["hashbrown", "蒙德土豆饼", { aligned: 1 }, "food", 0],
    ["lotus", "莲花酥", { aligned: 1 }, "food", 0],
    ["companion", "最好的伙伴！", { any: 2 }, "dice", 0],
    ["fast", "交给我吧！", {}, "switch", 0],
    ["lost", "本大爷还没有输！", {}, "recovery", 0],
    ["stars", "星天之兆", { any: 2 }, "energy", 0],
    ["tassel", "白缨枪", { aligned: 2 }, "weapon", 0],
    ["greatsword", "铁影阔剑", { aligned: 2 }, "weapon", 0],
  ].map(([id, name, cost, type, copies]) => ({ id, name, cost, type, copies }));
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const soupOptions = {
    "奇瑰之汤·疗愈": "healing",
    "奇瑰之汤·助佑": "discount",
    "奇瑰之汤·激愤": "fury",
    "奇瑰之汤·宁静": "shield",
    "奇瑰之汤·安神": "soothing",
    "奇瑰之汤·鼓舞": "maxhp",
  };
  // Native OCR may mix corner/square quotation marks (e.g. 狂欢节奏】).
  // These are typography, not card/skill identity. Never alter Hanzi or digits.
  const norm = (t) =>
    String(t || "")
      .replace(/[\s:：·!！。，,（）()「」『』【】\[\]“”"‘’']/g, "")
      .replace(/迴/g, "回");
  // User-confirmed native OCR spelling. Match the whole card title only;
  // do not replace Hanzi globally or accept arbitrary shortened names.
  const cardTitleAliases = { 运筹惟: "运筹帷幄" };
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
  const characterAliases={};
  function characterName(text) {
  const title=norm(text),canonical=characterAliases[title]||title;
  return team.findIndex(c=>norm(c.name)===norm(canonical));
}
  const diceOrder = ["Pyro","Hydro","Anemo","Electro","Dendro","Cryo","Geo","Omni"];
  const known = n => Number.isInteger(n) && n >= 0;
  const alive = (c) => !!c && c.dead === false && known(c.hp) && c.hp > 0;
  const total = dice => Object.values(dice || {}).reduce((sum, n) => sum + n, 0);
  const size = cost => (cost.n || 0) + (cost.any || 0) + (cost.aligned || 0);
  function payment(dice, cost, preserve = "Electro") {
    const secondaryPaymentWeights = {}, emptyPaymentWeight = { weight: 0 };
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
  function boardKey(s) {
    return JSON.stringify([s.active,diceOrder.map(e=>s.dice?.[e]||0),s.characters,
      (s.hand||[]).map(h=>h.id),s.enemies,s.quicken||null,s.supportCounts||null,s.eye||null,s.dendroCore||null]);
  }
  function actionKey(action) {
    return action.type + ":" + (action.id || (["skill","probe"].includes(action.type) ? action.who + ":" + action.skill : action.target));
  }
  function freshMemory() {
    return {
      round: 0,
      used: [0, 0, 0],
      food: [false, false, false],
      freeSwitch: false,
      fastSwitch: false,
      fastCharges: 0,
      singCharges: 0,
      weapons: [false, false, false],
      weaponKinds: [null, null, null],
      artifacts: [false, false, false],
      artifactKinds: [null, null, null],
      troupe: [0, 0, 0],
      moonRound: [-1, -1, -1],
      talent: false,
      talentDrawUsed: false,
      gildedDrawUsed: [0,0,0],
      legendUsed: false,
      openingDraws: 0,
      openingRevel: false,
      garden: false,
      lyre: 0,
      boar: 0,
      firstCard: true,
      houses: [],
      operas: [],
      supportSlots: 0,
      defeated: [false, false, false],
      defeatRound: -1,
      lostUsedRound: -1,
      gamblerUsed: [0, 0, 0],
      enemyAliveCount: null,
      enemyLastActive: null,
      lastActive: 0,
      iansanBurst: false,
      kineticEstimate: 0,
      nightsoulEstimate: 0,
      nightsoulPassive: 0,
      switchEstimate: 0,
      passiveHealEvidence: null,
      hpLossEvidence: null,
      manchai: 0,
      gamingReturn: false,
      sayuSummon: 0,
      soupDiscount: [0, 0, 0],
      soupDamage: [0, 0, 0],
      extraMaxHp: [0, 0, 0],
      uncertainActions: [],
      refusedActions: [],
      costEvidence: null,
      probeKeys: [],
      thundergrassSupport: null,
      route: "接力轴",
      openingTarget: null,
      relayTask: null,
    };
  }
  function nextRound(m) {
    // Only the last confirmed active slot is used for our own equipment estimate.
    for (let i = 0; i < 3; i++)
      if (m.artifactKinds[i] === "troupe" && !m.defeated[i] && m.lastActive !== i)
        m.troupe[i] = Math.min(2, m.troupe[i] + 1);
    m.round++;
    m.food = [false, false, false];
    m.soupDiscount = [0, 0, 0];
    m.soupDamage = [0, 0, 0];
    m.garden = false;
    m.lyre = 0;
    m.boar = 0;
    m.firstCard = true;
    m.uncertainActions = [];
    m.refusedActions = [];
    m.costEvidence = null;
    m.probeKeys = [];
    m.talentDrawUsed=false;m.gildedDrawUsed=[0,0,0];
    m.relayTask = null;
    m.nightsoulPassive = 0;
    if (m.sayuSummon > 0) m.sayuSummon--;
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
  function legalState(s) {
    return (
      !!s &&
      s.phase === "board" &&
      s.turn === "user" &&
      Array.isArray(s.characters) &&
      s.characters.length === 3 &&
      known(s.active) &&
      s.active < 3 &&
      alive(s.characters[s.active]) &&
      s.diceKnown === true &&
      s.dice &&
      Object.keys(s.dice).every((e) => diceOrder.includes(e)) &&
      Object.values(s.dice).every(known) &&
      total(s.dice) <= 16 &&
      Array.isArray(s.hand) &&
      s.hand.every(handCardKnown) &&
      s.characters.every(
        (c, i) =>
          c &&
          (c.dead === true ||
            (alive(c) &&
              typeof c.frozen === "boolean" &&
              known(c.energy) &&
              c.energy <= team[i].maxEnergy)),
      )
    );
  }
  function freshActionBoard(s) {
    // Visible checks reject obvious midgame positions, but cannot prove that
    // a zero-cost hidden status was never played. An explicit user declaration
    // is additionally required by main before admitting a board entry.
    return !!s && s.phase === "board" && ["user", "enemy"].includes(s.turn) &&
      legalState({ ...s, turn: "user", hand: [] }) && total(s.dice) === 8 &&
      s.characters.every((c, i) => c.hp === team[i].maxHp && c.energy === 0 && c.dead === false && c.frozen === false);
  }
  function switchCost(m) {
    return { any: m.freeSwitch || m.singCharges > 0 ? 0 : 1 };
  }
  function skillCost(who, skill, m, s = null) {
    const base =
      skill === "NA"
        ? { element: team[who].element, n: 1, any: 2 }
        : { element: team[who].element, n: 3 };
    let reduction = m.soupDiscount[who] || 0;
    if (skill === "E")
      reduction +=
        (m.moonRound[who] === m.round ? 2 : 0) +
        (m.troupe[who] || 0) +
        (who === 1 && m.manchai > 0 ? 1 : 0);
    // Deduct generic portions first. A discount cannot generate dice.
    if (base.any) {
      const n = Math.min(base.any, reduction);
      base.any -= n;
      reduction -= n;
    }
    base.n = Math.max(0, base.n - reduction);
    const e = m.costEvidence;
    if (
      s &&
      e?.source === "native-skill-preview" &&
      e.key === boardKey(s) &&
      e.who === who &&
      e.skill === skill &&
      known(e.n) &&
      e.n <= 3
    ) {
      return skill === "NA"
        ? { element: base.element, n: Math.min(1, e.n), any: Math.max(0, e.n - 1) }
        : { element: base.element, n: e.n };
    }
    return base;
  }
  function skillLegal(s, a, m) {
    const c = s.characters[a.who];
    return (
      s.active === a.who &&
      alive(c) &&
      c.frozen === false &&
      ["NA", "E", "Q"].includes(a.skill) &&
      (a.skill !== "Q" || c.energy >= team[a.who].maxEnergy) &&
      !!payment(s.dice, skillCost(a.who, a.skill, m, s), team[a.who].element)
    );
  }
  function weaponCompatible(id, who) {
    return ["moon", "tassel"].includes(id)
      ? who === 0
      : ["wolf", "greatsword"].includes(id)
        ? [1, 2].includes(who)
        : false;
  }
  function cardCost(id, target, m, s) {
    if (id === "skivingNewAndImproved") return skillCost(2, "E", m, s);
    const c = byId[id],
      base = { ...c.cost };
    let n = size(base),
      reduction = 0;
    // Golden House checks CURRENT cost, not the printed cost. Apply only
    // guaranteed eligibility: pending garden/lyre can make the condition false.
    if (["weapon", "artifact"].includes(c.type)) {
      reduction = (m.garden ? 2 : 0) + (c.type === "artifact" ? m.lyre : 0);
      n = Math.max(0, n - reduction);
      for (const h of m.houses) if (h.left > 0 && h.round !== m.round && n >= 3) n--;
      if (base.aligned !== undefined) base.aligned = n;
    }
    return base;
  }
  function cardLegal(s, a, m) {
    const c = byId[a.id];
    if (!c || s.hand[a.index]?.id !== a.id) return false;
    if (a.target !== null && (!known(a.target) || a.target > 2 || !alive(s.characters[a.target])))
      return false;
    if (c.type === "weapon" && !weaponCompatible(a.id, a.target)) return false;
    if (a.id === "skivingNewAndImproved" && (a.target !== 2 || s.active !== 2 || s.characters[2].frozen))
      return false;
    if (a.id === "lyre" && !m.artifactKinds[a.target]) return false;
    if (
      a.id === "garden" &&
      (m.legendUsed || (!m.weapons.some(Boolean) && !m.artifacts.some(Boolean)))
    )
      return false;
    if (c.type === "support" && m.supportSlots >= 4) return false; // no blind support-overwrite choice
    if (
      c.type === "food" &&
      (a.id === "sing" ? s.characters.some((x, i) => alive(x) && m.food[i] !== false) : m.food[a.target] !== false)
    )
      return false;
    if (a.id === "lost" && (m.defeatRound !== m.round || m.lostUsedRound === m.round)) return false;
    return !!payment(s.dice, cardCost(a.id, a.target, m, s), team[s.active].element);
  }
  function generateDice(dice, element, count) {
    const added = Math.min(count, Math.max(0,16-total(dice)));
    if (added) dice[element] = (dice[element] || 0) + added;
    return added;
  }
  function cardRefund(a, m, before = null) {
    if (a.type !== "card" || !byId[a.id]) return {};
    const c = byId[a.id],
      refund = {};
    if (a.id === "gilded" && team[a.target]) refund[team[a.target].element] = 2;
    if (a.id === "companion") refund.Omni = 2;
    if (a.id === "lost") refund.Omni = 1;
    if (
      ["weapon", "artifact"].includes(c.type) &&
      m.boar > 0 &&
      (c.type === "weapon" ? m.weapons[a.target] : m.artifacts[a.target])
    )
      refund.Omni = (refund.Omni || 0) + 1;
    if (!before) return refund; // Nominal rule query; actual actions supply before.
    const paid = payment(before.dice, cardCost(a.id,a.target,m,before), team[before.active].element);
    if (!paid) return {};
    const realised = {};
    // Insertion order is effect order: Gilded's elemental generation precedes
    // the equipment-replacement support's Omni generation.
    for (const [element,count] of Object.entries(refund)) {
      const n = generateDice(paid.remaining,element,count);
      if (n) realised[element] = n;
    }
    return realised;
  }
  function enemyCount(s) {
    const es=s?.enemies;
    if(!Array.isArray(es) || !es.length || !es.every(e=>e.dead===true || alive(e)))return null;
    return es.filter(alive).length;
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
  function reactionDraws(m,s,who,skill,equippingTalent=false) {
    const target=s.enemies.find(e=>e.active&&alive(e));
    if(target?.auraKnown!==true)return {talent:0,gilded:0,known:false};
    const reaction=elementReaction(skill==="NA"?"Physical":team[who].element,target.aura);
    return {talent:who===2&&reaction.name==="swirl"&&(m.talent||equippingTalent)&&m.talentDrawUsed===false?2:0,
      gilded:reaction.name&&m.artifactKinds[who]==="gilded"&&known(m.gildedDrawUsed[who])&&m.gildedDrawUsed[who]<2?1:0,
      known:true};
  }
  const gamblerRemaining = (m, who) => Math.max(0, 3 - (m.gamblerUsed[who] || 0));
  const effectiveMaxHp = (m, who) => team[who].maxHp + (m.extraMaxHp[who] || 0);
  function noteBoard(m, s, damageOwner = m.enemyLastActive) {
    if (!Array.isArray(s?.characters)) return;
    s.characters.forEach((c, i) => {
      if (c.dead === true && !m.defeated[i]) {
        m.defeated[i] = true;
        m.defeatRound = m.round;
        m.boar = Math.max(0, m.boar - (m.weapons[i] ? 1 : 0) - (m.artifacts[i] ? 1 : 0));
        m.weaponKinds[i] = null;
        m.weapons[i] = false;
        m.artifactKinds[i] = null;
        m.artifacts[i] = false;
        m.troupe[i] = 0;
        if (i === 0) m.nightsoulEstimate = 0;
        if (i === 1) m.gamingReturn = false;
      }
    });
    const n = enemyCount(s),
      owner = damageOwner;
    if (n !== null) {
      const lost = m.enemyAliveCount === null ? 0 : Math.max(0, m.enemyAliveCount - n);
      if (lost && m.artifactKinds[owner] === "gambler")
        m.gamblerUsed[owner] = Math.min(3, m.gamblerUsed[owner] + lost);
      m.enemyAliveCount = n;
    }
    if (known(s.active)) {
      m.lastActive = s.active;
      m.enemyLastActive = s.active;
    }
  }
  function passiveHealingEstimate(s, m, a) {
    // Pinned 7590c11 Iansan listens to samePlayer for preparing/switches.
    // Hidden night, usage and switch parity are not native observations. Even
    // a compatible HP gain is not proof that the passive caused that gain.
    const trigger =
      a?.type === "switch" ||
      (a?.type === "skill" && a.who === 2 && a.skill === "E") ||
      (a?.type === "card" && a.id === "skivingNewAndImproved");
    const none = { amount: 0, target: null, confidence: 0 };
    if (
      !trigger ||
      !alive(s?.characters?.[0]) ||
      m.nightsoulEstimate !== 2 ||
      m.nightsoulPassive >= 3
    )
      return none;
    const injured = s.characters
      .map((c, i) => ({ c, i, missing: effectiveMaxHp(m, i) - c.hp }))
      .filter((x) => alive(x.c) && x.missing > 0)
      .sort((a, b) => b.missing - a.missing)[0];
    if (!injured) return none;
    const status = m.passiveHealEvidence?.status;
    return {
      amount: 1,
      target: injured.i,
      confidence:
        status === "not-observed" || status === "uncertain"
          ? 0
          : status === "compatible"
            ? 0.25
            : 0.15,
    };
  }
  function confirmPassiveHealing(m, a, b, after) {
    const potential = passiveHealingEstimate(b, m, a),
      i = potential.target;
    if (
      !potential.amount ||
      !Array.isArray(after?.characters) ||
      after.characters.length !== 3 ||
      !after.characters.every(
        (c, j) => c.dead === true || (alive(c) && c.hp <= effectiveMaxHp(m, j)),
      )
    )
      return;
    const observedDelta = after.characters[i].hp - b.characters[i].hp;
    m.passiveHealEvidence = {
      status: observedDelta === 1 ? "compatible" : "not-observed",
      target: i,
      expectedUpperBound: 1,
      observedDelta,
      round: m.round,
      action: actionKey(a),
    };
  }
  function commit(m, a, b, after, options = {}) {
    // Search projections must never validate their own hidden-state estimates.
    if (!options.projected) {
      confirmPassiveHealing(m, a, b, after);
      // Measured net loss, not an attributed enemy skill or predicted damage.
      // Search projections must never manufacture this observation.
      const readable = (board) => board?.characters?.length === 3 &&
        board.characters.every((c, i) => c.dead === true ||
          (alive(c) && c.hp <= effectiveMaxHp(m, i)));
      if (readable(b) && readable(after)) {
        const loss = Math.max(0, ...b.characters.map((c, i) => {
          const later = after.characters[i];
          return alive(c) && (alive(later) || later.dead === true)
            ? c.hp - (later.dead === true ? 0 : later.hp) : 0;
        }));
        if (loss > 0)
          m.hpLossEvidence = {
            loss: Math.max(loss, m.hpLossEvidence?.round === m.round ? m.hpLossEvidence.loss : 0),
            round: m.round,
          };
      }
    }
    // A card ID alone never authorizes its effect: tuning the talent is NOT
    // playing it and must not advance Sayu's skill/passive/buff accounting.
    const target = a.target,
      who = a.type === "skill" ? a.who : a.type === "card" && a.id === "skivingNewAndImproved" ? 2 : null;
    const damageOwner=who!==null?who:a.type==="switch"&&target===1&&m.gamingReturn?1:null;
    if(damageOwner!==null){
      const draws=reactionDraws(m,b,damageOwner,a.skill||"P",a.id==="skivingNewAndImproved");
      if(draws.talent)m.talentDrawUsed=true;
      if(draws.gilded)m.gildedDrawUsed[damageOwner]++;
      if(!draws.known){
        if(damageOwner===2&&m.talent)m.talentDrawUsed=null;
        if(m.artifactKinds[damageOwner]==="gilded")m.gildedDrawUsed[damageOwner]=null;
      }
    }
    if (!options.projected && typeof root.TCG.advanceBattleTask === "function")
      root.TCG.advanceBattleTask(m, a, b, after);
    function passiveEstimate() {
      if (m.nightsoulEstimate > 0 && m.nightsoulPassive < 3) {
        m.nightsoulPassive++;
        m.nightsoulEstimate = Math.min(2, m.nightsoulEstimate + 1);
      }
    }
    function hitEstimate() {
      if (m.kineticEstimate > 0) {
        if (m.nightsoulEstimate > 0) m.nightsoulEstimate--;
        else m.kineticEstimate--;
      }
    }
    function switchedEstimate() {
      if (m.nightsoulEstimate > 0) {
        m.switchEstimate++;
        if (m.switchEstimate % 2 === 0) passiveEstimate();
      }
    }
    if (a.type === "switch") {
      m.freeSwitch = false;
      if (m.singCharges > 0) m.singCharges--;
      if (m.fastCharges > 0) m.fastCharges--;
      m.fastSwitch = m.fastCharges > 0;
      switchedEstimate();
      if (target === 1 && m.gamingReturn) {
        hitEstimate();
        m.soupDamage[1] = Math.max(0, m.soupDamage[1] - 1);
        m.gamingReturn = false;
      }
    }
    if (who !== null) {
      const skill = a.id === "skivingNewAndImproved" ? "E" : a.skill;
      // Only the reduction still payable after other known discounts is spent.
      // These counters remain estimates; native payment is independently read.
      const other =
        (m.moonRound[who] === m.round ? 2 : 0) +
        (who === 1 && m.manchai > 0 ? 1 : 0) +
        (m.soupDiscount[who] || 0);
      const troupeSpent = skill === "E" ? Math.min(m.troupe[who] || 0, Math.max(0, 3 - other)) : 0;
      m.used[who]++;
      m.soupDiscount[who] = 0;
      if (who === 2 && skill === "E") passiveEstimate();
      hitEstimate();
      if (who === 2 && skill === "E") hitEstimate();
      if (m.soupDamage[who] > 0)
        m.soupDamage[who] = Math.max(0, m.soupDamage[who] - (who === 2 && skill === "E" ? 2 : 1));
      if (skill === "E") {
        m.moonRound[who] = -1;
        m.troupe[who] = Math.max(0, m.troupe[who] - troupeSpent);
        if (who === 0) {
          m.fastCharges++;
          m.fastSwitch = true;
          m.nightsoulEstimate = Math.min(2, m.nightsoulEstimate + 1);
        }
        if (who === 1) {
          m.gamingReturn = true;
          switchedEstimate();
          if (m.manchai > 0 && b.characters[1].hp < 5) m.manchai--;
        }
      }
      if (skill === "Q") {
        if (who === 0) {
          m.iansanBurst = true;
          m.kineticEstimate = 2;
          m.nightsoulEstimate = Math.min(2, m.nightsoulEstimate + 1);
        }
        if (who === 1) m.manchai = 2;
        if (who === 2) m.sayuSummon = 2;
      }
    }
    if (a.type === "card") {
      const c = byId[a.id],
        cost = cardCost(a.id, target, m, b),
        first = m.firstCard;
      m.firstCard = false;
      if (m.round === 1 && m.used.every((n) => n === 0) && ["sing", "draw", "revel"].includes(a.id))
        m.openingDraws = (m.openingDraws || 0) + 1;
      if (m.round === 1 && m.used.every((n) => n === 0) && a.id === "revel") m.openingRevel = true;
      if (c.type === "weapon" || c.type === "artifact") {
        if (m.boar > 0 && (c.type === "weapon" ? m.weapons[target] : m.artifacts[target])) m.boar--;
        let n = Math.max(
          0,
          size(c.cost) - (m.garden ? 2 : 0) - (c.type === "artifact" ? m.lyre : 0),
        );
        for (const h of m.houses)
          if (h.left > 0 && h.round !== m.round && n >= 3) {
            h.left--;
            h.round = m.round;
            n--;
          }
        m.garden = false;
        if (c.type === "artifact") m.lyre = 0;
        if (c.type === "weapon") {
          m.weaponKinds[target] = a.id;
          m.weapons[target] = true;
          if (a.id === "moon") m.moonRound[target] = m.round;
        } else {
          m.artifactKinds[target] = a.id;
          m.artifacts[target] = true;
          m.troupe[target] = 0;
          // A new equipment instance receives its own usage pool.
          if (a.id === "gambler") m.gamblerUsed[target] = 0;
          m.gildedDrawUsed[target]=0;
        }
      }
      if (a.id === "skivingNewAndImproved") m.talent = true;
      if (a.id === "house") {
        m.houses.push({ left: 2, round: -1 });
        m.supportSlots++;
      }
      if (a.id === "opera") {
        m.operas.push({ left: 3, round: -1 });
        m.supportSlots++;
      }
      if (a.id === "garden") {
        m.legendUsed = true;
        m.garden = true;
      }
      if (a.id === "lyre") {
        m.artifacts[target] = false;
        m.artifactKinds[target] = null;
        m.troupe[target] = 0;
        m.lyre = first ? 2 : 1;
      }
      if (a.id === "boar") m.boar = 2;
      if (a.id === "shift") m.freeSwitch = true;
      if (a.id === "fast") {
        m.fastCharges++;
        m.fastSwitch = true;
      }
      if (c.type === "food") {
        if (a.id === "sing") {
          m.food = safeFood(b);
          m.singCharges = 2;
        } else m.food[target] = true;
      }
      if (a.id === "lost") m.lostUsedRound = m.round;
      // Native selected soup effect is carried by the adapter, not random prediction.
      if (a.id === "soup" && soupReceiptValid(a, b, after)) {
        if (after.soupReceipt.effect === "discount") m.soupDiscount[target] = 2;
        if (after.soupReceipt.effect === "fury") m.soupDamage[target] = 2;
        if (after.soupReceipt.effect === "maxhp") m.extraMaxHp[target]++;
      }
      void cost;
    }
    // Automatic combat can add draws, dice or switch again. Trust the reread.
    if (after?.characters) {
      if (who === 1 && a.skill === "E" && after.active === 1) m.gamingReturn = false;
      noteBoard(m, after, damageOwner ?? m.enemyLastActive);
    }
    m.costEvidence = null;
  }
  const safeFood = (b) => b.characters.map((c) => alive(c));
  function deferUncertain(m, a, before) {
    blockAction(m,a,before,true);
    if (a.type === "card") m.firstCard = null;
    if (a.type === "card" && a.id === "garden") m.legendUsed = true;
    if (a.type === "card" && byId[a.id]?.type === "food") {
      if (a.id === "sing") m.food = [null, null, null];
      else m.food[a.target] = null;
    }
    // Invalidate only effects this action can consume or establish. Null is
    // unknown, not an observed absence; fee readers use the undiscounted upper
    // bound unless a matching native fee quote is available.
    m.costEvidence = null;
    const who = a.type === "skill" ? a.who : a.type === "card" && a.id === "skivingNewAndImproved" ? 2 : null;
    if (a.type === "switch" || who !== null) {
      m.passiveHealEvidence = { status: "uncertain" };
      if(m.kineticEstimate>0)m.kineticEstimate = null;
      if(m.nightsoulEstimate>0)m.nightsoulEstimate = null;
    }
    if (a.type === "switch") {
      if(m.freeSwitch)m.freeSwitch = null;
      if(m.singCharges>0)m.singCharges = null;
      if(m.fastCharges>0){m.fastCharges = null;m.fastSwitch = null;}
      if (a.target === 1 && m.gamingReturn) { m.gamingReturn = null; m.soupDamage[1] = null; }
    }
    if (who !== null) {
      if(m.soupDiscount[who]>0)m.soupDiscount[who] = null;
      if(m.soupDamage[who]>0)m.soupDamage[who] = null;
      if (a.skill === "E" || a.id === "skivingNewAndImproved") {
        if(m.moonRound[who]===m.round)m.moonRound[who] = null;
        if(m.troupe[who]>0)m.troupe[who] = null;
        if (who === 0) { m.fastCharges = null; m.fastSwitch = null; m.nightsoulEstimate=null; }
        if (who === 1) { m.gamingReturn = null; if(m.manchai>0)m.manchai = null; }
      }
      if (a.skill === "Q") {
        if (who === 0) {m.iansanBurst = null;m.kineticEstimate=null;m.nightsoulEstimate=null;}
        if (who === 1) m.manchai = null;
        if (who === 2) m.sayuSummon = null;
      }
    }
    if (a.type === "card" && ["weapon", "artifact", "recycle"].includes(byId[a.id]?.type)) {
      const type = byId[a.id].type;
      if(type!=="recycle"){
        let fee=Math.max(0,size(byId[a.id].cost)-(m.garden?2:0)-(type==="artifact"?(m.lyre||0):0));
        for(const h of m.houses)if(h.left>0&&h.round!==m.round&&fee>=3){h.left=null;fee--;}
        if(m.garden)m.garden = null;
        if(m.boar>0&&(type==="weapon"?m.weapons[a.target]:m.artifacts[a.target]))m.boar = null;
      }
      if (type === "weapon") { m.weaponKinds[a.target] = null; m.weapons[a.target] = null; m.moonRound[a.target] = null; }
      else { m.artifactKinds[a.target] = null; m.artifacts[a.target] = null; m.troupe[a.target] = null;
        if(type==="recycle"||m.lyre>0)m.lyre = null; }
    }
    if (a.type === "card" && a.id === "garden") m.garden = null;
    if (a.type === "card" && a.id === "shift") m.freeSwitch = null;
    if (a.type === "card" && a.id === "fast") { m.fastSwitch = null; m.fastCharges = null; }
    if (a.type === "card" && a.id === "sing") m.singCharges = null;
    if (a.type === "card" && a.id === "boar") m.boar = null;
    if (a.type === "card" && a.id === "skivingNewAndImproved") m.talent = null;
  }
  function rejectAction(m, a, before) {
    // A positive rejection consumes no effect. Invalidate the transient fee
    // quote, not unrelated buffs already established by confirmed actions.
    blockAction(m,a,before);
    // A proven failed tune did not play a card, spend dice or consume any
    // confirmed buffs. Block only the owned instance/target/conditions.
    if (a.type === "tune") return;
    m.costEvidence = null;
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
  function handPlan(a, b) {
    const h = indexedHand(b.hand);
    if (["switch", "skill", "probe"].includes(a.type)) return { mode: "unchanged", hand: h };
    if (a.type === "card" && ["draw", "revel", "sing", "lyre", "skivingNewAndImproved"].includes(a.id))
      return { mode: "full", expectedCount: null };
    if (a.type === "card" || a.type === "tune") {
      if (h[a.index]?.id !== a.id) throw new Error("手牌增量计划的目标索引/身份不一致");
      return { mode: "remove", hand: indexedHand(h.filter((_, i) => i !== a.index)) };
    }
    return { mode: "full", expectedCount: null };
  }
  function soupReceiptValid(a,b,c) {
    const r=c?.soupReceipt;
    return a.type === "card" && a.id === "soup" && r?.exited === true &&
      r.origin === actionKey(a)+"/"+boardKey(b) && r.target === a.target &&
      Object.values(soupOptions).includes(r.effect);
  }
  function confirmationReady(a,b,c) {
    return a.type !== "card" || a.id !== "soup" || soupReceiptValid(a,b,c);
  }
  function verify(a, b, after, transition = false) {
    if (!a || !b || !after) return false;
    if (after.result) return true;
    if (a.type === "end")
      return after.turn === "enemy" || ["roll", "settlement"].includes(after.phase);
    if (a.type === "switch")
      return (
        (after.active === a.target && after.active !== b.active) ||
        (a.target === 1 && transition && after.characters?.[1]?.energy !== b.characters[1].energy)
      );
    if (a.type === "skill")
      return (
        transition ||
        after.turn === "enemy" ||
        (!!after.dice &&
          Array.isArray(after.characters) &&
          (total(after.dice) < total(b.dice) ||
            (known(after.characters?.[a.who]?.energy) &&
              after.characters[a.who].energy !== b.characters[a.who].energy) ||
            (enemyCount(after) !== null &&
              enemyCount(b) !== null &&
              JSON.stringify(after.enemies.map((e) => e.hp)) !==
                JSON.stringify(b.enemies.map((e) => e.hp))) ||
            (a.who === 1 && a.skill === "E" && known(after.active) && after.active !== b.active)))
      );
    if (a.type === "tune")
      return (
        after.turn === "user" &&
        removedOne(b.hand, after.hand, a.id) &&
        total(b.dice) === total(after.dice) &&
        (after.dice[a.element] || 0) === (b.dice[a.element] || 0) + 1
      );
    if (a.type !== "card" || !byId[a.id] || !after.hand) return false;
    if (!confirmationReady(a, b, after)) return false;
    const consumed = (bag(b.hand)[a.id] || 0) > (bag(after.hand)[a.id] || 0);
    if (["draw", "revel", "sing"].includes(a.id))
      return cardCountDecreased(b.hand, after.hand, a.id);
    if (a.id === "lyre") return consumed && after.hand.length === b.hand.length;
    if (a.id === "skivingNewAndImproved")
      return (
        consumed &&
        (transition ||
          total(after.dice) < total(b.dice) ||
          JSON.stringify(after.enemies) !== JSON.stringify(b.enemies))
      );
    return removedOne(b.hand, after.hand, a.id);
  }
  const verifyResynchronized = (a, b, c, t) => legalState(c) && verify(a, b, c, t);
  function removalEffect(a, b, c) {
    if (!b.hand?.length || c.turn !== "user") return false;
    if (a.type === "tune")
      return (
        total(c.dice) === total(b.dice) && (c.dice[a.element] || 0) === (b.dice[a.element] || 0) + 1
      );
    if (a.id === "sweet" || a.id === "hashbrown")
      return c.characters?.[a.target]?.hp > b.characters[a.target].hp;
    // Native artwork count proves a new support even if its die expense is
    // refunded in the same resolution. Never infer this from intended input.
    if (a.type === "card" && a.id === "opera") {
      const x = b.supportCounts?.opera,
        y = c.supportCounts?.opera;
      return Number.isInteger(x) && x >= 0 && x < 4 && Number.isInteger(y) && y === x + 1;
    }
    return false;
  }
  function refundedCardEffect(a, b, c, m) {
    // A changed native resource vector can prove a refunded card even when
    // the total is unchanged or increases. An identical vector proves nothing.
    if (
      a.type !== "card" || handPlan(a, b).mode !== "remove" ||
      c.phase !== "board" || c.turn !== "user" || c.active !== b.active ||
      JSON.stringify(c.characters) !== JSON.stringify(b.characters) ||
      JSON.stringify(c.enemies) !== JSON.stringify(b.enemies)
    ) return false;
    const refund = cardRefund(a, m, b),
      cost = cardCost(a.id, a.target, m, b);
    if (!total(refund) || diceOrder.every((e) => (b.dice[e] || 0) === (c.dice[e] || 0)))
      return false;
    const spent = {};
    for (const e of diceOrder) {
      const n = (b.dice[e] || 0) + (refund[e] || 0) - (c.dice[e] || 0);
      if (!known(n) || n > (b.dice[e] || 0)) return false;
      spent[e] = n;
    }
    return total(spent) === size(cost) && !!payment(spent, cost);
  }
  function emptyHandEffect(a, b, c, t) {
    if (b.hand.length !== 1 || c.turn !== "user") return false;
    if (!confirmationReady(a,b,c)) return false;
    // Positive native empty-fan evidence is scoped to this exact single-card
    // input, not zero guessed from an OCR failure or unchanged net expense.
    const proof = c.handEvidence;
    if (
      c.phase === "board" &&
      (!Array.isArray(c.hand) || c.hand.length === 0) &&
      proof?.kind === "native-empty-fan" &&
      proof.stableReads >= 2 &&
      proof.inputSent === true &&
      proof.sourceCount === 1 &&
      proof.id === a.id &&
      proof.index === a.index &&
      proof.target === (a.target ?? null) &&
      proof.beforeKey === boardKey(b) &&
      b.hand[a.index]?.id === a.id &&
      ["card", "tune"].includes(a.type) &&
      handPlan(a, b).mode === "remove"
    )
      return true;
    if (removalEffect(a, b, c)) return true;
    if (a.type !== "card" || ["draw", "revel", "lyre", "sing", "skivingNewAndImproved"].includes(a.id))
      return false;
    // A visible expense or soup selection can prove zero; a zero-cost status cannot.
    return total(c.dice) < total(b.dice) || (a.id === "soup" && soupReceiptValid(a,b,c));
  }
  function openingContext(context = {}) {
    const observed = enemyCount({ enemies: context?.enemies }),
      declared = context?.enemyCount;
    const n =
      observed !== null && observed > 0
        ? observed
        : known(declared) && declared > 0 && declared <= 6
          ? declared
          : null;
    const source =
      observed !== null && observed > 0 ? "observed" : n !== null ? "declared" : "unknown";
    const routes = ["伊嘉轴", "伊早轴", "狼末轴", "欢唱轴", "接力轴"];
    return {
      enemyCount: n,
      source,
      route:
        n !== null && n <= 2 ? "伊嘉轴" : routes.includes(context?.route) ? context.route : null,
    };
  }
  function keepOpening(id, hand = [], index = null, context = {}) {
    const ids = hand.map((h) => h.id);
    if (
      index !== null &&
      (byId[id]?.type === "weapon" ||
        ["skivingNewAndImproved", "troupe", "heart", "opera", "garden", "sing", "revel"].includes(id)) &&
      Math.min(...hand.filter((h) => h.id === id).map((h) => h.index)) !== index
    )
      return false;
    const n = openingContext(context).enemyCount;
    if (id === "skivingNewAndImproved" && n !== null && n <= 2) return false;
    if (["wolf", "moon", "skivingNewAndImproved", "troupe", "heart", "garden", "draw", "opera"].includes(id))
      return true;
    if (id === "house") return ids.some((x) => ["wolf", "moon", "gilded"].includes(x));
    if (id === "lyre") return ids.some((x) => ["troupe", "gilded"].includes(x));
    if (id === "sing" || id === "revel") return true;
    if (["gambler", "gilded"].includes(id)) return ids.includes("revel");
    return false;
  }
  function openingPlan(hand, original, context = {}) {
    if (
      !Array.isArray(hand) ||
      hand.length !== 5 ||
      !hand.every(handCardKnown) ||
      !hand.every((h, i) => h.index === i) ||
      !Array.isArray(original) ||
      original.length !== 5 ||
      !original.every((x) => typeof x === "boolean")
    )
      throw new Error("初始五张手牌或置换索引不完整");
    const replace = hand.map((h) =>
        h.supported ? !keepOpening(h.id, hand, h.index, context) : original[h.index],
      ),
      duplicateWeapons = hand
        .filter(
          (h) => byId[h.id]?.type === "weapon" && hand.find((x) => x.id === h.id).index !== h.index,
        )
        .map((h) => h.index);
    // Independent final-plan invariant, not a title-only duplicate check.
    if (duplicateWeapons.some((i) => !replace[i])) throw new Error("起手方案仍保留重复武器");
    return { replace, keep: hand.filter((h) => !replace[h.index]), duplicateWeapons };
  }
  function rerollPlan(items, m, context = m.openingContext || {}) {
    const opening = openingContext(context),
      planningRoute =
        opening.enemyCount !== null
          ? opening.enemyCount <= 2
            ? "伊嘉轴"
            : "接力轴"
          : opening.route || m.route;
    const living = [0, 1, 2].filter((i) => !m.defeated[i]);
    const firstTarget = living.includes(m.openingTarget) ? m.openingTarget : 0;
    const primary =
      m.round === 0
        ? team[firstTarget].element
        : team[living.includes(m.lastActive) ? m.lastActive : living[0] || 0].element;
    const secondary =
      m.round === 0 && firstTarget === 2
        ? null
        : primary === "Electro"
          ? planningRoute === "伊嘉轴" && living.includes(1)
            ? "Pyro"
            : living.includes(2)
              ? "Anemo"
              : living.includes(1)
                ? "Pyro"
                : null
          : living.includes(0) && !m.iansanBurst
            ? "Electro"
            : null;
    const primaryLimit =
      m.round === 0 && firstTarget === 0 && !(m.openingIds || []).includes("moon") ? 3 : 8;
    const indices = items.map((d, i) => (d.element === "Omni" ? i : -1)).filter((i) => i >= 0);
    indices.push(
      ...items
        .map((d, i) => (d.element === primary ? i : -1))
        .filter((i) => i >= 0)
        .slice(0, primaryLimit),
    );
    if (secondary)
      indices.push(
        ...items
          .map((d, i) => (d.element === secondary ? i : -1))
          .filter((i) => i >= 0)
          .slice(0, 3),
      );
    return {
      primary,
      secondary,
      elements: [primary, secondary, "Omni"].filter(Boolean),
      indices: indices.sort((a, b) => a - b),
    };
  }
  function rerollCounter(text) {
    const t=norm(text),values=[];
    for(const match of t.matchAll(/(?:还可重投([12])轮|(?:可重投次数|剩余重投次数|剩余次数)([12]))/g))
      values.push(Number(match[1]||match[2]));
    return values.length===1?values[0]:null;
  }
  root.TCG = {
    projectionBudget,
    team,
    cards,
    byId,
    soupOptions,
    norm,
    identify,
    observedCard,
    handCardKnown,
    indexedHand,
    reconcileHand,
    actionRefused,
    blockAction,
    refusalCost: (s,m,a) => a.type === "card" ? cardCost(a.id,a.target,m,s) :
      a.type === "skill" ? skillCost(a.who,a.skill,m,s) : a.type === "switch" ? switchCost(m) : {},
    characterName,
    diceOrder,
    openingSetting, known,
    alive,
    total,
    size,
    payment,
    boardKey,
    actionKey,
    freshMemory,
    nextRound,
    OpeningFlow,
    legalState,
    freshActionBoard,
    skillCost,
    skillLegal,
    switchCost,
    cardCost,
    cardLegal,
    cardRefund,
    generateDice,
    soupReceiptValid,
    confirmationReady,
    weaponCompatible,
    enemyCount,
    elementReaction,
    damageAgainst,
    reactionDraws,
    gamblerRemaining,
    effectiveMaxHp,
    noteBoard,
    commit,
    passiveHealingEstimate,
    deferUncertain,
    rejectAction,
    handPlan,
    verify,
    verifyResynchronized,
    removalEffect,
    refundedCardEffect,
    emptyHandEffect,
    openingContext,
    keepOpening,
    openingPlan,
    rerollPlan,
    rerollCounter,
  };
})(globalThis);

globalThis.TCG.version = "1.3.5";
globalThis.TCG.sharedVersion = "1.5.4";
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

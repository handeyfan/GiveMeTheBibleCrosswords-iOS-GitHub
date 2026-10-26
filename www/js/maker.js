/* Puzzle maker: turns a theme into a finished crossword using CWEngine. Shared by build tools and the app. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.CWMaker = factory(root.CWEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  // Parse curated lines "ANSWER|clue|Book c:v[-v2]" once per Bible.
  function prepareCurated(bible, lines) {
    const out = [];
    lines.forEach((line) => {
      const p = line.split('|'); if (p.length < 3) return;
      const ref = bible.parseRef(p[2]); if (!ref) return;
      const na = E.normAnswer(p[0]);
      const ids = [];
      for (let v = ref.v; v <= ref.v2; v++) ids.push(bible.id(ref.b, ref.c, v));
      out.push({ ans: na.ans, en: na.en, phrase: p[0].toLowerCase(), clue: p[1], ref: ref, ids: ids, key: 'C:' + na.ans + ':' + p[1] });
    });
    return out;
  }

  function resolveScope(bible, theme) {
    if (theme._pool) return theme._pool;
    let pool;
    if (theme.ids) pool = theme.ids.slice().sort((a, b) => a - b);
    else if (theme.scope) {
      const sc = theme.scope.map((s) => [bible.lookup[s[0].toLowerCase()], s[1], s[2]]);
      sc.forEach((s, i) => { if (s[0] === undefined) throw new Error('bad scope book ' + theme.scope[i][0]); });
      pool = E.versePoolFromScope(bible, sc);
      if (theme.kw) { // narrow by keywords inside the scope
        const kwPool = new Set(E.versePoolFromKeywords(bible, theme.kw));
        pool = pool.filter((id) => kwPool.has(id));
      }
    } else if (theme.kw || theme.list) pool = E.versePoolFromKeywords(bible, theme.kw || theme.list);
    else { pool = []; for (let i = 0; i < bible.N; i++) pool.push(i); }
    Object.defineProperty(theme, '_pool', { value: pool, enumerable: false, writable: true });
    return pool;
  }

  /* opts: {seed, minA, minD, maxW, maxH, usedClues:Set, usedCurated:Set, curatedShare} */
  function makePuzzle(bible, curated, theme, opts) {
    const rng = E.RNG(opts.seed >>> 0);
    const usedClues = opts.usedClues || new Set();
    const usedCur = opts.usedCurated || new Set();
    const pool = resolveScope(bible, theme);
    const poolSet = new Set(pool);
    const ix = bible.index();
    const cands = [];
    const seenAns = new Set();

    // Curated entries eligible for this theme
    const listSet = theme.list ? new Set(theme.list.map((w) => w.toUpperCase().replace(/\s+/g, ''))) : null;
    const curShare = opts.curatedShare == null ? 1 : opts.curatedShare;
    const curList = [];
    curated.forEach((c) => {
      if (usedCur.has(c.key)) return;
      if (c.ans.length > opts.maxW) return;
      let ok = theme.whole || c.ids.some((id) => poolSet.has(id));
      if (!ok && listSet && listSet.has(c.ans)) ok = true;
      if (ok) curList.push(c);
    });
    E.shuffle(curList, rng);
    const curMax = Math.round((opts.minA + opts.minD) * 0.45 * curShare);
    curList.slice(0, curMax).forEach((c) => {
      if (seenAns.has(c.ans)) return; seenAns.add(c.ans);
      cands.push({ ans: c.ans, en: c.en, pri: 3.2 + rng(), alts: [{ clue: c.clue, ref: c.ref, key: c.key, ids: c.ids, cur: true }] });
    });

    // Verse-based candidates
    let words;
    if (theme.list) {
      const listWords = theme.list.map((w) => ({ w: w.toLowerCase(), score: 1 + rng(), list: true }))
        .filter((x) => /^[a-z]+$/.test(x.w) && ix.post.has(x.w));
      const lw = new Set(listWords.map((x) => x.w));
      // supporting words drawn from verses that mention the topic
      const extra = E.scoreWords(bible, pool, {}).filter((x) => !lw.has(x.w)).slice(0, 500);
      words = listWords.concat(extra);
    } else {
      words = E.scoreWords(bible, pool, { exclude: theme.exclude ? new Set(theme.exclude) : null }).slice(0, 900);
    }
    const top = words.length ? words[0].score : 1;
    let listLen = 0; while (listLen < words.length && words[listLen].list) listLen++;
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi].w; const A = w.toUpperCase();
      if (A.length < 3 || A.length > Math.min(15, opts.maxW) || seenAns.has(A)) continue;
      let ids = ix.post.get(w) || [];
      let inPool = ids.filter((id) => poolSet.has(id));
      if (!inPool.length && words[wi].list) inPool = ids; // list words may reach the whole Bible
      if (!inPool.length) continue;
      const order = E.shuffle(inPool.slice(), rng);
      const alts = [];
      for (let k = 0; k < order.length && alts.length < 4 && k < 40; k++) {
        const id = order[k];
        const clue = E.makeFillClue(bible.text[id], w);
        if (!clue) continue;
        const key = 'V:' + A + ':' + id;
        if (usedClues.has(key) || usedClues.has('T:' + clue)) continue;
        alts.push({ clue: clue, ref: bible.refOf(id), key: key, ids: [id] });
      }
      if (!alts.length) continue;
      seenAns.add(A);
      const pri = words[wi].list ? 2.4 + rng() : theme.list ? 0.6 * (words[wi].score / (words[listLen] ? words[listLen].score : 1)) + rng() * 0.5 : 2 * (words[wi].score / top) + rng() * 0.8;
      cands.push({ ans: A, en: String(A.length), pri: pri, alts: alts });
    }
    // Sort by priority with a little shuffle
    cands.sort((a, b) => (b.pri - a.pri));

    const usedVerse = new Set(); const usedText = new Set();
    // Optional give-away protection (used for small verse sets where verses are reused):
    // a clue may not contain another placed answer, and a new answer may not appear in a placed clue.
    const placedAns = new Set(); const placedClues = [];
    const hasWord = (text, ans) => new RegExp('(^|[^A-Za-z])' + ans + '(?![A-Za-z])', 'i').test(text);
    const altOK = (a) => !usedText.has(a.clue) && (!opts.noGiveaway || !Array.from(placedAns).some((x) => hasWord(a.clue, x)));
    function onPlace(cand) {
      let pick = cand.alts.find((a) => altOK(a) && !a.ids.some((id) => usedVerse.has(id))) ||
        cand.alts.find((a) => altOK(a)) || cand.alts.find((a) => !usedText.has(a.clue)) || cand.alts[0];
      if (usedText.has(pick.clue)) throw new Error('duplicate clue text');
      cand.pick = pick; pick.ids.forEach((id) => usedVerse.add(id)); usedText.add(pick.clue);
      placedAns.add(cand.ans); placedClues.push(pick.clue);
    }

    let best = null;
    for (let attempt = 0; attempt < (opts.attempts || 6); attempt++) {
      const arng = E.RNG((opts.seed + attempt * 7919) >>> 0);
      usedVerse.clear(); usedText.clear(); placedAns.clear(); placedClues.length = 0;
      const list = cands.map((c) => Object.assign({}, c, { pri: c.pri + arng() * 0.9 }));
      list.sort((a, b) => b.pri - a.pri);
      const g = E.buildGrid(list, {
        rng: arng, minA: opts.minA, minD: opts.minD, maxW: opts.maxW + (attempt > 2 ? 2 : 0), maxH: opts.maxH + (attempt > 2 ? 2 : 0),
        target: opts.minA + opts.minD + (opts.extra == null ? 6 : opts.extra), sample: opts.sample || 70, onPlace: onPlace,
        canPlace: (cand) => cand.alts.some(altOK) && (!opts.noGiveaway || !placedClues.some((t) => hasWord(t, cand.ans))),
        crossW: opts.crossW, crossSq: opts.crossSq, maxWords: opts.maxWords ? opts.maxWords : undefined
      });
      // ensure first word has a pick
      g.words.forEach((w) => { if (!w.meta.pick) onPlace(w.meta); });
      const fin = E.finalize(g);
      if (!fin) continue;
      const nA = fin.words.filter((w) => w.d === 'A').length, nD = fin.words.length - nA;
      const ok = nA >= opts.minA && nD >= opts.minD;
      if (!best || (ok && !best.ok) || (ok === best.ok && fin.words.length > best.fin.words.length)) best = { fin: fin, ok: ok, nA: nA, nD: nD };
      if (ok) break;
    }
    if (!best) return null;
    const fin = best.fin;
    const outWords = fin.words.map((w) => {
      const p = w.meta.pick;
      return { n: w.n, d: w.d, r: w.r, c: w.c, a: w.a, en: w.meta.en, q: p.clue, ref: [p.ref.b, p.ref.c, p.ref.v, p.ref.v2], k: p.key, cur: p.cur ? 1 : 0 };
    });
    return { ok: best.ok, nA: best.nA, nD: best.nD, w: fin.w, h: fin.h, rows: fin.rows, words: outWords };
  }

  // Register used clue keys after a puzzle is accepted (premade build uses this).
  function registerUsed(puz, usedClues, usedCurated) {
    puz.words.forEach((w) => {
      if (w.cur) usedCurated.add(w.k);
      usedClues.add(w.k); usedClues.add('T:' + w.q);
    });
  }

  // ---------------- newspaper-style (fully interlocking) puzzles ----------------
  // Words kept out of answers for a family-friendly puzzle (they still appear in the Bible reader).
  const AVOID = new Set(('whore whores whoredom whoredoms whoring whorish whoremonger whoremongers bastard bastards piss pisseth ' +
    'sodomite sodomites harlotry concubine concubines lust lusts lusted lusteth adultery adulteress adulterer adulterers adulteries ' +
    'fornication fornicator fornicators foreskin foreskins teats menstruous rape ravished uncircumcised circumcised breasts ' +
    'ye').split(' '));
  // Glue words: allowed only when a grid really needs them (heavily penalized).
  const GLUE = new Set(('the and his her she but thy thee thou was are had him for not you our its were then lest unto that this with from them they ' +
    'have hath shall which there their into when what who whom whose upon also than these those been did doth didst hast art').split(' '));
  // Base dictionary: KJV words used at least twice that can be clued from a verse. Cached per Bible.
  function denseDictionary(bible, maxLen) {
    const key = '_dense' + maxLen;
    if (bible[key]) return bible[key];
    const ix = bible.index(); const out = [];
    ix.post.forEach((ids, w) => {
      if (w.length < 3 || w.length > maxLen || !/^[a-z]+$/.test(w)) return;
      const f = ix.tot.get(w); if (f < 2 || AVOID.has(w)) return;
      let good = 0;
      for (let k = 0; k < ids.length && k < 40 && good < 2; k++) if (E.makeFillClue(bible.text[ids[k]], w)) good++;
      if (good < 2) return;
      out.push({ w: w, a: w.toUpperCase(), s: GLUE.has(w) ? -5 : Math.min(Math.log(f), 4) / 2 * (E.STOP.has(w) ? 0.5 : 1) });
    });
    bible[key] = out;
    return out;
  }

  // Word list with theme bonuses, ready for CWDense.build
  function denseWords(bible, curated, theme, opts) {
    const maxLen = opts.maxLen || 6;
    const base = denseDictionary(bible, maxLen);
    const pool = resolveScope(bible, theme); const poolSet = new Set(pool);
    const bonus = new Map();
    if (!theme.whole) {
      const sw = E.scoreWords(bible, pool, {}).filter((x) => x.w.length <= maxLen).slice(0, 500);
      const top = sw.length ? sw[0].score : 1;
      sw.forEach((x) => { if (!AVOID.has(x.w)) bonus.set(x.w.toUpperCase(), (opts.themeBonus || 5) + 3 * (x.score / top)); });
    }
    if (theme.list) theme.list.forEach((w) => { if (w.length <= maxLen) bonus.set(w.toUpperCase(), 4.5); });
    const usedCur = opts.usedCurated || new Set();
    const curOK = new Map();
    curated.forEach((c) => {
      if (usedCur.has(c.key) || c.en.indexOf(',') >= 0 || c.ans.length < 3 || c.ans.length > maxLen) return;
      const inTheme = theme.whole || c.ids.some((id) => poolSet.has(id)) || (theme.list && theme.list.some((w) => w.toUpperCase() === c.ans));
      if (!inTheme) return;
      if (!curOK.has(c.ans)) curOK.set(c.ans, []);
      curOK.get(c.ans).push(c);
      bonus.set(c.ans, Math.max(bonus.get(c.ans) || 0, 4));
    });
    const rng = E.RNG((opts.seed >>> 0) ^ 0x5bd1e995);
    const seen = new Set(); const words = [];
    const usedClues = opts.usedClues;
    const ixx = bible.index();
    const clueableStrict = (x) => { // rare words must still have an unused clue verse
      if (!usedClues || (ixx.post.get(x.w) || []).length > 30) return true;
      return (ixx.post.get(x.w) || []).some((id) => { if (usedClues.has('V:' + x.a + ':' + id)) return false; const c = E.makeFillClue(bible.text[id], x.w); return c && !usedClues.has('T:' + c); });
    };
    const usage = opts.usage;
    base.forEach((x) => {
      seen.add(x.a); if (opts.ban && opts.ban.has(x.a)) return;
      const fresh = clueableStrict(x);
      if (!fresh && !opts.allowRepeat) return;
      const wd = { a: x.a, s: x.s + (bonus.get(x.a) || 0) - (usage ? 2 * (usage.get(x.a) || 0) : 0) + rng() * 0.8 };
      if (!fresh) wd.st = 1;
      words.push(wd);
    });
    curOK.forEach((list, a) => { if (!seen.has(a)) words.push({ a: a, s: 6 + rng() }); });
    return { words: words, pool: pool, poolSet: poolSet, curOK: curOK };
  }

  // Assign clues to a filled dense grid. Returns null if some answer cannot be clued uniquely.
  function clueDense(bible, fill, prep, opts) {
    const rng = E.RNG((opts.seed >>> 0) ^ 0x9e3779b9);
    const ix = bible.index();
    const usedClues = opts.usedClues || new Set(), usedCur = opts.usedCurated || new Set();
    const usedVerse = new Set(), usedText = new Set();
    const out = [];
    for (const w of fill.words) {
      let pick = null;
      const cl = prep.curOK.get(w.a);
      if (cl) { const c = cl.find((x) => !usedCur.has(x.key) && !usedText.has(x.clue)); if (c) pick = { clue: c.clue, ref: c.ref, key: c.key, ids: c.ids, cur: true }; }
      if (!pick) {
        const lw = w.a.toLowerCase(); const ids = ix.post.get(lw) || [];
        const inPool = E.shuffle(ids.filter((id) => prep.poolSet.has(id)), rng);
        const rest = E.shuffle(ids.filter((id) => !prep.poolSet.has(id)), rng);
        const order = inPool.concat(rest);
        // pass 0: fresh verse; pass 1: allow a verse used elsewhere in this puzzle;
        // pass 2 (only with allowRepeat): allow a clue already used in another puzzle (never twice in one puzzle)
        for (let pass = 0; pass < (opts.allowRepeat ? 3 : 2) && !pick; pass++) {
          for (let k = 0; k < order.length && k < 80; k++) {
            const id = order[k];
            if (pass === 0 && usedVerse.has(id)) continue;
            const clue = E.makeFillClue(bible.text[id], lw); if (!clue) continue;
            const key = 'V:' + w.a + ':' + id;
            if (usedText.has(clue)) continue;
            if (pass < 2 && (usedClues.has(key) || usedClues.has('T:' + clue))) continue;
            pick = { clue: clue, ref: bible.refOf(id), key: key, ids: [id], repeat: pass === 2 }; break;
          }
        }
      }
      if (!pick) { out.forEach((x) => { if (x.cur) usedCur.delete(x.k); }); if (opts.onMissing) opts.onMissing(w.a); return null; }
      pick.ids.forEach((id) => usedVerse.add(id)); usedText.add(pick.clue);
      if (pick.cur) usedCur.add(pick.key);
      out.push({ n: w.n, d: w.d, r: w.r, c: w.c, a: w.a, en: String(w.a.length), q: pick.clue, ref: [pick.ref.b, pick.ref.c, pick.ref.v, pick.ref.v2], k: pick.key, cur: pick.cur ? 1 : 0, rep: pick.repeat ? 1 : 0 });
    }
    if (opts.usedCurated) out.forEach((w) => { if (w.cur) opts.usedCurated.delete(w.k); }); // registerUsed() records them for real
    return out;
  }

  /* Synchronous dense puzzle (used by the build script). opts: {seed, W, H, minA, minD, ratio, maxLen, maxOpen, totalMs, usedClues, usedCurated} */
  function makeDensePuzzle(bible, curated, theme, opts, D) {
    const prep = denseWords(bible, curated, theme, opts);
    const fill = D.build(prep.words, Object.assign({}, opts, { rng: E.RNG(opts.seed >>> 0) }));
    if (!fill) return null;
    return finishDense(bible, fill, prep, opts);
  }
  function finishDense(bible, fill, prep, opts) {
    const words = clueDense(bible, fill, prep, opts);
    if (!words) return null;
    const nA = words.filter((w) => w.d === 'A').length, nD = words.length - nA;
    return { ok: nA >= opts.minA && nD >= opts.minD, nA: nA, nD: nD, w: fill.w, h: fill.h, rows: fill.rows, words: words, dense: true };
  }

  return { prepareCurated: prepareCurated, makePuzzle: makePuzzle, registerUsed: registerUsed, resolveScope: resolveScope,
    denseWords: denseWords, makeDensePuzzle: makeDensePuzzle, finishDense: finishDense, denseDictionary: denseDictionary };
});

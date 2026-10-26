/* Newspaper-style (fully interlocked) crossword construction: symmetric block patterns + backtracking fill.
   Every white square belongs to an across word and a down word of 3+ letters. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CWDense = factory(); root.CWDense.factory = factory; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- word index with bitsets ----------
  // words: [{a:'MOSES', s:score}] -> per length lists sorted by score, plus bitsets per (pos,letter)
  function WordIndex(words) {
    this.byLen = {};
    const groups = {};
    words.forEach((w) => { (groups[w.a.length] = groups[w.a.length] || []).push(w); });
    for (const L in groups) {
      const list = groups[L].sort((x, y) => y.s - x.s);
      const n = list.length, nw = (n + 31) >>> 5;
      const bits = [];
      for (let p = 0; p < L; p++) {
        const row = [];
        for (let c = 0; c < 26; c++) row.push(new Uint32Array(nw));
        bits.push(row);
      }
      list.forEach((w, i) => { for (let p = 0; p < L; p++) bits[p][w.a.charCodeAt(p) - 65][i >>> 5] |= (1 << (i & 31)); });
      const all = new Uint32Array(nw); for (let i = 0; i < n; i++) all[i >>> 5] |= (1 << (i & 31));
      this.byLen[L] = { list, bits, all, nw };
    }
  }
  function popcnt(x) { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }

  // ---------- block patterns ----------
  function slotsOf(W, H, black) {
    const slots = []; const cellSlots = Array.from({ length: W * H }, () => [-1, -1]);
    for (let r = 0; r < H; r++) {
      let c = 0;
      while (c < W) {
        if (black[r * W + c]) { c++; continue; }
        let e = c; while (e < W && !black[r * W + e]) e++;
        const cells = []; for (let k = c; k < e; k++) cells.push(r * W + k);
        const id = slots.length; slots.push({ d: 'A', r, c, cells });
        cells.forEach((i) => (cellSlots[i][0] = id)); c = e;
      }
    }
    for (let c = 0; c < W; c++) {
      let r = 0;
      while (r < H) {
        if (black[r * W + c]) { r++; continue; }
        let e = r; while (e < H && !black[e * W + c]) e++;
        const cells = []; for (let k = r; k < e; k++) cells.push(k * W + c);
        const id = slots.length; slots.push({ d: 'D', r, c, cells });
        cells.forEach((i) => (cellSlots[i][1] = id)); r = e;
      }
    }
    return { slots, cellSlots };
  }
  function patternOK(W, H, black, maxLen) {
    const { slots } = slotsOf(W, H, black);
    for (const s of slots) if (s.cells.length < 3 || s.cells.length > maxLen) return false;
    // connectivity of white cells
    let start = -1, white = 0;
    for (let i = 0; i < W * H; i++) if (!black[i]) { white++; if (start < 0) start = i; }
    if (start < 0) return false;
    const seen = new Uint8Array(W * H); const st = [start]; seen[start] = 1; let cnt = 0;
    while (st.length) {
      const i = st.pop(); cnt++; const r = (i / W) | 0, c = i % W;
      const nb = [r > 0 ? i - W : -1, r < H - 1 ? i + W : -1, c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1];
      for (const j of nb) if (j >= 0 && !black[j] && !seen[j]) { seen[j] = 1; st.push(j); }
    }
    return cnt === white;
  }
  // Random symmetric pattern with every run 3..maxLen, aiming at a black-square ratio.
  function makePattern(W, H, rng, opts) {
    const maxLen = opts.maxLen || 9, ratio = opts.ratio || 0.2, maxOpen = opts.maxOpen == null ? 99 : opts.maxOpen;
    const N = W * H;
    const tryBlack = (black, i) => {
      const j = N - 1 - i; if (black[i] || black[j]) return false;
      black[i] = 1; black[j] = 1;
      if (localOK(W, H, black, i) && localOK(W, H, black, j)) return true;
      black[i] = 0; black[j] = 0; return false;
    };
    for (let attempt = 0; attempt < 300; attempt++) {
      const black = new Uint8Array(N);
      let guard = 0;
      while (guard++ < 2000) {
        // problem cells: inside over-long runs, or inside fully open 3x3 windows
        const prob = [];
        const { slots } = slotsOf(W, H, black);
        for (const sl of slots) if (sl.cells.length > maxLen) for (let k = 3; k < sl.cells.length - 3; k++) prob.push(sl.cells[k]);
        let open = 0; const openCells = [];
        for (let r = 0; r + 2 < H; r++) for (let c = 0; c + 2 < W; c++) {
          let all = true;
          for (let dr = 0; dr < 3 && all; dr++) for (let dc = 0; dc < 3; dc++) if (black[(r + dr) * W + c + dc]) { all = false; break; }
          if (all) { open++; openCells.push((r + 1) * W + c + 1, r * W + c, (r + 2) * W + c + 2, r * W + c + 2, (r + 2) * W + c); }
        }
        let count = 0; for (let i = 0; i < N; i++) count += black[i];
        let pool;
        if (prob.length) pool = prob;
        else if (open > maxOpen) pool = openCells;
        else if (count < N * ratio) { pool = []; for (let i = 0; i < N; i++) if (!black[i]) pool.push(i); }
        else break;
        let placed = false;
        for (let t = 0; t < 30 && !placed; t++) placed = tryBlack(black, pool[Math.floor(rng() * pool.length)]);
        if (!placed) { if (prob.length || open > maxOpen) break; else break; }
      }
      if (!patternOK(W, H, black, maxLen)) continue;
      let count = 0; for (let i = 0; i < N; i++) count += black[i];
      if (count > N * (ratio + 0.06)) continue;
      const { slots } = slotsOf(W, H, black);
      const nA = slots.filter((sl) => sl.d === 'A').length, nD = slots.length - nA;
      if (nA < opts.minA || nD < opts.minD) continue;
      if (opts.max3 != null && slots.filter((sl) => sl.cells.length === 3).length > opts.max3) continue;
      return black;
    }
    return null;
  }
  // After blacking cell i, its neighbouring runs must stay >= 3 (or vanish).
  function localOK(W, H, black, i) {
    const r = (i / W) | 0, c = i % W;
    const run = (rr, cc, dr, dc) => { let n = 0; while (rr >= 0 && cc >= 0 && rr < H && cc < W && !black[rr * W + cc]) { n++; rr += dr; cc += dc; } return n; };
    const checks = [run(r, c - 1, 0, -1), run(r, c + 1, 0, 1), run(r - 1, c, -1, 0), run(r + 1, c, 1, 0)];
    for (const n of checks) if (n > 0 && n < 3) return false;
    return true;
  }

  // ---------- fill ----------
  function fill(W, H, black, index, opts) {
    const rng = opts.rng; const { slots, cellSlots } = slotsOf(W, H, black);
    const grid = new Array(W * H).fill(null);
    const assigned = new Array(slots.length).fill(-1);
    const usedWords = new Set();
    const deadline = Date.now() + (opts.timeMs || 4000);
    let nodes = 0; const maxNodes = opts.maxNodes || 60000;
    const scratch = {};
    function candidates(si) {
      const s = slots[si]; const L = s.cells.length; const ix = index.byLen[L];
      if (!ix) return null;
      let set = scratch[L]; if (!set) set = scratch[L] = new Uint32Array(ix.nw);
      const out = new Uint32Array(ix.nw); out.set(ix.all);
      for (let p = 0; p < L; p++) {
        const ch = grid[s.cells[p]]; if (!ch) continue;
        const b = ix.bits[p][ch.charCodeAt(0) - 65];
        for (let k = 0; k < ix.nw; k++) out[k] &= b[k];
      }
      return out;
    }
    function count(bits) { let n = 0; for (let k = 0; k < bits.length; k++) if (bits[k]) n += popcnt(bits[k]); return n; }
    function pickSlot() {
      let best = -1, bestN = 1e9, bestBits = null;
      for (let si = 0; si < slots.length; si++) {
        if (assigned[si] >= 0) continue;
        // skip slots fully determined by crossings (they still need a valid word)
        const b = candidates(si); if (!b) return { si, n: 0, bits: null };
        const n = count(b);
        // weight: prefer constrained slots, and longer ones at equal count
        if (n < bestN || (n === bestN && slots[si].cells.length > slots[best].cells.length)) { best = si; bestN = n; bestBits = b; }
        if (n === 0) break;
      }
      return { si: best, n: bestN, bits: bestBits };
    }
    function place(si, word) {
      const s = slots[si]; const changed = [];
      for (let p = 0; p < s.cells.length; p++) { const c = s.cells[p]; if (!grid[c]) { grid[c] = word[p]; changed.push(c); } }
      assigned[si] = 1; usedWords.add(word); return changed;
    }
    function unplace(si, word, changed) { changed.forEach((c) => (grid[c] = null)); assigned[si] = -1; usedWords.delete(word); }
    function crossingsAlive(si) {
      const s = slots[si];
      for (const c of s.cells) {
        const other = cellSlots[c][s.d === 'A' ? 1 : 0];
        if (other < 0 || assigned[other] >= 0) continue;
        const b = candidates(other); if (!b || count(b) === 0) return false;
      }
      return true;
    }
    // fill slots whose letters are all determined: check they are words
    function solve(depth) {
      if (Date.now() > deadline || ++nodes > maxNodes) return false;
      const pk = pickSlot();
      if (pk.si < 0) return true;
      if (pk.n === 0) return false;
      const s = slots[pk.si]; const ix = index.byLen[s.cells.length];
      // enumerate candidates in score order, with mild randomization among the top few
      const cand = [];
      for (let k = 0; k < pk.bits.length && cand.length < (opts.look || 80); k++) {
        let v = pk.bits[k];
        while (v) { const t = v & -v; const bit = 31 - Math.clz32(t); cand.push((k << 5) + bit); v ^= t; if (cand.length >= (opts.look || 80)) break; }
      }
      for (let i = 0; i < Math.min(cand.length, 6); i++) { const j = i + Math.floor(rng() * Math.min(4, cand.length - i)); const tmp = cand[i]; cand[i] = cand[j]; cand[j] = tmp; }
      // Look-ahead: score candidates by the options they leave in crossing slots.
      const scored = [];
      for (const wi of cand) {
        const word = ix.list[wi].a;
        if (usedWords.has(word)) continue;
        const changed = place(pk.si, word);
        let minC = 1e9, logSum = 0;
        for (const c of s.cells) {
          const other = cellSlots[c][s.d === 'A' ? 1 : 0];
          if (other < 0 || assigned[other] >= 0) continue;
          const bits = candidates(other); const n = bits ? count(bits) : 0;
          if (n < minC) minC = n; logSum += Math.log(1 + n);
          if (n === 0) break;
        }
        unplace(pk.si, word, changed);
        if (minC === 0) continue;
        scored.push({ wi, word, v: logSum + (opts.wScore || 0.6) * ix.list[wi].s - (ix.list[wi].st ? (opts.stale || 0) : 0) + rng() * 0.3 });
      }
      scored.sort((x, y) => y.v - x.v);
      let tries = 0;
      for (const sc of scored) {
        if (++tries > (opts.branch || 5)) break;
        const changed = place(pk.si, sc.word);
        if (solve(depth + 1)) return true;
        unplace(pk.si, sc.word, changed);
        if (Date.now() > deadline || nodes > maxNodes) return false;
      }
      return false;
    }
    const ok = solve(0);
    if (!ok) return null;
    return { grid, slots };
  }

  /* Build a dense puzzle.
     words: [{a, s}] uppercase answers with scores (higher = preferred)
     opts: {W, H, minA, minD, rng, ratio, maxLen, timeMs, patterns} */
  function build(words, opts) {
    const index = new WordIndex(words);
    const t0 = Date.now(); const budget = opts.totalMs || 20000;
    for (let pt = 0; pt < (opts.patterns || 40) && Date.now() - t0 < budget; pt++) {
      const black = makePattern(opts.W, opts.H, opts.rng, opts);
      if (!black) continue;
      for (let rs = 0; rs < (opts.restarts || 8); rs++) {
        const res = fill(opts.W, opts.H, black, index, { rng: opts.rng, timeMs: opts.timeMs || 500, maxNodes: opts.maxNodes, branch: opts.branch, look: opts.look, wScore: opts.wScore, stale: opts.stale });
        if (res) return finalize(opts.W, opts.H, black, res);
        if (Date.now() - t0 > budget) break;
      }
    }
    return null;
  }
  function finalize(W, H, black, res) {
    const rows = [];
    for (let r = 0; r < H; r++) { let s = ''; for (let c = 0; c < W; c++) s += black[r * W + c] ? '.' : res.grid[r * W + c]; rows.push(s); }
    let num = 0; const numAt = {};
    const startA = new Set(), startD = new Set();
    res.slots.forEach((s) => (s.d === 'A' ? startA : startD).add(s.cells[0]));
    for (let i = 0; i < W * H; i++) if (startA.has(i) || startD.has(i)) numAt[i] = ++num;
    const words = res.slots.map((s) => ({ n: numAt[s.cells[0]], d: s.d, r: s.r, c: s.c, a: s.cells.map((i) => res.grid[i]).join('') }));
    words.sort((a, b) => (a.d === b.d ? a.n - b.n : a.d === 'A' ? -1 : 1));
    return { w: W, h: H, rows, words, dense: true };
  }

  return { build, makePattern, fill, WordIndex, slotsOf };
});

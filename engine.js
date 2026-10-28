// A tiny Turkish inflection engine: vowel harmony, buffer letters,
// consonant voicing/mutation and vowel drop. Not a full analyzer.
(function (root) {
  const BACK = 'aıou', FRONT = 'eiöü', VOW = BACK + FRONT, VOICELESS = 'fstkçşhp';
  const isV = (c) => VOW.includes(c);
  const lastV = (s) => {
    for (let i = s.length - 1; i >= 0; i--) if (isV(s[i])) return s[i];
    return 'e';
  };
  const harmA = (v) => (BACK.includes(v) ? 'a' : 'e');
  const harmI = (v) => ({ a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' })[v];
  const MUT = { p: 'b', ç: 'c', t: 'd', k: 'ğ' };

  const ROOTS = [
    { w: 'ev', gloss: 'house' },
    { w: 'göz', gloss: 'eye' },
    { w: 'kitap', gloss: 'book', mut: true },
    { w: 'ağaç', gloss: 'tree', mut: true },
    { w: 'çocuk', gloss: 'child', mut: true },
    { w: 'köpek', gloss: 'dog', mut: true },
    { w: 'burun', gloss: 'nose', drop: true },
    { w: 'ağız', gloss: 'mouth', drop: true },
    { w: 'araba', gloss: 'car' },
    { w: 'okul', gloss: 'school' },
    { w: 'kuş', gloss: 'bird' },
    { w: 'kedi', gloss: 'cat' },
  ];

  const DERIV = {
    none: null,
    li: { tpl: 'lI', gloss: 'WITH' },
    siz: { tpl: 'sIz', gloss: 'WITHOUT' },
    lik: { tpl: 'lIk', gloss: 'ABSTR' },
    ci: { tpl: 'CI', gloss: 'AGENT' },
  };
  const POSS = {
    none: null,
    '1sg': { tpl: '(I)m', gloss: '1SG.POSS' },
    '2sg': { tpl: '(I)n', gloss: '2SG.POSS' },
    '3sg': { tpl: '(s)I', gloss: '3SG.POSS' },
    '1pl': { tpl: '(I)mIz', gloss: '1PL.POSS' },
    '2pl': { tpl: '(I)nIz', gloss: '2PL.POSS' },
  };
  const CASE = {
    nom: null,
    acc: { tpl: '(y)I', after3: 'nI', gloss: 'ACC' },
    dat: { tpl: '(y)A', after3: 'nA', gloss: 'DAT' },
    loc: { tpl: 'DA', after3: 'ndA', gloss: 'LOC' },
    abl: { tpl: 'DAn', after3: 'ndAn', gloss: 'ABL' },
    gen: { tpl: '(n)In', after3: 'nIn', gloss: 'GEN' },
    ins: { tpl: '(y)lA', after3: 'ylA', gloss: 'INS' },
  };

  // Turn a suffix template (A, I = harmony slots, D, C = voicing slots,
  // (x) = optional buffer) into surface letters for the given stem.
  function realize(ref, tpl, notes, name) {
    let out = '';
    const seen = {};
    const note = (k, t) => {
      if (!seen[k]) { seen[k] = 1; notes.push({ suffix: name, text: t }); }
    };
    const re = /\(([^)]+)\)|./gu;
    let m;
    while ((m = re.exec(tpl))) {
      const full = ref + out;
      const end = full[full.length - 1];
      if (m[1]) {
        const buf = m[1];
        if (buf === 'I') {
          if (!isV(end)) out += harmI(lastV(full));
          else note('drop', `stem ends in a vowel, so the linking vowel of -${name} drops`);
        } else if (isV(end)) {
          out += buf;
          note('buf', `buffer “${buf}” keeps two vowels apart`);
        }
        continue;
      }
      const c = m[0];
      if (c === 'A') {
        const v = lastV(full), r = harmA(v);
        out += r;
        note('A', `vowel harmony: last vowel “${v}” is ${BACK.includes(v) ? 'back' : 'front'} → “${r}”`);
      } else if (c === 'I') {
        const v = lastV(full), r = harmI(v);
        out += r;
        note('I', `vowel harmony: last vowel “${v}” → “${r}” (backness + roundness)`);
      } else if (c === 'D') {
        const v = VOICELESS.includes(end);
        out += v ? 't' : 'd';
        note('D', `“${end}” is ${v ? 'voiceless' : 'voiced'} → “${v ? 't' : 'd'}”`);
      } else if (c === 'C') {
        const v = VOICELESS.includes(end);
        out += v ? 'ç' : 'c';
        note('C', `“${end}” is ${v ? 'voiceless' : 'voiced'} → “${v ? 'ç' : 'c'}”`);
      } else out += c;
    }
    return out;
  }

  function build({ root: r, deriv = 'none', plural = false, poss = 'none', kase = 'nom' }) {
    const parts = [{ type: 'root', text: r.w, gloss: r.gloss.toUpperCase() }];
    const notes = [];
    let ref = r.w;
    const add = (type, gloss, tpl) => {
      const s = realize(ref, tpl, notes, tpl.replace(/[()]/g, ''));
      parts.push({ type, text: s, gloss });
      ref += s;
    };
    if (DERIV[deriv]) add('deriv', DERIV[deriv].gloss, DERIV[deriv].tpl);
    if (plural) add('plural', 'PL', 'lAr');
    if (POSS[poss]) add('poss', POSS[poss].gloss, POSS[poss].tpl);
    const c = CASE[kase];
    if (c) {
      const after3 = poss === '3sg';
      if (after3) notes.push({ suffix: c.gloss, text: 'after 3rd-person possessive, case suffixes take a linking “n”' });
      add('case', c.gloss, after3 ? c.after3 : c.tpl);
    }

    // Root-internal changes triggered by a vowel-initial first suffix.
    if (parts.length > 1 && isV(parts[1].text[0])) {
      const rootPart = parts[0];
      if (r.mut) {
        const last = rootPart.text.slice(-1);
        if (MUT[last]) {
          rootPart.text = rootPart.text.slice(0, -1) + MUT[last];
          notes.unshift({ suffix: r.w, text: `consonant alternation: final “${last}” → “${MUT[last]}” before a vowel` });
        }
      }
      if (r.drop) {
        const t = rootPart.text;
        for (let i = t.length - 1; i >= 0; i--) {
          if (isV(t[i])) {
            rootPart.text = t.slice(0, i) + t.slice(i + 1);
            notes.unshift({ suffix: r.w, text: `vowel drop: “${t[i]}” disappears before a vowel-initial suffix` });
            break;
          }
        }
      }
    }
    return { parts, word: parts.map((p) => p.text).join(''), notes };
  }

  const api = { build, ROOTS, DERIV, POSS, CASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TR = api;
})(typeof window !== 'undefined' ? window : globalThis);

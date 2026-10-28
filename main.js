(function () {
  const { build, ROOTS, DERIV, POSS, CASE } = window.TR;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- theme ----------
  const rootEl = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) rootEl.dataset.theme = saved;
  } catch (e) {}
  if ($('theme')) $('theme').addEventListener('click', () => {
    const dark = rootEl.dataset.theme
      ? rootEl.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    rootEl.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', rootEl.dataset.theme); } catch (e) {}
  });
  if ($('yr')) $('yr').textContent = new Date().getFullYear();

  // ---------- entrance motion ----------
  if (!reduce && 'IntersectionObserver' in window) {
    const groups = [
      '.hero h1, .hero .role, .hero .avatar, .hero .links, .hero .intro, .explore h2, .explore .tile',
      'main > section:not(.hero)',
    ];
    const targets = [];
    document.querySelectorAll(groups[0]).forEach((e) => targets.push(e));
    document.querySelectorAll(groups[1]).forEach((sec) => {
      sec.querySelectorAll(':scope > h1, :scope > h2, :scope > p, :scope > .news, :scope > .tiles > *, :scope > .rows3 > li, :scope > .rows > li, :scope > .places-grid > *, :scope > .contact-side, :scope > .stats > *, :scope > .uses > *, :scope > pre, :scope > .card, :scope > .panel, :scope > .model-head, :scope > .links')
        .forEach((e) => targets.push(e));
    });
    if (targets.length) {
      rootEl.classList.add('reveal-ready');
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      let i = 0, lastTop = -1;
      targets.forEach((e) => {
        const top = Math.round(e.getBoundingClientRect().top + scrollY / 1);
        i = Math.abs(top - lastTop) < 40 ? i + 1 : 0; lastTop = top;
        e.dataset.reveal = ''; e.style.setProperty('--d', Math.min(i, 5) * 70 + 'ms');
        io.observe(e);
      });
    }
  }

  // ---------- rendering helpers ----------
  function renderWord(el, parts, animateLast) {
    el.textContent = '';
    parts.forEach((p, i) => {
      const s = document.createElement('span');
      s.className = 'm m-' + p.type + (animateLast && i === parts.length - 1 && i > 0 ? ' pop' : '');
      s.textContent = p.text;
      el.appendChild(s);
    });
  }
  const glossLine = (parts) => parts.map((p) => p.gloss).join('-');

  // ---------- hero ----------
  const PRESETS = [
    { root: 'ev', plural: true, poss: '1pl', kase: 'loc', trans: '“in our houses”' },
    { root: 'kitap', deriv: 'ci', plural: true, kase: 'abl', trans: '“from the booksellers”' },
    { root: 'çocuk', plural: true, poss: '2pl', kase: 'dat', trans: '“to your children”' },
    { root: 'ağaç', plural: true, poss: '3sg', kase: 'loc', trans: '“in its trees”' },
    { root: 'ev', deriv: 'siz', plural: true, kase: 'gen', trans: '“of the homeless”' },
  ];
  const rootByWord = (w) => ROOTS.find((r) => r.w === w);
  let heroIdx = 0, heroTimer;
  function heroStep(preset, n) {
    const full = build({ ...preset, root: rootByWord(preset.root) });
    const parts = full.parts.slice(0, n);
    renderWord($('heroWord'), parts, true);
    $('heroGloss').textContent = glossLine(parts);
    $('heroTrans').textContent = n === full.parts.length ? full.word + ' = ' + preset.trans : '';
    if (n < full.parts.length) heroTimer = setTimeout(() => heroStep(preset, n + 1), 650);
    else if (!reduce) heroTimer = setTimeout(() => { heroIdx = (heroIdx + 1) % PRESETS.length; heroStep(PRESETS[heroIdx], 1); }, 3200);
  }
  if ($('heroWord')) { if (reduce) heroStep(PRESETS[0], 99); else heroStep(PRESETS[0], 1); }

  // ---------- playground ----------
  const state = { root: ROOTS[0], deriv: 'none', plural: false, poss: 'none', kase: 'nom' };
  const suffixLabel = {
    deriv: { none: 'none', li: '-lI', siz: '-sIz', lik: '-lIk', ci: '-CI' },
    plural: { off: 'none', on: '-lAr' },
    poss: { none: 'none', '1sg': 'my', '2sg': 'your', '3sg': 'his/her', '1pl': 'our', '2pl': 'your (pl)' },
    kase: { nom: 'plain', acc: 'ACC', dat: 'DAT', loc: 'LOC', abl: 'ABL', gen: 'GEN', ins: 'INS' },
  };
  function chips(containerId, options, getVal, onPick) {
    const box = $(containerId);
    const draw = () => {
      box.textContent = '';
      options.forEach(([val, label, sub]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(getVal() === val));
        b.textContent = label;
        if (sub) { const s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
        b.addEventListener('click', () => { onPick(val); refresh(); });
        box.appendChild(b);
      });
    };
    return draw;
  }
  const draws = [
    chips('rootChips', ROOTS.map((r) => [r.w, r.w, r.gloss]), () => state.root.w, (v) => (state.root = rootByWord(v))),
    chips('derivChips', Object.keys(DERIV).map((k) => [k, suffixLabel.deriv[k]]), () => state.deriv, (v) => (state.deriv = v)),
    chips('pluralChips', [['off', 'none'], ['on', '-lAr']], () => (state.plural ? 'on' : 'off'), (v) => (state.plural = v === 'on')),
    chips('possChips', Object.keys(POSS).map((k) => [k, suffixLabel.poss[k]]), () => state.poss, (v) => (state.poss = v)),
    chips('caseChips', Object.keys(CASE).map((k) => [k, suffixLabel.kase[k]]), () => state.kase, (v) => (state.kase = v)),
  ];
  function refresh() {
    draws.forEach((d) => d());
    const res = build(state);
    renderWord($('outWord'), res.parts, false);
    $('outGloss').textContent = glossLine(res.parts);
    const n = res.word.length;
    $('outMeta').textContent = `${n} characters, ${res.parts.length} morpheme${res.parts.length > 1 ? 's' : ''}`;
    const ul = $('outRules');
    ul.textContent = '';
    if (!res.notes.length) {
      const li = document.createElement('li');
      li.textContent = 'Just the bare root. Add a suffix to see the rules fire.';
      ul.appendChild(li);
    }
    res.notes.forEach((nt) => {
      const li = document.createElement('li');
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = nt.suffix;
      const tx = document.createElement('span'); tx.textContent = nt.text;
      li.append(tag, tx); ul.appendChild(li);
    });
  }
  if ($('shuffle')) $('shuffle').addEventListener('click', () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    state.root = pick(ROOTS);
    state.deriv = pick(Object.keys(DERIV));
    state.plural = Math.random() < 0.6;
    state.poss = pick(Object.keys(POSS));
    state.kase = pick(Object.keys(CASE));
    refresh();
  });
  if ($('rootChips')) refresh();

  // ---------- count-up numbers ----------
  const fmt = (el, v) => {
    const dec = +(el.dataset.dec || 0);
    el.textContent = (el.dataset.pre || '') + v.toFixed(dec) + (el.dataset.suf || '');
  };
  const run = (el) => {
    const to = +el.dataset.to;
    if (reduce) return fmt(el, to);
    const t0 = performance.now(), dur = 1300;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      fmt(el, to * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const bigs = document.querySelectorAll('.big[data-to]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    }), { threshold: 0.6 });
    bigs.forEach((b) => io.observe(b));
  } else bigs.forEach(run);

  // ---------- German case quiz ----------
  const QUIZ = [
    { pre: 'Ich sehe', post: 'Hund.', opts: ['den', 'dem'], ans: 'den', why: 'Accusative: “sehen” takes a direct object, so masculine der → den.' },
    { pre: 'Sie hilft', post: 'Kind.', opts: ['das', 'dem'], ans: 'dem', why: 'Dative: “helfen” is a dative verb, so neuter das → dem.' },
    { pre: 'Wir danken', post: 'Lehrerin.', opts: ['die', 'der'], ans: 'der', why: 'Dative: “danken” is a dative verb, so feminine die → der.' },
    { pre: 'Er kauft', post: 'Buch.', opts: ['das', 'dem'], ans: 'das', why: 'Accusative: a direct object stays neuter “das”.' },
    { pre: 'Ich folge', post: 'Mann.', opts: ['den', 'dem'], ans: 'dem', why: 'Dative: “folgen” takes the dative, so masculine → dem.' },
    { pre: 'Sie liebt', post: 'Katze.', opts: ['die', 'der'], ans: 'die', why: 'Accusative: feminine accusative looks like nominative, “die”.' },
  ];
  let qi = 0, score = 0, locked = false;
  const qbox = $('quiz-box');
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function drawQuiz() {
    qbox.textContent = '';
    if (qi >= QUIZ.length) {
      const end = el('div', 'quiz-end');
      end.append(el('div', 'big', `${score} / ${QUIZ.length}`));
      const msg = score === QUIZ.length
        ? 'Flawless. A small character-level LM would need a lot more German to match you.'
        : 'German case is genuinely tricky: the article is the only clue, and it is shared across cases.';
      end.append(el('p', 'sec-lede', msg + ' In my experiments the model never sees these labels. It only compares which sentence is less surprising.'));
      const again = el('button', 'btn', 'Play again'); again.type = 'button';
      again.addEventListener('click', () => { qi = 0; score = 0; drawQuiz(); });
      end.append(again);
      qbox.append(end);
      return;
    }
    const q = QUIZ[qi]; locked = false;
    const top = el('div', 'quiz-top');
    top.append(el('span', null, `Sentence ${qi + 1} / ${QUIZ.length}`), el('span', null, `Score ${score}`));
    const line = el('div', 'quiz-q');
    const blank = el('span', 'blank', '   ');
    line.append(q.pre + ' ', blank, ' ' + q.post);
    const opts = el('div', 'quiz-opts');
    const fb = el('div', 'quiz-fb', 'Which article makes it grammatical?');
    fb.setAttribute('aria-live', 'polite');
    q.opts.forEach((o) => {
      const b = el('button', 'btn', o); b.type = 'button';
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        const ok = o === q.ans;
        if (ok) score++;
        blank.textContent = q.ans;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...opts.children].find((x) => x.textContent === q.ans).classList.add('right');
        fb.textContent = (ok ? 'Correct. ' : 'Not quite. ') + q.why;
        const next = el('button', 'btn', qi === QUIZ.length - 1 ? 'See score' : 'Next →'); next.type = 'button';
        next.addEventListener('click', () => { qi++; drawQuiz(); });
        fb.append(document.createElement('br'), next);
        next.focus();
      });
      opts.append(b);
    });
    qbox.append(top, line, opts, fb);
  }
  if (qbox) drawQuiz();
})();

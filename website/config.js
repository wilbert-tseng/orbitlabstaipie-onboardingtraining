// ===== OrbitLabs onboarding — settings =====
// Paste the two values from Supabase → Project Settings → API.
// (The anon/publishable key is designed to be public; the database rules protect the data.)
window.OB_CONFIG = {
  SUPABASE_URL: 'https://legdxecjhdlmrnqdcybq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_WLn75pmhIrz4RfA4KEb0GA_PXlyhxTO',
  EMAIL_DOMAIN: 'orbitlabs.global',

  // Deck structure (slide numbers start at 0). Used by the dashboard.
  TOTAL_SLIDES: 130,
  CHAPTERS: [
    { id: 'ch1', name: '公司介紹',         from: 2,   to: 29,  quiz: 'ch1' },
    { id: 'ch2', name: '差價合約入門',     from: 30,  to: 53,  quiz: 'ch2' },
    { id: 'ch3', name: '客戶後台與交易平台', from: 54,  to: 84,  quiz: 'ch3' },
    { id: 'ch4', name: '客戶服務與支持流程', from: 85,  to: 104, quiz: 'ch4' },
    { id: 'ch5', name: '案例分享及錯誤避雷', from: 105, to: 124, quiz: null }
  ],
  QUIZ_MAX: 10
};

// ===== Shared-password login =====
// Any @orbitlabs.global email + this password can sign in. The first sign-in
// creates that person's account automatically, so each person still gets their
// own progress record. Accounts with their own password (e.g. admins) are unaffected.
window.OB_SHARED_PASSWORD = 'Pass1234';

document.addEventListener('submit', async function (e) {
  if (!e.target || e.target.id !== 'gateF') return;
  var C = window.OB_CONFIG, sb = window.OB_SB;
  var email = document.getElementById('gateE').value.trim().toLowerCase();
  var pw = document.getElementById('gateP').value;
  var domainOk = new RegExp('^[^\\s@]+@' + C.EMAIL_DOMAIN.replace(/\./g, '\\.') + '$').test(email);
  // Anything other than "company email + shared password" uses the normal login.
  if (!sb || pw !== window.OB_SHARED_PASSWORD || !domainOk) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  var err = document.getElementById('gateErr');
  var btn = document.querySelector('#gateF button');
  var done = function (msg) { err.textContent = msg; if (btn) btn.disabled = false; };
  err.textContent = '登入中…'; if (btn) btn.disabled = true;

  try {
    var r = await sb.auth.signInWithPassword({ email: email, password: pw });
    if (r.error && /invalid/i.test(r.error.message)) {
      // First visit: create this person's account with the shared password.
      var s = await sb.auth.signUp({ email: email, password: pw });
      if (s.error) {
        return done(/already/i.test(s.error.message)
          ? '信箱或密碼不正確（注意大小寫）。'
          : '無法建立帳號，請聯繫你的 Team Lead。');
      }
      r = s.data.session ? { data: s.data } : await sb.auth.signInWithPassword({ email: email, password: pw });
    }
    if (r.error) {
      return done(/fetch|network/i.test(r.error.message) ? '網路連線失敗，請檢查網路後再試。' : '信箱或密碼不正確（注意大小寫）。');
    }
    location.reload(); // the page opens straight into the deck with the new session
  } catch (x) {
    done('網路連線失敗，請檢查網路後再試。');
  }
}, true);

// ===== Progress tracker (v2) =====
// The server is the source of truth. The deck's saved state in this browser
// (visited slides, current slide, quiz scores) always belongs to the signed-in person.
(function () {
  var C = window.OB_CONFIG;
  var REF = (C.SUPABASE_URL.match(/^https:\/\/([^.]+)\./) || [])[1];
  var SESSION_KEY = 'sb-' + REF + '-auth-token';
  var VISITED = 'onboarding-visited', SLIDE = 'onboarding-deck-slide', OWNER = 'ob-owner';
  var QK = function (n) { return 'onboarding-quiz-ch' + n; };

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function clearDeck() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('onboarding-') === 0) localStorage.removeItem(k); }); } catch (e) {}
  }
  function sessionUserId() {
    var raw = get(SESSION_KEY); if (!raw) return null;
    try { if (raw.indexOf('base64-') === 0) raw = atob(raw.slice(7)); var s = JSON.parse(raw); return (s && s.user && s.user.id) || null; }
    catch (e) { return null; }
  }
  function localVisited() { try { var v = JSON.parse(get(VISITED) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function uniqSorted(a) { var o = {}; a.forEach(function (x) { if (typeof x === 'number') o[x] = 1; }); return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); }
  function same(a, b) { return JSON.stringify(uniqSorted(a)) === JSON.stringify(uniqSorted(b)); }

  // 1) Runs before the deck loads: never let the deck start with someone else's progress.
  var uid = sessionUserId();
  if (!uid || get(OWNER) !== uid) { clearDeck(); del(OWNER); }

  var user = null, row = null, ready = false, timer = null;

  function save() {
    if (!ready || !row || !window.OB_SB) return Promise.resolve();
    clearTimeout(timer);
    row.last_active = new Date().toISOString();
    return window.OB_SB.from('progress').upsert(JSON.parse(JSON.stringify(row))).then(function (r) {
      if (r && r.error) console.warn('progress save failed', r.error.message);
    }, function (e) { console.warn('progress save failed', e); });
  }
  function later() { clearTimeout(timer); timer = setTimeout(save, 1500); }

  // 2) After sign-in: load this person's progress from the server and show it.
  async function start(u) {
    if (!u || (user && user.id === u.id)) return;
    user = u;
    var mine = get(OWNER) === u.id;          // this browser's saved state already belongs to them
    var server = null;
    try {
      var r = await window.OB_SB.from('progress').select('*').eq('user_id', u.id).maybeSingle();
      server = (r && r.data) || null;
    } catch (e) {}

    // Where to open: same browser -> where they left off here; otherwise -> last slide saved on the server; first time -> opening slide.
    var localSlide = mine ? parseInt(get(SLIDE), 10) : NaN;
    var slide = !isNaN(localSlide) ? localSlide : (server ? server.current_slide || 0 : 0);
    var visited = uniqSorted((mine ? localVisited() : []).concat(server ? server.visited || [] : []).concat([slide]));
    var quiz = server && server.quiz ? server.quiz : {};
    if (mine) for (var n = 1; n <= 4; n++) {
      var lv = parseInt(get(QK(n)), 10);
      if (!isNaN(lv) && !quiz['ch' + n]) quiz['ch' + n] = { last: lv, best: lv, attempts: 1, at: new Date().toISOString() };
    }

    // Bring the deck's saved state in line; reload once if what's on screen is out of date.
    var changed = !same(localVisited(), visited) || String(slide) !== get(SLIDE);
    set(VISITED, JSON.stringify(visited));
    set(SLIDE, String(slide));
    for (var q = 1; q <= 4; q++) {
      var want = quiz['ch' + q] ? String(quiz['ch' + q].last) : null;
      if (want !== get(QK(q))) { changed = true; if (want === null) del(QK(q)); else set(QK(q), want); }
    }
    set(OWNER, u.id);

    row = {
      user_id: u.id,
      email: u.email,
      current_slide: slide,
      max_slide: Math.max(server ? server.max_slide || 0 : 0, visited[visited.length - 1] || 0),
      visited: visited,
      quiz: quiz
    };
    if (server && server.started_at) row.started_at = server.started_at;
    ready = true;
    await save();

    var guard = 'ob-sync-' + u.id;
    if (changed && !sessionStorage.getItem(guard)) { sessionStorage.setItem(guard, '1'); location.reload(); }
  }

  document.addEventListener('deck:change', function (e) {
    if (!ready) return;
    var i = e.detail;
    row.current_slide = i;
    row.max_slide = Math.max(row.max_slide, i);
    if (row.visited.indexOf(i) === -1) { row.visited.push(i); row.visited.sort(function (a, b) { return a - b; }); }
    later();
  });
  document.addEventListener('quiz:score', function (e) {
    if (!ready || !e.detail || !e.detail.ch) return;
    var k = 'ch' + e.detail.ch, sc = e.detail.score, prev = row.quiz[k] || { best: 0, attempts: 0 };
    row.quiz[k] = { last: sc, best: Math.max(prev.best || 0, sc), attempts: (prev.attempts || 0) + 1, at: new Date().toISOString() };
    save();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('online', function () { save(); });

  // 3) Sign-out: save, sign out, wipe this browser's deck state, start fresh.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('#obOut')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    save().then(function () { return window.OB_SB ? window.OB_SB.auth.signOut() : null; })
      .catch(function () {})
      .then(function () { clearDeck(); del(OWNER); try { sessionStorage.clear(); } catch (x) {} location.reload(); });
  }, true);

  // Replaces the older tracker built into index.html (which then stays inactive).
  var api = { start: function (u) { start(u); }, flush: save };
  Object.defineProperty(window, 'OB_TRACK', { configurable: false, get: function () { return api; }, set: function () {} });
})();

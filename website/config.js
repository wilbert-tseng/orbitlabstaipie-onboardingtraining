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

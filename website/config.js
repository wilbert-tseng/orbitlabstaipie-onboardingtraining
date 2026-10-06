// ===== OrbitLabs onboarding — settings =====
// Paste the two values from Supabase → Project Settings → API.
// (The anon/publishable key is designed to be public; the database rules protect the data.)
window.OB_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
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

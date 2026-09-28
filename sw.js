/* ═══════════════════════════════════════════════════════════════════════════
   sw.js — عامل الخدمة (PWA)  ·  2026-08-26
   ─────────────────────────────────────────────────────────────────────────
   قرار المالك (2026-08-22): «رح أحوّله لتطبيق، وأي حدا بيفتحه بالبداية بتنزل
   عنده كل البيانات والصور — كرمال نخفّف الضغط على قاعدة البيانات، ويصير فقط تزامن».

   تقسيم المسؤوليات (مهم — لا تخلطها):
     • هذا الملف  ⇐ **الصفحات والمكتبات والخطوط** فقط (قشرة التطبيق).
     • GMTCache    ⇐ بيانات القاعدة والصور (IndexedDB).
     • GMTSync     ⇐ طابور الكتابة بلا إنترنت.
     • GMTWarmup   ⇐ التنزيل الأوّلي الكامل مرّة واحدة.

   🔒 قاعدة صارمة: **بيانات Supabase لا تُخزَّن هنا إطلاقاً** — دائماً من الشبكة.
      (تخزينها يعني عرض أرقام مالية قديمة، وهو أخطر من عدم العمل بلا إنترنت.)

   ⚠️ شرط المالك الإلزامي: تحديث مربوط بالإصدار + زر «تحديث الآن» —
      تفادياً لتكرار شكوى «الإصلاحات لا تعمل» (نمط P12).
      ⇒ غيّر VERSION في كل نشر، وسيُعرض إشعار تحديث تلقائياً.
   ═══════════════════════════════════════════════════════════════════════════ */

const VERSION = 'gmt-v20260826';       // ⬅️ غيّره في كل نشر
const SHELL   = VERSION + '-shell';
const LIBS    = VERSION + '-libs';

/* الصفحات — تُخزَّن عند أول زيارة (لا نفرضها مسبقاً كي لا يثقل التثبيت) */
const CORE = [
  './', './home.html', './index.html',
  './gmt-theme.css', './style.css', './lib/tailwind.css',
  './gmt-config.js', './gmt-core.js', './gmt-staff.js', './gmt-sync.js',
  './gmt-image-guard.js', './gmt-warmup.js', './gmt-hints.js',
];

/* المكتبات صارت **مستضافة ذاتياً** في lib/ (2026-08-26) ⇒ تُخزَّن كملفات موقع عادية.
   يبقى مضيفو الخطوط فقط خارجيين. */
const LIB_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // addAll يفشل كلّياً لو سقط ملف ⇒ نخزّن كلاً على حدة
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* رسالة من الصفحة: «حدّث الآن» */
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting' || (e.data && e.data.type === 'skipWaiting')) self.skipWaiting();
});

function isLib(url) { return LIB_HOSTS.includes(url.hostname); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // الكتابة لا تُعترض أبداً
  const url = new URL(req.url);

  /* 🔒 بيانات القاعدة والتخزين والإشعارات: شبكة فقط — لا كاش إطلاقاً */
  if (/supabase\.co$/.test(url.hostname) || /api\.telegram\.org$/.test(url.hostname) || /jsonbin/.test(url.hostname)) return;

  /* المكتبات والخطوط: من الكاش أولاً (لا تتغيّر — مثبّتة الإصدار) */
  if (isLib(url)) {
    e.respondWith((async () => {
      const c = await caches.open(LIBS);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
    return;
  }

  /* ملفات الموقع نفسه: الشبكة أولاً (كي تصل الإصلاحات فوراً) ثم الكاش عند الانقطاع */
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      try {
        const res = await fetch(req);
        if (res && res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req) || await c.match(new URL('./home.html', location).href);
        if (hit) return hit;
        return new Response(
          '<!DOCTYPE html><html dir="rtl"><meta charset="utf-8">' +
          '<body style="font-family:Tahoma,sans-serif;text-align:center;padding:40px">' +
          '<h2>لا يوجد اتصال</h2><p>هذه الصفحة لم تُفتح من قبل، فلم تُحفظ على جهازك.</p>' +
          '<p style="color:#888;font-size:13px">افتحها مرّة واحدة وأنت متصل لتعمل لاحقاً بلا إنترنت.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
        );
      }
    })());
  }
});

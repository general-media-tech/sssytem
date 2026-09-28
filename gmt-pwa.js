/* ═══════════════════════════════════════════════════════════════════════════
   gmt-pwa.js — تسجيل عامل الخدمة + إشعار التحديث  ·  2026-08-26
   ─────────────────────────────────────────────────────────────────────────
   شرط المالك الإلزامي: «تحديث فوري مربوط بالإصدار + زر تحديث الآن» —
   تفادياً لتكرار شكوى «الإصلاحات لا تعمل» (نمط P12: المتصفّح يخدم نسخة قديمة).

   كيف يعمل: عند نشر نسخة جديدة (بتغيير VERSION في sw.js) يكتشف المتصفّح
   عاملاً منتظراً ⇒ يظهر شريط «تتوفّر نسخة جديدة» مع زر يطبّقها فوراً.
   لا تحديث صامت: المستخدم يقرّر، فلا يفقد عملاً غير محفوظ.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;            // لا يعمل محلياً بلا خادم

  function banner(onUpdate) {
    if (document.getElementById('gmt-pwa-bar')) return;
    var b = document.createElement('div');
    b.id = 'gmt-pwa-bar';
    b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483600;background:#0f172a;' +
      'color:#fff;padding:11px 16px;display:flex;align-items:center;justify-content:center;gap:12px;' +
      'font-family:Cairo,Tahoma,sans-serif;font-size:13px;font-weight:700;direction:rtl;' +
      'box-shadow:0 -4px 18px rgba(0,0,0,.25)';
    b.innerHTML =
      '<span>🔄 تتوفّر نسخة جديدة من النظام</span>' +
      '<button id="gmt-pwa-go" style="background:#D5001C;border:0;color:#fff;border-radius:9px;' +
      'padding:7px 16px;font-weight:900;font-size:12.5px;cursor:pointer;font-family:inherit">تحديث الآن</button>' +
      '<button id="gmt-pwa-no" style="background:transparent;border:0;color:#fff;opacity:.6;' +
      'font-size:12px;cursor:pointer;font-family:inherit">لاحقاً</button>';
    document.body.appendChild(b);
    b.querySelector('#gmt-pwa-go').onclick = onUpdate;
    b.querySelector('#gmt-pwa-no').onclick = function () { b.remove(); };
  }

  navigator.serviceWorker.register('sw.js').then(function (reg) {
    // عامل منتظر بالفعل ⇒ نسخة جديدة جاهزة
    if (reg.waiting) banner(function () { reg.waiting.postMessage('skipWaiting'); });

    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        // مثبَّت + يوجد عامل مسيطر ⇒ هذا تحديث لا تثبيت أول
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          banner(function () { nw.postMessage('skipWaiting'); });
        }
      });
    });

    // افحص التحديث عند كل عودة للصفحة
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) reg.update().catch(function () {});
    });
  }).catch(function (e) {
    console.warn('[GMT] تعذّر تسجيل عامل الخدمة:', e && e.message);
  });

  // بعد تفعيل العامل الجديد: أعد التحميل مرّة واحدة فقط
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
})();

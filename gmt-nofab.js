/* ═══════════════════════════════════════════════════════════════════════════
   gmt-nofab.js — لا أزرار عائمة  ·  2026-09-26
   ───────────────────────────────────────────────────────────────────────────
   طلب المالك (مكرَّر ثلاث مرّات): «وأزل أي أزرار عائمة — أهمّ شيء».

   لماذا حارس دائم لا فحص لحظي؟
     الأزرار العائمة تأتي من سكربتات مشتركة تُحمَّل في كل الصفحات، وبعضها يزرع زرّه
     **بعد** ثوانٍ من التحميل (الجولة · التلميحات · العقل · تقرير الصحة). فحصٌ عند
     DOMContentLoaded لا يراها إطلاقاً — ولهذا أبلغ المالك مرّتين عن زرّ «بقي عائماً»
     رغم أنه أُزيل من المصدر. الحلّ: مراقب DOM + مسحات مجدولة.

   المبدأ: **لا تُحذف الوظيفة، يُحذف الزرّ العائم فقط.** كل ما يخفيه هذا الملف له
   مدخل بديل في الشريط العلوي أو قائمة «المزيد» في الصفحة نفسها.

   الاستعمال:  <script src="gmt-nofab.js"></script>   (بعد باقي السكربتات)
   الاستثناء: عنصر تريد إبقاءه ⇒ أضف له السمة  data-keep-fab="1"
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;

  /* عناصرنا التي لا تُمَسّ: الإشعارات والنوافذ الحوارية وأشرطة الإجراءات */
  var KEEP_IDS = [
    'toast-wrap', 'waNotice', 'attachBar', 'officesPanel', 'receiptViewer',
    'helpMenu', 'addModal', 'pdfCatModal', 'gmt-toast', 'toastBox'
  ];

  function keep(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.hasAttribute && el.hasAttribute('data-keep-fab')) return true;
    if (KEEP_IDS.indexOf(el.id) !== -1) return true;
    try { if (el.closest('[data-keep-fab]')) return true; } catch (_) {}
    return false;
  }

  /* زرّ عائم = عنصر ثابت صغير قرب حافة الشاشة السفلى، قابل للضغط */
  function isFloatingFab(el) {
    if (keep(el)) return false;
    var cs;
    try { cs = global.getComputedStyle(el); } catch (_) { return false; }
    if (!cs || cs.position !== 'fixed') return false;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.pointerEvents === 'none') return false;          // طبقات عرض فقط
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (r.width > 260 || r.height > 260) return false;      // نافذة حوارية ⇒ ليست زرّاً
    var nearBottom = (global.innerHeight - r.bottom) < 140;
    if (!nearBottom) return false;
    var isBtn = el.tagName === 'BUTTON' || el.tagName === 'A' ||
                /fab|float/i.test(el.className || '') ||
                !!el.querySelector('button,a,svg');
    return isBtn;
  }

  var hidden = 0;
  function sweep() {
    try {
      var kids = doc.body && doc.body.children;
      if (!kids) return;
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el.getAttribute('data-gmt-fab-killed')) continue;
        if (isFloatingFab(el)) {
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('data-gmt-fab-killed', '1');
          hidden++;
        }
      }
    } catch (_) {}
  }

  function start() {
    sweep();
    try { new global.MutationObserver(sweep).observe(doc.body, { childList: true }); } catch (_) {}
    [200, 700, 1500, 3000, 6000, 10000].forEach(function (ms) { global.setTimeout(sweep, ms); });
  }

  global.GMTNoFab = {
    sweep: sweep,
    count: function () { return hidden; },
    /* لإعادة إظهار زرّ بعينه عند الحاجة (تشخيص) */
    restore: function (id) {
      var el = doc.getElementById(id);
      if (el) { el.style.removeProperty('display'); el.removeAttribute('data-gmt-fab-killed'); }
    }
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : this);

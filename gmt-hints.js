/* ══════════════════════════════════════════════════════════════════════════
   🔴 حرس السطح — لا واجهة داخلية على صفحة زبون (2026-09-26 · بلاغ المالك)
   ─────────────────────────────────────────────────────────────────────────
   «الأزرار العائمة تبعات التصليح وتبعات الأخطاء ما تطلع لصفحات الزبون أبداً».
   يُعرَّف على window لا داخل IIFE: هذا الملفّ فيه أكثر من نطاق مغلق، ووضع
   الحرس داخل أوّلها جعله غير معروف في البقيّة (ReferenceError حقيقي ظهر في
   الاختبار). المنع افتراضياً: الصفحة الداخلية تُعلن نفسها، والعامّة لا تتذكّر شيئاً.
   ══════════════════════════════════════════════════════════════════════════ */
window.gmtInternalUI = window.gmtInternalUI || function (who) {
  try { if (window.GMT_SURFACE) return window.GMT_SURFACE.guard(who); } catch (e) {}
  if (window.GMT_PUBLIC === true || window.GMT_PUBLIC === 1) return false;
  return window.GMT_INTERNAL === true || window.GMT_INTERNAL === 1;
};

/* ═══════════════════════════════════════════════════════════════════════════
   gmt-hints.js — شرح الأزرار بالتأشير على الزر نفسه  ·  2026-08-26
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك (بلاغ B8 · 2026-08-23):
     «أريد شرح كل زر يؤشّر على الزر نفسه لا بطاقات متنقّلة».

   ما يفعله:
     ① تلميح فوري: أي عنصر يحمل data-hint يُظهر شرحه عند المرور (أو اللمس
        المطوّل على الجوال) في فقاعة **ملتصقة بالعنصر** وسهمها يشير إليه.
     ② جولة «شو هالزر؟»: تمشي على أزرار الصفحة واحداً واحداً، تُضيء الزر
        الحقيقي بثقب ضوئي (spotlight) وتثبّت الفقاعة عليه — لا بطاقة تطير
        في منتصف الشاشة.

   بلا اعتماديات · لا يلمس منطق الصفحة · يُلغى بالضغط على Esc أو خارج الفقاعة.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.GMTHints) return;

  var Z = 2147483000;
  var bubble = null, spot = null, tourIdx = -1, tourList = [], inTour = false;

  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = el('div', 'position:fixed;z-index:' + (Z + 2) + ';max-width:300px;background:#0f172a;' +
      'color:#fff;border-radius:12px;padding:11px 14px;font-size:13px;line-height:1.75;' +
      'font-family:inherit;direction:rtl;text-align:right;box-shadow:0 10px 30px rgba(0,0,0,.35);' +
      'opacity:0;transition:opacity .15s;pointer-events:none;font-weight:600;');
    var arrow = el('div', 'position:absolute;width:12px;height:12px;background:#0f172a;transform:rotate(45deg);');
    arrow.setAttribute('data-arrow', '1');
    bubble.appendChild(arrow);
    document.body.appendChild(bubble);
    return bubble;
  }

  /* يضع الفقاعة ملتصقة بالعنصر، وسهمها يشير إليه فعلياً */
  function place(target, text, withTourUI) {
    var b = ensureBubble();
    var arrow = b.querySelector('[data-arrow]');
    b.querySelectorAll('[data-body]').forEach(function (n) { n.remove(); });
    var body = el('div', '', text);
    body.setAttribute('data-body', '1');
    b.appendChild(body);

    if (withTourUI) {
      var bar = el('div', 'display:flex;gap:8px;align-items:center;justify-content:space-between;' +
        'margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.15);pointer-events:auto;');
      bar.setAttribute('data-body', '1');
      bar.innerHTML =
        '<span style="font-size:11px;opacity:.7;font-weight:700">' + (tourIdx + 1) + ' / ' + tourList.length + '</span>' +
        '<span style="display:flex;gap:6px">' +
        '<button data-h="prev" style="background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:8px;padding:5px 11px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit">السابق</button>' +
        '<button data-h="next" style="background:#D5001C;border:0;color:#fff;border-radius:8px;padding:5px 13px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit">' +
        (tourIdx >= tourList.length - 1 ? 'إنهاء' : 'التالي') + '</button>' +
        '<button data-h="end" style="background:transparent;border:0;color:#fff;opacity:.6;border-radius:8px;padding:5px 8px;font-size:14px;cursor:pointer;font-family:inherit">✕</button>' +
        '</span>';
      b.appendChild(bar);
      bar.querySelector('[data-h="next"]').onclick = function () { step(1); };
      bar.querySelector('[data-h="prev"]').onclick = function () { step(-1); };
      bar.querySelector('[data-h="end"]').onclick = endTour;
      b.style.pointerEvents = 'auto';
    } else {
      b.style.pointerEvents = 'none';
    }

    b.style.opacity = '0';
    b.style.left = '-9999px';
    // قياس بعد الرسم
    requestAnimationFrame(function () {
      var r = target.getBoundingClientRect();
      var bw = b.offsetWidth, bh = b.offsetHeight;
      var gap = 12;
      var below = r.bottom + gap + bh < innerHeight || r.top - gap - bh < 0;
      var top = below ? r.bottom + gap : r.top - gap - bh;
      var left = r.left + r.width / 2 - bw / 2;
      left = Math.max(8, Math.min(left, innerWidth - bw - 8));
      b.style.top = Math.max(8, top) + 'px';
      b.style.left = left + 'px';
      // السهم يشير لمركز العنصر
      var ax = Math.max(10, Math.min(r.left + r.width / 2 - left - 6, bw - 22));
      arrow.style.left = ax + 'px';
      arrow.style.top = below ? '-6px' : (bh - 6) + 'px';
      b.style.opacity = '1';
    });
  }

  function hide() {
    if (bubble) { bubble.style.opacity = '0'; bubble.style.pointerEvents = 'none'; }
  }

  /* ثقب ضوئي حول العنصر الحقيقي */
  function spotlight(target) {
    if (!spot) {
      spot = el('div', 'position:fixed;inset:0;z-index:' + Z + ';pointer-events:none;transition:box-shadow .2s');
      document.body.appendChild(spot);
    }
    var r = target.getBoundingClientRect();
    var pad = 6;
    spot.style.cssText = 'position:fixed;z-index:' + Z + ';pointer-events:none;transition:all .22s;' +
      'border-radius:12px;border:2px solid #D5001C;' +
      'box-shadow:0 0 0 9999px rgba(15,23,42,.62);' +
      'top:' + (r.top - pad) + 'px;left:' + (r.left - pad) + 'px;' +
      'width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px;';
  }
  function clearSpot() { if (spot) { spot.remove(); spot = null; } }

  /* ── نصّ الشرح: من data-hint، وإلا من title، وإلا من نصّ الزر ── */
  function hintOf(node) {
    return (node.getAttribute('data-hint') || node.getAttribute('title') || '').trim();
  }

  /* ① التلميح الفوري */
  function onEnter(e) {
    if (inTour) return;
    var n = e.target.closest('[data-hint],[title]');
    if (!n) return;
    var t = hintOf(n);
    if (!t) return;
    // امنع تلميح المتصفّح المزدوج
    if (n.hasAttribute('title')) { n.setAttribute('data-hint', t); n.removeAttribute('title'); }
    place(n, t, false);
  }
  function onLeave(e) { if (!inTour && e.target.closest && e.target.closest('[data-hint]')) hide(); }

  /* ② الجولة على الأزرار الحقيقية */
  function collect() {
    var out = [];
    document.querySelectorAll('[data-hint]').forEach(function (n) {
      var r = n.getBoundingClientRect();
      var vis = r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden';
      if (vis && hintOf(n)) out.push(n);
    });
    // ترتيب بصري: الأعلى ثم الأيمن (واجهة RTL)
    out.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (Math.round(ra.top / 40) - Math.round(rb.top / 40)) || (rb.left - ra.left);
    });
    return out;
  }

  function show(i) {
    var n = tourList[i];
    if (!n) return endTour();
    tourIdx = i;
    try { n.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    setTimeout(function () { spotlight(n); place(n, hintOf(n), true); }, 220);
  }
  function step(d) {
    var next = tourIdx + d;
    if (next < 0) return;
    if (next >= tourList.length) return endTour();
    show(next);
  }
  function startTour() {
    tourList = collect();
    if (!tourList.length) {
      alert('لا توجد أزرار مشروحة في هذه الصفحة بعد.\nتُشرح بإضافة data-hint="..." على الزر.');
      return;
    }
    inTour = true;
    show(0);
  }
  function endTour() {
    inTour = false; tourIdx = -1;
    clearSpot(); hide();
  }

  /* زر عائم لبدء الجولة */
  function mountButton() {
    if (!gmtInternalUI('hints')) return;               // زر «شو هالزر؟» للموظّف لا للزبون
    /* (2026-08-26 · طلب المالك) الصفحة التي توفّر مدخلاً خاصاً للمساعدة (زر «❔ المساعدة»)
       لا تحتاج زراً عائماً إضافياً — دُمج الثلاثة في قائمة واحدة أعلى الصفحة. */
    if (typeof window.openHelpMenu === 'function') return;
    if (document.getElementById('gmt-hints-fab')) return;
    if (!document.querySelector('[data-hint],[title]')) return;   // لا شرح ⇒ لا زر
    var b = el('button', 'position:fixed;bottom:18px;inset-inline-start:18px;z-index:' + (Z - 5) + ';' +
      'background:#0f172a;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-size:12.5px;' +
      'font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);font-family:inherit;direction:rtl;',
      '❔ شو هالزر؟');
    b.id = 'gmt-hints-fab';
    b.onclick = startTour;
    document.body.appendChild(b);
  }

  document.addEventListener('mouseover', onEnter, true);
  document.addEventListener('mouseout', onLeave, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') endTour(); });
  addEventListener('resize', function () { if (inTour) show(tourIdx); else hide(); });
  addEventListener('scroll', function () { if (!inTour) hide(); }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButton);
  else mountButton();

  global.GMTHints = {
    tour: startTour,
    end: endTour,
    show: function (sel, text) {
      var n = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (n) place(n, text || hintOf(n), false);
    },
    count: function () { return collect().length; },
    mount: mountButton
  };
})(window);

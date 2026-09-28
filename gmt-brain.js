/* ═══════════════════════════════════════════════════════════════════════════
   gmt-brain.js — 🧠 عقل النظام (مساعد ذكي داخلي)  ·  2026-08-26
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك:
     «بوت داخلي للموظفين والأدمن — ليس للزبائن. يرتبط بتقارير الأخطاء ويفهمها:
      شو يعني هذا الخطأ؟ هل هو خطير؟ شو تأثيره؟ وإذا نسيت كيف أعمل خطوة أو
      عندي موظف جديد يسأله كيف. ويقترح تطويرات. يكون العقل المدبّر للنظام».

   من أين يعرف؟ **لا معرفة مخترعة** — يجمع سياقه من النظام نفسه:
     • `GMT_OWNER_RULES` (19 قاعدة) — كل قاعدة وُلدت من عطل حقيقي.
     • `GMT_GUIDE_*` — دليل الصفحة الحالية زرّاً بزرّ.
     • `GMTWarden.report()` · `GMTMoneyGuard.incidents()` — البلاغات الحيّة.
     • `GMTSelfCheck` — نتائج الفحص الذاتي (أصول · جداول · دوال · هوية).
     • أخطاء الكونسول الملتقطة في هذه الجلسة.

   🔒 الأمان:
     • **داخلي فقط** — لا يُحمَّل في صفحات الزبون (store · site · search · track_order).
     • **قراءة فقط** — لا يعدّل بيانات ولا ينفّذ إصلاحات. يشرح ويقترح، والتنفيذ بيدك.
       (قرار مقصود: نظام مالي — لا يُترك لبوت أن يغيّر أرقاماً.)
     • **المفتاح لا يُوضع في الكود** — يُنادى عبر وسيط (Edge Function). انظر
       `_تفعيل_عقل_النظام.md` لخطوات التفعيل.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.GMTBrain) return;

  /* صفحات الزبون — لا يُحمَّل فيها إطلاقاً */
  var CUSTOMER_PAGES = ['store.html', 'site.html', 'search.html', 'track_order.html', 'hiring.html'];
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (CUSTOMER_PAGES.indexOf(page) !== -1) return;

  var CFG_KEY = 'gmt_brain_endpoint';
  var HIST = [];
  var errLog = [];

  /* التقاط أخطاء الجلسة — مادة خام لتفسيرها لاحقاً */
  (function captureErrors() {
    var oe = console.error;
    console.error = function () {
      try { errLog.push(Array.prototype.slice.call(arguments).map(String).join(' ').slice(0, 300)); if (errLog.length > 40) errLog.shift(); } catch (_) {}
      return oe.apply(console, arguments);
    };
    addEventListener('error', function (e) {
      errLog.push('[JS] ' + (e.message || '') + ' @ ' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''));
      if (errLog.length > 40) errLog.shift();
    });
    addEventListener('unhandledrejection', function (e) {
      errLog.push('[Promise] ' + String((e.reason && e.reason.message) || e.reason).slice(0, 200));
      if (errLog.length > 40) errLog.shift();
    });
  })();

  /* ── جمع سياق النظام (من النظام نفسه لا من الذاكرة) ── */
  function collectContext() {
    var ctx = { page: page, when: new Date().toLocaleString('ar-SY') };
    try {
      var R = global.GMT_OWNER_RULES;
      if (Array.isArray(R)) ctx.rules = R.map(function (r) {
        return r.id + ' [' + r.severity + ']: ' + r.rule + ' — سببها: ' + r.why;
      });
    } catch (_) {}
    try {
      for (var k in global) {
        if (k.indexOf('GMT_GUIDE_') === 0 && global[k] && global[k].page) {
          var g = global[k];
          ctx.guide = { page: g.page, slides: (g.slides || []).map(function (s) {
            return (s.title || '') + ': ' + (s.body || '') +
              ((s.bullets || []).map(function (b) { return ' • ' + String(b.t || '').replace(/<[^>]+>/g, ''); }).join(''));
          }).slice(0, 12) };
          break;
        }
      }
    } catch (_) {}
    try { if (global.GMTWarden && GMTWarden.report) ctx.warden = String(GMTWarden.report()).slice(0, 2500); } catch (_) {}
    /* (2026-08-26) معرفة الميزات الجديدة — تُرفق دائماً. كان العقل يستقي فقط من دليل
       الصفحة، فلا يعرف الميزات المضافة لاحقاً (الطباعة الجماعية · التقفيل · سجل المبيعات…). */
    try {
      // مكاتب شركات الشحن — ليجيب العقل «وين مكتب المفتي بحماة؟» من بياناتك
      if (global.GMTOffices) {
        ctx.shippingOffices = GMTOffices.all().map(function (o) {
          return o.company + ' · ' + o.city + ' — ' + o.name + ': ' + o.addr + (o.phone ? ' ☎ ' + o.phone : '');
        });
        /* (2026-09-26) أي شركة مفعّل لها التتبّع الإلكتروني — كان العقل يعرف المكاتب
           ولا يعرف «مين فيه تتبّع»، فيجاوب من معرفته العامة بدل بياناتنا. */
        if (GMTOffices.trackUrlOf) {
          ctx.shippingTracking = GMTOffices.companies().map(function (c) {
            var u = GMTOffices.trackUrlOf(c);
            return c + ': ' + (u ? 'التتبّع مفعّل — ' + u : 'لا يوجد تتبّع إلكتروني بعد');
          });
        }
      }
      var U = global.GMT_GUIDE_UPDATES;
      if (U && Array.isArray(U.slides)) ctx.newFeatures = U.slides.map(function (s) {
        return s.title + ' [' + (s.page || '') + ']: ' + (s.body || '') +
          (s.bullets || []).map(function (b) { return ' • ' + (b.t || ''); }).join('');
      });
    } catch (_) {}
    try { if (global.GMTMoneyGuard && GMTMoneyGuard.incidents) ctx.money = JSON.stringify(GMTMoneyGuard.incidents()).slice(0, 1500); } catch (_) {}
    if (errLog.length) ctx.errors = errLog.slice(-15);
    return ctx;
  }

  /* ── ② طبقة البيانات الحيّة: يقرأ من قواعدك حسب السؤال (قراءة فقط) ──
     الهدف: لا يجيب كلود من معرفته العامة، بل من **بياناتك أنت**.
     يُستخرج من السؤال ما يلزم فقط — لا تُرسل القاعدة كاملة (خصوصية وتكلفة). */
  /* 🔧 (2026-08-26) الاسم الصحيح للإعداد هو window.GMT_DB (تحقّقت من gmt-config.js:70).
     كان يُقرأ GMT_CONFIG.DATABASES وهو غير موجود ⇒ كل قراءة بيانات كانت تفشل بصمت. */
  function db(name) {
    var C = global.GMT_CONFIG || {};
    var d = (global.GMT_DB && global.GMT_DB[name]) || (C.DATABASES && C.DATABASES[name]) || null;
    if (!d && name === 'MAIN' && global.SUPABASE_URL && global.SUPABASE_KEY) {
      d = { url: global.SUPABASE_URL, key: global.SUPABASE_KEY };   // احتياطي
    }
    return (d && d.url && d.key) ? d : null;
  }
  async function q(dbName, path) {
    var d = db(dbName); if (!d) return null;
    try {
      var r = await fetch(d.url + '/rest/v1/' + path,
        { headers: { apikey: d.key, Authorization: 'Bearer ' + d.key } });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }
  /* يستخرج مصطلح البحث من السؤال (يتجاهل كلمات الاستفهام الشائعة) */
  function searchTerm(question) {
    var stop = ['كم','شو','وين','كيف','ليش','هل','في','من','على','عن','باقي','عندي','عنا','الـ','ال','بدي','اعطيني','أعطيني','كام','متى','الطلب','الاوردر','الأوردر','المنتج','القطعة','رقم'];
    return String(question).replace(/[؟?,.!]/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length >= 3 && stop.indexOf(w) === -1; })
      .slice(0, 3);
  }
  async function collectLiveData(question) {
    var out = {}, qs = String(question);
    var terms = searchTerm(qs);
    var wantStock = /كمي|مخزون|باقي|متوفر|رصيد|قطعة|جرد|كام واحد/.test(qs);
    var wantOrder = /اوردر|أوردر|طلب|شحن|تتبع|زبون|تحصيل/.test(qs);
    var wantMoney = /صندوق|محصّل|محصل|مبيعات|تقفيل|عجز|مصروف|عمولة/.test(qs);
    /* نيّة الترشيح لزبون: يسأل بالمواصفات لا بالاسم («بدي راس إضاءة 100 وات») */
    var wantAdvise = /رشح|رشّح|اقترح|زبون بدو|زبون بيدور|بدو|شو عندنا|شو في عندي|شو الخيارات|بديل|مناسب|وات|w\b|انش|إنش|mm|ملم|ميجا|ma?h\b|بطارية|عدسة|اضاءة|إضاءة|حامل|مايك|ترايبود/i.test(qs);

    if (wantAdvise) {
      /* ابحث بالمواصفات عبر الاسم والوصف — المتجر يحمل الوصف التفصيلي */
      var found = [], seen = {};
      for (var a = 0; a < terms.length; a++) {
        var enc = encodeURIComponent(terms[a]);
        var st = await q('STORE', 'products?or=(name.ilike.*' + enc + '*,short_name.ilike.*' + enc +
          '*,description.ilike.*' + enc + '*)&select=name,short_name,description,price,barcode,inv_id&limit=10');
        (st || []).forEach(function (p) {
          var k = p.barcode || p.name;
          if (!seen[k]) { seen[k] = 1; found.push(p); }
        });
        var mn = await q('MAIN', 'products?or=(name.ilike.*' + enc + '*,barcode.ilike.*' + enc +
          '*)&select=name,barcode,price,wholesale_price&limit=10');
        (mn || []).forEach(function (p) {
          var k = p.barcode || p.name;
          if (!seen[k]) { seen[k] = 1; found.push(p); }
        });
      }
      if (found.length) out.catalogMatches = found.slice(0, 14);
      out.adviseMode = true;
    }

    if (wantStock && terms.length) {
      for (var i = 0; i < terms.length && !out.products; i++) {
        var rows = await q('MAIN', 'products?or=(name.ilike.*' + encodeURIComponent(terms[i]) +
          '*,barcode.ilike.*' + encodeURIComponent(terms[i]) + '*)&limit=8');
        if (rows && rows.length) out.products = rows;
      }
    }
    if (wantOrder && terms.length) {
      for (var j = 0; j < terms.length && !out.orders; j++) {
        var o = await q('MAIN', 'gmt_orders?or=(name.ilike.*' + encodeURIComponent(terms[j]) +
          '*,serial_code.ilike.*' + encodeURIComponent(terms[j]) +
          '*,tracking_number.ilike.*' + encodeURIComponent(terms[j]) +
          '*)&select=id,serial_code,name,status,price,shipping_company,tracking_number,address,created_at&limit=8');
        if (o && o.length) out.orders = o;
      }
    }
    if (wantMoney) {
      var c = await q('MAIN', 'gmt_daily_closes?select=close_date,branch_name,expected_cash,counted_cash,variance,sales_total&order=close_date.desc&limit=8');
      if (c && c.length) out.recentCloses = c;
    }
    // ملخّص عام دائماً (رخيص ومفيد)
    if (global.orders && Array.isArray(global.orders)) {
      var st = {};
      global.orders.forEach(function (o) { st[o.status] = (st[o.status] || 0) + 1; });
      out.ordersOnPage = { total: global.orders.length, byStatus: st };
    }
    if (global.allProducts && Array.isArray(global.allProducts)) {
      out.productsOnPage = { total: global.allProducts.length };
    }
    return out;
  }

  var SYSTEM_PROMPT =
    'أنت «عقل نظام GMT» — مساعد داخلي **مخصّص حصراً** لنظام شركة جنرال ميديا تيك (متجر كاميرات، وكيل كانون في سوريا).\n' +
    'النظام ERP عربي: الجرد · المشتريات · الأوردرات · نقطة البيع وأدمنها · المتجر · الموقع · الكفالات · العقود · التوظيف.\n' +
    'أربع قواعد Supabase: MAIN (بيع/جرد/أوردرات/محاسبة) · WARRANTY · STORE · SITE.\n\n' +
    '🔒 **نطاقك مقفل — هذا أهم شرط:**\n' +
    '• تجيب **فقط** من «سياق النظام» المرفق مع كل سؤال (القواعد · دليل الصفحة · البلاغات · البيانات الحيّة).\n' +
    '• **ممنوع** أن تجيب من معرفتك العامة عن أي شيء خارج هذا النظام: لا معلومات عامة، ولا نصائح تقنية عامة،\n' +
    '  ولا مواضيع لا علاقة لها بالنظام (طقس · رياضة · برمجة عامة · أخبار · مواصفات كاميرات من معرفتك…).\n' +
    '• إن سُئلت خارج النطاق قل بأدب: «هاد خارج نطاقي — أنا مخصّص لنظام GMT بس» واقترح سؤالاً مفيداً.\n' +
    '• إن كان السؤال عن النظام لكن **المعلومة غير موجودة** في السياق، قل صراحةً:\n' +
    '  «ما لقيت هالمعلومة بالسياق» + أين يجدها (أي صفحة أو أي ملف توثيق). **لا تخمّن ولا تخترع رقماً أبداً.**\n' +
    '• الأرقام والأسماء والحالات: **انسخها كما هي من البيانات المرفقة** — لا تحسب أرقاماً من عندك ولا تقرّب.\n\n' +
    'دورك داخل النطاق:\n' +
    '① تفسير الأخطاء: ماذا يعني الخطأ، **هل هو خطير**، تأثيره العملي على الشغل والفلوس والمخزون، ثم الحل.\n' +
    '② تعليم الاستخدام: خطوة بخطوة لموظف جديد، من دليل الصفحة المرفق.\n' +
    '③ الإجابة من البيانات الحيّة: كميات · أوردرات · تقفيلات — من المرفق فقط.\n' +
    '④ اقتراح تطويرات عند نقص حقيقي مدعوم بالبلاغات.\n' +
    '⑤ **مساعدة المبيعات:** إذا وصلك `catalogMatches` (زبون يسأل بالمواصفات لا بالاسم):\n' +
    '   • رشّح من **هذه القائمة فقط** — هي بضاعتنا الموجودة. لا ترشّح منتجاً ليس فيها.\n' +
    '   • أعطِ **2–4 خيارات** كحدّ أقصى، كلٌّ بسطر واحد: الاسم · السعر · **سبب مختصر جداً** لماذا يناسب.\n' +
    '   • رتّبها من الأقرب لطلب الزبون للأبعد، واذكر الفرق بينها بكلمتين (أقوى · أرخص · أخفّ).\n' +
    '   • ثم أضف سطراً: «رسالة جاهزة للزبون:» يتبعه نصّ قصير مهذّب ينسخه الموظف ويرسله.\n' +
    '   • إن لم يطابق شيء قل: «ما عندنا شي مطابق — أقرب شي: …» أو «ما في بالمخزون».\n\n' +
    'قواعد الأسلوب:\n' +
    '• **بالعامية الشامية**، بإيجاز ووضوح (3–6 أسطر للسؤال العادي).\n' +
    '• **ممنوع الحشو**: لا مقدّمات («بكل سرور» · «سؤال ممتاز») ولا خواتيم ولا تكرار السؤال.\n' +
    '  ادخل بالجواب مباشرةً. لا مبالغات تسويقية ولا كلام عام.\n' +
    '• لا تعطِ تعليمات تعدّل بيانات مالية أو مخزون مباشرةً بالقاعدة — اشرح الطريقة الصحيحة **من داخل النظام**.\n' +
    '• رتّب الخطورة: 🔴 حرج (فلوس/مخزون يضيع) · 🟠 مهم (يعطّل عملاً) · ⚪ بسيط.';

  function endpoint() { try { return localStorage.getItem(CFG_KEY) || ''; } catch (_) { return ''; } }

  async function ask(question) {
    var url = endpoint();
    if (!url) throw new Error('not-configured');
    var ctx = collectContext();
    // أرفق البيانات الحيّة المتعلّقة بالسؤال — كي يجيب من بياناتك لا من معرفته
    try { ctx.liveData = await collectLiveData(question); } catch (e) { ctx.liveData = { error: 'تعذّر جلب البيانات الحيّة' }; }
    var r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        context: ctx,
        history: HIST.slice(-6),
        question: question
      })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + (await r.text().catch(function () { return ''; })).slice(0, 160));
    var d = await r.json();
    var answer = d.answer || d.reply || d.text || (d.content && d.content[0] && d.content[0].text) || '';
    if (!answer) throw new Error('ردّ فارغ من الوسيط');
    HIST.push({ q: question, a: answer });
    return answer;
  }

  /* ── الواجهة ── */
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }

  function openPanel(preset) {
    var old = document.getElementById('gmt-brain-panel'); if (old) { old.remove(); }
    var p = document.createElement('div');
    p.id = 'gmt-brain-panel';
    p.style.cssText = 'position:fixed;inset:0;z-index:2147483400;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);' +
      'display:flex;align-items:flex-end;justify-content:center;padding:0;font-family:Cairo,Tahoma,sans-serif;direction:rtl';
    p.onclick = function (e) { if (e.target === p) p.remove(); };
    p.innerHTML =
      '<div style="background:#fff;width:100%;max-width:560px;height:88vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 40px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
        '<div style="background:#0f172a;color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between">' +
          '<div><div style="font-size:14px;font-weight:900">🧠 عقل النظام</div>' +
          '<div style="font-size:10px;opacity:.65;font-weight:700">مساعد داخلي — يفسّر الأخطاء ويشرح الاستخدام</div></div>' +
          '<button id="gb-x" style="background:rgba(255,255,255,.15);border:0;color:#fff;width:30px;height:30px;border-radius:9px;font-size:16px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div id="gb-log" style="flex:1;overflow:auto;padding:14px;background:#f8fafc"></div>' +
        '<div style="padding:10px 12px;border-top:1px solid #e5e7eb;background:#fff">' +
          '<div id="gb-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="gb-in" placeholder="اسأل عن أي خطأ أو خطوة بالنظام…" style="flex:1;padding:11px 13px;border:1.5px solid #e5e7eb;border-radius:12px;font-family:inherit;font-size:13px;font-weight:600;outline:none">' +
            '<button id="gb-send" style="background:#D5001C;color:#fff;border:0;border-radius:12px;padding:0 18px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer">اسأل</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(p);

    var log = p.querySelector('#gb-log'), input = p.querySelector('#gb-in');
    p.querySelector('#gb-x').onclick = function () { p.remove(); };

    function add(who, html, tone) {
      var d = document.createElement('div');
      var mine = who === 'me';
      d.style.cssText = 'margin-bottom:10px;display:flex;' + (mine ? 'justify-content:flex-start' : 'justify-content:flex-end');
      d.innerHTML = '<div style="max-width:86%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.85;font-weight:600;' +
        (mine ? 'background:#D5001C;color:#fff' : 'background:#fff;color:#0f172a;border:1px solid ' + (tone === 'err' ? '#fecaca' : '#e5e7eb')) + '">' + html + '</div>';
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }

    var ctx = collectContext();
    var nErr = (ctx.errors || []).length;
    add('bot', '<b>أهلاً 👋</b><br>أنا عقل النظام. بقدر:<br>' +
      '• أفسّرلك أي خطأ — شو يعني وهل هو خطير وشو تأثيره<br>' +
      '• أشرحلك أي خطوة بالنظام (مفيد للموظف الجديد)<br>' +
      '• أقترح تطويرات<br><br>' +
      (nErr ? '<span style="color:#b91c1c">⚠️ رصدت <b>' + nErr + '</b> خطأ بهالجلسة — اسألني عنهم.</span>'
            : '<span style="color:#16a34a">✅ ما في أخطاء مرصودة بهالجلسة.</span>'));

    var chips = [
      ['🔴 فسّرلي الأخطاء الحالية', 'في أخطاء مرصودة بالنظام هلق؟ فسّرلي كل واحد: شو يعني، هل هو خطير، شو تأثيره على الشغل، وشو الحل.'],
      ['📘 كيف أستعمل هالصفحة؟', 'أنا موظف جديد — اشرحلي هالصفحة خطوة بخطوة: شو بتعمل وشو أهم الأزرار وشو الأخطاء الشائعة.'],
      ['🏦 كيف بيتحسب الصندوق؟', 'كيف بيتحسب رقم الصندوق بالنظام؟ وشو بيزيده وشو بينقّصه؟'],
      ['📦 كم باقي من منتج؟', 'كم باقي من منتج (اكتب اسمه أو الباركود بدل هالجملة) وبأي فرع؟'],
      ['🚚 وين وصل أوردر؟', 'وين وصل أوردر الزبون (اكتب اسم الزبون أو رقم التتبع بدل هالجملة)؟'],
      ['🛍️ رشّحلي لزبون', 'زبون بدّو (اكتب المواصفات بدل هالجملة: مثلاً راس إضاءة 100 وات) — شو عندنا؟ أعطيني الخيارات بأسعارها ورسالة جاهزة أبعتلو ياها.'],
      ['🩺 افحص صحة النظام', '__HEALTH__'],
      ['💡 شو فيه يتطوّر؟', 'حسب القواعد والبلاغات المرفقة، شو أهم شي ناقص أو يحتاج تطوير بهالصفحة؟'],
    ];
    var chipBox = p.querySelector('#gb-chips');
    chips.forEach(function (c) {
      var b = document.createElement('button');
      b.textContent = c[0];
      b.style.cssText = 'background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:800;color:#475569;cursor:pointer;font-family:inherit';
      b.onclick = function () { send(c[1]); };
      chipBox.appendChild(b);
    });

    var busy = false;
    async function send(q) {
      q = (q || input.value || '').trim();
      if (q === '__HEALTH__') {
        add('me', '🩺 افحص صحة النظام');
        var t0 = add('bot', '<span style="opacity:.5">جارٍ الفحص…</span>');
        var res = await healthReport(true).catch(function (e) { return { error: e.message }; });
        t0.querySelector('div').innerHTML = res && res.ok
          ? '<b style="color:#16a34a">✅ النظام سليم</b><br>ما في مشاكل مرصودة.'
          : '<b style="color:#b91c1c">⚠️ ' + ((res && res.issues) || []).length + ' مشكلة</b><br>' +
            fmt(((res && res.issues) || []).join('\n')) +
            (res && res.sent ? '<br><br><span style="color:#16a34a">📨 أُرسل التقرير على تيليجرام</span>'
                             : '<br><br><span style="opacity:.6">لإرسال التقارير تلقائياً: <button id="gb-tg" style="background:#0f172a;color:#fff;border:0;border-radius:8px;padding:4px 10px;font-weight:800;font-size:11px;cursor:pointer;font-family:inherit">اضبط تيليجرام</button></span>');
        var tb = t0.querySelector('#gb-tg'); if (tb) tb.onclick = function () { gmtSetTelegram(); };
        return;
      }
      if (!q || busy) return;
      busy = true; input.value = '';
      add('me', esc(q));
      var t = add('bot', '<span style="opacity:.5">جارٍ التفكير…</span>');
      try {
        var a = await ask(q);
        t.querySelector('div').innerHTML = fmt(a);
      } catch (e) {
        if (String(e.message) === 'not-configured') {
          t.querySelector('div').innerHTML =
            '<b>لم يُفعَّل بعد</b><br>عقل النظام يحتاج وسيطاً آمناً (Edge Function) — المفتاح لا يوضع في الكود.<br>' +
            'خطوات التفعيل في ملف <b>_تفعيل_عقل_النظام.md</b>.<br><br>' +
            '<button id="gb-cfg" style="background:#0f172a;color:#fff;border:0;border-radius:9px;padding:6px 14px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit">أدخل رابط الوسيط</button>';
          var cb = t.querySelector('#gb-cfg');
          if (cb) cb.onclick = function () { configure(); };
        } else {
          t.querySelector('div').innerHTML = '<span style="color:#b91c1c">تعذّر الاتصال: ' + esc(e.message) + '</span>';
        }
      }
      busy = false;
      log.scrollTop = log.scrollHeight;
    }
    p.querySelector('#gb-send').onclick = function () { send(); };
    input.onkeydown = function (e) { if (e.key === 'Enter') send(); };
    if (preset) send(preset);
  }

  function configure() {
    var cur = endpoint();
    var v = prompt('رابط وسيط عقل النظام (Supabase Edge Function):\n\nمثال:\nhttps://<project>.supabase.co/functions/v1/gmt-brain\n\n(المفتاح يبقى داخل الوسيط ولا يظهر في الكود)', cur);
    if (v === null) return;
    v = v.trim();
    try { v ? localStorage.setItem(CFG_KEY, v) : localStorage.removeItem(CFG_KEY); } catch (_) {}
    alert(v ? '✅ حُفظ الرابط — جرّب السؤال الآن.' : '🗑️ أُزيل الرابط.');
  }

  /* ══ التقرير التلقائي: «إذا شاف أخطاء يراسلك» (2026-08-26 · طلب المالك) ══
     مرّة يومياً بصمت: يشغّل الفحص الذاتي + يقرأ البلاغات. إن وُجدت مشاكل،
     يطلب من كلود شرحاً مختصراً ثم **يرسله على تيليجرام**.
     🔕 لا يرسل شيئاً إن كان النظام سليماً — لا إزعاج بلا سبب.
     🔒 قراءة فقط · لا يصلح شيئاً · التنفيذ يبقى بيدك. */
  var RPT_KEY = 'gmt_brain_report_last';

  function tg() {
    var C = global.GMT_CONFIG || global.CONFIG || {};
    var tok = global.TELEGRAM_TOKEN || C.TELEGRAM_BOT_TOKEN || C.TELEGRAM_TOKEN || '';
    var chat = global.TELEGRAM_CHAT_ID || C.TELEGRAM_CHAT_ID || '';
    try {
      tok  = tok  || localStorage.getItem('gmt_tg_token') || '';
      chat = chat || localStorage.getItem('gmt_tg_chat')  || '';
    } catch (_) {}
    return (tok && chat && tok !== '...') ? { tok: tok, chat: chat } : null;
  }

  async function sendTG(text) {
    var t = tg(); if (!t) return false;
    try {
      var r = await fetch('https://api.telegram.org/bot' + t.tok + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: t.chat, text: text, parse_mode: 'HTML' })
      });
      if (!r.ok) console.warn('[GMT] تعذّر إرسال تقرير الصحة:', r.status);
      return r.ok;
    } catch (e) { console.warn('[GMT] استثناء إرسال التقرير:', e); return false; }
  }

  async function healthReport(force) {
    var issues = [];
    // ① الفحص الذاتي (أصول · جداول · دوال · هوية · عامل الخدمة)
    try {
      if (global.GMTSelfCheck) {
        var res = await GMTSelfCheck.run(false);
        (res || []).forEach(function (r) {
          if (r.level === 'bad')  issues.push('🔴 ' + r.title + (r.detail ? ' — ' + r.detail : ''));
          if (r.level === 'warn') issues.push('🟠 ' + r.title + (r.detail ? ' — ' + r.detail : ''));
        });
      }
    } catch (_) {}
    // ② بلاغات البوتات
    try {
      if (global.GMTMoneyGuard && GMTMoneyGuard.incidents) {
        var mi = GMTMoneyGuard.incidents();
        if (mi && mi.length) issues.push('🔴 حوادث مالية مرصودة: ' + mi.length);
      }
    } catch (_) {}
    // ③ أخطاء الجلسة
    if (errLog.length) issues.push('🟠 أخطاء جلسة: ' + errLog.length + ' — ' + errLog.slice(-3).join(' | ').slice(0, 300));

    if (!issues.length) {
      if (force) showLocal('✅ النظام سليم — ما في مشاكل مرصودة');
      return { ok: true, issues: [] };
    }

    // اطلب شرحاً مختصراً من كلود (إن كان مُفعَّلاً)، وإلا أرسل القائمة الخام
    var body = issues.join('\n');
    if (endpoint()) {
      try {
        body = await ask('هاي المشاكل المرصودة بالنظام:\n' + issues.join('\n') +
          '\n\nاكتب تقريراً مختصراً جداً (بحدود 8 أسطر): لكل مشكلة سطر واحد فيه الخطورة (🔴/🟠/⚪) وشو تأثيرها العملي وشو الحل بكلمتين. بلا مقدّمات ولا خواتيم.');
      } catch (e) { /* نُرسل القائمة الخام */ }
    }
    var msg = '🩺 <b>تقرير صحة نظام GMT</b>\n' +
      new Date().toLocaleString('ar-SY') + ' · صفحة: ' + page + '\n' +
      '──────────\n' + body;
    var sent = await sendTG(msg);
    if (!sent) showLocal('⚠️ وُجدت ' + issues.length + ' مشكلة — تعذّر إرسال التقرير على تيليجرام');
    return { ok: false, issues: issues, sent: sent };
  }

  function showLocal(text) {
    try { console.warn('[GMT تقرير الصحة] ' + text); } catch (_) {}
  }

  /* تشغيل تلقائي: مرّة كل 24 ساعة، بصمت */
  (function autoReport() {
    function go() {
      var last = 0;
      try { last = Number(localStorage.getItem(RPT_KEY)) || 0; } catch (_) {}
      if (Date.now() - last < 86400000) return;
      setTimeout(function () {
        healthReport(false).then(function () {
          try { localStorage.setItem(RPT_KEY, String(Date.now())); } catch (_) {}
        }).catch(function () {});
      }, 12000);   // بعد استقرار الصفحة وانتهاء الفحص الذاتي
    }
    if (document.readyState === 'complete') go(); else addEventListener('load', go);
  })();

  window.gmtSetTelegram = function () {
    var cur = tg();
    var tok = prompt('توكن بوت تيليجرام (لإرسال تقرير الصحة):', (cur && cur.tok) || '');
    if (tok === null) return;
    var chat = prompt('معرّف المحادثة (Chat ID):', (cur && cur.chat) || '');
    if (chat === null) return;
    try {
      tok.trim()  ? localStorage.setItem('gmt_tg_token', tok.trim())  : localStorage.removeItem('gmt_tg_token');
      chat.trim() ? localStorage.setItem('gmt_tg_chat',  chat.trim()) : localStorage.removeItem('gmt_tg_chat');
    } catch (_) {}
    alert(tg() ? '✅ جاهز — تقرير الصحة رح يوصلك على تيليجرام.' : '🗑️ أُزيل الإعداد.');
  };

  function mount() {
    /* (2026-08-26 · طلب المالك) الصفحة التي فيها زر «🧠 عقل النظام» ضمن أزرارها العلوية
       لا تحتاج زراً عائماً — كان يركب فوق المحتوى. */
    try { if (document.querySelector('[onclick*="GMTBrain.open"]')) return; } catch (_) {}
    if (document.getElementById('gmt-brain-fab')) return;
    var b = document.createElement('button');
    b.id = 'gmt-brain-fab';
    b.title = 'عقل النظام — اسأل عن أي خطأ أو خطوة';
    b.textContent = '🧠';
    b.style.cssText = 'position:fixed;bottom:18px;inset-inline-end:18px;z-index:2147483300;width:52px;height:52px;' +
      'border-radius:999px;background:#0f172a;color:#fff;border:0;font-size:22px;cursor:pointer;' +
      'box-shadow:0 6px 22px rgba(0,0,0,.3);transition:transform .15s';
    b.onmouseenter = function () { b.style.transform = 'scale(1.08)'; };
    b.onmouseleave = function () { b.style.transform = 'scale(1)'; };
    b.onclick = function () { openPanel(); };
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.GMTBrain = {
    open: openPanel,
    ask: ask,
    configure: configure,
    context: collectContext,
    explainErrors: function () { openPanel('في أخطاء مرصودة بالنظام هلق؟ فسّرلي كل واحد: شو يعني، هل هو خطير، شو تأثيره، وشو الحل.'); },
    healthReport: function () { return healthReport(true); },   // تشغيل يدوي فوري
    isReady: function () { return !!endpoint(); },
    telegramReady: function () { return !!tg(); }
  };
})(window);

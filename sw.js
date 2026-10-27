/* (المالك seq 157 · TASK-0227) هذه نسخةٌ قديمة من النظام — أُعيد توجيهها كلّها إلى النظام الحاليّ:
   https://general-media-tech.github.io/system__V/
   عامل الخدمة هذا يُلغي نفسه فقط ثمّ يعيد تحميل الصفحات المفتوحة فتصل إلى إعادة التوجيه.
   لا يمسح أيّ كاش: التخزين مشتركٌ مع النظام الحاليّ على النطاق نفسه. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(self.registration.unregister().then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (_) {} }); }));
});

# ربط الطلبات بـ Google Sheets

كل طلب يُرسل من الموقع يُضاف كسطر جديد في جدول Google Sheets.

## الخطوات (مرة واحدة فقط)

1. أنشئ جدولاً جديداً على https://sheets.new وسمّه مثلاً **M SQUARE Orders**.
2. من القائمة: **Extensions ← Apps Script** (الإضافات ← برمجة التطبيقات).
3. احذف الكود الموجود والصق محتوى الملف `Code.gs` كاملاً، ثم احفظ (Ctrl+S).
4. اضغط **Deploy ← New deployment** (نشر ← نشر جديد):
   - اضغط على ⚙️ واختر النوع **Web app**
   - **Execute as / التنفيذ باسم:** Me (أنا)
   - **Who has access / من يمكنه الوصول:** **Anyone (أي شخص)**
   - اضغط **Deploy**، ووافق على الصلاحيات (Advanced ← Go to project ← Allow).
5. انسخ رابط **Web app URL** (ينتهي بـ `/exec`).
6. افتح الملف `js/config.js` في الموقع وضع الرابط:
   ```js
   const ORDER_ENDPOINT = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
7. جرّب: أضف منتجاً للسلة وأكمل الطلب ← سيظهر سطر جديد في ورقة **Orders**.

للتأكد أن الرابط يعمل افتحه في المتصفح، يجب أن يظهر: `{"ok":true,"service":"M SQUARE orders"}`

## ملاحظات
- إذا عدّلت `Code.gs` لاحقاً: **Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy** (الرابط يبقى نفسه).
- عمود **الحالة** يبدأ بـ "جديد"، وغيّره يدوياً (مؤكد، تم الشحن، ملغى...).
- للإشعار بكل طلب: في الجدول **Tools ← Notification settings ← Notify me when changes are made**.
- الأسعار تُرسل من متصفح الزبون، لذا راجع المجموع عند الاتصال لتأكيد الطلب.

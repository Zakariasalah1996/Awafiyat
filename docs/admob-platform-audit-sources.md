# مراجع تدقيق AdMob حسب المنصة

## الفصل بين Android وiOS

توضح Google أن كل تطبيق يُسجَّل في AdMob للحصول على **AdMob App ID** مميز. وعلى Android يوضع هذا المعرّف في `AndroidManifest.xml` تحت `com.google.android.gms.ads.APPLICATION_ID`، بينما على iOS يوضع في `Info.plist` تحت `GADApplicationIdentifier`.

كما أن **Ad unit ID** يعرّف كل وحدة إعلان محددة داخل التطبيق، ويجب نسخه من التطبيق المناسب في AdMob.

## أجهزة الاختبار

توضح Google أن إعداد جهاز كـ **Test device** يجعل التطبيق يطلب إعلانات اختبار باستخدام وحدات الإنتاج، ولا يحجب الإعلانات. ويمكن كذلك استخدام وحدة Google التجريبية المخصصة لإعلان Rewarded.

## المراجع

1. Google Mobile Ads SDK — Android quick start: https://developers.google.com/admob/android/quick-start
2. Google Mobile Ads SDK — iOS quick start: https://developers.google.com/admob/ios/quick-start
3. Google Mobile Ads SDK — Enable test ads on Android: https://developers.google.com/admob/android/test-ads
4. AdMob Help — Find and copy an app ID or ad unit ID: https://support.google.com/admob/answer/7356431?hl=en

Retrieved: 2026-07-22

## نتيجة الوصول إلى الحساب

تم فتح صفحة AdMob العامة في جلسة المتصفح المتاحة، لكنها تعرض خيار «تسجيل الدخول» ولا تتيح الوصول إلى بيانات الحساب أو قائمة التطبيقات. لذلك لا يمكن التحقق من حالة وحدة الإنتاج أو معرّفاتها من لوحة AdMob في هذه الجلسة دون لقطات يقدّمها المستخدم.

## مؤشرات الإنتاج من لوحة AdMob

بعد تسجيل الدخول، ظهرت لوحة الحساب وفيها تطبيق واحد باسم «ألف عافيات» لنظام Android. تعرض اللوحة لهذا اليوم 16 طلب إعلان و7 مرات ظهور ومعدل مطابقة 100% وإيرادات تقديرية 0.01 يورو. هذه البيانات تثبت أن AdMob يستقبل طلبات ناجحة ويعرض إعلانات من نفس التطبيق، ولذلك لا توجد حالة حظر عامة على الحساب أو وحدة الإعلان.

في 25 أغسطس 2026 تم إنشاء وحدة إضافية باسم `rewarded_content_unlock` من نوع «إعلان بمكافأة»، ومعرّفها `ca-app-pub-9147941153313979/4919884210`. هذه هي الوحدة المستخدمة الآن في التطبيق لأن تدفق فتح المحتوى يبدأ دائماً باختيار صريح من المستخدم.

## تحقق إعداد Android

تؤكد إعدادات التطبيق في AdMob أن معرّف التطبيق هو `ca-app-pub-9147941153313979~6652750828`، وهو مطابق لـ`androidAppId` في إعداد التطبيق. كما أن اسم الحزمة المرتبط بـGoogle Play هو `io.awafiyat.health`، والتطبيق «تم التحقق» وحالة الإعلان «جاهز». لذلك لا يوجد نقص أو خلط في إعداد AdMob الخاص بأندرويد.

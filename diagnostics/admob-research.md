# ملاحظات تشخيص AdMob Rewarded

## المصادر الرسمية

1. Invertase — إعداد React Native Google Mobile Ads: https://docs.page/invertase/react-native-google-mobile-ads
2. Invertase — عرض الإعلانات وأحداث Rewarded Ads: https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads
3. Google AdMob Android — Rewarded Ads: https://developers.google.com/admob/android/rewarded

## النتائج الأساسية

- يجب تضمين **AdMob App ID** الأصلي في الشيفرة الأصلية عبر config plugin، وأي تغيير فيه يتطلب إعادة بناء التطبيق.
- يجب تهيئة Google Mobile Ads مرة واحدة قبل تحميل الإعلان، ومن المفيد حفظ حالات adapters الناتجة عن `initialize()` لأغراض التشخيص.
- أثناء التطوير يجب استخدام `TestIds.REWARDED` لتجنب تعليق حساب AdMob، بينما يستخدم البناء الإنتاجي Ad Unit ID الحقيقي.
- Rewarded Ads تحتاج الاستماع إلى `RewardedAdEventType.LOADED` و`RewardedAdEventType.EARNED_REWARD`، وإلى أحداث `AdEventType.ERROR` و`AdEventType.CLOSED` و`AdEventType.OPENED` عند الحاجة.
- كائن الإعلان لا يعاد استخدامه بعد الإغلاق أو فشل العرض؛ يجب تصفير المرجع ثم تحميل كائن جديد.
- خطأ التحميل يعيد تفاصيل عالية الدقة (`code`, `message`, `domain`، وأحيانًا `responseInfo`) ويجب عدم ابتلاعها أو تحويل كل فشل إلى فتح ناجح للمحتوى.
- الوحدة الاختبارية الرسمية لـRewarded على Android هي `ca-app-pub-3940256099942544/5224354917` ويُتوقع أن تعيد إعلانًا في الاختبارات.
- `NO_FILL` يعني أن الطلب وصل إلى شبكة الإعلانات لكن لا توجد مادة إعلانية متاحة في تلك اللحظة؛ يختلف عن خطأ App ID أو Ad Unit أو الحساب، ولذلك يجب إظهار رمز الخطأ الفعلي بدل رسالة عامة.

## ملاحظات من إصدار المكتبة المثبت 15.4.1

- `RewardedAd` يقبل أحداث `AdEventType` و`RewardedAdEventType` معًا.
- يجب استخدام `RewardedAdEventType.LOADED` تحديدًا، بينما يأتي خطأ التحميل عبر `AdEventType.ERROR`.
- المصدر الداخلي يحوّل الخطأ الأصلي إلى `NativeError` باسم نطاق `googleMobileAds`، ويمكن قراءة `code` و`message` منه.
- التنفيذ الحالي يستخدم النص الحرفي `"error"` و`"closed"` بدل الثوابت، ويبتلع خطأ التحميل ثم يعيد `true` ويفتح المحتوى مباشرة؛ هذا يخفي السبب عن المستخدم ويجعل زر الإعلان يبدو معطّلًا.

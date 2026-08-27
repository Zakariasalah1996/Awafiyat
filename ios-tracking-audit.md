# تدقيق تصريح التتبع في iOS — ألف عافيات

**تاريخ التدقيق:** 21 يوليو 2026

## النتيجة

سبب رسالة App Store Connect محدد في إعدادات المشروع، لا في شاشة خصوصية Apple وحدها. يحتوي `app.config.ts` على إضافة `react-native-google-mobile-ads` مع الخاصية `userTrackingUsageDescription` (السطور 132–140). توثيق المكتبة يبين أن هذه الخاصية تضيف `NSUserTrackingUsageDescription` إلى إعداد iOS الناتج، ولذلك يرى App Store Connect أن التطبيق قد يطلب إذن App Tracking Transparency.

لا يوجد في المصدر استدعاء صريح لـ`requestTrackingPermission` أو `ATTrackingManager` أو `AppTrackingTransparency`. إلا أن ملف `lib/admob.ts` ينشئ إعلان Rewarded Interstitial بخيار `requestNonPersonalizedAdsOnly: false`، وهو إعداد مشترك بين iOS وAndroid ويسمح حالياً بطلبات إعلانات مخصصة.

## التعديل المطلوب

1. إزالة `userTrackingUsageDescription` من إعداد إضافة Google Mobile Ads في `app.config.ts`، وهو تغيير iOS فقط.
2. جعل `requestNonPersonalizedAdsOnly` يساوي `true` على iOS فقط، وإبقاء قيمته `false` على Android، حتى لا تتغير سياسة إعلانات Google Play.
3. التحقق من غياب أي مصدر آخر لتصريح `NSUserTrackingUsageDescription`، ثم تشغيل فحوص TypeScript والاختبارات قبل بناء نسختي iOS وAndroid.

## ملاحظات الخصوصية

غياب تصريح ATT لا يلغي واجب الإفصاح عن بيانات Google Mobile Ads التي قد يجمعها SDK في App Privacy. يجب أن تعكس إجابات App Store Connect الاستخدام الفعلي للإصدار الجديد.

## المصادر

1. React Native Google Mobile Ads، إعداد Expo وApp Tracking Transparency: https://docs.page/invertase/react-native-google-mobile-ads~809
2. Apple، User Privacy and Data Use (تعريف التتبع ومسؤولية المطور عن SDKs): https://developer.apple.com/app-store/user-privacy-and-data-use/
3. Google AdMob، App Store Data Disclosure على iOS: https://developers.google.com/admob/ios/privacy/data-disclosure
4. Google AdMob، Privacy Strategies for iOS: https://developers.google.com/admob/ios/privacy/strategies

## حدود الإجراء

هذا التدقيق لا يجري أي بناء أو رفع أو تغيير في App Store Connect. يجب إنشاء بناء iOS جديد بعد تعديل إعدادات المشروع، لأن `Info.plist` موجود داخل ملف التطبيق المبني.

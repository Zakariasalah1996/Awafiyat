# Subscription and Google Play Readiness Audit

## Official RevenueCat references

### React Native installation
Source: https://www.revenuecat.com/docs/getting-started/installation/reactnative

- RevenueCat requires a native development/release build for real store purchases; Expo integration uses `react-native-purchases` with native auto-linking.
- Android deployment must be API 23 or newer.
- RevenueCat recommends Android activity `launchMode` be `standard` or `singleTop` so purchases are not cancelled when the user switches to a banking/payment verification app.
- The Android build must include Google Play Billing permission through the native billing dependency.

### Android installation
Source: https://www.revenuecat.com/docs/getting-started/installation/android

- The RevenueCat Android SDK wraps Google Play Billing and validates subscription state through `CustomerInfo` entitlements.
- Purchase flows should use a supported activity launch mode (`standard` or `singleTop`).

### Products, entitlements, and offerings
Source: https://www.revenuecat.com/docs/projects/configuring-products

- Production products must first exist in Google Play Console and then be imported or added to RevenueCat.
- Products must be attached to the entitlement used by the application.
- Offerings group store products into packages. The offering marked as default is returned as `currentOffering` by the SDK.
- The expected flow is: Google Play product purchase → RevenueCat entitlement becomes active → application grants premium access based on that entitlement.

### Restoring purchases
Source: https://www.revenuecat.com/docs/getting-started/restoring-purchases

- Every app should expose a user-triggered restore action.
- `restorePurchases` should only run after explicit user interaction because the OS may show a store sign-in prompt.
- After restoration, the app must inspect `CustomerInfo.entitlements.active` for the entitlement it uses.
- Subscription restoration with anonymous users is supported through the store account; RevenueCat recommends considering stable App User IDs when cross-device/account continuity is required.

## Expo Notifications reference

Source: local Expo SDK 54 documentation mirrored at `/home/ubuntu/awafiyat-mobile_helper/docs/background/notifications/DOCS.md`.

- Local medication reminders require notification permission and an Android notification channel.
- Local notifications work when the app is backgrounded or closed, but must be verified on a physical release build.
- Foreground visibility requires a notification handler.

## Official Google Play references

| Area | Verified requirement | Official source |
|---|---|---|
| Publishing artifact | Android App Bundle is the Google Play publishing format; Google Play generates optimized APKs for each device from the uploaded bundle. | https://developer.android.com/guide/app-bundle |
| Billing validation | Google recommends testing the billing integration throughout development with license testers, Play Billing Lab, and a Play test track. The package name must match the Play Console app. | https://developer.android.com/google/play/billing/test |
| Subscription scenarios | Before production, test successful purchase, cancellation, declined/pending payment, renewal, grace period/account hold, expiration, and restoration. | https://developer.android.com/google/play/billing/test |
| Internal testing | Google recommends an internal test before broader release; an internal track can distribute the build to up to 100 testers and may take several hours to become available. | https://support.google.com/googleplay/android-developer/answer/9845334?hl=en |

The project should therefore produce an AAB for its production profile, retain a separate APK profile for direct-device preview, and complete at least one purchase-and-restore cycle from a Google Play internal-test installation before public rollout.

## تحقق مباشر من لوحة RevenueCat — 19 يوليو 2026

تمت مراجعة مشروع **AFIYAT LTD** مباشرة في لوحة RevenueCat، وليس عبر الكود فقط:

- صفحة النظرة العامة: https://app.revenuecat.com/projects/805827ed/overview
  - توجد معاملات Google Play فعلية واشتراك نشط، ما يثبت أن اتصال المتجر وRevenueCat عمل فعلياً في نسخ سابقة.
- العروض: https://app.revenuecat.com/projects/805827ed/product-catalog/offerings
  - العرض `rc_monthly$` موجود ونشط ويحتوي حزمتين.
  - تفاصيله: https://app.revenuecat.com/projects/805827ed/product-catalog/offerings/ofrng6fc491f6dd
  - الحزمة `$rc_monthly` مرتبطة بالمنتج `io.awafiyat.health.monthly:monthly-plan`.
  - الحزمة `$rc_annual` مرتبطة بالمنتج `io.awafiyat.health.yearly:yearly-plan`.
- الاستحقاق: https://app.revenuecat.com/projects/805827ed/product-catalog/entitlements/entlc5f3a61026
  - الاستحقاق `premium` موجود ويرتبط بالمنتجين الشهري والسنوي؛ وهو نفس المعرّف الذي يفحصه التطبيق.
- التطبيقات: https://app.revenuecat.com/projects/805827ed/apps
  - تطبيق Android باسم «ألف عافيات» ومعرّف الحزمة `io.awafiyat.health`.
  - تطبيق iOS منفصل بالمعرّف نفسه.
  - لوحة التوافق تعرض `react-native-purchases` 10.1.1 لمستخدمي Android خلال آخر 30 يوماً.

لم تُكشف أو تُسجّل أي مفاتيح سرية. بقي التحقق من إعداد تطبيق Android داخل RevenueCat ومن Google Play Console ومسار البناء AAB قبل اعتماد الجاهزية النهائية.

## حالة اتصال Google Play الفعلية

| الفحص | النتيجة | الأثر |
|---|---|---|
| بيانات حساب الخدمة داخل تطبيق Android في RevenueCat | **صالحة** (`Valid credentials`) | يستطيع RevenueCat التحقق من معاملات Google Play. |
| Google Developer Notifications في RevenueCat | **غير متصلة**؛ تظهر مطالبة `Connect to Google` | الاشتراكات الأساسية يمكن أن تعمل، لكن RevenueCat لن يحصل على جميع تغيّرات الشراء فورياً بأفضل موثوقية موصى بها حتى يتم ربط Pub/Sub. |
| حساب Google Play Console المتاح في المتصفح | **مغلق منذ 30 مارس 2024 بسبب عدم الاستخدام** | لا يمكن رفع AAB أو إدارة التطبيق من هذا الحساب. توضح Play Console أن بدء النشر يتطلب حساب مطوّر جديداً. |
| حساب مطوّر آخر متاح بالحساب الحالي | لم يظهر في قائمة حسابات المطوّرين | يلزم دخول حساب Google الذي يملك حساب Play Console نشطاً، أو إنشاء حساب مطوّر جديد وإكمال متطلبات Google قبل الرفع. |

رابط حالة السياسة التي تمت مراجعتها: https://play.google.com/console/u/0/developers/5006073615609268091/policy-center

هذه النتيجة **عائق نشر خارجي وليست خطأ في كود التطبيق**. لا يصح اعتماد «رفع مباشر الآن» قبل توفير حساب Play Console نشط والتأكد من أن التطبيق ذي الحزمة `io.awafiyat.health` موجود فيه وأن المنتجات الشهرية والسنوية مفعّلة ومتاحة لمسار الاختبار.

## حساب Google Play الصحيح — 19 يوليو 2026

بعد انتقال المستخدم إلى الحساب الصحيح، تم التحقق من حساب المؤسسة **AFIYAT LTD** ذي معرّف المطور `5527675669406446893` في Play Console. يظهر تطبيق واحد باسم **ألف عافيات** ومعرّف الحزمة `io.awafiyat.health`، وهو في **مرحلة الإنتاج** ويعرض 495 مستخدماً ثبّتوا التطبيق، وآخر تعديل ظاهر بتاريخ 1 يونيو 2026.

رابط قائمة التطبيقات: https://play.google.com/console/u/1/developers/5527675669406446893/app-list

الاستنتاج السابق المتعلق بالحساب المغلق يخص حساب Google مختلفاً ولا يمثل حساب نشر ألف عافيات. يجب متابعة التدقيق داخل هذا التطبيق الصحيح للتحقق من الاشتراكات، مسار الاختبار، حالة السياسة، وآخر حزمة إنتاج.

## تحقق Google Play من الاشتراكات — 19 يوليو 2026

داخل حساب **AFIYAT LTD** الصحيح وتطبيق **ألف عافيات** (`io.awafiyat.health`)، تعرض صفحة **تحقيق الربح مع Google Play** أن هناك **اشتراكين (2) تم إعدادهما إجمالاً**، وأن المشتركين يمثلون **100% من إجمالي الإيرادات خلال آخر 90 يوماً**. كما ظهر إيراد فعلي حديث في لوحة تحقيق الربح، وهو دليل إضافي على أن مسار الاشتراك العامل في الإصدار السابق مرتبط بالمتجر الصحيح.

المصدر المباشر: https://play.google.com/console/u/1/developers/5527675669406446893/app/4973046056164152935/monetize

تبقى الخطوة التالية فتح تفاصيل الاشتراكين للتحقق من المعرّفات والخطط الأساسية النشطة، مع الحفاظ على الإعدادات دون تغيير.

### تفاصيل منتجات Google Play المؤكدة

تحت تطبيق **ألف عافيات** (`io.awafiyat.health`) توجد المنتجات التالية في صفحة الاشتراكات:

| الاسم في Google Play | معرّف المنتج | الخطط الأساسية المفعّلة | العروض | آخر تعديل ظاهر |
|---|---|---:|---:|---|
| الإشتراك الشهري | `io.awafiyat.health.monthly` | 1 | عرض واحد | 14 يوليو 2026 |
| الاشتراك السنوي | `io.awafiyat.health.yearly` | 1 | عرض واحد | 14 يوليو 2026 |

هذه المعرّفات تطابق المنتجين المرتبطين باستحقاق RevenueCat `premium` حسب التحقق السابق من لوحة RevenueCat، كما أن اسم الحزمة في المتجر يطابق إعداد Expo وFirebase: `io.awafiyat.health`.

المصدر المباشر: https://play.google.com/console/u/1/developers/5527675669406446893/app/4973046056164152935/subscriptions

### تفاصيل الاشتراك الشهري

تأكدت صفحة المنتج الشهري في Google Play من المعرّف `io.awafiyat.health.monthly` ووجود **خطة أساسية واحدة** مرتبطة به. صفحة المنتج تعرض مزايا الاشتراك الحالية، ومنها الوصول غير المحدود للوصفات ومحاولات «ماذا في ثلاجتي» وجدول الوصفات الأسبوعي. لم يتم تغيير أي إعداد في المتجر.

المصدر المباشر: https://play.google.com/console/u/1/developers/5527675669406446893/app/4973046056164152935/subscriptions/s/io.awafiyat.health.monthly

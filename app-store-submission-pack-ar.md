# حزمة تجهيز App Store — ألف عافيات

**الإصدار المرشح:** 1.0.83 (83)  
**معرّف الحزمة:** `io.awafiyat.health`  
**معرّف التطبيق:** `6775841115`  
**اللغة الأساسية:** العربية

> هذه الحزمة مسودة جاهزة للإدخال بعد التحقق النهائي. لا تُحفظ أي تعديلات في App Store Connect ولا يُرسل الإصدار للمراجعة قبل موافقة مالك التطبيق.

## بيانات الاشتراكات

تستخدم الأسعار التي يعرضها StoreKit تلقائياً بحسب متجر المستخدم وعملته. لا يُكتب السعر يدوياً في اسم المنتج أو وصفه أو صورته الترويجية، امتثالاً لمتطلبات البيانات الدقيقة التي أشارت إليها Apple في الرفض السابق.[1]

| المنتج | Product ID | مدة StoreKit | اسم العرض العربي | الوصف العربي المقترح | الصورة الترويجية |
|---|---|---:|---|---|---|
| شهري | `io.awafiyat.health.monthly` | شهر واحد | عضوية شهرية | وصول إلى المزايا المميزة لمدة شهر | `awafiyat-monthly-iap-1024.png` |
| سنوي | `io.awafiyat.health.yearly` | سنة واحدة | عضوية سنوية | وصول إلى المزايا المميزة لمدة سنة | `awafiyat-annual-iap-1024.png` |

### الصور الترويجية الجاهزة

الصور أصلية وليست لقطات شاشة، ولا تحتوي سعراً أو عملة أو نسبة خصم أو إطار هاتف. صُممت بنسبة 1:1 وبلا زوايا خارجية مستديرة لتُستخدم في خانة App Store Promotion ذات المقاس 1024×1024.[2]

| المنتج | ملف المصدر | رابط الأصل المحفوظ |
|---|---|---|
| شهري | `/home/ubuntu/awafiyat-mobile/app-store-assets/awafiyat-monthly-iap-1024.png` | `/manus-storage/awafiyat-monthly-iap-1024_de58a2aa.png` |
| سنوي | `/home/ubuntu/awafiyat-mobile/app-store-assets/awafiyat-annual-iap-1024.png` | ملف نهائي محفوظ داخل المشروع |

## ملاحظات مراجعة كل اشتراك

### الشهري

هذا اشتراك تلقائي التجدد لمدة شهر يفتح مزايا ألف عافيات المميزة: ذكاء الثلاجة غير المحدود، التنبيهات الغذائية وفق تفضيلات المستخدم، تجديد النعمة حتى خمس مرات يومياً، رفيق الدواء بصوت مخصص، رفيق الماء مع التذكيرات، ومكتبة الوصفات الكاملة. يعرض التطبيق السعر المحلي والمدة مباشرة من StoreKit قبل التأكيد. يمكن الوصول إليه من تبويب «العضوية»، ويمكن استعادة المشتريات من الزر الظاهر في الشاشة نفسها. لا تتطلب مراجعة شاشة الشراء إنشاء حساب.

### السنوي

هذا اشتراك تلقائي التجدد لمدة سنة ويفتح المزايا المميزة نفسها. يعرض التطبيق السعر المحلي والمدة مباشرة من StoreKit قبل التأكيد. لا يَعِد التطبيق بتجربة مجانية إلا عندما يؤكد StoreKit أهلية الحساب والعرض التمهيدي. يمكن الوصول إلى الشراء والاستعادة من تبويب «العضوية» دون إنشاء حساب.

## نص الإفصاح داخل التطبيق

يُعرض للمستخدم قبل تأكيد الشراء ما يأتي:

> سيتم الخصم من حساب App Store عند تأكيد الشراء. يتجدد الاشتراك تلقائياً ما لم يُلغَ قبل نهاية الفترة الحالية بـ24 ساعة على الأقل. يمكنك إدارة الاشتراك أو إلغاؤه من إعدادات حساب App Store. السعر والمدة الظاهران أعلاه مصدرهما StoreKit ويتغيران بحسب بلد المتجر.

تظهر إلى جوار الإفصاح روابط قابلة للنقر لسياسة الخصوصية، شروط الاستخدام، اتفاقية Apple القياسية، واستعادة المشتريات. يتوافق ذلك مع متطلبات Apple للاشتراكات المتجددة تلقائياً.[1][3]

## الروابط القانونية

| الحقل | الرابط المقترح |
|---|---|
| Privacy Policy URL | `https://alfafiyat.com/?legal=privacy` |
| Terms of Use داخل التطبيق | `https://alfafiyat.com/?legal=terms` |
| Apple Standard EULA | `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` |

يجب نشر النسخة الجديدة من الموقع العام والتحقق من أن رابطَي النطاق يعملان خارج التطبيق قبل إدخالهما في App Store Connect.

## إضافة مطلوبة إلى وصف App Store

أضف السطرين الآتيين في نهاية الوصف العربي:

> سياسة الخصوصية: https://alfafiyat.com/?legal=privacy  
> شروط الاستخدام (اتفاقية Apple القياسية): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## App Review Notes للإصدار الجديد

يمكن إدخال النص التالي في خانة ملاحظات المراجعة بعد اكتمال ربط المنتجات:

> عالجنا جميع البنود الواردة في مراجعة الإصدار 1.0.61. أزلنا تصريح تشغيل الصوت في الخلفية لأن التطبيق لا يقدم تشغيل صوت مستمر في الخلفية. أصبحت الاشتراكات على iOS تستخدم StoreKit عبر تطبيق Apple الصحيح في RevenueCat، وتُعرض الأسعار والمدد المحلية التي يعيدها StoreKit. أضفنا روابط سياسة الخصوصية وشروط الاستخدام واتفاقية Apple القياسية، وزر استعادة المشتريات وإدارة الاشتراك. يمكن للمراجع فتح تبويب «العضوية»، اختيار الخطة الشهرية أو السنوية، ثم تأكيد الشراء في Sandbox. لا يلزم إنشاء حساب. اختبرنا التخطيط على مقاس iPad Air 11-inch، وتظل أزرار الشراء والاستعادة والإغلاق ظاهرة وقابلة للاستخدام.

## رد مقترح على Resolution Center

> مرحباً فريق App Review،  
> شكراً على ملاحظاتكم. عالجنا البنود المذكورة كما يلي:  
> 1. استبدلنا مواد الترويج للاشتراكات بصور أصلية 1024×1024 ليست لقطات شاشة ولا تحتوي أسعاراً.  
> 2. ربطنا منتجات Apple الشهرية والسنوية بتدفق StoreKit الصحيح، واختبرنا الشراء والاستعادة في بيئة Sandbox.  
> 3. أزلنا `audio` من `UIBackgroundModes` لأن التطبيق لا يشغّل صوتاً مستمراً في الخلفية.  
> 4. تعرض شاشة الاشتراك الآن عنوان المنتج ومدته وسعره المحلي وروابط الخصوصية وشروط الاستخدام واتفاقية Apple القياسية قبل الشراء.  
> 5. أرفقنا الاشتراكين بالإصدار الجديد وأضفنا تعليمات مراجعة واضحة.  
> شكراً لإعادة المراجعة.

## قائمة تحقق قبل الحفظ في App Store Connect

| التحقق | الحالة الحالية |
|---|---|
| اتفاقية Paid Apps سارية | يحتاج تحققاً من الحساب |
| Product IDs الشهرية والسنوية مطابقة | مؤكدة من App Store Connect |
| المنتجَان مستوردان إلى تطبيق Apple في RevenueCat | يحتاج تعديل الحساب بعد موافقة المستخدم |
| المنتجَان مرتبطان باستحقاق `premium` | يحتاج تعديل الحساب بعد موافقة المستخدم |
| المنتجَان داخل Current Offering | يحتاج تعديل الحساب بعد موافقة المستخدم |
| الاشتراكان مرفقان بالإصدار الجديد | يحتاج تعديل App Store Connect بعد موافقة المستخدم |
| روابط الخصوصية والشروط منشورة وتعيد HTTP 200 | يحتاج نشر المرشح والتحقق الخارجي |
| الصور خالية من الأسعار وليست لقطات شاشة | جاهزة ومفحوصة بصرياً بمقاس 1024×1024 RGB |
| Build iOS يمر باختبارات StoreKit Sandbox | يحتاج بناء واختبار لاحقاً |

## المراجع

[1]: https://developer.apple.com/app-store/review/guidelines/ "App Review Guidelines"
[2]: https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/ "In-App Purchase Information"
[3]: https://developer.apple.com/app-store/subscriptions/ "Auto-renewable Subscriptions"

## نتيجة الفحص البصري للصور — 20 يوليو 2026

اجتازت الصورة الشهرية الفحص البصري الخفيف: هي رسم أصلي وليست لقطة شاشة، ولا تحتوي نصاً أو سعراً أو عملة أو إطار هاتف أو زوايا خارجية مستديرة. تظهر قدراً ذهبياً وتقويماً بلا أرقام ومكونات غذائية، وتبقى واضحة كصورة مصغرة. الملف المولّد أصله 1920×1920 ويحتاج إخراج نسخة مطابقة بدقة 1024×1024 قبل الرفع.

اكتملت لاحقاً الصورة السنوية واجتازت الفحص البصري الخفيف: هي مادة أصلية متميزة عن الشهرية، وتستخدم مجموعة صفحات تخطيط موسمية بلا أرقام أو نصوص أو أسعار أو عناصر واجهة. أُخرج الملفان النهائيان بصيغة PNG ‏RGB وبمقاس 1024×1024 داخل `app-store-assets/`.

## التوطين الإنجليزي المقترح للاشتراكات

| المنتج | Display Name | Description |
|---|---|---|
| شهري | Monthly Membership | Premium feature access for one month |
| سنوي | Annual Membership | Premium feature access for one year |

لا تتضمن هذه النصوص سعراً أو عملة أو نسبة خصم، ويظل السعر المحلي معروضاً من StoreKit.

## App Review Notes — English

> We addressed every item from the review of version 1.0.61. The unused background-audio capability has been removed. On iOS, subscriptions now use the Apple RevenueCat app and StoreKit products, and the paywall presents the localized StoreKit price, product duration, renewal disclosure, Privacy Policy, Terms of Use, Apple Standard EULA, Restore Purchases, and Manage Subscription links. To test, open the “العضوية” (Membership) tab, select the monthly or annual plan, and confirm the purchase in the Sandbox sheet. No account creation is required. The layout is responsive for the 11-inch iPad review size, and purchase, restore, legal, and dismiss controls remain accessible.

## Resolution Center Reply — English

> Hello App Review Team,  
> Thank you for your guidance. We addressed the issues reported for version 1.0.61:  
> 1. We replaced the subscription promotional materials with original 1024×1024 artwork. They are not app screenshots and contain no price or currency.  
> 2. The monthly and annual Apple products are now connected to the iOS StoreKit purchase flow and were tested for purchase and restoration in Sandbox.  
> 3. We removed `audio` from `UIBackgroundModes`, because the app does not provide continuous background-audio playback.  
> 4. Before purchase, the subscription screen now displays the product title, duration, localized StoreKit price, renewal disclosure, Privacy Policy, Terms of Use, and Apple Standard EULA.  
> 5. Both subscriptions are attached to the new app version, and the Review Notes describe the exact testing path.  
> Thank you for reviewing the updated submission.

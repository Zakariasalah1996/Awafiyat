# بحث: منبه حقيقي بصوت طويل في Expo

## المشكلة
- expo-notifications تستخدم NotificationCompat API
- Android يحد صوت الإشعار إلى 3-5 ثوانٍ فقط
- لا يمكن تشغيل صوت طويل (30 ثانية) عبر إشعار عادي

## الحلول الممكنة

### الحل 1: إشعار بأولوية قصوى + قناة alarm
- ضبط القناة على importance: MAX + sound: alarm.wav
- Android يسمح بصوت أطول في قنوات الأولوية القصوى
- لكن لا يزال محدوداً بطول ملف الصوت

### الحل 2: Headless Background Notification + تشغيل صوت
- استقبال إشعار في الخلفية (headless)
- تشغيل الصوت عبر expo-audio في الخلفية
- يحتاج background task

### الحل 3: Full-screen intent (الأفضل)
- إشعار بنمط "منبه" يظهر على كامل الشاشة حتى فوق شاشة القفل
- مثل منبه Google Clock
- يحتاج USE_FULL_SCREEN_INTENT permission
- expo-notifications يدعم androidPriority: "max"

### القرار
- سأستخدم مزيج من:
  1. ملف صوت WAV طويل (30 ثانية) كصوت الإشعار
  2. قناة Android بأولوية MAX + vibration pattern
  3. إشعار sticky (ongoing) لا يختفي حتى يضغط المستخدم
  4. عند فتح التطبيق من الإشعار → شاشة منبه كاملة مع صوت

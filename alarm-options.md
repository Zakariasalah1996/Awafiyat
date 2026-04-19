# خيارات المنبه الأصلي

## الخيار 1: expo-alarm-module (npm: expo-alarm-module)
- يدعم Expo config plugin
- يستخدم AlarmManager + MediaPlayer + Foreground Service
- يرن بصوت حقيقي حتى لو التطبيق مغلق
- scheduleAlarm() لجدولة منبه + stopAlarm() لإيقافه
- آخر تحديث: قبل سنة (v1.2.0)
- مختبر مع RN 0.64-0.73

## الخيار 2: expo-alarm (npm: expo-alarm) by alperengozum
- يستخدم Android AlarmClock intent
- setAlarm() يفتح تطبيق المنبه الأصلي في الهاتف
- لا يرن داخل التطبيق - يستخدم تطبيق الساعة الأصلي
- أحدث (v0.2.2) ويدعم expo-modules

## القرار: استخدام expo-alarm-module
- لأنه يرن داخل التطبيق بصوت مستمر (foreground service)
- يدعم config plugin للـ Expo
- يدعم جدولة المنبه + إيقافه برمجياً

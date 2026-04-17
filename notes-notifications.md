# ملاحظات إصلاح الإشعارات والمنبه

## صوت مخصص للإشعارات:
1. إضافة الصوت في app.config.ts plugins: ["expo-notifications", { "sounds": ["assets/alarm.wav"] }]
2. في القناة: sound: "alarm.wav"
3. في المحتوى: sound: "alarm.wav"
4. في trigger: channelId: "meals"

## جدولة إشعار يومي مع بيانات الوصفة:
- trigger: { type: DAILY, hour, minute }
- data: { type: "meal", mealType, recipeId, recipeName }

## التعامل مع الضغط على الإشعار:
- addNotificationResponseReceivedListener → response.notification.request.content.data → router.push("/sections/recipe-detail", { id: recipeId })

## المنبه الحالي:
- يدوي فقط (زر 🔔)
- اهتزاز فقط بدون صوت
- لا يوجد جدولة تلقائية

## المطلوب:
1. إضافة صوت alarm.wav في app.config.ts
2. تحديث notifications.ts: scheduleMealReminder يأخذ recipeId + recipeName
3. تحديث meal-planner.tsx: عند حفظ الجدول → جدولة إشعارات لكل وجبة مع بيانات الوصفة
4. تحديث _layout.tsx: عند الضغط على الإشعار → فتح صفحة الوصفة
5. تحديث startAlarm: تشغيل صوت alarm.wav بدل الاهتزاز فقط

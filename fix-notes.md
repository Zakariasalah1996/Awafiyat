# ملاحظات إصلاح لوحة التحكم

## المشكلة الرئيسية: قاعدة البيانات MySQL وليست PostgreSQL!

- DATABASE_URL: `mysql://JPBqbo33VQPZVp4.root:6BAlS8gOA9H1g9By7CPz@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/MMvdQJEHVXpvsqF4pAkPm2?ssl={"rejectUnauthorized":true}`
- TiDB Cloud يستخدم MySQL protocol على port 4000
- الكود الحالي يستخدم `pg` (PostgreSQL driver) + `drizzle-orm/pg-core`
- يجب تحويل إلى `mysql2` driver + `drizzle-orm/mysql-core`
- الجداول موجودة بالفعل في DB (users, push_tokens, subscriptions, etc.)
- webdev_execute_sql يعمل بنجاح (يستخدم mysql CLI مباشرة)

## الحل: تحويل server/db.ts من pg إلى mysql2

### الملفات التي تحتاج تعديل:
1. `server/db.ts` - تغيير من pg Pool إلى mysql2
2. `drizzle/schema.ts` - تغيير من pgTable/pgEnum إلى mysqlTable/mysqlEnum
3. `server/_core/index.ts` - أي imports من drizzle/schema
4. `package.json` - mysql2 موجود بالفعل! (لكن pg مستخدم حالياً)
5. `drizzle.config.ts` - تغيير dialect

### ملاحظات أخرى:
- CRUD الوصفات يعمل بشكل صحيح (file-based, لا يعتمد على DB)
- الإشعارات: channel mismatch - السيرفر يرسل على 'meals' لكن التطبيق يُنشئ channels أخرى
- يجب إضافة channel 'meals' أو 'admin_notifications' في lib/notifications.ts

## الجداول الموجودة:
- users, push_tokens, subscriptions, promo_codes, feedback, notifications, daily_stats, recipe_images, __drizzle_migrations

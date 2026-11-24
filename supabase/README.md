# ربط منصة SASA STORE | OMOR (عُمْر) بقاعدة بيانات Supabase

عند تشغيل المنصة بدون متغيرات بيئة Supabase، تعمل تلقائيًا في **وضع التجربة المحلي (Demo Mode)** وتوضح ذلك للمستخدم بشكل صريح دون حفظ البيانات على سحابة خارجية.

## خطوات الربط الحقيقي بـ Supabase:

1. أنشئ مشروعًا جديدًا على [Supabase](https://supabase.com).
2. افتح **SQL Editor** ونفّذ الملفين بالترتيب:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
3. من **Storage** أنشئ Buckets للملفات (بحد أقصى 5MB وصيغ `image/jpeg, image/png, image/webp, application/pdf`):
   - `device-images`
   - `repair-attachments`
   - `warranty-docs`
   - `avatars`
4. أضف المفاتيح العامة في متغيرات البيئة (`.env` أو لوحة الاستضافة):
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```
5. **تحذير أمني**: لا تضع `SUPABASE_SERVICE_ROLE_KEY` في الواجهة الأمامية أو في أي متغير يبدأ بـ `VITE_`.

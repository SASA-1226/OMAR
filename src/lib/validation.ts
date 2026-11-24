import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'الاسم يجب أن لا يقل عن حرفين').max(120, 'الاسم طويل جداً'),
  email: z.string().trim().email('البريد الإلكتروني غير صالح'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(72, 'كلمة المرور طويلة جداً'),
  role: z.enum(['user', 'technician', 'store']),
  city: z.string().trim().min(2, 'يرجى تحديد المدينة').max(60),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية',
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور مطلوبة'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
});

export const addDeviceSchema = z.object({
  category: z.enum(['smartphone', 'tablet', 'laptop', 'desktop', 'smartwatch', 'tv', 'home_appliance', 'other']),
  brand: z.string().trim().min(2, 'الشركة المصنعة مطلوبة').max(60),
  deviceName: z.string().trim().min(2, 'اسم الجهاز مطلوب').max(100),
  model: z.string().trim().min(1, 'موديل الجهاز مطلوب').max(80),
  modelNumber: z.string().trim().max(60).optional(),
  serialNumber: z.string().trim().max(64).optional(),
  imei: z
    .string()
    .trim()
    .refine((val) => val === '' || /^[0-9]{15}$/.test(val), {
      message: 'رقم IMEI يجب أن يتكون من 15 رقمًا بالضبط',
    })
    .optional(),
  purchaseDate: z.string().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'needs_repair']),
  sellerName: z.string().trim().max(100).optional(),
  privateNotes: z.string().trim().max(500).optional(),
});

export const repairRequestSchema = z.object({
  deviceId: z.string().min(1, 'اختر الجهاز'),
  technicianId: z.string().min(1, 'اختر الفني أو مركز الصيانة'),
  issueType: z.string().trim().min(2, 'حدد نوع المشكلة').max(100),
  faultDescription: z.string().trim().min(8, 'اكتب وصفًا واضحًا للعطل').max(1000),
});

export const repairRecordSchema = z.object({
  deviceId: z.string().min(1, 'الجهاز مطلوب'),
  issueType: z.string().trim().min(2, 'نوع المشكلة مطلوب').max(100),
  faultDescription: z.string().trim().min(4, 'وصف العطل مطلوب').max(1000),
  diagnosis: z.string().trim().min(4, 'التشخيص مطلوب').max(1000),
  actionTaken: z.string().trim().min(4, 'الإجراء المنفذ مطلوب').max(1000),
  repairCost: z.number().min(0).optional(),
  intakeDate: z.string().min(1, 'تاريخ الاستلام مطلوب'),
  deliveryDate: z.string().optional(),
  warrantyDays: z.number().int().min(0).max(3650),
  notes: z.string().trim().max(500).optional(),
});

export const warrantySchema = z.object({
  deviceId: z.string().min(1, 'اختر الجهاز المرتبط'),
  itemOrPartName: z.string().trim().min(2, 'اسم المنتج أو القطعة مطلوب').max(120),
  issuerName: z.string().trim().min(2, 'الجهة المصدرة مطلوبة').max(120),
  startDate: z.string().min(1, 'تاريخ البداية مطلوب'),
  endDate: z.string().min(1, 'تاريخ النهاية مطلوب'),
  warrantyNumber: z.string().trim().max(80).optional(),
  terms: z.string().trim().max(600).optional(),
});

export const listingSchema = z.object({
  deviceId: z.string().min(1, 'اختر الجهاز من أجهزتك'),
  title: z.string().trim().min(4, 'عنوان الإعلان مطلوب').max(120),
  price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  city: z.string().trim().min(2, 'المدينة مطلوبة').max(60),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'needs_repair']),
  description: z.string().trim().min(10, 'أضف وصفًا واضحًا لحالة الجهاز').max(1500),
  storeWarrantyDays: z.number().int().min(0).max(1095).default(0),
});

export const reportSchema = z.object({
  reason: z.enum([
    'suspicious_listing',
    'incorrect_device_data',
    'questionable_repair',
    'uncommitted_technician',
    'fake_account',
    'identity_impersonation',
    'fraud_attempt',
    'privacy_issue',
    'other',
  ]),
  description: z.string().trim().min(10, 'يرجى كتابة تفاصيل البلاغ (10 أحرف على الأقل)').max(1200),
});

export const ALLOWED_UPLOAD_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateUploadFile(file: File, allowPdf = false): { ok: true } | { ok: false; error: string } {
  const allowed: readonly string[] = allowPdf
    ? ALLOWED_UPLOAD_MIMES
    : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return {
      ok: false,
      error: allowPdf
        ? 'صيغة الملف غير مسموحة. الصيغ المدعومة: JPG, PNG, WEBP, PDF'
        : 'صيغة الصورة غير مسموحة. الصيغ المدعومة: JPG, PNG, WEBP',
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'حجم الملف يتجاوز الحد الأقصى المسموح (5 ميجابايت)' };
  }
  return { ok: true };
}

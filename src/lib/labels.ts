import type {
  DeviceCategorySlug,
  DeviceCondition,
  DeviceStatus,
  EventType,
  InspectionItemKey,
  InspectionItemStatus,
  RepairStatus,
  ReportReason,
  ReportStatus,
  TransferStatus,
  TrustSourceLevel,
  UserRole,
  VerificationTier,
  WarrantyStatus,
} from '../types/omor';

export const CATEGORY_LABELS: Record<DeviceCategorySlug, string> = {
  smartphone: 'هاتف ذكي',
  tablet: 'تابلت',
  laptop: 'لابتوب',
  desktop: 'كمبيوتر مكتبي',
  smartwatch: 'ساعة ذكية',
  tv: 'تلفزيون وشاشات',
  home_appliance: 'جهاز منزلي ذكي',
  other: 'أجهزة إلكترونية أخرى',
};

export const CONDITION_LABELS: Record<DeviceCondition, string> = {
  new: 'جديد',
  like_new: 'كالجديد',
  good: 'جيد جدًا',
  fair: 'مقبول / آثار استخدام',
  needs_repair: 'يحتاج صيانة',
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  active: 'نشط ومملوك',
  in_repair: 'قيد الصيانة',
  listed_for_sale: 'معروض للبيع',
  transferred: 'تم نقل ملكيته',
  reported_stolen: 'مُبلغ عن فقدانه / سرقته',
  archived: 'مؤرشف',
};

export const VERIFICATION_TIER_LABELS: Record<VerificationTier, string> = {
  self_recorded: 'معلومة أدخلها المستخدم (غير مُتحقَّق منها)',
  invoice_attached: 'معلومة مدعومة بإثبات / فاتورة',
  technician_verified: 'فحص أو صيانة موثقة من فني مسجل',
};

export const TRUST_SOURCE_LABELS: Record<TrustSourceLevel, string> = {
  user_entry: 'معلومة أدخلها المستخدم',
  evidence_backed: 'معلومة مدعومة بإثبات',
  technician_checked: 'فحص أجراه فني مسجل',
  verified_store: 'جهة أو متجر موثق',
};

export const TRUST_SOURCE_DESCRIPTIONS: Record<TrustSourceLevel, string> = {
  user_entry: 'أُدخلت بواسطة المالك نفسه ولم تتحقق منها جهة فنية أو متجر.',
  evidence_backed: 'مدعومة بصورة أو فاتورة أو مستند مرفق للمراجعة.',
  technician_checked: 'سجّلها فني أو مركز صيانة مسجل بالمنصة بتاريخ الفحص.',
  verified_store: 'صادرة من متجر أو شريك تم توثيق بياناته في المنصة.',
};

export const PLATFORM_TRUST_DISCLAIMER =
  'توثيق الحساب أو المتجر أو الفني يعني التحقق من بياناته المسجلة في المنصة ولا يُعد ضمانًا مطلقًا على الحالة المادية أو أصالة الجهاز؛ ويُرجى دائمًا إجراء المعاينة الميدانية وقت الشراء.';

export const INSPECTION_ITEM_KEYS: InspectionItemKey[] = [
  'screen',
  'touch',
  'battery',
  'cameras',
  'audio',
  'charging',
  'network',
  'sensors',
];

export const INSPECTION_ITEM_LABELS: Record<InspectionItemKey, string> = {
  screen: 'الشاشة والإضاءة والألوان',
  touch: 'استجابة اللمس',
  battery: 'البطارية ومعدل الاستهلاك',
  cameras: 'الكاميرات الأمامية والخلفية',
  audio: 'السماعات والميكروفون',
  charging: 'منفذ الشحن والبيانات',
  network: 'الشبكة والـ Wi-Fi والبلوتوث',
  sensors: 'الحساسات والبصمة والتقارب',
};

export const INSPECTION_STATUS_LABELS: Record<InspectionItemStatus, string> = {
  passed: 'سليم وقت الفحص',
  issue_found: 'به ملاحظة / خلل',
  not_tested: 'لم يتم فحصه',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  registered: 'تسجيل الجهاز',
  invoice_added: 'إضافة فاتورة شراء',
  warranty_started: 'بدء ضمان',
  warranty_expired: 'انتهاء ضمان',
  inspected: 'فحص جهاز',
  repaired: 'عملية صيانة',
  part_replaced: 'استبدال قطعة',
  condition_changed: 'تغيير حالة الجهاز',
  ownership_transferred: 'نقل ملكية',
  listed_for_sale: 'عرض الجهاز للبيع',
  sale_completed: 'إتمام البيع',
  note_added: 'إضافة ملاحظة',
  record_corrected: 'تصحيح سجل',
  lost_reported: 'بلاغ فقدان / سرقة',
  lost_cleared: 'إلغاء بلاغ الفقدان',
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  new: 'جديد',
  under_inspection: 'تحت الفحص',
  awaiting_customer_approval: 'بانتظار موافقة العميل',
  in_repair: 'جاري الإصلاح',
  repaired: 'تم الإصلاح',
  delivered: 'تم التسليم',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  active: 'فعال',
  expiring_soon: 'قرب الانتهاء',
  expired: 'منتهي',
  cancelled: 'ملغي',
  uncertain: 'غير مؤكد المصدر',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  pending: 'بانتظار قبول المشتري',
  buyer_accepted: 'قبل المشتري — بانتظار تأكيد المالك',
  completed: 'مكتمل ومنقول',
  cancelled: 'ملغي',
  expired: 'منتهي الصلاحية',
  disputed: 'مجمّد للمراجعة (نزاع)',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  suspicious_listing: 'إعلان مشبوه',
  incorrect_device_data: 'بيانات جهاز غير صحيحة',
  questionable_repair: 'سجل صيانة مشكوك فيه',
  uncommitted_technician: 'فني غير ملتزم',
  fake_account: 'حساب مزيف',
  identity_impersonation: 'انتحال شخصية أو متجر أو مركز صيانة',
  fraud_attempt: 'محاولة احتيال',
  privacy_issue: 'مشكلة خصوصية',
  other: 'أخرى',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  needs_info: 'يحتاج معلومات',
  resolved: 'تم الحل',
  rejected: 'مرفوض',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'مستخدم عادي',
  technician: 'فني صيانة',
  store: 'متجر / بائع أجهزة',
  admin: 'مدير النظام',
};

export const EGYPT_CITIES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'المنصورة',
  'طنطا',
  'الزقازيق',
  'شبين الكوم',
  'بنها',
  'دمنهور',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'الغردقة',
];

export function formatArabicDate(iso?: string): string {
  if (!iso) return 'غير محدد';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatArabicDateTime(iso?: string): string {
  if (!iso) return 'غير محدد';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return `${new Intl.NumberFormat('ar-EG').format(amount)} ${currency === 'EGP' ? 'ج.م' : currency}`;
}

export function computeWarrantyStatus(endDate: string, currentStatus?: WarrantyStatus): WarrantyStatus {
  if (currentStatus === 'cancelled' || currentStatus === 'uncertain') return currentStatus;
  const now = new Date();
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 'uncertain';
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'active';
}

export function getDaysRemaining(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

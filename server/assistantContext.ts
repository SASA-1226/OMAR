import { db, getAdminOverviewStats, getPublicBootstrap } from './db.ts';
import {
  getAdminRevenueAnalytics,
  listCatalogServices,
  listPaymentMethods,
  listUserEntitlements,
  listUserPaymentRequests,
} from './monetizationDb.ts';
import type { UserProfile } from '../src/types/omor.ts';

interface SafeRow {
  [key: string]: unknown;
}

export function buildAssistantPlatformContext(options: {
  appUser?: UserProfile | null;
  cmsAdminEmail?: string | null;
  currentPath?: string;
}): string {
  const { appUser, cmsAdminEmail, currentPath = '/' } = options;
  const isAdmin = Boolean(cmsAdminEmail || appUser?.role === 'admin');
  const bootstrap = getPublicBootstrap();
  const catalog = listCatalogServices(false);
  const paymentMethods = listPaymentMethods(true);

  const platformRow = db
    .prepare('SELECT allow_new_registrations, require_tech_verification, marketplace_enabled FROM app_platform_settings WHERE id = 1')
    .get() as SafeRow | undefined;

  const counts = {
    users: (db.prepare("SELECT COUNT(*) as c FROM app_users WHERE account_status = 'active'").get() as { c: number }).c,
    devices: (db.prepare("SELECT COUNT(*) as c FROM devices WHERE status != 'archived'").get() as { c: number }).c,
    repairs: (db.prepare('SELECT COUNT(*) as c FROM repair_records').get() as { c: number }).c,
    inspections: (db.prepare('SELECT COUNT(*) as c FROM device_inspections').get() as { c: number }).c,
    warranties: (db.prepare('SELECT COUNT(*) as c FROM warranties').get() as { c: number }).c,
    technicians: (db.prepare('SELECT COUNT(*) as c FROM technician_profiles').get() as { c: number }).c,
    verifiedTechnicians: (db.prepare('SELECT COUNT(*) as c FROM technician_profiles WHERE is_verified = 1').get() as { c: number }).c,
    activeListings: (db.prepare("SELECT COUNT(*) as c FROM marketplace_listings WHERE status = 'active'").get() as { c: number }).c,
    partners: (db.prepare('SELECT COUNT(*) as c FROM b2b_partners').get() as { c: number }).c,
    spareParts: (db.prepare('SELECT COUNT(*) as c FROM spare_part_stats').get() as { c: number }).c,
  };

  const catalogLines = catalog.map(
    (s) =>
      `- [${s.category}] ${s.name} (${s.code}): ${s.priceEgp} جنيه | المدة: ${s.durationDays > 0 ? `${s.durationDays} يوم` : 'لكل طلب'} | ${s.shortDesc}`
  );

  const paymentMethodLines = paymentMethods.map(
    (m) =>
      `- ${m.displayName} (${m.code}): حساب التحويل ${m.receiverAccount || 'غير محدد'} | المستفيد: ${m.beneficiaryName || 'إدارة صاصا ستور'} | ${m.instructions}`
  );

  const activePromos = (
    db
      .prepare("SELECT code, discount_type, discount_value, max_uses, used_count, expires_at FROM promo_codes WHERE is_active = 1 ORDER BY created_at DESC LIMIT 10")
      .all() as SafeRow[]
  ).filter((p) => Number(p.used_count || 0) < Number(p.max_uses || 1));

  const promoLines = activePromos.map(
    (p) =>
      `- كود ${String(p.code)}: خصم ${String(p.discount_value)}${p.discount_type === 'percent' ? '%' : ' جنيه'}${p.expires_at ? ` (ينتهي ${String(p.expires_at).slice(0, 10)})` : ''}`
  );

  const techRows = db
    .prepare(
      'SELECT center_name, display_name, governorate, district, is_verified, is_pro, verified_repairs_count, specialties_json FROM technician_profiles ORDER BY is_verified DESC, is_pro DESC, verified_repairs_count DESC LIMIT 12'
    )
    .all() as SafeRow[];
  const techLines = techRows.map((t) => {
    let specs = '';
    try {
      specs = (JSON.parse(String(t.specialties_json || '[]')) as string[]).slice(0, 3).join('، ');
    } catch {
      specs = '';
    }
    return `- ${String(t.center_name)} (${String(t.display_name)}) — ${String(t.governorate)}/${String(t.district)} | ${t.is_verified ? 'موثق' : 'مسجل'}${t.is_pro ? ' + Pro' : ''} | صيانات موثقة: ${Number(t.verified_repairs_count || 0)}${specs ? ` | التخصصات: ${specs}` : ''}`;
  });

  const listingRows = db
    .prepare(
      "SELECT title, brand, model, asking_price_egp, city, condition, store_warranty_days, is_featured FROM marketplace_listings WHERE status = 'active' ORDER BY is_featured DESC, created_at DESC LIMIT 12"
    )
    .all() as SafeRow[];
  const listingLines = listingRows.map(
    (l) =>
      `- ${String(l.title)} (${String(l.brand)} ${String(l.model)}) — ${Number(l.asking_price_egp)} جنيه | ${String(l.city)} | الحالة: ${String(l.condition)} | ضمان: ${Number(l.store_warranty_days || 0)} يوم${l.is_featured ? ' [إعلان مميز]' : ''}`
  );

  const partRows = db
    .prepare(
      'SELECT brand, device_model_pattern, part_name, origin, min_price_egp, avg_price_egp, max_price_egp, warranty_days FROM spare_part_stats ORDER BY samples_count DESC LIMIT 12'
    )
    .all() as SafeRow[];
  const partLines = partRows.map(
    (p) =>
      `- ${String(p.brand)} (${String(p.device_model_pattern)}) — ${String(p.part_name)} [${String(p.origin)}]: من ${Number(p.min_price_egp)} إلى ${Number(p.max_price_egp)} جنيه (المتوسط ${Number(p.avg_price_egp)} ج) | ضمان ${Number(p.warranty_days || 0)} يوم`
  );

  const partnerRows = db
    .prepare('SELECT company_name, partner_type, governorate, branches_count, sla_hours, is_verified FROM b2b_partners ORDER BY is_verified DESC LIMIT 8')
    .all() as SafeRow[];
  const partnerLines = partnerRows.map(
    (b) =>
      `- ${String(b.company_name)} (${String(b.partner_type)}) — ${String(b.governorate)} | ${Number(b.branches_count || 1)} فرع | SLA ${Number(b.sla_hours || 24)} ساعة | ${b.is_verified ? 'شريك موثق' : 'قيد المراجعة'}`
  );

  const articleLines = bootstrap.articles
    .slice(0, 10)
    .map((a) => `- «${a.title}» (/articles/${a.slug}): ${a.excerpt}`);

  const offerLines = bootstrap.affiliates
    .slice(0, 8)
    .map((o) => `- ${o.title} (${o.category}): ${o.priceEgp} جنيه عبر ${o.networkLabel}`);

  const sections: string[] = [
    `[بيانات المنصة الحية من قاعدة البيانات الآن]`,
    `- اسم المنصة: ${bootstrap.settings.siteBrandPrefix} | ${bootstrap.settings.siteName} — الشعار: "${bootstrap.settings.slogan}"`,
    `- المطور والمؤسس: مصطفى محمد — صاحب صاصا ستور (صفحة /platform-guide)`,
    `- الدعم الفني الرسمي وواتساب وأورنج كاش: ${bootstrap.settings.contactPhone} | البريد: ${bootstrap.settings.contactEmail}`,
    `- إعدادات المنصة: السوق=${platformRow?.marketplace_enabled === 0 ? 'متوقف' : 'مفعل'} | التسجيل=${platformRow?.allow_new_registrations === 0 ? 'مغلق' : 'مفتوح'} | الإعلانات=${bootstrap.settings.sectionFlags.ads ? 'مفعلة' : 'معطلة'} | الباقات المدفوعة=${bootstrap.settings.paidPlansEnabled ? 'مفعلة' : 'متوقفة'}`,
    `- إحصائيات حية: مستخدمون نشطون=${counts.users}، أجهزة مسجلة=${counts.devices}، سجلات صيانة=${counts.repairs}، فحوصات ما قبل الشراء=${counts.inspections}، ضمانات=${counts.warranties}، فنيون ومراكز=${counts.technicians} (موثقون=${counts.verifiedTechnicians})، إعلانات سوق نشطة=${counts.activeListings}، شركاء B2B=${counts.partners}، أسعار قطع غيار=${counts.spareParts}`,
    `- المسار الحالي للمستخدم: ${currentPath}`,
    '',
    `[خريطة صفحات المنصة]`,
    `/devices (محفظة أجهزتي)، /devices/new (تسجيل جهاز جديد + QR)، /inspections (فحص قبل الشراء 8 نقاط)، /repairs و /repairs/request (توثيق وطلبات الصيانة)، /warranties (الضمانات)، /market (سوق الأجهزة الموثق)، /transfer (نقل الملكية برمز 15 دقيقة)، /technicians (دليل الفنيين والمراكز)، /services (مركز الخدمات المدفوعة OMOR Premium)، /my-payments (مدفوعاتي واشتراكاتي والتقارير)، /v3/diagnose (تشخيص الأعطال بالذكاء الاصطناعي)، /v3/valuation (تقدير السعر العادل)، /v3/history (تحليل تاريخ الجهاز)، /v3/risk-report (تقرير مخاطر الشراء)، /v3/parts-stats (أسعار قطع الغيار)، /v3/partners (شبكة الشركات B2B)، /articles (المقالات)، /offers (العروض والمنتجات)، /platform-guide (شرح المنصة والمطور)، /help (مركز المساعدة)، /settings (الإعدادات).`,
    '',
    `[الخدمات والباقات المدفوعة المتاحة حاليًا (${catalogLines.length} خدمة/باقة)]`,
    ...(catalogLines.length > 0 ? catalogLines : ['- لا توجد خدمات مفعلة حاليًا']),
    '',
    `[وسائل الدفع المفعّلة]`,
    ...(paymentMethodLines.length > 0 ? paymentMethodLines : ['- أورنج كاش 01214899889 بالمراجعة اليدوية']),
    ...(promoLines.length > 0 ? ['', `[أكواد الخصم النشطة]`, ...promoLines] : []),
    '',
    `[أبرز الفنيين ومراكز الصيانة]`,
    ...(techLines.length > 0 ? techLines : ['- لا توجد مراكز مسجلة بعد']),
    '',
    `[أحدث إعلانات السوق OMOR MARKET]`,
    ...(listingLines.length > 0 ? listingLines : ['- لا توجد إعلانات نشطة حاليًا']),
    '',
    `[متوسط أسعار قطع الغيار المسجلة في السوق المصري]`,
    ...(partLines.length > 0 ? partLines : ['- لا توجد ملاحظات أسعار مسجلة بعد']),
    '',
    `[شركاء B2B ومراكز الشبكة]`,
    ...(partnerLines.length > 0 ? partnerLines : ['- لا توجد شركات مرتبطة بعد']),
    '',
    `[أحدث المقالات التقنية المنشورة (/articles)]`,
    ...(articleLines.length > 0 ? articleLines : ['- لا توجد مقالات منشورة بعد']),
    '',
    `[أحدث العروض والمنتجات المقترحة (/offers)]`,
    ...(offerLines.length > 0 ? offerLines : ['- لا توجد عروض حاليًا']),
  ];

  // Role-scoped authenticated user data (privacy-safe: only caller's own records)
  if (appUser) {
    const myDevices = db
      .prepare(
        "SELECT id, device_code, brand, device_name, model, condition, status, verification_tier FROM devices WHERE owner_id = ? AND status != 'archived' ORDER BY updated_at DESC LIMIT 15"
      )
      .all(appUser.id) as SafeRow[];
    const myEnts = listUserEntitlements(appUser.id).filter((e) => e.status === 'active');
    const myPayReqs = listUserPaymentRequests(appUser.id).slice(0, 8);
    const myReminders = db
      .prepare(
        "SELECT title, next_due_date, is_completed FROM maintenance_reminders WHERE owner_id = ? ORDER BY is_completed ASC, next_due_date ASC LIMIT 8"
      )
      .all(appUser.id) as SafeRow[];
    const myWarranties = db
      .prepare(
        'SELECT item_or_part_name, issuer_name, end_date, status FROM warranties WHERE owner_id = ? ORDER BY end_date ASC LIMIT 10'
      )
      .all(appUser.id) as SafeRow[];

    sections.push(
      '',
      `[بيانات المستخدم الحالي المسجل الآن (سرية ومخصصة له فقط)]`,
      `- الاسم: ${appUser.fullName} | الدور: ${appUser.role} | المدينة: ${appUser.city} | كود الحساب: ${appUser.id}`,
      `- باقاته/خدماته المفعلة حاليًا (${myEnts.length}): ${
        myEnts.length > 0
          ? myEnts.map((e) => `${e.serviceName} (ينتهي ${e.expiresAt.slice(0, 10)}${e.isTrial ? ' - تجربة مجانية' : ''})`).join(' | ')
          : 'لا توجد باقات مدفوعة مفعلة حاليًا'
      }`,
      `- طلبات الدفع الخاصة به (${myPayReqs.length}): ${
        myPayReqs.length > 0
          ? myPayReqs
              .map(
                (p) =>
                  `${p.id}: ${p.serviceName} (${p.transferredAmountEgp} ج - الحالة: ${p.status}${p.rejectionReason ? ` - سبب الرفض: ${p.rejectionReason}` : ''})`
              )
              .join(' | ')
          : 'لا توجد طلبات دفع سابقة'
      }`,
      `- أجهزته المسجلة (${myDevices.length}): ${
        myDevices.length > 0
          ? myDevices
              .map(
                (d) =>
                  `${String(d.brand)} ${String(d.device_name)} [${String(d.device_code)}] — الحالة: ${String(d.status)} | التوثيق: ${String(d.verification_tier)}`
              )
              .join(' | ')
          : 'لم يسجل أجهزة بعد'
      }`,
      `- ضمانات أجهزته (${myWarranties.length}): ${
        myWarranties.length > 0
          ? myWarranties.map((w) => `${String(w.item_or_part_name)} (${String(w.issuer_name)}) ينتهي ${String(w.end_date).slice(0, 10)} [${String(w.status)}]`).join(' | ')
          : 'لا توجد ضمانات مسجلة'
      }`,
      `- تذكيرات الصيانة (${myReminders.length}): ${
        myReminders.length > 0
          ? myReminders.map((r) => `${String(r.title)} (${String(r.next_due_date).slice(0, 10)} - ${r.is_completed ? 'مكتمل' : 'قائم'})`).join(' | ')
          : 'لا توجد تذكيرات'
      }`
    );
  }

  // Admin-only full KPIs & pending queue overview
  if (isAdmin) {
    const revSummary = getAdminRevenueAnalytics();
    const cmsStats = getAdminOverviewStats();
    const pendingReqs = db
      .prepare("SELECT id, user_name, service_name, expected_amount_egp, transferred_amount_egp, created_at FROM payment_requests WHERE status IN ('pending_review','needs_more_proof') ORDER BY created_at DESC LIMIT 10")
      .all() as SafeRow[];
    const openReportsCount = (db.prepare("SELECT COUNT(*) as c FROM trust_reports WHERE status = 'open'").get() as { c: number }).c;

    sections.push(
      '',
      `[بيانات الإدارة الشاملة (متاحة لمدير المنصة فقط)]`,
      `- بريد الإدارة: ${cmsAdminEmail || appUser?.email || 'مدير المنصة'}`,
      `- الأرباح المؤكدة الإجمالية (Approved فقط): ${revSummary.confirmedRevenueEgp} جنيه | أرباح هذا الشهر المؤكدة: ${revSummary.confirmedRevenueThisMonthEgp} جنيه | طلبات مقبولة=${revSummary.approvedCount} | طلبات مرفوضة=${revSummary.rejectedCount} | طلبات قيد الانتظار=${revSummary.pendingReviewCount} (بقيمة منتظرة غير محتسبة=${revSummary.pendingAmountEgp} ج) | اشتراكات وصلاحيات نشطة=${revSummary.activeEntitlementsCount}`,
      `- زيارات المنصة المسجلة: إجمالي=${cmsStats.traffic.totalVisits} | اليوم=${cmsStats.traffic.todayVisits} | رسائل تواصل غير مقروءة=${cmsStats.inbox.unreadMessages} | بلاغات مفتوحة=${openReportsCount}`,
      `- أحدث طلبات الدفع المنتظرة للمراجعة (${pendingReqs.length}): ${
        pendingReqs.length > 0
          ? pendingReqs.map((r) => `${String(r.id)} من ${String(r.user_name)} على ${String(r.service_name)} (${Number(r.transferred_amount_egp)} ج)`).join(' | ')
          : 'لا توجد طلبات منتظرة حاليًا'
      }`
    );
  }

  return sections.join('\n');
}

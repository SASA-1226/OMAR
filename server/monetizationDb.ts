import crypto from 'node:crypto';
import { db } from './db.ts';
import type {
  DynamicPaidServiceItem,
  PaidBillingPeriod,
  PaidCatalogCategory,
  PaymentMethodConfigItem,
  PaymentMethodOption,
  PaymentProofRequest,
  PaymentRequestStatus,
  PromoCodeItem,
  RevenueAnalyticsSummary,
  UserEntitlement,
  UserProfile,
  UserRole,
} from '../src/types/omor.ts';

db.exec(`
  CREATE TABLE IF NOT EXISTS paid_services_catalog (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('customer', 'technician', 'store', 'verification_reports', 'future')),
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'package')),
    name TEXT NOT NULL,
    short_desc TEXT NOT NULL,
    features_json TEXT NOT NULL,
    price_egp REAL NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('one_time', 'monthly', 'yearly', 'custom')),
    duration_days INTEGER NOT NULL DEFAULT 30,
    quota_credits INTEGER NOT NULL DEFAULT 0,
    requires_device INTEGER NOT NULL DEFAULT 0,
    requires_listing INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_methods_config (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    receiver_account TEXT NOT NULL DEFAULT '',
    beneficiary_name TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    requires_manual_proof INTEGER NOT NULL DEFAULT 1,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_egp')),
    discount_value REAL NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 100,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_account_code TEXT NOT NULL,
    user_role TEXT NOT NULL,
    service_id TEXT NOT NULL,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT NOT NULL,
    target_device_id TEXT,
    target_listing_id TEXT,
    payment_method TEXT NOT NULL,
    receiver_wallet TEXT NOT NULL,
    sender_wallet_phone TEXT NOT NULL,
    original_amount_egp REAL NOT NULL,
    promo_code TEXT,
    discount_amount_egp REAL NOT NULL DEFAULT 0,
    expected_amount_egp REAL NOT NULL,
    transferred_amount_egp REAL NOT NULL,
    reference_number TEXT,
    transfer_datetime TEXT NOT NULL,
    screenshot_data_url TEXT NOT NULL,
    screenshot_hash TEXT NOT NULL,
    user_note TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending_review', 'needs_more_proof', 'approved', 'rejected')),
    admin_note TEXT,
    rejection_reason TEXT,
    reviewed_by_admin_id TEXT,
    reviewed_by_admin_name TEXT,
    reviewed_at TEXT,
    activated_entitlement_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_entitlements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT NOT NULL,
    item_type TEXT NOT NULL,
    billing_period TEXT NOT NULL,
    paid_amount_egp REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    is_trial INTEGER NOT NULL DEFAULT 0,
    granted_by_admin INTEGER NOT NULL DEFAULT 0,
    source_payment_id TEXT,
    target_device_id TEXT,
    target_listing_id TEXT,
    starts_at TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL
  );
`);

function nowIso(): string {
  return new Date().toISOString();
}

function addDaysFromIso(startIso: string, days: number): string {
  const d = new Date(startIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function safeJson<T>(raw: unknown, fallback: T): T {
  try {
    if (typeof raw !== 'string' || !raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function seedMonetizationDefaults(): void {
  const ts = nowIso();

  // 1. Seed extensible payment methods (Orange Cash active with 01214899889)
  const pmCount = (db.prepare('SELECT COUNT(*) as c FROM payment_methods_config').get() as { c: number }).c;
  if (pmCount === 0) {
    const insPm = db.prepare(
      `INSERT INTO payment_methods_config (code, display_name, receiver_account, beneficiary_name, instructions, requires_manual_proof, is_enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insPm.run(
      'orange_cash',
      'أورنج كاش (Orange Cash)',
      '01214899889',
      'مصطفى محمد — SASA STORE / OMOR',
      'حوّل المبلغ المطلوب بالضبط عبر محفظة أورنج كاش إلى الرقم 01214899889 ثم اضغط «لقد قمت بالتحويل» وأرفق لقطة شاشة لإثبات التحويل للمراجعة اليدوية.',
      1,
      1,
      1,
      ts
    );
    insPm.run(
      'vodafone_cash',
      'محافظ إلكترونية أخرى (Vodafone / Etisalat Cash)',
      '',
      'SASA STORE / OMOR',
      'وسيلة قابلة للتفعيل من لوحة الإدارة بإضافة رقم المحفظة المعتمد.',
      1,
      0,
      2,
      ts
    );
    insPm.run(
      'instapay',
      'إنستاباي (InstaPay)',
      '',
      'SASA STORE / OMOR',
      'وسيلة تحويل بنكي فوري قابلة للتفعيل من لوحة الإدارة.',
      1,
      0,
      3,
      ts
    );
    insPm.run(
      'bank_card',
      'بطاقات بنكية / بوابة دفع إلكترونية',
      '',
      'SASA STORE / OMOR',
      'دفع إلكتروني مباشر بالبطاقات البنكية (قابل للربط والتفعيل من الإدارة).',
      0,
      0,
      4,
      ts
    );
  }

  // 2. Seed dynamic paid services & packages catalog across all 5 categories
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM paid_services_catalog').get() as { c: number }).c;
  if (catCount === 0) {
    const insSvc = db.prepare(
      `INSERT INTO paid_services_catalog
       (id, code, category, item_type, name, short_desc, features_json, price_egp, billing_period, duration_days, quota_credits, requires_device, requires_listing, is_active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const defaults: Array<{
      id: string;
      code: string;
      category: PaidCatalogCategory;
      itemType: 'service' | 'package';
      name: string;
      shortDesc: string;
      features: string[];
      priceEgp: number;
      billingPeriod: PaidBillingPeriod;
      durationDays: number;
      quotaCredits: number;
      requiresDevice: boolean;
      requiresListing: boolean;
      isActive: boolean;
      sortOrder: number;
    }> = [
      // 1) خدمات الأفراد والعملاء
      {
        id: 'SVC-CUST-PREM-M',
        code: 'cust_premium_monthly',
        category: 'customer',
        itemType: 'package',
        name: 'اشتراك OMOR Premium للأفراد (شهري)',
        shortDesc: 'باقة شهرية تمنحك سعة أكبر لحفظ الأجهزة وتقارير احترافية ومقارنة متقدمة.',
        features: [
          'حفظ حتى 25 جهازًا داخل محفظة حسابك',
          'تقارير احترافية ومفصلة لحالة الجهاز وقبل البيع',
          'سجل صيانة متقدم وشهادات رقمية قابلة للمشاركة',
          'أدوات مقارنة الأجهزة وتقارير التقييم السعري',
        ],
        priceEgp: 79,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 15,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 10,
      },
      {
        id: 'SVC-CUST-PREM-Y',
        code: 'cust_premium_yearly',
        category: 'customer',
        itemType: 'package',
        name: 'اشتراك OMOR Premium للأفراد (سنوي)',
        shortDesc: 'عام كامل من مزايا OMOR Premium للأفراد مع توفير شهرين.',
        features: [
          'جميع مزايا باقة Premium للأفراد لمدة 365 يومًا',
          'أولوية في مراجعة الطلبات والدعم الفني',
          '35 رصيد تحليل ذكي للأعطال والتسعير',
        ],
        priceEgp: 790,
        billingPeriod: 'yearly',
        durationDays: 365,
        quotaCredits: 35,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 11,
      },
      {
        id: 'SVC-CUST-DEV-PACK',
        code: 'cust_extra_devices',
        category: 'customer',
        itemType: 'service',
        name: 'توسعة محفظة الأجهزة (+15 جهاز إضافي)',
        shortDesc: 'أضف مساحة لـ 15 جهازًا إضافيًا في حسابك لمتابعة أجهزة العائلة أو العمل.',
        features: [
          'زيادة حد حفظ الأجهزة في حسابك لمدة سنة',
          'مزامنة الضمانات والتنبيهات الدورية لكل جهاز',
        ],
        priceEgp: 49,
        billingPeriod: 'yearly',
        durationDays: 365,
        quotaCredits: 0,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 12,
      },
      {
        id: 'SVC-CUST-SALE-REP',
        code: 'cust_pro_sale_report',
        category: 'customer',
        itemType: 'service',
        name: 'تقرير بيع احترافي وشهادة رقمية للجهاز',
        shortDesc: 'تقرير بيع منظم قابل للطباعة والمشاركة يوضح سجل الجهاز الفعلي ومستوى توثيقه.',
        features: [
          'عرض السجل الفعلي وحالة الفحوصات والصيانات المعتمدة',
          'تمييز واضح بين البيانات المؤكدة والمدخلة يدويًا',
          'رابط تحقق آمن للعرض على المشتري',
        ],
        priceEgp: 35,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 1,
        requiresDevice: true,
        requiresListing: false,
        isActive: true,
        sortOrder: 13,
      },

      // 2) خدمات الفنيين ومراكز الصيانة
      {
        id: 'SVC-TECH-PRO-M',
        code: 'tech_pro_monthly',
        category: 'technician',
        itemType: 'package',
        name: 'باقة الفني ومركز الصيانة Pro (شهري)',
        shortDesc: 'ملف فني احترافي مع استقبال طلبات العملاء وتوثيق الصيانة وأولوية الظهور.',
        features: [
          'صفحة عامة احترافية لمركز الصيانة وتخصصاته',
          'استقبال طلبات الصيانة وتوثيق السجلات بالصور والقطع',
          'شارة «فني موثق Pro» بعد مراجعة الإدارة للمستندات',
          'أولوية الظهور في نتائج البحث ودليل الفنيين',
        ],
        priceEgp: 199,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 30,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 20,
      },
      {
        id: 'SVC-TECH-PRO-Y',
        code: 'tech_pro_yearly',
        category: 'technician',
        itemType: 'package',
        name: 'باقة الفني ومركز الصيانة Pro (سنوي)',
        shortDesc: 'اشتراك سنوي متكامل لمراكز الصيانة النشطة بأولوية دائمة وتوفير شهرين.',
        features: [
          'كافة مزايا باقة فني Pro لمدة 365 يومًا',
          'إصدار تقارير صيانة احترافية للعملاء',
          'رصيد +80 تحليل ذكي لتشخيص الأعطال',
        ],
        priceEgp: 1990,
        billingPeriod: 'yearly',
        durationDays: 365,
        quotaCredits: 80,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 21,
      },
      {
        id: 'SVC-TECH-SPOT',
        code: 'tech_spotlight',
        category: 'technician',
        itemType: 'service',
        name: 'ترويج مركز الصيانة في صدارة الدليل (14 يومًا)',
        shortDesc: 'يُبرز مركزك في القسم الموصى به أعلى دليل الفنيين لمدة 14 يومًا.',
        features: [
          'أولوية عرض في دليل /technicians بمحافظتك',
          'شارة «مركز مميّز» الذهبية بجانب اسم المركز',
        ],
        priceEgp: 150,
        billingPeriod: 'custom',
        durationDays: 14,
        quotaCredits: 0,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 22,
      },
      {
        id: 'SVC-TECH-LEADS',
        code: 'tech_priority_leads',
        category: 'technician',
        itemType: 'service',
        name: 'أولوية ترشيح طلبات الصيانة (30 يومًا)',
        shortDesc: 'ترشيح متقدم لمركزك في نموذج طلبات الصيانة الجديدة.',
        features: [
          'ظهور في أعلى اختيارات العملاء عند طلب الصيانة',
          'شارة «استجابة سريعة وأولوية ترشيح»',
        ],
        priceEgp: 180,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 0,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 23,
      },
      {
        id: 'SVC-TECH-AI',
        code: 'tech_ai_pack',
        category: 'technician',
        itemType: 'service',
        name: 'حزمة 25 تشخيص ذكي وتقارير فحص عملاء',
        shortDesc: 'رصيد تشخيص ذكي للأعطال والصور عبر OMOR V3 وتنظيم تقارير الفحص.',
        features: [
          '25 رصيد تشخيص ذكي دائم الصلاحية',
          'تحليل الأعطال والقطع المتوقعة قبل فتح الجهاز',
        ],
        priceEgp: 95,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 25,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 24,
      },

      // 3) خدمات التجار ومحلات الموبايلات
      {
        id: 'SVC-STORE-PRO-M',
        code: 'store_pro_monthly',
        category: 'store',
        itemType: 'package',
        name: 'باقة التاجر ومحلات الموبايلات Pro (شهري)',
        shortDesc: 'صفحة متجر مخصصة وإدارة أجهزة البيع وإصدار QR وتقارير حالة للعملاء.',
        features: [
          'صفحة خاصة بالمحل وعرضه داخل دليل التجار',
          'توثيق الأجهزة المتاحة للبيع وإصدار QR لكل جهاز',
          'إضافة بيانات الفواتير والضمان وإحصائيات تفاعل المتجر',
          'أولوية ظهور إعلانات المتجر في OMOR MARKET',
        ],
        priceEgp: 299,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 40,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 30,
      },
      {
        id: 'SVC-STORE-PRO-Y',
        code: 'store_pro_yearly',
        category: 'store',
        itemType: 'package',
        name: 'باقة التاجر ومحلات الموبايلات Pro (سنوي)',
        shortDesc: 'اشتراك سنوي للمتاجر النشطة بخصم شهرين وسعة غير محدودة للأجهزة.',
        features: [
          'جميع مزايا باقة التاجر Pro لمدة 365 يومًا',
          'إحصائيات الزيارات والتفاعل وتصدير تقارير حالة للعملاء',
          '100 رصيد تحليل مخاطر قبل شراء المستعمل للمحل',
        ],
        priceEgp: 2990,
        billingPeriod: 'yearly',
        durationDays: 365,
        quotaCredits: 100,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 31,
      },
      {
        id: 'SVC-STORE-FEAT',
        code: 'store_feature_listing',
        category: 'store',
        itemType: 'service',
        name: 'تمييز إعلان جهاز في صدارة السوق (7 أيام)',
        shortDesc: 'تثبيت إعلان جهازك أعلى OMOR MARKET بشارة ذهبية لمدة 7 أيام.',
        features: [
          'ظهور متقدم أعلى قائمة السوق',
          'شارة «إعلان مميّز» لجذب المشترين',
        ],
        priceEgp: 75,
        billingPeriod: 'custom',
        durationDays: 7,
        quotaCredits: 0,
        requiresDevice: false,
        requiresListing: true,
        isActive: true,
        sortOrder: 32,
      },
      {
        id: 'SVC-STORE-STAMP',
        code: 'store_certified_stamp',
        category: 'store',
        itemType: 'service',
        name: 'ختم اعتماد وتقرير حالة جهاز التاجر',
        shortDesc: 'إضافة شارة «مفحوص ومعتمد» على الإعلان وربطه بتقرير الفحص والضمان.',
        features: [
          'إبراز فحص المتجر وسياسة الضمان على البطاقة',
          'تعزيز شفافية الإعلان أمام المشتري',
        ],
        priceEgp: 60,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 0,
        requiresDevice: false,
        requiresListing: true,
        isActive: true,
        sortOrder: 33,
      },
      {
        id: 'SVC-STORE-RISK',
        code: 'store_risk_pack',
        category: 'store',
        itemType: 'service',
        name: 'حزمة 15 تقرير فحص مخاطر الشراء للمتاجر',
        shortDesc: '15 رصيدًا إضافيًا لتحليل المخاطر والسعر العادل قبل شراء الأجهزة المستعملة.',
        features: [
          'كشف البلاغات وسجلات الإصلاح السابقة قبل الاستحواذ',
          'رصيد دائم لا ينتهي بانتهاء الشهر',
        ],
        priceEgp: 120,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 15,
        requiresDevice: false,
        requiresListing: false,
        isActive: true,
        sortOrder: 34,
      },

      // 4) خدمات التوثيق والتقارير
      {
        id: 'SVC-REP-PREBUY',
        code: 'rep_pre_purchase',
        category: 'verification_reports',
        itemType: 'service',
        name: 'تقرير فحص جهاز قبل الشراء (PDF احترافي)',
        shortDesc: 'تقرير شامل بنتائج الفحص الـ 8 ونواقص الفحص، مبني على البيانات الفعلية دون ادعاء ضمان مطلق.',
        features: [
          'توثيق حالة الشاشة، اللمس، البطارية، الكاميرات، الصوت، الشحن، الشبكة والحساسات',
          'بيان واضح للأجزاء التي لم تُفحص ومصدر كل معلومة',
          'جاهز للطباعة والحفظ كـ PDF',
        ],
        priceEgp: 40,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 1,
        requiresDevice: true,
        requiresListing: false,
        isActive: true,
        sortOrder: 40,
      },
      {
        id: 'SVC-REP-MAINT',
        code: 'rep_maintenance_history',
        category: 'verification_reports',
        itemType: 'service',
        name: 'تقرير سجل الصيانة الموثق القابل للطباعة',
        shortDesc: 'ملف تاريخ الصيانات والقطع المستبدلة وسجلات التصحيح المعتمدة من المالك.',
        features: [
          'يعرض الصيانات المعتمدة ومستوى التحقق لكل عملية',
          'يفصل بين البيانات الموثقة والمدخلة يدويًا',
        ],
        priceEgp: 30,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 1,
        requiresDevice: true,
        requiresListing: false,
        isActive: true,
        sortOrder: 41,
      },
      {
        id: 'SVC-REP-CERT',
        code: 'rep_digital_certificate',
        category: 'verification_reports',
        itemType: 'service',
        name: 'شهادة السجل الرقمي القابلة للمشاركة (QR & PDF)',
        shortDesc: 'شهادة رسمية بسجل الجهاز على OMOR مرتبطة برمز تحقق QR آمن.',
        features: [
          'ملخص بيانات الجهاز والضمان والفحوصات الموثقة فقط',
          'عدم ادعاء أصالة أو سلامة مطلقة إلا بدعم فحص موثق',
        ],
        priceEgp: 45,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 1,
        requiresDevice: true,
        requiresListing: false,
        isActive: true,
        sortOrder: 42,
      },
      {
        id: 'SVC-REP-COMP',
        code: 'rep_device_comparison',
        category: 'verification_reports',
        itemType: 'service',
        name: 'تقرير مقارنة الأجهزة والتقييم السعري',
        shortDesc: 'مقارنة استرشادية للقيمة السوقية وسجل الأعطال بين أجهزتك أو قبل الشراء.',
        features: [
          'تحليل النطاق السعري العادل حسب الحالة وسجل الصيانة',
          'مناسب للمشتري والمقيمين في السوق المصري',
        ],
        priceEgp: 25,
        billingPeriod: 'one_time',
        durationDays: 0,
        quotaCredits: 1,
        requiresDevice: true,
        requiresListing: false,
        isActive: true,
        sortOrder: 43,
      },

      // 5) خدمات إضافية مستقبلية (Admin can toggle isActive whenever ready)
      {
        id: 'SVC-FUT-API',
        code: 'future_b2b_api',
        category: 'future',
        itemType: 'package',
        name: 'ربط API وإدارة أسطول أجهزة الشركات (Enterprise)',
        shortDesc: 'واجهة برمجية للشركات والموزعين لمزامنة عهدة الأجهزة وسجلات الصيانة.',
        features: [
          'مفاتيح API وWebhooks مخصصة لإدارة الأساطيل',
          'تقارير مجمعة وتعدد الفروع والصلاحيات',
        ],
        priceEgp: 950,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 200,
        requiresDevice: false,
        requiresListing: false,
        isActive: false,
        sortOrder: 50,
      },
      {
        id: 'SVC-FUT-WAR',
        code: 'future_warranty_partner',
        category: 'future',
        itemType: 'service',
        name: 'ربط بوليصة ضمان ممتد للشركاء المعتمدين',
        shortDesc: 'تفعيل وثائق الضمان الممتد المرتبطة برقم سجل OMOR.',
        features: [
          'إصدار وثائق ضمان ممتد رقمية مربوطة بالفحص',
          'متابعة المطالبات عبر سجل الجهاز',
        ],
        priceEgp: 450,
        billingPeriod: 'monthly',
        durationDays: 30,
        quotaCredits: 20,
        requiresDevice: false,
        requiresListing: false,
        isActive: false,
        sortOrder: 51,
      },
    ];

    for (const d of defaults) {
      insSvc.run(
        d.id,
        d.code,
        d.category,
        d.itemType,
        d.name,
        d.shortDesc,
        JSON.stringify(d.features),
        d.priceEgp,
        d.billingPeriod,
        d.durationDays,
        d.quotaCredits,
        d.requiresDevice ? 1 : 0,
        d.requiresListing ? 1 : 0,
        d.isActive ? 1 : 0,
        d.sortOrder,
        ts
      );
    }
  }
}

seedMonetizationDefaults();

// --- Mappers ---

function mapCatalogRow(r: Record<string, unknown>): DynamicPaidServiceItem {
  return {
    id: String(r.id),
    code: String(r.code),
    category: r.category as PaidCatalogCategory,
    itemType: r.item_type as 'service' | 'package',
    name: String(r.name),
    shortDesc: String(r.short_desc),
    features: safeJson<string[]>(r.features_json, []),
    priceEgp: Number(r.price_egp || 0),
    billingPeriod: r.billing_period as PaidBillingPeriod,
    durationDays: Number(r.duration_days || 0),
    quotaCredits: Number(r.quota_credits || 0),
    requiresDevice: Boolean(r.requires_device),
    requiresListing: Boolean(r.requires_listing),
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order || 0),
    updatedAt: String(r.updated_at),
  };
}

function mapPaymentMethodRow(r: Record<string, unknown>): PaymentMethodConfigItem {
  return {
    code: r.code as PaymentMethodOption,
    displayName: String(r.display_name),
    receiverAccount: String(r.receiver_account || ''),
    beneficiaryName: String(r.beneficiary_name || ''),
    instructions: String(r.instructions || ''),
    requiresManualProof: Boolean(r.requires_manual_proof),
    isEnabled: Boolean(r.is_enabled),
    sortOrder: Number(r.sort_order || 0),
    updatedAt: String(r.updated_at),
  };
}

function mapPromoRow(r: Record<string, unknown>): PromoCodeItem {
  return {
    id: String(r.id),
    code: String(r.code),
    discountType: r.discount_type as 'percent' | 'fixed_egp',
    discountValue: Number(r.discount_value || 0),
    maxUses: Number(r.max_uses || 0),
    usedCount: Number(r.used_count || 0),
    expiresAt: r.expires_at ? String(r.expires_at) : undefined,
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at),
  };
}

function mapPaymentRequestRow(r: Record<string, unknown>): PaymentProofRequest {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    userName: String(r.user_name),
    userAccountCode: String(r.user_account_code),
    userRole: r.user_role as UserRole,
    serviceId: String(r.service_id),
    serviceCode: String(r.service_code),
    serviceName: String(r.service_name),
    serviceCategory: r.service_category as PaidCatalogCategory,
    targetDeviceId: r.target_device_id ? String(r.target_device_id) : undefined,
    targetListingId: r.target_listing_id ? String(r.target_listing_id) : undefined,
    paymentMethod: r.payment_method as PaymentMethodOption,
    receiverWallet: String(r.receiver_wallet),
    senderWalletPhone: String(r.sender_wallet_phone),
    originalAmountEgp: Number(r.original_amount_egp || 0),
    promoCode: r.promo_code ? String(r.promo_code) : undefined,
    discountAmountEgp: Number(r.discount_amount_egp || 0),
    expectedAmountEgp: Number(r.expected_amount_egp || 0),
    transferredAmountEgp: Number(r.transferred_amount_egp || 0),
    referenceNumber: r.reference_number ? String(r.reference_number) : undefined,
    transferDatetime: String(r.transfer_datetime),
    screenshotDataUrl: String(r.screenshot_data_url),
    screenshotHash: String(r.screenshot_hash),
    userNote: r.user_note ? String(r.user_note) : undefined,
    status: r.status as PaymentRequestStatus,
    adminNote: r.admin_note ? String(r.admin_note) : undefined,
    rejectionReason: r.rejection_reason ? String(r.rejection_reason) : undefined,
    reviewedByAdminId: r.reviewed_by_admin_id ? String(r.reviewed_by_admin_id) : undefined,
    reviewedByAdminName: r.reviewed_by_admin_name ? String(r.reviewed_by_admin_name) : undefined,
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
    activatedEntitlementId: r.activated_entitlement_id ? String(r.activated_entitlement_id) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapEntitlementRow(r: Record<string, unknown>): UserEntitlement {
  const rawStatus = String(r.status) as UserEntitlement['status'];
  const expiresAt = r.expires_at ? String(r.expires_at) : undefined;
  let computedStatus: UserEntitlement['status'] = rawStatus;
  if (rawStatus === 'active' && expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    computedStatus = 'expired';
  }
  return {
    id: String(r.id),
    userId: String(r.user_id),
    userName: r.user_name ? String(r.user_name) : undefined,
    userEmail: r.user_email ? String(r.user_email) : undefined,
    userRole: r.user_role ? (String(r.user_role) as UserRole) : undefined,
    serviceId: String(r.service_id),
    serviceCode: String(r.service_code),
    serviceName: String(r.service_name),
    serviceCategory: r.service_category as PaidCatalogCategory,
    itemType: r.item_type as 'service' | 'package',
    billingPeriod: r.billing_period as PaidBillingPeriod,
    paidAmountEgp: Number(r.paid_amount_egp || 0),
    status: computedStatus,
    isTrial: Boolean(r.is_trial),
    grantedByAdmin: Boolean(r.granted_by_admin),
    sourcePaymentId: r.source_payment_id ? String(r.source_payment_id) : undefined,
    targetDeviceId: r.target_device_id ? String(r.target_device_id) : undefined,
    targetListingId: r.target_listing_id ? String(r.target_listing_id) : undefined,
    startsAt: String(r.starts_at),
    expiresAt,
    createdAt: String(r.created_at),
  };
}

// --- Expiry Sync Helper ---

export function syncExpiredEntitlements(): void {
  const now = nowIso();
  db.prepare(
    "UPDATE user_entitlements SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?"
  ).run(now);
}

// --- Public / User Queries ---

export function listCatalogServices(includeInactive = false): DynamicPaidServiceItem[] {
  const sql = includeInactive
    ? 'SELECT * FROM paid_services_catalog ORDER BY sort_order ASC, name ASC'
    : 'SELECT * FROM paid_services_catalog ORDER BY sort_order ASC, name ASC';
  const rows = (db.prepare(sql).all() as Array<Record<string, unknown>>).map(mapCatalogRow);
  return includeInactive ? rows : rows.filter((x) => x.isActive || x.category === 'future');
}

export function listPaymentMethods(onlyEnabled = false): PaymentMethodConfigItem[] {
  const sql = onlyEnabled
    ? 'SELECT * FROM payment_methods_config WHERE is_enabled = 1 ORDER BY sort_order ASC'
    : 'SELECT * FROM payment_methods_config ORDER BY sort_order ASC';
  return (db.prepare(sql).all() as Array<Record<string, unknown>>).map(mapPaymentMethodRow);
}

export function validatePromoCodeForPrice(
  rawCode: string,
  originalPriceEgp: number
): {
  ok: boolean;
  error?: string;
  promo?: PromoCodeItem;
  discountAmountEgp: number;
  finalAmountEgp: number;
} {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: true, discountAmountEgp: 0, finalAmountEgp: originalPriceEgp };
  }
  const row = db.prepare('SELECT * FROM promo_codes WHERE UPPER(code) = ?').get(code) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    return { ok: false, error: 'كود الخصم غير موجود.', discountAmountEgp: 0, finalAmountEgp: originalPriceEgp };
  }
  const promo = mapPromoRow(row);
  if (!promo.isActive) {
    return { ok: false, error: 'كود الخصم متوقف حاليًا.', discountAmountEgp: 0, finalAmountEgp: originalPriceEgp };
  }
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: 'انتهت صلاحية كود الخصم.', discountAmountEgp: 0, finalAmountEgp: originalPriceEgp };
  }
  if (promo.usedCount >= promo.maxUses) {
    return { ok: false, error: 'تم استنفاد الحد الأقصى لاستخدام هذا الكود.', discountAmountEgp: 0, finalAmountEgp: originalPriceEgp };
  }

  let discount =
    promo.discountType === 'percent'
      ? Math.round((originalPriceEgp * promo.discountValue) / 100)
      : Math.round(promo.discountValue);
  discount = Math.max(0, Math.min(discount, Math.max(0, originalPriceEgp - 1)));
  return {
    ok: true,
    promo,
    discountAmountEgp: discount,
    finalAmountEgp: Math.max(1, Math.round((originalPriceEgp - discount) * 100) / 100),
  };
}

export function listUserPaymentRequests(userId: string): PaymentProofRequest[] {
  return (
    db
      .prepare('SELECT * FROM payment_requests WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map(mapPaymentRequestRow);
}

export function listUserEntitlements(userId: string): UserEntitlement[] {
  syncExpiredEntitlements();
  return (
    db
      .prepare('SELECT * FROM user_entitlements WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map(mapEntitlementRow);
}

function insertUserNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  linkPath?: string
): void {
  db.prepare(
    `INSERT INTO app_notifications (id, user_id, type, title, body, link_path, dedupe_key, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)`
  ).run(`NTF-${crypto.randomUUID().slice(0, 8)}`, userId, type, title, body, linkPath || null, nowIso());
}

function insertAuditLog(
  actorId: string,
  actorLabel: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  details: string
): void {
  db.prepare(
    `INSERT INTO app_audit_logs (id, actor_id, actor_label, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(`AUD-${crypto.randomUUID().slice(0, 8)}`, actorId, actorLabel, action, entityType, entityId || null, details, nowIso());
}

// --- Submit Payment Proof (Strict Manual Verification, NEVER auto-activates) ---

export function submitPaymentProofRequest(
  user: UserProfile,
  payload: {
    serviceId: string;
    paymentMethod: PaymentMethodOption;
    senderWalletPhone: string;
    transferredAmountEgp: number;
    referenceNumber?: string;
    transferDatetime: string;
    screenshotDataUrl: string;
    promoCode?: string;
    targetDeviceId?: string;
    targetListingId?: string;
    userNote?: string;
  }
): { ok: boolean; error?: string; request?: PaymentProofRequest } {
  const svcRow = db.prepare('SELECT * FROM paid_services_catalog WHERE id = ? OR code = ?').get(payload.serviceId, payload.serviceId) as
    | Record<string, unknown>
    | undefined;
  if (!svcRow) {
    return { ok: false, error: 'الخدمة أو الباقة المطلوبة غير موجودة.' };
  }
  const svc = mapCatalogRow(svcRow);
  if (!svc.isActive) {
    return { ok: false, error: 'هذه الخدمة غير مفعلة للشراء حاليًا من الإدارة.' };
  }

  const pmRow = db.prepare('SELECT * FROM payment_methods_config WHERE code = ?').get(payload.paymentMethod) as
    | Record<string, unknown>
    | undefined;
  if (!pmRow || !Number(pmRow.is_enabled)) {
    return { ok: false, error: 'وسيلة الدفع المختارة غير مفعلة حاليًا.' };
  }
  const pm = mapPaymentMethodRow(pmRow);

  const senderPhone = payload.senderWalletPhone.trim();
  if (!/^01[0125]\d{8}$/.test(senderPhone) && senderPhone.length < 8) {
    return { ok: false, error: 'يرجى إدخال رقم محفظة صحيح تم التحويل منه.' };
  }

  if (!payload.screenshotDataUrl || !payload.screenshotDataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'يرجى إرفاق صورة إثبات التحويل (Screenshot) صالحة.' };
  }

  // Validate device/listing targets if provided or required
  if (svc.requiresListing) {
    if (!payload.targetListingId) {
      return { ok: false, error: 'يرجى اختيار الإعلان المطلوب تطبيق الخدمة عليه.' };
    }
    const lst = db
      .prepare("SELECT id FROM marketplace_listings WHERE id = ? AND seller_id = ? AND status = 'active'")
      .get(payload.targetListingId, user.id);
    if (!lst) {
      return { ok: false, error: 'الإعلان المختار غير متاح أو لا يتبع حسابك.' };
    }
  }
  if (svc.requiresDevice && payload.targetDeviceId) {
    const dev = db.prepare('SELECT id FROM devices WHERE id = ?').get(payload.targetDeviceId);
    if (!dev) {
      return { ok: false, error: 'الجهاز المختار غير موجود.' };
    }
  }

  // Compute promo pricing on server
  const promoCheck = validatePromoCodeForPrice(payload.promoCode || '', svc.priceEgp);
  if (!promoCheck.ok) {
    return { ok: false, error: promoCheck.error };
  }
  const expectedAmount = promoCheck.finalAmountEgp;
  const transferredAmount = Number(payload.transferredAmountEgp || 0);
  if (transferredAmount <= 0 || transferredAmount < expectedAmount) {
    return {
      ok: false,
      error: `المبلغ المدخل (${transferredAmount} ج.م) أقل من قيمة الخدمة المطلوبة (${expectedAmount} ج.م).`,
    };
  }

  // Anti-fraud 1: Duplicate screenshot hash check
  const screenshotHash = crypto.createHash('sha256').update(payload.screenshotDataUrl).digest('hex');
  const dupShot = db
    .prepare(
      "SELECT id, status FROM payment_requests WHERE screenshot_hash = ? AND status IN ('pending_review', 'needs_more_proof', 'approved')"
    )
    .get(screenshotHash) as { id: string; status: string } | undefined;
  if (dupShot) {
    return {
      ok: false,
      error: `تم استخدام صورة إثبات التحويل هذه مسبقًا في طلب آخر (${dupShot.id}). يرجى رفع صورة تحويل جديدة.`,
    };
  }

  // Anti-fraud 2: Duplicate reference number check
  const refNorm = payload.referenceNumber?.trim().toUpperCase() || '';
  if (refNorm) {
    const dupRef = db
      .prepare(
        "SELECT id, status FROM payment_requests WHERE UPPER(reference_number) = ? AND status IN ('pending_review', 'needs_more_proof', 'approved')"
      )
      .get(refNorm) as { id: string; status: string } | undefined;
    if (dupRef) {
      return {
        ok: false,
        error: `رقم العملية المرجعي (${refNorm}) مسجل بالفعل في طلب دفع آخر (${dupRef.id}). لا يمكن استخدام نفس التحويل مرتين.`,
      };
    }
  }

  const ts = nowIso();
  const id = `PAY-${ts.slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  db.prepare(
    `INSERT INTO payment_requests
     (id, user_id, user_name, user_account_code, user_role, service_id, service_code, service_name, service_category, target_device_id, target_listing_id, payment_method, receiver_wallet, sender_wallet_phone, original_amount_egp, promo_code, discount_amount_egp, expected_amount_egp, transferred_amount_egp, reference_number, transfer_datetime, screenshot_data_url, screenshot_hash, user_note, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`
  ).run(
    id,
    user.id,
    user.fullName,
    user.id,
    user.role,
    svc.id,
    svc.code,
    svc.name,
    svc.category,
    payload.targetDeviceId || null,
    payload.targetListingId || null,
    payload.paymentMethod,
    pm.receiverAccount || '01214899889',
    senderPhone,
    svc.priceEgp,
    promoCheck.promo?.code || null,
    promoCheck.discountAmountEgp,
    expectedAmount,
    transferredAmount,
    refNorm || null,
    payload.transferDatetime || ts,
    payload.screenshotDataUrl,
    screenshotHash,
    payload.userNote?.trim() || null,
    ts,
    ts
  );

  insertUserNotification(
    user.id,
    'security_alert',
    `تم استلام طلب الدفع (${id}) — قيد المراجعة`,
    `تم إرسال إثبات تحويل ${transferredAmount} ج.م لخدمة «${svc.name}». سيتم تفعيل الخدمة فور تأكيد الإدارة لوصول المبلغ إلى المحفظة.`,
    '/my-payments'
  );
  insertAuditLog(
    user.id,
    user.fullName,
    'إرسال إثبات دفع أورنج كاش للمراجعة',
    'payment_request',
    id,
    `${svc.name} — ${transferredAmount} ج.م (من ${senderPhone})`
  );

  const row = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(id) as Record<string, unknown>;
  return { ok: true, request: mapPaymentRequestRow(row) };
}

export function resubmitPaymentProof(
  user: UserProfile,
  paymentId: string,
  payload: {
    senderWalletPhone?: string;
    referenceNumber?: string;
    transferDatetime?: string;
    screenshotDataUrl: string;
    userNote?: string;
  }
): { ok: boolean; error?: string; request?: PaymentProofRequest } {
  const row = db.prepare('SELECT * FROM payment_requests WHERE id = ? AND user_id = ?').get(paymentId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    return { ok: false, error: 'طلب الدفع غير موجود.' };
  }
  const existing = mapPaymentRequestRow(row);
  if (existing.status !== 'needs_more_proof' && existing.status !== 'pending_review') {
    return { ok: false, error: 'لا يمكن تعديل طلب تم قبول أو رفض المراجعة الخاصة به بالفعل.' };
  }
  if (!payload.screenshotDataUrl || !payload.screenshotDataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'يرجى رفع صورة إثبات جديدة صالحة.' };
  }

  const newHash = crypto.createHash('sha256').update(payload.screenshotDataUrl).digest('hex');
  const dupShot = db
    .prepare(
      "SELECT id FROM payment_requests WHERE screenshot_hash = ? AND id != ? AND status IN ('pending_review', 'needs_more_proof', 'approved')"
    )
    .get(newHash, paymentId) as { id: string } | undefined;
  if (dupShot) {
    return { ok: false, error: `هذه الصورة مستخدمة بالفعل في الطلب (${dupShot.id}).` };
  }

  const refNorm = payload.referenceNumber?.trim().toUpperCase() || existing.referenceNumber || '';
  if (refNorm) {
    const dupRef = db
      .prepare(
        "SELECT id FROM payment_requests WHERE UPPER(reference_number) = ? AND id != ? AND status IN ('pending_review', 'needs_more_proof', 'approved')"
      )
      .get(refNorm, paymentId) as { id: string } | undefined;
    if (dupRef) {
      return { ok: false, error: `رقم العملية المرجعي (${refNorm}) مستخدم في طلب آخر (${dupRef.id}).` };
    }
  }

  const ts = nowIso();
  db.prepare(
    `UPDATE payment_requests
     SET sender_wallet_phone = ?, reference_number = ?, transfer_datetime = ?, screenshot_data_url = ?, screenshot_hash = ?, user_note = ?, status = 'pending_review', updated_at = ?
     WHERE id = ?`
  ).run(
    payload.senderWalletPhone?.trim() || existing.senderWalletPhone,
    refNorm || null,
    payload.transferDatetime?.trim() || existing.transferDatetime,
    payload.screenshotDataUrl,
    newHash,
    payload.userNote?.trim() || existing.userNote || null,
    ts,
    paymentId
  );

  const updated = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as Record<string, unknown>;
  return { ok: true, request: mapPaymentRequestRow(updated) };
}

// --- Entitlement Activation Side-Effects (ONLY called on Admin Approval or Admin Manual Grant) ---

function activateEntitlementForService(params: {
  userId: string;
  svc: DynamicPaidServiceItem;
  paidAmountEgp: number;
  isTrial: boolean;
  grantedByAdmin: boolean;
  sourcePaymentId?: string;
  targetDeviceId?: string;
  targetListingId?: string;
  startsAt?: string;
  expiresAt?: string;
}): UserEntitlement {
  const ts = nowIso();
  const startsAt = params.startsAt || ts;
  const expiresAt =
    params.expiresAt !== undefined
      ? params.expiresAt
      : params.svc.durationDays > 0
        ? addDaysFromIso(startsAt, params.svc.durationDays)
        : undefined;

  const entId = `ENT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  db.prepare(
    `INSERT INTO user_entitlements
     (id, user_id, service_id, service_code, service_name, service_category, item_type, billing_period, paid_amount_egp, status, is_trial, granted_by_admin, source_payment_id, target_device_id, target_listing_id, starts_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entId,
    params.userId,
    params.svc.id,
    params.svc.code,
    params.svc.name,
    params.svc.category,
    params.svc.itemType,
    params.svc.billingPeriod,
    params.paidAmountEgp,
    params.isTrial ? 1 : 0,
    params.grantedByAdmin ? 1 : 0,
    params.sourcePaymentId || null,
    params.targetDeviceId || null,
    params.targetListingId || null,
    startsAt,
    expiresAt || null,
    ts
  );

  // Sync role/account privileges on existing OMOR tables
  if (params.svc.quotaCredits > 0) {
    db.prepare('UPDATE app_users SET ai_quota_bonus = ai_quota_bonus + ? WHERE id = ?').run(
      params.svc.quotaCredits,
      params.userId
    );
  }

  if (params.svc.itemType === 'package') {
    const cycle = params.svc.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    db.prepare(
      'UPDATE app_users SET active_plan_slug = ?, plan_billing_cycle = ?, plan_expires_at = ? WHERE id = ?'
    ).run(params.svc.code, cycle, expiresAt || null, params.userId);
  }

  if (params.svc.code.startsWith('tech_pro')) {
    db.prepare('UPDATE technician_profiles SET is_pro = 1 WHERE user_id = ?').run(params.userId);
  } else if (params.svc.code === 'tech_spotlight') {
    db.prepare('UPDATE technician_profiles SET spotlight_until = ? WHERE user_id = ?').run(
      expiresAt || addDaysFromIso(startsAt, 14),
      params.userId
    );
  } else if (params.svc.code === 'tech_priority_leads') {
    db.prepare('UPDATE technician_profiles SET priority_leads_until = ? WHERE user_id = ?').run(
      expiresAt || addDaysFromIso(startsAt, 30),
      params.userId
    );
  } else if (params.svc.code.startsWith('store_pro')) {
    db.prepare('UPDATE marketplace_listings SET seller_is_vip = 1, store_certified = 1 WHERE seller_id = ?').run(
      params.userId
    );
  } else if (params.svc.code === 'store_feature_listing' && params.targetListingId) {
    db.prepare('UPDATE marketplace_listings SET is_featured = 1, featured_until = ? WHERE id = ?').run(
      expiresAt || addDaysFromIso(startsAt, 7),
      params.targetListingId
    );
  } else if (params.svc.code === 'store_certified_stamp' && params.targetListingId) {
    db.prepare('UPDATE marketplace_listings SET store_certified = 1 WHERE id = ?').run(params.targetListingId);
  }

  const row = db.prepare('SELECT * FROM user_entitlements WHERE id = ?').get(entId) as Record<string, unknown>;
  return mapEntitlementRow(row);
}

// --- Admin Payment Verification & Revenue Controls ---

export function adminListPaymentRequests(statusFilter?: PaymentRequestStatus | 'all'): PaymentProofRequest[] {
  const rows =
    statusFilter && statusFilter !== 'all'
      ? (db
          .prepare('SELECT * FROM payment_requests WHERE status = ? ORDER BY created_at DESC')
          .all(statusFilter) as Array<Record<string, unknown>>)
      : (db.prepare('SELECT * FROM payment_requests ORDER BY created_at DESC').all() as Array<
          Record<string, unknown>
        >);
  return rows.map(mapPaymentRequestRow);
}

export function adminReviewPaymentRequest(
  adminActor: { id: string; name: string },
  paymentId: string,
  payload: {
    action: 'approve' | 'reject' | 'needs_more_proof' | 'note_only';
    adminNote?: string;
    rejectionReason?: string;
  }
): { ok: boolean; error?: string; request?: PaymentProofRequest; entitlement?: UserEntitlement } {
  const row = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    return { ok: false, error: 'طلب الدفع غير موجود.' };
  }
  const reqItem = mapPaymentRequestRow(row);
  const ts = nowIso();

  if (payload.action === 'note_only') {
    db.prepare('UPDATE payment_requests SET admin_note = ?, updated_at = ? WHERE id = ?').run(
      payload.adminNote?.trim() || null,
      ts,
      paymentId
    );
    const updated = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as Record<string, unknown>;
    return { ok: true, request: mapPaymentRequestRow(updated) };
  }

  if (reqItem.status === 'approved') {
    return { ok: false, error: 'تم قبول وتفعيل هذا الطلب مسبقًا ولا يمكن إعادة تفعيله.' };
  }

  if (payload.action === 'reject') {
    const reason = payload.rejectionReason?.trim();
    if (!reason) {
      return { ok: false, error: 'يجب توضيح سبب رفض الدفع للمستخدم.' };
    }
    db.prepare(
      `UPDATE payment_requests
       SET status = 'rejected', rejection_reason = ?, admin_note = ?, reviewed_by_admin_id = ?, reviewed_by_admin_name = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(reason, payload.adminNote?.trim() || null, adminActor.id, adminActor.name, ts, ts, paymentId);

    insertUserNotification(
      reqItem.userId,
      'security_alert',
      `تم رفض طلب الدفع (${reqItem.id})`,
      `تعذر تأكيد التحويل لخدمة «${reqItem.serviceName}». السبب: ${reason}`,
      '/my-payments'
    );
    insertAuditLog(adminActor.id, adminActor.name, 'رفض طلب دفع', 'payment_request', paymentId, reason);
    const updated = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as Record<string, unknown>;
    return { ok: true, request: mapPaymentRequestRow(updated) };
  }

  if (payload.action === 'needs_more_proof') {
    const note = payload.adminNote?.trim() || payload.rejectionReason?.trim() || 'يرجى رفع لقطة شاشة أوضح توضح رقم العملية والوقت.';
    db.prepare(
      `UPDATE payment_requests
       SET status = 'needs_more_proof', admin_note = ?, reviewed_by_admin_id = ?, reviewed_by_admin_name = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(note, adminActor.id, adminActor.name, ts, ts, paymentId);

    insertUserNotification(
      reqItem.userId,
      'security_alert',
      `مطلوب إثبات إضافي لطلب الدفع (${reqItem.id})`,
      note,
      '/my-payments'
    );
    insertAuditLog(adminActor.id, adminActor.name, 'طلب إثبات دفع إضافي', 'payment_request', paymentId, note);
    const updated = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as Record<string, unknown>;
    return { ok: true, request: mapPaymentRequestRow(updated) };
  }

  // Action === 'approve': strict anti-fraud re-check + atomic activation
  if (reqItem.referenceNumber) {
    const dupRef = db
      .prepare("SELECT id FROM payment_requests WHERE UPPER(reference_number) = ? AND id != ? AND status = 'approved'")
      .get(reqItem.referenceNumber.toUpperCase(), paymentId) as { id: string } | undefined;
    if (dupRef) {
      return { ok: false, error: `تم قبول نفس رقم العملية المرجعي مسبقًا في الطلب (${dupRef.id}).` };
    }
  }
  const dupHash = db
    .prepare("SELECT id FROM payment_requests WHERE screenshot_hash = ? AND id != ? AND status = 'approved'")
    .get(reqItem.screenshotHash, paymentId) as { id: string } | undefined;
  if (dupHash) {
    return { ok: false, error: `تم اعتماد نفس صورة الإثبات مسبقًا في الطلب (${dupHash.id}).` };
  }

  const svcRow = db.prepare('SELECT * FROM paid_services_catalog WHERE id = ?').get(reqItem.serviceId) as
    | Record<string, unknown>
    | undefined;
  if (!svcRow) {
    return { ok: false, error: 'الخدمة المرتبطة بالطلب غير موجودة في الكتالوج.' };
  }
  const svc = mapCatalogRow(svcRow);

  db.exec('BEGIN IMMEDIATE');
  try {
    // Re-check status inside lock
    const fresh = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(paymentId) as
      | { status: string }
      | undefined;
    if (!fresh || fresh.status === 'approved') {
      db.exec('ROLLBACK');
      return { ok: false, error: 'الطلب معتمد بالفعل.' };
    }

    const ent = activateEntitlementForService({
      userId: reqItem.userId,
      svc,
      paidAmountEgp: reqItem.transferredAmountEgp,
      isTrial: false,
      grantedByAdmin: true,
      sourcePaymentId: paymentId,
      targetDeviceId: reqItem.targetDeviceId,
      targetListingId: reqItem.targetListingId,
    });

    if (reqItem.promoCode) {
      db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE UPPER(code) = ?').run(
        reqItem.promoCode.toUpperCase()
      );
    }

    db.prepare(
      `UPDATE payment_requests
       SET status = 'approved', admin_note = ?, rejection_reason = NULL, reviewed_by_admin_id = ?, reviewed_by_admin_name = ?, reviewed_at = ?, activated_entitlement_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      payload.adminNote?.trim() || 'تم تأكيد وصول المبلغ إلى محفظة أورنج كاش وتفعيل الخدمة.',
      adminActor.id,
      adminActor.name,
      ts,
      ent.id,
      ts,
      paymentId
    );

    // Record confirmed subscription/service revenue entry in main revenue_entries table
    db.prepare(
      'INSERT INTO revenue_entries (id, source_type, description, amount_egp, entry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      `REV-${crypto.randomUUID().slice(0, 8)}`,
      'subscription',
      `دفع مؤكد (${reqItem.id}): ${reqItem.serviceName} — ${reqItem.userName}`,
      reqItem.transferredAmountEgp,
      ts.slice(0, 10),
      ts
    );

    db.exec('COMMIT');

    insertUserNotification(
      reqItem.userId,
      'security_alert',
      `تم قبول الدفع وتفعيل «${reqItem.serviceName}»`,
      `تم تأكيد تحويل ${reqItem.transferredAmountEgp} ج.م وتفعيل خدمتك بنجاح.`,
      '/my-payments'
    );
    insertAuditLog(
      adminActor.id,
      adminActor.name,
      'اعتماد دفع أورنج كاش وتفعيل خدمة',
      'payment_request',
      paymentId,
      `${reqItem.serviceName} — ${reqItem.transferredAmountEgp} ج.م (${reqItem.userName})`
    );

    const updated = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as Record<string, unknown>;
    return { ok: true, request: mapPaymentRequestRow(updated), entitlement: ent };
  } catch (err) {
    db.exec('ROLLBACK');
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر إتمام مراجعة واعتماد الدفع.',
    };
  }
}

// --- Admin Catalog, Promo Codes, Payment Methods, Manual Subscriptions & Revenue ---

export function adminUpsertCatalogService(payload: {
  id?: string;
  code: string;
  category: PaidCatalogCategory;
  itemType: 'service' | 'package';
  name: string;
  shortDesc: string;
  features: string[];
  priceEgp: number;
  billingPeriod: PaidBillingPeriod;
  durationDays: number;
  quotaCredits: number;
  requiresDevice: boolean;
  requiresListing: boolean;
  isActive: boolean;
  sortOrder: number;
}): DynamicPaidServiceItem {
  const ts = nowIso();
  const id = payload.id || `SVC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const cleanCode = payload.code.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const existing = db.prepare('SELECT id FROM paid_services_catalog WHERE id = ?').get(id);
  if (existing) {
    db.prepare(
      `UPDATE paid_services_catalog
       SET code = ?, category = ?, item_type = ?, name = ?, short_desc = ?, features_json = ?, price_egp = ?, billing_period = ?, duration_days = ?, quota_credits = ?, requires_device = ?, requires_listing = ?, is_active = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      cleanCode,
      payload.category,
      payload.itemType,
      payload.name.trim(),
      payload.shortDesc.trim(),
      JSON.stringify(payload.features),
      Math.max(0, payload.priceEgp),
      payload.billingPeriod,
      Math.max(0, payload.durationDays),
      Math.max(0, payload.quotaCredits),
      payload.requiresDevice ? 1 : 0,
      payload.requiresListing ? 1 : 0,
      payload.isActive ? 1 : 0,
      payload.sortOrder,
      ts,
      id
    );
  } else {
    db.prepare(
      `INSERT INTO paid_services_catalog
       (id, code, category, item_type, name, short_desc, features_json, price_egp, billing_period, duration_days, quota_credits, requires_device, requires_listing, is_active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      cleanCode,
      payload.category,
      payload.itemType,
      payload.name.trim(),
      payload.shortDesc.trim(),
      JSON.stringify(payload.features),
      Math.max(0, payload.priceEgp),
      payload.billingPeriod,
      Math.max(0, payload.durationDays),
      Math.max(0, payload.quotaCredits),
      payload.requiresDevice ? 1 : 0,
      payload.requiresListing ? 1 : 0,
      payload.isActive ? 1 : 0,
      payload.sortOrder,
      ts
    );
  }
  const row = db.prepare('SELECT * FROM paid_services_catalog WHERE id = ?').get(id) as Record<string, unknown>;
  return mapCatalogRow(row);
}

export function adminDeleteCatalogService(id: string): void {
  db.prepare('DELETE FROM paid_services_catalog WHERE id = ?').run(id);
}

export function adminUpdatePaymentMethod(payload: {
  code: PaymentMethodOption;
  displayName: string;
  receiverAccount: string;
  beneficiaryName: string;
  instructions: string;
  requiresManualProof: boolean;
  isEnabled: boolean;
}): PaymentMethodConfigItem {
  const ts = nowIso();
  const existing = db.prepare('SELECT code FROM payment_methods_config WHERE code = ?').get(payload.code);
  if (existing) {
    db.prepare(
      `UPDATE payment_methods_config
       SET display_name = ?, receiver_account = ?, beneficiary_name = ?, instructions = ?, requires_manual_proof = ?, is_enabled = ?, updated_at = ?
       WHERE code = ?`
    ).run(
      payload.displayName.trim(),
      payload.receiverAccount.trim(),
      payload.beneficiaryName.trim(),
      payload.instructions.trim(),
      payload.requiresManualProof ? 1 : 0,
      payload.isEnabled ? 1 : 0,
      ts,
      payload.code
    );
  } else {
    db.prepare(
      `INSERT INTO payment_methods_config (code, display_name, receiver_account, beneficiary_name, instructions, requires_manual_proof, is_enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 10, ?)`
    ).run(
      payload.code,
      payload.displayName.trim(),
      payload.receiverAccount.trim(),
      payload.beneficiaryName.trim(),
      payload.instructions.trim(),
      payload.requiresManualProof ? 1 : 0,
      payload.isEnabled ? 1 : 0,
      ts
    );
  }
  const row = db.prepare('SELECT * FROM payment_methods_config WHERE code = ?').get(payload.code) as Record<string, unknown>;
  return mapPaymentMethodRow(row);
}

export function adminListPromoCodes(): PromoCodeItem[] {
  return (db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all() as Array<Record<string, unknown>>).map(
    mapPromoRow
  );
}

export function adminUpsertPromoCode(payload: {
  id?: string;
  code: string;
  discountType: 'percent' | 'fixed_egp';
  discountValue: number;
  maxUses: number;
  expiresAt?: string;
  isActive: boolean;
}): PromoCodeItem {
  const ts = nowIso();
  const id = payload.id || `PRM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const cleanCode = payload.code.trim().toUpperCase();
  const existing = db.prepare('SELECT id FROM promo_codes WHERE id = ?').get(id);
  if (existing) {
    db.prepare(
      `UPDATE promo_codes SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, expires_at = ?, is_active = ? WHERE id = ?`
    ).run(
      cleanCode,
      payload.discountType,
      Math.max(1, payload.discountValue),
      Math.max(1, payload.maxUses),
      payload.expiresAt?.trim() || null,
      payload.isActive ? 1 : 0,
      id
    );
  } else {
    db.prepare(
      `INSERT INTO promo_codes (id, code, discount_type, discount_value, max_uses, used_count, expires_at, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
    ).run(
      id,
      cleanCode,
      payload.discountType,
      Math.max(1, payload.discountValue),
      Math.max(1, payload.maxUses),
      payload.expiresAt?.trim() || null,
      payload.isActive ? 1 : 0,
      ts
    );
  }
  const row = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id) as Record<string, unknown>;
  return mapPromoRow(row);
}

export function adminDeletePromoCode(id: string): void {
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(id);
}

export function adminListAllEntitlements(): UserEntitlement[] {
  syncExpiredEntitlements();
  const rows = db
    .prepare(
      `SELECT e.*, u.full_name AS user_name, u.email AS user_email, u.role AS user_role
       FROM user_entitlements e
       LEFT JOIN app_users u ON u.id = e.user_id
       ORDER BY e.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapEntitlementRow);
}

export function adminManageUserEntitlement(
  adminActor: { id: string; name: string },
  payload: {
    mode: 'grant' | 'extend' | 'cancel' | 'set_dates';
    userId?: string;
    serviceId?: string;
    entitlementId?: string;
    isTrial?: boolean;
    extraDays?: number;
    startsAt?: string;
    expiresAt?: string;
  }
): { ok: boolean; error?: string; entitlement?: UserEntitlement } {
  if (payload.mode === 'grant') {
    if (!payload.userId || !payload.serviceId) {
      return { ok: false, error: 'يرجى تحديد المستخدم والخدمة/الباقة.' };
    }
    const targetUser = db.prepare('SELECT id, full_name FROM app_users WHERE id = ?').get(payload.userId) as
      | { id: string; full_name: string }
      | undefined;
    if (!targetUser) return { ok: false, error: 'حساب المستخدم غير موجود.' };
    const svcRow = db.prepare('SELECT * FROM paid_services_catalog WHERE id = ?').get(payload.serviceId) as
      | Record<string, unknown>
      | undefined;
    if (!svcRow) return { ok: false, error: 'الباقة أو الخدمة غير موجودة.' };
    const svc = mapCatalogRow(svcRow);

    const ent = activateEntitlementForService({
      userId: targetUser.id,
      svc,
      paidAmountEgp: 0,
      isTrial: Boolean(payload.isTrial),
      grantedByAdmin: true,
      startsAt: payload.startsAt,
      expiresAt: payload.expiresAt,
    });
    insertUserNotification(
      targetUser.id,
      'security_alert',
      payload.isTrial ? `تم منحك اشتراكًا تجريبيًا: ${svc.name}` : `تم تفعيل خدمة من الإدارة: ${svc.name}`,
      'تم تفعيل المزايا على حسابك عبر إدارة منصة OMOR.',
      '/my-payments'
    );
    insertAuditLog(
      adminActor.id,
      adminActor.name,
      payload.isTrial ? 'منح اشتراك تجريبي' : 'تفعيل خدمة يدويًا لمستخدم',
      'entitlement',
      ent.id,
      `${targetUser.full_name} — ${svc.name}`
    );
    return { ok: true, entitlement: ent };
  }

  if (!payload.entitlementId) {
    return { ok: false, error: 'معرف الاشتراك غير محدد.' };
  }
  const existingRow = db.prepare('SELECT * FROM user_entitlements WHERE id = ?').get(payload.entitlementId) as
    | Record<string, unknown>
    | undefined;
  if (!existingRow) return { ok: false, error: 'الاشتراك غير موجود.' };
  const existing = mapEntitlementRow(existingRow);

  if (payload.mode === 'cancel') {
    db.prepare("UPDATE user_entitlements SET status = 'cancelled' WHERE id = ?").run(existing.id);
    insertAuditLog(adminActor.id, adminActor.name, 'إلغاء اشتراك مستخدم يدويًا', 'entitlement', existing.id, existing.serviceName);
    return { ok: true };
  }

  if (payload.mode === 'extend') {
    const days = Math.max(1, Number(payload.extraDays || 30));
    const baseIso =
      existing.expiresAt && new Date(existing.expiresAt).getTime() > Date.now() ? existing.expiresAt : nowIso();
    const nextExp = addDaysFromIso(baseIso, days);
    db.prepare("UPDATE user_entitlements SET status = 'active', expires_at = ? WHERE id = ?").run(nextExp, existing.id);
    if (existing.itemType === 'package') {
      db.prepare('UPDATE app_users SET plan_expires_at = ? WHERE id = ?').run(nextExp, existing.userId);
    }
    insertUserNotification(
      existing.userId,
      'security_alert',
      `تم تمديد اشتراكك في ${existing.serviceName}`,
      `تم تمديد صلاحية الاشتراك لمدة ${days} يومًا إضافيًا حتى ${nextExp.slice(0, 10)}.`,
      '/my-payments'
    );
    const updated = db.prepare('SELECT * FROM user_entitlements WHERE id = ?').get(existing.id) as Record<string, unknown>;
    return { ok: true, entitlement: mapEntitlementRow(updated) };
  }

  if (payload.mode === 'set_dates') {
    const nextStart = payload.startsAt || existing.startsAt;
    const nextExp = payload.expiresAt || existing.expiresAt || null;
    db.prepare("UPDATE user_entitlements SET starts_at = ?, expires_at = ?, status = 'active' WHERE id = ?").run(
      nextStart,
      nextExp,
      existing.id
    );
    const updated = db.prepare('SELECT * FROM user_entitlements WHERE id = ?').get(existing.id) as Record<string, unknown>;
    return { ok: true, entitlement: mapEntitlementRow(updated) };
  }

  return { ok: false, error: 'إجراء غير معروف.' };
}

export function getAdminRevenueAnalytics(): RevenueAnalyticsSummary {
  syncExpiredEntitlements();
  const requests = adminListPaymentRequests('all');
  const dayAgoMs = Date.now() - 24 * 60 * 60 * 1000;

  let newRequestsCount = 0;
  let pendingReviewCount = 0;
  let needsMoreProofCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let confirmedRevenueEgp = 0;
  let pendingAmountEgp = 0;

  const revenueByCategory: Record<string, number> = {
    customer: 0,
    technician: 0,
    store: 0,
    verification_reports: 0,
    future: 0,
  };
  const revenueByUserRole: Record<string, number> = {
    user: 0,
    technician: 0,
    store: 0,
    admin: 0,
  };
  const dailyMap = new Map<string, { confirmedEgp: number; approvedCount: number }>();
  const monthlyMap = new Map<string, { confirmedEgp: number; approvedCount: number }>();

  for (const r of requests) {
    if (new Date(r.createdAt).getTime() >= dayAgoMs && r.status === 'pending_review') {
      newRequestsCount += 1;
    }
    if (r.status === 'pending_review') {
      pendingReviewCount += 1;
      pendingAmountEgp += r.transferredAmountEgp;
    } else if (r.status === 'needs_more_proof') {
      needsMoreProofCount += 1;
      pendingAmountEgp += r.transferredAmountEgp;
    } else if (r.status === 'rejected') {
      rejectedCount += 1;
    } else if (r.status === 'approved') {
      // ONLY confirmed payments are counted in actual profits!
      approvedCount += 1;
      confirmedRevenueEgp += r.transferredAmountEgp;
      revenueByCategory[r.serviceCategory] = (revenueByCategory[r.serviceCategory] || 0) + r.transferredAmountEgp;
      revenueByUserRole[r.userRole] = (revenueByUserRole[r.userRole] || 0) + r.transferredAmountEgp;

      const dayKey = (r.reviewedAt || r.createdAt).slice(0, 10);
      const dEntry = dailyMap.get(dayKey) || { confirmedEgp: 0, approvedCount: 0 };
      dEntry.confirmedEgp += r.transferredAmountEgp;
      dEntry.approvedCount += 1;
      dailyMap.set(dayKey, dEntry);

      const monthKey = (r.reviewedAt || r.createdAt).slice(0, 7);
      const mEntry = monthlyMap.get(monthKey) || { confirmedEgp: 0, approvedCount: 0 };
      mEntry.confirmedEgp += r.transferredAmountEgp;
      mEntry.approvedCount += 1;
      monthlyMap.set(monthKey, mEntry);
    }
  }

  const activeSubscriptionsCount = (
    db.prepare("SELECT COUNT(*) as c FROM user_entitlements WHERE status = 'active'").get() as { c: number }
  ).c;
  const expiredSubscriptionsCount = (
    db.prepare("SELECT COUNT(*) as c FROM user_entitlements WHERE status = 'expired'").get() as { c: number }
  ).c;

  const dailySummary = Array.from(dailyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)
    .map(([date, v]) => ({ date, confirmedEgp: Math.round(v.confirmedEgp * 100) / 100, approvedCount: v.approvedCount }));

  const monthlySummary = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([month, v]) => ({
      month,
      confirmedEgp: Math.round(v.confirmedEgp * 100) / 100,
      approvedCount: v.approvedCount,
    }));

  return {
    totalRequests: requests.length,
    newRequestsCount,
    pendingReviewCount,
    needsMoreProofCount,
    approvedCount,
    rejectedCount,
    confirmedRevenueEgp: Math.round(confirmedRevenueEgp * 100) / 100,
    pendingAmountEgp: Math.round(pendingAmountEgp * 100) / 100,
    activeSubscriptionsCount,
    expiredSubscriptionsCount,
    revenueByCategory,
    revenueByUserRole,
    dailySummary,
    monthlySummary,
  };
}

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  role: UserRole;
  accountStatus: string;
  activePlanSlug?: string;
  planExpiresAt?: string;
  devicesCount: number;
  createdAt: string;
}

export function adminListUsersSummary(): AdminCustomerSummary[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.city, u.role, u.account_status, u.active_plan_slug, u.plan_expires_at, u.created_at,
              (SELECT COUNT(*) FROM devices d WHERE d.owner_id = u.id) as devices_count
       FROM app_users u
       WHERE u.account_status != 'deleted'
       ORDER BY u.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    fullName: String(r.full_name),
    email: String(r.email),
    phone: r.phone ? String(r.phone) : undefined,
    city: r.city ? String(r.city) : undefined,
    role: r.role as UserRole,
    accountStatus: String(r.account_status),
    activePlanSlug: r.active_plan_slug ? String(r.active_plan_slug) : undefined,
    planExpiresAt: r.plan_expires_at ? String(r.plan_expires_at) : undefined,
    devicesCount: Number(r.devices_count || 0),
    createdAt: String(r.created_at),
  }));
}


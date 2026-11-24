import crypto from 'node:crypto';
import { db, getActivePlanById, incrementPlanSubscriberAndRevenue } from './db.ts';
import {
  DEMO_AUDIT_LOGS,
  DEMO_DEVICES,
  DEMO_EVENTS,
  DEMO_LISTINGS,
  DEMO_MAINTENANCE_REMINDERS,
  DEMO_REPAIR_RECORDS,
  DEMO_REPAIR_REQUESTS,
  DEMO_REPORTS,
  DEMO_REVIEWS,
  DEMO_TECHNICIANS,
  DEMO_USERS,
  DEMO_WARRANTIES,
} from '../src/data/demoSeed.ts';
import { DEMO_B2B_PARTNERS, DEMO_SPARE_PART_STATS } from '../src/data/v3Seed.ts';
import type {
  AuditLogItem,
  B2BPartner,
  B2BPartnerType,
  ChatMessage,
  Conversation,
  DeviceCategorySlug,
  DeviceCondition,
  DeviceEvent,
  DeviceInspection,
  DevicePublicVisibility,
  DeviceRecord,
  EventType,
  InspectionItemKey,
  InspectionItemStatus,
  MaintenanceCategory,
  MaintenanceReminder,
  MarketplaceListing,
  NotificationItem,
  NotificationPreferences,
  OwnershipTransfer,
  PaidServiceCatalogItem,
  PaidServiceCode,
  PaidServiceOrder,
  PaymentMethodOption,
  RepairPart,
  RepairRecord,
  RepairRequest,
  RepairStatus,
  ReportItem,
  ReportReason,
  ReportStatus,
  SessionInfo,
  SparePartCategory,
  SparePartOrigin,
  SparePartStat,
  TechnicianProfile,
  TechnicianReview,
  TrustSourceLevel,
  UserProfile,
  UserRole,
  UserSubscription,
  WarrantyRecord,
} from '../src/types/omor.ts';

db.exec(`
  CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL DEFAULT '',
    phone TEXT,
    city TEXT,
    governorate TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'technician', 'store', 'admin')),
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    store_name TEXT,
    store_bio TEXT,
    privacy_hide_phone INTEGER NOT NULL DEFAULT 1,
    privacy_hide_city INTEGER NOT NULL DEFAULT 0,
    active_plan_slug TEXT,
    plan_billing_cycle TEXT,
    plan_expires_at TEXT,
    ai_quota_bonus INTEGER NOT NULL DEFAULT 0,
    notification_prefs_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_code TEXT NOT NULL UNIQUE,
    public_token TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    device_name TEXT NOT NULL,
    model TEXT NOT NULL,
    model_number TEXT,
    purchase_date TEXT,
    condition TEXT NOT NULL,
    status TEXT NOT NULL,
    image_url TEXT,
    verification_tier TEXT NOT NULL,
    visibility_json TEXT NOT NULL,
    private_data_json TEXT NOT NULL,
    lost_reported_at TEXT,
    lost_report_note TEXT,
    public_scan_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS device_events (
    id TEXT PRIMARY KEY,
    event_code TEXT NOT NULL,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_label TEXT NOT NULL,
    description TEXT NOT NULL,
    attachments_json TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    owner_approved INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS technician_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    center_name TEXT NOT NULL,
    avatar_url TEXT,
    specialties_json TEXT NOT NULL,
    supported_device_types_json TEXT NOT NULL,
    governorate TEXT NOT NULL,
    district TEXT NOT NULL,
    bio TEXT NOT NULL,
    public_contact TEXT NOT NULL,
    working_hours TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0,
    verified_repairs_count INTEGER NOT NULL DEFAULT 0,
    is_pro INTEGER NOT NULL DEFAULT 0,
    spotlight_until TEXT,
    priority_leads_until TEXT
  );

  CREATE TABLE IF NOT EXISTS repair_requests (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    technician_id TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    fault_description TEXT NOT NULL,
    attachments_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repair_records (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    device_id TEXT NOT NULL,
    technician_id TEXT NOT NULL,
    technician_name TEXT NOT NULL,
    center_name TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    fault_description TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    parts_json TEXT NOT NULL,
    repair_cost REAL,
    intake_date TEXT NOT NULL,
    delivery_date TEXT,
    warranty_days INTEGER NOT NULL DEFAULT 0,
    before_images_json TEXT NOT NULL,
    after_images_json TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL,
    owner_approved INTEGER NOT NULL DEFAULT 0,
    owner_approved_at TEXT,
    parent_record_id TEXT,
    correction_reason TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warranties (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    item_or_part_name TEXT NOT NULL,
    issuer_name TEXT NOT NULL,
    is_source_verified INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    terms TEXT,
    warranty_number TEXT,
    document_name TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS technician_reviews (
    id TEXT PRIMARY KEY,
    technician_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    repair_record_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    is_reported INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS marketplace_listings (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_type TEXT NOT NULL CHECK (seller_type IN ('user', 'store')),
    title TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EGP',
    city TEXT NOT NULL,
    condition TEXT NOT NULL,
    description TEXT NOT NULL,
    images_json TEXT NOT NULL,
    store_warranty_days INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    featured_until TEXT,
    store_certified INTEGER NOT NULL DEFAULT 0,
    seller_is_vip INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ownership_transfers (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    from_user_name TEXT NOT NULL,
    to_user_id TEXT,
    to_user_name TEXT,
    transfer_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    status TEXT NOT NULL,
    dispute_reason TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    listing_title TEXT,
    participant_a TEXT NOT NULL,
    participant_b TEXT NOT NULL,
    participant_a_name TEXT NOT NULL,
    participant_b_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_path TEXT,
    dedupe_key TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS maintenance_reminders (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    interval_days INTEGER NOT NULL,
    next_due_date TEXT NOT NULL,
    last_completed_at TEXT,
    notes TEXT,
    is_auto_suggested INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trust_reports (
    id TEXT PRIMARY KEY,
    report_code TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_label TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_label TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS spare_part_stats (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    device_model_pattern TEXT NOT NULL,
    part_name TEXT NOT NULL,
    part_category TEXT NOT NULL,
    origin TEXT NOT NULL,
    min_price_egp REAL NOT NULL,
    avg_price_egp REAL NOT NULL,
    max_price_egp REAL NOT NULL,
    avg_warranty_days INTEGER NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 1,
    trend TEXT NOT NULL DEFAULT 'stable',
    last_updated TEXT NOT NULL,
    source_label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS b2b_partners (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    partner_type TEXT NOT NULL,
    governorate TEXT NOT NULL,
    branches_count INTEGER NOT NULL,
    supported_categories_json TEXT NOT NULL,
    supported_brands_json TEXT NOT NULL,
    sla_hours INTEGER NOT NULL,
    warranty_policy TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    integration_status TEXT NOT NULL,
    webhook_code TEXT NOT NULL,
    linked_technicians_count INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_platform_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    allow_new_registrations INTEGER NOT NULL DEFAULT 1,
    require_tech_verification INTEGER NOT NULL DEFAULT 1,
    max_upload_mb INTEGER NOT NULL DEFAULT 5,
    marketplace_enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    plan_slug TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    target_role TEXT NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    price_egp REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paid_service_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    target_label TEXT,
    price_egp REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
    expires_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS device_inspections (
    id TEXT PRIMARY KEY,
    inspection_code TEXT NOT NULL UNIQUE,
    device_id TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    trust_level TEXT NOT NULL,
    items_json TEXT NOT NULL,
    untested_items_json TEXT NOT NULL,
    overall_outcome TEXT NOT NULL,
    inspector_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

function ensureColumn(tableName: string, colName: string, colDef: string): void {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === colName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
  }
}

// Idempotent schema upgrades without deleting any existing records
ensureColumn('app_users', 'avatar_url', 'TEXT');
ensureColumn('app_users', 'theme_preference', "TEXT DEFAULT 'dark'");
ensureColumn('app_users', 'last_login_at', 'TEXT');
ensureColumn('app_users', 'last_seen_at', 'TEXT');

ensureColumn('user_sessions', 'remember_me', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('user_sessions', 'last_active_at', 'TEXT');
ensureColumn('user_sessions', 'user_agent', 'TEXT');

export const PAID_SERVICES_CATALOG: PaidServiceCatalogItem[] = [
  {
    code: 'store_feature_listing',
    targetRole: 'store',
    name: 'تمييز إعلان في صدارة السوق (7 أيام)',
    shortDesc: 'يثبت جهازك المعروض في قسم «إعلانات مميزة» أعلى سوق OMOR MARKET بإطار ذهبي واضح.',
    benefits: [
      'أولوية العرض في أعلى نتائج السوق لمدة 7 أيام كاملة',
      'شارة «إعلان مميّز» الذهبية لجذب المشترين الجادين',
      'زيادة فرص المشاهدة والرسائل المباشرة',
    ],
    priceEgp: 75,
    durationDays: 7,
    requiresListingSelection: true,
  },
  {
    code: 'store_certified_stamp',
    targetRole: 'store',
    name: 'ختم اعتماد وفحص التاجر الموثق',
    shortDesc: 'يمنح إعلان جهازك شارة «مفحوص ومعتمد» لتعزيز ثقة المشتري وتسريع قرار الشراء.',
    benefits: [
      'شارة فحص واعتماد إضافية على بطاقة الإعلان وصفحة التفاصيل',
      'إبراز التزام المتجر بسياسة الضمان وشفافية السجل',
      'رفع درجة الجاذبية مقابل الإعلانات العادية',
    ],
    priceEgp: 60,
    durationDays: 30,
    requiresListingSelection: true,
  },
  {
    code: 'store_risk_pack',
    targetRole: 'store',
    name: 'حزمة 15 تقرير فحص مخاطر الشراء للمتاجر',
    shortDesc: 'تضيف 15 رصيدًا إضافيًا لتحليل المخاطر والتسعير الذكي قبل شراء الأجهزة المستعملة للمتجر.',
    benefits: [
      'فحص تاريخ الأعطال والبلاغات والسعر العادل قبل الاستحواذ',
      'حماية المتجر من شراء أجهزة مجمّعة أو مبالغ في سعرها',
      'تُضاف فورًا لرصيد التحليلات الذكية في حسابك',
    ],
    priceEgp: 120,
    quotaCredits: 15,
  },
  {
    code: 'tech_spotlight',
    targetRole: 'technician',
    name: 'ترويج مركز الصيانة في صدارة الدليل (14 يومًا)',
    shortDesc: 'يُظهر مركزك في قسم المراكز الموصى بها أعلى دليل الفنيين لجذب عملاء محافظتك.',
    benefits: [
      'ترتيب متقدم في دليل /technicians لمدة 14 يومًا',
      'شارة «مركز مميّز» الذهبية بجانب اسم الورشة أو المركز',
      'وصول مباشر من الزوار الباحثين عن صيانة قريبة',
    ],
    priceEgp: 150,
    durationDays: 14,
  },
  {
    code: 'tech_priority_leads',
    targetRole: 'technician',
    name: 'أولوية ترشيح طلبات الصيانة الذكية (30 يومًا)',
    shortDesc: 'يرشّح مركزك أولاً للعملاء عند إرسال طلب صيانة جديد في صفحة /repairs/request.',
    benefits: [
      'شارة «استجابة سريعة وأولوية ترشيح» في قائمة الفنيين',
      'ظهور متقدم داخل نموذج طلب الصيانة للعملاء الجدد',
      'مثالي لزيادة تدفق أجهزة الصيانة الموثقة للمركز',
    ],
    priceEgp: 180,
    durationDays: 30,
  },
  {
    code: 'tech_ai_pack',
    targetRole: 'technician',
    name: 'حزمة 25 تشخيص ذكي وتقارير فحص عملاء',
    shortDesc: 'رصيد إضافي لتشغيل مساعد التشخيص الذكي OMOR V3 وإعداد تقارير فحص منظمة للعملاء.',
    benefits: [
      '25 رصيد تشخيص ذكي للأعطال والصور عبر Gemini AI',
      'تنظيم خطوات الفحص وتقدير القطع المقترحة قبل فتح الجهاز',
      'رصيد دائم لا ينتهي بصلاحية شهرية',
    ],
    priceEgp: 95,
    quotaCredits: 25,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function addDaysIso(days: number): string {
  const d = new Date();
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

function hashUserPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyUserPassword(password: string, storedHash: string, storedSalt: string): boolean {
  if (!storedHash || !storedSalt) return false;
  const { hash } = hashUserPassword(password, storedSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const DEFAULT_PREFS: NotificationPreferences = {
  repairs: true,
  warranties: true,
  maintenanceReminders: true,
  warrantyAlertDays: 30,
  browserPushEnabled: false,
  transfers: true,
  messages: true,
  security: true,
};

function seedInitialPlatformCatalog(): void {
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM app_platform_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    db.prepare(
      'INSERT INTO app_platform_settings (id, allow_new_registrations, require_tech_verification, max_upload_mb, marketplace_enabled) VALUES (1, 1, 1, 5, 1)'
    ).run();
  }

  // Only seed initial public catalog showcase once if devices & technicians are completely empty
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM app_users').get() as { c: number }).c;
  if (userCount === 0) {
    const insUser = db.prepare(
      `INSERT INTO app_users (id, full_name, email, password_hash, password_salt, phone, city, governorate, role, account_status, store_name, store_bio, privacy_hide_phone, privacy_hide_city, active_plan_slug, plan_billing_cycle, plan_expires_at, ai_quota_bonus, notification_prefs_json, created_at)
       VALUES (?, ?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?)`
    );
    for (const u of DEMO_USERS) {
      if (u.role === 'admin') continue; // Admin manages via /admin-portal interactive setup
      insUser.run(
        u.id,
        u.fullName,
        u.email,
        u.phone || null,
        u.city || 'القاهرة',
        u.governorate || u.city || 'القاهرة',
        u.role,
        u.accountStatus,
        u.storeName || null,
        u.storeBio || null,
        u.privacyHidePhone ? 1 : 0,
        u.privacyHideCity ? 1 : 0,
        u.role === 'technician' ? 'technician-pro' : u.role === 'store' ? 'store-enterprise' : null,
        JSON.stringify(DEFAULT_PREFS),
        u.createdAt
      );
    }
    // Second showcase technician account row
    insUser.run(
      'demo-tech-2',
      'م. يوسف طارق',
      'youssef.center@omor.sasastore.app',
      '+201099887766',
      'القاهرة',
      'القاهرة',
      'technician',
      'active',
      null,
      null,
      0,
      0,
      null,
      JSON.stringify(DEFAULT_PREFS),
      nowIso()
    );
  }

  const techCount = (db.prepare('SELECT COUNT(*) as c FROM technician_profiles').get() as { c: number }).c;
  if (techCount === 0) {
    const insTech = db.prepare(
      `INSERT INTO technician_profiles (id, user_id, display_name, center_name, avatar_url, specialties_json, supported_device_types_json, governorate, district, bio, public_contact, working_hours, is_verified, verified_repairs_count, is_pro, spotlight_until, priority_leads_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
    );
    for (const t of DEMO_TECHNICIANS) {
      insTech.run(
        t.id,
        t.userId,
        t.displayName,
        t.centerName,
        t.avatarUrl || null,
        JSON.stringify(t.specialties),
        JSON.stringify(t.supportedDeviceTypes),
        t.governorate,
        t.district,
        t.bio,
        t.publicContact,
        t.workingHours,
        t.isVerified ? 1 : 0,
        t.verifiedRepairsCount,
        t.id === 'tech-profile-1' ? 1 : 0
      );
    }
  }

  const devCount = (db.prepare('SELECT COUNT(*) as c FROM devices').get() as { c: number }).c;
  if (devCount === 0) {
    const insDev = db.prepare(
      `INSERT INTO devices (id, device_code, public_token, owner_id, category, brand, device_name, model, model_number, purchase_date, condition, status, image_url, verification_tier, visibility_json, private_data_json, lost_reported_at, lost_report_note, public_scan_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const d of DEMO_DEVICES) {
      insDev.run(
        d.id,
        d.deviceCode,
        d.publicToken,
        d.ownerId,
        d.category,
        d.brand,
        d.deviceName,
        d.model,
        d.modelNumber || null,
        d.purchaseDate || null,
        d.condition,
        d.status,
        d.imageUrl || null,
        d.verificationTier,
        JSON.stringify(d.visibility),
        JSON.stringify(d.privateData),
        d.lostReportedAt || null,
        d.lostReportNote || null,
        d.publicScanCount || 0,
        d.createdAt,
        d.updatedAt
      );
    }
  }

  const evtCount = (db.prepare('SELECT COUNT(*) as c FROM device_events').get() as { c: number }).c;
  if (evtCount === 0) {
    const insEvt = db.prepare(
      `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const e of DEMO_EVENTS) {
      insEvt.run(
        e.id,
        e.eventCode,
        e.deviceId,
        e.eventType,
        e.occurredAt,
        e.actorId,
        e.actorLabel,
        e.description,
        JSON.stringify(e.attachments),
        e.verificationStatus,
        e.ownerApproved ? 1 : 0
      );
    }
  }

  const reqCount = (db.prepare('SELECT COUNT(*) as c FROM repair_requests').get() as { c: number }).c;
  if (reqCount === 0) {
    const insReq = db.prepare(
      `INSERT INTO repair_requests (id, device_id, owner_id, technician_id, issue_type, fault_description, attachments_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of DEMO_REPAIR_REQUESTS) {
      insReq.run(
        r.id,
        r.deviceId,
        r.ownerId,
        r.technicianId,
        r.issueType,
        r.faultDescription,
        JSON.stringify(r.attachments),
        r.status,
        r.createdAt,
        r.updatedAt
      );
    }
  }

  const repCount = (db.prepare('SELECT COUNT(*) as c FROM repair_records').get() as { c: number }).c;
  if (repCount === 0) {
    const insRep = db.prepare(
      `INSERT INTO repair_records (id, request_id, device_id, technician_id, technician_name, center_name, issue_type, fault_description, diagnosis, action_taken, parts_json, repair_cost, intake_date, delivery_date, warranty_days, before_images_json, after_images_json, notes, status, owner_approved, owner_approved_at, parent_record_id, correction_reason, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of DEMO_REPAIR_RECORDS) {
      insRep.run(
        r.id,
        r.requestId || null,
        r.deviceId,
        r.technicianId,
        r.technicianName,
        r.centerName,
        r.issueType,
        r.faultDescription,
        r.diagnosis,
        r.actionTaken,
        JSON.stringify(r.parts),
        r.repairCost ?? null,
        r.intakeDate,
        r.deliveryDate || null,
        r.warrantyDays,
        JSON.stringify(r.beforeImages),
        JSON.stringify(r.afterImages),
        r.notes || null,
        r.status,
        r.ownerApproved ? 1 : 0,
        r.ownerApprovedAt || null,
        r.parentRecordId || null,
        r.correctionReason || null,
        r.createdBy,
        r.createdAt
      );
    }
  }

  const warCount = (db.prepare('SELECT COUNT(*) as c FROM warranties').get() as { c: number }).c;
  if (warCount === 0) {
    const insWar = db.prepare(
      `INSERT INTO warranties (id, device_id, owner_id, item_or_part_name, issuer_name, is_source_verified, start_date, end_date, terms, warranty_number, document_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const w of DEMO_WARRANTIES) {
      insWar.run(
        w.id,
        w.deviceId,
        w.ownerId,
        w.itemOrPartName,
        w.issuerName,
        w.isSourceVerified ? 1 : 0,
        w.startDate,
        w.endDate,
        w.terms || null,
        w.warrantyNumber || null,
        w.documentName || null,
        w.status,
        w.createdAt
      );
    }
  }

  const revCount = (db.prepare('SELECT COUNT(*) as c FROM technician_reviews').get() as { c: number }).c;
  if (revCount === 0) {
    const insRev = db.prepare(
      `INSERT INTO technician_reviews (id, technician_id, reviewer_id, reviewer_name, repair_record_id, rating, comment, is_reported, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const rv of DEMO_REVIEWS) {
      insRev.run(
        rv.id,
        rv.technicianId,
        rv.reviewerId,
        rv.reviewerName,
        rv.repairRecordId,
        rv.rating,
        rv.comment,
        rv.isReported ? 1 : 0,
        rv.createdAt
      );
    }
  }

  const lstCount = (db.prepare('SELECT COUNT(*) as c FROM marketplace_listings').get() as { c: number }).c;
  if (lstCount === 0) {
    const insLst = db.prepare(
      `INSERT INTO marketplace_listings (id, device_id, seller_id, seller_name, seller_type, title, price, currency, city, condition, description, images_json, store_warranty_days, is_featured, featured_until, store_certified, seller_is_vip, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const l of DEMO_LISTINGS) {
      insLst.run(
        l.id,
        l.deviceId,
        l.sellerId,
        l.sellerName,
        l.sellerType,
        l.title,
        l.price,
        l.currency,
        l.city,
        l.condition,
        l.description,
        JSON.stringify(l.images),
        l.storeWarrantyDays,
        l.sellerType === 'store' ? 1 : 0,
        l.sellerType === 'store' ? addDaysIso(30) : null,
        l.sellerType === 'store' ? 1 : 0,
        l.sellerType === 'store' ? 1 : 0,
        l.status,
        l.createdAt
      );
    }
  }

  const remCount = (db.prepare('SELECT COUNT(*) as c FROM maintenance_reminders').get() as { c: number }).c;
  if (remCount === 0) {
    const insRem = db.prepare(
      `INSERT INTO maintenance_reminders (id, device_id, owner_id, title, category, interval_days, next_due_date, last_completed_at, notes, is_auto_suggested, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const m of DEMO_MAINTENANCE_REMINDERS) {
      insRem.run(
        m.id,
        m.deviceId,
        m.ownerId,
        m.title,
        m.category,
        m.intervalDays,
        m.nextDueDate,
        m.lastCompletedAt || null,
        m.notes || null,
        m.isAutoSuggested ? 1 : 0,
        m.createdAt
      );
    }
  }

  const trptCount = (db.prepare('SELECT COUNT(*) as c FROM trust_reports').get() as { c: number }).c;
  if (trptCount === 0) {
    const insRpt = db.prepare(
      `INSERT INTO trust_reports (id, report_code, reporter_id, reporter_name, target_type, target_id, target_label, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of DEMO_REPORTS) {
      insRpt.run(
        r.id,
        r.reportCode,
        r.reporterId,
        r.reporterName,
        r.targetType,
        r.targetId,
        r.targetLabel,
        r.reason,
        r.description,
        r.status,
        r.createdAt
      );
    }
  }

  const audCount = (db.prepare('SELECT COUNT(*) as c FROM app_audit_logs').get() as { c: number }).c;
  if (audCount === 0) {
    const insAud = db.prepare(
      `INSERT INTO app_audit_logs (id, actor_id, actor_label, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const a of DEMO_AUDIT_LOGS) {
      insAud.run(a.id, a.actorId, a.actorLabel, a.action, a.entityType, a.entityId || null, a.details, a.createdAt);
    }
  }

  const spCount = (db.prepare('SELECT COUNT(*) as c FROM spare_part_stats').get() as { c: number }).c;
  if (spCount === 0) {
    const insSp = db.prepare(
      `INSERT INTO spare_part_stats (id, category, brand, device_model_pattern, part_name, part_category, origin, min_price_egp, avg_price_egp, max_price_egp, avg_warranty_days, sample_count, trend, last_updated, source_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of DEMO_SPARE_PART_STATS) {
      insSp.run(
        s.id,
        s.category,
        s.brand,
        s.deviceModelPattern,
        s.partName,
        s.partCategory,
        s.origin,
        s.minPriceEgp,
        s.avgPriceEgp,
        s.maxPriceEgp,
        s.avgWarrantyDays,
        s.sampleCount,
        s.trend,
        s.lastUpdated,
        s.sourceLabel
      );
    }
  }

  const b2bCount = (db.prepare('SELECT COUNT(*) as c FROM b2b_partners').get() as { c: number }).c;
  if (b2bCount === 0) {
    const insB2b = db.prepare(
      `INSERT INTO b2b_partners (id, company_name, partner_type, governorate, branches_count, supported_categories_json, supported_brands_json, sla_hours, warranty_policy, contact_phone, contact_email, integration_status, webhook_code, linked_technicians_count, is_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const b of DEMO_B2B_PARTNERS) {
      insB2b.run(
        b.id,
        b.companyName,
        b.partnerType,
        b.governorate,
        b.branchesCount,
        JSON.stringify(b.supportedCategories),
        JSON.stringify(b.supportedBrands),
        b.slaHours,
        b.warrantyPolicy,
        b.contactPhone,
        b.contactEmail,
        b.integrationStatus,
        b.webhookCode,
        b.linkedTechniciansCount,
        b.isVerified ? 1 : 0,
        b.createdAt
      );
    }
  }
}

seedInitialPlatformCatalog();

// --- Row Mappers ---

function mapUserRow(row: Record<string, unknown>, isSelfOrAdmin: boolean): UserProfile {
  const hidePhone = Boolean(row.privacy_hide_phone);
  const hideCity = Boolean(row.privacy_hide_city);
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: isSelfOrAdmin ? String(row.email) : '',
    phone: isSelfOrAdmin || !hidePhone ? (row.phone ? String(row.phone) : undefined) : undefined,
    city: isSelfOrAdmin || !hideCity ? (row.city ? String(row.city) : undefined) : undefined,
    governorate: isSelfOrAdmin || !hideCity ? (row.governorate ? String(row.governorate) : undefined) : undefined,
    role: row.role as UserRole,
    accountStatus: row.account_status as UserProfile['accountStatus'],
    storeName: row.store_name ? String(row.store_name) : undefined,
    storeBio: row.store_bio ? String(row.store_bio) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    themePreference: isSelfOrAdmin
      ? row.theme_preference === 'light'
        ? 'light'
        : 'dark'
      : undefined,
    privacyHidePhone: hidePhone,
    privacyHideCity: hideCity,
    activePlanSlug: isSelfOrAdmin && row.active_plan_slug ? String(row.active_plan_slug) : undefined,
    planBillingCycle:
      isSelfOrAdmin && row.plan_billing_cycle
        ? (String(row.plan_billing_cycle) as 'monthly' | 'yearly')
        : undefined,
    planExpiresAt: isSelfOrAdmin && row.plan_expires_at ? String(row.plan_expires_at) : undefined,
    aiQuotaBonus: isSelfOrAdmin ? Number(row.ai_quota_bonus || 0) : undefined,
    lastLoginAt: isSelfOrAdmin && row.last_login_at ? String(row.last_login_at) : undefined,
    createdAt: String(row.created_at),
    isDemo: false,
  };
}

function maskSerialValue(raw?: string): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim();
  if (clean.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function mapDeviceRow(row: Record<string, unknown>, viewerId: string | null, viewerRole?: UserRole): DeviceRecord {
  const ownerId = String(row.owner_id);
  const canViewPrivate = viewerId === ownerId || viewerRole === 'admin';
  const visibility = safeJson<DevicePublicVisibility>(row.visibility_json, {
    isPublic: true,
    showRepairs: true,
    showWarranty: true,
    showCondition: true,
    showMaskedSerial: false,
  });
  const rawPrivate = safeJson<DeviceRecord['privateData']>(row.private_data_json, {});

  return {
    id: String(row.id),
    deviceCode: String(row.device_code),
    publicToken: String(row.public_token),
    ownerId,
    category: row.category as DeviceCategorySlug,
    brand: String(row.brand),
    deviceName: String(row.device_name),
    model: String(row.model),
    modelNumber: row.model_number ? String(row.model_number) : undefined,
    purchaseDate: row.purchase_date ? String(row.purchase_date) : undefined,
    condition: row.condition as DeviceCondition,
    status: row.status as DeviceRecord['status'],
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    verificationTier: row.verification_tier as DeviceRecord['verificationTier'],
    visibility,
    privateData: canViewPrivate
      ? rawPrivate
      : {
          serialNumber: visibility.showMaskedSerial ? maskSerialValue(rawPrivate.serialNumber || rawPrivate.imei) : undefined,
        },
    lostReportedAt: row.lost_reported_at ? String(row.lost_reported_at) : undefined,
    lostReportNote: row.lost_report_note ? String(row.lost_report_note) : undefined,
    publicScanCount: Number(row.public_scan_count || 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    isDemo: false,
  };
}

function mapTechRow(row: Record<string, unknown>): TechnicianProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    displayName: String(row.display_name),
    centerName: String(row.center_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    specialties: safeJson<string[]>(row.specialties_json, []),
    supportedDeviceTypes: safeJson<DeviceCategorySlug[]>(row.supported_device_types_json, ['smartphone']),
    governorate: String(row.governorate),
    district: String(row.district),
    bio: String(row.bio),
    publicContact: String(row.public_contact),
    workingHours: String(row.working_hours),
    isVerified: Boolean(row.is_verified),
    verifiedRepairsCount: Number(row.verified_repairs_count || 0),
    isPro: Boolean(row.is_pro),
    spotlightUntil: row.spotlight_until ? String(row.spotlight_until) : undefined,
    priorityLeadsUntil: row.priority_leads_until ? String(row.priority_leads_until) : undefined,
    isDemo: false,
  };
}

function mapListingRow(row: Record<string, unknown>): MarketplaceListing {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    sellerId: String(row.seller_id),
    sellerName: String(row.seller_name),
    sellerType: row.seller_type as 'user' | 'store',
    title: String(row.title),
    price: Number(row.price),
    currency: String(row.currency || 'EGP'),
    city: String(row.city),
    condition: row.condition as DeviceCondition,
    description: String(row.description),
    images: safeJson<string[]>(row.images_json, []),
    storeWarrantyDays: Number(row.store_warranty_days || 0),
    isFeatured: Boolean(row.is_featured),
    featuredUntil: row.featured_until ? String(row.featured_until) : undefined,
    storeCertified: Boolean(row.store_certified),
    sellerIsVip: Boolean(row.seller_is_vip),
    status: row.status as MarketplaceListing['status'],
    createdAt: String(row.created_at),
    isDemo: false,
  };
}

// --- Session & Auth Functions ---

export const PERSISTENT_SESSION_DAYS = 90;
export const EPHEMERAL_SESSION_DAYS = 1;

export function createUserSession(
  userId: string,
  options?: { rememberMe?: boolean; userAgent?: string }
): string {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = nowIso();
  const rememberMe = options?.rememberMe !== false;
  const expiresAt = addDaysIso(rememberMe ? PERSISTENT_SESSION_DAYS : EPHEMERAL_SESSION_DAYS);
  const userAgent = (options?.userAgent || '').slice(0, 220) || null;
  db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(createdAt);
  db.prepare(
    `INSERT INTO user_sessions (token, user_id, created_at, expires_at, remember_me, last_active_at, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(token, userId, createdAt, expiresAt, rememberMe ? 1 : 0, createdAt, userAgent);
  return token;
}

export function verifyUserSessionWithMeta(token: string): {
  user: UserProfile;
  rememberMe: boolean;
  shouldRefreshCookie: boolean;
} | null {
  if (!token) return null;
  const now = nowIso();
  const row = db
    .prepare(
      `SELECT u.*, s.remember_me, s.last_active_at, s.expires_at AS session_expires_at
       FROM user_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ? AND u.account_status = 'active'`
    )
    .get(token, now) as Record<string, unknown> | undefined;
  if (!row) return null;

  const rememberMe = Number(row.remember_me ?? 1) === 1;
  const lastActiveMs = row.last_active_at ? new Date(String(row.last_active_at)).getTime() : 0;
  const expiresMs = row.session_expires_at ? new Date(String(row.session_expires_at)).getTime() : 0;
  const elapsedSinceActiveMs = Date.now() - lastActiveMs;
  const remainingMs = expiresMs - Date.now();
  let shouldRefreshCookie = false;

  if (rememberMe && (elapsedSinceActiveMs > 15 * 60 * 1000 || remainingMs < 80 * 24 * 60 * 60 * 1000)) {
    const nextExpires = addDaysIso(PERSISTENT_SESSION_DAYS);
    db.prepare('UPDATE user_sessions SET expires_at = ?, last_active_at = ? WHERE token = ?').run(
      nextExpires,
      now,
      token
    );
    db.prepare('UPDATE app_users SET last_seen_at = ? WHERE id = ?').run(now, String(row.id));
    shouldRefreshCookie = true;
  } else if (elapsedSinceActiveMs > 5 * 60 * 1000) {
    db.prepare('UPDATE user_sessions SET last_active_at = ? WHERE token = ?').run(now, token);
    db.prepare('UPDATE app_users SET last_seen_at = ? WHERE id = ?').run(now, String(row.id));
  }

  return {
    user: mapUserRow(row, true),
    rememberMe,
    shouldRefreshCookie,
  };
}

export function verifyUserSession(token: string): UserProfile | null {
  return verifyUserSessionWithMeta(token)?.user || null;
}

export function revokeUserSession(token: string): void {
  if (!token) return;
  db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
}

export function revokeAllUserSessions(userId: string, exceptToken?: string): void {
  if (exceptToken) {
    db.prepare('DELETE FROM user_sessions WHERE user_id = ? AND token != ?').run(userId, exceptToken);
  } else {
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  }
}

export function listUserSessions(userId: string, currentToken?: string): SessionInfo[] {
  const now = nowIso();
  db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(now);
  const rows = db
    .prepare(
      `SELECT token, created_at, last_active_at, expires_at, remember_me, user_agent
       FROM user_sessions
       WHERE user_id = ? AND expires_at > ?
       ORDER BY COALESCE(last_active_at, created_at) DESC`
    )
    .all(userId, now) as Array<Record<string, unknown>>;

  return rows.map((r) => {
    const tok = String(r.token);
    return {
      sessionId: tok.slice(0, 8),
      userAgent: r.user_agent ? String(r.user_agent) : 'متصفح غير محدد',
      rememberMe: Number(r.remember_me ?? 1) === 1,
      createdAt: String(r.created_at),
      lastActiveAt: r.last_active_at ? String(r.last_active_at) : String(r.created_at),
      expiresAt: String(r.expires_at),
      isCurrent: Boolean(currentToken && tok === currentToken),
    };
  });
}

export function revokeUserSessionByPrefix(userId: string, prefix: string): boolean {
  const clean = prefix.trim();
  if (!clean || clean.length < 6) return false;
  const rows = db
    .prepare('SELECT token FROM user_sessions WHERE user_id = ?')
    .all(userId) as Array<{ token: string }>;
  const match = rows.find((r) => r.token.startsWith(clean));
  if (!match) return false;
  db.prepare('DELETE FROM user_sessions WHERE token = ? AND user_id = ?').run(match.token, userId);
  return true;
}

const RESERVED_IDENTITY_PATTERNS = [
  'admin',
  'administrator',
  'superadmin',
  'support',
  'official',
  'sasa official',
  'sasastore official',
  'omor official',
  'الدعم الفني',
  'الدعم الرسمي',
  'ادارة المنصة',
  'إدارة المنصة',
  'ادارة صاصا',
  'إدارة صاصا',
  'مدير النظام',
  'خدمة العملاء الرسمية',
];

function isReservedImpersonationName(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ');
  return RESERVED_IDENTITY_PATTERNS.some((p) => normalized.includes(p));
}

function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '').trim();
}

function isPhoneOwnedByAnotherUser(phone: string, excludeUserId?: string): boolean {
  const clean = normalizePhoneDigits(phone);
  if (clean.length < 7) return false;
  const rows = db
    .prepare("SELECT id, phone FROM app_users WHERE account_status != 'deleted' AND phone IS NOT NULL")
    .all() as Array<{ id: string; phone: string }>;
  return rows.some((r) => r.id !== excludeUserId && normalizePhoneDigits(r.phone) === clean);
}

export function registerAppUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: 'user' | 'technician' | 'store';
  city: string;
  rememberMe?: boolean;
  userAgent?: string;
}): { ok: boolean; error?: string; user?: UserProfile; token?: string; rememberMe?: boolean } {
  const platformRow = db.prepare('SELECT allow_new_registrations FROM app_platform_settings WHERE id = 1').get() as
    | { allow_new_registrations: number }
    | undefined;
  if (platformRow && platformRow.allow_new_registrations === 0) {
    return { ok: false, error: 'التسجيل الجديد مغلق مؤقتًا من إعدادات المنصة.' };
  }

  if (isReservedImpersonationName(input.fullName)) {
    return {
      ok: false,
      error: 'هذا الاسم محجوز لإدارة المنصة أو الدعم الرسمي ولا يُسمح بانتحاله.',
    };
  }

  const emailNorm = input.email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM app_users WHERE LOWER(email) = ?').get(emailNorm);
  if (existing) {
    return { ok: false, error: 'هذا البريد الإلكتروني مسجل بالفعل.' };
  }

  const id = `USR-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const { hash, salt } = hashUserPassword(input.password);

  db.prepare(
    `INSERT INTO app_users (id, full_name, email, password_hash, password_salt, phone, city, governorate, role, account_status, store_name, store_bio, avatar_url, theme_preference, privacy_hide_phone, privacy_hide_city, notification_prefs_json, last_login_at, last_seen_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 'active', ?, NULL, NULL, 'dark', 1, 0, ?, ?, ?, ?)`
  ).run(
    id,
    input.fullName.trim(),
    emailNorm,
    hash,
    salt,
    input.city.trim(),
    input.city.trim(),
    input.role,
    input.role === 'store' ? input.fullName.trim() : null,
    JSON.stringify(DEFAULT_PREFS),
    ts,
    ts,
    ts
  );

  if (input.role === 'technician') {
    const techId = `TECH-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(
      `INSERT INTO technician_profiles (id, user_id, display_name, center_name, avatar_url, specialties_json, supported_device_types_json, governorate, district, bio, public_contact, working_hours, is_verified, verified_repairs_count, is_pro)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'وسط المدينة', 'فني مسجل حديثًا عبر منصة عُمْر.', ?, 'السبت - الخميس: 10:00 ص إلى 8:00 م', 0, 0, 0)`
    ).run(
      techId,
      id,
      input.fullName.trim(),
      `مركز ${input.fullName.trim()} للصيانة`,
      JSON.stringify(['صيانة عامة وتشخيص أعطال']),
      JSON.stringify(['smartphone', 'laptop']),
      input.city.trim(),
      emailNorm
    );
  }

  db.prepare(
    `INSERT INTO app_notifications (id, user_id, type, title, body, link_path, is_read, created_at)
     VALUES (?, ?, 'security_alert', 'مرحبًا بك في SASA STORE OMOR', 'تم تفعيل حسابك بنجاح في المنصة. ابدأ بتسجيل جهازك الأول وتوليد هويته الرقمية.', '/devices/new', 0, ?)`
  ).run(`NTF-${crypto.randomUUID().slice(0, 8)}`, id, ts);

  const rememberMe = input.rememberMe !== false;
  const row = db.prepare('SELECT * FROM app_users WHERE id = ?').get(id) as Record<string, unknown>;
  const token = createUserSession(id, { rememberMe, userAgent: input.userAgent });
  return { ok: true, user: mapUserRow(row, true), token, rememberMe };
}

export function loginAppUser(
  email: string,
  password: string,
  options?: { rememberMe?: boolean; userAgent?: string }
): { ok: boolean; error?: string; user?: UserProfile; token?: string; rememberMe?: boolean } {
  const emailNorm = email.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM app_users WHERE LOWER(email) = ?').get(emailNorm) as
    | Record<string, unknown>
    | undefined;
  if (!row || row.account_status === 'deleted') {
    return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
  }
  if (row.account_status === 'suspended') {
    return { ok: false, error: 'هذا الحساب معطل حاليًا من قِبل الإدارة.' };
  }
  if (!verifyUserPassword(password, String(row.password_hash || ''), String(row.password_salt || ''))) {
    return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
  }
  const ts = nowIso();
  const userId = String(row.id);
  db.prepare('UPDATE app_users SET last_login_at = ?, last_seen_at = ? WHERE id = ?').run(ts, ts, userId);
  const updatedRow = db.prepare('SELECT * FROM app_users WHERE id = ?').get(userId) as Record<string, unknown>;
  const user = mapUserRow(updatedRow, true);
  const rememberMe = options?.rememberMe !== false;
  const token = createUserSession(user.id, { rememberMe, userAgent: options?.userAgent });
  return { ok: true, user, token, rememberMe };
}

export function changeAppUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentToken?: string
): { ok: boolean; error?: string } {
  const row = db.prepare('SELECT password_hash, password_salt FROM app_users WHERE id = ?').get(userId) as
    | { password_hash: string; password_salt: string }
    | undefined;
  if (!row) return { ok: false, error: 'الحساب غير موجود.' };
  if (!verifyUserPassword(currentPassword, row.password_hash, row.password_salt)) {
    return { ok: false, error: 'كلمة المرور الحالية غير صحيحة.' };
  }
  const { hash, salt } = hashUserPassword(newPassword);
  db.prepare('UPDATE app_users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, userId);
  revokeAllUserSessions(userId, currentToken);
  return { ok: true };
}

// --- Full Workspace Snapshot (Public vs Authenticated) ---

export function getAppWorkspaceState(viewer: UserProfile | null) {
  const viewerId = viewer?.id || null;
  const viewerRole = viewer?.role;
  const isAdmin = viewerRole === 'admin';

  const userRows = db.prepare("SELECT * FROM app_users WHERE account_status != 'deleted'").all() as Array<
    Record<string, unknown>
  >;
  const users = userRows.map((u) => mapUserRow(u, isAdmin || String(u.id) === viewerId));

  const deviceRows = db.prepare('SELECT * FROM devices ORDER BY updated_at DESC').all() as Array<
    Record<string, unknown>
  >;
  const devices = deviceRows
    .filter((d) => {
      const vis = safeJson<DevicePublicVisibility>(d.visibility_json, { isPublic: true } as DevicePublicVisibility);
      return isAdmin || String(d.owner_id) === viewerId || (vis.isPublic && String(d.status) !== 'archived');
    })
    .map((d) => mapDeviceRow(d, viewerId, viewerRole));

  const visibleDeviceIds = new Set(devices.map((d) => d.id));

  const events = (
    db.prepare('SELECT * FROM device_events ORDER BY occurred_at DESC').all() as Array<Record<string, unknown>>
  )
    .filter((e) => visibleDeviceIds.has(String(e.device_id)))
    .map((e) => ({
      id: String(e.id),
      eventCode: String(e.event_code),
      deviceId: String(e.device_id),
      eventType: e.event_type as EventType,
      occurredAt: String(e.occurred_at),
      actorId: String(e.actor_id),
      actorLabel: String(e.actor_label),
      description: String(e.description),
      attachments: safeJson<string[]>(e.attachments_json, []),
      verificationStatus: e.verification_status as DeviceEvent['verificationStatus'],
      ownerApproved: Boolean(e.owner_approved),
      isDemo: false,
    }));

  const technicians = (
    db.prepare('SELECT * FROM technician_profiles ORDER BY is_verified DESC, verified_repairs_count DESC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapTechRow);

  const techIdsOwned = new Set(technicians.filter((t) => t.userId === viewerId).map((t) => t.id));
  const myDeviceIds = new Set(devices.filter((d) => d.ownerId === viewerId).map((d) => d.id));

  const repairRequests: RepairRequest[] = viewerId
    ? (
        db.prepare('SELECT * FROM repair_requests ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
      )
        .filter(
          (r) =>
            isAdmin ||
            String(r.owner_id) === viewerId ||
            techIdsOwned.has(String(r.technician_id))
        )
        .map((r) => ({
          id: String(r.id),
          deviceId: String(r.device_id),
          ownerId: String(r.owner_id),
          technicianId: String(r.technician_id),
          issueType: String(r.issue_type),
          faultDescription: String(r.fault_description),
          attachments: safeJson<string[]>(r.attachments_json, []),
          status: r.status as RepairStatus,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
          isDemo: false,
        }))
    : [];

  const repairRecords: RepairRecord[] = (
    db.prepare('SELECT * FROM repair_records ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  )
    .filter(
      (r) =>
        isAdmin ||
        Boolean(r.owner_approved) ||
        myDeviceIds.has(String(r.device_id)) ||
        String(r.created_by) === viewerId
    )
    .map((r) => ({
      id: String(r.id),
      requestId: r.request_id ? String(r.request_id) : undefined,
      deviceId: String(r.device_id),
      technicianId: String(r.technician_id),
      technicianName: String(r.technician_name),
      centerName: String(r.center_name),
      issueType: String(r.issue_type),
      faultDescription: String(r.fault_description),
      diagnosis: String(r.diagnosis),
      actionTaken: String(r.action_taken),
      parts: safeJson<RepairPart[]>(r.parts_json, []),
      repairCost: r.repair_cost !== null && r.repair_cost !== undefined ? Number(r.repair_cost) : undefined,
      intakeDate: String(r.intake_date),
      deliveryDate: r.delivery_date ? String(r.delivery_date) : undefined,
      warrantyDays: Number(r.warranty_days || 0),
      beforeImages: safeJson<string[]>(r.before_images_json, []),
      afterImages: safeJson<string[]>(r.after_images_json, []),
      notes: r.notes ? String(r.notes) : undefined,
      status: r.status as RepairStatus,
      ownerApproved: Boolean(r.owner_approved),
      ownerApprovedAt: r.owner_approved_at ? String(r.owner_approved_at) : undefined,
      parentRecordId: r.parent_record_id ? String(r.parent_record_id) : undefined,
      correctionReason: r.correction_reason ? String(r.correction_reason) : undefined,
      createdBy: String(r.created_by),
      createdAt: String(r.created_at),
      isDemo: false,
    }));

  const warranties: WarrantyRecord[] = (
    db.prepare('SELECT * FROM warranties ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  )
    .filter((w) => visibleDeviceIds.has(String(w.device_id)))
    .map((w) => ({
      id: String(w.id),
      deviceId: String(w.device_id),
      ownerId: String(w.owner_id),
      itemOrPartName: String(w.item_or_part_name),
      issuerName: String(w.issuer_name),
      isSourceVerified: Boolean(w.is_source_verified),
      startDate: String(w.start_date),
      endDate: String(w.end_date),
      terms: w.terms ? String(w.terms) : undefined,
      warrantyNumber: w.warranty_number ? String(w.warranty_number) : undefined,
      documentName: w.document_name ? String(w.document_name) : undefined,
      status: w.status as WarrantyRecord['status'],
      createdAt: String(w.created_at),
      isDemo: false,
    }));

  const reviews: TechnicianReview[] = (
    db.prepare('SELECT * FROM technician_reviews ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  ).map((rv) => ({
    id: String(rv.id),
    technicianId: String(rv.technician_id),
    reviewerId: String(rv.reviewer_id),
    reviewerName: String(rv.reviewer_name),
    repairRecordId: String(rv.repair_record_id),
    rating: Number(rv.rating),
    comment: String(rv.comment),
    isReported: Boolean(rv.is_reported),
    createdAt: String(rv.created_at),
    isDemo: false,
  }));

  const listings: MarketplaceListing[] = (
    db
      .prepare('SELECT * FROM marketplace_listings ORDER BY is_featured DESC, created_at DESC')
      .all() as Array<Record<string, unknown>>
  ).map(mapListingRow);

  const transfers: OwnershipTransfer[] = viewerId
    ? (
        db
          .prepare('SELECT * FROM ownership_transfers ORDER BY created_at DESC')
          .all() as Array<Record<string, unknown>>
      )
        .filter((t) => isAdmin || String(t.from_user_id) === viewerId || String(t.to_user_id) === viewerId)
        .map((t) => ({
          id: String(t.id),
          deviceId: String(t.device_id),
          fromUserId: String(t.from_user_id),
          fromUserName: String(t.from_user_name),
          toUserId: t.to_user_id ? String(t.to_user_id) : undefined,
          toUserName: t.to_user_name ? String(t.to_user_name) : undefined,
          transferCode: String(t.transfer_code),
          expiresAt: String(t.expires_at),
          usedAt: t.used_at ? String(t.used_at) : undefined,
          status: t.status as OwnershipTransfer['status'],
          disputeReason: t.dispute_reason ? String(t.dispute_reason) : undefined,
          createdAt: String(t.created_at),
          isDemo: false,
        }))
    : [];

  const conversations: Conversation[] = viewerId
    ? (
        db
          .prepare(
            'SELECT * FROM conversations WHERE participant_a = ? OR participant_b = ? ORDER BY created_at DESC'
          )
          .all(viewerId, viewerId) as Array<Record<string, unknown>>
      ).map((c) => ({
        id: String(c.id),
        listingId: c.listing_id ? String(c.listing_id) : undefined,
        listingTitle: c.listing_title ? String(c.listing_title) : undefined,
        participantA: String(c.participant_a),
        participantB: String(c.participant_b),
        participantAName: String(c.participant_a_name),
        participantBName: String(c.participant_b_name),
        createdAt: String(c.created_at),
        isDemo: false,
      }))
    : [];

  const convIds = new Set(conversations.map((c) => c.id));
  const messages: ChatMessage[] = viewerId
    ? (
        db.prepare('SELECT * FROM chat_messages ORDER BY created_at ASC').all() as Array<Record<string, unknown>>
      )
        .filter((m) => convIds.has(String(m.conversation_id)))
        .map((m) => ({
          id: String(m.id),
          conversationId: String(m.conversation_id),
          senderId: String(m.sender_id),
          senderName: String(m.sender_name),
          body: String(m.body),
          isRead: Boolean(m.is_read),
          createdAt: String(m.created_at),
          isDemo: false,
        }))
    : [];

  const notifications: NotificationItem[] = viewerId
    ? (
        db
          .prepare('SELECT * FROM app_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
          .all(viewerId) as Array<Record<string, unknown>>
      ).map((n) => ({
        id: String(n.id),
        userId: String(n.user_id),
        type: n.type as NotificationItem['type'],
        title: String(n.title),
        body: String(n.body),
        linkPath: n.link_path ? String(n.link_path) : undefined,
        dedupeKey: n.dedupe_key ? String(n.dedupe_key) : undefined,
        isRead: Boolean(n.is_read),
        createdAt: String(n.created_at),
        isDemo: false,
      }))
    : [];

  const maintenanceReminders: MaintenanceReminder[] = viewerId
    ? (
        db
          .prepare('SELECT * FROM maintenance_reminders WHERE owner_id = ? ORDER BY next_due_date ASC')
          .all(viewerId) as Array<Record<string, unknown>>
      ).map((m) => ({
        id: String(m.id),
        deviceId: String(m.device_id),
        ownerId: String(m.owner_id),
        title: String(m.title),
        category: m.category as MaintenanceCategory,
        intervalDays: Number(m.interval_days),
        nextDueDate: String(m.next_due_date),
        lastCompletedAt: m.last_completed_at ? String(m.last_completed_at) : undefined,
        notes: m.notes ? String(m.notes) : undefined,
        isAutoSuggested: Boolean(m.is_auto_suggested),
        createdAt: String(m.created_at),
        isDemo: false,
      }))
    : [];

  const reports: ReportItem[] = isAdmin
    ? (db.prepare('SELECT * FROM trust_reports ORDER BY created_at DESC').all() as Array<Record<string, unknown>>).map(
        (r) => ({
          id: String(r.id),
          reportCode: String(r.report_code),
          reporterId: String(r.reporter_id),
          reporterName: String(r.reporter_name),
          targetType: r.target_type as ReportItem['targetType'],
          targetId: String(r.target_id),
          targetLabel: String(r.target_label),
          reason: r.reason as ReportReason,
          description: String(r.description),
          status: r.status as ReportStatus,
          createdAt: String(r.created_at),
          isDemo: false,
        })
      )
    : [];

  const auditLogs: AuditLogItem[] = isAdmin
    ? (db.prepare('SELECT * FROM app_audit_logs ORDER BY created_at DESC LIMIT 200').all() as Array<
        Record<string, unknown>
      >).map((a) => ({
        id: String(a.id),
        actorId: String(a.actor_id),
        actorLabel: String(a.actor_label),
        action: String(a.action),
        entityType: String(a.entity_type),
        entityId: a.entity_id ? String(a.entity_id) : undefined,
        details: String(a.details),
        createdAt: String(a.created_at),
        isDemo: false,
      }))
    : [];

  const sparePartStats: SparePartStat[] = (
    db.prepare('SELECT * FROM spare_part_stats ORDER BY last_updated DESC').all() as Array<Record<string, unknown>>
  ).map((s) => ({
    id: String(s.id),
    category: s.category as DeviceCategorySlug,
    brand: String(s.brand),
    deviceModelPattern: String(s.device_model_pattern),
    partName: String(s.part_name),
    partCategory: s.part_category as SparePartCategory,
    origin: s.origin as SparePartOrigin,
    minPriceEgp: Number(s.min_price_egp),
    avgPriceEgp: Number(s.avg_price_egp),
    maxPriceEgp: Number(s.max_price_egp),
    avgWarrantyDays: Number(s.avg_warranty_days),
    sampleCount: Number(s.sample_count),
    trend: s.trend as SparePartStat['trend'],
    lastUpdated: String(s.last_updated),
    sourceLabel: String(s.source_label),
    isDemo: false,
  }));

  const b2bPartners: B2BPartner[] = (
    db.prepare('SELECT * FROM b2b_partners ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  ).map((b) => ({
    id: String(b.id),
    companyName: String(b.company_name),
    partnerType: b.partner_type as B2BPartnerType,
    governorate: String(b.governorate),
    branchesCount: Number(b.branches_count),
    supportedCategories: safeJson<DeviceCategorySlug[]>(b.supported_categories_json, ['smartphone']),
    supportedBrands: safeJson<string[]>(b.supported_brands_json, []),
    slaHours: Number(b.sla_hours),
    warrantyPolicy: String(b.warranty_policy),
    contactPhone: String(b.contact_phone),
    contactEmail: String(b.contact_email),
    integrationStatus: b.integration_status as B2BPartner['integrationStatus'],
    webhookCode: String(b.webhook_code),
    linkedTechniciansCount: Number(b.linked_technicians_count),
    isVerified: Boolean(b.is_verified),
    createdAt: String(b.created_at),
    isDemo: false,
  }));

  const psRow = db.prepare('SELECT * FROM app_platform_settings WHERE id = 1').get() as
    | Record<string, unknown>
    | undefined;
  const platformSettings = {
    allowNewRegistrations: psRow ? Boolean(psRow.allow_new_registrations) : true,
    requireTechVerification: psRow ? Boolean(psRow.require_tech_verification) : true,
    maxUploadMb: psRow ? Number(psRow.max_upload_mb) : 5,
    marketplaceEnabled: psRow ? Boolean(psRow.marketplace_enabled) : true,
  };

  let notificationPrefs: NotificationPreferences = DEFAULT_PREFS;
  if (viewerId) {
    const uRow = db.prepare('SELECT notification_prefs_json FROM app_users WHERE id = ?').get(viewerId) as
      | { notification_prefs_json: string | null }
      | undefined;
    if (uRow?.notification_prefs_json) {
      notificationPrefs = { ...DEFAULT_PREFS, ...safeJson(uRow.notification_prefs_json, DEFAULT_PREFS) };
    }
  }

  const subscriptions: UserSubscription[] = viewerId
    ? (
        db
          .prepare('SELECT * FROM user_subscriptions WHERE user_id = ? ORDER BY created_at DESC')
          .all(viewerId) as Array<Record<string, unknown>>
      ).map((s) => ({
        id: String(s.id),
        userId: String(s.user_id),
        planId: String(s.plan_id),
        planSlug: String(s.plan_slug),
        planName: String(s.plan_name),
        targetRole: String(s.target_role),
        billingCycle: s.billing_cycle as 'monthly' | 'yearly',
        priceEgp: Number(s.price_egp),
        paymentMethod: s.payment_method as PaymentMethodOption,
        paymentReference: s.payment_reference ? String(s.payment_reference) : undefined,
        status: s.status as UserSubscription['status'],
        startedAt: String(s.started_at),
        expiresAt: String(s.expires_at),
        createdAt: String(s.created_at),
      }))
    : [];

  const serviceOrders: PaidServiceOrder[] = viewerId
    ? (
        db
          .prepare('SELECT * FROM paid_service_orders WHERE user_id = ? ORDER BY created_at DESC')
          .all(viewerId) as Array<Record<string, unknown>>
      ).map((o) => ({
        id: String(o.id),
        userId: String(o.user_id),
        serviceCode: o.service_code as PaidServiceCode,
        serviceName: String(o.service_name),
        targetType: o.target_type as PaidServiceOrder['targetType'],
        targetId: o.target_id ? String(o.target_id) : undefined,
        targetLabel: o.target_label ? String(o.target_label) : undefined,
        priceEgp: Number(o.price_egp),
        paymentMethod: o.payment_method as PaymentMethodOption,
        paymentReference: o.payment_reference ? String(o.payment_reference) : undefined,
        status: o.status as PaidServiceOrder['status'],
        expiresAt: o.expires_at ? String(o.expires_at) : undefined,
        createdAt: String(o.created_at),
      }))
    : [];

  const inspections: DeviceInspection[] = (
    db.prepare('SELECT * FROM device_inspections ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  )
    .filter((ins) => visibleDeviceIds.has(String(ins.device_id)))
    .map((ins) => ({
      id: String(ins.id),
      inspectionCode: String(ins.inspection_code),
      deviceId: String(ins.device_id),
      inspectorId: String(ins.inspector_id),
      inspectorName: String(ins.inspector_name),
      trustLevel: ins.trust_level as TrustSourceLevel,
      items: safeJson<Record<InspectionItemKey, InspectionItemStatus>>(ins.items_json, {
        screen: 'not_tested',
        touch: 'not_tested',
        battery: 'not_tested',
        cameras: 'not_tested',
        audio: 'not_tested',
        charging: 'not_tested',
        network: 'not_tested',
        sensors: 'not_tested',
      }),
      untestedItems: safeJson<InspectionItemKey[]>(ins.untested_items_json, []),
      overallOutcome: ins.overall_outcome as DeviceInspection['overallOutcome'],
      inspectorNotes: String(ins.inspector_notes || ''),
      createdAt: String(ins.created_at),
    }));

  return {
    currentUser: viewer,
    users,
    devices,
    events,
    repairRequests,
    repairRecords,
    warranties,
    technicians,
    reviews,
    listings,
    transfers,
    conversations,
    messages,
    notifications,
    maintenanceReminders,
    reports,
    auditLogs,
    sparePartStats,
    b2bPartners,
    notificationPrefs,
    platformSettings,
    subscriptions,
    serviceOrders,
    paidServicesCatalog: PAID_SERVICES_CATALOG,
    inspections,
  };
}

// --- Secure Public Identifier / IMEI / Serial Lookup ---

export function lookupPublicDeviceByIdentifier(query: string): {
  found: boolean;
  publicToken?: string;
  status?: DeviceRecord['status'];
  deviceCode?: string;
  brand?: string;
  deviceName?: string;
  lostReportedAt?: string;
  lostReportNote?: string;
} {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const qUpper = q.toUpperCase();
  if (!q) return { found: false };

  const rows = db.prepare("SELECT * FROM devices WHERE status != 'archived'").all() as Array<Record<string, unknown>>;
  for (const row of rows) {
    const token = String(row.public_token);
    const code = String(row.device_code);
    const priv = safeJson<DeviceRecord['privateData']>(row.private_data_json, {});
    const imei = (priv.imei || '').trim().toLowerCase();
    const serial = (priv.serialNumber || '').trim().toLowerCase();

    if (
      token.toLowerCase() === qLower ||
      code.toUpperCase() === qUpper ||
      (imei && imei === qLower) ||
      (serial && serial === qLower)
    ) {
      return {
        found: true,
        publicToken: token,
        status: row.status as DeviceRecord['status'],
        deviceCode: code,
        brand: String(row.brand),
        deviceName: String(row.device_name),
        lostReportedAt: row.lost_reported_at ? String(row.lost_reported_at) : undefined,
        lostReportNote: row.lost_report_note ? String(row.lost_report_note) : undefined,
      };
    }
  }
  return { found: false };
}

// --- Domain Helpers ---

function insertNotification(
  userId: string,
  type: NotificationItem['type'],
  title: string,
  body: string,
  linkPath?: string,
  dedupeKey?: string
) {
  if (dedupeKey) {
    const exists = db
      .prepare('SELECT id FROM app_notifications WHERE user_id = ? AND dedupe_key = ?')
      .get(userId, dedupeKey);
    if (exists) return;
  }
  db.prepare(
    `INSERT INTO app_notifications (id, user_id, type, title, body, link_path, dedupe_key, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(`NTF-${crypto.randomUUID().slice(0, 8)}`, userId, type, title, body, linkPath || null, dedupeKey || null, nowIso());
}

function insertAudit(
  actorId: string,
  actorLabel: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  details: string
) {
  db.prepare(
    `INSERT INTO app_audit_logs (id, actor_id, actor_label, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(`AUD-${crypto.randomUUID().slice(0, 8)}`, actorId, actorLabel, action, entityType, entityId || null, details, nowIso());
}

// --- Core Mutations ---

export function dbUpdateUserProfile(user: UserProfile, updates: Partial<UserProfile>): { ok: boolean; error?: string } {
  if (user.role !== 'admin') {
    if (isReservedImpersonationName(updates.fullName) || isReservedImpersonationName(updates.storeName)) {
      return {
        ok: false,
        error: 'الاسم أو اسم المتجر المدخل يحتوي على مسمى إداري محجوز يمنع انتحاله.',
      };
    }
  }
  if (updates.phone !== undefined && updates.phone.trim()) {
    const cleanPhone = normalizePhoneDigits(updates.phone);
    if (cleanPhone.length < 8) {
      return { ok: false, error: 'رقم الهاتف المدخل غير مكتمل.' };
    }
    if (isPhoneOwnedByAnotherUser(updates.phone, user.id)) {
      return { ok: false, error: 'رقم الهاتف مستخدم بالفعل في حساب آخر لحماية الهويات.' };
    }
  }
  const nextAvatarUrl =
    updates.avatarUrl !== undefined ? (updates.avatarUrl.trim() || null) : (user.avatarUrl || null);
  const nextTheme =
    updates.themePreference === 'light' || updates.themePreference === 'dark'
      ? updates.themePreference
      : (user.themePreference || 'dark');

  db.prepare(
    `UPDATE app_users
     SET full_name = ?, phone = ?, city = ?, governorate = ?, store_name = ?, store_bio = ?, avatar_url = ?, theme_preference = ?, privacy_hide_phone = ?, privacy_hide_city = ?
     WHERE id = ?`
  ).run(
    updates.fullName?.trim() || user.fullName,
    updates.phone !== undefined ? updates.phone.trim() || null : user.phone || null,
    updates.city?.trim() || user.city || null,
    updates.governorate?.trim() || updates.city?.trim() || user.governorate || null,
    updates.storeName !== undefined ? updates.storeName.trim() || null : user.storeName || null,
    updates.storeBio !== undefined ? updates.storeBio.trim() || null : user.storeBio || null,
    nextAvatarUrl,
    nextTheme,
    updates.privacyHidePhone !== undefined ? (updates.privacyHidePhone ? 1 : 0) : user.privacyHidePhone ? 1 : 0,
    updates.privacyHideCity !== undefined ? (updates.privacyHideCity ? 1 : 0) : user.privacyHideCity ? 1 : 0,
    user.id
  );

  if (updates.avatarUrl !== undefined) {
    db.prepare('UPDATE technician_profiles SET avatar_url = ? WHERE user_id = ?').run(nextAvatarUrl, user.id);
  }
  return { ok: true };
}

export function dbDeleteUserAccount(user: UserProfile): { ok: boolean } {
  db.prepare(
    `UPDATE app_users
     SET full_name = 'حساب محذوف', email = ?, phone = NULL, account_status = 'deleted'
     WHERE id = ?`
  ).run(`deleted_${user.id}@anonymized.local`, user.id);
  db.prepare("UPDATE devices SET status = 'archived' WHERE owner_id = ?").run(user.id);
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(user.id);
  insertAudit(user.id, user.fullName, 'حذف وإخفاء بيانات حساب', 'user', user.id, 'تنفيذ طلب المستخدم بحذف الحساب');
  return { ok: true };
}

export function dbAddDevice(
  user: UserProfile,
  payload: {
    category: DeviceCategorySlug;
    brand: string;
    deviceName: string;
    model: string;
    modelNumber?: string;
    serialNumber?: string;
    imei?: string;
    purchaseDate?: string;
    condition: DeviceCondition;
    imageUrl?: string;
    sellerName?: string;
    invoiceName?: string;
    privateNotes?: string;
    warrantyIssuer?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    warrantyNumber?: string;
  }
): { ok: boolean; data?: DeviceRecord; error?: string } {
  const ts = nowIso();
  const deviceId = `DEV-${crypto.randomUUID().slice(0, 8)}`;
  const deviceCode = `OMR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const publicToken = `pub-${crypto.randomUUID().slice(0, 10)}`;

  const visibility: DevicePublicVisibility = {
    isPublic: true,
    showRepairs: true,
    showWarranty: true,
    showCondition: true,
    showMaskedSerial: false,
  };
  const privateData: DeviceRecord['privateData'] = {
    serialNumber: payload.serialNumber?.trim() || undefined,
    imei: payload.imei?.trim() || undefined,
    sellerName: payload.sellerName?.trim() || undefined,
    invoiceName: payload.invoiceName?.trim() || undefined,
    privateNotes: payload.privateNotes?.trim() || undefined,
  };
  const verificationTier = privateData.invoiceName ? 'invoice_attached' : 'self_recorded';
  const imageUrl = payload.imageUrl?.trim() || '/src/assets/images/demo_phone_pro_1795361833294.jpg';

  db.prepare(
    `INSERT INTO devices (id, device_code, public_token, owner_id, category, brand, device_name, model, model_number, purchase_date, condition, status, image_url, verification_tier, visibility_json, private_data_json, public_scan_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    deviceId,
    deviceCode,
    publicToken,
    user.id,
    payload.category,
    payload.brand.trim(),
    payload.deviceName.trim(),
    payload.model.trim(),
    payload.modelNumber?.trim() || null,
    payload.purchaseDate || null,
    payload.condition,
    imageUrl,
    verificationTier,
    JSON.stringify(visibility),
    JSON.stringify(privateData),
    ts,
    ts
  );

  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'registered', ?, ?, ?, ?, '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    deviceId,
    ts,
    user.id,
    user.fullName,
    `تسجيل الجهاز ${payload.brand.trim()} ${payload.deviceName.trim()} وتوليد الهوية الرقمية ${deviceCode}.`
  );

  if (privateData.invoiceName) {
    db.prepare(
      `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
       VALUES (?, ?, ?, 'invoice_added', ?, ?, ?, 'إرفاق فاتورة الشراء في الخزينة الخاصة للجهاز.', ?, 'pending', 1)`
    ).run(
      `EVT-${crypto.randomUUID().slice(0, 8)}`,
      `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
      deviceId,
      ts,
      user.id,
      user.fullName,
      JSON.stringify([privateData.invoiceName])
    );
  }

  if (payload.warrantyIssuer?.trim() && payload.warrantyEnd?.trim()) {
    const startDate = payload.warrantyStart || payload.purchaseDate || ts.slice(0, 10);
    db.prepare(
      `INSERT INTO warranties (id, device_id, owner_id, item_or_part_name, issuer_name, is_source_verified, start_date, end_date, warranty_number, status, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', ?)`
    ).run(
      `WAR-${crypto.randomUUID().slice(0, 8)}`,
      deviceId,
      user.id,
      `ضمان ${payload.deviceName.trim()}`,
      payload.warrantyIssuer.trim(),
      startDate,
      payload.warrantyEnd.trim(),
      payload.warrantyNumber?.trim() || null,
      ts
    );
  }

  insertNotification(
    user.id,
    'device_added',
    'تم إصدار هوية رقمية جديدة',
    `تم تسجيل ${payload.deviceName.trim()} بالمعرّف ${deviceCode} وتوليد رمز QR الخاص به.`,
    `/devices/${deviceId}`
  );
  insertAudit(user.id, user.fullName, 'تسجيل جهاز جديد', 'device', deviceCode, `تم تسجيل ${payload.brand} ${payload.deviceName}`);

  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as Record<string, unknown>;
  return { ok: true, data: mapDeviceRow(row, user.id, user.role) };
}

export function dbUpdateDeviceVisibility(user: UserProfile, deviceId: string, visibility: DevicePublicVisibility): boolean {
  const row = db.prepare('SELECT id FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id);
  if (!row) return false;
  db.prepare('UPDATE devices SET visibility_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(visibility),
    nowIso(),
    deviceId
  );
  return true;
}

export function dbRotateDeviceToken(
  user: UserProfile,
  deviceId: string
): { ok: boolean; error?: string; publicToken?: string } {
  const row = db
    .prepare('SELECT id, device_code FROM devices WHERE id = ? AND owner_id = ?')
    .get(deviceId, user.id) as { id: string; device_code: string } | undefined;
  if (!row) {
    return { ok: false, error: 'فقط مالك الجهاز يمكنه تجديد رابط المشاركة الذكي (QR).' };
  }
  const newToken = `pub-${crypto.randomUUID().slice(0, 10)}`;
  const ts = nowIso();
  db.prepare('UPDATE devices SET public_token = ?, updated_at = ? WHERE id = ?').run(newToken, ts, deviceId);
  insertAudit(
    user.id,
    user.fullName,
    'تجديد رابط QR العام وإبطال السابق',
    'device',
    row.device_code,
    `تم إصدار رابط QR جديد: ${newToken}`
  );
  return { ok: true, publicToken: newToken };
}

export function dbCreateDeviceInspection(
  user: UserProfile,
  payload: {
    deviceId: string;
    items: Record<InspectionItemKey, InspectionItemStatus>;
    inspectorNotes?: string;
  }
): { ok: boolean; error?: string; data?: DeviceInspection } {
  const dev = db
    .prepare('SELECT id, owner_id, device_code, device_name, brand FROM devices WHERE id = ?')
    .get(payload.deviceId) as
    | { id: string; owner_id: string; device_code: string; device_name: string; brand: string }
    | undefined;
  if (!dev) {
    return { ok: false, error: 'الجهاز المطلوب غير موجود.' };
  }

  const keys: InspectionItemKey[] = [
    'screen',
    'touch',
    'battery',
    'cameras',
    'audio',
    'charging',
    'network',
    'sensors',
  ];
  const normalizedItems = {} as Record<InspectionItemKey, InspectionItemStatus>;
  const untestedItems: InspectionItemKey[] = [];
  let issueCount = 0;

  for (const k of keys) {
    const val = payload.items?.[k];
    const safeVal: InspectionItemStatus =
      val === 'passed' || val === 'issue_found' || val === 'not_tested' ? val : 'not_tested';
    normalizedItems[k] = safeVal;
    if (safeVal === 'not_tested') untestedItems.push(k);
    if (safeVal === 'issue_found') issueCount += 1;
  }

  const overallOutcome: DeviceInspection['overallOutcome'] =
    issueCount > 0 ? 'needs_attention' : untestedItems.length > 0 ? 'incomplete' : 'pass_noted';

  let trustLevel: TrustSourceLevel = 'user_entry';
  let inspectorName = user.fullName;
  if (user.role === 'store') {
    trustLevel = 'verified_store';
    inspectorName = user.storeName ? `${user.storeName} (${user.fullName})` : user.fullName;
  } else if (user.role === 'technician') {
    trustLevel = 'technician_checked';
    const tech = db
      .prepare('SELECT center_name, is_verified FROM technician_profiles WHERE user_id = ?')
      .get(user.id) as { center_name: string; is_verified: number } | undefined;
    if (tech) {
      inspectorName = `${tech.center_name} — ${user.fullName}`;
    }
  } else if (user.role === 'admin') {
    trustLevel = 'technician_checked';
  }

  const id = `INS-${crypto.randomUUID().slice(0, 8)}`;
  const inspectionCode = `CHK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ts = nowIso();
  const cleanNotes = (payload.inspectorNotes || '').trim();

  db.prepare(
    `INSERT INTO device_inspections (id, inspection_code, device_id, inspector_id, inspector_name, trust_level, items_json, untested_items_json, overall_outcome, inspector_notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    inspectionCode,
    dev.id,
    user.id,
    inspectorName,
    trustLevel,
    JSON.stringify(normalizedItems),
    JSON.stringify(untestedItems),
    overallOutcome,
    cleanNotes,
    ts
  );

  const summaryDesc = `تقرير فحص قبل الشراء (${inspectionCode}): بنود بها ملاحظة=${issueCount}، بنود لم تُفحص=${untestedItems.length}.${cleanNotes ? ` ملاحظات: ${cleanNotes}` : ''}`;
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'inspected', ?, ?, ?, ?, '[]', ?, 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    dev.id,
    ts,
    user.id,
    inspectorName,
    summaryDesc,
    trustLevel === 'user_entry' ? 'pending' : 'verified'
  );

  if (dev.owner_id !== user.id) {
    insertNotification(
      dev.owner_id,
      'device_added',
      `تقرير فحص جديد للجهاز ${dev.device_name}`,
      `أضاف ${inspectorName} تقرير فحص ما قبل الشراء (${inspectionCode}).`,
      `/inspections?deviceId=${encodeURIComponent(dev.id)}`
    );
  }
  insertAudit(user.id, user.fullName, 'إصدار تقرير فحص قبل الشراء', 'inspection', inspectionCode, dev.device_code);

  return {
    ok: true,
    data: {
      id,
      inspectionCode,
      deviceId: dev.id,
      inspectorId: user.id,
      inspectorName,
      trustLevel,
      items: normalizedItems,
      untestedItems,
      overallOutcome,
      inspectorNotes: cleanNotes,
      createdAt: ts,
    },
  };
}

export function dbUpdateDeviceCondition(user: UserProfile, deviceId: string, condition: DeviceCondition): boolean {
  const row = db.prepare('SELECT id FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id);
  if (!row) return false;
  const ts = nowIso();
  db.prepare('UPDATE devices SET condition = ?, updated_at = ? WHERE id = ?').run(condition, ts, deviceId);
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'condition_changed', ?, ?, ?, ?, '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    deviceId,
    ts,
    user.id,
    user.fullName,
    `تحديث حالة الجهاز المسجلة إلى: ${condition}.`
  );
  return true;
}

export function dbUpdateDevicePrivateData(
  user: UserProfile,
  deviceId: string,
  updates: {
    serialNumber?: string;
    imei?: string;
    sellerName?: string;
    invoiceName?: string;
    privateNotes?: string;
  }
): { ok: boolean; error?: string } {
  const row = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { ok: false, error: 'فقط مالك الجهاز يمكنه تعديل بيانات الخزينة الخاصة.' };
  if (updates.imei && updates.imei.trim() !== '' && !/^[0-9]{15}$/.test(updates.imei.trim())) {
    return { ok: false, error: 'رقم IMEI يجب أن يتكون من 15 رقمًا بالضبط.' };
  }
  const currentPriv = safeJson<DeviceRecord['privateData']>(row.private_data_json, {});
  const addedNewInvoice = Boolean(updates.invoiceName?.trim() && !currentPriv.invoiceName);
  const mergedPriv: DeviceRecord['privateData'] = {
    ...currentPriv,
    serialNumber: updates.serialNumber !== undefined ? updates.serialNumber.trim() || undefined : currentPriv.serialNumber,
    imei: updates.imei !== undefined ? updates.imei.trim() || undefined : currentPriv.imei,
    sellerName: updates.sellerName !== undefined ? updates.sellerName.trim() || undefined : currentPriv.sellerName,
    invoiceName: updates.invoiceName !== undefined ? updates.invoiceName.trim() || undefined : currentPriv.invoiceName,
    privateNotes: updates.privateNotes !== undefined ? updates.privateNotes.trim() || undefined : currentPriv.privateNotes,
  };
  const tier =
    String(row.verification_tier) === 'self_recorded' && mergedPriv.invoiceName
      ? 'invoice_attached'
      : String(row.verification_tier);
  const ts = nowIso();
  db.prepare('UPDATE devices SET private_data_json = ?, verification_tier = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(mergedPriv),
    tier,
    ts,
    deviceId
  );

  if (addedNewInvoice && mergedPriv.invoiceName) {
    db.prepare(
      `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
       VALUES (?, ?, ?, 'invoice_added', ?, ?, ?, 'تم إرفاق فاتورة شراء في الخزينة الخاصة وترقية توثيق الجهاز.', ?, 'pending', 1)`
    ).run(
      `EVT-${crypto.randomUUID().slice(0, 8)}`,
      `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
      deviceId,
      ts,
      user.id,
      user.fullName,
      JSON.stringify([mergedPriv.invoiceName])
    );
  }
  return { ok: true };
}

export function dbReportDeviceLost(user: UserProfile, deviceId: string, note: string): { ok: boolean; error?: string } {
  const row = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { ok: false, error: 'فقط مالك الجهاز يمكنه تفعيل بلاغ الفقدان أو السرقة.' };
  const cleanNote = note.trim() || 'تم الإبلاغ عن فقدان أو سرقة الجهاز من قِبل المالك.';
  const ts = nowIso();
  const vis = safeJson<DevicePublicVisibility>(row.visibility_json, {
    isPublic: true,
    showRepairs: true,
    showWarranty: true,
    showCondition: true,
    showMaskedSerial: false,
  });
  vis.isPublic = true;
  db.prepare(
    "UPDATE devices SET status = 'reported_stolen', lost_reported_at = ?, lost_report_note = ?, visibility_json = ?, updated_at = ? WHERE id = ?"
  ).run(ts, cleanNote, JSON.stringify(vis), ts, deviceId);
  db.prepare("UPDATE marketplace_listings SET status = 'removed' WHERE device_id = ?").run(deviceId);
  db.prepare(
    "UPDATE ownership_transfers SET status = 'cancelled' WHERE device_id = ? AND status IN ('pending', 'buyer_accepted')"
  ).run(deviceId);
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'lost_reported', ?, ?, ?, ?, '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    deviceId,
    ts,
    user.id,
    user.fullName,
    `تفعيل وضع الجهاز المفقود/المسروق: ${cleanNote}. تم إيقاف أي عرض بيع ونقل ملكية تلقائيًا.`
  );
  insertAudit(user.id, user.fullName, 'تفعيل بلاغ فقدان/سرقة جهاز', 'device', String(row.device_code), cleanNote);
  return { ok: true };
}

export function dbClearDeviceLost(user: UserProfile, deviceId: string): { ok: boolean; error?: string } {
  const row = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { ok: false, error: 'فقط مالك الجهاز يمكنه إلغاء حالة الفقدان.' };
  const ts = nowIso();
  db.prepare(
    "UPDATE devices SET status = 'active', lost_reported_at = NULL, lost_report_note = NULL, updated_at = ? WHERE id = ?"
  ).run(ts, deviceId);
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'lost_cleared', ?, ?, ?, 'تم تأكيد استعادة الجهاز وإلغاء حالة الفقدان/السرقة بواسطة المالك.', '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    deviceId,
    ts,
    user.id,
    user.fullName
  );
  return { ok: true };
}

export function dbRecordPublicScan(deviceId: string): void {
  db.prepare('UPDATE devices SET public_scan_count = public_scan_count + 1 WHERE id = ?').run(deviceId);
}

export function dbDeleteOrArchiveDevice(user: UserProfile, deviceId: string, mode: 'archive' | 'delete'): boolean {
  const row = db.prepare('SELECT owner_id, visibility_json FROM devices WHERE id = ?').get(deviceId) as
    | { owner_id: string; visibility_json: string }
    | undefined;
  if (!row || (row.owner_id !== user.id && user.role !== 'admin')) return false;
  if (mode === 'archive') {
    const vis = safeJson<DevicePublicVisibility>(row.visibility_json, {} as DevicePublicVisibility);
    vis.isPublic = false;
    db.prepare("UPDATE devices SET status = 'archived', visibility_json = ? WHERE id = ?").run(
      JSON.stringify(vis),
      deviceId
    );
    db.prepare("UPDATE marketplace_listings SET status = 'removed' WHERE device_id = ?").run(deviceId);
  } else {
    db.prepare('DELETE FROM devices WHERE id = ?').run(deviceId);
    db.prepare('DELETE FROM marketplace_listings WHERE device_id = ?').run(deviceId);
    db.prepare('DELETE FROM maintenance_reminders WHERE device_id = ?').run(deviceId);
    insertAudit(user.id, user.fullName, 'حذف سجل جهاز', 'device', deviceId, 'حذف الجهاز نهائيًا وفق طلب المالك');
  }
  return true;
}

export function dbAddDeviceEvent(user: UserProfile, deviceId: string, eventType: EventType, description: string): boolean {
  const row = db.prepare('SELECT id FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id);
  if (!row || !description.trim()) return false;
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 'unverified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    deviceId,
    eventType,
    nowIso(),
    user.id,
    user.fullName,
    description.trim()
  );
  return true;
}

// --- Repairs & Warranties ---

export function dbCreateRepairRequest(
  user: UserProfile,
  payload: { deviceId: string; technicianId: string; issueType: string; faultDescription: string; attachments?: string[] }
): { ok: boolean; error?: string; data?: RepairRequest } {
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(payload.deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'الجهاز غير موجود ضمن أجهزتك' };
  const tech = db.prepare('SELECT * FROM technician_profiles WHERE id = ?').get(payload.technicianId) as
    | Record<string, unknown>
    | undefined;
  if (!tech) return { ok: false, error: 'الفني غير موجود' };

  const id = `REQ-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO repair_requests (id, device_id, owner_id, technician_id, issue_type, fault_description, attachments_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
  ).run(
    id,
    payload.deviceId,
    user.id,
    payload.technicianId,
    payload.issueType.trim(),
    payload.faultDescription.trim(),
    JSON.stringify(payload.attachments || []),
    ts,
    ts
  );
  db.prepare("UPDATE devices SET status = 'in_repair', updated_at = ? WHERE id = ?").run(ts, payload.deviceId);
  insertNotification(
    String(tech.user_id),
    'repair_logged',
    'طلب توثيق صيانة جديد',
    `استلمت طلبًا لفحص/إصلاح جهاز ${String(device.device_name)} (${payload.issueType}).`,
    '/repairs'
  );
  return {
    ok: true,
    data: {
      id,
      deviceId: payload.deviceId,
      ownerId: user.id,
      technicianId: payload.technicianId,
      issueType: payload.issueType.trim(),
      faultDescription: payload.faultDescription.trim(),
      attachments: payload.attachments || [],
      status: 'new',
      createdAt: ts,
      updatedAt: ts,
      isDemo: false,
    },
  };
}

export function dbUpdateRepairRequestStatus(user: UserProfile, requestId: string, status: RepairStatus): boolean {
  const reqRow = db.prepare('SELECT * FROM repair_requests WHERE id = ?').get(requestId) as
    | Record<string, unknown>
    | undefined;
  if (!reqRow) return false;
  const tech = db.prepare('SELECT user_id FROM technician_profiles WHERE id = ?').get(String(reqRow.technician_id)) as
    | { user_id: string }
    | undefined;
  if (
    user.role !== 'admin' &&
    String(reqRow.owner_id) !== user.id &&
    tech?.user_id !== user.id
  ) {
    return false;
  }
  db.prepare('UPDATE repair_requests SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), requestId);
  return true;
}

export function dbCreateRepairRecord(
  user: UserProfile,
  payload: {
    requestId?: string;
    deviceId: string;
    issueType: string;
    faultDescription: string;
    diagnosis: string;
    actionTaken: string;
    parts: RepairPart[];
    repairCost?: number;
    intakeDate: string;
    deliveryDate?: string;
    warrantyDays: number;
    beforeImages: string[];
    afterImages: string[];
    notes?: string;
  }
): { ok: boolean; error?: string; data?: RepairRecord } {
  const techRow = db.prepare('SELECT * FROM technician_profiles WHERE user_id = ?').get(user.id) as
    | Record<string, unknown>
    | undefined;
  if (!techRow && user.role !== 'admin') {
    return { ok: false, error: 'إنشاء سجلات الإصلاح متاح لحسابات الفنيين فقط.' };
  }
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(payload.deviceId) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'الجهاز غير موجود' };

  const id = `REP-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const techId = techRow ? String(techRow.id) : 'tech-profile-1';
  const techName = techRow ? String(techRow.display_name) : user.fullName;
  const centerName = techRow ? String(techRow.center_name) : 'مركز صيانة معتمد';

  db.prepare(
    `INSERT INTO repair_records (id, request_id, device_id, technician_id, technician_name, center_name, issue_type, fault_description, diagnosis, action_taken, parts_json, repair_cost, intake_date, delivery_date, warranty_days, before_images_json, after_images_json, notes, status, owner_approved, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_customer_approval', 0, ?, ?)`
  ).run(
    id,
    payload.requestId || null,
    payload.deviceId,
    techId,
    techName,
    centerName,
    payload.issueType.trim(),
    payload.faultDescription.trim(),
    payload.diagnosis.trim(),
    payload.actionTaken.trim(),
    JSON.stringify(payload.parts || []),
    payload.repairCost ?? null,
    payload.intakeDate,
    payload.deliveryDate || null,
    payload.warrantyDays,
    JSON.stringify(payload.beforeImages || []),
    JSON.stringify(payload.afterImages || []),
    payload.notes?.trim() || null,
    user.id,
    ts
  );

  if (payload.requestId) {
    db.prepare("UPDATE repair_requests SET status = 'awaiting_customer_approval', updated_at = ? WHERE id = ?").run(
      ts,
      payload.requestId
    );
  }

  insertNotification(
    String(device.owner_id),
    'repair_awaiting_approval',
    'سجل إصلاح بانتظار موافقتك',
    `أرسل ${techName} توثيق عملية (${payload.issueType}) لجهاز ${String(device.device_name)}. راجع التفاصيل ووافق لاعتمادها في السجل.`,
    '/repairs'
  );

  return {
    ok: true,
    data: {
      id,
      requestId: payload.requestId,
      deviceId: payload.deviceId,
      technicianId: techId,
      technicianName: techName,
      centerName,
      issueType: payload.issueType,
      faultDescription: payload.faultDescription,
      diagnosis: payload.diagnosis,
      actionTaken: payload.actionTaken,
      parts: payload.parts || [],
      repairCost: payload.repairCost,
      intakeDate: payload.intakeDate,
      deliveryDate: payload.deliveryDate,
      warrantyDays: payload.warrantyDays,
      beforeImages: payload.beforeImages || [],
      afterImages: payload.afterImages || [],
      notes: payload.notes,
      status: 'awaiting_customer_approval',
      ownerApproved: false,
      createdBy: user.id,
      createdAt: ts,
      isDemo: false,
    },
  };
}

export function dbApproveRepairRecord(user: UserProfile, recordId: string): { ok: boolean; error?: string } {
  const rec = db.prepare('SELECT * FROM repair_records WHERE id = ?').get(recordId) as
    | Record<string, unknown>
    | undefined;
  if (!rec) return { ok: false, error: 'سجل الصيانة غير موجود' };
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(String(rec.device_id)) as
    | Record<string, unknown>
    | undefined;
  if (!device || String(device.owner_id) !== user.id) {
    return { ok: false, error: 'فقط مالك الجهاز يمكنه اعتماد سجل الصيانة.' };
  }
  if (rec.owner_approved) {
    return { ok: false, error: 'تم اعتماد هذا السجل مسبقًا وهو غير قابل للتعديل.' };
  }
  const ts = nowIso();
  const parts = safeJson<RepairPart[]>(rec.parts_json, []);
  const beforeImages = safeJson<string[]>(rec.before_images_json, []);
  const afterImages = safeJson<string[]>(rec.after_images_json, []);

  db.prepare(
    "UPDATE repair_records SET owner_approved = 1, owner_approved_at = ?, status = 'delivered' WHERE id = ?"
  ).run(ts, recordId);

  if (rec.request_id) {
    db.prepare("UPDATE repair_requests SET status = 'delivered', updated_at = ? WHERE id = ?").run(
      ts,
      String(rec.request_id)
    );
  }
  db.prepare("UPDATE devices SET status = 'active', verification_tier = 'technician_verified', updated_at = ? WHERE id = ?").run(
    ts,
    String(rec.device_id)
  );
  db.prepare('UPDATE technician_profiles SET verified_repairs_count = verified_repairs_count + 1 WHERE id = ?').run(
    String(rec.technician_id)
  );

  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    String(rec.device_id),
    parts.length > 0 ? 'part_replaced' : 'repaired',
    ts,
    String(rec.created_by),
    `${String(rec.technician_name)} — ${String(rec.center_name)}`,
    `${String(rec.issue_type)}: ${String(rec.action_taken)}${parts.length > 0 ? ` (القطع: ${parts.map((p) => p.partName).join('، ')})` : ''}`,
    JSON.stringify([...beforeImages, ...afterImages])
  );

  const wDays = Number(rec.warranty_days || 0);
  if (wDays > 0) {
    const end = new Date();
    end.setDate(end.getDate() + wDays);
    db.prepare(
      `INSERT INTO warranties (id, device_id, owner_id, item_or_part_name, issuer_name, is_source_verified, start_date, end_date, terms, warranty_number, status, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'active', ?)`
    ).run(
      `WAR-${crypto.randomUUID().slice(0, 8)}`,
      String(rec.device_id),
      String(device.owner_id),
      `ضمان صيانة: ${String(rec.issue_type)}`,
      String(rec.center_name),
      ts.slice(0, 10),
      end.toISOString().slice(0, 10),
      `ضمان خدمة صيانة لمدة ${wDays} يومًا على الإجراء المنفذ.`,
      `REP-${recordId.slice(-6)}`,
      ts
    );
  }

  insertNotification(
    String(rec.created_by),
    'repair_approved',
    'تم اعتماد سجل الإصلاح من المالك',
    `وافق المالك على سجل الصيانة لجهاز ${String(device.device_name)} وأصبح موثقًا في السجل الزمني.`,
    '/repairs'
  );
  return { ok: true };
}

export function dbRejectRepairRecord(user: UserProfile, recordId: string, reason: string): { ok: boolean; error?: string } {
  const rec = db.prepare('SELECT * FROM repair_records WHERE id = ?').get(recordId) as
    | Record<string, unknown>
    | undefined;
  if (!rec) return { ok: false, error: 'السجل غير موجود' };
  const device = db.prepare('SELECT owner_id FROM devices WHERE id = ?').get(String(rec.device_id)) as
    | { owner_id: string }
    | undefined;
  if (!device || device.owner_id !== user.id) {
    return { ok: false, error: 'فقط مالك الجهاز يمكنه رفض هذا السجل.' };
  }
  if (rec.owner_approved) {
    return { ok: false, error: 'لا يمكن رفض سجل معتمد بالفعل.' };
  }
  db.prepare("UPDATE repair_records SET status = 'rejected', notes = ? WHERE id = ?").run(
    `سبب الرفض: ${reason}`,
    recordId
  );
  return { ok: true };
}

export function dbCreateRepairCorrectionRecord(
  user: UserProfile,
  originalRecordId: string,
  correctionReason: string,
  updates: { diagnosis?: string; actionTaken?: string; notes?: string }
): { ok: boolean; error?: string } {
  if (!correctionReason.trim()) {
    return { ok: false, error: 'يجب توضيح سبب التصحيح قبل إنشاء سجل تصحيح.' };
  }
  const orig = db.prepare('SELECT * FROM repair_records WHERE id = ?').get(originalRecordId) as
    | Record<string, unknown>
    | undefined;
  if (!orig) return { ok: false, error: 'السجل الأصلي غير موجود' };
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(String(orig.device_id)) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'الجهاز غير موجود' };
  if (String(orig.created_by) !== user.id && user.role !== 'admin') {
    return { ok: false, error: 'يمكن للفني منشئ السجل أو الإدارة فقط إنشاء سجل تصحيح.' };
  }

  const id = `REP-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO repair_records (id, request_id, device_id, technician_id, technician_name, center_name, issue_type, fault_description, diagnosis, action_taken, parts_json, repair_cost, intake_date, delivery_date, warranty_days, before_images_json, after_images_json, notes, status, owner_approved, parent_record_id, correction_reason, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_customer_approval', 0, ?, ?, ?, ?)`
  ).run(
    id,
    orig.request_id ? String(orig.request_id) : null,
    String(orig.device_id),
    String(orig.technician_id),
    String(orig.technician_name),
    String(orig.center_name),
    String(orig.issue_type),
    String(orig.fault_description),
    updates.diagnosis?.trim() || String(orig.diagnosis),
    updates.actionTaken?.trim() || String(orig.action_taken),
    String(orig.parts_json || '[]'),
    orig.repair_cost != null ? Number(orig.repair_cost) : null,
    String(orig.intake_date),
    orig.delivery_date ? String(orig.delivery_date) : null,
    Number(orig.warranty_days || 0),
    String(orig.before_images_json || '[]'),
    String(orig.after_images_json || '[]'),
    updates.notes?.trim() || (orig.notes ? String(orig.notes) : null),
    originalRecordId,
    correctionReason.trim(),
    user.id,
    ts
  );
  insertNotification(
    String(device.owner_id),
    'repair_awaiting_approval',
    'سجل تصحيح صيانة جديد',
    `أنشأ الفني سجل تصحيح مرتبط بالسجل #${originalRecordId.slice(-5)} لجهاز ${String(device.device_name)}.`,
    '/repairs'
  );
  return { ok: true };
}

export function dbAddWarranty(
  user: UserProfile,
  payload: {
    deviceId: string;
    itemOrPartName: string;
    issuerName: string;
    startDate: string;
    endDate: string;
    warrantyNumber?: string;
    terms?: string;
    documentName?: string;
  }
): { ok: boolean; error?: string; data?: WarrantyRecord } {
  const device = db.prepare('SELECT id FROM devices WHERE id = ? AND owner_id = ?').get(payload.deviceId, user.id);
  if (!device) return { ok: false, error: 'الجهاز غير موجود ضمن أجهزتك' };
  const id = `WAR-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO warranties (id, device_id, owner_id, item_or_part_name, issuer_name, is_source_verified, start_date, end_date, terms, warranty_number, document_name, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(
    id,
    payload.deviceId,
    user.id,
    payload.itemOrPartName.trim(),
    payload.issuerName.trim(),
    user.role === 'technician' || user.role === 'store' ? 1 : 0,
    payload.startDate,
    payload.endDate,
    payload.terms?.trim() || null,
    payload.warrantyNumber?.trim() || null,
    payload.documentName?.trim() || null,
    ts
  );
  insertNotification(
    user.id,
    'warranty_added',
    'تمت إضافة سجل ضمان',
    `تم تسجيل ضمان (${payload.itemOrPartName}) من ${payload.issuerName}.`,
    '/warranties'
  );
  return {
    ok: true,
    data: {
      id,
      deviceId: payload.deviceId,
      ownerId: user.id,
      itemOrPartName: payload.itemOrPartName.trim(),
      issuerName: payload.issuerName.trim(),
      isSourceVerified: user.role === 'technician' || user.role === 'store',
      startDate: payload.startDate,
      endDate: payload.endDate,
      terms: payload.terms,
      warrantyNumber: payload.warrantyNumber,
      documentName: payload.documentName,
      status: 'active',
      createdAt: ts,
      isDemo: false,
    },
  };
}

export function dbCancelWarranty(user: UserProfile, warrantyId: string): boolean {
  const w = db.prepare('SELECT owner_id FROM warranties WHERE id = ?').get(warrantyId) as
    | { owner_id: string }
    | undefined;
  if (!w || (w.owner_id !== user.id && user.role !== 'admin')) return false;
  db.prepare("UPDATE warranties SET status = 'cancelled' WHERE id = ?").run(warrantyId);
  return true;
}

// --- Marketplace, Chat & Transfers ---

export function dbCreateListing(
  user: UserProfile,
  payload: {
    deviceId: string;
    title: string;
    price: number;
    city: string;
    condition: DeviceCondition;
    description: string;
    images: string[];
    storeWarrantyDays: number;
  }
): { ok: boolean; error?: string; data?: MarketplaceListing } {
  const ps = db.prepare('SELECT marketplace_enabled FROM app_platform_settings WHERE id = 1').get() as
    | { marketplace_enabled: number }
    | undefined;
  if (ps && ps.marketplace_enabled === 0) {
    return { ok: false, error: 'السوق معطل مؤقتًا من إعدادات الإدارة.' };
  }
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(payload.deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'يمكنك عرض أجهزتك المسجلة فقط في السوق.' };
  if (String(device.status) === 'reported_stolen') {
    return { ok: false, error: 'هذا الجهاز مُبلّغ عنه كمفقود أو مسروق ولا يمكن عرضه للبيع في السوق.' };
  }

  const id = `LST-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const images =
    payload.images && payload.images.length > 0
      ? payload.images
      : [String(device.image_url || '/src/assets/images/demo_phone_pro_1795361833294.jpg')];
  const isVipStore = user.role === 'store' && user.activePlanSlug === 'store-enterprise';

  db.prepare(
    `INSERT INTO marketplace_listings (id, device_id, seller_id, seller_name, seller_type, title, price, currency, city, condition, description, images_json, store_warranty_days, is_featured, store_certified, seller_is_vip, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'EGP', ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)`
  ).run(
    id,
    payload.deviceId,
    user.id,
    user.role === 'store' ? user.storeName || user.fullName : user.fullName,
    user.role === 'store' ? 'store' : 'user',
    payload.title.trim(),
    payload.price,
    payload.city.trim(),
    payload.condition,
    payload.description.trim(),
    JSON.stringify(images),
    user.role === 'store' ? payload.storeWarrantyDays : 0,
    isVipStore ? 1 : 0,
    isVipStore ? 1 : 0,
    ts
  );
  db.prepare("UPDATE devices SET status = 'listed_for_sale', updated_at = ? WHERE id = ?").run(ts, payload.deviceId);
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'listed_for_sale', ?, ?, ?, ?, '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    payload.deviceId,
    ts,
    user.id,
    user.fullName,
    `طرح الجهاز للبيع في OMOR MARKET بسعر ${payload.price} ج.م.`
  );
  const row = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as Record<string, unknown>;
  return { ok: true, data: mapListingRow(row) };
}

export function dbUpdateListingStatus(
  user: UserProfile,
  listingId: string,
  status: MarketplaceListing['status']
): boolean {
  const row = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(listingId) as
    | Record<string, unknown>
    | undefined;
  if (!row || (String(row.seller_id) !== user.id && user.role !== 'admin')) return false;
  db.prepare('UPDATE marketplace_listings SET status = ? WHERE id = ?').run(status, listingId);
  if (status === 'removed' || status === 'sold') {
    db.prepare("UPDATE devices SET status = 'active', updated_at = ? WHERE id = ?").run(
      nowIso(),
      String(row.device_id)
    );
  }
  return true;
}

export function dbStartOrGetConversation(
  user: UserProfile,
  otherUserId: string,
  otherUserName: string,
  listingId?: string,
  listingTitle?: string
): Conversation | null {
  if (user.id === otherUserId) return null;
  const existing = db
    .prepare(
      `SELECT * FROM conversations
       WHERE ((participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?))
         AND COALESCE(listing_id, '') = COALESCE(?, '')`
    )
    .get(user.id, otherUserId, otherUserId, user.id, listingId || '') as Record<string, unknown> | undefined;

  if (existing) {
    return {
      id: String(existing.id),
      listingId: existing.listing_id ? String(existing.listing_id) : undefined,
      listingTitle: existing.listing_title ? String(existing.listing_title) : undefined,
      participantA: String(existing.participant_a),
      participantB: String(existing.participant_b),
      participantAName: String(existing.participant_a_name),
      participantBName: String(existing.participant_b_name),
      createdAt: String(existing.created_at),
      isDemo: false,
    };
  }
  const id = `CONV-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO conversations (id, listing_id, listing_title, participant_a, participant_b, participant_a_name, participant_b_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, listingId || null, listingTitle || null, user.id, otherUserId, user.fullName, otherUserName, ts);
  return {
    id,
    listingId,
    listingTitle,
    participantA: user.id,
    participantB: otherUserId,
    participantAName: user.fullName,
    participantBName: otherUserName,
    createdAt: ts,
    isDemo: false,
  };
}

export function dbSendMessage(user: UserProfile, conversationId: string, body: string): { ok: boolean; error?: string } {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as
    | Record<string, unknown>
    | undefined;
  if (!conv) return { ok: false, error: 'المحادثة غير موجودة' };
  if (String(conv.participant_a) !== user.id && String(conv.participant_b) !== user.id) {
    return { ok: false, error: 'غير مصرح لك بالكتابة في هذه المحادثة.' };
  }
  const clean = body.trim();
  if (!clean) return { ok: false, error: 'لا يمكن إرسال رسالة فارغة' };
  const ts = nowIso();
  db.prepare(
    `INSERT INTO chat_messages (id, conversation_id, sender_id, sender_name, body, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(`MSG-${crypto.randomUUID().slice(0, 8)}`, conversationId, user.id, user.fullName, clean, ts);

  const recipientId = String(conv.participant_a) === user.id ? String(conv.participant_b) : String(conv.participant_a);
  insertNotification(
    recipientId,
    'new_message',
    `رسالة جديدة من ${user.fullName}`,
    clean.slice(0, 80),
    '/messages'
  );
  return { ok: true };
}

export function dbInitiateTransfer(
  user: UserProfile,
  deviceId: string
): { ok: boolean; error?: string; data?: OwnershipTransfer } {
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND owner_id = ?').get(deviceId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'يمكن للمالك فقط بدء نقل الملكية' };
  if (String(device.status) === 'reported_stolen') {
    return { ok: false, error: 'هذا الجهاز مُبلّغ عنه كمفقود أو مسروق، وتم حظر نقل ملكيته مؤقتًا لحماية المالك.' };
  }

  const ts = nowIso();
  const id = `TRF-${crypto.randomUUID().slice(0, 8)}`;
  const code = `TR-${Math.floor(100000 + Math.random() * 900000)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare(
    "UPDATE ownership_transfers SET status = 'cancelled' WHERE device_id = ? AND status IN ('pending', 'buyer_accepted')"
  ).run(deviceId);
  db.prepare(
    `INSERT INTO ownership_transfers (id, device_id, from_user_id, from_user_name, transfer_code, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(id, deviceId, user.id, user.fullName, code, expiresAt, ts);

  return {
    ok: true,
    data: {
      id,
      deviceId,
      fromUserId: user.id,
      fromUserName: user.fullName,
      transferCode: code,
      expiresAt,
      status: 'pending',
      createdAt: ts,
      isDemo: false,
    },
  };
}

export function dbBuyerAcceptTransfer(
  user: UserProfile,
  transferCode: string
): { ok: boolean; error?: string; data?: OwnershipTransfer } {
  const cleanCode = transferCode.trim().toUpperCase();
  const tr = db
    .prepare("SELECT * FROM ownership_transfers WHERE transfer_code = ? AND status = 'pending'")
    .get(cleanCode) as Record<string, unknown> | undefined;
  if (!tr) return { ok: false, error: 'رمز النقل غير صالح أو منتهي أو تم استخدامه.' };
  if (Date.now() > new Date(String(tr.expires_at)).getTime()) {
    db.prepare("UPDATE ownership_transfers SET status = 'expired' WHERE id = ?").run(String(tr.id));
    return { ok: false, error: 'انتهت صلاحية رمز النقل (15 دقيقة). اطلب رمزًا جديدًا من المالك.' };
  }
  if (String(tr.from_user_id) === user.id) {
    return { ok: false, error: 'لا يمكنك استلام نقل ملكية جهازك لنفسك.' };
  }
  db.prepare(
    "UPDATE ownership_transfers SET to_user_id = ?, to_user_name = ?, status = 'buyer_accepted' WHERE id = ?"
  ).run(user.id, user.fullName, String(tr.id));
  insertNotification(
    String(tr.from_user_id),
    'transfer_request',
    'قبل المشتري رمز نقل الملكية',
    `أكّد ${user.fullName} استلام رمز النقل. أدخل على صفحة نقل الملكية للتأكيد النهائي.`,
    '/transfer'
  );
  return {
    ok: true,
    data: {
      id: String(tr.id),
      deviceId: String(tr.device_id),
      fromUserId: String(tr.from_user_id),
      fromUserName: String(tr.from_user_name),
      toUserId: user.id,
      toUserName: user.fullName,
      transferCode: String(tr.transfer_code),
      expiresAt: String(tr.expires_at),
      status: 'buyer_accepted',
      createdAt: String(tr.created_at),
      isDemo: false,
    },
  };
}

export function dbOwnerConfirmTransfer(user: UserProfile, transferId: string): { ok: boolean; error?: string } {
  const tr = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as
    | Record<string, unknown>
    | undefined;
  if (!tr || String(tr.from_user_id) !== user.id) return { ok: false, error: 'طلب النقل غير موجود أو غير مخوّل.' };
  if (String(tr.status) !== 'buyer_accepted' || !tr.to_user_id) {
    return { ok: false, error: 'يجب أن يقبل المشتري الرمز أولًا.' };
  }
  const ts = nowIso();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(String(tr.device_id)) as
    | Record<string, unknown>
    | undefined;
  if (!device) return { ok: false, error: 'الجهاز غير موجود.' };

  // Privacy boundary: strip privateData belonging to previous owner when transferring ownership
  db.prepare(
    "UPDATE devices SET owner_id = ?, status = 'active', private_data_json = '{}', updated_at = ? WHERE id = ?"
  ).run(String(tr.to_user_id), ts, String(tr.device_id));
  db.prepare("UPDATE ownership_transfers SET status = 'completed', used_at = ? WHERE id = ?").run(ts, transferId);
  db.prepare("UPDATE marketplace_listings SET status = 'sold' WHERE device_id = ? AND status = 'active'").run(
    String(tr.device_id)
  );
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'ownership_transferred', ?, ?, 'نقل ملكية موثق', 'تم نقل ملكية الجهاز إلى مالك جديد بموافقة الطرفين دون كشف بيانات المالك السابق الخاصة.', '[]', 'verified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    String(tr.device_id),
    ts,
    user.id
  );
  insertNotification(
    String(tr.to_user_id),
    'transfer_completed',
    'اكتمل نقل ملكية الجهاز إليك',
    `أصبح جهاز ${String(device.device_name)} (${String(device.device_code)}) مسجلًا باسمك في عُمْر.`,
    `/devices/${String(device.id)}`
  );
  return { ok: true };
}

export function dbCancelOrDisputeTransfer(
  user: UserProfile,
  transferId: string,
  mode: 'cancel' | 'dispute',
  reason?: string
): { ok: boolean; error?: string } {
  const tr = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as
    | Record<string, unknown>
    | undefined;
  if (!tr) return { ok: false, error: 'الطلب غير موجود.' };
  if (String(tr.from_user_id) !== user.id && String(tr.to_user_id) !== user.id && user.role !== 'admin') {
    return { ok: false, error: 'غير مصرح لك بتعديل طلب النقل.' };
  }
  db.prepare('UPDATE ownership_transfers SET status = ?, dispute_reason = ? WHERE id = ?').run(
    mode === 'cancel' ? 'cancelled' : 'disputed',
    reason?.trim() || null,
    transferId
  );
  return { ok: true };
}

// --- Technicians, Reviews, Notifications, Maintenance & Reports ---

export function dbSubmitTechnicianReview(
  user: UserProfile,
  payload: { technicianId: string; repairRecordId: string; rating: number; comment: string }
): { ok: boolean; error?: string } {
  const rec = db.prepare('SELECT * FROM repair_records WHERE id = ? AND owner_approved = 1').get(payload.repairRecordId) as
    | Record<string, unknown>
    | undefined;
  if (!rec) return { ok: false, error: 'التقييم متاح فقط بعد اعتماد سجل صيانة حقيقي.' };
  const dev = db.prepare('SELECT owner_id FROM devices WHERE id = ?').get(String(rec.device_id)) as
    | { owner_id: string }
    | undefined;
  if (!dev || dev.owner_id !== user.id) {
    return { ok: false, error: 'يمكن لصاحب الجهاز فقط تقييم خدمة الصيانة.' };
  }
  const dup = db
    .prepare('SELECT id FROM technician_reviews WHERE repair_record_id = ? AND reviewer_id = ?')
    .get(payload.repairRecordId, user.id);
  if (dup) return { ok: false, error: 'تم تقييم عملية الصيانة هذه مسبقًا.' };

  db.prepare(
    `INSERT INTO technician_reviews (id, technician_id, reviewer_id, reviewer_name, repair_record_id, rating, comment, is_reported, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    `REV-${crypto.randomUUID().slice(0, 8)}`,
    payload.technicianId,
    user.id,
    user.fullName,
    payload.repairRecordId,
    Math.min(5, Math.max(1, Math.round(payload.rating))),
    payload.comment.trim(),
    nowIso()
  );
  return { ok: true };
}

export function dbReportReview(reviewId: string): void {
  db.prepare('UPDATE technician_reviews SET is_reported = 1 WHERE id = ?').run(reviewId);
}

export function dbUpdateTechnicianProfile(
  user: UserProfile,
  updates: Partial<TechnicianProfile>
): { ok: boolean; error?: string } {
  const row = db.prepare('SELECT * FROM technician_profiles WHERE user_id = ?').get(user.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { ok: false, error: 'ملف الفني غير موجود.' };
  if (
    user.role !== 'admin' &&
    (isReservedImpersonationName(updates.displayName) || isReservedImpersonationName(updates.centerName))
  ) {
    return { ok: false, error: 'اسم الفني أو المركز يحتوي على مسمى رسمي محجوز يمنع انتحاله.' };
  }
  db.prepare(
    `UPDATE technician_profiles
     SET display_name = ?, center_name = ?, specialties_json = ?, supported_device_types_json = ?, governorate = ?, district = ?, bio = ?, public_contact = ?, working_hours = ?
     WHERE id = ?`
  ).run(
    updates.displayName?.trim() || String(row.display_name),
    updates.centerName?.trim() || String(row.center_name),
    updates.specialties ? JSON.stringify(updates.specialties) : String(row.specialties_json),
    updates.supportedDeviceTypes ? JSON.stringify(updates.supportedDeviceTypes) : String(row.supported_device_types_json),
    updates.governorate?.trim() || String(row.governorate),
    updates.district?.trim() || String(row.district),
    updates.bio !== undefined ? updates.bio.trim() : String(row.bio),
    updates.publicContact?.trim() || String(row.public_contact),
    updates.workingHours?.trim() || String(row.working_hours),
    String(row.id)
  );
  return { ok: true };
}

export function dbMarkNotificationRead(user: UserProfile, id: string): void {
  db.prepare('UPDATE app_notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, user.id);
}

export function dbMarkAllNotificationsRead(user: UserProfile): void {
  db.prepare('UPDATE app_notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
}

export function dbClearNotifications(user: UserProfile): void {
  db.prepare('DELETE FROM app_notifications WHERE user_id = ?').run(user.id);
}

export function dbUpdateNotificationPrefs(user: UserProfile, prefs: NotificationPreferences): void {
  db.prepare('UPDATE app_users SET notification_prefs_json = ? WHERE id = ?').run(JSON.stringify(prefs), user.id);
}

export function dbAddMaintenanceReminder(
  user: UserProfile,
  payload: {
    deviceId: string;
    title: string;
    category: MaintenanceCategory;
    intervalDays: number;
    nextDueDate?: string;
    notes?: string;
  }
): { ok: boolean; error?: string; data?: MaintenanceReminder } {
  const owned = db.prepare('SELECT device_code FROM devices WHERE id = ? AND owner_id = ?').get(payload.deviceId, user.id) as
    | { device_code: string }
    | undefined;
  if (!owned) return { ok: false, error: 'الجهاز غير موجود ضمن أجهزتك.' };
  const cleanTitle = payload.title.trim();
  if (cleanTitle.length < 3) return { ok: false, error: 'يرجى كتابة عنوان واضح للصيانة الدورية.' };
  const interval = Math.max(7, Math.min(730, Math.round(payload.intervalDays || 90)));
  const dueDate = payload.nextDueDate || addDaysIso(interval).slice(0, 10);
  const id = `MREM-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();

  db.prepare(
    `INSERT INTO maintenance_reminders (id, device_id, owner_id, title, category, interval_days, next_due_date, notes, is_auto_suggested, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(id, payload.deviceId, user.id, cleanTitle, payload.category, interval, dueDate, payload.notes?.trim() || null, ts);

  insertAudit(
    user.id,
    user.fullName,
    'إضافة جدول صيانة دورية',
    'device',
    owned.device_code,
    `جدولة "${cleanTitle}" كل ${interval} يوم (الموعد القادم: ${dueDate})`
  );

  return {
    ok: true,
    data: {
      id,
      deviceId: payload.deviceId,
      ownerId: user.id,
      title: cleanTitle,
      category: payload.category,
      intervalDays: interval,
      nextDueDate: dueDate,
      notes: payload.notes?.trim() || undefined,
      createdAt: ts,
      isDemo: false,
    },
  };
}

export function dbCompleteMaintenanceReminder(user: UserProfile, reminderId: string): { ok: boolean; error?: string } {
  const rem = db.prepare('SELECT * FROM maintenance_reminders WHERE id = ? AND owner_id = ?').get(reminderId, user.id) as
    | Record<string, unknown>
    | undefined;
  if (!rem) return { ok: false, error: 'لم يتم العثور على التذكير.' };
  const today = nowIso().slice(0, 10);
  const nextDue = addDaysIso(Number(rem.interval_days || 90)).slice(0, 10);
  const ts = nowIso();

  db.prepare('UPDATE maintenance_reminders SET last_completed_at = ?, next_due_date = ? WHERE id = ?').run(
    today,
    nextDue,
    reminderId
  );
  db.prepare(
    `INSERT INTO device_events (id, event_code, device_id, event_type, occurred_at, actor_id, actor_label, description, attachments_json, verification_status, owner_approved)
     VALUES (?, ?, ?, 'inspected', ?, ?, ?, ?, '[]', 'unverified', 1)`
  ).run(
    `EVT-${crypto.randomUUID().slice(0, 8)}`,
    `EVT-${Math.floor(100000 + Math.random() * 900000)}`,
    String(rem.device_id),
    ts,
    user.id,
    user.fullName,
    `إتمام الصيانة الدورية المجدولة: "${String(rem.title)}" وتجديد الموعد القادم إلى ${nextDue}.`
  );
  return { ok: true };
}

export function dbDeleteMaintenanceReminder(user: UserProfile, reminderId: string): void {
  db.prepare('DELETE FROM maintenance_reminders WHERE id = ? AND owner_id = ?').run(reminderId, user.id);
}

export function dbSubmitReport(
  user: UserProfile,
  payload: {
    targetType: ReportItem['targetType'];
    targetId: string;
    targetLabel: string;
    reason: ReportReason;
    description: string;
  }
): { ok: boolean } {
  const id = `RPT-${crypto.randomUUID().slice(0, 8)}`;
  const code = `RPT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  db.prepare(
    `INSERT INTO trust_reports (id, report_code, reporter_id, reporter_name, target_type, target_id, target_label, reason, description, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`
  ).run(
    id,
    code,
    user.id,
    user.fullName,
    payload.targetType,
    payload.targetId,
    payload.targetLabel,
    payload.reason,
    payload.description.trim(),
    nowIso()
  );
  insertAudit(user.id, user.fullName, 'استلام بلاغ ثقة', payload.targetType, payload.targetId, payload.description.trim());
  return { ok: true };
}

// --- V3 Observations & B2B ---

export function dbAddSparePartObservation(
  user: UserProfile,
  payload: {
    category: DeviceCategorySlug;
    brand: string;
    deviceModelPattern: string;
    partName: string;
    partCategory: SparePartCategory;
    origin: SparePartOrigin;
    priceEgp: number;
    warrantyDays: number;
  }
): { ok: boolean; error?: string; data?: SparePartStat } {
  if (!payload.brand.trim() || !payload.partName.trim() || payload.priceEgp <= 0) {
    return { ok: false, error: 'يرجى إدخال الماركة واسم القطعة والسعر بشكل صحيح.' };
  }
  const id = `SP-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const avg = Math.round(payload.priceEgp);
  const min = Math.round(payload.priceEgp * 0.92);
  const max = Math.round(payload.priceEgp * 1.08);
  const pattern = payload.deviceModelPattern.trim() || payload.brand.trim();
  const sourceLabel = `ملاحظة مسجلة بواسطة ${user.fullName}`;

  db.prepare(
    `INSERT INTO spare_part_stats (id, category, brand, device_model_pattern, part_name, part_category, origin, min_price_egp, avg_price_egp, max_price_egp, avg_warranty_days, sample_count, trend, last_updated, source_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'stable', ?, ?)`
  ).run(
    id,
    payload.category,
    payload.brand.trim(),
    pattern,
    payload.partName.trim(),
    payload.partCategory,
    payload.origin,
    min,
    avg,
    max,
    payload.warrantyDays,
    ts,
    sourceLabel
  );
  insertAudit(
    user.id,
    user.fullName,
    'إضافة إحصائية سعر قطعة غيار',
    'spare_part',
    id,
    `${payload.brand} - ${payload.partName}: ${avg} ج.م`
  );
  return {
    ok: true,
    data: {
      id,
      category: payload.category,
      brand: payload.brand.trim(),
      deviceModelPattern: pattern,
      partName: payload.partName.trim(),
      partCategory: payload.partCategory,
      origin: payload.origin,
      minPriceEgp: min,
      avgPriceEgp: avg,
      maxPriceEgp: max,
      avgWarrantyDays: payload.warrantyDays,
      sampleCount: 1,
      trend: 'stable',
      lastUpdated: ts,
      sourceLabel,
      isDemo: false,
    },
  };
}

export function dbRegisterB2BPartner(
  user: UserProfile,
  payload: {
    companyName: string;
    partnerType: B2BPartnerType;
    governorate: string;
    branchesCount: number;
    supportedCategories: DeviceCategorySlug[];
    supportedBrands: string[];
    slaHours: number;
    warrantyPolicy: string;
    contactPhone: string;
    contactEmail: string;
  }
): { ok: boolean; error?: string; data?: B2BPartner } {
  const id = `B2B-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const webhookCode = `WH-OMR-${Math.floor(1000 + Math.random() * 9000)}`;
  const status = user.role === 'admin' ? 'connected' : 'pending_review';
  const cats = payload.supportedCategories.length > 0 ? payload.supportedCategories : ['smartphone'];
  const brands = payload.supportedBrands.length > 0 ? payload.supportedBrands : ['Apple', 'Samsung'];
  const policy = payload.warrantyPolicy.trim() || 'ضمان مركز معتمد موثق عبر OMOR';

  db.prepare(
    `INSERT INTO b2b_partners (id, company_name, partner_type, governorate, branches_count, supported_categories_json, supported_brands_json, sla_hours, warranty_policy, contact_phone, contact_email, integration_status, webhook_code, linked_technicians_count, is_verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    payload.companyName.trim(),
    payload.partnerType,
    payload.governorate,
    Math.max(1, payload.branchesCount),
    JSON.stringify(cats),
    JSON.stringify(brands),
    Math.max(4, payload.slaHours),
    policy,
    payload.contactPhone.trim(),
    payload.contactEmail.trim(),
    status,
    webhookCode,
    user.role === 'admin' ? 1 : 0,
    ts
  );
  return {
    ok: true,
    data: {
      id,
      companyName: payload.companyName.trim(),
      partnerType: payload.partnerType,
      governorate: payload.governorate,
      branchesCount: Math.max(1, payload.branchesCount),
      supportedCategories: cats as DeviceCategorySlug[],
      supportedBrands: brands,
      slaHours: Math.max(4, payload.slaHours),
      warrantyPolicy: policy,
      contactPhone: payload.contactPhone.trim(),
      contactEmail: payload.contactEmail.trim(),
      integrationStatus: status,
      webhookCode,
      linkedTechniciansCount: 1,
      isVerified: user.role === 'admin',
      createdAt: ts,
      isDemo: false,
    },
  };
}

// --- Admin App Operations ---

export function dbAdminUpdateUserStatus(adminUser: UserProfile, userId: string, status: 'active' | 'suspended'): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  db.prepare('UPDATE app_users SET account_status = ? WHERE id = ?').run(status, userId);
  insertAudit(adminUser.id, adminUser.fullName, 'تحديث حالة حساب مستخدم', 'user', userId, status);
  return { ok: true };
}

export function dbAdminUpdateUserRole(adminUser: UserProfile, userId: string, role: UserRole): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  if (adminUser.id === userId && role !== 'admin') {
    return { ok: false, error: 'لا يمكنك تخفيض صلاحية حسابك الإداري الحالي.' };
  }
  const target = db.prepare('SELECT id, full_name FROM app_users WHERE id = ?').get(userId) as
    | { id: string; full_name: string }
    | undefined;
  if (!target) return { ok: false, error: 'الحساب غير موجود.' };
  db.prepare('UPDATE app_users SET role = ? WHERE id = ?').run(role, userId);
  insertAudit(adminUser.id, adminUser.fullName, 'تعديل دور مستخدم', 'user', userId, `${target.full_name} -> ${role}`);
  return { ok: true };
}

export function dbAdminToggleTechVerification(adminUser: UserProfile, techId: string): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  const row = db.prepare('SELECT is_verified, center_name FROM technician_profiles WHERE id = ?').get(techId) as
    | { is_verified: number; center_name: string }
    | undefined;
  if (!row) return { ok: false, error: 'الفني غير موجود' };
  const next = row.is_verified ? 0 : 1;
  db.prepare('UPDATE technician_profiles SET is_verified = ? WHERE id = ?').run(next, techId);
  insertAudit(adminUser.id, adminUser.fullName, next ? 'توثيق حساب فني' : 'إلغاء توثيق فني', 'technician', techId, row.center_name);
  return { ok: true };
}

export function dbAdminUpdateReportStatus(adminUser: UserProfile, reportId: string, status: ReportStatus): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  db.prepare('UPDATE trust_reports SET status = ? WHERE id = ?').run(status, reportId);
  return { ok: true };
}

export function dbAdminUpdatePlatformSettings(
  adminUser: UserProfile,
  settings: { allowNewRegistrations: boolean; requireTechVerification: boolean; maxUploadMb: number; marketplaceEnabled: boolean }
): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  db.prepare(
    'UPDATE app_platform_settings SET allow_new_registrations = ?, require_tech_verification = ?, max_upload_mb = ?, marketplace_enabled = ? WHERE id = 1'
  ).run(
    settings.allowNewRegistrations ? 1 : 0,
    settings.requireTechVerification ? 1 : 0,
    settings.maxUploadMb,
    settings.marketplaceEnabled ? 1 : 0
  );
  return { ok: true };
}

export function dbAdminToggleB2BPartner(adminUser: UserProfile, partnerId: string): { ok: boolean; error?: string } {
  if (adminUser.role !== 'admin') return { ok: false, error: 'صلاحية مرفوضة' };
  const row = db.prepare('SELECT integration_status FROM b2b_partners WHERE id = ?').get(partnerId) as
    | { integration_status: string }
    | undefined;
  if (!row) return { ok: false, error: 'الشريك غير موجود' };
  const nextConnected = row.integration_status !== 'connected';
  db.prepare('UPDATE b2b_partners SET integration_status = ?, is_verified = ? WHERE id = ?').run(
    nextConnected ? 'connected' : 'sandbox',
    nextConnected ? 1 : 0,
    partnerId
  );
  return { ok: true };
}

// --- Paid Subscriptions & Optional On-Demand Services ---

export function dbSubscribeToPlan(
  user: UserProfile,
  payload: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    paymentMethod: PaymentMethodOption;
    paymentReference?: string;
  }
): { ok: boolean; error?: string; subscription?: UserSubscription } {
  const plan = getActivePlanById(payload.planId);
  if (!plan) return { ok: false, error: 'الباقة المختارة غير متاحة حاليًا.' };
  if (plan.priceMonthlyEgp > 0 && !plan.billingEnabled) {
    return { ok: false, error: 'التفعيل الإلكتروني لهذه الباقة متوقف حاليًا من إعدادات الإدارة.' };
  }

  const priceEgp = payload.billingCycle === 'yearly' ? plan.priceYearlyEgp : plan.priceMonthlyEgp;
  const days = payload.billingCycle === 'yearly' ? 365 : 30;
  const startedAt = nowIso();
  const expiresAt = addDaysIso(days);
  const id = `SUB-${crypto.randomUUID().slice(0, 8)}`;

  // Mark previous active subscriptions for this user as cancelled
  db.prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(user.id);

  db.prepare(
    `INSERT INTO user_subscriptions (id, user_id, plan_id, plan_slug, plan_name, target_role, billing_cycle, price_egp, payment_method, payment_reference, status, started_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  ).run(
    id,
    user.id,
    plan.id,
    plan.slug,
    plan.name,
    plan.targetRole,
    payload.billingCycle,
    priceEgp,
    payload.paymentMethod,
    payload.paymentReference?.trim() || null,
    startedAt,
    expiresAt,
    startedAt
  );

  // Activate plan benefits on user, technician profile, and store listings
  const quotaGrant = plan.targetRole === 'technician' ? 30 : plan.targetRole === 'store' ? 40 : 0;
  db.prepare(
    'UPDATE app_users SET active_plan_slug = ?, plan_billing_cycle = ?, plan_expires_at = ?, ai_quota_bonus = ai_quota_bonus + ? WHERE id = ?'
  ).run(plan.slug, payload.billingCycle, expiresAt, quotaGrant, user.id);

  if (plan.targetRole === 'technician') {
    db.prepare('UPDATE technician_profiles SET is_pro = 1 WHERE user_id = ?').run(user.id);
  }
  if (plan.targetRole === 'store') {
    db.prepare('UPDATE marketplace_listings SET seller_is_vip = 1, store_certified = 1 WHERE seller_id = ?').run(user.id);
  }

  incrementPlanSubscriberAndRevenue(
    plan.id,
    `اشتراك ${plan.name} (${payload.billingCycle === 'yearly' ? 'سنوي' : 'شهري'}) — ${user.fullName}`,
    priceEgp
  );

  insertNotification(
    user.id,
    'security_alert',
    `تم تفعيل ${plan.name}`,
    `تم تفعيل باقتك بنجاح حتى ${expiresAt.slice(0, 10)}. يمكنك إدارة المزايا من صفحة خدمات المحترفين.`,
    '/services'
  );
  insertAudit(user.id, user.fullName, 'تفعيل باقة اشتراك', 'subscription', id, `${plan.name} (${priceEgp} ج.م)`);

  return {
    ok: true,
    subscription: {
      id,
      userId: user.id,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      targetRole: plan.targetRole,
      billingCycle: payload.billingCycle,
      priceEgp,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference?.trim() || undefined,
      status: 'active',
      startedAt,
      expiresAt,
      createdAt: startedAt,
    },
  };
}

export function dbCancelUserSubscription(user: UserProfile, subscriptionId: string): { ok: boolean; error?: string } {
  const row = db
    .prepare("SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ? AND status = 'active'")
    .get(subscriptionId, user.id) as Record<string, unknown> | undefined;
  if (!row) return { ok: false, error: 'الاشتراك النشط غير موجود.' };

  db.prepare("UPDATE user_subscriptions SET status = 'cancelled' WHERE id = ?").run(subscriptionId);
  db.prepare('UPDATE app_users SET active_plan_slug = NULL, plan_billing_cycle = NULL, plan_expires_at = NULL WHERE id = ?').run(
    user.id
  );
  db.prepare('UPDATE technician_profiles SET is_pro = 0 WHERE user_id = ?').run(user.id);
  db.prepare('UPDATE marketplace_listings SET seller_is_vip = 0 WHERE seller_id = ?').run(user.id);
  insertAudit(user.id, user.fullName, 'إلغاء اشتراك اختياري', 'subscription', subscriptionId, String(row.plan_name));
  return { ok: true };
}

export function dbPurchasePaidService(
  user: UserProfile,
  payload: {
    serviceCode: PaidServiceCode;
    listingId?: string;
    paymentMethod: PaymentMethodOption;
    paymentReference?: string;
  }
): { ok: boolean; error?: string; order?: PaidServiceOrder } {
  const service = PAID_SERVICES_CATALOG.find((s) => s.code === payload.serviceCode);
  if (!service) return { ok: false, error: 'الخدمة المطلوبة غير موجودة.' };

  let targetType: PaidServiceOrder['targetType'] = 'account';
  let targetId: string | undefined = user.id;
  let targetLabel = user.fullName;

  if (service.requiresListingSelection) {
    if (!payload.listingId) {
      return { ok: false, error: 'يرجى اختيار أحد إعلاناتك النشطة في السوق لتطبيق هذه الخدمة عليه.' };
    }
    const listing = db
      .prepare("SELECT * FROM marketplace_listings WHERE id = ? AND seller_id = ? AND status = 'active'")
      .get(payload.listingId, user.id) as Record<string, unknown> | undefined;
    if (!listing) {
      return { ok: false, error: 'الإعلان المختار غير موجود أو لا يخص حسابك أو غير نشط.' };
    }
    targetType = 'listing';
    targetId = String(listing.id);
    targetLabel = String(listing.title);
  } else if (service.targetRole === 'technician') {
    const tech = db.prepare('SELECT id, center_name FROM technician_profiles WHERE user_id = ?').get(user.id) as
      | { id: string; center_name: string }
      | undefined;
    if (!tech && user.role !== 'admin') {
      return { ok: false, error: 'هذه الخدمة مخصصة لحسابات الفنيين ومراكز الصيانة.' };
    }
    if (tech) {
      targetType = 'technician';
      targetId = tech.id;
      targetLabel = tech.center_name;
    }
  }

  const ts = nowIso();
  const expiresAt = service.durationDays ? addDaysIso(service.durationDays) : undefined;
  const orderId = `SRV-${crypto.randomUUID().slice(0, 8)}`;

  if (payload.serviceCode === 'store_feature_listing' && targetId) {
    db.prepare('UPDATE marketplace_listings SET is_featured = 1, featured_until = ? WHERE id = ?').run(
      expiresAt || addDaysIso(7),
      targetId
    );
  } else if (payload.serviceCode === 'store_certified_stamp' && targetId) {
    db.prepare('UPDATE marketplace_listings SET store_certified = 1 WHERE id = ?').run(targetId);
  } else if (payload.serviceCode === 'store_risk_pack' || payload.serviceCode === 'tech_ai_pack') {
    db.prepare('UPDATE app_users SET ai_quota_bonus = ai_quota_bonus + ? WHERE id = ?').run(
      service.quotaCredits || 15,
      user.id
    );
  } else if (payload.serviceCode === 'tech_spotlight') {
    db.prepare('UPDATE technician_profiles SET spotlight_until = ? WHERE user_id = ?').run(
      expiresAt || addDaysIso(14),
      user.id
    );
  } else if (payload.serviceCode === 'tech_priority_leads') {
    db.prepare('UPDATE technician_profiles SET priority_leads_until = ? WHERE user_id = ?').run(
      expiresAt || addDaysIso(30),
      user.id
    );
  }

  db.prepare(
    `INSERT INTO paid_service_orders (id, user_id, service_code, service_name, target_type, target_id, target_label, price_egp, payment_method, payment_reference, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(
    orderId,
    user.id,
    service.code,
    service.name,
    targetType,
    targetId || null,
    targetLabel,
    service.priceEgp,
    payload.paymentMethod,
    payload.paymentReference?.trim() || null,
    expiresAt || null,
    ts
  );

  incrementPlanSubscriberAndRevenue(
    null,
    `خدمة مدفوعة: ${service.name} — ${user.fullName}`,
    service.priceEgp
  );

  insertNotification(
    user.id,
    'security_alert',
    `تم تفعيل خدمة: ${service.name}`,
    `تم تنفيذ وتفعيل الخدمة بنجاح على (${targetLabel}).`,
    '/services'
  );
  insertAudit(user.id, user.fullName, 'شراء خدمة محترفين', 'paid_service', orderId, `${service.name} (${service.priceEgp} ج.م)`);

  return {
    ok: true,
    order: {
      id: orderId,
      userId: user.id,
      serviceCode: service.code,
      serviceName: service.name,
      targetType,
      targetId,
      targetLabel,
      priceEgp: service.priceEgp,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference?.trim() || undefined,
      status: 'active',
      expiresAt,
      createdAt: ts,
    },
  };
}

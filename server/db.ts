import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AdSlot,
  AdminOverviewStats,
  AffiliateProduct,
  ArticleCategory,
  ArticleItem,
  ContactMessage,
  PageConfig,
  PublicCmsBootstrap,
  RevenueEntry,
  SiteSettings,
  SubscriptionPlan,
} from '../src/types/cms.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'omor.db');
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS page_configs (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    meta_title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    hero_heading TEXT NOT NULL,
    hero_body TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS article_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    category_id TEXT REFERENCES article_categories(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'hidden')),
    show_on_home INTEGER NOT NULL DEFAULT 1,
    seo_title TEXT,
    seo_description TEXT,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ad_slots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    placement TEXT NOT NULL,
    ad_type TEXT NOT NULL CHECK (ad_type IN ('adsense', 'direct')),
    adsense_client TEXT,
    adsense_slot TEXT,
    adsense_format TEXT,
    direct_title TEXT,
    direct_description TEXT,
    direct_image_url TEXT,
    direct_link_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    impressions_count INTEGER NOT NULL DEFAULT 0,
    clicks_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS affiliate_products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price_egp REAL NOT NULL,
    old_price_egp REAL,
    image_url TEXT,
    affiliate_url TEXT NOT NULL,
    network_label TEXT NOT NULL,
    commission_rate_pct REAL NOT NULL DEFAULT 5,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    clicks_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    target_role TEXT NOT NULL CHECK (target_role IN ('user', 'technician', 'store', 'enterprise')),
    price_monthly_egp REAL NOT NULL,
    price_yearly_egp REAL NOT NULL,
    billing_enabled INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    features_json TEXT NOT NULL,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    admin_note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS page_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    referrer TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revenue_entries (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('adsense', 'affiliate', 'subscription', 'direct_ad')),
    description TEXT NOT NULL,
    amount_egp REAL NOT NULL,
    entry_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'OMOR — عُمْر',
  siteBrandPrefix: 'SASA STORE',
  slogan: 'كل جهاز له حكاية.. وكل حكاية لها سجل.',
  logoUrl: '',
  contactPhone: '01214899889',
  contactEmail: 'support@sasastore.app',
  supportWhatsapp: '201214899889',
  customDomain: '',
  seoDefaultTitle: 'SASA STORE | OMOR — عُمْر | منصة الهوية الرقمية للأجهزة وسوق الثقة',
  seoDefaultDescription:
    'منصة عُمْر (OMOR) من صاصا ستور لإنشاء الهوية الرقمية للأجهزة، توثيق الصيانة والضمانات، أدلة فحص الأجهزة المستعملة، والعروض الموثوقة في مصر.',
  googleSearchConsoleToken: '',
  googleAdsenseClient: '',
  adsenseEnabled: false,
  paidPlansEnabled: true,
  sectionFlags: {
    articles: true,
    offers: true,
    market: true,
    technicians: true,
    v3Tools: true,
    ads: true,
  },
  updatedAt: nowIso(),
};

function seedDefaultsIfEmpty() {
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM site_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    db.prepare('INSERT INTO site_settings (id, payload_json, updated_at) VALUES (1, ?, ?)').run(
      JSON.stringify(DEFAULT_SETTINGS),
      nowIso()
    );
  }

  const pagesCount = (db.prepare('SELECT COUNT(*) as c FROM page_configs').get() as { c: number }).c;
  if (pagesCount === 0) {
    const insertPage = db.prepare(
      'INSERT INTO page_configs (slug, title, meta_title, meta_description, hero_heading, hero_body, is_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const ts = nowIso();
    const pages: Array<[string, string, string, string, string, string, number]> = [
      [
        'home',
        'الصفحة الرئيسية',
        'SASA STORE | OMOR — عُمْر | الهوية الرقمية للأجهزة وسوق الثقة',
        'أنشئ الهوية الرقمية لأجهزتك، وثّق الصيانة والضمانات، وتصفح أحدث العروض ومقالات فحص الأجهزة المستعملة.',
        'كل جهاز له حكاية.. وكل حكاية لها سجل.',
        'منصة متكاملة لتوثيق دورة حياة الأجهزة الإلكترونية في مصر وحماية البائع والمشتري بمعلومات موثقة.',
        1,
      ],
      [
        'about',
        'من نحن',
        'من نحن — منصة SASA STORE | OMOR (عُمْر)',
        'تعرف على قصة منصة عُمْر من صاصا ستور ورؤيتنا لبناء سوق أجهزة مستعملة أكثر شفافية وأمانًا في مصر.',
        'لماذا بنينا منصة عُمْر (OMOR)؟',
        'ولدت منصة عُمْر لحل أكبر مشكلة في سوق الأجهزة المستعملة والصيانة: غياب السجل الموثق واختلاط الأجهزة السليمة بالمجمّعة أو المسروقة.',
        1,
      ],
      [
        'contact',
        'تواصل معنا',
        'تواصل معنا — الدعم الفني وخدمة العملاء | OMOR',
        'تواصل مع إدارة منصة SASA STORE OMOR للاستفسارات، الشراكات، الإعلانات، أو الدعم الفني المباشر.',
        'يسعدنا تواصلك مع فريق صاصا ستور — عُمْر',
        'أرسل رسالتك أو استفسارك مباشرة إلى لوحة الإدارة وسنرد عليك في أقرب وقت، أو تواصل عبر واتساب 01214899889.',
        1,
      ],
      [
        'offers',
        'العروض والمنتجات المقترحة',
        'أفضل عروض الملحقات والأجهزة الموثوقة | SASA STORE OMOR',
        'مختارات ومراجعات أفضل الشواحن الأصلية، الباوربانك، وأدوات حماية الأجهزة مع روابط شراء موثوقة.',
        'عروض وملحقات موصى بها لأجهزتك',
        'منتجات وملحقات أصلية مختارة بعناية للحفاظ على عمر البطارية وأداء أجهزتك.',
        1,
      ],
      [
        'articles',
        'المقالات والأدلة التقنية',
        'أدلة فحص الأجهزة المستعملة وصيانتها | مدونة عُمْر',
        'مقالات وأدلة عملية حول فحص الآيفون واللابتوب المستعمل، أسعار الصيانة في مصر، وكيفية حماية جهازك.',
        'مكتبة المعرفة وفحص الأجهزة',
        'أدلة عملية مكتوبة خصيصًا للسوق المصري لمساعدتك في شراء جهاز مستعمل بأمان والحفاظ عليه.',
        1,
      ],
      [
        'privacy',
        'سياسة الخصوصية',
        'سياسة الخصوصية وحماية البيانات — OMOR',
        'سياسة الخصوصية لمنصة SASA STORE OMOR وتوضيح حقوق المستخدم، حماية IMEI، وإعلانات Google AdSense.',
        'سياسة الخصوصية وحماية البيانات',
        'نلتزم بأعلى معايير حماية خصوصية المستخدمين وعدم مشاركة البيانات الحساسة في السجل العام.',
        1,
      ],
      [
        'terms',
        'شروط الاستخدام',
        'شروط وأحكام الاستخدام — SASA STORE OMOR',
        'الضوابط والشروط المنظمة لاستخدام منصة عُمْر لتوثيق الأجهزة والخدمات الإعلانية والتجارية.',
        'شروط الاستخدام والضوابط العامة',
        'باستخدامك منصة عُمْر فإنك توافق على الالتزام بالصدق في تسجيل بيانات الأجهزة وتقارير الصيانة.',
        1,
      ],
      [
        'cookies',
        'سياسة ملفات تعريف الارتباط (Cookies)',
        'سياسة الكوكيز وملفات تعريف الارتباط — OMOR',
        'توضيح كيفية استخدام ملفات تعريف الارتباط لتحسين الأداء وحفظ المظهر وتخصيص إعلانات Google AdSense.',
        'سياسة ملفات تعريف الارتباط (Cookies Policy)',
        'تستخدم المنصة ملفات تعريف ارتباط أساسية لحفظ الجلسة وتفضيل الوضع الليلي/النهاري، بالإضافة لملفات الشركاء الإعلانيين عند تفعيلها.',
        1,
      ],
    ];
    for (const p of pages) {
      insertPage.run(...p, ts);
    }
  }

  const catCount = (db.prepare('SELECT COUNT(*) as c FROM article_categories').get() as { c: number }).c;
  if (catCount === 0) {
    const insCat = db.prepare(
      'INSERT INTO article_categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    insCat.run('cat-buyers', 'أدلة الشراء المستعمل', 'used-buying-guides', 'كيف تفحص هاتفًا أو لابتوبًا مستعملًا قبل الدفع.', 1);
    insCat.run('cat-care', 'الصيانة الدورية والبطاريات', 'maintenance-battery', 'نصائح عملية لإطالة عمر الجهاز والبطارية.', 2);
    insCat.run('cat-security', 'الحماية من السرقة والاحتيال', 'security-anti-fraud', 'تأمين السيريال والـ IMEI ونقل الملكية الآمن.', 3);
  }

  const artCount = (db.prepare('SELECT COUNT(*) as c FROM articles').get() as { c: number }).c;
  if (artCount === 0) {
    const insArt = db.prepare(
      `INSERT INTO articles (id, title, slug, excerpt, content, cover_image_url, category_id, author_name, status, show_on_home, seo_title, seo_description, views_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const ts = nowIso();
    insArt.run(
      'art-1',
      'الدليل الشامل لفحص الآيفون المستعمل في مصر قبل الشراء (2026)',
      'used-iphone-inspection-guide-egypt',
      '7 خطوات عملية للتأكد من أن الآيفون لم يُفتح، وأن الشاشة والبطارية أصلية، مع مطابقة رقم IMEI في منصة عُمْر.',
      `شراء هاتف iPhone مستعمل في السوق المصري يتطلب فحصًا دقيقًا لتجنب الأجهزة المجمّعة أو التي تم استبدال شاشتها بقطع غير أصلية.\n\n1. فحص السجل الرقمي عبر OMOR QR:\nاطلب من البائع رمز QR أو كود الجهاز على منصة عُمْر لمراجعة تاريخ الصيانات المعتمدة والفاتورة المرفقة.\n\n2. التأكد من أصلية الشاشة وFace ID:\nتحقق من وجود خاصية True Tone وتأكد من عمل Face ID بسلاسة وعدم ظهور رسائل تنبيه قطع غير معروفة في الإعدادات.\n\n3. فحص صحة البطارية ودورات الشحن:\nيفضل ألا تقل صحة البطارية عن 85%، مع مقارنة عمر الجهاز وتاريخ شرائه الفعلي.\n\n4. إتمام نقل الملكية الرقمي:\nلا تدفع المبلغ بالكامل إلا بعد استلام رمز نقل الملكية المؤقت من البائع عبر صفحة النقل في OMOR.`,
      '/src/assets/images/demo_phone_pro_1795361833294.jpg',
      'cat-buyers',
      'فريق تحرير SASA STORE OMOR',
      'published',
      1,
      'دليل فحص الآيفون المستعمل في مصر قبل الدفع | OMOR',
      'تعرف على أهم 7 خطوات لفحص الآيفون المستعمل في مصر وكشف الشاشة والبطارية الأصلية عبر منصة عُمْر.',
      184,
      ts,
      ts
    );
    insArt.run(
      'art-2',
      'متى يجب تنظيف مروحة اللابتوب وتغيير المعجون الحراري؟',
      'laptop-thermal-paste-maintenance-schedule',
      'ارتفاع الحرارة هو العدو الأول لمعالج اللابتوب وكارت الشاشة في الصيف المصري. إليك الجدول الوقائي الموصى به.',
      `كثير من أعطال اللابتوب المفاجئة وتلف كروت الشاشة تبدأ بسبب بسيط: تراكم الأتربة داخل زعانف التبريد وجفاف المعجون الحراري.\n\n• كل 6 أشهر: تنظيف المراوح وفتحات التهوية بالهواء الجاف في مركز صيانة موثوق.\n• كل 12 شهرًا: فحص درجات الحرارة وتغيير المعجون الحراري (Thermal Paste) بنوع عالي الجودة.\n\nيمكنك الآن من داخل بطاقة جهازك في منصة عُمْر جدولة تذكير دوري كل 180 يومًا ليصلك إشعار ذكي قبل الموعد وتوثيق الصيانة في سجل الجهاز لرفع قيمته عند البيع.`,
      '/src/assets/images/demo_laptop_air_1795361832982.jpg',
      'cat-care',
      'م. كريم عبد الرحمن',
      'published',
      1,
      'جدول تنظيف اللابتوب وتغيير المعجون الحراري | OMOR',
      'تعرف على المواعيد الدورية لتنظيف اللابتوب وتغيير المعجون الحراري لحماية المعالج ورفع عمر الجهاز.',
      142,
      ts,
      ts
    );
    insArt.run(
      'art-3',
      'كيف تحمي هاتفك من السرقة وتتأكد من خلو الجهاز المستعمل من البلاغات؟',
      'protect-device-from-theft-imei-check',
      'خطوات تفعيل وضع البلاغ الفوري على منصة عُمْر وفحص أرقام السيريال وIMEI قبل شراء أي جهاز مستعمل.',
      `تؤدي سرقة الأجهزة أو بيع أجهزة عليها بلاغات إلى خسائر كبيرة للمشتري والمالك الأصلي.\n\nعلى منصة عُمْر:\n1. سجّل الرقم التسلسلي وIMEI في خزينة جهازك الخاصة فور شرائه.\n2. في حالة الفقدان أو السرقة، فعّل «بلاغ فقدان/سرقة» من صفحة الجهاز ليُقفل الجهاز فورًا ضد البيع في السوق أو نقل الملكية.\n3. عند فحص أي جهاز قبل شرائه عبر صفحة /scan، أدخل آخر أرقام السيريال أو امسح QR لتتأكد فورًا من عدم وجود أي بلاغ مسجل عليه.`,
      '/src/assets/images/hero_device_vault_1795361833045.jpg',
      'cat-security',
      'إدارة الأمان — SASA STORE',
      'published',
      1,
      'حماية الأجهزة من السرقة وفحص IMEI قبل الشراء | OMOR',
      'احمِ هاتفك أو لابتوبك من السرقة وتأكد من سلامة الأجهزة المستعملة قبل الشراء باستخدام منصة عُمْر.',
      96,
      ts,
      ts
    );
  }

  const adsCount = (db.prepare('SELECT COUNT(*) as c FROM ad_slots').get() as { c: number }).c;
  if (adsCount === 0) {
    const insAd = db.prepare(
      `INSERT INTO ad_slots (id, name, placement, ad_type, adsense_client, adsense_slot, adsense_format, direct_title, direct_description, direct_image_url, direct_link_url, is_active, impressions_count, clicks_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const ts = nowIso();
    insAd.run(
      'ad-home-mid',
      'مخطط صاصا ستور — مخططات بوردة الموبايل',
      'home_mid',
      'direct',
      '',
      '',
      'auto',
      'مخطط صاصا ستور — مخطط بوردة الموبايل لأشهر الأجهزة في السوق المصري',
      'مسارات الشحن والشبكة والبيانات وملفات Bitmap لأجهزة iPhone 13-16 Pro Max وSamsung A15/A35/A55/S24 Ultra وRedmi Note 13 وOppo Reno 11 وRealme وInfinix.',
      '',
      'https://sasastore.lovable.app',
      1,
      0,
      0,
      ts
    );
    insAd.run(
      'ad-article-top',
      'إعلان أعلى المقالات (Google AdSense / مباشر)',
      'article_top',
      'adsense',
      '',
      '',
      'horizontal',
      '',
      '',
      '',
      '',
      0,
      0,
      0,
      ts
    );
    insAd.run(
      'ad-article-bottom',
      'إعلان أسفل المقالات (Google AdSense / مباشر)',
      'article_bottom',
      'adsense',
      '',
      '',
      'auto',
      '',
      '',
      '',
      '',
      0,
      0,
      0,
      ts
    );
    insAd.run(
      'ad-offers-top',
      'إعلان أعلى صفحة العروض والأفلييت',
      'offers_top',
      'adsense',
      '',
      '',
      'auto',
      '',
      '',
      '',
      '',
      0,
      0,
      0,
      ts
    );
  }

  const affCount = (db.prepare('SELECT COUNT(*) as c FROM affiliate_products').get() as { c: number }).c;
  if (affCount === 0) {
    const insAff = db.prepare(
      `INSERT INTO affiliate_products (id, title, slug, category, description, price_egp, old_price_egp, image_url, affiliate_url, network_label, commission_rate_pct, is_featured, is_active, clicks_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const ts = nowIso();
    insAff.run(
      'aff-1',
      'شاحن Anker PowerPort III 65W GaN السريع (منفذين USB-C)',
      'anker-65w-gan-charger',
      'شواحن وكابلات أصلية',
      'شاحن أصلي بتقنية GaN يحمي بطارية الآيفون واللابتوب من ارتفاع الحرارة وتذبذب الكهرباء.',
      1650,
      1950,
      '/src/assets/images/demo_phone_pro_1795361833294.jpg',
      'https://sasastore.lovable.app',
      'SASA STORE / Affiliate',
      8,
      1,
      1,
      0,
      ts
    );
    insAff.run(
      'aff-2',
      'طقم تنظيف شاشات ومنافذ الأجهزة الإلكترونية الاحترافي',
      'pro-device-cleaning-kit',
      'أدوات الصيانة الدورية',
      'فرش دقيقة لتنظيف سماعات الهاتف ومنفذ الشحن ومحلول آمن لطبقات حماية الشاشات.',
      340,
      450,
      '/src/assets/images/demo_laptop_air_1795361832982.jpg',
      'https://sasastore.lovable.app',
      'SASA STORE / Affiliate',
      10,
      1,
      1,
      0,
      ts
    );
    insAff.run(
      'aff-3',
      'باوربانك Anker 20,000mAh بشاشة رقمية وشحن PD',
      'anker-20000-pd-powerbank',
      'بطاريات وطاقة متنقلة',
      'سعة حقيقية مع دوائر حماية معتمدة لإطالة عمر بطارية هاتفك أثناء السفر.',
      2490,
      2890,
      '/src/assets/images/hero_device_vault_1795361833045.jpg',
      'https://sasastore.lovable.app',
      'SASA STORE / Affiliate',
      7,
      0,
      1,
      0,
      ts
    );
  }

  const plansCount = (db.prepare('SELECT COUNT(*) as c FROM subscription_plans').get() as { c: number }).c;
  if (plansCount === 0) {
    const insPlan = db.prepare(
      `INSERT INTO subscription_plans (id, name, slug, target_role, price_monthly_egp, price_yearly_egp, billing_enabled, is_active, features_json, subscriber_count, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insPlan.run(
      'plan-user-free',
      'الباقة الأساسية للأفراد',
      'personal-free',
      'user',
      0,
      0,
      0,
      1,
      JSON.stringify([
        'تسجيل الأجهزة وإصدار رمز QR العام',
        'خزينة الفواتير والـ IMEI المشفرة',
        'تذكيرات الصيانة الدورية والضمانات',
        'نقل الملكية الآمن برمز مؤقت',
      ]),
      0,
      1
    );
    insPlan.run(
      'plan-tech-pro',
      'باقة الفني ومركز الصيانة المحترف',
      'technician-pro',
      'technician',
      299,
      2990,
      1,
      1,
      JSON.stringify([
        'شارة المركز الموثق Pro وأولوية الظهور في الدليل',
        'استقبال طلبات صيانة غير محدودة وإشعارات فورية',
        'توثيق صور قبل/بعد وإصدار شهادة ضمان رقمية',
        'حزمة تقارير تشخيص وفحص OMOR V3 وتقليل العمولات',
      ]),
      0,
      2
    );
    insPlan.run(
      'plan-store-vip',
      'باقة المتاجر والتجار (VIP & B2B)',
      'store-enterprise',
      'store',
      690,
      6900,
      1,
      1,
      JSON.stringify([
        'شارة «تاجر موثق VIP» وضمان المتجر المعتمد في السوق',
        'إدراج أجهزة متعددة + تمييز 3 إعلانات شهريًا',
        '40 تقرير فحص مخاطر الشراء OMOR V3 قبل الاستحواذ',
        'تكامل Webhook وتقارير تسعير قطع الغيار والمخزون',
      ]),
      0,
      3
    );
  }
  // Ensure pre-seeded professional plans have billing active if untouched
  db.prepare(
    "UPDATE subscription_plans SET billing_enabled = 1 WHERE id IN ('plan-tech-pro', 'plan-store-vip') AND subscriber_count = 0"
  ).run();
  // Ensure pre-seeded home mid ad reflects Sasa Store board schematics if untouched
  db.prepare(
    `UPDATE ad_slots
     SET name = 'مخطط صاصا ستور — مخططات بوردة الموبايل',
         direct_title = 'مخطط صاصا ستور — مخطط بوردة الموبايل لأشهر الأجهزة في السوق المصري',
         direct_description = 'مسارات الشحن والشبكة والبيانات وملفات Bitmap لأجهزة iPhone 13-16 Pro Max وSamsung A15/A35/A55/S24 Ultra وRedmi Note 13 وOppo Reno 11 وRealme وInfinix.'
     WHERE id = 'ad-home-mid' AND direct_title LIKE '%عروض الموبايلات والملحقات الأصلية%'`
  ).run();
}

seedDefaultsIfEmpty();

export function getActivePlanById(planId: string): SubscriptionPlan | null {
  const row = db
    .prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1')
    .get(planId) as Record<string, unknown> | undefined;
  if (!row) return null;
  let features: string[] = [];
  try {
    features = JSON.parse(String(row.features_json || '[]')) as string[];
  } catch {
    features = [];
  }
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    targetRole: row.target_role as SubscriptionPlan['targetRole'],
    priceMonthlyEgp: Number(row.price_monthly_egp || 0),
    priceYearlyEgp: Number(row.price_yearly_egp || 0),
    billingEnabled: Boolean(row.billing_enabled),
    isActive: Boolean(row.is_active),
    features,
    subscriberCount: Number(row.subscriber_count || 0),
    sortOrder: Number(row.sort_order || 0),
  };
}

export function incrementPlanSubscriberAndRevenue(
  planId: string | null,
  description: string,
  amountEgp: number
): void {
  if (planId) {
    db.prepare('UPDATE subscription_plans SET subscriber_count = subscriber_count + 1 WHERE id = ?').run(planId);
  }
  if (amountEgp > 0) {
    const id = `REV-${crypto.randomUUID().slice(0, 8)}`;
    const ts = nowIso();
    db.prepare(
      'INSERT INTO revenue_entries (id, source_type, description, amount_egp, entry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, 'subscription', description.slice(0, 240), amountEgp, ts.slice(0, 10), ts);
  }
}

// --- Admin Auth Helpers ---

export function getAdminAuthStatus(bearerToken?: string): {
  setupRequired: boolean;
  envOverrideActive: boolean;
  authenticated: boolean;
  email: string | null;
} {
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  const cred = db.prepare('SELECT email FROM admin_credentials WHERE id = 1').get() as { email: string } | undefined;
  const setupRequired = !cred && !envPass;
  const session = bearerToken ? verifyAdminSessionToken(bearerToken) : null;

  return {
    setupRequired,
    envOverrideActive: Boolean(envPass),
    authenticated: Boolean(session),
    email: session?.email || null,
  };
}

export function setupInitialAdmin(email: string, password: string): { ok: boolean; token?: string; error?: string } {
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  if (envPass) {
    return { ok: false, error: 'تم ضبط رمز الإدارة من إعدادات البيئة (ADMIN_PASSCODE) بالفعل.' };
  }
  const existing = db.prepare('SELECT id FROM admin_credentials WHERE id = 1').get();
  if (existing) {
    return { ok: false, error: 'تم إعداد حساب المدير مسبقًا. استخدم شاشة تسجيل الدخول.' };
  }

  const { hash, salt } = hashPassword(password);
  const cleanEmail = email.trim().toLowerCase();
  db.prepare(
    'INSERT INTO admin_credentials (id, email, password_hash, password_salt, updated_at) VALUES (1, ?, ?, ?, ?)'
  ).run(cleanEmail, hash, salt, nowIso());

  const token = createAdminSession(cleanEmail);
  return { ok: true, token };
}

export function loginAdmin(email: string, password: string): { ok: boolean; token?: string; error?: string } {
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  const cred = db
    .prepare('SELECT email, password_hash, password_salt FROM admin_credentials WHERE id = 1')
    .get() as { email: string; password_hash: string; password_salt: string } | undefined;

  const cleanEmail = email.trim().toLowerCase();

  // Check env passcode override first (timing-safe comparison on hashed values)
  if (envPass) {
    const a = crypto.createHash('sha256').update(password).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    if (crypto.timingSafeEqual(a, b)) {
      const token = createAdminSession(cleanEmail || cred?.email || 'admin@sasastore.app');
      return { ok: true, token };
    }
  }

  if (!cred) {
    return { ok: false, error: 'لم يتم إعداد حساب المدير بعد.' };
  }

  if (cred.email.toLowerCase() !== cleanEmail && envPass === '') {
    return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
  }

  if (!verifyPassword(password, cred.password_hash, cred.password_salt)) {
    return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
  }

  const token = createAdminSession(cred.email);
  return { ok: true, token };
}

function createAdminSession(email: string): string {
  // Clean expired sessions
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(nowIso());
  const token = crypto.randomBytes(32).toString('hex');
  const created = new Date();
  const expires = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO admin_sessions (token, email, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    email,
    created.toISOString(),
    expires.toISOString()
  );
  return token;
}

export function verifyAdminSessionToken(token: string): { email: string } | null {
  if (!token) return null;
  const row = db
    .prepare('SELECT email, expires_at FROM admin_sessions WHERE token = ?')
    .get(token) as { email: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return null;
  }
  return { email: row.email };
}

export function logoutAdminSession(token: string): void {
  if (!token) return;
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

export function changeAdminPassword(
  sessionEmail: string,
  currentPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const cred = db
    .prepare('SELECT email, password_hash, password_salt FROM admin_credentials WHERE id = 1')
    .get() as { email: string; password_hash: string; password_salt: string } | undefined;

  if (cred) {
    if (!verifyPassword(currentPassword, cred.password_hash, cred.password_salt)) {
      return { ok: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }
    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE admin_credentials SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = 1').run(
      hash,
      salt,
      nowIso()
    );
    return { ok: true };
  }

  // If previously only ADMIN_PASSCODE env was used, allow setting DB password after verifying env passcode
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  if (envPass) {
    const a = crypto.createHash('sha256').update(currentPassword).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }
    const { hash, salt } = hashPassword(newPassword);
    db.prepare(
      'INSERT INTO admin_credentials (id, email, password_hash, password_salt, updated_at) VALUES (1, ?, ?, ?, ?)'
    ).run(sessionEmail, hash, salt, nowIso());
    return { ok: true };
  }

  return { ok: false, error: 'تعذر تحديث كلمة المرور.' };
}

// --- Mappers ---

function mapPageRow(r: Record<string, unknown>): PageConfig {
  return {
    slug: String(r.slug),
    title: String(r.title),
    metaTitle: String(r.meta_title),
    metaDescription: String(r.meta_description),
    heroHeading: String(r.hero_heading),
    heroBody: String(r.hero_body),
    isEnabled: Boolean(r.is_enabled),
    updatedAt: String(r.updated_at),
  };
}

function mapCategoryRow(r: Record<string, unknown>): ArticleCategory {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: r.description ? String(r.description) : undefined,
    sortOrder: Number(r.sort_order || 0),
  };
}

function mapArticleRow(r: Record<string, unknown>): ArticleItem {
  return {
    id: String(r.id),
    title: String(r.title),
    slug: String(r.slug),
    excerpt: String(r.excerpt),
    content: String(r.content),
    coverImageUrl: r.cover_image_url ? String(r.cover_image_url) : undefined,
    categoryId: r.category_id ? String(r.category_id) : undefined,
    categoryName: r.category_name ? String(r.category_name) : undefined,
    authorName: String(r.author_name),
    status: r.status as ArticleItem['status'],
    showOnHome: Boolean(r.show_on_home),
    seoTitle: r.seo_title ? String(r.seo_title) : undefined,
    seoDescription: r.seo_description ? String(r.seo_description) : undefined,
    viewsCount: Number(r.views_count || 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapAdRow(r: Record<string, unknown>): AdSlot {
  return {
    id: String(r.id),
    name: String(r.name),
    placement: r.placement as AdSlot['placement'],
    adType: r.ad_type as AdSlot['adType'],
    adsenseClient: r.adsense_client ? String(r.adsense_client) : undefined,
    adsenseSlot: r.adsense_slot ? String(r.adsense_slot) : undefined,
    adsenseFormat: r.adsense_format ? String(r.adsense_format) : undefined,
    directTitle: r.direct_title ? String(r.direct_title) : undefined,
    directDescription: r.direct_description ? String(r.direct_description) : undefined,
    directImageUrl: r.direct_image_url ? String(r.direct_image_url) : undefined,
    directLinkUrl: r.direct_link_url ? String(r.direct_link_url) : undefined,
    isActive: Boolean(r.is_active),
    impressionsCount: Number(r.impressions_count || 0),
    clicksCount: Number(r.clicks_count || 0),
    updatedAt: String(r.updated_at),
  };
}

function mapAffiliateRow(r: Record<string, unknown>): AffiliateProduct {
  return {
    id: String(r.id),
    title: String(r.title),
    slug: String(r.slug),
    category: String(r.category),
    description: String(r.description),
    priceEgp: Number(r.price_egp || 0),
    oldPriceEgp: r.old_price_egp != null ? Number(r.old_price_egp) : undefined,
    imageUrl: r.image_url ? String(r.image_url) : undefined,
    affiliateUrl: String(r.affiliate_url),
    networkLabel: String(r.network_label),
    commissionRatePct: Number(r.commission_rate_pct || 0),
    isFeatured: Boolean(r.is_featured),
    isActive: Boolean(r.is_active),
    clicksCount: Number(r.clicks_count || 0),
    createdAt: String(r.created_at),
  };
}

function mapPlanRow(r: Record<string, unknown>): SubscriptionPlan {
  let features: string[] = [];
  try {
    features = JSON.parse(String(r.features_json || '[]')) as string[];
  } catch {
    features = [];
  }
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    targetRole: r.target_role as SubscriptionPlan['targetRole'],
    priceMonthlyEgp: Number(r.price_monthly_egp || 0),
    priceYearlyEgp: Number(r.price_yearly_egp || 0),
    billingEnabled: Boolean(r.billing_enabled),
    isActive: Boolean(r.is_active),
    features,
    subscriberCount: Number(r.subscriber_count || 0),
    sortOrder: Number(r.sort_order || 0),
  };
}

function mapMessageRow(r: Record<string, unknown>): ContactMessage {
  return {
    id: String(r.id),
    senderName: String(r.sender_name),
    senderEmail: String(r.sender_email),
    senderPhone: r.sender_phone ? String(r.sender_phone) : undefined,
    subject: String(r.subject),
    message: String(r.message),
    status: r.status as ContactMessage['status'],
    adminNote: r.admin_note ? String(r.admin_note) : undefined,
    createdAt: String(r.created_at),
  };
}

function mapRevenueRow(r: Record<string, unknown>): RevenueEntry {
  return {
    id: String(r.id),
    sourceType: r.source_type as RevenueEntry['sourceType'],
    description: String(r.description),
    amountEgp: Number(r.amount_egp || 0),
    entryDate: String(r.entry_date),
    createdAt: String(r.created_at),
  };
}

// --- Settings & Public Data ---

export function getSiteSettings(): SiteSettings {
  const row = db.prepare('SELECT payload_json FROM site_settings WHERE id = 1').get() as { payload_json: string } | undefined;
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.payload_json) as Partial<SiteSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSiteSettings(next: SiteSettings): SiteSettings {
  const merged: SiteSettings = {
    ...getSiteSettings(),
    ...next,
    sectionFlags: {
      ...getSiteSettings().sectionFlags,
      ...(next.sectionFlags || {}),
    },
    updatedAt: nowIso(),
  };
  db.prepare('UPDATE site_settings SET payload_json = ?, updated_at = ? WHERE id = 1').run(
    JSON.stringify(merged),
    merged.updatedAt
  );
  return merged;
}

export function getPublicBootstrap(): PublicCmsBootstrap {
  const settings = getSiteSettings();
  const pages = (db.prepare('SELECT * FROM page_configs ORDER BY slug').all() as Array<Record<string, unknown>>).map(
    mapPageRow
  );
  const categories = (
    db.prepare('SELECT * FROM article_categories ORDER BY sort_order ASC, name ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapCategoryRow);
  const articles = (
    db
      .prepare(
        `SELECT a.*, c.name AS category_name
         FROM articles a
         LEFT JOIN article_categories c ON c.id = a.category_id
         WHERE a.status = 'published'
         ORDER BY a.created_at DESC`
      )
      .all() as Array<Record<string, unknown>>
  ).map(mapArticleRow);
  const adSlots = (
    db.prepare('SELECT * FROM ad_slots WHERE is_active = 1 ORDER BY updated_at DESC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapAdRow);
  const affiliates = (
    db.prepare('SELECT * FROM affiliate_products WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapAffiliateRow);
  const plans = (
    db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapPlanRow);

  return {
    settings,
    pages,
    categories,
    articles,
    adSlots,
    affiliates,
    plans,
  };
}

export function getPublishedArticleBySlug(slug: string): ArticleItem | null {
  const row = db
    .prepare(
      `SELECT a.*, c.name AS category_name
       FROM articles a
       LEFT JOIN article_categories c ON c.id = a.category_id
       WHERE a.slug = ? AND a.status = 'published'`
    )
    .get(slug) as Record<string, unknown> | undefined;
  if (!row) return null;
  db.prepare('UPDATE articles SET views_count = views_count + 1 WHERE id = ?').run(String(row.id));
  const item = mapArticleRow(row);
  item.viewsCount += 1;
  return item;
}

// --- Tracking & Anti-Spam Contact ---

export function recordVisit(visitPath: string, visitorHash: string, referrer?: string): void {
  db.prepare('INSERT INTO page_visits (path, visitor_hash, referrer, created_at) VALUES (?, ?, ?, ?)').run(
    visitPath.slice(0, 200),
    visitorHash.slice(0, 80),
    (referrer || '').slice(0, 300),
    nowIso()
  );
}

export function trackAdEvent(slotId: string, event: 'impression' | 'click'): boolean {
  const existing = db.prepare('SELECT id FROM ad_slots WHERE id = ? AND is_active = 1').get(slotId);
  if (!existing) return false;
  if (event === 'impression') {
    db.prepare('UPDATE ad_slots SET impressions_count = impressions_count + 1 WHERE id = ?').run(slotId);
  } else {
    db.prepare('UPDATE ad_slots SET clicks_count = clicks_count + 1 WHERE id = ?').run(slotId);
  }
  return true;
}

export function trackAffiliateClick(id: string): { affiliateUrl: string } | null {
  const row = db
    .prepare('SELECT affiliate_url FROM affiliate_products WHERE id = ? AND is_active = 1')
    .get(id) as { affiliate_url: string } | undefined;
  if (!row) return null;
  db.prepare('UPDATE affiliate_products SET clicks_count = clicks_count + 1 WHERE id = ?').run(id);
  return { affiliateUrl: row.affiliate_url };
}

export function createContactMessage(input: {
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
}): ContactMessage {
  const id = `MSG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO contact_messages (id, sender_name, sender_email, sender_phone, subject, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`
  ).run(
    id,
    input.senderName.trim(),
    input.senderEmail.trim(),
    input.senderPhone?.trim() || null,
    input.subject.trim(),
    input.message.trim(),
    ts
  );
  return {
    id,
    senderName: input.senderName.trim(),
    senderEmail: input.senderEmail.trim(),
    senderPhone: input.senderPhone?.trim() || undefined,
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: 'new',
    createdAt: ts,
  };
}

// --- Admin Queries & Mutations ---

export function getAdminOverviewStats(): AdminOverviewStats {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const today = (
    db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE created_at >= ?').get(dayAgo) as { c: number }
  ).c;
  const week = (
    db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE created_at >= ?').get(weekAgo) as { c: number }
  ).c;
  const month = (
    db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE created_at >= ?').get(monthAgo) as { c: number }
  ).c;
  const totalViews = (db.prepare('SELECT COUNT(*) as c FROM page_visits').get() as { c: number }).c;
  const uniqueVisitors = (
    db.prepare('SELECT COUNT(DISTINCT visitor_hash) as c FROM page_visits').get() as { c: number }
  ).c;
  const topPaths = db
    .prepare('SELECT path, COUNT(*) as count FROM page_visits GROUP BY path ORDER BY count DESC LIMIT 6')
    .all() as Array<{ path: string; count: number }>;

  const publishedArticles = (
    db.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'published'").get() as { c: number }
  ).c;
  const draftArticles = (
    db.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'draft'").get() as { c: number }
  ).c;
  const hiddenArticles = (
    db.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'hidden'").get() as { c: number }
  ).c;
  const categoriesCount = (
    db.prepare('SELECT COUNT(*) as c FROM article_categories').get() as { c: number }
  ).c;

  const adStats = db
    .prepare(
      'SELECT SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCount, COALESCE(SUM(impressions_count), 0) as imps, COALESCE(SUM(clicks_count), 0) as clicks FROM ad_slots'
    )
    .get() as { activeCount: number; imps: number; clicks: number };

  const affStats = db
    .prepare(
      'SELECT SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCount, COALESCE(SUM(clicks_count), 0) as clicks FROM affiliate_products'
    )
    .get() as { activeCount: number; clicks: number };

  const estimatedAffRow = db
    .prepare(
      'SELECT COALESCE(SUM(clicks_count * price_egp * (commission_rate_pct / 100.0) * 0.03), 0) as est FROM affiliate_products'
    )
    .get() as { est: number };

  const revenueRows = db
    .prepare('SELECT source_type, COALESCE(SUM(amount_egp), 0) as total FROM revenue_entries GROUP BY source_type')
    .all() as Array<{ source_type: string; total: number }>;
  const revenueBySource: Record<string, number> = {
    adsense: 0,
    affiliate: 0,
    subscription: 0,
    direct_ad: 0,
  };
  let totalRecordedRevenueEgp = 0;
  for (const r of revenueRows) {
    revenueBySource[r.source_type] = Number(r.total || 0);
    totalRecordedRevenueEgp += Number(r.total || 0);
  }

  const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM contact_messages').get() as { c: number }).c;
  const unreadMessages = (
    db.prepare("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'new'").get() as { c: number }
  ).c;

  return {
    visitors: {
      today,
      week,
      month,
      totalViews,
      uniqueVisitors,
      topPaths,
    },
    content: {
      publishedArticles,
      draftArticles,
      hiddenArticles,
      categoriesCount,
    },
    monetization: {
      activeAdsCount: Number(adStats.activeCount || 0),
      totalAdImpressions: Number(adStats.imps || 0),
      totalAdClicks: Number(adStats.clicks || 0),
      activeAffiliatesCount: Number(affStats.activeCount || 0),
      totalAffiliateClicks: Number(affStats.clicks || 0),
      totalRecordedRevenueEgp: Math.round(totalRecordedRevenueEgp * 100) / 100,
      estimatedAffiliateEarningsEgp: Math.round(Number(estimatedAffRow.est || 0) * 100) / 100,
      revenueBySource,
    },
    inbox: {
      totalMessages,
      unreadMessages,
    },
  };
}

export function adminUpdatePageConfig(slug: string, data: Partial<PageConfig>): PageConfig | null {
  const existing = db.prepare('SELECT * FROM page_configs WHERE slug = ?').get(slug) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return null;
  const ts = nowIso();
  db.prepare(
    `UPDATE page_configs
     SET title = ?, meta_title = ?, meta_description = ?, hero_heading = ?, hero_body = ?, is_enabled = ?, updated_at = ?
     WHERE slug = ?`
  ).run(
    data.title ?? String(existing.title),
    data.metaTitle ?? String(existing.meta_title),
    data.metaDescription ?? String(existing.meta_description),
    data.heroHeading ?? String(existing.hero_heading),
    data.heroBody ?? String(existing.hero_body),
    data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : Number(existing.is_enabled),
    ts,
    slug
  );
  const updated = db.prepare('SELECT * FROM page_configs WHERE slug = ?').get(slug) as Record<string, unknown>;
  return mapPageRow(updated);
}

export function adminListArticles(): ArticleItem[] {
  return (
    db
      .prepare(
        `SELECT a.*, c.name AS category_name
         FROM articles a
         LEFT JOIN article_categories c ON c.id = a.category_id
         ORDER BY a.updated_at DESC`
      )
      .all() as Array<Record<string, unknown>>
  ).map(mapArticleRow);
}

export function adminUpsertCategory(payload: {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}): ArticleCategory {
  const id = payload.id || `cat-${crypto.randomUUID().slice(0, 8)}`;
  const existing = db.prepare('SELECT id FROM article_categories WHERE id = ?').get(id);
  if (existing) {
    db.prepare(
      'UPDATE article_categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?'
    ).run(payload.name.trim(), payload.slug.trim(), payload.description?.trim() || null, payload.sortOrder ?? 0, id);
  } else {
    db.prepare(
      'INSERT INTO article_categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(id, payload.name.trim(), payload.slug.trim(), payload.description?.trim() || null, payload.sortOrder ?? 0);
  }
  const row = db.prepare('SELECT * FROM article_categories WHERE id = ?').get(id) as Record<string, unknown>;
  return mapCategoryRow(row);
}

export function adminDeleteCategory(id: string): void {
  db.prepare('DELETE FROM article_categories WHERE id = ?').run(id);
}

export function adminCreateArticle(payload: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  categoryId?: string;
  authorName: string;
  status: ArticleItem['status'];
  showOnHome: boolean;
  seoTitle?: string;
  seoDescription?: string;
}): ArticleItem {
  const id = `art-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const safeSlug = `${payload.slug.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff-]+/g, '-')}`;
  db.prepare(
    `INSERT INTO articles (id, title, slug, excerpt, content, cover_image_url, category_id, author_name, status, show_on_home, seo_title, seo_description, views_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id,
    payload.title.trim(),
    safeSlug || id,
    payload.excerpt.trim(),
    payload.content.trim(),
    payload.coverImageUrl?.trim() || null,
    payload.categoryId || null,
    payload.authorName.trim(),
    payload.status,
    payload.showOnHome ? 1 : 0,
    payload.seoTitle?.trim() || null,
    payload.seoDescription?.trim() || null,
    ts,
    ts
  );
  const row = db
    .prepare(
      'SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN article_categories c ON c.id = a.category_id WHERE a.id = ?'
    )
    .get(id) as Record<string, unknown>;
  return mapArticleRow(row);
}

export function adminUpdateArticle(id: string, payload: Partial<ArticleItem>): ArticleItem | null {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;
  const ts = nowIso();
  db.prepare(
    `UPDATE articles
     SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image_url = ?, category_id = ?, author_name = ?, status = ?, show_on_home = ?, seo_title = ?, seo_description = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    payload.title?.trim() ?? String(existing.title),
    payload.slug?.trim() ?? String(existing.slug),
    payload.excerpt?.trim() ?? String(existing.excerpt),
    payload.content?.trim() ?? String(existing.content),
    payload.coverImageUrl !== undefined
      ? payload.coverImageUrl || null
      : existing.cover_image_url
        ? String(existing.cover_image_url)
        : null,
    payload.categoryId !== undefined
      ? payload.categoryId || null
      : existing.category_id
        ? String(existing.category_id)
        : null,
    payload.authorName?.trim() ?? String(existing.author_name),
    payload.status ?? String(existing.status),
    payload.showOnHome !== undefined ? (payload.showOnHome ? 1 : 0) : Number(existing.show_on_home),
    payload.seoTitle !== undefined
      ? payload.seoTitle || null
      : existing.seo_title
        ? String(existing.seo_title)
        : null,
    payload.seoDescription !== undefined
      ? payload.seoDescription || null
      : existing.seo_description
        ? String(existing.seo_description)
        : null,
    ts,
    id
  );
  const row = db
    .prepare(
      'SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN article_categories c ON c.id = a.category_id WHERE a.id = ?'
    )
    .get(id) as Record<string, unknown>;
  return mapArticleRow(row);
}

export function adminDeleteArticle(id: string): void {
  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
}

export function adminListAdSlots(): AdSlot[] {
  return (db.prepare('SELECT * FROM ad_slots ORDER BY updated_at DESC').all() as Array<Record<string, unknown>>).map(
    mapAdRow
  );
}

export function adminUpsertAdSlot(
  payload: Omit<AdSlot, 'id' | 'impressionsCount' | 'clicksCount' | 'updatedAt'> & { id?: string }
): AdSlot {
  const id = payload.id || `ad-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const existing = db.prepare('SELECT id FROM ad_slots WHERE id = ?').get(id);
  if (existing) {
    db.prepare(
      `UPDATE ad_slots
       SET name = ?, placement = ?, ad_type = ?, adsense_client = ?, adsense_slot = ?, adsense_format = ?, direct_title = ?, direct_description = ?, direct_image_url = ?, direct_link_url = ?, is_active = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      payload.name.trim(),
      payload.placement,
      payload.adType,
      payload.adsenseClient?.trim() || null,
      payload.adsenseSlot?.trim() || null,
      payload.adsenseFormat?.trim() || 'auto',
      payload.directTitle?.trim() || null,
      payload.directDescription?.trim() || null,
      payload.directImageUrl?.trim() || null,
      payload.directLinkUrl?.trim() || null,
      payload.isActive ? 1 : 0,
      ts,
      id
    );
  } else {
    db.prepare(
      `INSERT INTO ad_slots (id, name, placement, ad_type, adsense_client, adsense_slot, adsense_format, direct_title, direct_description, direct_image_url, direct_link_url, is_active, impressions_count, clicks_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
    ).run(
      id,
      payload.name.trim(),
      payload.placement,
      payload.adType,
      payload.adsenseClient?.trim() || null,
      payload.adsenseSlot?.trim() || null,
      payload.adsenseFormat?.trim() || 'auto',
      payload.directTitle?.trim() || null,
      payload.directDescription?.trim() || null,
      payload.directImageUrl?.trim() || null,
      payload.directLinkUrl?.trim() || null,
      payload.isActive ? 1 : 0,
      ts
    );
  }
  const row = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(id) as Record<string, unknown>;
  return mapAdRow(row);
}

export function adminDeleteAdSlot(id: string): void {
  db.prepare('DELETE FROM ad_slots WHERE id = ?').run(id);
}

export function adminListAffiliates(): AffiliateProduct[] {
  return (
    db.prepare('SELECT * FROM affiliate_products ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  ).map(mapAffiliateRow);
}

export function adminUpsertAffiliate(
  payload: Omit<AffiliateProduct, 'id' | 'clicksCount' | 'createdAt' | 'slug'> & { id?: string; slug?: string }
): AffiliateProduct {
  const id = payload.id || `aff-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  const slug =
    payload.slug?.trim() ||
    `${payload.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')}-${id.slice(-4)}`;
  const existing = db.prepare('SELECT id FROM affiliate_products WHERE id = ?').get(id);
  if (existing) {
    db.prepare(
      `UPDATE affiliate_products
       SET title = ?, category = ?, description = ?, price_egp = ?, old_price_egp = ?, image_url = ?, affiliate_url = ?, network_label = ?, commission_rate_pct = ?, is_featured = ?, is_active = ?
       WHERE id = ?`
    ).run(
      payload.title.trim(),
      payload.category.trim(),
      payload.description.trim(),
      payload.priceEgp,
      payload.oldPriceEgp ?? null,
      payload.imageUrl?.trim() || null,
      payload.affiliateUrl.trim(),
      payload.networkLabel.trim(),
      payload.commissionRatePct,
      payload.isFeatured ? 1 : 0,
      payload.isActive ? 1 : 0,
      id
    );
  } else {
    db.prepare(
      `INSERT INTO affiliate_products (id, title, slug, category, description, price_egp, old_price_egp, image_url, affiliate_url, network_label, commission_rate_pct, is_featured, is_active, clicks_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      id,
      payload.title.trim(),
      slug,
      payload.category.trim(),
      payload.description.trim(),
      payload.priceEgp,
      payload.oldPriceEgp ?? null,
      payload.imageUrl?.trim() || null,
      payload.affiliateUrl.trim(),
      payload.networkLabel.trim(),
      payload.commissionRatePct,
      payload.isFeatured ? 1 : 0,
      payload.isActive ? 1 : 0,
      ts
    );
  }
  const row = db.prepare('SELECT * FROM affiliate_products WHERE id = ?').get(id) as Record<string, unknown>;
  return mapAffiliateRow(row);
}

export function adminDeleteAffiliate(id: string): void {
  db.prepare('DELETE FROM affiliate_products WHERE id = ?').run(id);
}

export function adminListPlans(): SubscriptionPlan[] {
  return (
    db.prepare('SELECT * FROM subscription_plans ORDER BY sort_order ASC').all() as Array<Record<string, unknown>>
  ).map(mapPlanRow);
}

export function adminUpsertPlan(
  payload: Omit<SubscriptionPlan, 'id' | 'subscriberCount' | 'slug'> & { id?: string; slug?: string }
): SubscriptionPlan {
  const id = payload.id || `plan-${crypto.randomUUID().slice(0, 8)}`;
  const existing = db.prepare('SELECT id FROM subscription_plans WHERE id = ?').get(id);
  const featuresJson = JSON.stringify(payload.features || []);
  if (existing) {
    db.prepare(
      `UPDATE subscription_plans
       SET name = ?, target_role = ?, price_monthly_egp = ?, price_yearly_egp = ?, billing_enabled = ?, is_active = ?, features_json = ?, sort_order = ?
       WHERE id = ?`
    ).run(
      payload.name.trim(),
      payload.targetRole,
      payload.priceMonthlyEgp,
      payload.priceYearlyEgp,
      payload.billingEnabled ? 1 : 0,
      payload.isActive ? 1 : 0,
      featuresJson,
      payload.sortOrder ?? 0,
      id
    );
  } else {
    const slug = payload.slug?.trim() || `plan-${id.slice(-6)}`;
    db.prepare(
      `INSERT INTO subscription_plans (id, name, slug, target_role, price_monthly_egp, price_yearly_egp, billing_enabled, is_active, features_json, subscriber_count, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      id,
      payload.name.trim(),
      slug,
      payload.targetRole,
      payload.priceMonthlyEgp,
      payload.priceYearlyEgp,
      payload.billingEnabled ? 1 : 0,
      payload.isActive ? 1 : 0,
      featuresJson,
      payload.sortOrder ?? 10
    );
  }
  const row = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(id) as Record<string, unknown>;
  return mapPlanRow(row);
}

export function adminDeletePlan(id: string): void {
  db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(id);
}

export function adminListMessages(): ContactMessage[] {
  return (
    db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  ).map(mapMessageRow);
}

export function adminUpdateMessage(
  id: string,
  status: ContactMessage['status'],
  adminNote?: string
): ContactMessage | null {
  const existing = db.prepare('SELECT id FROM contact_messages WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('UPDATE contact_messages SET status = ?, admin_note = ? WHERE id = ?').run(
    status,
    adminNote?.trim() || null,
    id
  );
  const row = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id) as Record<string, unknown>;
  return mapMessageRow(row);
}

export function adminDeleteMessage(id: string): void {
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
}

export function adminListRevenue(): RevenueEntry[] {
  return (
    db.prepare('SELECT * FROM revenue_entries ORDER BY entry_date DESC, created_at DESC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapRevenueRow);
}

export function adminAddRevenue(payload: {
  sourceType: RevenueEntry['sourceType'];
  description: string;
  amountEgp: number;
  entryDate: string;
}): RevenueEntry {
  const id = `REV-${crypto.randomUUID().slice(0, 8)}`;
  const ts = nowIso();
  db.prepare(
    'INSERT INTO revenue_entries (id, source_type, description, amount_egp, entry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, payload.sourceType, payload.description.trim(), payload.amountEgp, payload.entryDate, ts);
  const row = db.prepare('SELECT * FROM revenue_entries WHERE id = ?').get(id) as Record<string, unknown>;
  return mapRevenueRow(row);
}

export function adminDeleteRevenue(id: string): void {
  db.prepare('DELETE FROM revenue_entries WHERE id = ?').run(id);
}

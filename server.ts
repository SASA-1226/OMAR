import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import {
  adminAddRevenue,
  adminCreateArticle,
  adminDeleteAdSlot,
  adminDeleteAffiliate,
  adminDeleteArticle,
  adminDeleteCategory,
  adminDeleteMessage,
  adminDeletePlan,
  adminDeleteRevenue,
  adminListAdSlots,
  adminListAffiliates,
  adminListArticles,
  adminListMessages,
  adminListPlans,
  adminListRevenue,
  adminUpdateArticle,
  adminUpdateMessage,
  adminUpdatePageConfig,
  adminUpsertAdSlot,
  adminUpsertAffiliate,
  adminUpsertCategory,
  adminUpsertPlan,
  changeAdminPassword,
  createContactMessage,
  getAdminAuthStatus,
  getAdminOverviewStats,
  getPublicBootstrap,
  getPublishedArticleBySlug,
  getSiteSettings,
  loginAdmin,
  logoutAdminSession,
  recordVisit,
  setupInitialAdmin,
  trackAdEvent,
  trackAffiliateClick,
  updateSiteSettings,
  verifyAdminSessionToken,
} from './server/db.ts';
import {
  PAID_SERVICES_CATALOG,
  PERSISTENT_SESSION_DAYS,
  changeAppUserPassword,
  dbAddDevice,
  dbAddDeviceEvent,
  dbAddMaintenanceReminder,
  dbAddSparePartObservation,
  dbAddWarranty,
  dbAdminToggleB2BPartner,
  dbAdminToggleTechVerification,
  dbAdminUpdatePlatformSettings,
  dbAdminUpdateReportStatus,
  dbAdminUpdateUserRole,
  dbAdminUpdateUserStatus,
  dbApproveRepairRecord,
  dbBuyerAcceptTransfer,
  dbCancelOrDisputeTransfer,
  dbCancelUserSubscription,
  dbCancelWarranty,
  dbClearDeviceLost,
  dbClearNotifications,
  dbCompleteMaintenanceReminder,
  dbCreateDeviceInspection,
  dbCreateListing,
  dbCreateRepairCorrectionRecord,
  dbCreateRepairRecord,
  dbCreateRepairRequest,
  dbDeleteMaintenanceReminder,
  dbDeleteOrArchiveDevice,
  dbDeleteUserAccount,
  dbInitiateTransfer,
  dbMarkAllNotificationsRead,
  dbMarkNotificationRead,
  dbOwnerConfirmTransfer,
  dbPurchasePaidService,
  dbRecordPublicScan,
  dbRegisterB2BPartner,
  dbRejectRepairRecord,
  dbReportDeviceLost,
  dbReportReview,
  dbRotateDeviceToken,
  dbSendMessage,
  dbStartOrGetConversation,
  dbSubmitReport,
  dbSubmitTechnicianReview,
  dbSubscribeToPlan,
  dbUpdateDeviceCondition,
  dbUpdateDevicePrivateData,
  dbUpdateDeviceVisibility,
  dbUpdateListingStatus,
  dbUpdateNotificationPrefs,
  dbUpdateRepairRequestStatus,
  dbUpdateTechnicianProfile,
  dbUpdateUserProfile,
  getAppWorkspaceState,
  listUserSessions,
  loginAppUser,
  lookupPublicDeviceByIdentifier,
  registerAppUser,
  revokeAllUserSessions,
  revokeUserSession,
  revokeUserSessionByPrefix,
  verifyUserSessionWithMeta,
} from './server/appDb.ts';
import {
  adminDeleteCatalogService,
  adminDeletePromoCode,
  adminListAllEntitlements,
  adminListPaymentRequests,
  adminListPromoCodes,
  adminListUsersSummary,
  adminManageUserEntitlement,
  adminReviewPaymentRequest,
  adminUpdatePaymentMethod,
  adminUpsertCatalogService,
  adminUpsertPromoCode,
  getAdminRevenueAnalytics,
  listCatalogServices,
  listPaymentMethods,
  listUserEntitlements,
  listUserPaymentRequests,
  resubmitPaymentProof,
  submitPaymentProofRequest,
  validatePromoCodeForPrice,
} from './server/monetizationDb.ts';
import type { PaymentRequestStatus, UserProfile } from './src/types/omor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_TEXT = 'gemini-4-hydrogen';

function isSafeLinkUrl(raw?: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  const val = raw.trim();
  if (val.startsWith('/')) return !val.startsWith('//');
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeImageUrl(raw?: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  const val = raw.trim();
  if (val.startsWith('/')) return !val.startsWith('//');
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(val)) {
    return val.length <= 3_500_000;
  }
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractBearerToken(req: express.Request): string {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

const USER_SESSION_COOKIE = 'omor_user_session';

function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try {
        result[k] = decodeURIComponent(v);
      } catch {
        result[k] = v;
      }
    }
  }
  return result;
}

function isHttpsRequest(req: express.Request): boolean {
  const fwdProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || fwdProto === 'https';
}

function setUserSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string,
  rememberMe = true
): void {
  const secure = isHttpsRequest(req);
  const parts = [`${USER_SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly'];
  if (rememberMe) {
    const maxAgeSec = PERSISTENT_SESSION_DAYS * 24 * 60 * 60;
    const expiresUtc = new Date(Date.now() + maxAgeSec * 1000).toUTCString();
    parts.push(`Max-Age=${maxAgeSec}`, `Expires=${expiresUtc}`);
  }
  parts.push(secure ? 'SameSite=None' : 'SameSite=Lax');
  if (secure) {
    parts.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearUserSessionCookie(req: express.Request, res: express.Response): void {
  const secure = isHttpsRequest(req);
  const parts = [
    `${USER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    secure ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (secure) {
    parts.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractUserToken(req: express.Request): string {
  const bearer = extractBearerToken(req);
  if (bearer) return bearer;
  const cookies = parseCookies(req);
  return cookies[USER_SESSION_COOKIE] || '';
}

function isTrustedMutationRequest(req: express.Request): boolean {
  const hasBearer = Boolean(extractBearerToken(req));
  if (hasBearer) return true;
  if (String(req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest') {
    return true;
  }
  const origin = String(req.headers.origin || '');
  const host = String(req.headers.host || '');
  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403') || raw.includes('400')) {
    return {
      status: 502,
      message: 'تعذر التحقق من مفتاح Gemini API في إعدادات التشغيل (Settings > Secrets).',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي. يرجى المحاولة بعد قليل.',
    };
  }
  return {
    status: 502,
    message: 'تعذر الاتصال بخدمة الذكاء الاصطناعي حاليًا. حاول مرة أخرى بعد لحظات.',
  };
}

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().trim().min(1).max(2000),
      })
    )
    .max(16)
    .optional(),
  userRole: z.enum(['user', 'technician', 'store', 'admin', 'guest']).optional(),
  currentPath: z.string().max(200).optional(),
  platformSnapshot: z
    .object({
      devicesCount: z.number().int().nonnegative().optional(),
      repairsCount: z.number().int().nonnegative().optional(),
      listingsCount: z.number().int().nonnegative().optional(),
      partnersCount: z.number().int().nonnegative().optional(),
      isDemoMode: z.boolean().optional(),
    })
    .optional(),
});

const diagnoseRequestSchema = z.object({
  category: z.string().trim().min(1).max(60),
  brand: z.string().trim().min(1).max(80),
  deviceName: z.string().trim().min(1).max(120),
  model: z.string().trim().max(120).optional(),
  symptoms: z.string().trim().min(5).max(2000),
  deviceAgeMonths: z.number().int().min(0).max(240).optional(),
  previousRepairsSummary: z.string().max(1000).optional(),
  imageBase64: z.string().max(4_000_000).optional(),
  imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
});

const intelligenceRequestSchema = z.object({
  mode: z.enum(['valuation', 'history', 'risk_report']),
  deviceSummary: z.object({
    brand: z.string().max(80),
    deviceName: z.string().max(120),
    model: z.string().max(120),
    category: z.string().max(60),
    condition: z.string().max(40),
    verificationTier: z.string().max(50),
    purchaseDate: z.string().max(40).optional(),
    repairsCount: z.number().int().nonnegative(),
    approvedRepairsCount: z.number().int().nonnegative(),
    partsSummary: z.array(z.string().max(120)).max(20),
    activeWarrantiesCount: z.number().int().nonnegative(),
    transfersCount: z.number().int().nonnegative(),
    reportsCount: z.number().int().nonnegative(),
    askingPriceEgp: z.number().nonnegative().optional(),
    estimatedMinEgp: z.number().nonnegative().optional(),
    estimatedFairEgp: z.number().nonnegative().optional(),
    estimatedMaxEgp: z.number().nonnegative().optional(),
    healthScore: z.number().min(0).max(100).optional(),
    riskScore: z.number().min(0).max(100).optional(),
  }),
});

const contactRequestSchema = z.object({
  senderName: z.string().trim().min(2, 'يرجى كتابة الاسم').max(120),
  senderEmail: z.string().trim().email('البريد الإلكتروني غير صالح').max(160),
  senderPhone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(3, 'يرجى كتابة عنوان الرسالة').max(160),
  message: z.string().trim().min(10, 'يرجى كتابة تفاصيل الرسالة (10 أحرف على الأقل)').max(3000),
  website: z.string().max(100).optional(), // honeypot field
});

const adminSetupSchema = z.object({
  email: z.string().trim().email('أدخل بريدًا إلكترونيًا صحيحًا').max(160),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل').max(128),
});

const adminLoginSchema = z.object({
  email: z.string().trim().max(160).default('admin@sasastore.app'),
  password: z.string().min(1, 'أدخل كلمة المرور').max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة 8 أحرف على الأقل').max(128),
});

const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  siteBrandPrefix: z.string().trim().min(1).max(80),
  slogan: z.string().trim().min(1).max(240),
  logoUrl: z.string().max(3_500_000).optional(),
  contactPhone: z.string().trim().max(40),
  contactEmail: z.string().trim().email().max(160),
  supportWhatsapp: z.string().trim().max(40),
  customDomain: z.string().trim().max(240).optional(),
  seoDefaultTitle: z.string().trim().min(1).max(200),
  seoDefaultDescription: z.string().trim().min(1).max(400),
  googleSearchConsoleToken: z.string().trim().max(200).optional(),
  googleAdsenseClient: z.string().trim().max(80).optional(),
  adsenseEnabled: z.boolean(),
  paidPlansEnabled: z.boolean(),
  sectionFlags: z.object({
    articles: z.boolean(),
    offers: z.boolean(),
    market: z.boolean(),
    technicians: z.boolean(),
    v3Tools: z.boolean(),
    ads: z.boolean(),
  }),
});

const pageUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  metaTitle: z.string().trim().min(1).max(200),
  metaDescription: z.string().trim().min(1).max(400),
  heroHeading: z.string().trim().min(1).max(240),
  heroBody: z.string().trim().min(1).max(2000),
  isEnabled: z.boolean(),
});

const categorySchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const articleSchema = z.object({
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().min(2).max(220),
  excerpt: z.string().trim().min(5).max(500),
  content: z.string().trim().min(10).max(50000),
  coverImageUrl: z.string().max(3_500_000).optional(),
  categoryId: z.string().max(80).optional(),
  authorName: z.string().trim().min(2).max(120),
  status: z.enum(['draft', 'published', 'hidden']),
  showOnHome: z.boolean(),
  seoTitle: z.string().trim().max(220).optional(),
  seoDescription: z.string().trim().max(400).optional(),
});

const adSlotSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(120),
  placement: z.enum([
    'header_top',
    'home_mid',
    'article_top',
    'article_bottom',
    'offers_top',
    'footer_banner',
    'sidebar',
  ]),
  adType: z.enum(['adsense', 'direct']),
  adsenseClient: z.string().trim().max(80).optional(),
  adsenseSlot: z.string().trim().max(60).optional(),
  adsenseFormat: z.string().trim().max(40).optional(),
  directTitle: z.string().trim().max(200).optional(),
  directDescription: z.string().trim().max(400).optional(),
  directImageUrl: z.string().max(3_500_000).optional(),
  directLinkUrl: z.string().max(500).optional(),
  isActive: z.boolean(),
});

const affiliateSchema = z.object({
  id: z.string().max(80).optional(),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(200).optional(),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(1000),
  priceEgp: z.number().nonnegative().max(10_000_000),
  oldPriceEgp: z.number().nonnegative().max(10_000_000).optional(),
  imageUrl: z.string().max(3_500_000).optional(),
  affiliateUrl: z.string().trim().min(1).max(600),
  networkLabel: z.string().trim().min(1).max(100),
  commissionRatePct: z.number().min(0).max(100),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

const planSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(120).optional(),
  targetRole: z.enum(['user', 'technician', 'store', 'enterprise']),
  priceMonthlyEgp: z.number().nonnegative().max(1_000_000),
  priceYearlyEgp: z.number().nonnegative().max(10_000_000),
  billingEnabled: z.boolean(),
  isActive: z.boolean(),
  features: z.array(z.string().trim().min(1).max(200)).max(25),
  sortOrder: z.number().int().min(0).max(999),
});

const messageUpdateSchema = z.object({
  status: z.enum(['new', 'read', 'replied', 'archived']),
  adminNote: z.string().trim().max(1000).optional(),
});

const revenueSchema = z.object({
  sourceType: z.enum(['adsense', 'affiliate', 'subscription', 'direct_ad']),
  description: z.string().trim().min(2).max(240),
  amountEgp: z.number().nonnegative().max(100_000_000),
  entryDate: z.string().trim().min(8).max(30),
});

const PLATFORM_SYSTEM_INSTRUCTION = `أنت المساعد الذكي الرسمي لمنصة "صاصا ستور — عُمْر | SASA STORE OMOR" (الإصدار الثالث OMOR V3).
شعار المنصة: "كل جهاز له حكاية.. وكل حكاية لها سجل."
مهمتك مساعدة العملاء، الفنيين، المتاجر، والإدارة في فهم كل تفاصيل المنصة وتشغيلها بوضوح واحترافية وباللغة العربية الواضحة.

معلومات المنصة الدقيقة التي تعتمد عليها:
1. الهوية الرقمية للأجهزة (/devices و /devices/new):
   - يُنشئ المستخدم سجلًا للجهاز برقم داخلي غير متكرر (OMR-YYYY-XXXXXX) ورمز QR عام آمن (/d/:publicToken).
   - الخصوصية الصارمة: IMEI، الرقم التسلسلي الكامل، وفواتير الشراء تبقى في الخزينة الخاصة ولا تظهر في QR العام إلا حسب تحكم المالك (إظهار الصيانة، الضمان، الحالة، أو رقم تسلسلي مقنّع).
2. الصيانة وتوثيق الفنيين (/repairs و /repairs/request و /technicians):
   - يرسل المالك طلب صيانة أو يسجل الفني تفاصيل العطل، التشخيص، القطع المستبدلة (أصلية جديدة/مستعملة/غير معروفة)، التكلفة، وصور قبل/بعد ومدة الضمان.
   - قاعدة عدم التلاعب: السجل الموثق لا يُنشر للعامة إلا بعد موافقة المالك، وبعد الموافقة لا يُعدل السجل الأصلي بل يُنشأ "سجل تصحيح" واضح ومرتبط بالسجل الأصلي.
3. الضمانات (/warranties):
   - متابعة الضمانات السارية، المنتهية، والتي تقترب من الانتهاء (خلال 30 يومًا) سواء من المالك أو من مركز صيانة/متجر موثق.
4. السوق الموثق OMOR MARKET (/market):
   - عرض وشراء الأجهزة المستعملة والمجددة اعتمادًا على هويتها الرقمية وسجلها الموثق وربط المعاينة بتقرير مخاطر الشراء (V3). لا توجد بوابات دفع إلكتروني داخل المنصة.
5. نقل الملكية (/transfer):
   - يتم برمز مؤقت لمرة واحدة صالح لـ 15 دقيقة وموافقة الطرفين دون كشف بيانات المالك السابق الخاصة.
6. مميزات الإصدار الثالث OMOR V3 (/v3):
   - تشخيص أولي للأعطال بالذكاء الاصطناعي (مساعد تشخيص مع إمكانية إرفاق صورة).
   - تقدير سعر الجهاز في السوق المصري (بالجنيه المصري) بناءً على الحالة، العمر، مستوى التوثيق، الصيانات، وإعلانات السوق.
   - تحليل تاريخ الجهاز ومؤشر صحته وموثوقيته (0-100).
   - تقارير مخاطر شراء الأجهزة المستعملة (قبل الشراء، فحص الشفافية، البلاغات، مقارنة السعر، وقائمة فحص المعاينة).
   - نظام إحصائيات أسعار قطع الغيار (أدنى/متوسط/أعلى سعر وضمان) مع إمكانية إضافة ملاحظات أسعار من الفنيين والمتاجر.
   - ربط الشركات ومراكز الصيانة (شبكة شركاء B2B، الفروع، سياسات الضمان، وجاهزية التكامل عبر Webhook).
7. الصفحات العامة والمحتوى والخدمات المدفوعة:
   - المقالات والأدلة التقنية (/articles)، العروض والمنتجات المقترحة (/offers)، دليل المنصة ومطورها مصطفى محمد (/platform-guide)، من نحن (/about)، تواصل معنا (/contact)، سياسة الكوكيز (/cookies).
   - مركز الخدمات المدفوعة OMOR Premium (/services) وسجل مدفوعاتي واشتراكاتي (/my-payments): باقات اختيارية للأفراد والفنيين والتجار وتقارير التوثيق؛ يتم الدفع عبر محفظة أورنج كاش (01214899889) برفع إثبات التحويل للمراجعة اليدوية من الإدارة ولا تُفعَّل الخدمة تلقائيًا إلا بعد تأكيد الإدارة.
8. الدعم الفني والمظهر:
   - رقم الدعم الفني المباشر (واتساب ومكالمات وأورنج كاش): 01214899889.
   - يوجد مفتاح تبديل الوضع الليلي والنهاري في الشريط العلوي وفي صفحة الإعدادات (/settings) ويُحفظ محليًا.

قواعد أسلوبك:
- أجب دائمًا بالعربية المباشرة والمنظمة بنقاط واضحة وخطوات عملية.
- وجّه العميل أو الفني مباشرة إلى اسم الصفحة أو المسار الصحيح داخل المنصة عند الإجابة.
- لا تخترع أرقامًا أو وعود ضمان قانونية، ووضّح أن التشخيص أو التقدير السعري استرشادي يعتمد على الفحص والبيانات المسجلة.`;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '6mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const requireAdmin: express.RequestHandler = (req, res, next) => {
    const token = extractBearerToken(req);
    const session = verifyAdminSessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'جلسة الإدارة غير صالحة أو منتهية. يرجى تسجيل الدخول.' });
    }
    (req as express.Request & { adminEmail?: string }).adminEmail = session.email;
    return next();
  };

  const requireAppUser: express.RequestHandler = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !isTrustedMutationRequest(req)) {
      return res.status(403).json({ error: 'طلب غير موثق المصدر (CSRF Protection).' });
    }
    const token = extractUserToken(req);
    const verified = verifyUserSessionWithMeta(token);
    if (!verified) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً لتنفيذ هذا الإجراء.' });
    }
    if (verified.shouldRefreshCookie) {
      setUserSessionCookie(req, res, token, verified.rememberMe);
    }
    (req as express.Request & { appUser?: UserProfile; appToken?: string }).appUser = verified.user;
    (req as express.Request & { appUser?: UserProfile; appToken?: string }).appToken = token;
    return next();
  };

  const requireAnyAdmin: express.RequestHandler = (req, res, next) => {
    const bearer = extractBearerToken(req);
    const cmsSession = verifyAdminSessionToken(bearer);
    if (cmsSession) {
      (req as express.Request & { adminActor?: { id: string; name: string } }).adminActor = {
        id: 'CMS-ADMIN',
        name: cmsSession.email,
      };
      return next();
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !isTrustedMutationRequest(req)) {
      return res.status(403).json({ error: 'طلب غير موثق المصدر (CSRF Protection).' });
    }

    const token = extractUserToken(req);
    const verified = verifyUserSessionWithMeta(token);
    if (verified && verified.user.role === 'admin') {
      (req as express.Request & { adminActor?: { id: string; name: string } }).adminActor = {
        id: verified.user.id,
        name: verified.user.fullName,
      };
      return next();
    }

    return res.status(401).json({ error: 'غير مصرح. هذه العملية متاحة لمدير المنصة فقط.' });
  };

  // --- SEO Crawl Endpoints: robots.txt & dynamic sitemap.xml ---
  app.get('/robots.txt', (req, res) => {
    const settings = getSiteSettings();
    const baseUrl =
      settings.customDomain?.trim() ||
      process.env.APP_URL?.trim() ||
      `${req.protocol}://${req.get('host')}`;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin-portal',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${cleanBase}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const bootstrap = getPublicBootstrap();
    const baseUrl =
      bootstrap.settings.customDomain?.trim() ||
      process.env.APP_URL?.trim() ||
      `${req.protocol}://${req.get('host')}`;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const today = new Date().toISOString().split('T')[0];

    const staticPaths = [
      { path: '/welcome', priority: '1.0', changefreq: 'daily' },
      { path: '/articles', priority: '0.9', changefreq: 'daily' },
      { path: '/offers', priority: '0.9', changefreq: 'daily' },
      { path: '/market', priority: '0.8', changefreq: 'daily' },
      { path: '/technicians', priority: '0.8', changefreq: 'weekly' },
      { path: '/services', priority: '0.8', changefreq: 'weekly' },
      { path: '/platform-guide', priority: '0.75', changefreq: 'monthly' },
      { path: '/v3', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/help', priority: '0.6', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
      { path: '/terms', priority: '0.5', changefreq: 'yearly' },
      { path: '/cookies', priority: '0.5', changefreq: 'yearly' },
    ];

    const urlEntries = [
      ...staticPaths.map(
        (u) => `  <url>
    <loc>${escapeXml(`${cleanBase}${u.path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      ),
      ...bootstrap.articles.map(
        (art) => `  <url>
    <loc>${escapeXml(`${cleanBase}/articles/${encodeURIComponent(art.slug)}`)}</loc>
    <lastmod>${escapeXml((art.updatedAt || today).slice(0, 10))}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  app.get('/api/health', (_req, res) => {
    const ai = getGeminiClient();
    res.json({
      ok: true,
      version: 'OMOR V3',
      aiConfigured: Boolean(ai),
    });
  });

  // --- Public CMS, Ads, Affiliates, Tracking & Contact APIs ---
  app.get('/api/public/bootstrap', (_req, res) => {
    res.json(getPublicBootstrap());
  });

  app.get('/api/public/articles/:slug', (req, res) => {
    const slug = decodeURIComponent(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'معرف المقال مطلوب.' });
    }
    const article = getPublishedArticleBySlug(slug);
    if (!article) {
      return res.status(404).json({ error: 'المقال غير موجود أو غير منشور.' });
    }
    return res.json({ article });
  });

  app.post('/api/public/track/visit', (req, res) => {
    const visitPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '/';
    if (!visitPath.startsWith('/') || visitPath.startsWith('/admin-portal') || visitPath.startsWith('/api')) {
      return res.json({ ok: true, skipped: true });
    }
    const clientVisitor = typeof req.body?.visitorId === 'string' ? req.body.visitorId : '';
    const rawFingerprint = `${getClientIp(req)}|${req.headers['user-agent'] || ''}|${clientVisitor}`;
    const visitorHash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').slice(0, 32);
    const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer : '';
    recordVisit(visitPath, visitorHash, referrer);
    return res.json({ ok: true });
  });

  app.post('/api/public/track/ad', (req, res) => {
    const slotId = typeof req.body?.slotId === 'string' ? req.body.slotId.trim() : '';
    const event = req.body?.event === 'click' ? 'click' : req.body?.event === 'impression' ? 'impression' : null;
    if (!slotId || !event) {
      return res.status(400).json({ error: 'بيانات تتبع الإعلان غير صالحة.' });
    }
    const tracked = trackAdEvent(slotId, event);
    return res.json({ ok: tracked });
  });

  app.post('/api/public/track/affiliate/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'معرف المنتج غير صالح.' });
    }
    const result = trackAffiliateClick(id);
    if (!result || !isSafeLinkUrl(result.affiliateUrl)) {
      return res.status(404).json({ error: 'المنتج غير متاح أو الرابط غير صالح.' });
    }
    return res.json({ ok: true, affiliateUrl: result.affiliateUrl });
  });

  app.post('/api/public/contact', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`contact:${ip}`, 6, 10 * 60 * 1000)) {
      return res.status(429).json({
        error: 'تم إرسال عدد كبير من الرسائل خلال وقت قصير. يرجى الانتظار بضع دقائق.',
      });
    }
    const parsed = contactRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'يرجى التحقق من جميع الحقول المطلوبة.',
      });
    }
    // Silent honeypot drop for bots
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return res.status(201).json({ ok: true });
    }
    const created = createContactMessage({
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail,
      senderPhone: parsed.data.senderPhone,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    return res.status(201).json({ ok: true, id: created.id });
  });

  // --- Admin Portal Authentication Routes ---
  app.get('/api/admin/auth/status', (req, res) => {
    const token = extractBearerToken(req);
    return res.json(getAdminAuthStatus(token));
  });

  app.post('/api/admin/auth/setup', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`admin_setup:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'محاولات متكررة كثيرة. انتظر قليلاً.' });
    }
    const parsed = adminSetupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'بيانات الإعداد غير صالحة.',
      });
    }
    const result = setupInitialAdmin(parsed.data.email, parsed.data.password);
    if (!result.ok || !result.token) {
      return res.status(400).json({ error: result.error || 'تعذر إتمام الإعداد الأولي.' });
    }
    return res.status(201).json({ ok: true, token: result.token, email: parsed.data.email.toLowerCase() });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`admin_login:${ip}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'تم تجاوز محاولات تسجيل الدخول. يرجى الانتظار 15 دقيقة.' });
    }
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'أدخل بيانات تسجيل الدخول بشكل صحيح.' });
    }
    const result = loginAdmin(parsed.data.email, parsed.data.password);
    if (!result.ok || !result.token) {
      return res.status(401).json({ error: result.error || 'بيانات الدخول غير صحيحة.' });
    }
    return res.json({ ok: true, token: result.token, email: parsed.data.email.toLowerCase() });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    logoutAdminSession(token);
    return res.json({ ok: true });
  });

  app.post('/api/admin/auth/change-password', requireAdmin, (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'كلمة المرور غير صالحة.' });
    }
    const adminEmail = (req as express.Request & { adminEmail?: string }).adminEmail || 'admin@sasastore.app';
    const result = changeAdminPassword(adminEmail, parsed.data.currentPassword, parsed.data.newPassword);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تغيير كلمة المرور.' });
    }
    return res.json({ ok: true });
  });

  // --- Admin Portal Protected Management Routes ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const bootstrap = getPublicBootstrap();
    return res.json({
      stats: getAdminOverviewStats(),
      settings: bootstrap.settings,
      pages: bootstrap.pages,
      categories: bootstrap.categories,
    });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const parsed = siteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'إعدادات الموقع غير مكتملة أو غير صالحة.' });
    }
    if (!isSafeImageUrl(parsed.data.logoUrl)) {
      return res.status(400).json({ error: 'رابط أو صورة الشعار غير صالحة.' });
    }
    if (parsed.data.customDomain && !isSafeLinkUrl(parsed.data.customDomain)) {
      return res.status(400).json({ error: 'رابط الدومين المخصص يجب أن يبدأ بـ https://' });
    }
    const current = getSiteSettings();
    const updated = updateSiteSettings({
      ...current,
      ...parsed.data,
    });
    return res.json({ settings: updated });
  });

  app.put('/api/admin/pages/:slug', requireAdmin, (req, res) => {
    const parsed = pageUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الصفحة غير صالحة.' });
    }
    const updated = adminUpdatePageConfig(String(req.params.slug || ''), parsed.data);
    if (!updated) {
      return res.status(404).json({ error: 'الصفحة غير موجودة.' });
    }
    return res.json({ page: updated });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات التصنيف غير صالحة.' });
    }
    try {
      const category = adminUpsertCategory(parsed.data);
      return res.json({ category });
    } catch {
      return res.status(400).json({ error: 'تعذر حفظ التصنيف. تأكد من عدم تكرار الرابط المختصر (Slug).' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    adminDeleteCategory(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/articles', requireAdmin, (_req, res) => {
    return res.json({ articles: adminListArticles() });
  });

  app.post('/api/admin/articles', requireAdmin, (req, res) => {
    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'يرجى التأكد من عنوان المقال، الملخص، والمحتوى.' });
    }
    if (!isSafeImageUrl(parsed.data.coverImageUrl)) {
      return res.status(400).json({ error: 'رابط أو صورة الغلاف غير صالحة.' });
    }
    try {
      const article = adminCreateArticle(parsed.data);
      return res.status(201).json({ article });
    } catch {
      return res.status(400).json({ error: 'الرابط المختصر (Slug) مستخدم في مقال آخر، اختر رابطًا فريدًا.' });
    }
  });

  app.put('/api/admin/articles/:id', requireAdmin, (req, res) => {
    const parsed = articleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات تعديل المقال غير صالحة.' });
    }
    if (parsed.data.coverImageUrl !== undefined && !isSafeImageUrl(parsed.data.coverImageUrl)) {
      return res.status(400).json({ error: 'رابط أو صورة الغلاف غير صالحة.' });
    }
    try {
      const article = adminUpdateArticle(String(req.params.id || ''), parsed.data);
      if (!article) {
        return res.status(404).json({ error: 'المقال غير موجود.' });
      }
      return res.json({ article });
    } catch {
      return res.status(400).json({ error: 'الرابط المختصر (Slug) مستخدم في مقال آخر.' });
    }
  });

  app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
    adminDeleteArticle(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/ads', requireAdmin, (_req, res) => {
    return res.json({ adSlots: adminListAdSlots() });
  });

  app.post('/api/admin/ads', requireAdmin, (req, res) => {
    const parsed = adSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الوحدة الإعلانية غير صالحة.' });
    }
    if (!isSafeLinkUrl(parsed.data.directLinkUrl) || !isSafeImageUrl(parsed.data.directImageUrl)) {
      return res.status(400).json({ error: 'روابط الإعلان أو صورته غير صالحة أو غير آمنة.' });
    }
    const adSlot = adminUpsertAdSlot(parsed.data);
    return res.json({ adSlot });
  });

  app.put('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const parsed = adSlotSchema.safeParse({ ...req.body, id: String(req.params.id || '') });
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات تعديل الإعلان غير صالحة.' });
    }
    if (!isSafeLinkUrl(parsed.data.directLinkUrl) || !isSafeImageUrl(parsed.data.directImageUrl)) {
      return res.status(400).json({ error: 'روابط الإعلان أو صورته غير صالحة أو غير آمنة.' });
    }
    const adSlot = adminUpsertAdSlot(parsed.data);
    return res.json({ adSlot });
  });

  app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
    adminDeleteAdSlot(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/affiliates', requireAdmin, (_req, res) => {
    return res.json({ affiliates: adminListAffiliates() });
  });

  app.post('/api/admin/affiliates', requireAdmin, (req, res) => {
    const parsed = affiliateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات منتج الأفلييت غير مكتملة.' });
    }
    if (!isSafeLinkUrl(parsed.data.affiliateUrl) || !isSafeImageUrl(parsed.data.imageUrl)) {
      return res.status(400).json({ error: 'رابط الشراء أو الصورة غير صالح (يجب أن يبدأ بـ https:// أو /).' });
    }
    const affiliate = adminUpsertAffiliate(parsed.data);
    return res.json({ affiliate });
  });

  app.put('/api/admin/affiliates/:id', requireAdmin, (req, res) => {
    const parsed = affiliateSchema.safeParse({ ...req.body, id: String(req.params.id || '') });
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات تعديل منتج الأفلييت غير صالحة.' });
    }
    if (!isSafeLinkUrl(parsed.data.affiliateUrl) || !isSafeImageUrl(parsed.data.imageUrl)) {
      return res.status(400).json({ error: 'رابط الشراء أو الصورة غير صالح.' });
    }
    const affiliate = adminUpsertAffiliate(parsed.data);
    return res.json({ affiliate });
  });

  app.delete('/api/admin/affiliates/:id', requireAdmin, (req, res) => {
    adminDeleteAffiliate(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/plans', requireAdmin, (_req, res) => {
    return res.json({ plans: adminListPlans() });
  });

  app.post('/api/admin/plans', requireAdmin, (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات باقة الاشتراك غير صالحة.' });
    }
    const plan = adminUpsertPlan(parsed.data);
    return res.json({ plan });
  });

  app.put('/api/admin/plans/:id', requireAdmin, (req, res) => {
    const parsed = planSchema.safeParse({ ...req.body, id: String(req.params.id || '') });
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات تعديل الباقة غير صالحة.' });
    }
    const plan = adminUpsertPlan(parsed.data);
    return res.json({ plan });
  });

  app.delete('/api/admin/plans/:id', requireAdmin, (req, res) => {
    adminDeletePlan(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/messages', requireAdmin, (_req, res) => {
    return res.json({ messages: adminListMessages() });
  });

  app.put('/api/admin/messages/:id', requireAdmin, (req, res) => {
    const parsed = messageUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات تحديث الرسالة غير صالحة.' });
    }
    const updated = adminUpdateMessage(String(req.params.id || ''), parsed.data.status, parsed.data.adminNote);
    if (!updated) {
      return res.status(404).json({ error: 'الرسالة غير موجودة.' });
    }
    return res.json({ message: updated });
  });

  app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
    adminDeleteMessage(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.get('/api/admin/revenue', requireAdmin, (_req, res) => {
    return res.json({ entries: adminListRevenue() });
  });

  app.post('/api/admin/revenue', requireAdmin, (req, res) => {
    const parsed = revenueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الإيراد غير صالحة.' });
    }
    const entry = adminAddRevenue(parsed.data);
    return res.status(201).json({ entry });
  });

  app.delete('/api/admin/revenue/:id', requireAdmin, (req, res) => {
    adminDeleteRevenue(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  // --- App Authentication & Workspace Full-Stack APIs ---
  const authRegisterSchema = z.object({
    fullName: z.string().trim().min(2, 'الاسم يجب أن لا يقل عن حرفين').max(120),
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(160),
    password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(128),
    role: z.enum(['user', 'technician', 'store']),
    city: z.string().trim().min(2, 'يرجى تحديد المدينة').max(60),
    rememberMe: z.boolean().optional().default(true),
  });

  const authLoginSchema = z.object({
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(160),
    password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
    rememberMe: z.boolean().optional().default(true),
  });

  app.post('/api/auth/register', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`user_reg:${ip}`, 12, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'محاولات تسجيل كثيرة خلال وقت قصير. يرجى الانتظار قليلاً.' });
    }
    const parsed = authRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات التسجيل غير صالحة.' });
    }
    const result = registerAppUser({
      ...parsed.data,
      userAgent: String(req.headers['user-agent'] || ''),
    });
    if (!result.ok || !result.user || !result.token) {
      return res.status(400).json({ error: result.error || 'تعذر إنشاء الحساب.' });
    }
    setUserSessionCookie(req, res, result.token, result.rememberMe !== false);
    return res.status(201).json({ ok: true, user: result.user, token: result.token });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`user_login:${ip}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'محاولات تسجيل دخول متكررة. انتظر 15 دقيقة ثم أعد المحاولة.' });
    }
    const parsed = authLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'أدخل بريدًا إلكترونيًا وكلمة مرور صالحة.' });
    }
    const result = loginAppUser(parsed.data.email, parsed.data.password, {
      rememberMe: parsed.data.rememberMe,
      userAgent: String(req.headers['user-agent'] || ''),
    });
    if (!result.ok || !result.user || !result.token) {
      return res.status(401).json({ error: result.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }
    setUserSessionCookie(req, res, result.token, result.rememberMe !== false);
    return res.json({ ok: true, user: result.user, token: result.token });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (!isTrustedMutationRequest(req)) {
      return res.status(403).json({ error: 'طلب غير موثق المصدر (CSRF Protection).' });
    }
    const token = extractUserToken(req);
    revokeUserSession(token);
    clearUserSessionCookie(req, res);
    return res.json({ ok: true });
  });

  app.post('/api/auth/logout-all', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    revokeAllUserSessions(user.id);
    clearUserSessionCookie(req, res);
    return res.json({ ok: true });
  });

  app.get('/api/auth/sessions', requireAppUser, (req, res) => {
    const { appUser, appToken } = req as express.Request & { appUser: UserProfile; appToken: string };
    return res.json({ sessions: listUserSessions(appUser.id, appToken) });
  });

  app.delete('/api/auth/sessions/:prefix', requireAppUser, (req, res) => {
    const { appUser } = req as express.Request & { appUser: UserProfile };
    const prefix = String(req.params.prefix || '');
    const ok = revokeUserSessionByPrefix(appUser.id, prefix);
    if (!ok) return res.status(404).json({ error: 'الجلسة المطلوبة غير موجودة.' });
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractUserToken(req);
    const verified = verifyUserSessionWithMeta(token);
    if (verified?.shouldRefreshCookie) {
      setUserSessionCookie(req, res, token, verified.rememberMe);
    }
    return res.json({ user: verified?.user || null });
  });

  app.post('/api/auth/change-password', requireAppUser, (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'كلمة المرور الجديدة غير صالحة.' });
    }
    const { appUser, appToken } = req as express.Request & { appUser: UserProfile; appToken: string };
    const result = changeAppUserPassword(
      appUser.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      appToken
    );
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تغيير كلمة المرور.' });
    }
    return res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`forgot_pw:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'تم إرسال طلبات متكررة. حاول لاحقًا.' });
    }
    const parsed = z.object({ email: z.string().trim().email('أدخل بريدًا إلكترونيًا صحيحًا') }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'البريد غير صالح.' });
    }
    return res.json({
      ok: true,
      message: 'تم تسجيل طلب استعادة كلمة المرور بنجاح. إذا كان البريد مسجلاً لدينا، يرجى التواصل مع الدعم الرسمي 01214899889 أو إتمام التحقق.',
    });
  });

  app.get('/api/app/state', (req, res) => {
    const token = extractUserToken(req);
    const verified = verifyUserSessionWithMeta(token);
    if (verified?.shouldRefreshCookie) {
      setUserSessionCookie(req, res, token, verified.rememberMe);
    }
    return res.json(getAppWorkspaceState(verified?.user || null));
  });

  app.get('/api/app/lookup-device', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`dev_lookup:${ip}`, 40, 5 * 60 * 1000)) {
      return res.status(429).json({ error: 'تم تجاوز حد عمليات الفحص المؤقتة. حاول بعد دقيقة.' });
    }
    const q = String(req.query.q || '').trim();
    if (!q || q.length > 80) {
      return res.status(400).json({ error: 'أدخل معرّف الجهاز أو رقم IMEI أو السيريال للفحص.' });
    }
    return res.json(lookupPublicDeviceByIdentifier(q));
  });

  app.post('/api/app/devices/:id/scan', (req, res) => {
    const id = String(req.params.id || '').trim();
    if (id) dbRecordPublicScan(id);
    return res.json({ ok: true });
  });

  app.patch('/api/app/profile', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(30).optional(),
      city: z.string().trim().min(2).max(60).optional(),
      governorate: z.string().trim().max(60).optional(),
      storeName: z.string().trim().max(120).optional(),
      storeBio: z.string().trim().max(600).optional(),
      avatarUrl: z.string().max(3_500_000).optional(),
      themePreference: z.enum(['dark', 'light']).optional(),
      privacyHidePhone: z.boolean().optional(),
      privacyHideCity: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الملف الشخصي غير صالحة.' });
    }
    if (parsed.data.avatarUrl !== undefined && parsed.data.avatarUrl !== '' && !isSafeImageUrl(parsed.data.avatarUrl)) {
      return res.status(400).json({ error: 'صيغة أو رابط الصورة الشخصية غير صالح.' });
    }
    const result = dbUpdateUserProfile(user, parsed.data);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تحديث الملف الشخصي.' });
    }
    return res.json({ ok: true });
  });

  app.delete('/api/app/account', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbDeleteUserAccount(user);
    clearUserSessionCookie(req, res);
    return res.json({ ok: true });
  });

  app.post('/api/app/devices', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({
      category: z.enum(['smartphone', 'tablet', 'laptop', 'desktop', 'smartwatch', 'tv', 'home_appliance', 'other']),
      brand: z.string().trim().min(1).max(60),
      deviceName: z.string().trim().min(1).max(100),
      model: z.string().trim().min(1).max(80),
      modelNumber: z.string().trim().max(60).optional(),
      serialNumber: z.string().trim().max(64).optional(),
      imei: z.string().trim().max(20).optional(),
      purchaseDate: z.string().max(40).optional(),
      condition: z.enum(['new', 'like_new', 'good', 'fair', 'needs_repair']),
      imageUrl: z.string().max(3_500_000).optional(),
      sellerName: z.string().trim().max(100).optional(),
      invoiceName: z.string().trim().max(180).optional(),
      privateNotes: z.string().trim().max(600).optional(),
      warrantyIssuer: z.string().trim().max(120).optional(),
      warrantyStart: z.string().max(40).optional(),
      warrantyEnd: z.string().max(40).optional(),
      warrantyNumber: z.string().trim().max(80).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الجهاز غير صالحة.' });
    }
    if (parsed.data.imageUrl && !isSafeImageUrl(parsed.data.imageUrl)) {
      return res.status(400).json({ error: 'رابط صورة الجهاز غير مسموح.' });
    }
    const result = dbAddDevice(user, parsed.data);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تسجيل الجهاز.' });
    }
    return res.status(201).json(result);
  });

  app.patch('/api/app/devices/:id/visibility', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbUpdateDeviceVisibility(user, String(req.params.id || ''), req.body);
    if (!ok) return res.status(403).json({ error: 'لا تملك صلاحية تعديل خصوصية هذا الجهاز.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/devices/:id/rotate-token', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbRotateDeviceToken(user, String(req.params.id || ''));
    if (!result.ok) return res.status(403).json({ error: result.error || 'تعذر تجديد رابط QR.' });
    return res.json({ ok: true, publicToken: result.publicToken });
  });

  app.post('/api/app/inspections', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const itemStatusSchema = z.enum(['passed', 'issue_found', 'not_tested']);
    const schema = z.object({
      deviceId: z.string().trim().min(1).max(80),
      items: z.object({
        screen: itemStatusSchema,
        touch: itemStatusSchema,
        battery: itemStatusSchema,
        cameras: itemStatusSchema,
        audio: itemStatusSchema,
        charging: itemStatusSchema,
        network: itemStatusSchema,
        sensors: itemStatusSchema,
      }),
      inspectorNotes: z.string().trim().max(1200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الفحص غير مكتملة أو غير صالحة.' });
    }
    const result = dbCreateDeviceInspection(user, parsed.data);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر حفظ تقرير الفحص.' });
    return res.status(201).json(result);
  });

  app.patch('/api/app/devices/:id/condition', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbUpdateDeviceCondition(user, String(req.params.id || ''), req.body?.condition);
    if (!ok) return res.status(403).json({ error: 'تعذر تحديث حالة الجهاز.' });
    return res.json({ ok: true });
  });

  app.patch('/api/app/devices/:id/private-data', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbUpdateDevicePrivateData(user, String(req.params.id || ''), req.body || {});
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تحديث البيانات الخاصة.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/devices/:id/lost', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbReportDeviceLost(user, String(req.params.id || ''), String(req.body?.note || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تفعيل بلاغ الفقدان.' });
    return res.json({ ok: true });
  });

  app.delete('/api/app/devices/:id/lost', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbClearDeviceLost(user, String(req.params.id || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إلغاء البلاغ.' });
    return res.json({ ok: true });
  });

  app.delete('/api/app/devices/:id', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const mode = req.query.mode === 'delete' ? 'delete' : 'archive';
    const ok = dbDeleteOrArchiveDevice(user, String(req.params.id || ''), mode);
    if (!ok) return res.status(403).json({ error: 'لا تملك صلاحية تعديل أو حذف هذا الجهاز.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/devices/:id/events', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbAddDeviceEvent(
      user,
      String(req.params.id || ''),
      req.body?.eventType || 'note_added',
      String(req.body?.description || '')
    );
    if (!ok) return res.status(400).json({ error: 'تعذر إضافة الحدث إلى السجل الزمني.' });
    return res.status(201).json({ ok: true });
  });

  app.post('/api/app/repair-requests', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCreateRepairRequest(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إرسال طلب الصيانة.' });
    return res.status(201).json(result);
  });

  app.patch('/api/app/repair-requests/:id/status', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbUpdateRepairRequestStatus(user, String(req.params.id || ''), req.body?.status);
    if (!ok) return res.status(403).json({ error: 'تعذر تحديث حالة الطلب.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/repair-records', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCreateRepairRecord(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر حفظ سجل الصيانة.' });
    return res.status(201).json(result);
  });

  app.post('/api/app/repair-records/:id/approve', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbApproveRepairRecord(user, String(req.params.id || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر اعتماد سجل الصيانة.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/repair-records/:id/reject', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbRejectRepairRecord(user, String(req.params.id || ''), String(req.body?.reason || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر رفض سجل الصيانة.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/repair-records/:id/correction', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCreateRepairCorrectionRecord(
      user,
      String(req.params.id || ''),
      String(req.body?.correctionReason || ''),
      req.body?.updates || {}
    );
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إنشاء سجل التصحيح.' });
    return res.status(201).json({ ok: true });
  });

  app.post('/api/app/warranties', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAddWarranty(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تسجيل الضمان.' });
    return res.status(201).json(result);
  });

  app.patch('/api/app/warranties/:id/cancel', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbCancelWarranty(user, String(req.params.id || ''));
    if (!ok) return res.status(403).json({ error: 'تعذر إلغاء الضمان.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/listings', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCreateListing(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر نشر الإعلان.' });
    return res.status(201).json(result);
  });

  app.patch('/api/app/listings/:id/status', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ok = dbUpdateListingStatus(user, String(req.params.id || ''), req.body?.status);
    if (!ok) return res.status(403).json({ error: 'تعذر تحديث حالة الإعلان.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/conversations', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const conv = dbStartOrGetConversation(
      user,
      String(req.body?.otherUserId || ''),
      String(req.body?.otherUserName || ''),
      req.body?.listingId ? String(req.body.listingId) : undefined,
      req.body?.listingTitle ? String(req.body.listingTitle) : undefined
    );
    if (!conv) return res.status(400).json({ error: 'تعذر بدء المحادثة.' });
    return res.status(201).json({ conversation: conv });
  });

  app.post('/api/app/conversations/:id/messages', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbSendMessage(user, String(req.params.id || ''), String(req.body?.body || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إرسال الرسالة.' });
    return res.status(201).json({ ok: true });
  });

  app.post('/api/app/transfers', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbInitiateTransfer(user, String(req.body?.deviceId || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر بدء نقل الملكية.' });
    return res.status(201).json(result);
  });

  app.post('/api/app/transfers/accept', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbBuyerAcceptTransfer(user, String(req.body?.transferCode || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر قبول نقل الملكية.' });
    return res.json(result);
  });

  app.post('/api/app/transfers/:id/confirm', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbOwnerConfirmTransfer(user, String(req.params.id || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تأكيد نقل الملكية.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/transfers/:id/cancel-or-dispute', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const mode = req.body?.mode === 'dispute' ? 'dispute' : 'cancel';
    const result = dbCancelOrDisputeTransfer(user, String(req.params.id || ''), mode, req.body?.reason);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تنفيذ الطلب.' });
    return res.json({ ok: true });
  });

  app.patch('/api/app/technician-profile', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbUpdateTechnicianProfile(user, req.body || {});
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تحديث ملف الفني.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/reviews', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbSubmitTechnicianReview(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إرسال التقييم.' });
    return res.status(201).json({ ok: true });
  });

  app.post('/api/app/reviews/:id/report', requireAppUser, (req, res) => {
    dbReportReview(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.patch('/api/app/notifications/:id/read', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbMarkNotificationRead(user, String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.post('/api/app/notifications/read-all', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbMarkAllNotificationsRead(user);
    return res.json({ ok: true });
  });

  app.delete('/api/app/notifications', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbClearNotifications(user);
    return res.json({ ok: true });
  });

  app.put('/api/app/notification-prefs', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbUpdateNotificationPrefs(user, req.body);
    return res.json({ ok: true });
  });

  app.post('/api/app/maintenance', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAddMaintenanceReminder(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إضافة موعد الصيانة.' });
    return res.status(201).json(result);
  });

  app.post('/api/app/maintenance/:id/complete', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCompleteMaintenanceReminder(user, String(req.params.id || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر توثيق الصيانة الدورية.' });
    return res.json({ ok: true });
  });

  app.delete('/api/app/maintenance/:id', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    dbDeleteMaintenanceReminder(user, String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.post('/api/app/reports', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbSubmitReport(user, req.body);
    return res.status(201).json(result);
  });

  app.post('/api/app/v3/spare-parts', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAddSparePartObservation(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر حفظ سعر القطعة.' });
    return res.status(201).json(result);
  });

  app.post('/api/app/v3/partners', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbRegisterB2BPartner(user, req.body);
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تسجيل الشريك المؤسسي.' });
    return res.status(201).json(result);
  });

  app.patch('/api/app/admin/users/:id/status', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const status = req.body?.status === 'suspended' ? 'suspended' : 'active';
    const result = dbAdminUpdateUserStatus(user, String(req.params.id || ''), status);
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  app.patch('/api/app/admin/users/:id/role', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({ role: z.enum(['user', 'technician', 'store', 'admin']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'الدور المطلوب غير صالح.' });
    }
    const result = dbAdminUpdateUserRole(user, String(req.params.id || ''), parsed.data.role);
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/admin/technicians/:id/toggle-verify', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAdminToggleTechVerification(user, String(req.params.id || ''));
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  app.patch('/api/app/admin/reports/:id/status', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAdminUpdateReportStatus(user, String(req.params.id || ''), req.body?.status);
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  app.put('/api/app/admin/settings', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAdminUpdatePlatformSettings(user, req.body);
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/admin/b2b/:id/toggle', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbAdminToggleB2BPartner(user, String(req.params.id || ''));
    if (!result.ok) return res.status(403).json({ error: result.error || 'غير مصرح.' });
    return res.json({ ok: true });
  });

  // --- Paid Subscriptions & Optional Pro Services ---
  app.get('/api/app/services/catalog', (_req, res) => {
    return res.json({ services: PAID_SERVICES_CATALOG });
  });

  app.post('/api/app/subscriptions/subscribe', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({
      planId: z.string().min(1).max(80),
      billingCycle: z.enum(['monthly', 'yearly']),
      paymentMethod: z.enum(['instapay', 'vodafone_cash', 'bank_card', 'card']),
      paymentReference: z.string().trim().max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الاشتراك غير صالحة.' });
    }
    const method = parsed.data.paymentMethod === 'card' ? 'bank_card' : parsed.data.paymentMethod;
    const result = dbSubscribeToPlan(user, { ...parsed.data, paymentMethod: method });
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر تفعيل الباقة.' });
    return res.status(201).json(result);
  });

  app.post('/api/app/subscriptions/:id/cancel', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const result = dbCancelUserSubscription(user, String(req.params.id || ''));
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إلغاء الاشتراك.' });
    return res.json({ ok: true });
  });

  app.post('/api/app/services/purchase', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({
      serviceCode: z.enum([
        'store_feature_listing',
        'store_certified_stamp',
        'store_risk_pack',
        'tech_spotlight',
        'tech_priority_leads',
        'tech_ai_pack',
      ]),
      listingId: z.string().trim().max(80).optional(),
      paymentMethod: z.enum(['orange_cash', 'instapay', 'vodafone_cash', 'bank_card', 'e_gateway', 'card']),
      paymentReference: z.string().trim().max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الخدمة غير صالحة.' });
    }
    const method = parsed.data.paymentMethod === 'card' ? 'bank_card' : parsed.data.paymentMethod;
    const result = dbPurchasePaidService(user, { ...parsed.data, paymentMethod: method });
    if (!result.ok) return res.status(400).json({ error: result.error || 'تعذر إتمام الخدمة.' });
    return res.status(201).json(result);
  });

  // --- Dynamic Monetization, Orange Cash Proof Verification & Admin Revenue APIs ---
  app.get('/api/monetization/catalog', (_req, res) => {
    return res.json({
      services: listCatalogServices(false),
      paymentMethods: listPaymentMethods(true),
    });
  });

  app.post('/api/monetization/validate-promo', requireAppUser, (req, res) => {
    const schema = z.object({
      serviceId: z.string().trim().min(1).max(80),
      promoCode: z.string().trim().max(40).default(''),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات التحقق من كود الخصم غير صالحة.' });
    }
    const allSvcs = listCatalogServices(true);
    const svc = allSvcs.find((s) => s.id === parsed.data.serviceId || s.code === parsed.data.serviceId);
    if (!svc) {
      return res.status(404).json({ error: 'الخدمة المطلوبة غير موجودة.' });
    }
    const check = validatePromoCodeForPrice(parsed.data.promoCode, svc.priceEgp);
    if (!check.ok) {
      return res.status(400).json({ error: check.error || 'كود الخصم غير صالح.' });
    }
    return res.json({
      ok: true,
      originalPriceEgp: svc.priceEgp,
      discountAmountEgp: check.discountAmountEgp,
      finalAmountEgp: check.finalAmountEgp,
      promo: check.promo || null,
    });
  });

  app.get('/api/monetization/my', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    return res.json({
      paymentRequests: listUserPaymentRequests(user.id),
      entitlements: listUserEntitlements(user.id),
    });
  });

  app.post('/api/monetization/payments', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const ip = getClientIp(req);
    if (!checkRateLimit(`pay_proof:${user.id}:${ip}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'تم إرسال عدد كبير من طلبات الدفع في وقت قصير. يرجى الانتظار قليلاً.' });
    }
    const schema = z.object({
      serviceId: z.string().trim().min(1).max(80),
      paymentMethod: z.enum(['orange_cash', 'vodafone_cash', 'instapay', 'bank_card', 'e_gateway']),
      senderWalletPhone: z.string().trim().min(8, 'أدخل رقم المحفظة المحوِّل منها').max(30),
      transferredAmountEgp: z.number().positive('أدخل مبلغ التحويل الفعلي'),
      referenceNumber: z.string().trim().max(80).optional(),
      transferDatetime: z.string().trim().min(4).max(60),
      screenshotDataUrl: z.string().min(30, 'يرجى رفع صورة إثبات التحويل').max(3_500_000),
      promoCode: z.string().trim().max(40).optional(),
      targetDeviceId: z.string().trim().max(80).optional(),
      targetListingId: z.string().trim().max(80).optional(),
      userNote: z.string().trim().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات إثبات الدفع غير مكتملة.' });
    }
    if (!parsed.data.screenshotDataUrl.startsWith('data:image/') || !isSafeImageUrl(parsed.data.screenshotDataUrl)) {
      return res.status(400).json({ error: 'صيغة صورة إثبات التحويل غير صالحة أو تتجاوز الحد المسموح.' });
    }
    const result = submitPaymentProofRequest(user, parsed.data);
    if (!result.ok || !result.request) {
      return res.status(400).json({ error: result.error || 'تعذر تسجيل طلب الدفع.' });
    }
    return res.status(201).json({ ok: true, request: result.request });
  });

  app.post('/api/monetization/payments/:id/resubmit', requireAppUser, (req, res) => {
    const user = (req as express.Request & { appUser: UserProfile }).appUser;
    const schema = z.object({
      senderWalletPhone: z.string().trim().max(30).optional(),
      referenceNumber: z.string().trim().max(80).optional(),
      transferDatetime: z.string().trim().max(60).optional(),
      screenshotDataUrl: z.string().min(30, 'يرجى رفع صورة إثبات جديدة').max(3_500_000),
      userNote: z.string().trim().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات إعادة الإرسال غير صالحة.' });
    }
    if (!parsed.data.screenshotDataUrl.startsWith('data:image/') || !isSafeImageUrl(parsed.data.screenshotDataUrl)) {
      return res.status(400).json({ error: 'صيغة صورة الإثبات غير صالحة.' });
    }
    const result = resubmitPaymentProof(user, String(req.params.id || ''), parsed.data);
    if (!result.ok || !result.request) {
      return res.status(400).json({ error: result.error || 'تعذر تحديث إثبات الدفع.' });
    }
    return res.json({ ok: true, request: result.request });
  });

  // Admin Monetization Endpoints (Accessible from BOTH /admin and /admin-portal)
  app.get('/api/monetization/admin/overview', requireAnyAdmin, (req, res) => {
    const statusQ = String(req.query.status || 'all') as PaymentRequestStatus | 'all';
    const allowedStatus: Array<PaymentRequestStatus | 'all'> = [
      'all',
      'pending_review',
      'needs_more_proof',
      'approved',
      'rejected',
    ];
    const safeStatus = allowedStatus.includes(statusQ) ? statusQ : 'all';
    return res.json({
      revenue: getAdminRevenueAnalytics(),
      catalog: listCatalogServices(true),
      paymentMethods: listPaymentMethods(false),
      promoCodes: adminListPromoCodes(),
      requests: adminListPaymentRequests(safeStatus),
      entitlements: adminListAllEntitlements(),
      users: adminListUsersSummary(),
    });
  });

  app.post('/api/monetization/admin/payments/:id/review', requireAnyAdmin, (req, res) => {
    const actor = (req as express.Request & { adminActor: { id: string; name: string } }).adminActor;
    const schema = z.object({
      action: z.enum(['approve', 'reject', 'needs_more_proof', 'note_only']),
      adminNote: z.string().trim().max(600).optional(),
      rejectionReason: z.string().trim().max(600).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'إجراء المراجعة غير صالح.' });
    }
    const result = adminReviewPaymentRequest(actor, String(req.params.id || ''), parsed.data);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تنفيذ مراجعة الدفع.' });
    }
    return res.json({ ok: true, request: result.request, entitlement: result.entitlement });
  });

  app.post('/api/monetization/admin/catalog', requireAnyAdmin, (req, res) => {
    const schema = z.object({
      id: z.string().max(80).optional(),
      code: z.string().trim().min(2).max(80),
      category: z.enum(['customer', 'technician', 'store', 'verification_reports', 'future']),
      itemType: z.enum(['service', 'package']),
      name: z.string().trim().min(2).max(160),
      shortDesc: z.string().trim().min(3).max(500),
      features: z.array(z.string().trim().min(1).max(240)).max(20),
      priceEgp: z.number().nonnegative().max(1_000_000),
      billingPeriod: z.enum(['one_time', 'monthly', 'yearly', 'custom']),
      durationDays: z.number().int().min(0).max(3650),
      quotaCredits: z.number().int().min(0).max(10000),
      requiresDevice: z.boolean(),
      requiresListing: z.boolean(),
      isActive: z.boolean(),
      sortOrder: z.number().int().min(0).max(9999),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الخدمة أو الباقة غير صالحة.' });
    }
    try {
      const item = adminUpsertCatalogService(parsed.data);
      return res.json({ ok: true, item });
    } catch {
      return res.status(400).json({ error: 'كود الخدمة مستخدم مسبقًا. اختر كودًا فريدًا.' });
    }
  });

  app.delete('/api/monetization/admin/catalog/:id', requireAnyAdmin, (req, res) => {
    adminDeleteCatalogService(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.put('/api/monetization/admin/payment-methods', requireAnyAdmin, (req, res) => {
    const schema = z.object({
      code: z.enum(['orange_cash', 'vodafone_cash', 'instapay', 'bank_card', 'e_gateway']),
      displayName: z.string().trim().min(2).max(120),
      receiverAccount: z.string().trim().max(120),
      beneficiaryName: z.string().trim().max(120),
      instructions: z.string().trim().max(800),
      requiresManualProof: z.boolean(),
      isEnabled: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات وسيلة الدفع غير صالحة.' });
    }
    const method = adminUpdatePaymentMethod(parsed.data);
    return res.json({ ok: true, method });
  });

  app.post('/api/monetization/admin/promo-codes', requireAnyAdmin, (req, res) => {
    const schema = z.object({
      id: z.string().max(80).optional(),
      code: z.string().trim().min(2).max(40),
      discountType: z.enum(['percent', 'fixed_egp']),
      discountValue: z.number().positive().max(100000),
      maxUses: z.number().int().min(1).max(100000),
      expiresAt: z.string().max(40).optional(),
      isActive: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الكود الترويجي غير صالحة.' });
    }
    try {
      const promo = adminUpsertPromoCode(parsed.data);
      return res.json({ ok: true, promo });
    } catch {
      return res.status(400).json({ error: 'كود الخصم مسجل مسبقًا.' });
    }
  });

  app.delete('/api/monetization/admin/promo-codes/:id', requireAnyAdmin, (req, res) => {
    adminDeletePromoCode(String(req.params.id || ''));
    return res.json({ ok: true });
  });

  app.post('/api/monetization/admin/entitlements/manage', requireAnyAdmin, (req, res) => {
    const actor = (req as express.Request & { adminActor: { id: string; name: string } }).adminActor;
    const schema = z.object({
      mode: z.enum(['grant', 'extend', 'cancel', 'set_dates']),
      userId: z.string().max(80).optional(),
      serviceId: z.string().max(80).optional(),
      entitlementId: z.string().max(80).optional(),
      isTrial: z.boolean().optional(),
      extraDays: z.number().int().min(1).max(3650).optional(),
      startsAt: z.string().max(40).optional(),
      expiresAt: z.string().max(40).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات إدارة الاشتراك غير صالحة.' });
    }
    const result = adminManageUserEntitlement(actor, parsed.data);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'تعذر تحديث الاشتراك.' });
    }
    return res.json({ ok: true, entitlement: result.entitlement });
  });

  // 1. General Platform AI Copilot for Customers, Technicians, Stores & Admin
  app.post('/api/ai/assistant', async (req, res) => {
    const parsed = assistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'البيانات المرسلة غير صالحة. يرجى كتابة سؤال واضح.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'خدمة الذكاء الاصطناعي غير مفعلة حاليًا لأن مفتاح GEMINI_API_KEY غير مضبوط في إعدادات الخادم (Settings > Secrets).',
      });
    }

    const { message, history = [], userRole = 'guest', currentPath = '/', platformSnapshot } = parsed.data;
    const roleLabelMap: Record<string, string> = {
      user: 'مستخدم عادي (صاحب جهاز أو مشتري)',
      technician: 'فني صيانة / مركز خدمة',
      store: 'متجر أو بائع أجهزة',
      admin: 'مدير النظام',
      guest: 'زائر',
    };

    const contextHeader = `[سياق الجلسة الحالي]
- دور المستخدم: ${roleLabelMap[userRole] || 'مستخدم'}
- الصفحة الحالية: ${currentPath}
- إحصائيات الجلسة: أجهزة=${platformSnapshot?.devicesCount ?? 0}، صيانات=${platformSnapshot?.repairsCount ?? 0}، عروض سوق=${platformSnapshot?.listingsCount ?? 0}، شركاء B2B=${platformSnapshot?.partnersCount ?? 0}، الوضع=متصل بقاعدة البيانات الفعلية`;

    const contents = [
      ...history.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: `${contextHeader}\n\nسؤال المستخدم: ${message}` }],
      },
    ];

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents,
        config: {
          systemInstruction: PLATFORM_SYSTEM_INSTRUCTION,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        return res.status(502).json({
          error: 'لم يتم استلام رد نصي من نموذج الذكاء الاصطناعي. حاول إعادة صياغة السؤال.',
        });
      }

      return res.json({ reply, model: MODEL_TEXT });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 2. Preliminary AI Fault Diagnosis (supports optional image)
  app.post('/api/ai/diagnose', async (req, res) => {
    const parsed = diagnoseRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'يرجى إدخال نوع الجهاز وماركته ووصف العطل (5 أحرف على الأقل).',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'خدمة التشخيص بالذكاء الاصطناعي تحتاج تفعيل مفتاح GEMINI_API_KEY في Settings > Secrets.',
      });
    }

    const data = parsed.data;
    const promptText = `قم بإجراء تشخيص أولي استرشادي بالعربية لجهاز إلكتروني بالمواصفات التالية:
- الفئة: ${data.category}
- الماركة: ${data.brand}
- اسم الجهاز: ${data.deviceName}
- الموديل: ${data.model || 'غير محدد'}
- العمر التقريبي بالأشهر: ${data.deviceAgeMonths ?? 'غير محدد'}
- سجل الصيانات السابقة: ${data.previousRepairsSummary || 'لا يوجد'}
- وصف الأعراض من المستخدم/الفني: ${data.symptoms}

التزم بالواقعية التقنية ولا تنصح المستخدم بفتح الجهاز بنفسه إذا كان هناك خطر كهربائي أو بطارية منفوخة.`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (data.imageBase64 && data.imageMimeType) {
      const cleanedBase64 = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: data.imageMimeType,
          data: cleanedBase64,
        },
      });
    }
    parts.push({ text: promptText });

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: { parts },
        config: {
          systemInstruction:
            'أنت مهندس تشخيص أعطال إلكترونية في منصة صاصا ستور عُمْر. قدم تشخيصًا أوليًا منظمًا ودقيقًا بالعربية بدون تهويل.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: 'ملخص التشخيص الأولي' },
              urgency: { type: Type.STRING, description: 'عادي أو متوسط أو عاجل' },
              probableCauses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cause: { type: Type.STRING },
                    likelihood: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                },
              },
              recommendedChecks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedParts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              safetyNote: { type: Type.STRING },
            },
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsedResult = JSON.parse(rawJson);
      return res.json({ diagnosis: parsedResult, model: MODEL_TEXT });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3. AI Deep Intelligence for Device Valuation, History Summary & Risk Report
  app.post('/api/ai/device-intelligence', async (req, res) => {
    const parsed = intelligenceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'بيانات الجهاز غير مكتملة للتحليل.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'تحليل الذكاء الاصطناعي يتطلب ضبط GEMINI_API_KEY في Settings > Secrets. التقدير والتحليل الحسابي المحلي متاحان بالفعل أعلاه.',
      });
    }

    const { mode, deviceSummary } = parsed.data;
    const modePromptMap = {
      valuation: `حلل القيمة السعرية العادلة لهذا الجهاز في السوق المصري بالجنيه المصري بناءً على البيانات التالية، واذكر العوامل التي ترفع أو تخفض قيمته ونصيحة تسعير للعرض في OMOR MARKET:`,
      history: `حلل السجل التاريخي ودورة حياة هذا الجهاز، وقيم تأثير الصيانات والضمانات ومستوى التوثيق على استقرار الجهاز مستقبلاً:`,
      risk_report: `أنت مستشار مخاطر شراء الأجهزة المستعملة في صاصا ستور عُمْر. قدم تقييم مخاطر واضحًا للمشتري قبل الدفع والاستلام، وأهم الأسئلة والفحوصات الميدانية المطلوبة:`,
    };

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `${modePromptMap[mode]}\n\n${JSON.stringify(deviceSummary, null, 2)}`,
        config: {
          systemInstruction:
            'قدم تحليلًا عربيًا موجزًا واحترافيًا ومرتبطًا بالبيانات المرفقة فقط دون اختلاق مواصفات غير موجودة.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const insight = JSON.parse(rawJson);
      return res.json({ insight, model: MODEL_TEXT });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SASA STORE OMOR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

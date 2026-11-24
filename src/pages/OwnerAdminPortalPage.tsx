import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShoppingBag,
  Sun,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { AdSlotBanner } from '../components/AdSlotBanner';
import { AdminMonetizationCenter } from '../components/AdminMonetizationCenter';
import { BrandLogo } from '../components/BrandLogo';
import { PageSEO } from '../components/PageSEO';
import { useApp } from '../context/AppContext';
import { useCms } from '../context/CmsContext';
import { formatArabicDateTime, formatCurrency } from '../lib/labels';
import type {
  AdPlacement,
  AdSlot,
  AdType,
  AdminOverviewStats,
  AffiliateProduct,
  ArticleCategory,
  ArticleItem,
  ArticleStatus,
  ContactMessage,
  ContactMessageStatus,
  PageConfig,
  RevenueEntry,
  SiteSettings,
  SubscriptionPlan,
} from '../types/cms';

type PortalTab =
  | 'overview'
  | 'monetization'
  | 'articles'
  | 'ads'
  | 'affiliates'
  | 'plans'
  | 'messages'
  | 'pages_settings';

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  header_top: 'أعلى الصفحات (Header Top)',
  home_mid: 'منتصف الصفحة الرئيسية',
  article_top: 'أعلى المقالات',
  article_bottom: 'أسفل المقالات',
  offers_top: 'أعلى صفحة العروض',
  footer_banner: 'أسفل الموقع (Footer Banner)',
  sidebar: 'الشريط الجانبي',
};

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2_000_000) {
      reject(new Error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });
}

function slugifyTitle(title: string): string {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06ff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || `post-${Date.now().toString().slice(-6)}`;
}

function extractAdsenseSnippet(snippet: string): { client?: string; slot?: string; format?: string } {
  const clientMatch = snippet.match(/data-ad-client=["'](ca-pub-\d+)["']/i) || snippet.match(/(ca-pub-\d+)/i);
  const slotMatch = snippet.match(/data-ad-slot=["'](\d+)["']/i);
  const formatMatch = snippet.match(/data-ad-format=["']([a-zA-Z-]+)["']/i);
  return {
    client: clientMatch?.[1],
    slot: slotMatch?.[1],
    format: formatMatch?.[1],
  };
}

export const OwnerAdminPortalPage: React.FC = () => {
  const { theme, toggleTheme, users: demoUsers, devices: demoDevices } = useApp();
  const {
    adminStatus,
    adminSetup,
    adminLogin,
    adminLogout,
    adminFetch,
    refreshBootstrap,
  } = useCms();

  // Auth form states
  const [authEmail, setAuthEmail] = useState('admin@sasastore.app');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Portal workspace state
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [pagesList, setPagesList] = useState<PageConfig[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateProduct[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);

  const showToast = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const loadAllAdminData = useCallback(async () => {
    setLoadingData(true);
    const [ov, arts, ads, affs, plns, msgs, revs] = await Promise.all([
      adminFetch<{
        stats: AdminOverviewStats;
        settings: SiteSettings;
        pages: PageConfig[];
        categories: ArticleCategory[];
      }>('/api/admin/overview'),
      adminFetch<{ articles: ArticleItem[] }>('/api/admin/articles'),
      adminFetch<{ adSlots: AdSlot[] }>('/api/admin/ads'),
      adminFetch<{ affiliates: AffiliateProduct[] }>('/api/admin/affiliates'),
      adminFetch<{ plans: SubscriptionPlan[] }>('/api/admin/plans'),
      adminFetch<{ messages: ContactMessage[] }>('/api/admin/messages'),
      adminFetch<{ entries: RevenueEntry[] }>('/api/admin/revenue'),
    ]);

    if (ov.ok && ov.data) {
      setStats(ov.data.stats);
      setSettingsForm(ov.data.settings);
      setPagesList(ov.data.pages);
      setCategories(ov.data.categories);
    }
    if (arts.ok && arts.data) setArticles(arts.data.articles);
    if (ads.ok && ads.data) setAdSlots(ads.data.adSlots);
    if (affs.ok && affs.data) setAffiliates(affs.data.affiliates);
    if (plns.ok && plns.data) setPlans(plns.data.plans);
    if (msgs.ok && msgs.data) setMessages(msgs.data.messages);
    if (revs.ok && revs.data) setRevenueEntries(revs.data.entries);
    setLoadingData(false);
  }, [adminFetch]);

  useEffect(() => {
    if (adminStatus.authenticated) {
      void loadAllAdminData();
    }
  }, [adminStatus.authenticated, loadAllAdminData]);

  // --- Sub-forms state ---
  // Revenue
  const [revSource, setRevSource] = useState<RevenueEntry['sourceType']>('adsense');
  const [revDesc, setRevDesc] = useState('');
  const [revAmount, setRevAmount] = useState('');
  const [revDate, setRevDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Articles & Categories
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artSlug, setArtSlug] = useState('');
  const [artCategoryId, setArtCategoryId] = useState('');
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artCoverUrl, setArtCoverUrl] = useState('');
  const [artAuthor, setArtAuthor] = useState('إدارة SASA STORE OMOR');
  const [artStatus, setArtStatus] = useState<ArticleStatus>('published');
  const [artShowOnHome, setArtShowOnHome] = useState(true);
  const [artSeoTitle, setArtSeoTitle] = useState('');
  const [artSeoDesc, setArtSeoDesc] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  // Ad Slots
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adName, setAdName] = useState('');
  const [adPlacement, setAdPlacement] = useState<AdPlacement>('home_mid');
  const [adType, setAdType] = useState<AdType>('adsense');
  const [adClient, setAdClient] = useState('');
  const [adSlotCode, setAdSlotCode] = useState('');
  const [adFormat, setAdFormat] = useState('auto');
  const [adSnippetPaste, setAdSnippetPaste] = useState('');
  const [adDirectTitle, setAdDirectTitle] = useState('');
  const [adDirectDesc, setAdDirectDesc] = useState('');
  const [adDirectImg, setAdDirectImg] = useState('');
  const [adDirectLink, setAdDirectLink] = useState('');
  const [adActive, setAdActive] = useState(true);

  // Affiliates
  const [editingAffId, setEditingAffId] = useState<string | null>(null);
  const [affTitle, setAffTitle] = useState('');
  const [affCat, setAffCat] = useState('شواحن وكابلات أصلية');
  const [affDesc, setAffDesc] = useState('');
  const [affPrice, setAffPrice] = useState('');
  const [affOldPrice, setAffOldPrice] = useState('');
  const [affImg, setAffImg] = useState('');
  const [affUrl, setAffUrl] = useState('https://');
  const [affNetwork, setAffNetwork] = useState('Amazon / Noon / SASA STORE');
  const [affCommPct, setAffCommPct] = useState('8');
  const [affFeatured, setAffFeatured] = useState(true);
  const [affActive, setAffActive] = useState(true);

  // Plans
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planRole, setPlanRole] = useState<SubscriptionPlan['targetRole']>('technician');
  const [planMonthly, setPlanMonthly] = useState('0');
  const [planYearly, setPlanYearly] = useState('0');
  const [planBilling, setPlanBilling] = useState(false);
  const [planActive, setPlanActive] = useState(true);
  const [planFeaturesText, setPlanFeaturesText] = useState('');

  // Messages filter
  const [msgFilter, setMsgFilter] = useState<'all' | ContactMessageStatus>('all');
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});

  // Pages & Password
  const [selectedPageSlug, setSelectedPageSlug] = useState('home');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (adminStatus.setupRequired) {
      if (authPassword.length < 8) {
        setAuthError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
        return;
      }
      if (authPassword !== authConfirm) {
        setAuthError('كلمتا المرور غير متطابقتين.');
        return;
      }
      setAuthBusy(true);
      const res = await adminSetup(authEmail, authPassword);
      setAuthBusy(false);
      if (!res.ok) setAuthError(res.error || 'تعذر الإعداد.');
      else setAuthPassword('');
      return;
    }

    setAuthBusy(true);
    const res = await adminLogin(authEmail, authPassword);
    setAuthBusy(false);
    if (!res.ok) setAuthError(res.error || 'فشل تسجيل الدخول.');
    else setAuthPassword('');
  };

  // --- Gate Screens (Setup or Login) ---
  if (adminStatus.loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#C5CCD8] flex items-center justify-center text-sm">
        <PageSEO title="بوابة الإدارة | OMOR" noIndex />
        جاري التحقق من حالة بوابة الإدارة...
      </div>
    );
  }

  if (!adminStatus.authenticated) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] text-[#11161F] dark:text-[#F3F5F8] flex flex-col justify-center items-center p-4">
        <PageSEO title="دخول مدير الموقع | SASA STORE OMOR" noIndex />
        <div className="w-full max-w-md rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo />
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#D5DBE5] dark:border-[#333C4B]"
              aria-label="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
              <Lock className="w-4 h-4" />
              <span>بوابة إدارة الموقع المستقلة</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              {adminStatus.setupRequired
                ? 'إعداد حساب مدير الموقع (لأول مرة)'
                : 'تسجيل دخول مدير الموقع'}
            </h1>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8] leading-relaxed">
              {adminStatus.setupRequired
                ? 'أنشئ بيانات الدخول الخاصة بك كمالك للمنصة. تُحفظ كلمة المرور مشفرة على الخادم ولا يمكن لأي مستخدم عادي الوصول لهذه اللوحة.'
                : 'هذه اللوحة محمية بمصادقة الخادم الخاصة بإدارة المحتوى والإعلانات والأرباح والإحصائيات.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">البريد الإلكتروني للإدارة</label>
              <input
                type="email"
                required
                dir="ltr"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">
                {adminStatus.setupRequired ? 'كلمة المرور (8 أحرف على الأقل)' : 'كلمة المرور'}
              </label>
              <input
                type="password"
                required
                dir="ltr"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            {adminStatus.setupRequired && (
              <div>
                <label className="block text-xs font-medium mb-1.5">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={authConfirm}
                  onChange={(e) => setAuthConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
            )}

            {authError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full min-h-[46px] rounded-xl bg-[#D4AF37] hover:bg-[#E2C25B] text-[#0B1220] text-sm font-bold disabled:opacity-60"
            >
              {authBusy
                ? 'جاري التحقق...'
                : adminStatus.setupRequired
                  ? 'تفعيل وحفظ حساب المدير'
                  : 'دخول إلى لوحة الإدارة'}
            </button>
          </form>

          <div className="pt-2 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
            <Link to="/welcome" className="hover:text-[#D4AF37]">
              العودة إلى الموقع العام
            </Link>
            <span>محمي بتشفير الخادم</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Action Handlers ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    const res = await adminFetch<{ settings: SiteSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsForm),
    });
    if (res.ok && res.data) {
      setSettingsForm(res.data.settings);
      await refreshBootstrap();
      showToast('ok', 'تم حفظ إعدادات الموقع والسيو بنجاح.');
    } else {
      showToast('err', res.error || 'تعذر حفظ الإعدادات.');
    }
  };

  const handleQuickToggleFlag = async (key: keyof SiteSettings['sectionFlags']) => {
    if (!settingsForm) return;
    const updated: SiteSettings = {
      ...settingsForm,
      sectionFlags: {
        ...settingsForm.sectionFlags,
        [key]: !settingsForm.sectionFlags[key],
      },
    };
    const res = await adminFetch<{ settings: SiteSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    if (res.ok && res.data) {
      setSettingsForm(res.data.settings);
      await refreshBootstrap();
      showToast('ok', 'تم تحديث حالة القسم فورًا.');
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: artTitle,
      slug: artSlug || slugifyTitle(artTitle),
      excerpt: artExcerpt,
      content: artContent,
      coverImageUrl: artCoverUrl || undefined,
      categoryId: artCategoryId || undefined,
      authorName: artAuthor,
      status: artStatus,
      showOnHome: artShowOnHome,
      seoTitle: artSeoTitle || undefined,
      seoDescription: artSeoDesc || undefined,
    };

    const url = editingArticleId ? `/api/admin/articles/${editingArticleId}` : '/api/admin/articles';
    const method = editingArticleId ? 'PUT' : 'POST';
    const res = await adminFetch<{ article: ArticleItem }>(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) {
      setEditingArticleId(null);
      setArtTitle('');
      setArtSlug('');
      setArtExcerpt('');
      setArtContent('');
      setArtCoverUrl('');
      setArtSeoTitle('');
      setArtSeoDesc('');
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', editingArticleId ? 'تم تحديث المقال بنجاح.' : 'تم حفظ المقال بنجاح.');
    } else {
      showToast('err', res.error || 'تعذر حفظ المقال.');
    }
  };

  const startEditArticle = (art: ArticleItem) => {
    setEditingArticleId(art.id);
    setArtTitle(art.title);
    setArtSlug(art.slug);
    setArtCategoryId(art.categoryId || '');
    setArtExcerpt(art.excerpt);
    setArtContent(art.content);
    setArtCoverUrl(art.coverImageUrl || '');
    setArtAuthor(art.authorName);
    setArtStatus(art.status);
    setArtShowOnHome(art.showOnHome);
    setArtSeoTitle(art.seoTitle || '');
    setArtSeoDesc(art.seoDescription || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickArticleStatus = async (art: ArticleItem, status: ArticleStatus) => {
    const res = await adminFetch(`/api/admin/articles/${art.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تم تغيير حالة المقال.');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    const res = await adminFetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تم حذف المقال.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await adminFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: newCatName.trim(),
        slug: newCatSlug.trim() || slugifyTitle(newCatName),
        sortOrder: categories.length + 1,
      }),
    });
    if (res.ok) {
      setNewCatName('');
      setNewCatSlug('');
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تمت إضافة التصنيف.');
    } else {
      showToast('err', res.error || 'تعذر إضافة التصنيف.');
    }
  };

  const handleSaveAdSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingAdId || undefined,
      name: adName,
      placement: adPlacement,
      adType,
      adsenseClient: adClient || undefined,
      adsenseSlot: adSlotCode || undefined,
      adsenseFormat: adFormat || 'auto',
      directTitle: adDirectTitle || undefined,
      directDescription: adDirectDesc || undefined,
      directImageUrl: adDirectImg || undefined,
      directLinkUrl: adDirectLink || undefined,
      isActive: adActive,
    };
    const url = editingAdId ? `/api/admin/ads/${editingAdId}` : '/api/admin/ads';
    const method = editingAdId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setEditingAdId(null);
      setAdName('');
      setAdClient('');
      setAdSlotCode('');
      setAdDirectTitle('');
      setAdDirectDesc('');
      setAdDirectImg('');
      setAdDirectLink('');
      setAdSnippetPaste('');
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تم حفظ الوحدة الإعلانية.');
    } else {
      showToast('err', res.error || 'تعذر حفظ الإعلان.');
    }
  };

  const startEditAd = (ad: AdSlot) => {
    setEditingAdId(ad.id);
    setAdName(ad.name);
    setAdPlacement(ad.placement);
    setAdType(ad.adType);
    setAdClient(ad.adsenseClient || '');
    setAdSlotCode(ad.adsenseSlot || '');
    setAdFormat(ad.adsenseFormat || 'auto');
    setAdDirectTitle(ad.directTitle || '');
    setAdDirectDesc(ad.directDescription || '');
    setAdDirectImg(ad.directImageUrl || '');
    setAdDirectLink(ad.directLinkUrl || '');
    setAdActive(ad.isActive);
  };

  const handleToggleAdActive = async (ad: AdSlot) => {
    const res = await adminFetch(`/api/admin/ads/${ad.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...ad, isActive: !ad.isActive }),
    });
    if (res.ok) {
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', ad.isActive ? 'تم إيقاف الإعلان.' : 'تم تفعيل الإعلان.');
    }
  };

  const handleSaveAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingAffId || undefined,
      title: affTitle,
      category: affCat,
      description: affDesc,
      priceEgp: Number(affPrice) || 0,
      oldPriceEgp: affOldPrice ? Number(affOldPrice) : undefined,
      imageUrl: affImg || undefined,
      affiliateUrl: affUrl,
      networkLabel: affNetwork,
      commissionRatePct: Number(affCommPct) || 0,
      isFeatured: affFeatured,
      isActive: affActive,
    };
    const url = editingAffId ? `/api/admin/affiliates/${editingAffId}` : '/api/admin/affiliates';
    const method = editingAffId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setEditingAffId(null);
      setAffTitle('');
      setAffDesc('');
      setAffPrice('');
      setAffOldPrice('');
      setAffImg('');
      setAffUrl('https://');
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تم حفظ منتج التسويق بالعمولة.');
    } else {
      showToast('err', res.error || 'تعذر حفظ المنتج.');
    }
  };

  const startEditAffiliate = (item: AffiliateProduct) => {
    setEditingAffId(item.id);
    setAffTitle(item.title);
    setAffCat(item.category);
    setAffDesc(item.description);
    setAffPrice(String(item.priceEgp));
    setAffOldPrice(item.oldPriceEgp ? String(item.oldPriceEgp) : '');
    setAffImg(item.imageUrl || '');
    setAffUrl(item.affiliateUrl);
    setAffNetwork(item.networkLabel);
    setAffCommPct(String(item.commissionRatePct));
    setAffFeatured(item.isFeatured);
    setAffActive(item.isActive);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const features = planFeaturesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      id: editingPlanId || undefined,
      name: planName,
      targetRole: planRole,
      priceMonthlyEgp: Number(planMonthly) || 0,
      priceYearlyEgp: Number(planYearly) || 0,
      billingEnabled: planBilling,
      isActive: planActive,
      features,
      sortOrder: plans.length + 1,
    };
    const url = editingPlanId ? `/api/admin/plans/${editingPlanId}` : '/api/admin/plans';
    const method = editingPlanId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setEditingPlanId(null);
      setPlanName('');
      setPlanMonthly('0');
      setPlanYearly('0');
      setPlanFeaturesText('');
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', 'تم حفظ باقة الاشتراك.');
    } else {
      showToast('err', res.error || 'تعذر حفظ الباقة.');
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/revenue', {
      method: 'POST',
      body: JSON.stringify({
        sourceType: revSource,
        description: revDesc,
        amountEgp: Number(revAmount) || 0,
        entryDate: revDate,
      }),
    });
    if (res.ok) {
      setRevDesc('');
      setRevAmount('');
      await loadAllAdminData();
      showToast('ok', 'تم تسجيل بند الإيراد.');
    } else {
      showToast('err', res.error || 'تعذر تسجيل الإيراد.');
    }
  };

  const handleUpdatePage = async (page: PageConfig) => {
    const res = await adminFetch(`/api/admin/pages/${page.slug}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        heroHeading: page.heroHeading,
        heroBody: page.heroBody,
        isEnabled: page.isEnabled,
      }),
    });
    if (res.ok) {
      await Promise.all([loadAllAdminData(), refreshBootstrap()]);
      showToast('ok', `تم حفظ إعدادات صفحة (${page.title}).`);
    } else {
      showToast('err', res.error || 'تعذر تحديث الصفحة.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    if (res.ok) {
      setCurrentPwd('');
      setNewPwd('');
      showToast('ok', 'تم تحديث كلمة مرور الإدارة بنجاح.');
    } else {
      showToast('err', res.error || 'تعذر تغيير كلمة المرور.');
    }
  };

  const selectedPage = pagesList.find((p) => p.slug === selectedPageSlug) || pagesList[0];

  const previewSlotObj: AdSlot = {
    id: editingAdId || 'preview',
    name: adName || 'معاينة الإعلان',
    placement: adPlacement,
    adType,
    adsenseClient: adClient || settingsForm?.googleAdsenseClient,
    adsenseSlot: adSlotCode,
    adsenseFormat: adFormat,
    directTitle: adDirectTitle,
    directDescription: adDirectDesc,
    directImageUrl: adDirectImg,
    directLinkUrl: adDirectLink,
    isActive: true,
    impressionsCount: 0,
    clicksCount: 0,
    updatedAt: new Date().toISOString(),
  };

  const unreadCount = stats?.inbox.unreadMessages ?? messages.filter((m) => m.status === 'new').length;
  const filteredMessages = messages.filter((m) => (msgFilter === 'all' ? true : m.status === msgFilter));

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] text-[#11161F] dark:text-[#F3F5F8] flex flex-col">
      <PageSEO title="لوحة إدارة المنصة والأرباح | SASA STORE OMOR" noIndex />

      {/* Admin Portal Header */}
      <header className="sticky top-0 z-30 border-b border-[#DCE0E7] dark:border-[#252C38] bg-white/95 dark:bg-[#10151F]/95 backdrop-blur-md px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo compact />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37] text-xs font-extrabold">
            <Shield className="w-3.5 h-3.5" />
            لوحة تحكم المالك
          </span>
          <span className="hidden md:inline text-xs text-[#7A8394] font-mono-code truncate" dir="ltr">
            {adminStatus.email}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadAllAdminData()}
            disabled={loadingData}
            className="min-h-[38px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#D4AF37]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <Link
            to="/welcome"
            target="_blank"
            className="min-h-[38px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#D4AF37]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">معاينة الموقع</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#D5DBE5] dark:border-[#333C4B]"
            aria-label="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => void adminLogout()}
            className="min-h-[38px] px-3 rounded-xl bg-rose-600/10 text-rose-500 border border-rose-500/30 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-600/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {toast && (
        <div
          className={`fixed bottom-5 left-5 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold border ${
            toast.type === 'ok'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(
            [
              ['overview', 'الإحصائيات والأرباح', BarChart3],
              ['monetization', 'المدفوعات والأرباح Pro', Wallet],
              ['articles', 'المقالات والتصنيفات', FileText],
              ['ads', 'الإعلانات و AdSense', Megaphone],
              ['affiliates', 'التسويق بالعمولة', ShoppingBag],
              ['plans', 'الاشتراكات المستقبلية', CreditCard],
              ['messages', `رسائل المستخدمين${unreadCount > 0 ? ` (${unreadCount})` : ''}`, Mail],
              ['pages_settings', 'الصفحات والأقسام و SEO', Layers],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`min-h-[42px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === key
                  ? 'bg-[#D4AF37] text-[#0B1220]'
                  : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8] hover:border-[#D4AF37]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & REVENUE */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Quick Section Switches */}
            {settingsForm && (
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
                <div className="text-xs font-bold text-[#687182] dark:text-[#8E97A8]">
                  التحكم السريع في تفعيل/إيقاف أقسام المنصة:
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['articles', 'المقالات'],
                      ['offers', 'العروض والأفلييت'],
                      ['ads', 'الإعلانات'],
                      ['market', 'السوق الموثق'],
                      ['technicians', 'الفنيون'],
                      ['v3Tools', 'أدوات V3'],
                    ] as const
                  ).map(([flagKey, label]) => {
                    const active = settingsForm.sectionFlags[flagKey];
                    return (
                      <button
                        key={flagKey}
                        type="button"
                        onClick={() => void handleQuickToggleFlag(flagKey)}
                        className={`min-h-[36px] px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                          active
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'border-[#D5DBE5] dark:border-[#333C4B] bg-[#EEF0F4] dark:bg-[#0B1220] text-[#687182] dark:text-[#8E97A8]'
                        }`}
                      >
                        {label}: {active ? 'مفعّل' : 'متوقف'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visitor & Platform KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['زيارات اليوم (24 ساعة)', stats.visitors.today],
                ['زيارات الأسبوع (7 أيام)', stats.visitors.week],
                ['زيارات الشهر (30 يومًا)', stats.visitors.month],
                ['الزوار الفريدون', stats.visitors.uniqueVisitors],
                ['المقالات المنشورة', stats.content.publishedArticles],
                ['ظهور الإعلانات', stats.monetization.totalAdImpressions],
                ['نقرات العروض (أفلييت)', stats.monetization.totalAffiliateClicks],
                ['رسائل جديدة غير مقروءة', stats.inbox.unreadMessages],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4"
                >
                  <div className="text-xs text-[#687182] dark:text-[#8E97A8]">{label}</div>
                  <div className="mt-1.5 text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8] tabular-nums">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Top Visited Paths */}
              <div className="lg:col-span-5 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">أكثر الصفحات زيارة</h2>
                  <span className="text-xs text-[#7A8394] tabular-nums">
                    المستخدمون المحليون: {demoUsers.length} · الأجهزة: {demoDevices.length}
                  </span>
                </div>
                {stats.visitors.topPaths.length === 0 ? (
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8]">ستظهر إحصائيات المسارات فور تصفح الزوار للصفحات العامة.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.visitors.topPaths.map((p) => {
                      const max = Math.max(1, stats.visitors.topPaths[0]?.count || 1);
                      const pct = Math.round((p.count / max) * 100);
                      return (
                        <div key={p.path} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono-code text-[#363E4D] dark:text-[#DCE1EA]" dir="ltr">
                              {p.path}
                            </span>
                            <span className="font-bold tabular-nums">{p.count} زيارة</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#EEF0F4] dark:bg-[#0B1220] overflow-hidden">
                            <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Revenue Tracker */}
              <div className="lg:col-span-7 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                    <h2 className="text-sm font-bold">متابعة الأرباح ومصادر الدخل</h2>
                  </div>
                  <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    إجمالي المسجل: {formatCurrency(stats.monetization.totalRecordedRevenueEgp)} · عمولة أفلييت تقديرية:{' '}
                    {formatCurrency(stats.monetization.estimatedAffiliateEarningsEgp)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    ['AdSense', stats.monetization.revenueBySource.adsense || 0],
                    ['أفلييت', stats.monetization.revenueBySource.affiliate || 0],
                    ['إعلان مباشر', stats.monetization.revenueBySource.direct_ad || 0],
                    ['اشتراكات', stats.monetization.revenueBySource.subscription || 0],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <div className="text-[#687182] dark:text-[#8E97A8]">{k}</div>
                      <div className="font-bold mt-0.5 tabular-nums">{formatCurrency(Number(v))}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddRevenue} className="grid sm:grid-cols-4 gap-2 pt-2">
                  <select
                    value={revSource}
                    onChange={(e) => setRevSource(e.target.value as RevenueEntry['sourceType'])}
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 text-xs"
                  >
                    <option value="adsense">Google AdSense</option>
                    <option value="affiliate">عمولة أفلييت</option>
                    <option value="direct_ad">إعلان مباشر</option>
                    <option value="subscription">اشتراك باقة</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={revDesc}
                    onChange={(e) => setRevDesc(e.target.value)}
                    placeholder="الوصف (مثال: دفعة شهر مايو)"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
                  />
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={revAmount}
                    onChange={(e) => setRevAmount(e.target.value)}
                    placeholder="المبلغ بالجنيه"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                  >
                    + تسجيل إيراد
                  </button>
                </form>

                {revenueEntries.length > 0 && (
                  <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] max-h-48 overflow-y-auto text-xs">
                    {revenueEntries.map((r) => (
                      <div key={r.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold">{r.description}</span> ·{' '}
                          <span className="text-[#7A8394]">{r.entryDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-500 tabular-nums">
                            {formatCurrency(r.amountEgp)}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(`/api/admin/revenue/${r.id}`, { method: 'DELETE' });
                              await loadAllAdminData();
                            }}
                            className="text-rose-500 hover:opacity-80"
                            aria-label="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ARTICLES & CATEGORIES */}
        {activeTab === 'articles' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingArticleId ? 'تعديل المقال' : 'نشر مقال أو دليل جديد'}
                </h2>
                {editingArticleId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingArticleId(null);
                      setArtTitle('');
                      setArtSlug('');
                      setArtExcerpt('');
                      setArtContent('');
                      setArtCoverUrl('');
                    }}
                    className="text-xs text-[#687182] dark:text-[#8E97A8] underline"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveArticle} className="space-y-3.5 text-xs">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">عنوان المقال *</label>
                    <input
                      type="text"
                      required
                      value={artTitle}
                      onChange={(e) => {
                        setArtTitle(e.target.value);
                        if (!editingArticleId && !artSlug) {
                          setArtSlug(slugifyTitle(e.target.value));
                        }
                      }}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">الرابط المختصر (Slug) *</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={artSlug}
                      onChange={(e) => setArtSlug(e.target.value)}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium mb-1">التصنيف</label>
                    <select
                      value={artCategoryId}
                      onChange={(e) => setArtCategoryId(e.target.value)}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                    >
                      <option value="">بدون تصنيف</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">الحالة</label>
                    <select
                      value={artStatus}
                      onChange={(e) => setArtStatus(e.target.value as ArticleStatus)}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                    >
                      <option value="published">منشور (Published)</option>
                      <option value="draft">مسودة (Draft)</option>
                      <option value="hidden">مخفي (Hidden)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">اسم الكاتب</label>
                    <input
                      type="text"
                      required
                      value={artAuthor}
                      onChange={(e) => setArtAuthor(e.target.value)}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">صورة الغلاف (رابط أو رفع من جهازك)</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={artCoverUrl}
                      onChange={(e) => setArtCoverUrl(e.target.value)}
                      placeholder="https://... أو ارفع صورة"
                      className="flex-1 min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                    <label className="min-h-[40px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] inline-flex items-center gap-1.5 cursor-pointer hover:border-[#D4AF37]">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            setArtCoverUrl(await readImageAsDataUrl(f));
                          } catch (err) {
                            showToast('err', err instanceof Error ? err.message : 'خطأ في الصورة');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">الملخص (Excerpt) *</label>
                  <textarea
                    rows={2}
                    required
                    value={artExcerpt}
                    onChange={(e) => setArtExcerpt(e.target.value)}
                    className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">محتوى المقال الكامل *</label>
                  <textarea
                    rows={7}
                    required
                    value={artContent}
                    onChange={(e) => setArtContent(e.target.value)}
                    className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 leading-relaxed"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={artSeoTitle}
                    onChange={(e) => setArtSeoTitle(e.target.value)}
                    placeholder="عنوان SEO مخصص (اختياري)"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="text"
                    value={artSeoDesc}
                    onChange={(e) => setArtSeoDesc(e.target.value)}
                    placeholder="وصف Meta Description (اختياري)"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={artShowOnHome}
                    onChange={(e) => setArtShowOnHome(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>عرض في قسم المقالات بالصفحة الرئيسية</span>
                </label>

                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingArticleId ? 'حفظ التعديلات' : 'حفظ ونشر / مسودة'}</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 space-y-6">
              {/* Categories Box */}
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
                <h3 className="text-sm font-bold">إدارة الأقسام والتصنيفات</h3>
                <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2 text-xs">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="اسم التصنيف"
                    className="flex-1 min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="slug"
                    className="w-28 min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-3 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
                  {categories.map((c) => (
                    <div key={c.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold">{c.name}</span>{' '}
                        <span className="text-[#7A8394] font-mono-code">({c.slug})</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                          await Promise.all([loadAllAdminData(), refreshBootstrap()]);
                        }}
                        className="text-rose-500"
                        aria-label="حذف التصنيف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Articles List */}
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
                <h3 className="text-sm font-bold">جميع المقالات ({articles.length})</h3>
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] max-h-[480px] overflow-y-auto text-xs">
                  {articles.map((art) => (
                    <div key={art.id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{art.title}</div>
                          <div className="text-[11px] text-[#7A8394]">
                            {art.categoryName || 'عام'} · {art.viewsCount} مشاهدة ·{' '}
                            <span
                              className={
                                art.status === 'published'
                                  ? 'text-emerald-500 font-bold'
                                  : art.status === 'draft'
                                    ? 'text-amber-500 font-bold'
                                    : 'text-[#7A8394]'
                              }
                            >
                              {art.status === 'published' ? 'منشور' : art.status === 'draft' ? 'مسودة' : 'مخفي'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditArticle(art)}
                          className="px-2.5 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-semibold"
                        >
                          تعديل
                        </button>
                        {art.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => void handleQuickArticleStatus(art, 'published')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 font-semibold"
                          >
                            نشر
                          </button>
                        )}
                        {art.status === 'published' && (
                          <button
                            type="button"
                            onClick={() => void handleQuickArticleStatus(art, 'hidden')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 font-semibold"
                          >
                            إخفاء
                          </button>
                        )}
                        <Link
                          to={`/articles/${encodeURIComponent(art.slug)}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg text-[#8F6D14] dark:text-[#D4AF37]"
                        >
                          معاينة
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDeleteArticle(art.id)}
                          className="px-2 py-1 text-rose-500 mr-auto"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADS & GOOGLE ADSENSE */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            {settingsForm && (
              <div className="rounded-2xl border border-[#D4AF37]/35 bg-white dark:bg-[#141923] p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-bold">إعداد Google AdSense العام للموقع</div>
                  <p className="text-[#687182] dark:text-[#8E97A8]">
                    أدخل معرّف الناشر الخاص بك بعد قبول حسابك في Google AdSense وفعّله عندما تكون جاهزًا.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.googleAdsenseClient || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, googleAdsenseClient: e.target.value })
                    }
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs font-mono-code"
                  />
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.adsenseEnabled}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, adsenseEnabled: e.target.checked })
                      }
                      className="accent-[#D4AF37]"
                    />
                    <span>تفعيل Google AdSense</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => void handleSaveSettings(e)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">
                    {editingAdId ? 'تعديل وحدة إعلانية' : 'إضافة مكان / وحدة إعلانية'}
                  </h2>
                  {editingAdId && (
                    <button
                      type="button"
                      onClick={() => setEditingAdId(null)}
                      className="text-xs text-[#687182] dark:text-[#8E97A8] underline"
                    >
                      إلغاء
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveAdSlot} className="space-y-3.5 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">اسم الوحدة الإعلانية *</label>
                      <input
                        type="text"
                        required
                        value={adName}
                        onChange={(e) => setAdName(e.target.value)}
                        placeholder="مثال: إعلان أعلى المقال"
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">مكان الظهور *</label>
                      <select
                        value={adPlacement}
                        onChange={(e) => setAdPlacement(e.target.value as AdPlacement)}
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                      >
                        {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['adsense', 'إعلان Google AdSense'],
                        ['direct', 'إعلان مباشر (بانر / راعي)'],
                      ] as const
                    ).map(([t, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdType(t)}
                        className={`min-h-[40px] rounded-xl border font-bold ${
                          adType === t
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'
                            : 'border-[#D5DBE5] dark:border-[#333C4B]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {adType === 'adsense' ? (
                    <div className="space-y-3 rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
                      <div>
                        <label className="block font-medium mb-1">
                          الصق كود AdSense هنا لاستخراج المعرّفات تلقائيًا (اختياري)
                        </label>
                        <textarea
                          rows={2}
                          dir="ltr"
                          value={adSnippetPaste}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdSnippetPaste(val);
                            const parsed = extractAdsenseSnippet(val);
                            if (parsed.client) setAdClient(parsed.client);
                            if (parsed.slot) setAdSlotCode(parsed.slot);
                            if (parsed.format) setAdFormat(parsed.format);
                          }}
                          placeholder='<ins class="adsbygoogle" data-ad-client="ca-pub-..." data-ad-slot="1234567890"></ins>'
                          className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] p-2.5 font-mono-code text-[11px]"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={adClient}
                          onChange={(e) => setAdClient(e.target.value)}
                          placeholder="ca-pub-..."
                          className="min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          value={adSlotCode}
                          onChange={(e) => setAdSlotCode(e.target.value)}
                          placeholder="Ad Slot ID"
                          className="min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          value={adFormat}
                          onChange={(e) => setAdFormat(e.target.value)}
                          placeholder="auto / horizontal"
                          className="min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
                      <input
                        type="text"
                        value={adDirectTitle}
                        onChange={(e) => setAdDirectTitle(e.target.value)}
                        placeholder="عنوان الإعلان المباشر"
                        className="w-full min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                      />
                      <input
                        type="text"
                        value={adDirectDesc}
                        onChange={(e) => setAdDirectDesc(e.target.value)}
                        placeholder="وصف قصير للإعلان"
                        className="w-full min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={adDirectLink}
                        onChange={(e) => setAdDirectLink(e.target.value)}
                        placeholder="رابط الوجهة https://..."
                        className="w-full min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={adDirectImg}
                          onChange={(e) => setAdDirectImg(e.target.value)}
                          placeholder="صورة الإعلان (اختياري)"
                          className="flex-1 min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        />
                        <label className="min-h-[38px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] inline-flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) setAdDirectImg(await readImageAsDataUrl(f));
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adActive}
                      onChange={(e) => setAdActive(e.target.checked)}
                      className="accent-[#D4AF37]"
                    />
                    <span>الإعلان فعّال (Active)</span>
                  </label>

                  <button
                    type="submit"
                    className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الوحدة الإعلانية</span>
                  </button>
                </form>

                {/* Live Preview */}
                <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] space-y-2">
                  <div className="text-xs font-bold text-[#687182] dark:text-[#8E97A8]">معاينة مكان وشكل الإعلان:</div>
                  <AdSlotBanner placement={adPlacement} previewSlot={previewSlotObj} />
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-3">
                <h3 className="text-sm font-bold">الوحدات الإعلانية الحالية ({adSlots.length})</h3>
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
                  {adSlots.map((ad) => {
                    const ctr =
                      ad.impressionsCount > 0
                        ? ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <div key={ad.id} className="py-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{ad.name}</span>
                            <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                              المكان: {PLACEMENT_LABELS[ad.placement]} · النوع:{' '}
                              {ad.adType === 'adsense' ? 'Google AdSense' : 'إعلان مباشر'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              ad.isActive
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-[#E2E6ED] dark:bg-[#1F2633] text-[#687182] dark:text-[#8E97A8]'
                            }`}
                          >
                            {ad.isActive ? 'فعال' : 'متوقف'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#687182] dark:text-[#8E97A8]">
                          <span className="tabular-nums">
                            الظهور: {ad.impressionsCount} · النقرات: {ad.clicksCount} · CTR: {ctr}%
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleToggleAdActive(ad)}
                              className="px-2.5 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-bold"
                            >
                              {ad.isActive ? 'إيقاف' : 'تفعيل'}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditAd(ad)}
                              className="px-2.5 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B]"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await adminFetch(`/api/admin/ads/${ad.id}`, { method: 'DELETE' });
                                await Promise.all([loadAllAdminData(), refreshBootstrap()]);
                              }}
                              className="text-rose-500"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AFFILIATE MARKETING */}
        {activeTab === 'affiliates' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingAffId ? 'تعديل منتج تسويق بالعمولة' : 'إضافة منتج / عرض أفلييت'}
                </h2>
                {editingAffId && (
                  <button
                    type="button"
                    onClick={() => setEditingAffId(null)}
                    className="text-xs text-[#687182] dark:text-[#8E97A8] underline"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAffiliate} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  value={affTitle}
                  onChange={(e) => setAffTitle(e.target.value)}
                  placeholder="اسم المنتج"
                  className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={affCat}
                    onChange={(e) => setAffCat(e.target.value)}
                    placeholder="التصنيف"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="text"
                    required
                    value={affNetwork}
                    onChange={(e) => setAffNetwork(e.target.value)}
                    placeholder="المتجر / الشبكة"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    required
                    min="0"
                    value={affPrice}
                    onChange={(e) => setAffPrice(e.target.value)}
                    placeholder="السعر (ج.م)"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="number"
                    min="0"
                    value={affOldPrice}
                    onChange={(e) => setAffOldPrice(e.target.value)}
                    placeholder="قبل الخصم"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={affCommPct}
                    onChange={(e) => setAffCommPct(e.target.value)}
                    placeholder="نسبة العمولة %"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                </div>
                <input
                  type="url"
                  required
                  dir="ltr"
                  value={affUrl}
                  onChange={(e) => setAffUrl(e.target.value)}
                  placeholder="رابط الشراء / الأفلييت https://..."
                  className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={affImg}
                    onChange={(e) => setAffImg(e.target.value)}
                    placeholder="رابط صورة المنتج أو ارفع ملف"
                    className="flex-1 min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <label className="min-h-[40px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] inline-flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setAffImg(await readImageAsDataUrl(f));
                      }}
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  required
                  value={affDesc}
                  onChange={(e) => setAffDesc(e.target.value)}
                  placeholder="وصف مختصر للمنتج ومميزاته..."
                  className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                />
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={affFeatured}
                      onChange={(e) => setAffFeatured(e.target.checked)}
                      className="accent-[#D4AF37]"
                    />
                    <span>مميز بالرئيسية</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={affActive}
                      onChange={(e) => setAffActive(e.target.checked)}
                      className="accent-[#D4AF37]"
                    />
                    <span>منشور في صفحة العروض</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ المنتج</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-3">
              <h3 className="text-sm font-bold">قائمة منتجات الأفلييت وتتبّع النقرات ({affiliates.length})</h3>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
                {affiliates.map((item) => (
                  <div key={item.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{item.title}</div>
                      <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                        {formatCurrency(item.priceEgp)} · عمولة {item.commissionRatePct}% · {item.networkLabel} ·{' '}
                        <strong className="text-[#8F6D14] dark:text-[#D4AF37]">{item.clicksCount} نقرة</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditAffiliate(item)}
                        className="px-2.5 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B]"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/affiliates/${item.id}`, { method: 'DELETE' });
                          await Promise.all([loadAllAdminData(), refreshBootstrap()]);
                        }}
                        className="text-rose-500"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUBSCRIPTION PLANS (FUTURE MONETIZATION) */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {settingsForm && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                  <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    جاهزية الاشتراكات والخدمات المدفوعة مستقبلًا
                  </div>
                  <p className="text-[#4A5363] dark:text-[#C5CCD8]">
                    يمكنك تصميم وتعديل الباقات الآن، وإبقاؤها غير مفعّلة للدفع لحين ربط بوابة الدفع واختبارها.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.paidPlansEnabled}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, paidPlansEnabled: e.target.checked })
                      }
                      className="accent-[#D4AF37]"
                    />
                    <span>إظهار صفحة الباقات في «من نحن»</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => void handleSaveSettings(e)}
                    className="min-h-[38px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                <h2 className="text-base font-bold">{editingPlanId ? 'تعديل باقة' : 'إنشاء باقة اشتراك'}</h2>
                <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="اسم الباقة"
                    className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <select
                    value={planRole}
                    onChange={(e) => setPlanRole(e.target.value as SubscriptionPlan['targetRole'])}
                    className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  >
                    <option value="user">للأفراد</option>
                    <option value="technician">للفنيين ومراكز الصيانة</option>
                    <option value="store">للمتاجر</option>
                    <option value="enterprise">للشركات (B2B)</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={planMonthly}
                      onChange={(e) => setPlanMonthly(e.target.value)}
                      placeholder="السعر الشهري (ج.م)"
                      className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                    <input
                      type="number"
                      min="0"
                      value={planYearly}
                      onChange={(e) => setPlanYearly(e.target.value)}
                      placeholder="السعر السنوي (ج.م)"
                      className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                  </div>
                  <textarea
                    rows={4}
                    value={planFeaturesText}
                    onChange={(e) => setPlanFeaturesText(e.target.value)}
                    placeholder="المميزات (ميزة واحدة في كل سطر)"
                    className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planActive}
                        onChange={(e) => setPlanActive(e.target.checked)}
                        className="accent-[#D4AF37]"
                      />
                      <span>باقة نشطة</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planBilling}
                        onChange={(e) => setPlanBilling(e.target.checked)}
                        className="accent-[#D4AF37]"
                      />
                      <span>تفعيل الدفع لهذه الباقة</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                  >
                    حفظ الباقة
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#EEF0F4] dark:bg-[#0B1220]">
                          {p.billingEnabled ? 'دفع مفعّل' : 'دفع متوقف'}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                        {formatCurrency(p.priceMonthlyEgp)} / شهر
                      </div>
                      <ul className="space-y-1 text-[#687182] dark:text-[#8E97A8]">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-[#E8EBF0] dark:border-[#222834]">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanId(p.id);
                          setPlanName(p.name);
                          setPlanRole(p.targetRole);
                          setPlanMonthly(String(p.priceMonthlyEgp));
                          setPlanYearly(String(p.priceYearlyEgp));
                          setPlanBilling(p.billingEnabled);
                          setPlanActive(p.isActive);
                          setPlanFeaturesText(p.features.join('\n'));
                        }}
                        className="px-3 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-bold"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/plans/${p.id}`, { method: 'DELETE' });
                          await Promise.all([loadAllAdminData(), refreshBootstrap()]);
                        }}
                        className="text-rose-500 mr-auto"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CONTACT INBOX */}
        {activeTab === 'messages' && (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold">صندوق رسائل «تواصل معنا» ({messages.length})</h2>
              <div className="flex gap-1.5 text-xs">
                {(
                  [
                    ['all', 'الكل'],
                    ['new', 'جديد'],
                    ['read', 'مقروء'],
                    ['replied', 'تم الرد'],
                    ['archived', 'مؤرشف'],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMsgFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold ${
                      msgFilter === st
                        ? 'bg-[#D4AF37] text-[#0B1220]'
                        : 'border border-[#D5DBE5] dark:border-[#333C4B]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <p className="text-xs text-[#687182] dark:text-[#8E97A8] py-8 text-center">لا توجد رسائل ضمن هذا التصنيف حاليًا.</p>
            ) : (
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
                {filteredMessages.map((m) => (
                  <div key={m.id} className="py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-[#11161F] dark:text-[#F3F5F8]">{m.subject}</span>
                        <div className="text-[#687182] dark:text-[#8E97A8] mt-0.5">
                          من: <strong>{m.senderName}</strong> ·{' '}
                          <span dir="ltr" className="font-mono-code">{m.senderEmail}</span>
                          {m.senderPhone ? ` · ${m.senderPhone}` : ''}
                        </div>
                      </div>
                      <span className="text-[#7A8394] tabular-nums">{formatArabicDateTime(m.createdAt)}</span>
                    </div>

                    <p className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-[#363E4D] dark:text-[#DCE1EA] leading-relaxed whitespace-pre-line">
                      {m.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={m.status}
                        onChange={async (e) => {
                          await adminFetch(`/api/admin/messages/${m.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              status: e.target.value,
                              adminNote: noteEdits[m.id] ?? m.adminNote,
                            }),
                          });
                          await loadAllAdminData();
                        }}
                        className="min-h-[36px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                      >
                        <option value="new">جديد</option>
                        <option value="read">مقروء</option>
                        <option value="replied">تم الرد</option>
                        <option value="archived">مؤرشف</option>
                      </select>

                      <input
                        type="text"
                        value={noteEdits[m.id] ?? m.adminNote ?? ''}
                        onChange={(e) => setNoteEdits({ ...noteEdits, [m.id]: e.target.value })}
                        placeholder="ملاحظة إدارية داخلية..."
                        className="flex-1 min-h-[36px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />

                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/messages/${m.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              status: m.status,
                              adminNote: noteEdits[m.id] ?? m.adminNote ?? '',
                            }),
                          });
                          await loadAllAdminData();
                          showToast('ok', 'تم حفظ الملاحظة.');
                        }}
                        className="min-h-[36px] px-3 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                      >
                        حفظ الملاحظة
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
                          await loadAllAdminData();
                        }}
                        className="min-h-[36px] px-3 rounded-xl text-rose-500 border border-rose-500/30"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PAGES, SETTINGS, SEO & SECURITY */}
        {activeTab === 'pages_settings' && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Site Settings & SEO */}
            {settingsForm && (
              <div className="lg:col-span-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-base font-bold">إعدادات الموقع والهوية و SEO</h2>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">اسم العلامة (Prefix)</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.siteBrandPrefix}
                        onChange={(e) => setSettingsForm({ ...settingsForm, siteBrandPrefix: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">اسم المنصة</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.siteName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">الشعار اللفظي (Slogan)</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.slogan}
                      onChange={(e) => setSettingsForm({ ...settingsForm, slogan: e.target.value })}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">صورة الشعار المخصص (Logo — اتركه فارغًا للشعار الافتراضي)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={settingsForm.logoUrl || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                        placeholder="https://... أو ارفع صورة"
                        className="flex-1 min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                      <label className="min-h-[40px] px-3 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] inline-flex items-center gap-1 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) setSettingsForm({ ...settingsForm, logoUrl: await readImageAsDataUrl(f) });
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">هاتف الدعم</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={settingsForm.contactPhone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">بريد التواصل</label>
                      <input
                        type="email"
                        dir="ltr"
                        value={settingsForm.contactEmail}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">الدومين المخصص (SEO Canonical)</label>
                      <input
                        type="url"
                        dir="ltr"
                        value={settingsForm.customDomain || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customDomain: e.target.value })}
                        placeholder="https://omor.sasastore.com"
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">رمز تحقق Google Search Console</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={settingsForm.googleSearchConsoleToken || ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, googleSearchConsoleToken: e.target.value })
                        }
                        placeholder="verification meta content"
                        className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">عنوان SEO الافتراضي</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.seoDefaultTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, seoDefaultTitle: e.target.value })}
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">وصف SEO الافتراضي</label>
                    <textarea
                      rows={2}
                      required
                      value={settingsForm.seoDefaultDescription}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, seoDefaultDescription: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="submit"
                      className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ إعدادات الموقع</span>
                    </button>
                    <div className="flex gap-3 text-[11px] font-mono-code" dir="ltr">
                      <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">
                        /sitemap.xml
                      </a>
                      <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">
                        /robots.txt
                      </a>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="lg:col-span-6 space-y-6">
              {/* Page Editor */}
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                <h2 className="text-base font-bold">التحكم في صفحات الموقع ومحتواها</h2>
                <div className="flex flex-wrap gap-1.5">
                  {pagesList.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setSelectedPageSlug(p.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        selectedPage?.slug === p.slug
                          ? 'bg-[#D4AF37] text-[#0B1220]'
                          : 'border border-[#D5DBE5] dark:border-[#333C4B]'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                {selectedPage && (
                  <div className="space-y-3 text-xs pt-2">
                    <label className="flex items-center justify-between py-1 font-bold">
                      <span>تفعيل هذه الصفحة للزوار</span>
                      <input
                        type="checkbox"
                        checked={selectedPage.isEnabled}
                        onChange={(e) =>
                          setPagesList((prev) =>
                            prev.map((item) =>
                              item.slug === selectedPage.slug
                                ? { ...item, isEnabled: e.target.checked }
                                : item
                            )
                          )
                        }
                        className="accent-[#D4AF37]"
                      />
                    </label>
                    <input
                      type="text"
                      value={selectedPage.heroHeading}
                      onChange={(e) =>
                        setPagesList((prev) =>
                          prev.map((item) =>
                            item.slug === selectedPage.slug
                              ? { ...item, heroHeading: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="العنوان الرئيسي للصفحة"
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                    <textarea
                      rows={3}
                      value={selectedPage.heroBody}
                      onChange={(e) =>
                        setPagesList((prev) =>
                          prev.map((item) =>
                            item.slug === selectedPage.slug ? { ...item, heroBody: e.target.value } : item
                          )
                        )
                      }
                      placeholder="النص التمهيدي للصفحة"
                      className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                    />
                    <input
                      type="text"
                      value={selectedPage.metaTitle}
                      onChange={(e) =>
                        setPagesList((prev) =>
                          prev.map((item) =>
                            item.slug === selectedPage.slug ? { ...item, metaTitle: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Meta Title (SEO)"
                      className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                    />
                    <textarea
                      rows={2}
                      value={selectedPage.metaDescription}
                      onChange={(e) =>
                        setPagesList((prev) =>
                          prev.map((item) =>
                            item.slug === selectedPage.slug
                              ? { ...item, metaDescription: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Meta Description (SEO)"
                      className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                    />
                    <button
                      type="button"
                      onClick={() => void handleUpdatePage(selectedPage)}
                      className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                    >
                      حفظ صفحة «{selectedPage.title}»
                    </button>
                  </div>
                )}
              </div>

              {/* Change Admin Password */}
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-sm font-bold">تغيير كلمة مرور مدير الموقع</h2>
                </div>
                <form onSubmit={handleChangePassword} className="grid sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="كلمة المرور الحالية"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    dir="ltr"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl border border-[#D4AF37] text-[#8F6D14] dark:text-[#D4AF37] font-bold"
                  >
                    تحديث كلمة المرور
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MONETIZATION & PAYMENTS CENTER */}
        {activeTab === 'monetization' && (
          <AdminMonetizationCenter authMode="cms" cmsAdminFetch={adminFetch} />
        )}
      </div>
    </div>
  );
};

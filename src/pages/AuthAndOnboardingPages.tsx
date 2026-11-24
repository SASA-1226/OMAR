import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { AdSlotBanner } from '../components/AdSlotBanner';
import { BrandLogo } from '../components/BrandLogo';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { OmorAIAssistantDrawer } from '../components/OmorAIAssistantDrawer';
import { PageSEO } from '../components/PageSEO';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { SasaStoreAdBanner } from '../components/SasaStoreAdBanner';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import { useApp } from '../context/AppContext';
import { useCms } from '../context/CmsContext';
import { EGYPT_CITIES, formatArabicDate, formatCurrency } from '../lib/labels';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../lib/validation';

export const SplashScreen: React.FC = () => {
  const { currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingAuth) return;
    const timer = setTimeout(() => {
      navigate(currentUser ? '/dashboard' : '/welcome', { replace: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [currentUser, isLoadingAuth, navigate]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F3F5F8] flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <BrandLogo size="lg" onDark />
        <p className="mt-4 text-sm text-[#C5CCD8] font-medium">
          كل جهاز له حكاية.. وكل حكاية لها سجل.
        </p>
        <div className="mt-8 w-40 h-1 rounded-full bg-[#232A38] overflow-hidden">
          <div className="h-full w-2/3 bg-[#D4AF37] animate-pulse rounded-full" />
        </div>
        <button
          type="button"
          onClick={() => navigate(currentUser ? '/dashboard' : '/welcome', { replace: true })}
          className="mt-8 text-xs text-[#7A8394] hover:text-[#D4AF37] transition-colors"
        >
          تخطي والمتابعة
        </button>
      </div>
    </div>
  );
};

export const WelcomePage: React.FC = () => {
  const { currentUser, theme, toggleTheme } = useApp();
  const { settings, getPageConfig, articles, affiliates } = useCms();

  const homePage = getPageConfig('home');
  const homeArticles = articles.filter((a) => a.showOnHome).slice(0, 3);
  const featuredOffers = (
    affiliates.some((a) => a.isFeatured) ? affiliates.filter((a) => a.isFeatured) : affiliates
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] text-[#11161F] dark:text-[#F3F5F8] flex flex-col">
      <PageSEO
        title={homePage?.metaTitle || settings.seoDefaultTitle}
        description={homePage?.metaDescription || settings.seoDefaultDescription}
      />

      {/* Clean 3-zone Top Bar */}
      <header className="border-b border-[#DCE0E7] dark:border-[#252C38] bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/welcome" className="shrink-0">
            <BrandLogo />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#4A5363] dark:text-[#C5CCD8]">
            {settings.sectionFlags.articles && (
              <Link to="/articles" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
                المقالات والأدلة
              </Link>
            )}
            {settings.sectionFlags.offers && (
              <Link to="/offers" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
                العروض والمنتجات
              </Link>
            )}
            {settings.sectionFlags.market && (
              <Link to="/market" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
                السوق الموثق
              </Link>
            )}
            {settings.sectionFlags.technicians && (
              <Link to="/technicians" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
                مراكز الصيانة
              </Link>
            )}
            <Link to="/scan" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
              مسح QR
            </Link>
            <Link to="/platform-guide" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
              عن المنصة والمطور
            </Link>
            <Link to="/about" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
              من نحن
            </Link>
            <Link to="/contact" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8] whitespace-nowrap shrink-0">
              تواصل معنا
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-medium whitespace-nowrap"
            >
              {theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            </button>
            <Link
              to={currentUser ? '/dashboard' : '/login'}
              className="min-h-[40px] inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] transition-colors whitespace-nowrap shrink-0"
            >
              {currentUser ? 'لوحة التحكم' : 'تسجيل الدخول'}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <AdSlotBanner placement="header_top" />
      </div>

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] mb-3">
                منصة {settings.siteBrandPrefix} | {settings.siteName} للهوية الرقمية للأجهزة
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#11161F] dark:text-[#F3F5F8] leading-[1.2] text-balance">
                {homePage?.heroHeading || settings.slogan}
              </h1>
              <p className="mt-4 text-base text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed max-w-xl">
                {homePage?.heroBody ||
                  'أنشئ هوية رقمية مستقلة لأجهزتك، وثّق عمليات الصيانة والضمانات بموافقتك الكاملة، وانقل الملكية بأمان تام عند البيع أو الشراء مع حماية خصوصيتك.'}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to={currentUser ? '/devices/new' : '/register'}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-6 text-sm font-bold text-[#0B1220] hover:bg-[#E2C25B] transition-colors whitespace-nowrap"
                >
                  <span>ابدأ تسجيل جهازك مجانًا</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link
                  to="/scan"
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#C8CFD9] dark:border-[#333C4B] px-5 text-sm font-semibold text-[#1E2430] dark:text-[#DCE1EA] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633] whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4 text-[#8F6D14] dark:text-[#D4AF37]" />
                  <span>فحص جهاز عبر QR</span>
                </Link>
                <PWAInstallButton variant="full" />
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[260px] rounded-2xl overflow-hidden border border-[#DCE0E7] dark:border-[#252C38] bg-[#141923]">
                <ImageWithFallback
                  src="/src/assets/images/hero_device_vault_1795361833045.jpg"
                  alt="منصة SASA STORE OMOR للهوية الرقمية للأجهزة"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Official SASA STORE Promotional Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
          <SasaStoreAdBanner />
          <AdSlotBanner placement="home_mid" />
        </div>

        {/* Core Capabilities */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#DCE0E7] dark:border-[#252C38]">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6">
              <Smartphone className="w-6 h-6 text-[#8F6D14] dark:text-[#D4AF37] mb-3" />
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                01. هوية رقمية وQR آمن
              </h2>
              <p className="mt-2 text-sm text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">
                معرّف داخلي غير قابل للتكرار لكل جهاز مع تحكم كامل فيما يظهر للعامة وإخفاء الفواتير وIMEI تلقائيًا.
              </p>
            </div>
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6">
              <Wrench className="w-6 h-6 text-[#8F6D14] dark:text-[#D4AF37] mb-3" />
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                02. سجل صيانة غير قابل للتلاعب
              </h2>
              <p className="mt-2 text-sm text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">
                توثيق الإصلاحات من فنيين بموافقة المالك، وأي تعديل بعد الاعتماد يتطلب سجل تصحيح مستقل وواضح.
              </p>
            </div>
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6">
              <ShieldCheck className="w-6 h-6 text-[#8F6D14] dark:text-[#D4AF37] mb-3" />
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                03. سوق ونقل ملكية بموافقة الطرفين
              </h2>
              <p className="mt-2 text-sm text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">
                بيع وشراء الأجهزة اعتمادًا على تاريخها المسجل ونقل ملكيتها برمز مؤقت لمرة واحدة دون كشف بيانات المالك السابق.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Articles from CMS */}
        {settings.sectionFlags.articles && homeArticles.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#DCE0E7] dark:border-[#252C38] space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg sm:text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  أحدث الأدلة والمقالات التقنية
                </h2>
              </div>
              <Link to="/articles" className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                عرض كل المقالات
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {homeArticles.map((art) => (
                <Link
                  key={art.id}
                  to={`/articles/${encodeURIComponent(art.slug)}`}
                  className="group rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/60 transition-colors"
                >
                  <div>
                    <div className="h-40 bg-[#EEF0F4] dark:bg-[#0B1220] overflow-hidden">
                      <ImageWithFallback
                        src={art.coverImageUrl || '/src/assets/images/hero_device_vault_1795361833045.jpg'}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="text-[11px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                        {art.categoryName || 'دليل فحص'}
                      </div>
                      <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] leading-snug line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-xs text-[#4A5363] dark:text-[#8E97A8] line-clamp-2">{art.excerpt}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3 text-[11px] text-[#7A8394] tabular-nums">
                    {formatArabicDate(art.createdAt)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Affiliate Offers from CMS */}
        {settings.sectionFlags.offers && featuredOffers.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#DCE0E7] dark:border-[#252C38] space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg sm:text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  ملحقات وعروض مقترحة لحماية أجهزتك
                </h2>
              </div>
              <Link to="/offers" className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                تصفح كل العروض
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {featuredOffers.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-[#687182] dark:text-[#8E97A8]">{item.category}</div>
                    <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">{item.title}</h3>
                    <p className="text-xs text-[#4A5363] dark:text-[#8E97A8] line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8EBF0] dark:border-[#222834]">
                    <span className="text-sm font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                      {formatCurrency(item.priceEgp)}
                    </span>
                    <Link
                      to="/offers"
                      className="min-h-[36px] px-3.5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold inline-flex items-center gap-1"
                    >
                      <span>عرض السعر</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <AdSlotBanner placement="footer_banner" />
      </div>

      <footer className="border-t border-[#DCE0E7] dark:border-[#252C38] py-6 px-4 text-xs text-[#687182] dark:text-[#8E97A8]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo size="sm" />
            <span>— {settings.slogan}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SupportContactButtons variant="footer" />
            <Link to="/platform-guide" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">دليل المنصة والمطور</Link>
            <Link to="/about" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">من نحن</Link>
            <Link to="/contact" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">تواصل معنا</Link>
            <Link to="/articles" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">المقالات</Link>
            <Link to="/offers" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">العروض</Link>
            <Link to="/privacy" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">سياسة الخصوصية</Link>
            <Link to="/terms" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">الشروط والأحكام</Link>
            <Link to="/cookies" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">الكوكيز</Link>
            <Link to="/help" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">مركز المساعدة</Link>
            <Link to="/admin-portal" className="text-[#7A8394] hover:text-[#D4AF37]">بوابة الإدارة</Link>
          </div>
        </div>
      </footer>
      <OmorAIAssistantDrawer />
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { login, currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isLoadingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'بيانات الدخول غير صالحة');
      return;
    }
    setLoading(true);
    const res = await login(parsed.data.email, parsed.data.password, rememberMe);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'تعذر تسجيل الدخول');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Prominent App Icon Hero Banner */}
        <div className="rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-l from-[#141923] via-[#0B1220] to-[#141923] p-4 sm:p-5 shadow-lg flex items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/70 bg-[#0B1220] shrink-0 shadow-md">
            <img
              src="/assets/aistudio/file_00000000c7748210950721111bfbb7e2_1b9aa8fa.png"
              alt="شعار منصة SASA STORE OMOR"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
              الهوية الرقمية للأجهزة
            </span>
            <h2 className="font-display text-base sm:text-lg font-extrabold text-[#F3F5F8] truncate">
              SASA STORE | OMOR — عُمْر
            </h2>
            <p className="text-xs text-[#C5CCD8] leading-relaxed">
              كل جهاز له حكاية.. وكل حكاية لها سجل.
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <Link to="/welcome">
              <BrandLogo />
            </Link>
            <Link to="/register" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
              إنشاء حساب
            </Link>
          </div>

          <h1 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">تسجيل الدخول</h1>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
            ادخل إلى حسابك لإدارة أجهزتك وسجلات الصيانة والضمانات وحمايتها.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#363E4D] dark:text-[#C5CCD8]">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm text-[#11161F] dark:text-[#F3F5F8]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#363E4D] dark:text-[#C5CCD8]">
                  كلمة المرور
                </label>
                <Link to="/forgot-password" className="text-xs text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm text-[#11161F] dark:text-[#F3F5F8]"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#4A5363] dark:text-[#C5CCD8] cursor-pointer select-none rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6]/70 dark:bg-[#0E131C] p-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#D4AF37] rounded"
              />
              <span>
                <strong className="block text-[#11161F] dark:text-[#F3F5F8]">
                  تذكرني — ابقَ مسجل الدخول تلقائيًا
                </strong>
                <span className="block text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                  يحفظ جلستك بأمان عبر خادم المنصة حتى بعد إغلاق المتصفح أو إعادة تشغيل الهاتف أو الكمبيوتر حتى تسجل الخروج يدويًا.
                </span>
              </span>
            </label>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B] disabled:opacity-60 transition-colors"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#DCE0E7] dark:border-[#252C38] flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
            <span>مستخدم أو فني أو متجر جديد؟</span>
            <Link to="/register" className="font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
              سجّل حسابك مجانًا
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register, currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'technician' | 'store'>('user');
  const [city, setCity] = useState(EGYPT_CITIES[0]);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isLoadingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = registerSchema.safeParse({
      fullName,
      email,
      password,
      role,
      city,
      acceptTerms,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'يرجى مراجعة الحقول');
      return;
    }
    setLoading(true);
    const res = await register({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
      city: parsed.data.city,
      rememberMe,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'تعذر إنشاء الحساب');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] flex flex-col justify-center items-center p-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Link to="/welcome">
            <BrandLogo />
          </Link>
          <Link to="/login" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
            لديك حساب؟ دخول
          </Link>
        </div>

        <h1 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">إنشاء حساب جديد</h1>
        <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
          اختر نوع الحساب المناسب وابدأ في توثيق أجهزتك مجانًا.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2 text-[#363E4D] dark:text-[#C5CCD8]">
              نوع الحساب
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['user', 'مستخدم عادي'],
                  ['technician', 'فني صيانة'],
                  ['store', 'متجر أجهزة'],
                ] as const
              ).map(([r, label]) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                    role === r
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'
                      : 'border-[#D5DBE5] dark:border-[#333C4B] text-[#4A5363] dark:text-[#C5CCD8]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#363E4D] dark:text-[#C5CCD8]">
                {role === 'store' ? 'اسم المتجر' : 'الاسم الكامل'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'store' ? 'مثال: متجر المستقبل' : 'الاسم الثلاثي'}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#363E4D] dark:text-[#C5CCD8]">
                المدينة / المحافظة
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {EGYPT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#363E4D] dark:text-[#C5CCD8]">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#363E4D] dark:text-[#C5CCD8]">
              كلمة المرور (8 أحرف على الأقل)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[#4A5363] dark:text-[#C5CCD8] cursor-pointer select-none rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6]/70 dark:bg-[#0E131C] p-3">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#D4AF37] rounded"
            />
            <span>
              <strong className="block text-[#11161F] dark:text-[#F3F5F8]">
                حفظ جلسة الدخول تلقائيًا على هذا الجهاز (تذكرني)
              </strong>
              <span className="block text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                لن يُطلب منك تسجيل الدخول مرة أخرى عند إغلاق الموقع أو المتصفح إلا عند تسجيل الخروج يدويًا.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs text-[#4A5363] dark:text-[#8E97A8] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 rounded border-[#C8CFD9]"
            />
            <span>
              أوافق على{' '}
              <Link to="/terms" className="text-[#8F6D14] dark:text-[#D4AF37] underline">
                الشروط والأحكام
              </Link>{' '}
              و{' '}
              <Link to="/privacy" className="text-[#8F6D14] dark:text-[#D4AF37] underline">
                سياسة الخصوصية
              </Link>
              .
            </span>
          </label>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B] disabled:opacity-60"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'البريد غير صالح');
      return;
    }
    const res = await resetPassword(parsed.data.email);
    if (!res.ok) {
      setError(res.error || 'تعذر إرسال رابط الاستعادة');
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Link to="/welcome">
            <BrandLogo />
          </Link>
          <Link to="/login" className="text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37] inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            تسجيل الدخول
          </Link>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <KeyRound className="w-5 h-5 text-[#D4AF37]" />
          <h1 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">استعادة كلمة المرور</h1>
        </div>
        <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
          أدخل بريدك الإلكتروني المسجل لاستلام تعليمات إعادة تعيين كلمة المرور.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم استلام الطلب</span>
            </div>
            <p>
              تم تسجيل طلب استعادة كلمة المرور. إذا كان البريد مسجلاً لدينا، يرجى التواصل مع الدعم الرسمي (01214899889) لاستكمال التحقق الآمن.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
            />
            {error && <div className="text-xs text-rose-500">{error}</div>}
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B]"
            >
              إرسال رابط الاستعادة
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cookie,
  ExternalLink,
  Eye,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
} from 'lucide-react';
import { AdSlotBanner } from '../components/AdSlotBanner';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { PageSEO } from '../components/PageSEO';
import { PublicShell } from '../components/PublicShell';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import { useCms } from '../context/CmsContext';
import { formatArabicDate, formatCurrency } from '../lib/labels';
import type { ArticleItem } from '../types/cms';

const SectionDisabledNotice: React.FC<{ label: string }> = ({ label }) => (
  <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
    <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-8 space-y-3">
      <h1 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">{label}</h1>
      <p className="text-sm text-[#687182] dark:text-[#8E97A8]">
        هذا القسم غير متاح حاليًا من إعدادات إدارة الموقع. يمكنك العودة للصفحة الرئيسية أو تصفح الأقسام المتاحة.
      </p>
      <Link
        to="/welcome"
        className="inline-flex min-h-[42px] items-center px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
      >
        العودة إلى الرئيسية
      </Link>
    </div>
  </div>
);

export const AboutPage: React.FC = () => {
  const { getPageConfig, settings, plans } = useCms();
  const page = getPageConfig('about');

  if (page && !page.isEnabled) {
    return (
      <PublicShell>
        <PageSEO title="من نحن" noIndex />
        <SectionDisabledNotice label="صفحة من نحن متوقفة مؤقتًا" />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PageSEO
        title={page?.metaTitle || 'من نحن — SASA STORE | OMOR'}
        description={page?.metaDescription}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-10 space-y-4">
          <span className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
            {settings.siteBrandPrefix} · {settings.siteName}
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
            {page?.heroHeading || 'لماذا بنينا منصة عُمْر (OMOR)؟'}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
            {page?.heroBody ||
              'ولدت منصة عُمْر لحل أكبر مشكلة في سوق الأجهزة المستعملة والصيانة: غياب السجل الموثق واختلاط الأجهزة السليمة بالمجمّعة أو المسروقة.'}
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              title: 'هوية رقمية مستقلة لكل جهاز',
              body: 'منح كل هاتف أو لابتوب أو تابلت معرّف OMR موثقًا ورمز QR عام يحفظ خصوصية المالك.',
            },
            {
              title: 'سجل صيانة بموافقة المالك',
              body: 'توثيق الأعطال والقطع المستبدلة من مراكز الصيانة المعتمدة دون قابلية التلاعب أو التعديل الصامت.',
            },
            {
              title: 'سوق وتقارير فحص ذكية V3',
              body: 'تقييم السعر العادل في السوق المصري، تقارير مخاطر الشراء، وإحصائيات أسعار قطع الغيار.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-2"
            >
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">{item.title}</h2>
              <p className="text-xs sm:text-sm text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        {settings.paidPlansEnabled && plans.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">الباقات والخدمات المستقبلية</h2>
              <span className="text-xs text-[#687182] dark:text-[#8E97A8]">معاينة خطط المنصة</span>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">{plan.name}</h3>
                    <div className="text-2xl font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                      {plan.priceMonthlyEgp === 0 ? 'مجانية' : `${formatCurrency(plan.priceMonthlyEgp)} / شهريًا`}
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] border-t border-[#E8EBF0] dark:border-[#222834] pt-3">
                    {plan.billingEnabled ? 'متاحة للتفعيل عبر التواصل مع الإدارة' : 'الدفع الإلكتروني غير مفعّل حاليًا (قيد التجهيز)'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
              المطور ومؤسس المنصة
            </div>
            <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
              مصطفى محمد — صاحب صاصا ستور (SASA STORE)
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              تعرّف على فكرة المنصة بالكامل، فوائدها للمستخدمين والفنيين والمتاجر، وقصة تطويرها.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/platform-guide"
              className="min-h-[42px] inline-flex items-center px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
            >
              دليل المنصة والمطور
            </Link>
            <Link
              to="/contact"
              className="min-h-[42px] inline-flex items-center px-5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold hover:border-[#D4AF37]"
            >
              تواصل معنا الآن
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
};

export const ContactPage: React.FC = () => {
  const { getPageConfig, settings } = useCms();
  const page = getPageConfig('contact');

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentId, setSentId] = useState<string | null>(null);

  if (page && !page.isEnabled) {
    return (
      <PublicShell>
        <PageSEO title="تواصل معنا" noIndex />
        <SectionDisabledNotice label="صفحة تواصل معنا غير مفعلة حاليًا" />
      </PublicShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          senderEmail,
          senderPhone,
          subject,
          message,
          website,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'تعذر إرسال الرسالة. تأكد من الحقول.');
      } else {
        setSentId(data.id || 'OK');
        setSenderName('');
        setSenderEmail('');
        setSenderPhone('');
        setSubject('');
        setMessage('');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicShell>
      <PageSEO
        title={page?.metaTitle || 'تواصل معنا — SASA STORE | OMOR'}
        description={page?.metaDescription}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
              <h1 className="font-display text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                {page?.heroHeading || 'تواصل معنا'}
              </h1>
              <p className="text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                {page?.heroBody ||
                  'أرسل استفسارك أو طلب الإعلان أو الشراكة مباشرة إلى إدارة الموقع، وسنرد عليك عبر البريد أو الهاتف.'}
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center gap-3 text-[#363E4D] dark:text-[#DCE1EA]">
                  <Phone className="w-4 h-4 text-[#D4AF37]" />
                  <span dir="ltr" className="font-mono-code font-bold">{settings.contactPhone}</span>
                </div>
                <div className="flex items-center gap-3 text-[#363E4D] dark:text-[#DCE1EA]">
                  <Mail className="w-4 h-4 text-[#D4AF37]" />
                  <span dir="ltr" className="font-mono-code">{settings.contactEmail}</span>
                </div>
              </div>

              <div className="pt-2">
                <SupportContactButtons variant="card" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">نموذج المراسلة المباشر</h2>
              </div>

              {sentId ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تم استلام رسالتك بنجاح!</span>
                  </div>
                  <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                    وصلت رسالتك إلى صندوق وارد إدارة الموقع برقم مرجعي{' '}
                    <span className="font-mono-code font-bold" dir="ltr">{sentId}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSentId(null)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                  >
                    إرسال رسالة أخرى
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Anti-spam honeypot field */}
                  <div className="hidden" aria-hidden="true">
                    <label>
                      Website
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5">الاسم الكامل *</label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="مثال: أحمد محمد"
                        className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5">رقم الهاتف / واتساب (اختياري)</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5">الموضوع *</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="استفسار / طلب إعلان / شراكة"
                        className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5">نص الرسالة *</label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب تفاصيل استفسارك هنا..."
                      className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 text-sm"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[46px] px-6 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B] inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
};

export const CookiesPolicyPage: React.FC = () => {
  const { getPageConfig } = useCms();
  const page = getPageConfig('cookies');

  return (
    <PublicShell>
      <PageSEO
        title={page?.metaTitle || 'سياسة ملفات تعريف الارتباط (Cookies) — OMOR'}
        description={page?.metaDescription}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <Cookie className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
              {page?.heroHeading || 'سياسة ملفات تعريف الارتباط (Cookies Policy)'}
            </h1>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
            <p>
              {page?.heroBody ||
                'نوضح في هذه الصفحة كيف تستخدم منصة SASA STORE OMOR ملفات تعريف الارتباط والتخزين المحلي لتحسين تجربتك.'}
            </p>
            <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">1. ملفات ضرورية لوظائف الموقع</h2>
            <p>
              تُستخدم لحفظ تفضيل الوضع الليلي/النهاري، وتحسين سرعة التصفح، وتأمين جلسات تسجيل الدخول المستمرة للمستخدمين.
            </p>

            <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">2. إعلانات Google AdSense والشركاء</h2>
            <p>
              عند تفعيل إعلانات Google AdSense، قد يستخدم موردو الطرف الثالث — ومنهم شركة Google — ملفات تعريف ارتباط (مثل ملف DART) لعرض إعلانات بناءً على زياراتك السابقة لهذا الموقع أو لمواقع أخرى على الإنترنت.
            </p>
            <p>
              يمكنك دائمًا تعطيل الإعلانات المخصصة عبر{' '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8F6D14] dark:text-[#D4AF37] underline"
              >
                إعدادات إعلانات Google
              </a>{' '}
              أو مراجعة{' '}
              <Link to="/privacy" className="text-[#8F6D14] dark:text-[#D4AF37] underline">
                سياسة الخصوصية
              </Link>
              .
            </p>

            <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">3. روابط التسويق بالعمولة</h2>
            <p>
              عند النقر على روابط العروض والمنتجات المقترحة في صفحة العروض، قد يستخدم المتجر الخارجي ملفات تعريف ارتباط لإحالة العمولة بشكل مستقل عن منصتنا.
            </p>
          </div>
        </div>
      </div>
    </PublicShell>
  );
};

export const OffersPage: React.FC = () => {
  const { settings, getPageConfig, affiliates } = useCms();
  const page = getPageConfig('offers');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [query, setQuery] = useState('');

  const categories = useMemo(
    () => ['الكل', ...Array.from(new Set(affiliates.map((a) => a.category)))],
    [affiliates]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return affiliates.filter((item) => {
      if (selectedCategory !== 'الكل' && item.category !== selectedCategory) return false;
      if (
        q &&
        !`${item.title} ${item.description} ${item.category} ${item.networkLabel}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [affiliates, selectedCategory, query]);

  if (!settings.sectionFlags.offers || (page && !page.isEnabled)) {
    return (
      <PublicShell>
        <PageSEO title="العروض والمنتجات" noIndex />
        <SectionDisabledNotice label="قسم العروض والمنتجات متوقف مؤقتًا" />
      </PublicShell>
    );
  }

  const handleAffiliateClick = async (id: string, fallbackUrl: string) => {
    let targetUrl = fallbackUrl;
    try {
      const res = await fetch(`/api/public/track/affiliate/${encodeURIComponent(id)}`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { affiliateUrl?: string };
        if (data.affiliateUrl) targetUrl = data.affiliateUrl;
      }
    } catch {
      // Fallback to provided safe link
    }
    if (/^https?:\/\//i.test(targetUrl) || targetUrl.startsWith('/')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PublicShell>
      <PageSEO
        title={page?.metaTitle || 'العروض والمنتجات المقترحة | SASA STORE OMOR'}
        description={page?.metaDescription}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
              <ShoppingBag className="w-4 h-4" />
              <span>مختارات وعروض الأفلييت الموثوقة</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              {page?.heroHeading || 'عروض وملحقات موصى بها لأجهزتك'}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] max-w-2xl">
              {page?.heroBody}
            </p>
          </div>
          <div className="text-[11px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-[#687182] dark:text-[#8E97A8] max-w-xs">
            إفصاح الشفافية: بعض الروابط هنا هي روابط تسويق بالعمولة (Affiliate) تدعم استمرارية المنصة دون أي زيادة في السعر عليك.
          </div>
        </div>

        <AdSlotBanner placement="offers_top" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#D4AF37] text-[#0B1220]'
                    : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#7A8394] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full min-h-[40px] pr-9 pl-3 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-xs"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
            لا توجد عروض مطابقة لبحثك حاليًا.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const discountPct =
                item.oldPriceEgp && item.oldPriceEgp > item.priceEgp
                  ? Math.round(((item.oldPriceEgp - item.priceEgp) / item.oldPriceEgp) * 100)
                  : 0;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 bg-[#EEF0F4] dark:bg-[#0B1220] relative overflow-hidden">
                      <ImageWithFallback
                        src={item.imageUrl || '/src/assets/images/demo_phone_pro_1795361833294.jpg'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.isFeatured && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#D4AF37] text-[#0B1220] text-[10px] font-extrabold inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          مقترح
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                          خصم {discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#687182] dark:text-[#8E97A8]">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#D4AF37]" />
                          {item.category}
                        </span>
                        <span>{item.networkLabel}</span>
                      </div>
                      <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                        {formatCurrency(item.priceEgp)}
                      </div>
                      {item.oldPriceEgp && item.oldPriceEgp > item.priceEgp && (
                        <div className="text-[11px] text-[#7A8394] line-through tabular-nums">
                          {formatCurrency(item.oldPriceEgp)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAffiliateClick(item.id, item.affiliateUrl)}
                      className="min-h-[42px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E2C25B] text-[#0B1220] text-xs font-extrabold inline-flex items-center gap-1.5"
                    >
                      <span>شراء / معاينة</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PublicShell>
  );
};

export const ArticlesListPage: React.FC = () => {
  const { settings, getPageConfig, categories, articles } = useCms();
  const page = getPageConfig('articles');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (categoryId !== 'all' && a.categoryId !== categoryId) return false;
      if (q && !`${a.title} ${a.excerpt} ${a.authorName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, categoryId, query]);

  if (!settings.sectionFlags.articles || (page && !page.isEnabled)) {
    return (
      <PublicShell>
        <PageSEO title="المقالات والأدلة" noIndex />
        <SectionDisabledNotice label="قسم المقالات والأدلة متوقف مؤقتًا" />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PageSEO
        title={page?.metaTitle || 'المقالات والأدلة التقنية | SASA STORE OMOR'}
        description={page?.metaDescription}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 sm:p-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
            <BookOpen className="w-4 h-4" />
            <span>مدونة ومكتبة أدلة فحص الأجهزة</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
            {page?.heroHeading || 'مكتبة المعرفة وفحص الأجهزة'}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] max-w-2xl">
            {page?.heroBody}
          </p>
        </div>

        <AdSlotBanner placement="article_top" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoryId('all')}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                categoryId === 'all'
                  ? 'bg-[#D4AF37] text-[#0B1220]'
                  : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923]'
              }`}
            >
              جميع المقالات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                  categoryId === cat.id
                    ? 'bg-[#D4AF37] text-[#0B1220]'
                    : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#7A8394] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المقالات..."
              className="w-full min-h-[40px] pr-9 pl-3 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-xs"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
            لا توجد مقالات منشورة مطابقة للبحث.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((art) => (
              <Link
                key={art.id}
                to={`/articles/${encodeURIComponent(art.slug)}`}
                className="group rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/60 transition-colors"
              >
                <div>
                  <div className="h-44 bg-[#EEF0F4] dark:bg-[#0B1220] overflow-hidden">
                    <ImageWithFallback
                      src={art.coverImageUrl || '/src/assets/images/hero_device_vault_1795361833045.jpg'}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      <span className="font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                        {art.categoryName || 'دليل تقني'}
                      </span>
                      <span className="tabular-nums">{formatArabicDate(art.createdAt)}</span>
                    </div>
                    <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] leading-snug group-hover:text-[#8F6D14] dark:group-hover:text-[#D4AF37]">
                      {art.title}
                    </h2>
                    <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed line-clamp-3">
                      {art.excerpt}
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-4 pt-2 flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
                  <span>{art.authorName}</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Eye className="w-3.5 h-3.5" />
                    {art.viewsCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <AdSlotBanner placement="article_bottom" />
      </div>
    </PublicShell>
  );
};

export const ArticleDetailPage: React.FC = () => {
  const { slug = '' } = useParams();
  const { articles, affiliates, settings } = useCms();
  const [article, setArticle] = useState<ArticleItem | null>(() => {
    const match = articles.find((a) => a.slug === slug);
    return match || null;
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/public/articles/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (active) setNotFound(true);
          return;
        }
        const data = (await res.json()) as { article: ArticleItem };
        if (active) setArticle(data.article);
      })
      .catch(() => {
        const local = articles.find((a) => a.slug === slug);
        if (active && !local) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, articles]);

  if (!settings.sectionFlags.articles) {
    return (
      <PublicShell>
        <PageSEO title="المقالات" noIndex />
        <SectionDisabledNotice label="قسم المقالات متوقف مؤقتًا" />
      </PublicShell>
    );
  }

  if (notFound) {
    return (
      <PublicShell>
        <PageSEO title="المقال غير موجود" noIndex />
        <SectionDisabledNotice label="المقال المطلوب غير موجود أو غير منشور" />
      </PublicShell>
    );
  }

  const paragraphs = (article?.content || '').split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const related = articles.filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <PublicShell>
      {article && (
        <PageSEO
          title={article.seoTitle || `${article.title} | ${settings.siteName}`}
          description={article.seoDescription || article.excerpt}
          image={article.coverImageUrl}
          type="article"
          structuredData={{
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.seoDescription || article.excerpt,
            author: { '@type': 'Person', name: article.authorName },
            datePublished: article.createdAt,
            dateModified: article.updatedAt,
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          to="/articles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى المقالات والأدلة</span>
        </Link>

        <AdSlotBanner placement="article_top" />

        {loading && !article ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
            جاري تحميل المقال...
          </div>
        ) : article ? (
          <article className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden">
            {article.coverImageUrl && (
              <div className="h-60 sm:h-80 bg-[#EEF0F4] dark:bg-[#0B1220] overflow-hidden">
                <ImageWithFallback
                  src={article.coverImageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-10 space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#687182] dark:text-[#8E97A8]">
                <span className="font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                  {article.categoryName || 'دليل تقني'}
                </span>
                <span>•</span>
                <span>{article.authorName}</span>
                <span>•</span>
                <span className="tabular-nums">{formatArabicDate(article.createdAt)}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Eye className="w-3.5 h-3.5" />
                  {article.viewsCount} قراءة
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#11161F] dark:text-[#F3F5F8] leading-snug">
                {article.title}
              </h1>

              <p className="text-sm sm:text-base font-medium text-[#4A5363] dark:text-[#C5CCD8] border-r-4 border-[#D4AF37] pr-4 leading-relaxed">
                {article.excerpt}
              </p>

              <div className="pt-2 space-y-4 text-sm sm:text-base text-[#363E4D] dark:text-[#DCE1EA] leading-8 whitespace-pre-line">
                {paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
          </article>
        ) : null}

        <AdSlotBanner placement="article_bottom" />

        {settings.sectionFlags.offers && affiliates.length > 0 && (
          <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">منتجات مقترحة متعلقة بهذا الدليل</h2>
              <Link to="/offers" className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                عرض كل العروض
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {affiliates.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">{item.title}</div>
                    <div className="text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37] mt-1">
                      {formatCurrency(item.priceEgp)}
                    </div>
                  </div>
                  <Link
                    to="/offers"
                    className="min-h-[36px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] text-xs font-bold inline-flex items-center shrink-0"
                  >
                    التفاصيل
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">مقالات أخرى قد تهمك</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/articles/${encodeURIComponent(r.slug)}`}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 hover:border-[#D4AF37]/60"
                >
                  <div className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">{r.categoryName || 'مقال'}</div>
                  <div className="mt-1 text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">{r.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicShell>
  );
};

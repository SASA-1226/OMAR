import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Award,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { PageSEO } from '../components/PageSEO';
import { PublicShell } from '../components/PublicShell';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import {
  PLATFORM_TRUST_DISCLAIMER,
  TRUST_SOURCE_DESCRIPTIONS,
  TRUST_SOURCE_LABELS,
} from '../lib/labels';
import type { TrustSourceLevel } from '../types/omor';

export const PlatformGuidePage: React.FC = () => {
  const pillars = [
    {
      icon: Smartphone,
      title: '1. محفظة الأجهزة والخزينة الخاصة',
      desc: 'اجمع كل هواتفك وأجهزتك اللوحية واللابتوب في مكان واحد مع سهولة التنقل بينها، وحفظ الرقم التسلسلي وIMEI وفواتير الشراء داخل خزينة خاصة لا يراها غيرك.',
    },
    {
      icon: ShieldCheck,
      title: '2. سجل رقمي متكامل ومصدر واضح',
      desc: 'توثيق تاريخ الشراء، عمليات الصيانة المعتمدة، قطع الغيار المستبدلة، والفحوصات مع إظهار مصدر كل معلومة وتاريخ إضافتها والتمييز بين المؤكد وإدخال المستخدم.',
    },
    {
      icon: QrCode,
      title: '3. QR Code ذكي يحمي خصوصيتك',
      desc: 'لكل جهاز رابط وQR مستقل يعرض فقط ما سمحت بمشاركته، دون كشف رقمك أو IMEI، مع إمكانية إيقاف المشاركة أو تجديد الرابط وإبطال القديم فورًا.',
    },
    {
      icon: ClipboardCheck,
      title: '4. نظام فحص الجهاز قبل الشراء',
      desc: 'فحص منظم لـ 8 محاور (الشاشة، اللمس، البطارية، الكاميرات، الصوت، الشحن، الشبكة، الحساسات) مع تقرير يوضح نتائج كل بند والأجزاء التي لم تُفحص.',
    },
    {
      icon: ArrowLeftRight,
      title: '5. نقل الملكية المزدوج بأمان',
      desc: 'نقل سجل الجهاز من البائع للمشتري بموافقة الطرفين عبر رمز مؤقت، مع الحفاظ على سجل الصيانة وتاريخ الجهاز دون كشف بيانات المالك السابق.',
    },
    {
      icon: Bell,
      title: '6. مركز الإشعارات والتنبيهات',
      desc: 'تنبيهات فورية لطلبات نقل الملكية، اعتماد الصيانات، اقتراب انتهاء الضمان، ومواعيد الصيانة الدورية الذكية.',
    },
  ];

  const beneficiaries = [
    {
      icon: UserCheck,
      title: 'للمستخدم والمشتري العادي',
      points: [
        'تحقق من تاريخ الجهاز ومؤشر المخاطرة عبر مسح QR أو فحص IMEI قبل الشراء.',
        'احفظ فواتيرك وأرقام أجهزتك ضد الفقدان أو السرقة وأغلق تداول الجهاز بضغطة واحدة.',
        'احصل على تقييم سعري استرشادي مبني على الحالة والسجل قبل البيع أو الشراء.',
      ],
    },
    {
      icon: Wrench,
      title: 'لفنيي الصيانة ومراكز الخدمة',
      points: [
        'توثيق احترافي لعمليات الإصلاح وقطع الغيار بموافقة العميل لرفع مصداقية المركز.',
        'إصدار تقارير فحص قبل الشراء منظمة تزيد ثقة المشترين في فحوصات مركزك.',
        'خدمات Pro اختيارية لتصدّر دليل المراكز واستقبال طلبات صيانة ذات أولوية.',
      ],
    },
    {
      icon: Store,
      title: 'للمتاجر وتجار الأجهزة',
      points: [
        'عرض الأجهزة في سوق OMOR MARKET مرفقة بهوية رقمية وسجل موثق.',
        'إصدار ضمان متجر واضح للعميل وتعزيز الثقة بختم المتجر المعتمد.',
        'أدوات تمييز الإعلانات وتقارير الفحص المتقدمة لتسريع حركة البيع.',
      ],
    },
  ];

  return (
    <PublicShell>
      <PageSEO
        title="عن المنصة والمطور — SASA STORE | OMOR (عُمْر)"
        description="تعرف على منصة SASA STORE | OMOR (عُمْر)، فوائدها في توثيق وفحص الأجهزة ونقل الملكية، ومطورها مصطفى محمد صاحب صاصا ستور."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Section */}
        <section className="rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-l from-[#141923] via-[#0B1220] to-[#141923] p-6 sm:p-10 text-[#F3F5F8] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandLogo size="md" onDark />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-3 py-1 text-xs font-bold text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" />
              دليل المنصة الرسمي والتعريف بالمطور
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-extrabold leading-tight">
            ما هي منصة <span className="text-[#D4AF37]">SASA STORE | OMOR (عُمْر)</span>؟
          </h1>
          <p className="text-sm sm:text-base text-[#C5CCD8] leading-relaxed max-w-3xl">
            منصة <strong className="text-[#F3F5F8]">عُمْر (OMOR)</strong> هي منظومة رقمية متكاملة تعمل تحت شعار{' '}
            <strong className="text-[#D4AF37]">«كل جهاز له حكاية.. وكل حكاية لها سجل»</strong>، صُممت لرفع
            الشفافية والأمان في سوق الهواتف والأجهزة الإلكترونية المستعملة ومجال الصيانة، عبر إنشاء جواز سفر
            رقمي مستقل لكل جهاز يحفظ تاريخه دون انتهاك خصوصية المالك.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/register"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-5 text-xs sm:text-sm font-bold text-[#0B1220] hover:bg-[#E2C25B]"
            >
              ابدأ تسجيل جهازك مجانًا
            </Link>
            <Link
              to="/scan"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#333C4B] bg-[#141923] px-5 text-xs sm:text-sm font-semibold text-[#F3F5F8] hover:border-[#D4AF37]"
            >
              <QrCode className="w-4 h-4 text-[#D4AF37]" />
              فحص جهاز بالـ QR أو IMEI
            </Link>
            <Link
              to="/inspections"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#333C4B] bg-[#141923] px-5 text-xs sm:text-sm font-semibold text-[#F3F5F8] hover:border-[#D4AF37]"
            >
              <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
              فحص قبل الشراء (8 محاور)
            </Link>
          </div>
        </section>

        {/* Developer & Founder Tribute Card */}
        <section className="rounded-3xl border-2 border-[#D4AF37]/50 bg-white dark:bg-[#141923] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#D4AF37] bg-[#0B1220] shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/file_00000000c7748210950721111bfbb7e2_1b9aa8fa.png"
                  alt="شعار SASA STORE OMOR"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37]/15 px-3 py-1 text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                  <Code2 className="w-4 h-4" />
                  <span>مطور ومؤسس المنصة</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                  المطور: مصطفى محمد — صاحب صاصا ستور (SASA STORE)
                </h2>
                <p className="text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed max-w-2xl">
                  طوّر <strong className="text-[#11161F] dark:text-[#F3F5F8]">مصطفى محمد</strong> — مؤسس وصاحب{' '}
                  <strong className="text-[#8F6D14] dark:text-[#D4AF37]">صاصا ستور (SASA STORE)</strong> — منصة{' '}
                  <strong>OMOR (عُمْر)</strong> انطلاقًا من خبرته الميدانية في سوق الهواتف والصيانة في مصر،
                  لتقديم أداة عربية عملية تجمع بين توثيق الصيانة، حماية الخصوصية، فحص المستعمل قبل الشراء،
                  ونقل الملكية الآمن بين البائع والمشتري.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#0E131C] p-4 sm:p-5 space-y-3 shrink-0 min-w-[260px]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                <Award className="w-4 h-4" />
                <span>التواصل المباشر مع الإدارة والدعم</span>
              </div>
              <div className="text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                مقر العلامة: <strong className="text-[#11161F] dark:text-[#F3F5F8]">SASA STORE — مصر</strong>
              </div>
              <div className="font-mono-code text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8]" dir="ltr">
                01214899889
              </div>
              <SupportContactButtons variant="card" />
            </div>
          </div>
        </section>

        {/* What OMOR Does - 6 Core Pillars */}
        <section className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              ماذا تفعل المنصة بالتفصيل؟
            </h2>
            <p className="text-xs sm:text-sm text-[#687182] dark:text-[#8E97A8] mt-1">
              كل ميزة داخل منصة عُمْر مصممة لتحقيق فائدة حقيقية واضحة وسهلة الاستخدام على الموبايل والكمبيوتر.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-2.5 hover:border-[#D4AF37]/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    {p.title}
                  </h3>
                  <p className="text-xs text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits by Role */}
        <section className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              كيف يستفيد كل طرف من منصة OMOR؟
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {beneficiaries.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">{b.title}</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                    {b.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Honest Trust Levels & Non-Guarantee Transparency */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              مستويات الموثوقية والشفافية في عرض المعلومات
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['user_entry', 'evidence_backed', 'technician_checked', 'verified_store'] as TrustSourceLevel[]).map(
              (tier) => (
                <div
                  key={tier}
                  className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#0E131C] p-3.5 space-y-1"
                >
                  <div className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                    {TRUST_SOURCE_LABELS[tier]}
                  </div>
                  <p className="text-[11px] text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">
                    {TRUST_SOURCE_DESCRIPTIONS[tier]}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>تنبيه شفافية مهم:</strong> {PLATFORM_TRUST_DISCLAIMER}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-[#D4AF37]/35 bg-white dark:bg-[#141923] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
              جاهز للاستفادة من كامل أدوات المنصة؟
            </h3>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
              سجّل حسابك مجانًا الآن أو تصفح باقات المحترفين الاختيارية للفنيين والمتاجر.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/market"
              className="min-h-[42px] inline-flex items-center px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold hover:border-[#D4AF37]"
            >
              سوق الأجهزة
            </Link>
            <Link
              to="/services"
              className="min-h-[42px] inline-flex items-center px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
            >
              خدمات المحترفين
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
};

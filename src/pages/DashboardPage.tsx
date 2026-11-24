import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Crown,
  FileWarning,
  History,
  Info,
  Plus,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { BrandLogo } from '../components/BrandLogo';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { SasaStoreAdBanner } from '../components/SasaStoreAdBanner';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  DEVICE_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  formatArabicDate,
  formatCurrency,
  getDaysRemaining,
} from '../lib/labels';
import { computeDeviceValuation } from '../lib/omorV3Analytics';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    myDevices,
    warranties,
    repairRecords,
    listings,
    transfers,
    events,
    notifications,
    maintenanceReminders,
    inspections,
  } = useApp();
  const navigate = useNavigate();

  const [chartTab, setChartTab] = useState<'distribution' | 'timeline'>('distribution');
  const [selectedChartDeviceId, setSelectedChartDeviceId] = useState<string>('');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number>(5);

  const myDeviceIds = useMemo(() => new Set(myDevices.map((d) => d.id)), [myDevices]);

  const deviceValuations = useMemo(() => {
    return myDevices
      .filter((d) => d.status !== 'archived' && d.status !== 'transferred')
      .map((device) => {
        const val = computeDeviceValuation(device, repairRecords, warranties, listings);
        return {
          device,
          fairPrice: val.fairPriceEgp,
          minPrice: val.minPriceEgp,
          maxPrice: val.maxPriceEgp,
        };
      })
      .sort((a, b) => b.fairPrice - a.fairPrice);
  }, [myDevices, repairRecords, warranties, listings]);

  const totalPortfolioValue = useMemo(
    () => deviceValuations.reduce((sum, item) => sum + item.fairPrice, 0),
    [deviceValuations]
  );

  const portfolioTimeline = useMemo(() => {
    const monthsAr = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    const now = new Date();
    const points = [] as Array<{ label: string; totalValue: number; activeCount: number }>;
    for (let offset = 5; offset >= 0; offset -= 1) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - offset, 28);
      const label = monthsAr[refDate.getMonth()];
      const activeAtMonth = deviceValuations.filter((v) => {
        const created = new Date(v.device.purchaseDate || v.device.createdAt);
        return created <= refDate || offset === 0;
      });
      const baseSum = activeAtMonth.reduce((acc, v) => {
        // Gentle depreciation factor over past 6 months + stability for documented repairs
        const hasVerifiedRepair = repairRecords.some(
          (r) => r.deviceId === v.device.id && r.ownerApproved && new Date(r.createdAt) <= refDate
        );
        const ageAdjustment = 1 + offset * 0.018 - (hasVerifiedRepair ? 0.01 : 0);
        return acc + Math.round(v.fairPrice * ageAdjustment);
      }, 0);
      points.push({
        label,
        totalValue: offset === 0 ? totalPortfolioValue : baseSum,
        activeCount: activeAtMonth.length,
      });
    }
    return points;
  }, [deviceValuations, repairRecords, totalPortfolioValue]);

  const activeWarranties = useMemo(
    () =>
      warranties.filter(
        (w) => myDeviceIds.has(w.deviceId) && (w.status === 'active' || w.status === 'expiring_soon')
      ),
    [warranties, myDeviceIds]
  );

  const expiringWarranties = useMemo(
    () => warranties.filter((w) => myDeviceIds.has(w.deviceId) && w.status === 'expiring_soon'),
    [warranties, myDeviceIds]
  );

  const verifiedRepairs = useMemo(
    () => repairRecords.filter((r) => myDeviceIds.has(r.deviceId) && r.ownerApproved),
    [repairRecords, myDeviceIds]
  );

  const recentEvents = useMemo(
    () =>
      events
        .filter((e) => myDeviceIds.has(e.deviceId))
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 5),
    [events, myDeviceIds]
  );

  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.isRead).slice(0, 3),
    [notifications]
  );

  const actionChecklist = useMemo(() => {
    const items: Array<{
      id: string;
      tone: 'danger' | 'warning' | 'info';
      title: string;
      detail: string;
      to: string;
      cta: string;
    }> = [];

    myDevices
      .filter((d) => d.status === 'reported_stolen')
      .forEach((d) => {
        items.push({
          id: `stolen-${d.id}`,
          tone: 'danger',
          title: `بلاغ فقدان/سرقة نشط: ${d.brand} ${d.deviceName}`,
          detail: 'الجهاز مقفل ضد البيع ونقل الملكية ويظهر تحذير فوري عند المسح.',
          to: `/devices/${d.id}`,
          cta: 'إدارة البلاغ',
        });
      });

    repairRecords
      .filter((r) => myDeviceIds.has(r.deviceId) && !r.ownerApproved && r.status === 'awaiting_customer_approval')
      .forEach((r) => {
        const dev = myDevices.find((d) => d.id === r.deviceId);
        items.push({
          id: `rep-app-${r.id}`,
          tone: 'warning',
          title: `سجل صيانة بانتظار اعتمادك (${dev?.deviceName || 'جهاز'})`,
          detail: `أرسل ${r.centerName} توثيق "${r.issueType}". راجعه ووافق لتثبيته في السجل.`,
          to: '/repairs',
          cta: 'مراجعة واعتماد',
        });
      });

    if (currentUser) {
      transfers
        .filter((t) => t.fromUserId === currentUser.id && t.status === 'buyer_accepted')
        .forEach((t) => {
          items.push({
            id: `trf-${t.id}`,
            tone: 'warning',
            title: 'طلب نقل ملكية بانتظار تأكيدك النهائي',
            detail: `وافق ${t.toUserName || 'المشتري'} على استلام الجهاز.`,
            to: '/transfer',
            cta: 'إتمام النقل',
          });
        });
    }

    expiringWarranties.forEach((w) => {
      const dev = myDevices.find((d) => d.id === w.deviceId);
      const rem = getDaysRemaining(w.endDate);
      items.push({
        id: `war-${w.id}`,
        tone: 'warning',
        title: `ضمان ينتهي قريبًا (${rem !== null ? `متبقي ${Math.max(0, rem)} يومًا` : formatArabicDate(w.endDate)})`,
        detail: `${w.itemOrPartName} — ${dev?.deviceName || 'جهاز'} (${w.issuerName}).`,
        to: '/warranties',
        cta: 'مراجعة الضمان',
      });
    });

    maintenanceReminders
      .filter((r) => {
        const rem = getDaysRemaining(r.nextDueDate);
        return rem !== null && rem <= 7;
      })
      .forEach((r) => {
        const dev = myDevices.find((d) => d.id === r.deviceId);
        const rem = getDaysRemaining(r.nextDueDate) ?? 0;
        items.push({
          id: `mrem-${r.id}`,
          tone: rem < 0 ? 'danger' : 'warning',
          title:
            rem < 0
              ? `صيانة دورية متأخرة (${Math.abs(rem)} يوم) — ${dev?.deviceName || 'جهاز'}`
              : rem === 0
                ? `موعد صيانة دورية اليوم — ${dev?.deviceName || 'جهاز'}`
                : `صيانة دورية خلال ${rem} أيام — ${dev?.deviceName || 'جهاز'}`,
          detail: r.title,
          to: `/devices/${r.deviceId}`,
          cta: 'تأكيد / إدارة',
        });
      });

    myDevices
      .filter((d) => !d.privateData.invoiceName || (!d.privateData.serialNumber && !d.privateData.imei))
      .slice(0, 2)
      .forEach((d) => {
        items.push({
          id: `vault-${d.id}`,
          tone: 'info',
          title: `استكمل خزينة الأمان لجهاز ${d.deviceName}`,
          detail: !d.privateData.invoiceName
            ? 'أرفق فاتورة الشراء لترقية موثوقية الجهاز ورفع سعره عند إعادة البيع.'
            : 'سجّل الرقم التسلسلي أو IMEI لحماية الجهاز ضد الفقدان أو السرقة.',
          to: `/devices/${d.id}`,
          cta: 'استكمال الخزينة',
        });
      });

    myDevices
      .filter((d) => {
        if (!d.purchaseDate || d.status === 'archived') return false;
        const ageDays = Math.floor((Date.now() - new Date(d.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
        return ageDays >= 365;
      })
      .slice(0, 1)
      .forEach((d) => {
        items.push({
          id: `checkup-${d.id}`,
          tone: 'info',
          title: `فحص دوري مقترح لجهاز ${d.deviceName}`,
          detail: 'مر أكثر من عام على تاريخ الشراء — يُنصح بفحص صحة البطارية والتبريد عبر مساعد V3.',
          to: `/v3/diagnose?deviceId=${d.id}`,
          cta: 'فحص سريع AI',
        });
      });

    return items.slice(0, 6);
  }, [currentUser, expiringWarranties, maintenanceReminders, myDeviceIds, myDevices, repairRecords, transfers]);

  return (
    <AppShell title="الرئيسية">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <BrandLogo size="sm" className="mb-2" />
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
              أهلًا، {currentUser?.fullName || 'زائرنا الكريم'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#687182] dark:text-[#8E97A8]">
              ملخص فوري لهويات أجهزتك الرقمية، الضمانات النشطة، وسجلات الصيانة الموثقة.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/devices/new')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              إضافة جهاز
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37] whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-[#D4AF37]" />
              مسح QR
            </button>
            <button
              type="button"
              onClick={() => navigate(currentUser?.role === 'technician' ? '/repairs' : '/repairs/request')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37] whitespace-nowrap"
            >
              <Wrench className="w-4 h-4 text-[#687182] dark:text-[#C5CCD8]" />
              تسجيل صيانة
            </button>
            <button
              type="button"
              onClick={() => navigate('/market')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37] whitespace-nowrap"
            >
              <Store className="w-4 h-4 text-[#687182] dark:text-[#C5CCD8]" />
              عرض السوق
            </button>
            <button
              type="button"
              onClick={() => navigate('/inspections')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20 whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              فحص قبل الشراء ({inspections.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('/platform-guide')}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37] whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-[#D4AF37]" />
              عن المنصة والمطور
            </button>
          </div>
        </section>

        {/* Optional Pro Services CTA for Technicians & Stores */}
        {(currentUser?.role === 'technician' || currentUser?.role === 'store') &&
          !currentUser.activePlanSlug && (
            <section className="rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-l from-[#D4AF37]/15 via-white dark:via-[#141923] to-white dark:to-[#141923] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 text-[#8F6D14] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                    باقات وخدمات Pro الاختيارية للفنيين والمتاجر
                  </h3>
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5 leading-relaxed">
                    اعرض مركزك أو متجرك في أولوية نتائج البحث، فعّل أولوية طلبات الصيانة، وتمييز إعلانات السوق مع دعم الدفع بالبطاقات والمحافظ الإلكترونية.
                  </p>
                </div>
              </div>
              <Link
                to="/services"
                className="min-h-[42px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 hover:bg-[#E2C25B]"
              >
                <Crown className="w-4 h-4" />
                استعراض باقات Pro
              </Link>
            </section>
          )}

        {/* Official SASA STORE Promotional Banner */}
        <SasaStoreAdBanner />

        {/* OMOR V3 Intelligence & Enterprise Tools */}
        <section className="rounded-2xl border border-[#D4AF37]/30 bg-white dark:bg-[#141923] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
              <Sparkles className="w-4 h-4" />
              <span>أدوات الإصدار الثالث — OMOR V3</span>
            </div>
            <Link to="/v3" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
              فتح المركز الكامل
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { to: '/v3/diagnose', label: 'تشخيص الأعطال AI', icon: Stethoscope },
              { to: '/v3/valuation', label: 'تقدير السعر', icon: CircleDollarSign },
              { to: '/v3/history', label: 'تحليل التاريخ', icon: History },
              { to: '/v3/risk-report', label: 'مخاطر الشراء', icon: FileWarning },
              { to: '/v3/parts-stats', label: 'أسعار قطع الغيار', icon: BarChart3 },
              { to: '/v3/partners', label: 'ربط الشركات', icon: Building2 },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 py-2 text-xs font-semibold text-[#1E2430] dark:text-[#DCE1EA] hover:border-[#D4AF37] transition-colors"
                >
                  <Icon className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="truncate">{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
              <span>الأجهزة المسجلة</span>
              <Smartphone className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#11161F] dark:text-[#F3F5F8]">
              {myDevices.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
              <span>الضمانات النشطة</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#11161F] dark:text-[#F3F5F8]">
              {activeWarranties.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
              <span>صيانات موثقة</span>
              <Wrench className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#11161F] dark:text-[#F3F5F8]">
              {verifiedRepairs.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
              <span>ضمانات تقترب من الانتهاء</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {expiringWarranties.length}
            </div>
          </div>
        </section>

        {/* Interactive Device Portfolio Valuation Charts */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                <TrendingUp className="w-4 h-4" />
                <span>تحليل قيمة محفظة أجهزتك (رسوم بيانية تفاعلية)</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8] tabular-nums">
                  {formatCurrency(totalPortfolioValue)}
                </span>
                <span className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  القيمة التقديرية الإجمالية لـ {deviceValuations.length} جهاز نشط
                </span>
              </div>
            </div>

            <div className="inline-flex rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-1 self-start">
              <button
                type="button"
                onClick={() => setChartTab('distribution')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-colors ${
                  chartTab === 'distribution'
                    ? 'bg-[#D4AF37] text-[#0B1220]'
                    : 'text-[#687182] dark:text-[#8E97A8] hover:text-[#11161F] dark:hover:text-white'
                }`}
              >
                توزيع قيمة الأجهزة
              </button>
              <button
                type="button"
                onClick={() => setChartTab('timeline')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-colors ${
                  chartTab === 'timeline'
                    ? 'bg-[#D4AF37] text-[#0B1220]'
                    : 'text-[#687182] dark:text-[#8E97A8] hover:text-[#11161F] dark:hover:text-white'
                }`}
              >
                تغيّر القيمة بمرور الوقت
              </button>
            </div>
          </div>

          {deviceValuations.length === 0 ? (
            <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-6 text-center text-xs text-[#687182] dark:text-[#8E97A8]">
              أضف جهازًا واحدًا على الأقل لعرض التوزيع البياني للقيمة ومتابعة تغيّرها شهريًا.
            </div>
          ) : chartTab === 'distribution' ? (
            <div className="space-y-3">
              {deviceValuations.map((item) => {
                const sharePercent =
                  totalPortfolioValue > 0
                    ? Math.round((item.fairPrice / totalPortfolioValue) * 100)
                    : 0;
                const isSelected = selectedChartDeviceId === item.device.id;
                return (
                  <button
                    key={item.device.id}
                    type="button"
                    onClick={() =>
                      setSelectedChartDeviceId(isSelected ? '' : item.device.id)
                    }
                    className={`w-full text-right rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-bold text-[#11161F] dark:text-[#F3F5F8]">
                        {item.device.brand} {item.device.deviceName}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                          {formatCurrency(item.fairPrice)}
                        </span>
                        <span className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                          ({sharePercent}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#DCE0E7] dark:bg-[#1D2432] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#D4AF37] transition-all duration-300"
                        style={{ width: `${Math.max(sharePercent, 4)}%` }}
                      />
                    </div>
                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/25 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4A5363] dark:text-[#C5CCD8]">
                        <span>
                          النطاق السوقي الاسترشادي: {formatCurrency(item.minPrice)} —{' '}
                          {formatCurrency(item.maxPrice)}
                        </span>
                        <Link
                          to={`/v3/valuation?deviceId=${item.device.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-[#8F6D14] dark:text-[#D4AF37] underline"
                        >
                          تفاصيل التقدير في V3
                        </Link>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxVal = Math.max(...portfolioTimeline.map((p) => p.totalValue), 1);
                const minVal = Math.min(...portfolioTimeline.map((p) => p.totalValue), 0);
                const range = Math.max(maxVal - minVal, 1000);
                const coords = portfolioTimeline.map((p, idx) => {
                  const x = 35 + idx * 106;
                  const y = 140 - ((p.totalValue - minVal) / range) * 95;
                  return { ...p, x, y, idx };
                });
                const linePath = coords
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                  .join(' ');
                const areaPath = `${linePath} L ${coords[coords.length - 1].x} 160 L ${coords[0].x} 160 Z`;
                const activePt = coords[hoveredMonthIdx] || coords[coords.length - 1];
                return (
                  <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] border border-[#DCE0E7] dark:border-[#252C38] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                      <span className="font-bold text-[#11161F] dark:text-[#F3F5F8]">
                        شهر {activePt.label}:{' '}
                        <strong className="text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                          {formatCurrency(activePt.totalValue)}
                        </strong>
                      </span>
                      <span className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                        أجهزة مقيّمة: {activePt.activeCount} · مرّر أو اضغط على أي نقطة
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 600 185"
                      className="w-full h-44 overflow-visible"
                      role="img"
                      aria-label="تطور القيمة التقديرية للأجهزة خلال 6 أشهر"
                    >
                      <defs>
                        <linearGradient id="omorGoldArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <line x1="25" y1="160" x2="575" y2="160" stroke="#333C4B" strokeOpacity="0.35" />
                      <path d={areaPath} fill="url(#omorGoldArea)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {coords.map((c) => {
                        const isActive = c.idx === hoveredMonthIdx;
                        return (
                          <g
                            key={c.label}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredMonthIdx(c.idx)}
                            onClick={() => setHoveredMonthIdx(c.idx)}
                          >
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={isActive ? 7 : 5}
                              fill={isActive ? '#D4AF37' : '#0B1220'}
                              stroke="#D4AF37"
                              strokeWidth="2.5"
                            />
                            <text
                              x={c.x}
                              y="178"
                              textAnchor="middle"
                              className="fill-[#687182] dark:fill-[#8E97A8] text-[11px] font-semibold"
                            >
                              {c.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
          )}

          <p className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
            ملاحظة: الأرقام أعلاه تقديرات استرشادية محسوبة آليًا من حالة الأجهزة المعلنة وسجل الصيانة وعروض السوق المتاحة وليست تسعيرًا إلزاميًا.
          </p>
        </section>

        {/* Smart Device Health & Action Center */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
              <span>مركز متابعة صحة الأجهزة والتنبيهات الفورية</span>
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                {actionChecklist.length === 0 ? 'جميع أجهزتك مكتملة التوثيق' : `${actionChecklist.length} مهام مقترحة`}
              </span>
              <Link to="/notifications" className="text-[11px] font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                مركز الإشعارات
              </Link>
            </div>
          </div>
          {actionChecklist.length === 0 ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>سجلات أجهزتك محدثة ومؤمّنة بالكامل ولا توجد مهام عاجلة الآن.</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {actionChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                    item.tone === 'danger'
                      ? 'border-rose-500/40 bg-rose-500/10'
                      : item.tone === 'warning'
                        ? 'border-amber-500/35 bg-amber-500/10'
                        : 'border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#4A5363] dark:text-[#8E97A8] mt-0.5 line-clamp-2">
                      {item.detail}
                    </div>
                  </div>
                  <Link
                    to={item.to}
                    className="min-h-[36px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] text-[11px] font-bold inline-flex items-center shrink-0 hover:bg-[#E2C25B]"
                  >
                    {item.cta}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Latest Devices + Expiring Warranties */}
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  آخر الأجهزة المضافة
                </h3>
                <Link to="/devices" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                  عرض الكل
                </Link>
              </div>

              {myDevices.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[#687182] dark:text-[#8E97A8] mb-4">
                    لم تقم بتسجيل أي جهاز بعد. أضف جهازك الأول لإصدار هويته الرقمية ورمز QR.
                  </p>
                  <Link
                    to="/devices/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-[#0B1220]"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة جهاز جديد
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                  {myDevices.slice(0, 4).map((device) => (
                    <Link
                      key={device.id}
                      to={`/devices/${device.id}`}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ImageWithFallback
                          src={device.imageUrl}
                          alt={device.deviceName}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#D5DBE5] dark:border-[#333C4B]"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
                            {device.brand} {device.deviceName}
                          </div>
                          <div className="text-xs text-[#687182] dark:text-[#8E97A8] truncate">
                            {CATEGORY_LABELS[device.category]} · {DEVICE_STATUS_LABELS[device.status]} ·{' '}
                            <span className="font-mono-code">{device.deviceCode}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] shrink-0">
                        التفاصيل
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Expiring Warranties */}
            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  ضمانات قريبة من الانتهاء
                </h3>
                <Link to="/warranties" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                  إدارة الضمانات
                </Link>
              </div>
              {expiringWarranties.length === 0 ? (
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  لا توجد ضمانات توشك على الانتهاء خلال الـ 30 يومًا القادمة.
                </p>
              ) : (
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                  {expiringWarranties.map((w) => {
                    const dev = myDevices.find((d) => d.id === w.deviceId);
                    return (
                      <div key={w.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8]">
                            {w.itemOrPartName}
                          </div>
                          <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                            {dev?.deviceName || 'جهاز'} · {w.issuerName}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            ينتهي {formatArabicDate(w.endDate)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Recent Activity & Important Notifications */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  آخر نشاط على الأجهزة
                </h3>
              </div>
              {recentEvents.length === 0 ? (
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  ستظهر هنا أحدث الأحداث المسجلة على أجهزتك.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="pb-3 border-b border-[#E8EBF0] dark:border-[#222834] last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
                        <span className="font-semibold text-[#1E2430] dark:text-[#DCE1EA]">
                          {EVENT_TYPE_LABELS[ev.eventType]}
                        </span>
                        <span className="tabular-nums">{formatArabicDate(ev.occurredAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#D4AF37]" />
                  إشعارات مهمة
                </h3>
                <Link to="/notifications" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                  الكل
                </Link>
              </div>
              {unreadNotifs.length === 0 ? (
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  لا توجد إشعارات غير مقروءة حاليًا.
                </p>
              ) : (
                <div className="space-y-3">
                  {unreadNotifs.map((n) => (
                    <Link
                      key={n.id}
                      to={n.linkPath || '/notifications'}
                      className="block rounded-xl border border-[#E8EBF0] dark:border-[#222834] p-3 hover:border-[#D4AF37]/50 transition-colors"
                    >
                      <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8]">{n.title}</div>
                      <div className="mt-1 text-xs text-[#687182] dark:text-[#8E97A8] line-clamp-2">
                        {n.body}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileWarning,
  History,
  Loader2,
  Plus,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Upload,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { BrandLogo } from '../components/BrandLogo';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  EGYPT_CITIES,
  PLATFORM_TRUST_DISCLAIMER,
  VERIFICATION_TIER_LABELS,
  formatArabicDate,
  formatCurrency,
} from '../lib/labels';
import {
  analyzeDeviceHistory,
  computeCombinedSparePartStats,
  computeDeviceValuation,
  computeUsedPurchaseRiskReport,
} from '../lib/omorV3Analytics';
import type {
  AIDiagnosisResult,
  AIIntelligenceInsight,
  B2BPartnerType,
  DeviceCategorySlug,
  SparePartCategory,
  SparePartOrigin,
} from '../types/omor';

export type V3Section =
  | 'diagnose'
  | 'valuation'
  | 'history'
  | 'risk-report'
  | 'parts-stats'
  | 'partners';

const PART_CATEGORY_LABELS: Record<SparePartCategory, string> = {
  screen: 'الشاشات',
  battery: 'البطاريات',
  charging_port: 'سوكيت وفلاتات الشحن',
  motherboard: 'اللوحة الأم (البوردة)',
  cooling: 'التبريد والمراوح',
  camera: 'الكاميرات',
  keyboard: 'لوحة المفاتيح',
  other: 'قطع أخرى',
};

const PART_ORIGIN_LABELS: Record<SparePartOrigin, string> = {
  original: 'أصلية جديدة',
  oem_compatible: 'بديلة / درجة أولى',
  used: 'مستعملة / خلع',
};

const B2B_TYPE_LABELS: Record<B2BPartnerType, string> = {
  authorized_service_center: 'مركز صيانة معتمد',
  enterprise_fleet: 'إدارة عهدة وأجهزة شركات',
  retail_chain: 'سلسلة متاجر أجهزة',
  warranty_provider: 'شركة ضمان وتأمين',
  distributor: 'موزع ووكيل',
};

export const OmorV3HubPage: React.FC<{ initialSection?: V3Section }> = ({
  initialSection = 'diagnose',
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    currentUser,
    devices,
    events,
    repairRecords,
    warranties,
    listings,
    transfers,
    reports,
    sparePartStats,
    b2bPartners,
    addSparePartObservation,
    registerB2BPartner,
    adminToggleB2BPartnerStatus,
  } = useApp();

  const [section, setSection] = useState<V3Section>(initialSection);

  const paramDeviceId = searchParams.get('deviceId') || '';
  const paramListingId = searchParams.get('listingId') || '';

  const activeDevices = useMemo(
    () => devices.filter((d) => d.status !== 'archived'),
    [devices]
  );

  const initialSelectedDeviceId =
    paramDeviceId ||
    listings.find((l) => l.id === paramListingId)?.deviceId ||
    activeDevices[0]?.id ||
    '';

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialSelectedDeviceId);
  const [selectedListingId, setSelectedListingId] = useState<string>(
    paramListingId || listings[0]?.id || ''
  );

  // Sync section cleanly when navigating between /v3/* subroutes
  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  React.useEffect(() => {
    if (paramDeviceId) setSelectedDeviceId(paramDeviceId);
    if (paramListingId) {
      setSelectedListingId(paramListingId);
      const linked = listings.find((l) => l.id === paramListingId);
      if (linked) setSelectedDeviceId(linked.deviceId);
    }
  }, [paramDeviceId, paramListingId, listings]);

  const tabs: Array<{ id: V3Section; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'diagnose', label: 'تشخيص الأعطال بالذكاء الاصطناعي', icon: Stethoscope },
    { id: 'valuation', label: 'تقدير سعر الجهاز', icon: CircleDollarSign },
    { id: 'history', label: 'تحليل تاريخ الجهاز', icon: History },
    { id: 'risk-report', label: 'تقرير مخاطر شراء المستعمل', icon: FileWarning },
    { id: 'parts-stats', label: 'إحصائيات أسعار قطع الغيار', icon: BarChart3 },
    { id: 'partners', label: 'ربط الشركات ومراكز الصيانة', icon: Building2 },
  ];

  // --- Module 1: AI Fault Diagnosis State ---
  const [diagDeviceId, setDiagDeviceId] = useState<string>(initialSelectedDeviceId);
  const diagDevice = activeDevices.find((d) => d.id === diagDeviceId);
  const [diagCategory, setDiagCategory] = useState<DeviceCategorySlug>(
    diagDevice?.category || 'smartphone'
  );
  const [diagBrand, setDiagBrand] = useState(diagDevice?.brand || 'Apple');
  const [diagName, setDiagName] = useState(diagDevice?.deviceName || 'iPhone 16 Pro');
  const [diagModel, setDiagModel] = useState(diagDevice?.model || '');
  const [diagAgeMonths, setDiagAgeMonths] = useState('10');
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagImageBase64, setDiagImageBase64] = useState<string>('');
  const [diagImageMime, setDiagImageMime] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');
  const [diagResult, setDiagResult] = useState<AIDiagnosisResult | null>(null);

  const handleSelectDiagDevice = (id: string) => {
    setDiagDeviceId(id);
    const dev = activeDevices.find((d) => d.id === id);
    if (dev) {
      setDiagCategory(dev.category);
      setDiagBrand(dev.brand);
      setDiagName(dev.deviceName);
      setDiagModel(dev.model);
    }
  };

  React.useEffect(() => {
    if (paramDeviceId) {
      const dev = activeDevices.find((d) => d.id === paramDeviceId);
      if (dev) {
        setDiagDeviceId(dev.id);
        setDiagCategory(dev.category);
        setDiagBrand(dev.brand);
        setDiagName(dev.deviceName);
        setDiagModel(dev.model);
      }
    }
  }, [paramDeviceId, activeDevices]);

  const handleDiagPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDiagError('يرجى رفع صورة بصيغة JPG أو PNG أو WebP فقط.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setDiagError('حجم الصورة يتجاوز 3 ميجابايت.');
      return;
    }
    setDiagImageMime(file.type as 'image/jpeg' | 'image/png' | 'image/webp');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDiagImageBase64(reader.result);
        setDiagError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const runDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiagError('');
    setDiagResult(null);
    if (diagSymptoms.trim().length < 5) {
      setDiagError('يرجى كتابة وصف واضح للأعراض (5 أحرف على الأقل).');
      return;
    }
    setDiagLoading(true);
    try {
      const prevRepairs = diagDevice
        ? repairRecords
            .filter((r) => r.deviceId === diagDevice.id && r.ownerApproved)
            .map((r) => `${r.issueType}: ${r.actionTaken}`)
            .join(' | ')
        : '';
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: CATEGORY_LABELS[diagCategory],
          brand: diagBrand,
          deviceName: diagName,
          model: diagModel,
          symptoms: diagSymptoms,
          deviceAgeMonths: Number(diagAgeMonths) || 0,
          previousRepairsSummary: prevRepairs,
          imageBase64: diagImageBase64 || undefined,
          imageMimeType: diagImageBase64 ? diagImageMime : undefined,
        }),
      });
      const json = (await res.json()) as { diagnosis?: AIDiagnosisResult; error?: string };
      if (!res.ok || !json.diagnosis) {
        setDiagError(json.error || 'تعذر إتمام التشخيص بالذكاء الاصطناعي.');
      } else {
        setDiagResult(json.diagnosis);
      }
    } catch {
      setDiagError('تعذر الاتصال بخادم التشخيص الذكي.');
    } finally {
      setDiagLoading(false);
    }
  };

  // --- Modules 2, 3, 4 Computed Device Analytics & Optional AI Insight ---
  const targetDevice = useMemo(
    () => activeDevices.find((d) => d.id === selectedDeviceId) || activeDevices[0],
    [activeDevices, selectedDeviceId]
  );

  const activeListingForRisk = useMemo(() => {
    if (section === 'risk-report') {
      const byListing = listings.find((l) => l.id === selectedListingId);
      if (byListing) return byListing;
    }
    return targetDevice
      ? listings.find((l) => l.deviceId === targetDevice.id && l.status === 'active')
      : undefined;
  }, [listings, selectedListingId, targetDevice, section]);

  const riskTargetDevice = useMemo(() => {
    if (activeListingForRisk) {
      return devices.find((d) => d.id === activeListingForRisk.deviceId) || targetDevice;
    }
    return targetDevice;
  }, [activeListingForRisk, devices, targetDevice]);

  const valuation = useMemo(
    () =>
      targetDevice
        ? computeDeviceValuation(targetDevice, repairRecords, warranties, listings)
        : null,
    [targetDevice, repairRecords, warranties, listings]
  );

  const historySummary = useMemo(
    () =>
      targetDevice
        ? analyzeDeviceHistory(targetDevice, events, repairRecords, warranties, transfers, reports)
        : null,
    [targetDevice, events, repairRecords, warranties, transfers, reports]
  );

  const riskValuation = useMemo(
    () =>
      riskTargetDevice
        ? computeDeviceValuation(riskTargetDevice, repairRecords, warranties, listings)
        : null,
    [riskTargetDevice, repairRecords, warranties, listings]
  );

  const riskReport = useMemo(
    () =>
      riskTargetDevice && riskValuation
        ? computeUsedPurchaseRiskReport(
            riskTargetDevice,
            repairRecords,
            warranties,
            reports,
            activeListingForRisk,
            riskValuation
          )
        : null,
    [riskTargetDevice, riskValuation, repairRecords, warranties, reports, activeListingForRisk]
  );

  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightError, setAiInsightError] = useState('');
  const [aiInsight, setAiInsight] = useState<AIIntelligenceInsight | null>(null);

  const triggerDeviceAIInsight = async (mode: 'valuation' | 'history' | 'risk_report') => {
    const dev = mode === 'risk_report' ? riskTargetDevice : targetDevice;
    if (!dev) return;
    setAiInsightError('');
    setAiInsight(null);
    setAiInsightLoading(true);
    try {
      const devRepairs = repairRecords.filter((r) => r.deviceId === dev.id);
      const approved = devRepairs.filter((r) => r.ownerApproved);
      const activeWar = warranties.filter(
        (w) => w.deviceId === dev.id && (w.status === 'active' || w.status === 'expiring_soon')
      ).length;
      const devTransfers = transfers.filter(
        (t) => t.deviceId === dev.id && t.status === 'completed'
      ).length;
      const devReports = reports.filter(
        (r) => r.targetType === 'device' && r.targetId === dev.id && r.status !== 'rejected'
      ).length;

      const v = mode === 'risk_report' ? riskValuation : valuation;

      const res = await fetch('/api/ai/device-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          deviceSummary: {
            brand: dev.brand,
            deviceName: dev.deviceName,
            model: dev.model,
            category: CATEGORY_LABELS[dev.category],
            condition: CONDITION_LABELS[dev.condition],
            verificationTier: VERIFICATION_TIER_LABELS[dev.verificationTier],
            purchaseDate: dev.purchaseDate,
            repairsCount: devRepairs.length,
            approvedRepairsCount: approved.length,
            partsSummary: approved
              .flatMap((r) => r.parts.map((p) => `${p.partName} (${p.partOrigin})`))
              .slice(0, 15),
            activeWarrantiesCount: activeWar,
            transfersCount: devTransfers,
            reportsCount: devReports,
            askingPriceEgp: mode === 'risk_report' ? activeListingForRisk?.price : undefined,
            estimatedMinEgp: v?.minPriceEgp,
            estimatedFairEgp: v?.fairPriceEgp,
            estimatedMaxEgp: v?.maxPriceEgp,
            healthScore: historySummary?.healthScore,
            riskScore: riskReport?.riskScore,
          },
        }),
      });
      const json = (await res.json()) as { insight?: AIIntelligenceInsight; error?: string };
      if (!res.ok || !json.insight) {
        setAiInsightError(json.error || 'تعذر تشغيل تحليل الذكاء الاصطناعي.');
      } else {
        setAiInsight(json.insight);
      }
    } catch {
      setAiInsightError('تعذر الاتصال بالخادم لإتمام تحليل الذكاء الاصطناعي.');
    } finally {
      setAiInsightLoading(false);
    }
  };

  // --- Module 5: Spare Parts Pricing Stats ---
  const [partSearch, setPartSearch] = useState('');
  const [partCategoryFilter, setPartCategoryFilter] = useState<string>('all');
  const [partOriginFilter, setPartOriginFilter] = useState<string>('all');
  const [newPartBrand, setNewPartBrand] = useState('Apple');
  const [newPartModel, setNewPartModel] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartCat, setNewPartCat] = useState<SparePartCategory>('battery');
  const [newPartOrigin, setNewPartOrigin] = useState<SparePartOrigin>('original');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [newPartWarranty, setNewPartWarranty] = useState('90');
  const [partFormMsg, setPartFormMsg] = useState('');

  const combinedPartsStats = useMemo(
    () => computeCombinedSparePartStats(sparePartStats, repairRecords),
    [sparePartStats, repairRecords]
  );

  const filteredPartsStats = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return combinedPartsStats.filter((item) => {
      if (partCategoryFilter !== 'all' && item.partCategory !== partCategoryFilter) return false;
      if (partOriginFilter !== 'all' && item.origin !== partOriginFilter) return false;
      if (
        q &&
        !`${item.brand} ${item.deviceModelPattern} ${item.partName}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [combinedPartsStats, partSearch, partCategoryFilter, partOriginFilter]);

  const handleAddPartObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartFormMsg('');
    const res = await addSparePartObservation({
      category: 'smartphone',
      brand: newPartBrand,
      deviceModelPattern: newPartModel,
      partName: newPartName,
      partCategory: newPartCat,
      origin: newPartOrigin,
      priceEgp: Number(newPartPrice) || 0,
      warrantyDays: Number(newPartWarranty) || 0,
    });
    if (!res.ok) {
      setPartFormMsg(res.error || 'تعذر حفظ التسعير.');
      return;
    }
    setPartFormMsg('تم تسجيل تسعير القطعة في إحصائيات السوق بنجاح.');
    setNewPartName('');
    setNewPartModel('');
    setNewPartPrice('');
  };

  // --- Module 6: B2B Enterprise & Service Centers ---
  const [b2bName, setB2bName] = useState('');
  const [b2bType, setB2bType] = useState<B2BPartnerType>('authorized_service_center');
  const [b2bGov, setB2bGov] = useState(EGYPT_CITIES[0]);
  const [b2bBranches, setB2bBranches] = useState('1');
  const [b2bBrands, setB2bBrands] = useState('Apple, Samsung');
  const [b2bSla, setB2bSla] = useState('24');
  const [b2bPolicy, setB2bPolicy] = useState('');
  const [b2bPhone, setB2bPhone] = useState('');
  const [b2bEmail, setB2bEmail] = useState('');
  const [b2bMsg, setB2bMsg] = useState('');

  const handleRegisterB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bMsg('');
    const res = await registerB2BPartner({
      companyName: b2bName,
      partnerType: b2bType,
      governorate: b2bGov,
      branchesCount: Number(b2bBranches) || 1,
      supportedCategories: ['smartphone', 'laptop', 'tablet'],
      supportedBrands: b2bBrands
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      slaHours: Number(b2bSla) || 24,
      warrantyPolicy: b2bPolicy,
      contactPhone: b2bPhone,
      contactEmail: b2bEmail,
    });
    if (!res.ok) {
      setB2bMsg(res.error || 'تعذر إرسال طلب الربط.');
      return;
    }
    setB2bMsg('تم استلام طلب ربط الشركة/المركز وإنشاء رمز Webhook المبدئي بنجاح.');
    setB2bName('');
    setB2bPolicy('');
    setB2bPhone('');
    setB2bEmail('');
  };

  return (
    <AppShell title="الإصدار الثالث — OMOR V3">
      <div className="space-y-6">
        {/* V3 Header Banner */}
        <section className="rounded-2xl border border-[#D4AF37]/35 bg-white dark:bg-[#141923] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1.5">
              <BrandLogo size="sm" />
              <span className="text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                الإصدار الثالث · OMOR V3
              </span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              منظومة الذكاء الاصطناعي وتحليل الأجهزة والشبكة المؤسسية
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#687182] dark:text-[#8E97A8]">
              تشخيص أولي للأعطال، تقدير السعر العادل، تحليل التاريخ، تقارير مخاطر الشراء، أسعار قطع الغيار، وربط الشركات ومراكز الصيانة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/repairs/request"
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] text-[#0B1220] px-4 text-xs font-bold hover:bg-[#E2C25B]"
            >
              <Wrench className="w-4 h-4" />
              طلب صيانة موثقة
            </Link>
            <Link
              to="/market"
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold hover:border-[#D4AF37]"
            >
              استعراض السوق
            </Link>
          </div>
        </section>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSection(tab.id);
                  setAiInsight(null);
                  setAiInsightError('');
                  navigate(`/v3/${tab.id}`);
                }}
                className={`min-h-[42px] inline-flex items-center gap-2 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
                  active
                    ? 'bg-[#D4AF37] text-[#0B1220] border-[#D4AF37]'
                    : 'bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8] border-[#DCE0E7] dark:border-[#252C38] hover:border-[#D4AF37]/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. AI Fault Diagnosis */}
        {section === 'diagnose' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form
              onSubmit={runDiagnosis}
              className="lg:col-span-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  مساعد الذكاء الاصطناعي للتشخيص الأولي للأعطال
                </h3>
              </div>
              <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                صف أعراض العطل أو اختر أحد الأجهزة المسجلة وأرفق صورة اختيارية للحصول على تشخيص أولي منظم قبل التوجه لمركز الصيانة.
              </p>

              {activeDevices.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1">اختر جهازًا مسجلًا (اختياري)</label>
                  <select
                    value={diagDeviceId}
                    onChange={(e) => handleSelectDiagDevice(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  >
                    <option value="">إدخال بيانات جهاز يدويًا</option>
                    {activeDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.deviceName} ({d.deviceCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">نوع الجهاز</label>
                  <select
                    value={diagCategory}
                    onChange={(e) => setDiagCategory(e.target.value as DeviceCategorySlug)}
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">الشركة المصنعة</label>
                  <input
                    type="text"
                    value={diagBrand}
                    onChange={(e) => setDiagBrand(e.target.value)}
                    placeholder="Apple / Samsung / Dell"
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">اسم الجهاز</label>
                  <input
                    type="text"
                    value={diagName}
                    onChange={(e) => setDiagName(e.target.value)}
                    placeholder="iPhone 16 Pro"
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">العمر التقريبي (بالأشهر)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={diagAgeMonths}
                    onChange={(e) => setDiagAgeMonths(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">وصف الأعراض أو المشكلة</label>
                <textarea
                  rows={4}
                  value={diagSymptoms}
                  onChange={(e) => setDiagSymptoms(e.target.value)}
                  placeholder="مثال: الشاشة تفصل إضاءة فجأة مع ارتفاع حرارة أسفل الكاميرا ونزول نسبة البطارية سريعًا..."
                  className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">صورة توضيحية للعطل (اختياري)</label>
                <label className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-dashed border-[#C8CFD9] dark:border-[#333C4B] px-4 py-2 text-xs cursor-pointer hover:border-[#D4AF37]">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  <span>{diagImageBase64 ? 'تم إرفاق صورة — اضغط للتغيير' : 'إرفاق صورة للعطل أو الشاشة'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleDiagPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {diagError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  {diagError}
                </div>
              )}

              <button
                type="submit"
                disabled={diagLoading}
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-extrabold hover:bg-[#E2C25B] disabled:opacity-60"
              >
                {diagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{diagLoading ? 'جاري تحليل الأعراض...' : 'تشغيل التشخيص الأولي بالذكاء الاصطناعي'}</span>
              </button>
            </form>

            <div className="lg:col-span-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6">
              {!diagResult ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3">
                  <Stethoscope className="w-10 h-10 text-[#D4AF37]/70" />
                  <h4 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    نتائج التشخيص الأولي ستظهر هنا
                  </h4>
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8] max-w-sm leading-relaxed">
                    ستحصل على الأسباب المحتملة، مستوى الاستعجال، خطوات فحص آمنة، وقطع الغيار المتوقعة مع ربط مباشر بمراكز الصيانة المعتمدة.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8EBF0] dark:border-[#222834]">
                    <h4 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">التقرير الأولي للعطل</h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]">
                      درجة الاستعجال: {diagResult.urgency}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#363E4D] dark:text-[#DCE1EA] leading-relaxed">
                    {diagResult.summary}
                  </p>

                  {diagResult.probableCauses?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] mb-2">الأسباب المحتملة</div>
                      <div className="space-y-2">
                        {diagResult.probableCauses.map((c, idx) => (
                          <div
                            key={`${c.cause}-${idx}`}
                            className="rounded-xl border border-[#E8EBF0] dark:border-[#222834] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between font-bold text-[#11161F] dark:text-[#F3F5F8]">
                              <span>{c.cause}</span>
                              <span className="text-[#8F6D14] dark:text-[#D4AF37]">{c.likelihood}</span>
                            </div>
                            <p className="mt-1 text-[#687182] dark:text-[#8E97A8]">{c.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagResult.recommendedChecks?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1.5">
                        فحوصات أولية آمنة للمستخدم
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                        {diagResult.recommendedChecks.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagResult.suggestedParts?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1.5">
                        قطع الغيار المتوقعة (يمكنك مراجعة أسعارها في إحصائيات القطع)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {diagResult.suggestedParts.map((part, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-lg bg-[#EEF0F4] dark:bg-[#1F2633] text-[#363E4D] dark:text-[#DCE1EA]"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagResult.safetyNote && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                      {diagResult.safetyNote}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap gap-2">
                    <Link
                      to={`/repairs/request?${new URLSearchParams({
                        ...(diagDeviceId ? { deviceId: diagDeviceId } : {}),
                        issueType: diagResult.probableCauses?.[0]?.cause || 'فحص عطل مشخص بالذكاء الاصطناعي',
                        description: `${diagSymptoms}\n\nملخص التشخيص المبدئي: ${diagResult.summary}`.slice(0, 900),
                      }).toString()}`}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] text-[#0B1220] px-4 text-xs font-bold"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      طلب فحص وتوثيق من فني
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSection('parts-stats')}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold hover:border-[#D4AF37]"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      مراجعة أسعار القطع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Device Price Estimation */}
        {section === 'valuation' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <label className="block text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-1.5">
                  اختر الجهاز المراد تقدير سعره بالبيانات المتاحة
                </label>
                <select
                  value={targetDevice?.id || ''}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    setAiInsight(null);
                  }}
                  className="w-full max-w-md min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName} · {d.deviceCode}
                    </option>
                  ))}
                </select>
              </div>
              {targetDevice && (
                <button
                  type="button"
                  disabled={aiInsightLoading}
                  onClick={() => void triggerDeviceAIInsight('valuation')}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] px-4 text-xs font-extrabold hover:bg-[#E2C25B] disabled:opacity-60"
                >
                  {aiInsightLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  تحليل السعر بالذكاء الاصطناعي
                </button>
              )}
            </div>

            {!targetDevice || !valuation ? (
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-8 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
                سجّل جهازًا أولًا لحساب تقديره السعري بناءً على بيانات المنصة.
              </div>
            ) : (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                  <div className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                    {valuation.confidenceLabel}
                  </div>
                  <h3 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    {targetDevice.brand} {targetDevice.deviceName}
                  </h3>
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8]">{targetDevice.model}</p>

                  <div className="rounded-2xl bg-[#F1F3F6] dark:bg-[#0E131C] border border-[#DCE0E7] dark:border-[#252C38] p-4 text-center">
                    <div className="text-xs text-[#687182] dark:text-[#8E97A8]">القيمة السوقية العادلة المقدّرة</div>
                    <div className="mt-1 text-3xl font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                      {formatCurrency(valuation.fairPriceEgp)}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[#4A5363] dark:text-[#C5CCD8] tabular-nums">
                      <span>الحد الأدنى: {formatCurrency(valuation.minPriceEgp)}</span>
                      <span>·</span>
                      <span>الحد الأعلى: {formatCurrency(valuation.maxPriceEgp)}</span>
                    </div>
                  </div>

                  {valuation.comparableAvgPriceEgp && (
                    <div className="text-xs text-[#4A5363] dark:text-[#C5CCD8] rounded-xl border border-[#E8EBF0] dark:border-[#222834] p-3">
                      متوسط العروض المشابهة في السوق ({valuation.comparableListingsCount} عرض):{' '}
                      <strong className="tabular-nums">{formatCurrency(valuation.comparableAvgPriceEgp)}</strong>
                    </div>
                  )}

                  <Link
                    to={`/market/new?deviceId=${targetDevice.id}`}
                    className="w-full min-h-[42px] inline-flex items-center justify-center rounded-xl border border-[#D4AF37] text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    عرض الجهاز للبيع بهذا التقدير في السوق
                  </Link>
                  <p className="text-[11px] leading-relaxed text-[#687182] dark:text-[#8E97A8] rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3 border border-[#DCE0E7] dark:border-[#252C38]">
                    تقدير السعر استرشادي فقط استنادًا إلى البيانات المدخلة وسجل الصيانة وعروض السوق المتاحة، ولا يُعد تسعيرًا إلزاميًا. {PLATFORM_TRUST_DISCLAIMER}
                  </p>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                  <h4 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    العوامل المؤثرة في التقدير السعري
                  </h4>
                  <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                    {valuation.factors.map((f) => (
                      <div key={f.label} className="py-3 flex items-start justify-between gap-4 text-xs">
                        <div>
                          <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{f.label}</div>
                          <div className="text-[#687182] dark:text-[#8E97A8] mt-0.5">{f.note}</div>
                        </div>
                        <span
                          dir="ltr"
                          className={`font-mono-code font-bold shrink-0 ${
                            f.impactPercent > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : f.impactPercent < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[#687182] dark:text-[#8E97A8]'
                          }`}
                        >
                          {f.impactPercent > 0 ? `+${f.impactPercent}%` : `${f.impactPercent}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aiInsightError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                {aiInsightError}
              </div>
            )}
            {aiInsight && <AIInsightCard insight={aiInsight} />}
          </div>
        )}

        {/* 3. Device History Analysis */}
        {section === 'history' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <label className="block text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-1.5">
                  اختر الجهاز لتحليل تاريخه وموثوقيته
                </label>
                <select
                  value={targetDevice?.id || ''}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    setAiInsight(null);
                  }}
                  className="w-full max-w-md min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName} · {d.deviceCode}
                    </option>
                  ))}
                </select>
              </div>
              {targetDevice && (
                <button
                  type="button"
                  disabled={aiInsightLoading}
                  onClick={() => void triggerDeviceAIInsight('history')}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] px-4 text-xs font-extrabold hover:bg-[#E2C25B] disabled:opacity-60"
                >
                  {aiInsightLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  تلخيص السجل بالذكاء الاصطناعي
                </button>
              )}
            </div>

            {targetDevice && historySummary && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8]">مؤشر صحة وموثوقية السجل</span>
                    <Activity className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="text-4xl font-extrabold tabular-nums text-[#8F6D14] dark:text-[#D4AF37]">
                    {historySummary.healthScore} / 100
                  </div>
                  <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    التصنيف: {historySummary.trustGrade}
                  </div>
                  <div className="h-2.5 rounded-full bg-[#EEF0F4] dark:bg-[#1F2633] overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] rounded-full transition-all"
                      style={{ width: `${historySummary.healthScore}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <div className="text-[#687182] dark:text-[#8E97A8]">الأحداث المسجلة</div>
                      <div className="text-base font-bold tabular-nums mt-0.5">{historySummary.totalEventsCount}</div>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <div className="text-[#687182] dark:text-[#8E97A8]">الصيانات المعتمدة</div>
                      <div className="text-base font-bold tabular-nums mt-0.5">{historySummary.approvedRepairsCount}</div>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <div className="text-[#687182] dark:text-[#8E97A8]">القطع المستبدلة</div>
                      <div className="text-base font-bold tabular-nums mt-0.5">{historySummary.replacedPartsCount}</div>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <div className="text-[#687182] dark:text-[#8E97A8]">نقل الملكية</div>
                      <div className="text-base font-bold tabular-nums mt-0.5">{historySummary.completedTransfersCount}</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                      نقاط القوة في السجل
                    </h4>
                    <ul className="space-y-2 text-xs text-[#363E4D] dark:text-[#DCE1EA]">
                      {historySummary.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {historySummary.alerts.length > 0 && (
                    <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834]">
                      <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-2">
                        تنبيهات وملاحظات التاريخ
                      </h4>
                      <ul className="space-y-2 text-xs text-[#363E4D] dark:text-[#DCE1EA]">
                        {historySummary.alerts.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap gap-2">
                    <Link
                      to={`/devices/${targetDevice.id}/lifecycle`}
                      className="min-h-[40px] inline-flex items-center px-4 rounded-xl bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] text-xs font-bold"
                    >
                      فتح الخط الزمني الكامل للجهاز
                    </Link>
                    <Link
                      to={`/d/${targetDevice.publicToken}`}
                      className="min-h-[40px] inline-flex items-center px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold"
                    >
                      عرض الملف العام وQR
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {aiInsightError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                {aiInsightError}
              </div>
            )}
            {aiInsight && <AIInsightCard insight={aiInsight} />}
          </div>
        )}

        {/* 4. Used Device Pre-Purchase Risk Report */}
        {section === 'risk-report' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 grid md:grid-cols-2 gap-4 no-print">
              <div>
                <label className="block text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-1.5">
                  فحص عرض من سوق OMOR MARKET
                </label>
                <select
                  value={selectedListingId}
                  onChange={(e) => {
                    setSelectedListingId(e.target.value);
                    const found = listings.find((l) => l.id === e.target.value);
                    if (found) setSelectedDeviceId(found.deviceId);
                    setAiInsight(null);
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  <option value="">— اختر عرضًا من السوق —</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} · {formatCurrency(l.price, l.currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-1.5">
                  أو فحص أي جهاز مسجل مباشرة
                </label>
                <select
                  value={riskTargetDevice?.id || ''}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    setSelectedListingId('');
                    setAiInsight(null);
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName} · {d.deviceCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {riskTargetDevice && riskReport && (
              <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E8EBF0] dark:border-[#222834]">
                  <div>
                    <BrandLogo size="sm" className="mb-2" />
                    <h3 className="text-lg font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                      تقرير مخاطر شراء جهاز مستعمل — {riskTargetDevice.brand} {riskTargetDevice.deviceName}
                    </h3>
                    <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5">
                      رقم السجل: <span className="font-mono-code">{riskTargetDevice.deviceCode}</span>
                      {activeListingForRisk ? ` · السعر المعروض: ${formatCurrency(activeListingForRisk.price)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <Link
                      to={`/inspections?deviceId=${riskTargetDevice.id}`}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#8F6D14] dark:text-[#D4AF37] px-3.5 text-xs font-bold hover:bg-[#D4AF37]/20"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      فحص قبل الشراء (8 نقاط)
                    </Link>
                    <button
                      type="button"
                      disabled={aiInsightLoading}
                      onClick={() => void triggerDeviceAIInsight('risk_report')}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] text-[#0B1220] px-3.5 text-xs font-bold hover:bg-[#E2C25B]"
                    >
                      {aiInsightLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      استشارة الذكاء الاصطناعي للمشتري
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      طباعة التقرير
                    </button>
                  </div>
                </div>

                {/* Risk Verdict Banner */}
                <div
                  className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    riskReport.riskLevel === 'low'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                      : riskReport.riskLevel === 'medium'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {riskReport.riskLevel === 'low' ? (
                      <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-extrabold">{riskReport.verdictTitle}</div>
                      <p className="text-xs mt-1 leading-relaxed">{riskReport.verdictSummary}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-center px-3">
                    <div className="text-[11px] opacity-80">مؤشر المخاطرة</div>
                    <div className="text-2xl font-extrabold font-mono-code tabular-nums">
                      {riskReport.riskScore}%
                    </div>
                  </div>
                </div>

                {/* 6 Audit Axes */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {riskReport.axes.map((axis) => (
                    <div
                      key={axis.title}
                      className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#11161F] dark:text-[#F3F5F8]">{axis.title}</span>
                        <span
                          className={
                            axis.status === 'pass'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : axis.status === 'warning'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {axis.status === 'pass' ? 'سليم' : axis.status === 'warning' ? 'تحقق' : 'خطر'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A5363] dark:text-[#8E97A8] leading-relaxed">{axis.detail}</p>
                    </div>
                  ))}
                </div>

                {/* Checklist */}
                <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4">
                  <h4 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] mb-2">
                    قائمة الفحص الإلزامية قبل الدفع والاستلام
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                    {riskReport.inspectionChecklist.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {aiInsightError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                {aiInsightError}
              </div>
            )}
            {aiInsight && <AIInsightCard insight={aiInsight} />}
          </div>
        )}

        {/* 5. Spare Parts Pricing Statistics System */}
        {section === 'parts-stats' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="ابحث بالماركة، الموديل، أو اسم القطعة..."
                className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <select
                value={partCategoryFilter}
                onChange={(e) => setPartCategoryFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                <option value="all">جميع فئات القطع</option>
                {Object.entries(PART_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={partOriginFilter}
                onChange={(e) => setPartOriginFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                <option value="all">جميع المصادر (أصلية / بديلة / مستعملة)</option>
                {Object.entries(PART_ORIGIN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {filteredPartsStats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                        {stat.brand} · {stat.deviceModelPattern}
                      </div>
                      <h4 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] mt-0.5">
                        {stat.partName}
                      </h4>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold shrink-0">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                      ) : stat.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                      ) : null}
                      <span>{PART_ORIGIN_LABELS[stat.origin]}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                    <div>
                      <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">أدنى سعر</div>
                      <div className="text-xs sm:text-sm font-bold tabular-nums">{formatCurrency(stat.minPriceEgp)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8F6D14] dark:text-[#D4AF37]">المتوسط العادل</div>
                      <div className="text-xs sm:text-sm font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                        {formatCurrency(stat.avgPriceEgp)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">أعلى سعر</div>
                      <div className="text-xs sm:text-sm font-bold tabular-nums">{formatCurrency(stat.maxPriceEgp)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#687182] dark:text-[#8E97A8]">
                    <span>متوسط الضمان: {stat.avgWarrantyDays} يومًا · عينات: {stat.sampleCount}</span>
                    <span>{stat.sourceLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Spare Part Price Observation */}
            <form
              onSubmit={handleAddPartObservation}
              className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-base font-bold">
                <Plus className="w-5 h-5 text-[#D4AF37]" />
                <span>إضافة ملاحظة سعر قطعة غيار من الواقع الفعلي</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newPartBrand}
                  onChange={(e) => setNewPartBrand(e.target.value)}
                  placeholder="الماركة (مثال: Apple)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="text"
                  value={newPartModel}
                  onChange={(e) => setNewPartModel(e.target.value)}
                  placeholder="الموديل (مثال: iPhone 15 Pro)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="اسم القطعة (مثال: بطارية أصلية)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <select
                  value={newPartCat}
                  onChange={(e) => setNewPartCat(e.target.value as SparePartCategory)}
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {Object.entries(PART_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={newPartOrigin}
                  onChange={(e) => setNewPartOrigin(e.target.value as SparePartOrigin)}
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {Object.entries(PART_ORIGIN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={50}
                    value={newPartPrice}
                    onChange={(e) => setNewPartPrice(e.target.value)}
                    placeholder="السعر (ج.م)"
                    className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newPartWarranty}
                    onChange={(e) => setNewPartWarranty(e.target.value)}
                    placeholder="الضمان (أيام)"
                    className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                  />
                </div>
              </div>
              {partFormMsg && <div className="text-xs text-[#8F6D14] dark:text-[#D4AF37]">{partFormMsg}</div>}
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
              >
                إضافة لإحصائيات القطع
              </button>
            </form>
          </div>
        )}

        {/* 6. Enterprise & Maintenance Centers B2B Integration */}
        {section === 'partners' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {b2bPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                        {B2B_TYPE_LABELS[partner.partnerType]}
                      </span>
                      <span
                        className={`font-bold ${
                          partner.integrationStatus === 'connected'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {partner.integrationStatus === 'connected'
                          ? 'مربوط ومعتمد'
                          : partner.integrationStatus === 'sandbox'
                            ? 'ربط تجريبي'
                            : 'قيد المراجعة'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                      {partner.companyName}
                    </h4>

                    <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                      {partner.governorate} · {partner.branchesCount} فروع · زمن استجابة SLA: {partner.slaHours} ساعة
                    </p>

                    <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                      {partner.warrantyPolicy}
                    </p>

                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      الماركات المدعومة: {partner.supportedBrands.join('، ')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#687182] dark:text-[#8E97A8]">معرّف التكامل (Webhook)</span>
                      <span className="font-mono-code font-bold text-[#1E2430] dark:text-[#DCE1EA]">
                        {partner.webhookCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#687182] dark:text-[#8E97A8]">تاريخ الانضمام</span>
                      <span className="tabular-nums">{formatArabicDate(partner.createdAt)}</span>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => void adminToggleB2BPartnerStatus(partner.id)}
                        className="w-full mt-2 min-h-[38px] rounded-xl border border-[#D4AF37]/50 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        {partner.integrationStatus === 'connected' ? 'تعليق مؤقت / قيد المراجعة' : 'اعتماد وتفعيل الربط'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Register New B2B Partner */}
            <form
              onSubmit={handleRegisterB2B}
              className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#D4AF37]" />
                  <span>طلب ربط شركة أو شبكة مراكز صيانة مع OMOR V3</span>
                </h3>
                <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
                  تتيح واجهة ربط الشركات توحيد الفروع، تسجيل الضمانات تلقائيًا، ومتابعة تقارير الصيانة عبر معرّف تكامل مستقل.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={b2bName}
                  onChange={(e) => setB2bName(e.target.value)}
                  placeholder="اسم الشركة أو شبكة المراكز"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <select
                  value={b2bType}
                  onChange={(e) => setB2bType(e.target.value as B2BPartnerType)}
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {Object.entries(B2B_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={b2bGov}
                  onChange={(e) => setB2bGov(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {EGYPT_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={b2bBranches}
                  onChange={(e) => setB2bBranches(e.target.value)}
                  placeholder="عدد الفروع"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="text"
                  value={b2bBrands}
                  onChange={(e) => setB2bBrands(e.target.value)}
                  placeholder="الماركات المدعومة (مفصولة بفاصلة)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="number"
                  min={4}
                  value={b2bSla}
                  onChange={(e) => setB2bSla(e.target.value)}
                  placeholder="اتفاقية SLA بالساعات (مثل 24)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="text"
                  value={b2bPhone}
                  onChange={(e) => setB2bPhone(e.target.value)}
                  placeholder="رقم تواصل الأعمال"
                  dir="ltr"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm font-mono-code"
                />
                <input
                  type="email"
                  value={b2bEmail}
                  onChange={(e) => setB2bEmail(e.target.value)}
                  placeholder="البريد المؤسسي"
                  dir="ltr"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
                <input
                  type="text"
                  value={b2bPolicy}
                  onChange={(e) => setB2bPolicy(e.target.value)}
                  placeholder="سياسة الضمان المعتمدة (مثال: 180 يومًا)"
                  className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
              </div>

              {b2bMsg && <div className="text-xs text-[#8F6D14] dark:text-[#D4AF37]">{b2bMsg}</div>}

              <button
                type="submit"
                className="min-h-[44px] px-6 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-extrabold hover:bg-[#E2C25B]"
              >
                تسجيل طلب الربط المؤسسي
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
};

const AIInsightCard: React.FC<{ insight: AIIntelligenceInsight }> = ({ insight }) => (
  <section className="rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-6 space-y-4">
    <div className="flex items-center gap-2 text-sm font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
      <Sparkles className="w-4 h-4" />
      <span>{insight.headline}</span>
    </div>
    <p className="text-xs sm:text-sm text-[#363E4D] dark:text-[#DCE1EA] leading-relaxed">
      {insight.executiveSummary}
    </p>
    {insight.keyHighlights?.length > 0 && (
      <div>
        <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1.5">أبرز النقاط المستخلصة</div>
        <ul className="list-disc list-inside space-y-1 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
          {insight.keyHighlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>
    )}
    {insight.actionRecommendations?.length > 0 && (
      <div>
        <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1.5">توصيات عملية</div>
        <ul className="list-disc list-inside space-y-1 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
          {insight.actionRecommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    )}
  </section>
);

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  FileCheck2,
  Flame,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import {
  ORANGE_CASH_BENEFICIARY_NAME,
  ORANGE_CASH_RECEIVER_PHONE,
} from '../lib/constants';
import {
  ROLE_LABELS,
  formatArabicDateTime,
  formatCurrency,
  getDaysRemaining,
} from '../lib/labels';
import type {
  DynamicPaidServiceItem,
  PaidBillingPeriod,
  PaidCatalogCategory,
  PaymentMethodConfigItem,
  PaymentMethodOption,
  PaymentProofRequest,
} from '../types/omor';

const CATEGORY_TABS: Array<{
  key: 'all' | PaidCatalogCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'all', label: 'جميع الخدمات والباقات', icon: Crown },
  { key: 'customer', label: 'الأفراد والعملاء', icon: User },
  { key: 'technician', label: 'الفنيون ومراكز الصيانة', icon: Wrench },
  { key: 'store', label: 'التجار ومحلات الهواتف', icon: Store },
  { key: 'verification_reports', label: 'التوثيق والتقارير', icon: FileCheck2 },
  { key: 'future', label: 'خدمات مستقبلية', icon: Sparkles },
];

const CATEGORY_LABELS: Record<PaidCatalogCategory, string> = {
  customer: 'خدمات الأفراد والعملاء',
  technician: 'خدمات الفنيين ومراكز الصيانة',
  store: 'خدمات التجار ومحلات الموبايلات',
  verification_reports: 'خدمات توثيق الأجهزة والتقارير',
  future: 'خدمات إضافية مستقبلية',
};

const BILLING_LABELS: Record<PaidBillingPeriod, string> = {
  one_time: 'طلب لمرة واحدة',
  monthly: 'اشتراك شهري',
  yearly: 'اشتراك سنوي',
  custom: 'مدة مخصصة',
};

function readProofFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح (PNG / JPG / WEBP).'));
      return;
    }
    if (file.size > 2_500_000) {
      reject(new Error('حجم صورة إثبات التحويل يجب أن لا يتجاوز 2.5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });
}

function defaultLocalDatetime(): string {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 16);
}

export const ProServicesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    currentUser,
    myDevices,
    listings,
    myEntitlements,
    myPaymentRequests,
    apiFetch,
    refreshMonetization,
  } = useApp();

  const [catalog, setCatalog] = useState<DynamicPaidServiceItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfigItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const initialCat = useMemo<'all' | PaidCatalogCategory>(() => {
    const paramCat = searchParams.get('category') as PaidCatalogCategory | null;
    if (paramCat && CATEGORY_TABS.some((t) => t.key === paramCat)) return paramCat;
    const paramSvc = searchParams.get('service') || '';
    if (paramSvc.startsWith('store_')) return 'store';
    if (paramSvc.startsWith('tech_')) return 'technician';
    if (paramSvc.startsWith('rep_')) return 'verification_reports';
    if (paramSvc.startsWith('cust_')) return 'customer';
    return 'all';
  }, [searchParams]);

  const [categoryTab, setCategoryTab] = useState<'all' | PaidCatalogCategory>(initialCat);

  // Checkout Modal State
  const [selectedService, setSelectedService] = useState<DynamicPaidServiceItem | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'instructions' | 'proof_form' | 'submitted'>('instructions');
  const [selectedMethodCode, setSelectedMethodCode] = useState<PaymentMethodOption>('orange_cash');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [targetListingId, setTargetListingId] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{
    ok: boolean;
    message: string;
    discountEgp: number;
    finalEgp: number;
  } | null>(null);

  const [senderWalletPhone, setSenderWalletPhone] = useState('');
  const [transferredAmount, setTransferredAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transferDatetime, setTransferDatetime] = useState(defaultLocalDatetime);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [userNote, setUserNote] = useState('');

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [createdRequest, setCreatedRequest] = useState<PaymentProofRequest | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    const res = await apiFetch<{
      services: DynamicPaidServiceItem[];
      paymentMethods: PaymentMethodConfigItem[];
    }>('/api/monetization/catalog');
    if (res.ok && res.data) {
      setCatalog(res.data.services || []);
      const enabledPms = res.data.paymentMethods || [];
      setPaymentMethods(enabledPms);
      if (enabledPms.length > 0) {
        setSelectedMethodCode(enabledPms[0].code);
      }
    }
    setLoadingCatalog(false);
  }, [apiFetch]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const paramService = searchParams.get('service');
    if (paramService && catalog.length > 0 && !selectedService) {
      const match = catalog.find((s) => s.code === paramService || s.id === paramService);
      if (match && match.isActive) {
        openCheckout(match);
      }
    }
  }, [catalog, searchParams]);

  const myActiveListings = useMemo(
    () =>
      currentUser
        ? listings.filter((l) => l.sellerId === currentUser.id && l.status === 'active')
        : [],
    [listings, currentUser]
  );

  const visibleServices = useMemo(() => {
    if (categoryTab === 'all') {
      return catalog.filter((s) => s.isActive);
    }
    return catalog.filter((s) => s.category === categoryTab);
  }, [catalog, categoryTab]);

  const activeEntitlements = useMemo(
    () => myEntitlements.filter((e) => e.status === 'active'),
    [myEntitlements]
  );
  const pendingRequestsCount = useMemo(
    () =>
      myPaymentRequests.filter(
        (r) => r.status === 'pending_review' || r.status === 'needs_more_proof'
      ).length,
    [myPaymentRequests]
  );

  const activePaymentMethod = useMemo(
    () =>
      paymentMethods.find((p) => p.code === selectedMethodCode) ||
      paymentMethods[0] || {
        code: 'orange_cash' as PaymentMethodOption,
        displayName: 'أورنج كاش (Orange Cash)',
        receiverAccount: ORANGE_CASH_RECEIVER_PHONE,
        beneficiaryName: ORANGE_CASH_BENEFICIARY_NAME,
        instructions:
          'حوّل المبلغ المطلوب بالضبط عبر محفظة أورنج كاش ثم أرفق لقطة شاشة لإثبات التحويل.',
        requiresManualProof: true,
        isEnabled: true,
        sortOrder: 1,
        updatedAt: '',
      },
    [paymentMethods, selectedMethodCode]
  );

  const finalExpectedAmount = useMemo(() => {
    if (!selectedService) return 0;
    if (promoFeedback?.ok) return promoFeedback.finalEgp;
    return selectedService.priceEgp;
  }, [selectedService, promoFeedback]);

  function openCheckout(svc: DynamicPaidServiceItem) {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setSelectedService(svc);
    setCheckoutStep('instructions');
    setModalError('');
    setCreatedRequest(null);
    setPromoCodeInput('');
    setPromoFeedback(null);
    setSenderWalletPhone(currentUser.phone || '');
    setTransferredAmount(String(svc.priceEgp));
    setReferenceNumber('');
    setTransferDatetime(defaultLocalDatetime());
    setScreenshotDataUrl('');
    setUserNote('');
    setTargetDeviceId(
      searchParams.get('deviceId') || myDevices[0]?.id || ''
    );
    setTargetListingId(
      searchParams.get('listingId') || myActiveListings[0]?.id || ''
    );
  }

  const handleApplyPromo = async () => {
    if (!selectedService) return;
    if (!promoCodeInput.trim()) {
      setPromoFeedback(null);
      setTransferredAmount(String(selectedService.priceEgp));
      return;
    }
    setPromoApplying(true);
    setModalError('');
    const res = await apiFetch<{
      ok: boolean;
      originalPriceEgp: number;
      discountAmountEgp: number;
      finalAmountEgp: number;
      error?: string;
    }>('/api/monetization/validate-promo', {
      method: 'POST',
      body: JSON.stringify({
        serviceId: selectedService.id,
        promoCode: promoCodeInput.trim(),
      }),
    });
    setPromoApplying(false);
    if (!res.ok || !res.data) {
      setPromoFeedback({
        ok: false,
        message: res.error || 'كود الخصم غير صالح.',
        discountEgp: 0,
        finalEgp: selectedService.priceEgp,
      });
      setTransferredAmount(String(selectedService.priceEgp));
    } else {
      setPromoFeedback({
        ok: true,
        message: `تم تطبيق الخصم بقيمة ${formatCurrency(res.data.discountAmountEgp)}`,
        discountEgp: res.data.discountAmountEgp,
        finalEgp: res.data.finalAmountEgp,
      });
      setTransferredAmount(String(res.data.finalAmountEgp));
    }
  };

  const handleCopyWallet = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2500);
    } catch {
      setCopiedWallet(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !currentUser) return;
    setModalError('');

    if (!senderWalletPhone.trim() || senderWalletPhone.trim().length < 8) {
      setModalError('يرجى إدخال رقم المحفظة المحوِّل منها بشكل صحيح.');
      return;
    }
    const amt = Number(transferredAmount || 0);
    if (amt <= 0 || amt < finalExpectedAmount) {
      setModalError(
        `المبلغ المحوّل (${amt} ج.م) يجب أن يساوي على الأقل قيمة الخدمة (${finalExpectedAmount} ج.م).`
      );
      return;
    }
    if (!screenshotDataUrl) {
      setModalError('يرجى إرفاق صورة إثبات التحويل (Screenshot) قبل الإرسال.');
      return;
    }
    if (selectedService.requiresListing && !targetListingId) {
      setModalError('يرجى اختيار الإعلان المطلوب تطبيق الخدمة عليه.');
      return;
    }

    setSubmitting(true);
    const res = await apiFetch<{ ok: boolean; request?: PaymentProofRequest }>('/api/monetization/payments', {
      method: 'POST',
      body: JSON.stringify({
        serviceId: selectedService.id,
        paymentMethod: activePaymentMethod.code,
        senderWalletPhone: senderWalletPhone.trim(),
        transferredAmountEgp: amt,
        referenceNumber: referenceNumber.trim() || undefined,
        transferDatetime,
        screenshotDataUrl,
        promoCode: promoFeedback?.ok ? promoCodeInput.trim() : undefined,
        targetDeviceId: targetDeviceId || undefined,
        targetListingId: targetListingId || undefined,
        userNote: userNote.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok || !res.data?.request) {
      setModalError(res.error || 'تعذر إرسال إثبات الدفع للمراجعة.');
      return;
    }

    setCreatedRequest(res.data.request);
    setCheckoutStep('submitted');
    await refreshMonetization();
  };

  return (
    <AppShell title="الخدمات المدفوعة — OMOR Premium">
      <div className="space-y-6">
        {/* Top Summary Header */}
        <section className="rounded-2xl border border-[#D4AF37]/35 bg-[#141923] text-[#F3F5F8] p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
                <Crown className="w-4 h-4" />
                <span>مركز الخدمات المدفوعة والاشتراكات الاختيارية · OMOR Premium</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-balance">
                خدمات اختيارية احترافية للأفراد والفنيين والتجار وتوثيق الأجهزة
              </h2>
              <p className="text-xs sm:text-sm text-[#C5CCD8] leading-relaxed">
                تظل الأدوات الأساسية في منصة عُمْر مجانية للجميع، بينما تتيح لك هذه الخدمات ترقيات اختيارية وتقارير احترافية ومزايا ظهور متقدمة. يتم السداد عبر محفظة أورنج كاش المعتمدة مع مراجعة يدوية سريعة لإثبات التحويل.
              </p>
            </div>

            <div className="rounded-xl border border-[#252C38] bg-[#0B1220] p-4 min-w-[270px] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8E97A8]">رقم أورنج كاش المعتمد</span>
                <span dir="ltr" className="font-mono-code font-extrabold text-sm text-[#D4AF37]">
                  {ORANGE_CASH_RECEIVER_PHONE}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E97A8]">الخدمات المفعّلة بحسابك</span>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {activeEntitlements.length} خدمة
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E97A8]">طلبات دفع قيد المراجعة</span>
                <span className="font-bold text-amber-400 tabular-nums">
                  {pendingRequestsCount} طلب
                </span>
              </div>
              <Link
                to="/my-payments"
                className="w-full min-h-[40px] rounded-xl border border-[#D4AF37]/50 text-[#D4AF37] font-bold flex items-center justify-center gap-2 hover:bg-[#D4AF37] hover:text-[#0B1220] transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>سجل مدفوعاتي واشتراكاتي والتقارير</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Active Entitlements Quick Notice */}
        {activeEntitlements.length > 0 && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>لديك {activeEntitlements.length} اشتراك / خدمة مفعّلة حاليًا</span>
              </div>
              <div className="text-[#4A5363] dark:text-[#C5CCD8]">
                {activeEntitlements
                  .slice(0, 3)
                  .map((e) => {
                    const days = e.expiresAt ? getDaysRemaining(e.expiresAt) : null;
                    return `${e.serviceName}${days !== null ? ` (متبقي ${Math.max(0, days)} يوم)` : ''}`;
                  })
                  .join(' · ')}
              </div>
            </div>
            <Link
              to="/my-payments"
              className="min-h-[38px] px-4 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500"
            >
              إدارة الخدمات والتقارير
            </Link>
          </section>
        )}

        {/* 5-Category Segmented Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((t) => {
            const Icon = t.icon;
            const active = categoryTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setCategoryTab(t.key)}
                className={`min-h-[42px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#D4AF37] text-[#0B1220]'
                    : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8] hover:border-[#D4AF37]/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Catalog Grid */}
        {loadingCatalog ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] animate-pulse p-5"
              />
            ))}
          </div>
        ) : visibleServices.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center space-y-2 text-xs text-[#687182] dark:text-[#8E97A8]">
            <p className="font-bold text-sm text-[#11161F] dark:text-[#F3F5F8]">
              لا توجد خدمات مفعّلة في هذا القسم حاليًا
            </p>
            <p>تقوم إدارة المنصة بإتاحة هذه الخدمات وتفعيلها مباشرة من لوحة التحكم.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleServices.map((svc) => {
              const durationLabel =
                svc.durationDays > 0
                  ? `${BILLING_LABELS[svc.billingPeriod]} · ${svc.durationDays} يومًا`
                  : BILLING_LABELS[svc.billingPeriod];
              const isFutureLocked = svc.category === 'future' && !svc.isActive;
              const alreadyActive = activeEntitlements.some((e) => e.serviceId === svc.id);

              return (
                <article
                  key={svc.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 flex flex-col justify-between gap-5 hover:border-[#D4AF37]/60 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      <span>{CATEGORY_LABELS[svc.category]}</span>
                      <span className="font-mono-code tabular-nums">
                        {svc.itemType === 'package' ? 'باقة' : 'خدمة'} · {durationLabel}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8] leading-snug">
                        {svc.name}
                      </h3>
                      <div className="shrink-0 text-left">
                        <div className="text-lg font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                          {formatCurrency(svc.priceEgp)}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                      {svc.shortDesc}
                    </p>

                    <ul className="space-y-1.5 pt-2 border-t border-[#E8EBF0] dark:border-[#222834] text-xs text-[#363E4D] dark:text-[#DCE1EA]">
                      {svc.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {svc.quotaCredits > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        + يشمل {svc.quotaCredits} رصيد تحليل / تشخيص ذكي إضافي
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] flex items-center justify-between">
                      <span>التفعيل: بعد مراجعة إثبات الدفع</span>
                      {alreadyActive && (
                        <span className="font-bold text-emerald-500">مفعّلة بحسابك</span>
                      )}
                    </div>

                    {isFutureLocked ? (
                      <button
                        type="button"
                        disabled
                        className="w-full min-h-[44px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] text-xs font-bold text-[#7A8394] opacity-70 cursor-not-allowed"
                      >
                        خدمة مستقبلية (متاحة للتفعيل من الإدارة قريبًا)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCheckout(svc)}
                        className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-extrabold hover:bg-[#E2C25B] transition-colors flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>{alreadyActive ? 'طلب تجديد / إضافة رصيد' : 'اشترك أو اطلب الخدمة الآن'}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Manual Orange Cash Payment & Proof Checkout Modal */}
        {selectedService && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedService(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE0E7] dark:border-[#252C38]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                      {checkoutStep === 'instructions'
                        ? 'الخطوة 1: بيانات التحويل عبر أورنج كاش'
                        : checkoutStep === 'proof_form'
                          ? 'الخطوة 2: إرسال إثبات الدفع للمراجعة'
                          : 'تم استلام طلب الدفع للمراجعة'}
                    </h3>
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      {selectedService.name}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-[#7A8394] hover:text-[#11161F] dark:hover:text-[#F3F5F8]"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step 1: Payment Instructions + Promo Code */}
              {checkoutStep === 'instructions' && (
                <div className="space-y-4 text-xs">
                  {/* Target Device or Listing if needed */}
                  {selectedService.requiresDevice && myDevices.length > 0 && (
                    <div>
                      <label className="block font-bold mb-1.5">اختر الجهاز المطلوب للتقرير</label>
                      <select
                        value={targetDeviceId}
                        onChange={(e) => setTargetDeviceId(e.target.value)}
                        className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                      >
                        {myDevices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.brand} {d.deviceName} ({d.deviceCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedService.requiresListing && (
                    <div>
                      <label className="block font-bold mb-1.5">اختر الإعلان المطلوب في OMOR MARKET</label>
                      {myActiveListings.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 space-y-1.5">
                          <p>لا يوجد لديك إعلان نشط حاليًا لتطبيق هذه الخدمة عليه.</p>
                          <Link to="/market/new" className="font-bold underline text-[#D4AF37]">
                            أضف إعلانًا في السوق أولاً
                          </Link>
                        </div>
                      ) : (
                        <select
                          value={targetListingId}
                          onChange={(e) => setTargetListingId(e.target.value)}
                          className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                        >
                          {myActiveListings.map((lst) => (
                            <option key={lst.id} value={lst.id}>
                              {lst.title} ({formatCurrency(lst.price)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Promo Code Box */}
                  <div className="space-y-1.5">
                    <label className="block font-bold">هل لديك كود خصم ترويجي؟ (اختياري)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        placeholder="مثال: OMOR20"
                        className="flex-1 min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                      />
                      <button
                        type="button"
                        onClick={() => void handleApplyPromo()}
                        disabled={promoApplying}
                        className="min-h-[42px] px-4 rounded-xl border border-[#D4AF37] text-[#8F6D14] dark:text-[#D4AF37] font-bold hover:bg-[#D4AF37] hover:text-[#0B1220] transition-colors whitespace-nowrap"
                      >
                        {promoApplying ? 'جاري الفحص...' : 'تطبيق الكود'}
                      </button>
                    </div>
                    {promoFeedback && (
                      <div className={promoFeedback.ok ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                        {promoFeedback.message}
                      </div>
                    )}
                  </div>

                  {/* Enabled Payment Method Selector (if more than 1 enabled by Admin) */}
                  {paymentMethods.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="block font-bold">اختر وسيلة الدفع المتاحة</label>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map((pm) => (
                          <button
                            key={pm.code}
                            type="button"
                            onClick={() => setSelectedMethodCode(pm.code)}
                            className={`min-h-[40px] rounded-xl border px-3 font-bold text-xs ${
                              activePaymentMethod.code === pm.code
                                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'
                                : 'border-[#DCE0E7] dark:border-[#252C38] text-[#687182] dark:text-[#8E97A8]'
                            }`}
                          >
                            {pm.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transfer Instructions Box */}
                  <div className="rounded-xl border border-[#D4AF37]/40 bg-[#0B1220] text-[#F3F5F8] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#D4AF37]">
                        {activePaymentMethod.displayName}
                      </span>
                      <span className="text-sm font-extrabold tabular-nums">
                        المطلوب تحويله: {formatCurrency(finalExpectedAmount)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#252C38] bg-[#141923] p-3">
                      <div>
                        <div className="text-[11px] text-[#8E97A8]">رقم المحفظة المستقبلة للتحويل</div>
                        <div dir="ltr" className="font-mono-code text-lg font-extrabold text-[#D4AF37] tabular-nums">
                          {activePaymentMethod.receiverAccount || ORANGE_CASH_RECEIVER_PHONE}
                        </div>
                        <div className="text-[11px] text-[#C5CCD8] mt-0.5">
                          المستفيد: {activePaymentMethod.beneficiaryName || ORANGE_CASH_BENEFICIARY_NAME}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyWallet(
                            activePaymentMethod.receiverAccount || ORANGE_CASH_RECEIVER_PHONE
                          )
                        }
                        className="min-h-[38px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5 hover:bg-[#E2C25B]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedWallet ? 'تم النسخ' : 'نسخ الرقم'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-[#C5CCD8] leading-relaxed">
                      {activePaymentMethod.instructions}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    ملاحظة مهمة: إرسال إثبات التحويل يضع الطلب في حالة <strong>قيد المراجعة</strong>، ولا يتم تفعيل الخدمة أو الباقة إلا بعد تأكد الإدارة من وصول المبلغ الفعلي إلى المحفظة.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedService(null)}
                      className="min-h-[42px] px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] font-semibold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={selectedService.requiresListing && myActiveListings.length === 0}
                      onClick={() => {
                        setModalError('');
                        setTransferredAmount(String(finalExpectedAmount));
                        setCheckoutStep('proof_form');
                      }}
                      className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold hover:bg-[#E2C25B] disabled:opacity-50"
                    >
                      لقد قمت بالتحويل — متابعة لرفع الإثبات
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Proof Submission Form */}
              {checkoutStep === 'proof_form' && currentUser && (
                <form onSubmit={handleSubmitProof} className="space-y-3.5 text-xs">
                  {/* Verified Account Identity Summary */}
                  <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">صاحب الحساب: </span>
                      <strong className="text-[#11161F] dark:text-[#F3F5F8]">{currentUser.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">معرف OMOR: </span>
                      <span dir="ltr" className="font-mono-code font-bold">{currentUser.id}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">نوع الحساب: </span>
                      <strong>{ROLE_LABELS[currentUser.role]}</strong>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">المبلغ المطلوب: </span>
                      <strong className="text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                        {formatCurrency(finalExpectedAmount)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">رقم المحفظة المحوِّل منها *</label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={senderWalletPhone}
                        onChange={(e) => setSenderWalletPhone(e.target.value)}
                        placeholder="012XXXXXXXX"
                        className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">المبلغ المحوّل فعليًا (ج.م) *</label>
                      <input
                        type="number"
                        required
                        min={finalExpectedAmount}
                        step="0.01"
                        value={transferredAmount}
                        onChange={(e) => setTransferredAmount(e.target.value)}
                        className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">رقم العملية / المرجع (إن وُجد)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="مثال: OC-9482710"
                        className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">تاريخ ووقت التحويل *</label>
                      <input
                        type="datetime-local"
                        required
                        dir="ltr"
                        value={transferDatetime}
                        onChange={(e) => setTransferDatetime(e.target.value)}
                        className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5">
                      صورة إثبات التحويل (Screenshot واضحة) *
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-[#F1F3F6] dark:bg-[#0E131C] p-4 cursor-pointer hover:border-[#D4AF37]">
                      <Upload className="w-5 h-5 text-[#D4AF37]" />
                      <span className="font-semibold">
                        {screenshotDataUrl
                          ? 'تم اختيار الصورة — اضغط للاستبدال'
                          : 'اضغط لاختيار لقطة شاشة التحويل (حد أقصى 2.5 ميجابايت)'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setModalError('');
                            const url = await readProofFile(file);
                            setScreenshotDataUrl(url);
                          } catch (err) {
                            setModalError(err instanceof Error ? err.message : 'تعذر قراءة الصورة.');
                          }
                        }}
                      />
                    </label>
                    {screenshotDataUrl && (
                      <div className="mt-2 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] overflow-hidden max-h-48 flex justify-center bg-black/20">
                        <img
                          src={screenshotDataUrl}
                          alt="معاينة إثبات التحويل"
                          className="max-h-48 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold mb-1">ملاحظة إضافية للمراجع (اختياري)</label>
                    <textarea
                      rows={2}
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      placeholder="أي تفاصيل إضافية تساعد الإدارة في مطابقة التحويل..."
                      className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3"
                    />
                  </div>

                  {modalError && (
                    <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-rose-500">
                      {modalError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('instructions')}
                      className="min-h-[42px] px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] font-semibold"
                    >
                      رجوع لبيانات التحويل
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold hover:bg-[#E2C25B] disabled:opacity-60"
                    >
                      {submitting ? 'جاري إرسال الإثبات...' : 'إرسال إثبات الدفع للمراجعة'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Pending Review Confirmation */}
              {checkoutStep === 'submitted' && createdRequest && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-amber-700 dark:text-amber-300">
                      <Clock className="w-5 h-5" />
                      <span>تم استلام طلب الدفع — الحالة الحالية: قيد المراجعة</span>
                    </div>
                    <p className="text-[#363E4D] dark:text-[#C5CCD8] leading-relaxed">
                      شكرًا لك! تم حفظ إثبات التحويل برقم طلب{' '}
                      <strong dir="ltr" className="font-mono-code text-[#D4AF37]">
                        {createdRequest.id}
                      </strong>
                      . ستقوم الإدارة بمراجعة التحويل والتأكد من وصول المبلغ إلى محفظة أورنج كاش{' '}
                      <span dir="ltr" className="font-mono-code">
                        {createdRequest.receiverWallet}
                      </span>{' '}
                      قبل تفعيل الخدمة.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#687182] dark:text-[#8E97A8]">الخدمة المطلوبة</span>
                      <span className="font-bold">{createdRequest.serviceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#687182] dark:text-[#8E97A8]">المبلغ المحوّل</span>
                      <span className="font-bold text-[#D4AF37] tabular-nums">
                        {formatCurrency(createdRequest.transferredAmountEgp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#687182] dark:text-[#8E97A8]">وقت التسجيل</span>
                      <span className="tabular-nums">{formatArabicDateTime(createdRequest.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedService(null)}
                      className="min-h-[42px] px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] font-semibold"
                    >
                      البقاء في صفحة الخدمات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService(null);
                        navigate('/my-payments');
                      }}
                      className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold hover:bg-[#E2C25B]"
                    >
                      متابعة حالة الطلب في مدفوعاتي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

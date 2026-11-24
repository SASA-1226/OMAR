import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Gift,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, formatArabicDate, formatArabicDateTime, formatCurrency } from '../lib/labels';
import type {
  AdminCustomerSummary,
  DynamicPaidServiceItem,
  PaidBillingPeriod,
  PaidCatalogCategory,
  PaymentMethodConfigItem,
  PaymentProofRequest,
  PaymentRequestStatus,
  PromoCodeItem,
  RevenueAnalyticsSummary,
  UserEntitlement,
} from '../types/omor';

interface AdminMonetizationCenterProps {
  authMode: 'app' | 'cms';
  cmsAdminFetch?: <T = Record<string, unknown>>(
    url: string,
    options?: RequestInit
  ) => Promise<{ ok: boolean; status?: number; data?: T; error?: string }>;
}

type CenterSubTab = 'revenue' | 'payments' | 'catalog' | 'promos_entitlements' | 'methods';

const CATEGORY_LABELS: Record<PaidCatalogCategory, string> = {
  customer: 'خدمات الأفراد والعملاء',
  technician: 'خدمات الفنيين ومراكز الصيانة',
  store: 'خدمات التجار ومحلات الهواتف',
  verification_reports: 'خدمات توثيق الأجهزة والتقارير',
  future: 'خدمات إضافية مستقبلية',
};

const PAY_STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  pending_review: 'قيد المراجعة',
  needs_more_proof: 'مطلوب إثبات إضافي',
  approved: 'مقبول ومؤكد',
  rejected: 'مرفوض',
};

interface OverviewResponse {
  revenue: RevenueAnalyticsSummary;
  catalog: DynamicPaidServiceItem[];
  paymentMethods: PaymentMethodConfigItem[];
  promoCodes: PromoCodeItem[];
  requests: PaymentProofRequest[];
  entitlements: UserEntitlement[];
  users: AdminCustomerSummary[];
}

export const AdminMonetizationCenter: React.FC<AdminMonetizationCenterProps> = ({
  authMode,
  cmsAdminFetch,
}) => {
  const { apiFetch, refreshAppState } = useApp();

  const callApi = useCallback(
    async <T = Record<string, unknown>>(
      url: string,
      options: RequestInit = {}
    ): Promise<{ ok: boolean; status?: number; data?: T; error?: string }> => {
      if (authMode === 'cms' && cmsAdminFetch) {
        return cmsAdminFetch<T>(url, options);
      }
      return apiFetch<T>(url, options);
    },
    [authMode, cmsAdminFetch, apiFetch]
  );

  const [subTab, setSubTab] = useState<CenterSubTab>('payments');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentRequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const [revenue, setRevenue] = useState<RevenueAnalyticsSummary | null>(null);
  const [catalog, setCatalog] = useState<DynamicPaidServiceItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfigItem[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [requests, setRequests] = useState<PaymentProofRequest[]>([]);
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);

  // Review Modal State
  const [reviewTarget, setReviewTarget] = useState<PaymentProofRequest | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [rejectionInput, setRejectionInput] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  // Customer Profile Drawer Modal
  const [customerProfileModal, setCustomerProfileModal] = useState<AdminCustomerSummary | null>(null);

  // Catalog Editor State
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [svcCode, setSvcCode] = useState('');
  const [svcCat, setSvcCat] = useState<PaidCatalogCategory>('customer');
  const [svcType, setSvcType] = useState<'service' | 'package'>('service');
  const [svcName, setSvcName] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcPrice, setSvcPrice] = useState('50');
  const [svcPeriod, setSvcPeriod] = useState<PaidBillingPeriod>('monthly');
  const [svcDays, setSvcDays] = useState('30');
  const [svcQuota, setSvcQuota] = useState('0');
  const [svcFeatures, setSvcFeatures] = useState('');
  const [svcReqDevice, setSvcReqDevice] = useState(false);
  const [svcReqListing, setSvcReqListing] = useState(false);
  const [svcActive, setSvcActive] = useState(true);
  const [svcSort, setSvcSort] = useState('50');

  // Promo Code Form
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed_egp'>('percent');
  const [promoValue, setPromoValue] = useState('15');
  const [promoMaxUses, setPromoMaxUses] = useState('50');
  const [promoExpires, setPromoExpires] = useState('');

  // Manual Grant / Trial Form
  const [grantUserId, setGrantUserId] = useState('');
  const [grantServiceId, setGrantServiceId] = useState('');
  const [grantIsTrial, setGrantIsTrial] = useState(true);
  const [grantStart, setGrantStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [grantEnd, setGrantEnd] = useState('');

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const res = await callApi<OverviewResponse>('/api/monetization/admin/overview');
    if (res.ok && res.data) {
      setRevenue(res.data.revenue);
      setCatalog(res.data.catalog || []);
      setPaymentMethods(res.data.paymentMethods || []);
      setPromoCodes(res.data.promoCodes || []);
      setRequests(res.data.requests || []);
      setEntitlements(res.data.entitlements || []);
      setCustomers(res.data.users || []);
      if (!grantUserId && res.data.users?.[0]) {
        setGrantUserId(res.data.users[0].id);
      }
      if (!grantServiceId && res.data.catalog?.[0]) {
        setGrantServiceId(res.data.catalog[0].id);
      }
    } else {
      showToast(false, res.error || 'تعذر تحميل بيانات الأرباح والمدفوعات.');
    }
    setLoading(false);
  }, [callApi]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.userAccountCode.toLowerCase().includes(q) ||
        r.senderWalletPhone.includes(q) ||
        (r.referenceNumber || '').toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const handleReviewAction = async (
    action: 'approve' | 'reject' | 'needs_more_proof' | 'note_only'
  ) => {
    if (!reviewTarget) return;
    if (action === 'reject' && !rejectionInput.trim()) {
      showToast(false, 'يجب كتابة سبب الرفض ليظهر للعميل بوضوح.');
      return;
    }
    setReviewBusy(true);
    const res = await callApi(`/api/monetization/admin/payments/${encodeURIComponent(reviewTarget.id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        adminNote: adminNoteInput.trim() || undefined,
        rejectionReason: rejectionInput.trim() || undefined,
      }),
    });
    setReviewBusy(false);
    if (!res.ok) {
      showToast(false, res.error || 'تعذر تنفيذ المراجعة.');
      return;
    }
    showToast(
      true,
      action === 'approve'
        ? 'تم تأكيد التحويل وتفعيل الخدمة وحساب الإيراد المؤكد بنجاح.'
        : action === 'reject'
          ? 'تم رفض الطلب وإخطار العميل بالسبب.'
          : action === 'needs_more_proof'
            ? 'تم طلب إثبات إضافي من العميل.'
            : 'تم حفظ الملاحظة الإدارية.'
    );
    setReviewTarget(null);
    await loadOverview();
    if (authMode === 'app') await refreshAppState();
  };

  const handleSaveCatalogService = async (e: React.FormEvent) => {
    e.preventDefault();
    const features = svcFeatures
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await callApi('/api/monetization/admin/catalog', {
      method: 'POST',
      body: JSON.stringify({
        id: editingSvcId || undefined,
        code: svcCode,
        category: svcCat,
        itemType: svcType,
        name: svcName,
        shortDesc: svcDesc,
        features: features.length > 0 ? features : [svcDesc],
        priceEgp: Number(svcPrice) || 0,
        billingPeriod: svcPeriod,
        durationDays: Number(svcDays) || 0,
        quotaCredits: Number(svcQuota) || 0,
        requiresDevice: svcReqDevice,
        requiresListing: svcReqListing,
        isActive: svcActive,
        sortOrder: Number(svcSort) || 50,
      }),
    });
    if (!res.ok) {
      showToast(false, res.error || 'تعذر حفظ الخدمة.');
      return;
    }
    showToast(true, editingSvcId ? 'تم تحديث بيانات وسعر الخدمة.' : 'تمت إضافة الخدمة الجديدة للكتالوج.');
    setEditingSvcId(null);
    setSvcCode('');
    setSvcName('');
    setSvcDesc('');
    setSvcPrice('50');
    setSvcFeatures('');
    await loadOverview();
  };

  const handleToggleCatalogActive = async (svc: DynamicPaidServiceItem) => {
    const res = await callApi('/api/monetization/admin/catalog', {
      method: 'POST',
      body: JSON.stringify({ ...svc, isActive: !svc.isActive }),
    });
    if (res.ok) {
      showToast(true, svc.isActive ? 'تم إيقاف الخدمة من المتجر.' : 'تم تفعيل الخدمة للشراء.');
      await loadOverview();
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await callApi('/api/monetization/admin/promo-codes', {
      method: 'POST',
      body: JSON.stringify({
        code: promoCode,
        discountType: promoType,
        discountValue: Number(promoValue) || 10,
        maxUses: Number(promoMaxUses) || 50,
        expiresAt: promoExpires || undefined,
        isActive: true,
      }),
    });
    if (!res.ok) {
      showToast(false, res.error || 'تعذر حفظ الكود الترويجي.');
      return;
    }
    showToast(true, 'تم إنشاء كود الخصم بنجاح.');
    setPromoCode('');
    await loadOverview();
  };

  const handleGrantEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await callApi('/api/monetization/admin/entitlements/manage', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'grant',
        userId: grantUserId,
        serviceId: grantServiceId,
        isTrial: grantIsTrial,
        startsAt: grantStart ? `${grantStart}T00:00:00.000Z` : undefined,
        expiresAt: grantEnd ? `${grantEnd}T23:59:59.000Z` : undefined,
      }),
    });
    if (!res.ok) {
      showToast(false, res.error || 'تعذر تفعيل الاشتراك.');
      return;
    }
    showToast(true, grantIsTrial ? 'تم منح الاشتراك التجريبي بنجاح.' : 'تم تفعيل الخدمة للحساب بنجاح.');
    await loadOverview();
  };

  const handleEntitlementAction = async (
    entitlementId: string,
    mode: 'extend' | 'cancel',
    extraDays = 30
  ) => {
    const res = await callApi('/api/monetization/admin/entitlements/manage', {
      method: 'POST',
      body: JSON.stringify({ mode, entitlementId, extraDays }),
    });
    if (res.ok) {
      showToast(true, mode === 'extend' ? `تم تمديد الصلاحية +${extraDays} يومًا.` : 'تم إلغاء الاشتراك.');
      await loadOverview();
    } else {
      showToast(false, res.error || 'تعذر تنفيذ التعديل.');
    }
  };

  const handleUpdatePaymentMethod = async (pm: PaymentMethodConfigItem) => {
    const res = await callApi('/api/monetization/admin/payment-methods', {
      method: 'PUT',
      body: JSON.stringify(pm),
    });
    if (res.ok) {
      showToast(true, `تم تحديث وسيلة الدفع: ${pm.displayName}`);
      await loadOverview();
    } else {
      showToast(false, res.error || 'تعذر تحديث وسيلة الدفع.');
    }
  };

  const exportCsvReport = () => {
    const confirmed = requests.filter((r) => r.status === 'approved');
    const headers = [
      'رقم الطلب',
      'معرف العميل',
      'اسم العميل',
      'الفئة',
      'الخدمة',
      'التصنيف',
      'المبلغ المحول EGP',
      'الخصم EGP',
      'كود الخصم',
      'رقم المرسل',
      'الرقم المرجعي',
      'تاريخ المراجعة',
      'المراجع',
    ];
    const rows = confirmed.map((r) => [
      r.id,
      r.userAccountCode,
      r.userName,
      ROLE_LABELS[r.userRole],
      r.serviceName,
      CATEGORY_LABELS[r.serviceCategory],
      r.transferredAmountEgp,
      r.discountAmountEgp,
      r.promoCode || '',
      r.senderWalletPhone,
      r.referenceNumber || '',
      r.reviewedAt || r.updatedAt,
      r.reviewedByAdminName || '',
    ]);
    const csvBody = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omor-confirmed-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJsonReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      confirmedOnlyAnalytics: revenue,
      confirmedPayments: requests.filter((r) => r.status === 'approved'),
      activeEntitlements: entitlements.filter((e) => e.status === 'active'),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omor-revenue-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-5 left-5 z-50 px-4 py-3 rounded-xl text-xs font-bold shadow-lg ${
            toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              ['payments', `مراجعة المدفوعات (${revenue?.pendingReviewCount ?? 0})`],
              ['revenue', 'الأرباح المؤكدة والتقارير'],
              ['catalog', 'إدارة الخدمات والأسعار'],
              ['promos_entitlements', 'الأكواد والاشتراكات اليدوية'],
              ['methods', 'وسائل الدفع (أورنج كاش وغيرها)'],
            ] as Array<[CenterSubTab, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSubTab(k)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                subTab === k
                  ? 'bg-[#D4AF37] text-[#0B1220]'
                  : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8] hover:border-[#D4AF37]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="min-h-[38px] px-3 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] text-xs font-bold inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Confirmed KPI Summary Strip */}
      {revenue && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5">
            <div className="text-[#4A5363] dark:text-[#C5CCD8]">الأرباح المؤكدة فقط</div>
            <div className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(revenue.confirmedRevenueEgp)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5">
            <div className="text-[#4A5363] dark:text-[#C5CCD8]">مبالغ قيد المراجعة</div>
            <div className="mt-1 text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatCurrency(revenue.pendingAmountEgp)}
            </div>
          </div>
          <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
            <div className="text-[#687182] dark:text-[#8E97A8]">طلبات بانتظار المراجعة</div>
            <div className="mt-1 text-lg font-extrabold tabular-nums">
              {revenue.pendingReviewCount + revenue.needsMoreProofCount}{' '}
              <span className="text-[11px] font-normal text-[#D4AF37]">
                ({revenue.newRequestsCount} جديد)
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
            <div className="text-[#687182] dark:text-[#8E97A8]">مقبولة / مرفوضة</div>
            <div className="mt-1 text-lg font-extrabold tabular-nums">
              <span className="text-emerald-500">{revenue.approvedCount}</span> /{' '}
              <span className="text-rose-500">{revenue.rejectedCount}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
            <div className="text-[#687182] dark:text-[#8E97A8]">اشتراكات مفعّلة الآن</div>
            <div className="mt-1 text-lg font-extrabold text-[#D4AF37] tabular-nums">
              {revenue.activeSubscriptionsCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5">
            <div className="text-[#687182] dark:text-[#8E97A8]">اشتراكات منتهية</div>
            <div className="mt-1 text-lg font-extrabold text-[#8E97A8] tabular-nums">
              {revenue.expiredSubscriptionsCount}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: PAYMENTS VERIFICATION QUEUE */}
      {subTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(
                [
                  ['all', 'الكل'],
                  ['pending_review', 'قيد المراجعة'],
                  ['needs_more_proof', 'مطلوب إثبات إضافي'],
                  ['approved', 'مقبولة'],
                  ['rejected', 'مرفوضة'],
                ] as const
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[36px] px-3 rounded-xl font-bold ${
                    statusFilter === st
                      ? 'bg-[#D4AF37] text-[#0B1220]'
                      : 'border border-[#DCE0E7] dark:border-[#252C38]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#7A8394] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب، الاسم، المحفظة، المرجع..."
                className="w-full min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] pr-9 pl-3 text-xs"
              />
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-8 text-center text-xs text-[#687182] dark:text-[#8E97A8]">
              لا توجد طلبات دفع مطابقة للبحث أو التصنيف الحالي.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#DCE0E7] dark:border-[#252C38] text-[#687182] dark:text-[#8E97A8]">
                    <th className="py-2.5 pl-3">الطلب والتاريخ</th>
                    <th className="pl-3">العميل والحساب</th>
                    <th className="pl-3">الخدمة</th>
                    <th className="pl-3">المبلغ والمرجع</th>
                    <th className="pl-3">الإثبات</th>
                    <th className="pl-3">الحالة</th>
                    <th>تحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                  {filteredRequests.map((req) => {
                    const customerObj = customers.find((c) => c.id === req.userId);
                    return (
                      <tr key={req.id} className="hover:bg-[#F1F3F6]/60 dark:hover:bg-[#19202D]/50">
                        <td className="py-3 pl-3">
                          <div dir="ltr" className="font-mono-code font-bold text-right">
                            {req.id}
                          </div>
                          <div className="text-[11px] text-[#7A8394]">
                            {formatArabicDateTime(req.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 pl-3">
                          <div className="font-bold">{req.userName}</div>
                          <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                            {ROLE_LABELS[req.userRole]} ·{' '}
                            <span dir="ltr" className="font-mono-code">{req.userAccountCode}</span>
                          </div>
                          {customerObj && (
                            <button
                              type="button"
                              onClick={() => setCustomerProfileModal(customerObj)}
                              className="text-[11px] font-bold text-[#D4AF37] underline mt-0.5"
                            >
                              ملف العميل
                            </button>
                          )}
                        </td>
                        <td className="py-3 pl-3 max-w-[200px]">
                          <div className="font-semibold">{req.serviceName}</div>
                          <div className="text-[11px] text-[#7A8394]">
                            {CATEGORY_LABELS[req.serviceCategory]}
                          </div>
                        </td>
                        <td className="py-3 pl-3 tabular-nums">
                          <div className="font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                            {formatCurrency(req.transferredAmountEgp)}
                          </div>
                          <div className="text-[11px] text-[#7A8394]">
                            من: <span dir="ltr" className="font-mono-code">{req.senderWalletPhone}</span>
                            {req.referenceNumber ? ` · ${req.referenceNumber}` : ''}
                          </div>
                        </td>
                        <td className="py-3 pl-3">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewTarget(req);
                              setAdminNoteInput(req.adminNote || '');
                              setRejectionInput(req.rejectionReason || '');
                            }}
                            className="inline-flex items-center gap-1 text-[#D4AF37] font-bold hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة الإثبات</span>
                          </button>
                        </td>
                        <td className="py-3 pl-3">
                          <span
                            className={`font-bold ${
                              req.status === 'approved'
                                ? 'text-emerald-500'
                                : req.status === 'rejected'
                                  ? 'text-rose-500'
                                  : req.status === 'needs_more_proof'
                                    ? 'text-orange-500'
                                    : 'text-amber-500'
                            }`}
                          >
                            {PAY_STATUS_LABELS[req.status]}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewTarget(req);
                              setAdminNoteInput(req.adminNote || '');
                              setRejectionInput(req.rejectionReason || '');
                            }}
                            className="min-h-[34px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] font-bold"
                          >
                            مراجعة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CONFIRMED REVENUE & EXPORT REPORTS */}
      {subTab === 'revenue' && revenue && (
        <div className="space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4">
            <div className="space-y-1">
              <div className="font-extrabold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                <span>تقرير الأرباح المؤكدة فقط (يستبعد المعلق والمرفوض تمامًا)</span>
              </div>
              <p className="text-[#687182] dark:text-[#8E97A8]">
                أي طلب قيد المراجعة أو مطلوب له إثبات إضافي أو مرفوض لا يدخل في إجمالي الأرباح المؤكدة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsvReport}
                className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير CSV (Excel)</span>
              </button>
              <button
                type="button"
                onClick={exportJsonReport}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#D4AF37] text-[#8F6D14] dark:text-[#D4AF37] font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تصدير JSON</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Revenue by Category */}
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-3">
              <h3 className="font-extrabold text-sm">الأرباح المؤكدة حسب قسم الخدمة</h3>
              <div className="space-y-2.5">
                {(Object.keys(CATEGORY_LABELS) as PaidCatalogCategory[]).map((cat) => {
                  const val = revenue.revenueByCategory[cat] || 0;
                  const pct =
                    revenue.confirmedRevenueEgp > 0
                      ? Math.round((val / revenue.confirmedRevenueEgp) * 100)
                      : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between">
                        <span>{CATEGORY_LABELS[cat]}</span>
                        <span className="font-bold tabular-nums">
                          {formatCurrency(val)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#E8EBF0] dark:bg-[#0B1220] overflow-hidden">
                        <div className="h-full bg-[#D4AF37]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue by User Role */}
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-3">
              <h3 className="font-extrabold text-sm">الأرباح المؤكدة حسب نوع الحساب</h3>
              <div className="space-y-2.5">
                {(['user', 'technician', 'store', 'admin'] as const).map((r) => {
                  const val = revenue.revenueByUserRole[r] || 0;
                  const pct =
                    revenue.confirmedRevenueEgp > 0
                      ? Math.round((val / revenue.confirmedRevenueEgp) * 100)
                      : 0;
                  return (
                    <div key={r} className="space-y-1">
                      <div className="flex justify-between">
                        <span>{ROLE_LABELS[r]}</span>
                        <span className="font-bold tabular-nums">
                          {formatCurrency(val)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#E8EBF0] dark:bg-[#0B1220] overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily & Monthly Ledgers */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-2.5">
              <h3 className="font-extrabold text-sm">الملخص اليومي للأرباح المؤكدة</h3>
              {revenue.dailySummary.length === 0 ? (
                <p className="text-[#687182] dark:text-[#8E97A8]">لا توجد عمليات مؤكدة مسجلة بعد.</p>
              ) : (
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                  {revenue.dailySummary.map((d) => (
                    <div key={d.date} className="py-2 flex justify-between tabular-nums">
                      <span dir="ltr" className="font-mono-code">{d.date}</span>
                      <span>
                        {d.approvedCount} عملية ·{' '}
                        <strong className="text-emerald-500">{formatCurrency(d.confirmedEgp)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-2.5">
              <h3 className="font-extrabold text-sm">الملخص الشهري للأرباح المؤكدة</h3>
              {revenue.monthlySummary.length === 0 ? (
                <p className="text-[#687182] dark:text-[#8E97A8]">لا توجد عمليات مؤكدة مسجلة بعد.</p>
              ) : (
                <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                  {revenue.monthlySummary.map((m) => (
                    <div key={m.month} className="py-2 flex justify-between tabular-nums">
                      <span dir="ltr" className="font-mono-code">{m.month}</span>
                      <span>
                        {m.approvedCount} عملية ·{' '}
                        <strong className="text-[#D4AF37]">{formatCurrency(m.confirmedEgp)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DYNAMIC CATALOG & PRICING */}
      {subTab === 'catalog' && (
        <div className="grid lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-5 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                {editingSvcId ? 'تعديل خدمة / باقة' : 'إضافة خدمة أو باقة جديدة'}
              </h3>
              {editingSvcId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSvcId(null);
                    setSvcCode('');
                    setSvcName('');
                    setSvcDesc('');
                    setSvcFeatures('');
                  }}
                  className="underline text-[#7A8394]"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCatalogService} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={svcCode}
                  onChange={(e) => setSvcCode(e.target.value)}
                  placeholder="code (مثال: cust_vip_pack)"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 font-mono-code"
                />
                <select
                  value={svcCat}
                  onChange={(e) => setSvcCat(e.target.value as PaidCatalogCategory)}
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2"
                >
                  {(Object.keys(CATEGORY_LABELS) as PaidCatalogCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                required
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                placeholder="اسم الخدمة أو الباقة بالعربية"
                className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
              />

              <textarea
                rows={2}
                required
                value={svcDesc}
                onChange={(e) => setSvcDesc(e.target.value)}
                placeholder="وصف واضح للخدمة وفائدتها..."
                className="w-full rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={svcPrice}
                  onChange={(e) => setSvcPrice(e.target.value)}
                  placeholder="السعر (ج.م)"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                />
                <select
                  value={svcType}
                  onChange={(e) => setSvcType(e.target.value as 'service' | 'package')}
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2"
                >
                  <option value="service">خدمة فردية</option>
                  <option value="package">باقة اشتراك</option>
                </select>
                <select
                  value={svcPeriod}
                  onChange={(e) => setSvcPeriod(e.target.value as PaidBillingPeriod)}
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2"
                >
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                  <option value="one_time">لمرة واحدة</option>
                  <option value="custom">مدة مخصصة</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  value={svcDays}
                  onChange={(e) => setSvcDays(e.target.value)}
                  placeholder="المدة بالأيام"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                />
                <input
                  type="number"
                  min="0"
                  value={svcQuota}
                  onChange={(e) => setSvcQuota(e.target.value)}
                  placeholder="رصيد ذكاء إضافي"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                />
                <input
                  type="number"
                  min="0"
                  value={svcSort}
                  onChange={(e) => setSvcSort(e.target.value)}
                  placeholder="الترتيب"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                />
              </div>

              <textarea
                rows={3}
                value={svcFeatures}
                onChange={(e) => setSvcFeatures(e.target.value)}
                placeholder="مميزات الخدمة (ميزة واحدة في كل سطر)"
                className="w-full rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5"
              />

              <div className="flex flex-wrap gap-4 py-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={svcActive}
                    onChange={(e) => setSvcActive(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>مفعّلة للشراء</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={svcReqDevice}
                    onChange={(e) => setSvcReqDevice(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>ترتبط بجهاز</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={svcReqListing}
                    onChange={(e) => setSvcReqListing(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>ترتبط بإعلان سوق</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full min-h-[40px] rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{editingSvcId ? 'حفظ التعديلات' : 'إضافة الخدمة للكتالوج'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            {catalog.map((svc) => (
              <div
                key={svc.id}
                className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-sm">{svc.name}</div>
                  <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                    {CATEGORY_LABELS[svc.category]} ·{' '}
                    <span dir="ltr" className="font-mono-code">{svc.code}</span> ·{' '}
                    {svc.durationDays > 0 ? `${svc.durationDays} يوم` : 'لمرة واحدة'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-extrabold text-sm text-[#D4AF37] tabular-nums">
                    {formatCurrency(svc.priceEgp)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleToggleCatalogActive(svc)}
                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                      svc.isActive
                        ? 'border-emerald-500/40 text-emerald-500'
                        : 'border-[#333C4B] text-[#7A8394]'
                    }`}
                  >
                    {svc.isActive ? 'مفعّلة' : 'معطّلة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSvcId(svc.id);
                      setSvcCode(svc.code);
                      setSvcCat(svc.category);
                      setSvcType(svc.itemType);
                      setSvcName(svc.name);
                      setSvcDesc(svc.shortDesc);
                      setSvcPrice(String(svc.priceEgp));
                      setSvcPeriod(svc.billingPeriod);
                      setSvcDays(String(svc.durationDays));
                      setSvcQuota(String(svc.quotaCredits));
                      setSvcFeatures(svc.features.join('\n'));
                      setSvcReqDevice(svc.requiresDevice);
                      setSvcReqListing(svc.requiresListing);
                      setSvcActive(svc.isActive);
                      setSvcSort(String(svc.sortOrder));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-bold"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await callApi(`/api/monetization/admin/catalog/${encodeURIComponent(svc.id)}`, {
                        method: 'DELETE',
                      });
                      await loadOverview();
                    }}
                    className="text-rose-500 p-1"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: PROMO CODES & MANUAL TRIALS / EXTENSIONS */}
      {subTab === 'promos_entitlements' && (
        <div className="space-y-6 text-xs">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Promo Codes */}
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-4">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <Tag className="w-4 h-4 text-[#D4AF37]" />
                <span>إنشاء وإدارة الأكواد الترويجية</span>
              </div>
              <form onSubmit={handleSavePromo} className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="الكود (مثال: SASA20)"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
                />
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed_egp')}
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                >
                  <option value="percent">نسبة مئوية %</option>
                  <option value="fixed_egp">مبلغ ثابت بالجنيه</option>
                </select>
                <input
                  type="number"
                  required
                  min="1"
                  value={promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                  placeholder="قيمة الخصم"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                />
                <input
                  type="number"
                  required
                  min="1"
                  value={promoMaxUses}
                  onChange={(e) => setPromoMaxUses(e.target.value)}
                  placeholder="أقصى عدد استخدام"
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                />
                <input
                  type="date"
                  dir="ltr"
                  value={promoExpires}
                  onChange={(e) => setPromoExpires(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                />
                <button
                  type="submit"
                  className="min-h-[38px] rounded-lg bg-[#D4AF37] text-[#0B1220] font-extrabold"
                >
                  + إضافة الكود
                </button>
              </form>

              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {promoCodes.map((pr) => (
                  <div key={pr.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span dir="ltr" className="font-mono-code font-bold text-[#D4AF37]">
                        {pr.code}
                      </span>{' '}
                      ·{' '}
                      <span>
                        خصم {pr.discountValue}
                        {pr.discountType === 'percent' ? '%' : ' ج.م'}
                      </span>{' '}
                      · <span className="text-[#7A8394]">استُخدم {pr.usedCount}/{pr.maxUses}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await callApi(`/api/monetization/admin/promo-codes/${encodeURIComponent(pr.id)}`, {
                          method: 'DELETE',
                        });
                        await loadOverview();
                      }}
                      className="text-rose-500"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Grant Trial / Manual Access */}
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-4">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <Gift className="w-4 h-4 text-[#D4AF37]" />
                <span>منح فترة تجريبية أو تفعيل اشتراك يدويًا لمستخدم</span>
              </div>

              <form onSubmit={handleGrantEntitlement} className="space-y-2.5">
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({ROLE_LABELS[c.role]}) — {c.email}
                    </option>
                  ))}
                </select>

                <select
                  value={grantServiceId}
                  onChange={(e) => setGrantServiceId(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                >
                  {catalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.priceEgp)})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] mb-1">تاريخ البداية</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={grantStart}
                      onChange={(e) => setGrantStart(e.target.value)}
                      className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1">تاريخ الانتهاء (اختياري)</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={grantEnd}
                      onChange={(e) => setGrantEnd(e.target.value)}
                      className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={grantIsTrial}
                    onChange={(e) => setGrantIsTrial(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>تصنيفها كـ «فترة تجريبية مجانية» (Trial)</span>
                </label>

                <button
                  type="submit"
                  className="w-full min-h-[40px] rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold"
                >
                  تفعيل الخدمة للحساب المختار
                </button>
              </form>
            </div>
          </div>

          {/* Active & Expired Entitlements Control Table */}
          <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-3">
            <h3 className="font-extrabold text-sm">
              سجل الاشتراكات والتفعيلات الممنوحة ({entitlements.length})
            </h3>
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
              {entitlements.map((ent) => (
                <div key={ent.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">
                      {ent.userName || ent.userId} — {ent.serviceName}
                    </div>
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      من {formatArabicDate(ent.startsAt)} إلى {formatArabicDate(ent.expiresAt)} ·{' '}
                      {ent.isTrial ? 'تجريبي' : 'مدفوع / إداري'} · الحالة:{' '}
                      <strong className={ent.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}>
                        {ent.status}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleEntitlementAction(ent.id, 'extend', 30)}
                      className="px-2.5 py-1 rounded-lg border border-[#D4AF37] text-[#8F6D14] dark:text-[#D4AF37] font-bold"
                    >
                      تمديد +30 يوم
                    </button>
                    {ent.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleEntitlementAction(ent.id, 'cancel')}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-500 font-bold"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: EXTENSIBLE PAYMENT METHODS CONFIG */}
      {subTab === 'methods' && (
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          {paymentMethods.map((pm) => (
            <div
              key={pm.code}
              className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <Wallet className="w-4 h-4 text-[#D4AF37]" />
                  <span>{pm.displayName}</span>
                </div>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pm.isEnabled}
                    onChange={(e) =>
                      setPaymentMethods((prev) =>
                        prev.map((x) =>
                          x.code === pm.code ? { ...x, isEnabled: e.target.checked } : x
                        )
                      )
                    }
                    className="accent-[#D4AF37]"
                  />
                  <span>{pm.isEnabled ? 'مفعّلة' : 'معطّلة'}</span>
                </label>
              </div>

              <input
                type="text"
                dir="ltr"
                value={pm.receiverAccount}
                onChange={(e) =>
                  setPaymentMethods((prev) =>
                    prev.map((x) =>
                      x.code === pm.code ? { ...x, receiverAccount: e.target.value } : x
                    )
                  )
                }
                placeholder="رقم المحفظة / الحساب المستقبل (مثال: 01214899889)"
                className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
              />

              <input
                type="text"
                value={pm.beneficiaryName}
                onChange={(e) =>
                  setPaymentMethods((prev) =>
                    prev.map((x) =>
                      x.code === pm.code ? { ...x, beneficiaryName: e.target.value } : x
                    )
                  )
                }
                placeholder="اسم المستفيد"
                className="w-full min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
              />

              <textarea
                rows={2}
                value={pm.instructions}
                onChange={(e) =>
                  setPaymentMethods((prev) =>
                    prev.map((x) =>
                      x.code === pm.code ? { ...x, instructions: e.target.value } : x
                    )
                  )
                }
                placeholder="تعليمات الدفع التي تظهر للمستخدم..."
                className="w-full rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] p-2.5"
              />

              <button
                type="button"
                onClick={() => void handleUpdatePaymentMethod(pm)}
                className="min-h-[38px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold"
              >
                حفظ إعدادات {pm.displayName}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ADMIN PAYMENT PROOF REVIEW MODAL */}
      {reviewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 overflow-y-auto"
          onClick={() => setReviewTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-[#D4AF37]/45 bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-5 text-xs shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#DCE0E7] dark:border-[#252C38] pb-3">
              <div>
                <h3 className="text-base font-extrabold">
                  مراجعة إثبات التحويل ({reviewTarget.id})
                </h3>
                <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                  {reviewTarget.serviceName} · {formatArabicDateTime(reviewTarget.createdAt)}
                </div>
              </div>
              <button type="button" onClick={() => setReviewTarget(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Screenshot Proof */}
              <div className="space-y-2">
                <div className="font-bold">لقطة شاشة إثبات التحويل المرفقة</div>
                <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-black/30 p-2 flex items-center justify-center min-h-[260px]">
                  <img
                    src={reviewTarget.screenshotDataUrl}
                    alt="إثبات التحويل"
                    className="max-h-[380px] object-contain rounded-lg"
                  />
                </div>
                <div className="text-[10px] font-mono-code text-[#7A8394] break-all" dir="ltr">
                  SHA-256: {reviewTarget.screenshotHash.slice(0, 24)}...
                </div>
              </div>

              {/* Details & Controls */}
              <div className="space-y-3">
                <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">العميل</span>
                    <span className="font-bold">{reviewTarget.userName} ({ROLE_LABELS[reviewTarget.userRole]})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">معرف حساب OMOR</span>
                    <span dir="ltr" className="font-mono-code">{reviewTarget.userAccountCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">محفظة المرسل</span>
                    <span dir="ltr" className="font-mono-code font-bold">{reviewTarget.senderWalletPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">محفظة الاستلام</span>
                    <span dir="ltr" className="font-mono-code">{reviewTarget.receiverWallet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">رقم المرجع</span>
                    <span dir="ltr" className="font-mono-code font-bold">{reviewTarget.referenceNumber || 'غير مدخل'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">وقت التحويل المعلن</span>
                    <span dir="ltr" className="font-mono-code">{reviewTarget.transferDatetime}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#DCE0E7] dark:border-[#252C38]">
                    <span className="text-[#687182] dark:text-[#8E97A8]">المبلغ المطلوب / المحوّل</span>
                    <span className="font-extrabold text-[#D4AF37] tabular-nums">
                      {formatCurrency(reviewTarget.expectedAmountEgp)} / {formatCurrency(reviewTarget.transferredAmountEgp)}
                    </span>
                  </div>
                  {reviewTarget.userNote && (
                    <div className="pt-1 text-[11px]">
                      <strong>ملاحظة العميل:</strong> {reviewTarget.userNote}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold mb-1">ملاحظة إدارية للطلب / للعميل</label>
                  <textarea
                    rows={2}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="مثال: يرجى إرفاق صورة أوضح تظهر رقم العملية المرجعي..."
                    className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">سبب الرفض (مطلوب عند الرفض فقط)</label>
                  <input
                    type="text"
                    value={rejectionInput}
                    onChange={(e) => setRejectionInput(e.target.value)}
                    placeholder="مثال: لم يصل التحويل إلى محفظة 01214899889..."
                    className="w-full min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3"
                  />
                </div>

                {reviewTarget.status !== 'approved' ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void handleReviewAction('approve')}
                      className="min-h-[42px] rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-500 inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>موافقة وتفعيل الخدمة</span>
                    </button>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void handleReviewAction('needs_more_proof')}
                      className="min-h-[42px] rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>طلب إثبات إضافي</span>
                    </button>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void handleReviewAction('reject')}
                      className="min-h-[40px] rounded-xl bg-rose-600/15 border border-rose-500/40 text-rose-500 font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رفض الطلب</span>
                    </button>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void handleReviewAction('note_only')}
                      className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] font-bold"
                    >
                      حفظ الملاحظة فقط
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300 font-bold">
                    تم اعتماد هذا الطلب وتفعيل الخدمة ({reviewTarget.activatedEntitlementId}) بتاريخ{' '}
                    {formatArabicDateTime(reviewTarget.reviewedAt)} بواسطة {reviewTarget.reviewedByAdminName}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE MODAL */}
      {customerProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setCustomerProfileModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#DCE0E7] dark:border-[#252C38] pb-3">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span>ملف العميل: {customerProfileModal.fullName}</span>
              </div>
              <button type="button" onClick={() => setCustomerProfileModal(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#7A8394]">المعرّف</span>
                <span dir="ltr" className="font-mono-code">{customerProfileModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A8394]">البريد الإلكتروني</span>
                <span dir="ltr" className="font-mono-code">{customerProfileModal.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A8394]">الهاتف</span>
                <span dir="ltr" className="font-mono-code">{customerProfileModal.phone || 'غير مسجل'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A8394]">الدور والمدينة</span>
                <span>{ROLE_LABELS[customerProfileModal.role]} · {customerProfileModal.city || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A8394]">الأجهزة المسجلة</span>
                <span className="font-bold tabular-nums">{customerProfileModal.devicesCount} جهاز</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A8394]">تاريخ الانضمام</span>
                <span>{formatArabicDate(customerProfileModal.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold">الخدمات المفعّلة لهذا العميل</div>
              {entitlements.filter((e) => e.userId === customerProfileModal.id).length === 0 ? (
                <div className="text-[#7A8394]">لا توجد اشتراكات مسجلة لهذا العميل.</div>
              ) : (
                entitlements
                  .filter((e) => e.userId === customerProfileModal.id)
                  .map((e) => (
                    <div key={e.id} className="rounded-lg bg-[#F1F3F6] dark:bg-[#0E131C] p-2 flex justify-between">
                      <span>{e.serviceName}</span>
                      <span className={e.status === 'active' ? 'text-emerald-500 font-bold' : 'text-[#7A8394]'}>
                        {e.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

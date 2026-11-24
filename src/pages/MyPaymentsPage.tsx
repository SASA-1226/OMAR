import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  FileCheck2,
  MessageSquare,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { SUPPORT_PHONE, SUPPORT_WHATSAPP_INTL } from '../lib/constants';
import {
  CONDITION_LABELS,
  INSPECTION_ITEM_KEYS,
  INSPECTION_ITEM_LABELS,
  INSPECTION_STATUS_LABELS,
  PLATFORM_TRUST_DISCLAIMER,
  ROLE_LABELS,
  TRUST_SOURCE_LABELS,
  WARRANTY_STATUS_LABELS,
  formatArabicDate,
  formatArabicDateTime,
  formatCurrency,
  getDaysRemaining,
} from '../lib/labels';
import type { PaymentProofRequest, PaymentRequestStatus } from '../types/omor';

const STATUS_META: Record<
  PaymentRequestStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending_review: {
    label: 'قيد المراجعة اليدوية',
    colorClass: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  needs_more_proof: {
    label: 'مطلوب إثبات إضافي',
    colorClass: 'text-orange-600 dark:text-orange-400',
    icon: AlertTriangle,
  },
  approved: {
    label: 'مقبول ومفعّل',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'مرفوض',
    colorClass: 'text-rose-600 dark:text-rose-400',
    icon: XCircle,
  },
};

function readProofFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح.'));
      return;
    }
    if (file.size > 2_500_000) {
      reject(new Error('الحد الأقصى لحجم الصورة 2.5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.readAsDataURL(file);
  });
}

export const MyPaymentsPage: React.FC = () => {
  const {
    currentUser,
    myDevices,
    repairRecords,
    warranties,
    inspections,
    myEntitlements,
    myPaymentRequests,
    apiFetch,
    refreshMonetization,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [receiptModal, setReceiptModal] = useState<PaymentProofRequest | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<PaymentProofRequest | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<PaymentProofRequest | null>(null);
  const [resubmitPhone, setResubmitPhone] = useState('');
  const [resubmitRef, setResubmitRef] = useState('');
  const [resubmitShot, setResubmitShot] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');
  const [resubmitBusy, setResubmitBusy] = useState(false);
  const [resubmitErr, setResubmitErr] = useState('');

  // Device Printable Report Modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('تقرير حالة وتوثيق الجهاز');
  const [reportDeviceId, setReportDeviceId] = useState(myDevices[0]?.id || '');

  const hasReportEntitlement = useMemo(
    () =>
      myEntitlements.some(
        (e) =>
          e.status === 'active' &&
          (e.serviceCategory === 'verification_reports' ||
            e.serviceCode === 'cust_pro_sale_report' ||
            e.serviceCode.startsWith('cust_premium') ||
            e.serviceCode.startsWith('store_pro') ||
            e.serviceCode.startsWith('tech_pro'))
      ),
    [myEntitlements]
  );

  const selectedReportDevice = useMemo(
    () => myDevices.find((d) => d.id === reportDeviceId) || myDevices[0],
    [myDevices, reportDeviceId]
  );

  const deviceRepairs = useMemo(
    () =>
      selectedReportDevice
        ? repairRecords.filter((r) => r.deviceId === selectedReportDevice.id)
        : [],
    [repairRecords, selectedReportDevice]
  );

  const deviceWarranties = useMemo(
    () =>
      selectedReportDevice
        ? warranties.filter((w) => w.deviceId === selectedReportDevice.id)
        : [],
    [warranties, selectedReportDevice]
  );

  const deviceInspections = useMemo(
    () =>
      selectedReportDevice
        ? inspections.filter((i) => i.deviceId === selectedReportDevice.id)
        : [],
    [inspections, selectedReportDevice]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshMonetization();
    setRefreshing(false);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitTarget) return;
    setResubmitErr('');
    if (!resubmitShot) {
      setResubmitErr('يرجى رفع صورة إثبات التحويل الجديدة.');
      return;
    }
    setResubmitBusy(true);
    const res = await apiFetch(`/api/monetization/payments/${encodeURIComponent(resubmitTarget.id)}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({
        senderWalletPhone: resubmitPhone.trim() || undefined,
        referenceNumber: resubmitRef.trim() || undefined,
        screenshotDataUrl: resubmitShot,
        userNote: resubmitNote.trim() || undefined,
      }),
    });
    setResubmitBusy(false);
    if (!res.ok) {
      setResubmitErr(res.error || 'تعذر إعادة رفع الإثبات.');
      return;
    }
    setResubmitTarget(null);
    await refreshMonetization();
  };

  return (
    <AppShell title="مدفوعاتي واشتراكاتي">
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
            متابعة حالة طلبات الدفع بأورنج كاش، الإيصالات الرقمية، الخدمات المفعّلة، وتقارير التوثيق.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="min-h-[40px] px-3.5 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#D4AF37]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>تحديث الحالة</span>
            </button>
            <Link
              to="/services"
              className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-[#E2C25B]"
            >
              <Crown className="w-4 h-4" />
              <span>استعراض الخدمات المدفوعة</span>
            </Link>
          </div>
        </div>

        {/* Active & Expired Entitlements */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                الخدمات والاشتراكات المفعّلة ({myEntitlements.length})
              </h2>
            </div>

            {hasReportEntitlement && myDevices.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setReportDeviceId(myDevices[0]?.id || '');
                  setReportTitle('تقرير حالة وشهادة سجل الجهاز — OMOR');
                  setReportOpen(true);
                }}
                className="min-h-[40px] px-4 rounded-xl border border-[#D4AF37] text-[#8F6D14] dark:text-[#D4AF37] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#D4AF37] hover:text-[#0B1220]"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>إنشاء وطباعة تقرير / شهادة جهاز</span>
              </button>
            )}
          </div>

          {myEntitlements.length === 0 ? (
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-6 text-center space-y-2 text-xs text-[#687182] dark:text-[#8E97A8]">
              <p>لا توجد خدمات مدفوعة أو اشتراكات مفعّلة في حسابك حتى الآن.</p>
              <Link to="/services" className="inline-block font-bold text-[#D4AF37] underline">
                استكشف خدمات OMOR Premium للأفراد والفنيين والتجار
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              {myEntitlements.map((ent) => {
                const daysLeft = ent.expiresAt ? getDaysRemaining(ent.expiresAt) : null;
                return (
                  <div
                    key={ent.id}
                    className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-[#11161F] dark:text-[#F3F5F8]">
                          {ent.serviceName}
                        </div>
                        <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                          {ent.isTrial ? 'فترة تجريبية' : ent.grantedByAdmin ? 'تفعيل معتمد من الإدارة' : 'اشتراك مدفوع'}
                          {' · '}
                          <span className="font-mono-code">{ent.id}</span>
                        </div>
                      </div>
                      <span
                        className={`font-bold ${
                          ent.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : ent.status === 'expired'
                              ? 'text-amber-500'
                              : 'text-rose-500'
                        }`}
                      >
                        {ent.status === 'active' ? 'مفعّل' : ent.status === 'expired' ? 'منتهي' : 'ملغي'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E6ED] dark:border-[#222834] text-[11px] text-[#4A5363] dark:text-[#C5CCD8]">
                      <span>البداية: {formatArabicDate(ent.startsAt)}</span>
                      <span>
                        {ent.expiresAt
                          ? `الانتهاء: ${formatArabicDate(ent.expiresAt)}${
                              daysLeft !== null && ent.status === 'active'
                                ? ` (متبقي ${Math.max(0, daysLeft)} يوم)`
                                : ''
                            }`
                          : 'صلاحية مفتوحة / لمرة واحدة'}
                      </span>
                    </div>

                    {ent.status === 'active' &&
                      (ent.serviceCategory === 'verification_reports' ||
                        ent.serviceCode === 'cust_pro_sale_report') &&
                      myDevices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setReportDeviceId(ent.targetDeviceId || myDevices[0]?.id || '');
                            setReportTitle(ent.serviceName);
                            setReportOpen(true);
                          }}
                          className="w-full min-h-[36px] mt-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#8F6D14] dark:text-[#D4AF37] font-bold hover:bg-[#D4AF37] hover:text-[#0B1220] transition-colors"
                        >
                          فتح وطباعة التقرير الفعلي
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Payment Proof Requests History */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
              سجل طلبات الدفع وإثباتات التحويل ({myPaymentRequests.length})
            </h2>
          </div>

          {myPaymentRequests.length === 0 ? (
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-6 text-center text-xs text-[#687182] dark:text-[#8E97A8]">
              لم ترسل أي طلبات دفع أو إثباتات تحويل حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {myPaymentRequests.map((req) => {
                const st = STATUS_META[req.status];
                const StIcon = st.icon;
                const supportText = encodeURIComponent(
                  `مرحبًا دعم OMOR، استفسر بخصوص طلب الدفع رقم: ${req.id} لخدمة: ${req.serviceName}`
                );
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span dir="ltr" className="font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                            {req.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-extrabold text-sm text-[#11161F] dark:text-[#F3F5F8]">
                            {req.serviceName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] flex flex-wrap gap-2">
                          <span>تاريخ الطلب: {formatArabicDateTime(req.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>من محفظة: <span dir="ltr" className="font-mono-code">{req.senderWalletPhone}</span></span>
                          {req.referenceNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>المرجع: <span dir="ltr" className="font-mono-code">{req.referenceNumber}</span></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left space-y-1">
                        <div className="text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8] tabular-nums">
                          {formatCurrency(req.transferredAmountEgp)}
                        </div>
                        <div className={`inline-flex items-center gap-1 font-bold ${st.colorClass}`}>
                          <StIcon className="w-3.5 h-3.5" />
                          <span>{st.label}</span>
                        </div>
                      </div>
                    </div>

                    {req.rejectionReason && (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-300">
                        <strong>سبب الرفض:</strong> {req.rejectionReason}
                      </div>
                    )}

                    {req.adminNote && (
                      <div className="rounded-lg border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-2.5 text-[#363E4D] dark:text-[#C5CCD8]">
                        <strong>ملاحظة الإدارة:</strong> {req.adminNote}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setScreenshotPreview(req)}
                        className="min-h-[36px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-semibold hover:border-[#D4AF37]"
                      >
                        عرض صورة التحويل
                      </button>

                      {(req.status === 'needs_more_proof' || req.status === 'pending_review') && (
                        <button
                          type="button"
                          onClick={() => {
                            setResubmitTarget(req);
                            setResubmitPhone(req.senderWalletPhone);
                            setResubmitRef(req.referenceNumber || '');
                            setResubmitShot('');
                            setResubmitNote('');
                            setResubmitErr('');
                          }}
                          className="min-h-[36px] px-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>إعادة رفع إثبات أوضح</span>
                        </button>
                      )}

                      {req.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => setReceiptModal(req)}
                          className="min-h-[36px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>عرض الإيصال الرقمي</span>
                        </button>
                      )}

                      <a
                        href={`https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${supportText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[36px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] text-[#4A5363] dark:text-[#C5CCD8] font-semibold inline-flex items-center gap-1.5 hover:border-[#D4AF37] mr-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        <span>الدعم بخصوص العملية ({SUPPORT_PHONE})</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Screenshot Preview Modal */}
        {screenshotPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={() => setScreenshotPreview(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-[#252C38] bg-[#141923] p-5 space-y-3 text-[#F3F5F8]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">إثبات التحويل — {screenshotPreview.id}</span>
                <button type="button" onClick={() => setScreenshotPreview(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={screenshotPreview.screenshotDataUrl}
                alt="إثبات التحويل"
                className="w-full max-h-[70vh] object-contain rounded-xl bg-black/40"
              />
            </div>
          </div>
        )}

        {/* Resubmit Proof Modal */}
        {resubmitTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={() => setResubmitTarget(null)}
          >
            <form
              onSubmit={handleResubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-5 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-[#DCE0E7] dark:border-[#252C38] pb-2.5">
                <h3 className="font-extrabold text-sm">إعادة رفع إثبات الدفع ({resubmitTarget.id})</h3>
                <button type="button" onClick={() => setResubmitTarget(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="tel"
                dir="ltr"
                value={resubmitPhone}
                onChange={(e) => setResubmitPhone(e.target.value)}
                placeholder="رقم محفظة المرسل"
                className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
              />
              <input
                type="text"
                dir="ltr"
                value={resubmitRef}
                onChange={(e) => setResubmitRef(e.target.value)}
                placeholder="رقم العملية المرجعي"
                className="w-full min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 font-mono-code"
              />
              <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#D4AF37]/50 p-4 cursor-pointer">
                <Upload className="w-4 h-4 text-[#D4AF37]" />
                <span>{resubmitShot ? 'تم اختيار الصورة الجديدة' : 'اختر صورة إثبات جديدة واضحة'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setResubmitErr('');
                      setResubmitShot(await readProofFile(f));
                    } catch (err) {
                      setResubmitErr(err instanceof Error ? err.message : 'صورة غير صالحة.');
                    }
                  }}
                />
              </label>
              <textarea
                rows={2}
                value={resubmitNote}
                onChange={(e) => setResubmitNote(e.target.value)}
                placeholder="توضيح إضافي للإدارة..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5"
              />
              {resubmitErr && <div className="text-rose-500">{resubmitErr}</div>}
              <button
                type="submit"
                disabled={resubmitBusy}
                className="w-full min-h-[42px] rounded-xl bg-[#D4AF37] text-[#0B1220] font-extrabold"
              >
                {resubmitBusy ? 'جاري الإرسال...' : 'إرسال الإثبات الجديد للمراجعة'}
              </button>
            </form>
          </div>
        )}

        {/* Digital Receipt / Invoice Modal */}
        {receiptModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
            onClick={() => setReceiptModal(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/45 bg-white dark:bg-[#141923] p-6 space-y-4 text-xs shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#DCE0E7] dark:border-[#252C38] pb-3 no-print">
                <div className="font-extrabold text-sm">إيصال دفع رقمي معتمد — SASA STORE | OMOR</div>
                <button type="button" onClick={() => setReceiptModal(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                      إيصال سداد خدمة رقمية
                    </div>
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      منصة عُمْر (OMOR) — SASA STORE
                    </div>
                  </div>
                  <div className="text-left font-mono-code font-bold" dir="ltr">
                    {receiptModal.id}
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">اسم العميل</span>
                    <span className="font-bold">{receiptModal.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">معرف الحساب</span>
                    <span dir="ltr" className="font-mono-code">{receiptModal.userAccountCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">الفئة / الدور</span>
                    <span>{ROLE_LABELS[receiptModal.userRole]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">الخدمة / الباقة</span>
                    <span className="font-bold">{receiptModal.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">وسيلة الدفع</span>
                    <span>أورنج كاش ({receiptModal.receiverWallet})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">رقم العملية المرجعي</span>
                    <span dir="ltr" className="font-mono-code">{receiptModal.referenceNumber || 'مُؤكّد يدويًا'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#687182] dark:text-[#8E97A8]">تاريخ الاعتماد</span>
                    <span>{formatArabicDateTime(receiptModal.reviewedAt || receiptModal.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#DCE0E7] dark:border-[#252C38] text-sm font-extrabold">
                    <span>المبلغ المدفوع والمؤكد</span>
                    <span className="text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                      {formatCurrency(receiptModal.transferredAmountEgp)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ الإيصال PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Honest Data-Backed Device Verification / Certificate / Sale Report Modal */}
        {reportOpen && selectedReportDevice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 overflow-y-auto"
            onClick={() => setReportOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-[#D4AF37]/45 bg-white dark:bg-[#141923] p-6 space-y-5 text-xs shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE0E7] dark:border-[#252C38] pb-3 no-print">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#D4AF37]" />
                  <span className="font-extrabold text-sm">{reportTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedReportDevice.id}
                    onChange={(e) => setReportDeviceId(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                  >
                    {myDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.deviceName} ({d.deviceCode})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[36px] px-3.5 rounded-lg bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة / PDF</span>
                  </button>
                  <button type="button" onClick={() => setReportOpen(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actual Report Content Grounded in SQLite Records */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DCE0E7] dark:border-[#252C38] pb-4">
                  <div>
                    <div className="text-lg font-extrabold text-[#11161F] dark:text-[#F3F5F8]">
                      {selectedReportDevice.brand} {selectedReportDevice.deviceName} — {selectedReportDevice.model}
                    </div>
                    <div className="text-[#687182] dark:text-[#8E97A8] mt-1">
                      كود سجل OMOR: <span className="font-mono-code font-bold">{selectedReportDevice.deviceCode}</span> ·
                      المالك الحالي: {currentUser?.fullName} · الحالة المصرح بها:{' '}
                      {CONDITION_LABELS[selectedReportDevice.condition]}
                    </div>
                  </div>
                  <Link
                    to={`/d/${selectedReportDevice.publicToken}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[#D4AF37] font-bold underline no-print"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>رابط التحقق العام QR</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* Truthful Source Distinction */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      معلومات مؤكدة في قاعدة البيانات
                    </div>
                    <p className="text-[11px] text-[#4A5363] dark:text-[#C5CCD8]">
                      صيانات معتمدة من المالك: {deviceRepairs.filter((r) => r.ownerApproved).length} · فحوصات قبل الشراء مسجلة: {deviceInspections.length} · ضمانات مسجلة: {deviceWarranties.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1">
                    <div className="font-bold text-amber-700 dark:text-amber-300">
                      بيانات أدخلها المستخدم (تحتاج معاينة فعلية)
                    </div>
                    <p className="text-[11px] text-[#4A5363] dark:text-[#C5CCD8]">
                      حالة الجهاز المعلنة وتاريخ الشراء ({selectedReportDevice.purchaseDate || 'غير محدد'}) وصفت بناءً على إدخال المالك ما لم يدعمها تقرير فني موثق.
                    </p>
                  </div>
                </div>

                {/* Latest Pre-Purchase Inspection */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-sm">نتائج آخر فحص للجهاز قبل الشراء / البيع</h4>
                  {deviceInspections.length === 0 ? (
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-[#687182] dark:text-[#8E97A8]">
                      لم يُسجل فحص منظم (8 نقاط) لهذا الجهاز بعد. يمكنك إجراء فحص وتوثيقه من صفحة{' '}
                      <Link to="/inspections" className="text-[#D4AF37] underline font-bold">
                        الفحص قبل الشراء
                      </Link>
                      .
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-4 space-y-2">
                      <div className="flex flex-wrap justify-between gap-2 text-[11px] text-[#687182] dark:text-[#8E97A8]">
                        <span>كود الفحص: {deviceInspections[0].inspectionCode}</span>
                        <span>الفاحص: {deviceInspections[0].inspectorName} ({TRUST_SOURCE_LABELS[deviceInspections[0].trustLevel]})</span>
                        <span>التاريخ: {formatArabicDateTime(deviceInspections[0].createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        {INSPECTION_ITEM_KEYS.map((key) => (
                          <div key={key} className="rounded-lg bg-[#F1F3F6] dark:bg-[#0E131C] p-2">
                            <div className="text-[10px] text-[#687182] dark:text-[#8E97A8]">
                              {INSPECTION_ITEM_LABELS[key]}
                            </div>
                            <div className="font-bold mt-0.5">
                              {INSPECTION_STATUS_LABELS[deviceInspections[0].items[key]]}
                            </div>
                          </div>
                        ))}
                      </div>
                      {deviceInspections[0].untestedItems.length > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                          عناصر لم يتم فحصها: {deviceInspections[0].untestedItems.map((k) => INSPECTION_ITEM_LABELS[k]).join('، ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Repair & Warranty Summary */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold">سجل الصيانة ({deviceRepairs.length})</h4>
                    {deviceRepairs.length === 0 ? (
                      <p className="text-[#687182] dark:text-[#8E97A8]">لا توجد صيانات مسجلة لهذا الجهاز.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deviceRepairs.map((r) => (
                          <div key={r.id} className="rounded-lg bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5">
                            <div className="font-bold">{r.issueType} — {r.centerName}</div>
                            <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                              {r.ownerApproved ? 'معتمد من المالك' : 'بانتظار اعتماد المالك'} · {formatArabicDate(r.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold">الضمانات المسجلة ({deviceWarranties.length})</h4>
                    {deviceWarranties.length === 0 ? (
                      <p className="text-[#687182] dark:text-[#8E97A8]">لا توجد ضمانات مسجلة لهذا الجهاز.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deviceWarranties.map((w) => (
                          <div key={w.id} className="rounded-lg bg-[#F1F3F6] dark:bg-[#0E131C] p-2.5">
                            <div className="font-bold">{w.itemOrPartName} — {w.issuerName}</div>
                            <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                              {WARRANTY_STATUS_LABELS[w.status]} · ينتهي: {formatArabicDate(w.endDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-[11px] text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                  <strong>تنويه شفافية وموثوقية:</strong> {PLATFORM_TRUST_DISCLAIMER}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

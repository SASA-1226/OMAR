import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Crown,
  Flag,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ReportModal } from '../components/ReportModal';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  PLATFORM_TRUST_DISCLAIMER,
  TRANSFER_STATUS_LABELS,
  formatArabicDate,
  formatArabicDateTime,
} from '../lib/labels';
import { fuzzyArabicMatch } from '../lib/security';

export const OwnershipTransferPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    currentUser,
    myDevices,
    devices,
    transfers,
    initiateTransfer,
    buyerAcceptTransfer,
    ownerConfirmTransfer,
    cancelOrDisputeTransfer,
  } = useApp();

  const [selectedDeviceId, setSelectedDeviceId] = useState(
    searchParams.get('deviceId') || myDevices[0]?.id || ''
  );
  const [buyerCodeInput, setBuyerCodeInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const myTransfers = useMemo(
    () =>
      currentUser
        ? transfers.filter(
            (t) =>
              t.fromUserId === currentUser.id ||
              t.toUserId === currentUser.id ||
              currentUser.role === 'admin'
          )
        : [],
    [currentUser, transfers]
  );

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await initiateTransfer(selectedDeviceId);
    if (!res.ok || !res.data) {
      setError(res.error || 'تعذر إنشاء رمز النقل');
      return;
    }
    setMessage(`تم توليد رمز النقل المؤقت: ${res.data.transferCode} (صالح لمدة 15 دقيقة ولمرة واحدة فقط)`);
  };

  const handleBuyerAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await buyerAcceptTransfer(buyerCodeInput);
    if (!res.ok) {
      setError(res.error || 'تعذر قبول النقل');
      return;
    }
    setBuyerCodeInput('');
    setMessage('تم قبول الاستلام بنجاح. بانتظار التأكيد النهائي من المالك الحالي لإتمام نقل الملكية.');
  };

  return (
    <AppShell title="نقل الملكية الرقمي">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              نظام نقل ملكية الأجهزة الآمن
            </h2>
          </div>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8] leading-relaxed">
            يتطلب النقل موافقة الطرفين عبر رمز مؤقت صالح لـ 15 دقيقة ويُستخدم لمرة واحدة فقط. ينتقل سجل الجهاز وتاريخ صيانته بالكامل للمالك الجديد دون كشف البيانات الشخصية أو الهاتف أو الفواتير الخاصة بالمالك القديم.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Step 1-3: Current Owner Initiates */}
            <form
              onSubmit={handleInitiate}
              className="rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] p-4 space-y-3"
            >
              <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                1. للمالك الحالي: إنشاء رمز نقل
              </div>
              {myDevices.length === 0 ? (
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">لا تملك أجهزة مسجلة حاليًا.</p>
              ) : (
                <>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
                  >
                    {myDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.deviceName} ({d.deviceCode})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
                  >
                    توليد رمز نقل مؤقت
                  </button>
                </>
              )}
            </form>

            {/* Step 4-5: Buyer Accepts with Code */}
            <form
              onSubmit={handleBuyerAccept}
              className="rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] p-4 space-y-3"
            >
              <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                2. للمشتري الجديد: إدخال رمز الاستلام
              </div>
              <input
                type="text"
                value={buyerCodeInput}
                onChange={(e) => setBuyerCodeInput(e.target.value)}
                placeholder="مثال: TR-482910"
                dir="ltr"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm font-mono-code"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] text-xs font-bold hover:bg-[#273042] dark:hover:bg-[#2D3648]"
              >
                قبول استلام الجهاز
              </button>
            </form>
          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
              {error}
            </div>
          )}
        </div>

        {/* Active & Past Transfers */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
          <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            سجل عمليات النقل ({myTransfers.length})
          </h3>

          {myTransfers.length === 0 ? (
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">لا توجد عمليات نقل ملكية مسجلة لحسابك حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {myTransfers.map((tr) => {
                const dev = devices.find((d) => d.id === tr.deviceId);
                return (
                  <div
                    key={tr.id}
                    className="rounded-xl border border-[#E8EBF0] dark:border-[#222834] p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#11161F] dark:text-[#F3F5F8] text-sm">
                        {dev?.brand} {dev?.deviceName} ({dev?.deviceCode})
                      </span>
                      <span className="font-semibold text-[#8F6D14] dark:text-[#D4AF37]">
                        {TRANSFER_STATUS_LABELS[tr.status]}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                      <div>
                        رمز النقل:{' '}
                        <strong className="font-mono-code text-[#1E2430] dark:text-[#DCE1EA]">
                          {tr.usedAt ? 'تم إبطاله' : tr.transferCode}
                        </strong>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ينتهي: {formatArabicDateTime(tr.expiresAt)}
                      </div>
                      <div>المشتري: {tr.toUserName || 'لم يُقبل بعد'}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {tr.status === 'buyer_accepted' && tr.fromUserId === currentUser?.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await ownerConfirmTransfer(tr.id);
                            if (!res.ok) setError(res.error || 'تعذر التأكيد');
                          }}
                          className="min-h-[38px] px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          تأكيد ونقل الملكية نهائيًا
                        </button>
                      )}
                      {(tr.status === 'pending' || tr.status === 'buyer_accepted') && (
                        <>
                          <button
                            type="button"
                            onClick={() => void cancelOrDisputeTransfer(tr.id, 'cancel')}
                            className="min-h-[38px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] text-xs"
                          >
                            إلغاء العملية
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void cancelOrDisputeTransfer(tr.id, 'dispute', 'إحالة للمراجعة بسبب نزاع')
                            }
                            className="min-h-[38px] inline-flex items-center gap-1 px-3 rounded-lg border border-rose-500/40 text-rose-500 text-xs"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            تجميد (نزاع)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] leading-relaxed">
          {PLATFORM_TRUST_DISCLAIMER}
        </p>
      </div>
    </AppShell>
  );
};

export const TechniciansPage: React.FC = () => {
  const { technicians, reviews, currentUser } = useApp();
  const [query, setQuery] = useState('');
  const [govFilter, setGovFilter] = useState('all');

  const governorates = useMemo(
    () => Array.from(new Set(technicians.map((t) => t.governorate))),
    [technicians]
  );

  const filtered = useMemo(
    () =>
      technicians
        .filter((t) => {
          if (govFilter !== 'all' && t.governorate !== govFilter) return false;
          return fuzzyArabicMatch(
            `${t.displayName} ${t.centerName} ${t.governorate} ${t.district} ${t.specialties.join(' ')}`,
            query
          );
        })
        .sort((a, b) => {
          const scoreA = (a.spotlightUntil ? 2 : 0) + (a.isPro ? 1 : 0);
          const scoreB = (b.spotlightUntil ? 2 : 0) + (b.isPro ? 1 : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.verifiedRepairsCount - a.verifiedRepairsCount;
        }),
    [govFilter, query, technicians]
  );

  return (
    <AppShell title="الفنيون ومراكز الصيانة">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              دليل الفنيين ومراكز الصيانة
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              تصفح مراكز الصيانة حسب المحافظة والتخصص. التقييمات متاحة حصريًا للعملاء الذين أتموا صيانة موثقة.
            </p>
          </div>
          {currentUser?.role === 'technician' && (
            <Link
              to="/services"
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
            >
              <Crown className="w-4 h-4" />
              الترقية إلى باقة الفنيين Pro
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A8394] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم المركز، الفني، أو التخصص..."
              className="w-full min-h-[44px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] pr-10 pl-4 text-sm"
            />
          </div>
          <select
            value={govFilter}
            onChange={(e) => setGovFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3.5 text-sm"
          >
            <option value="all">كل المحافظات</option>
            {governorates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map((tech) => {
            const techReviews = reviews.filter((r) => r.technicianId === tech.id);
            const avgRating =
              techReviews.length > 0
                ? (techReviews.reduce((acc, r) => acc + r.rating, 0) / techReviews.length).toFixed(1)
                : 'جديد';

            return (
              <Link
                key={tech.id}
                to={`/technicians/${tech.id}`}
                className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 hover:border-[#D4AF37]/60 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <ImageWithFallback
                    src={tech.avatarUrl}
                    alt={tech.centerName}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#D5DBE5] dark:border-[#333C4B]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37]">
                          {tech.isVerified ? 'حساب موثق' : 'قيد التوثيق'}
                        </span>
                        {tech.spotlightUntil && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37] px-1.5 py-0.5 text-[10px] font-extrabold text-[#0B1220]">
                            <Sparkles className="w-2.5 h-2.5" />
                            مركز مميّز
                          </span>
                        )}
                        {tech.isPro && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                            <Crown className="w-2.5 h-2.5" />
                            Pro
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums">
                        <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                        {avgRating}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
                      {tech.centerName}
                    </h3>
                    <p className="text-xs text-[#687182] dark:text-[#8E97A8]">{tech.displayName}</p>
                    <p className="mt-1 text-xs text-[#687182] dark:text-[#8E97A8] inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {tech.governorate} · {tech.district}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8]">
                  <span className="truncate">{tech.specialties.slice(0, 2).join(' · ')}</span>
                  <span className="tabular-nums font-semibold shrink-0">
                    {tech.verifiedRepairsCount} عملية موثقة
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] leading-relaxed">
          {PLATFORM_TRUST_DISCLAIMER}
        </p>
      </div>
    </AppShell>
  );
};

export const TechnicianProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    technicians,
    reviews,
    repairRecords,
    devices,
    currentUser,
    submitTechnicianReview,
    reportReview,
  } = useApp();

  const tech = technicians.find((t) => t.id === id);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  if (!tech) {
    return (
      <AppShell title="ملف الفني">
        <div className="p-8 text-center text-sm text-[#687182] dark:text-[#8E97A8]">الفني غير موجود.</div>
      </AppShell>
    );
  }

  const techReviews = reviews.filter((r) => r.technicianId === tech.id);

  // Check whether current user has an owner-approved repair with this technician that hasn't been reviewed
  const eligibleRepair = currentUser
    ? repairRecords.find(
        (r) =>
          r.technicianId === tech.id &&
          r.ownerApproved &&
          devices.some((d) => d.id === r.deviceId && d.ownerId === currentUser.id) &&
          !reviews.some((rv) => rv.repairRecordId === r.id && rv.reviewerId === currentUser.id)
      )
    : undefined;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    if (!eligibleRepair) return;
    if (comment.trim().length < 5) {
      setReviewError('يرجى كتابة تعليق واضح لا يقل عن 5 أحرف');
      return;
    }
    const res = await submitTechnicianReview({
      technicianId: tech.id,
      repairRecordId: eligibleRepair.id,
      rating,
      comment,
    });
    if (!res.ok) {
      setReviewError(res.error || 'تعذر نشر التقييم');
      return;
    }
    setComment('');
  };

  return (
    <AppShell title={tech.centerName}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/technicians" className="inline-flex items-center gap-1.5 text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37]">
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة لدليل الفنيين
        </Link>

        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={tech.avatarUrl}
                alt={tech.centerName}
                className="w-20 h-20 rounded-2xl object-cover border border-[#D5DBE5] dark:border-[#333C4B]"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37]">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{tech.isVerified ? 'مركز صيانة موثق' : 'قيد التحقق'}</span>
                  </span>
                  {tech.spotlightUntil && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37] px-2 py-0.5 text-[10px] font-extrabold text-[#0B1220]">
                      مركز مميّز
                    </span>
                  )}
                  {tech.isPro && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-bold">
                      Pro
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8] mt-0.5">
                  {tech.centerName}
                </h2>
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  {tech.displayName} · {tech.governorate} — {tech.district}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/repairs/request?techId=${tech.id}`)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
            >
              <Wrench className="w-4 h-4" />
              طلب توثيق إصلاح هنا
            </button>
          </div>

          <p className="text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">{tech.bio}</p>

          <dl className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-[#E8EBF0] dark:border-[#222834] text-xs">
            <div>
              <dt className="text-[#687182] dark:text-[#8E97A8]">التخصصات</dt>
              <dd className="mt-1 font-medium">{tech.specialties.join(' · ')}</dd>
            </div>
            <div>
              <dt className="text-[#687182] dark:text-[#8E97A8]">الأجهزة المدعومة</dt>
              <dd className="mt-1 font-medium">
                {tech.supportedDeviceTypes.map((c) => CATEGORY_LABELS[c]).join(' · ')}
              </dd>
            </div>
            <div>
              <dt className="text-[#687182] dark:text-[#8E97A8]">ساعات العمل</dt>
              <dd className="mt-1">{tech.workingHours}</dd>
            </div>
            <div>
              <dt className="text-[#687182] dark:text-[#8E97A8]">وسيلة التواصل المنشورة</dt>
              <dd className="mt-1 font-semibold">{tech.publicContact}</dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between text-xs">
            <span className="tabular-nums font-bold text-[#363E4D] dark:text-[#DCE1EA]">
              إجمالي عمليات التوثيق المعتمدة: {tech.verifiedRepairsCount}
            </span>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 text-rose-500 hover:underline"
            >
              <Flag className="w-3.5 h-3.5" />
              إبلاغ عن المركز
            </button>
          </div>
        </section>

        {/* Reviews (Strictly verified customers only) */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-5">
          <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            تقييمات العملاء الموثقة ({techReviews.length})
          </h3>

          {eligibleRepair ? (
            <form onSubmit={handleReviewSubmit} className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-3">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>لديك عملية صيانة معتمدة لدى هذا الفني — يمكنك إضافة تقييمك:</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>التقييم:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`p-1 ${n <= rating ? 'text-[#D4AF37]' : 'text-[#7A8394]'}`}
                  >
                    <Star className={`w-5 h-5 ${n <= rating ? 'fill-[#D4AF37]' : ''}`} />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب تجربتك الحقيقية مع الخدمة..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] p-3 text-xs"
              />
              {reviewError && <div className="text-xs text-rose-500">{reviewError}</div>}
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
              >
                نشر التقييم الموثق
              </button>
            </form>
          ) : (
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              تُفتح إضافة التقييمات تلقائيًا فقط للمستخدمين الذين أتمّوا عملية صيانة معتمدة مع هذا المركز منعًا للتقييمات الوهمية.
            </p>
          )}

          <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
            {techReviews.map((rv) => (
              <div key={rv.id} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{rv.reviewerName}</span>
                  <span className="tabular-nums text-[#687182] dark:text-[#8E97A8]">{formatArabicDate(rv.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1 text-[#D4AF37]">
                  {Array.from({ length: rv.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-[#D4AF37]" />
                  ))}
                </div>
                <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8]">{rv.comment}</p>
                <button
                  type="button"
                  onClick={() => void reportReview(rv.id)}
                  className="text-[11px] text-[#7A8394] hover:text-rose-500"
                >
                  {rv.isReported ? 'تم الإبلاغ عن التقييم' : 'إبلاغ عن التقييم'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] leading-relaxed">
            {PLATFORM_TRUST_DISCLAIMER}
          </p>
        </section>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="technician"
        targetId={tech.id}
        targetLabel={tech.centerName}
      />
    </AppShell>
  );
};

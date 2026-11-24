import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Flag,
  Lock,
  QrCode,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { BrandLogo } from '../components/BrandLogo';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { QRCodeCard } from '../components/QRCodeCard';
import { ReportModal } from '../components/ReportModal';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  DEVICE_STATUS_LABELS,
  INSPECTION_ITEM_LABELS,
  INSPECTION_STATUS_LABELS,
  PLATFORM_TRUST_DISCLAIMER,
  TRUST_SOURCE_LABELS,
  VERIFICATION_TIER_LABELS,
  WARRANTY_STATUS_LABELS,
  formatArabicDate,
} from '../lib/labels';
import { maskSensitiveCode, validateImeiLuhn } from '../lib/security';

export const ScanQRPage: React.FC = () => {
  const { devices, lookupDeviceIdentifier } = useApp();
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [serialCheckInput, setSerialCheckInput] = useState('');
  const [serialCheckResult, setSerialCheckResult] = useState<{
    tone: 'danger' | 'safe' | 'neutral';
    title: string;
    detail: string;
    luhnNote?: string;
    publicToken?: string;
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'omor-qr-reader';

  const resolveAndNavigate = async (decodedText: string) => {
    const text = decodedText.trim();
    // Extract /d/<token> if full URL was scanned
    const match = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const tokenOrCode = match ? match[1] : text;
    const found = devices.find(
      (d) =>
        d.publicToken.toLowerCase() === tokenOrCode.toLowerCase() ||
        d.deviceCode.toLowerCase() === tokenOrCode.toLowerCase()
    );
    if (found) {
      navigate(`/d/${found.publicToken}`);
      return;
    }
    if (match) {
      navigate(`/d/${tokenOrCode}`);
      return;
    }
    const lookup = await lookupDeviceIdentifier(tokenOrCode);
    if (lookup.found && lookup.publicToken) {
      navigate(`/d/${lookup.publicToken}`);
    } else {
      setScanError(`لم يتم العثور على جهاز عام مسجل بالرمز: ${tokenOrCode}`);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  const startCamera = async () => {
    setScanError('');
    try {
      const html5Qr = new Html5Qrcode(readerElementId);
      scannerRef.current = html5Qr;
      setCameraActive(true);
      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          html5Qr.stop().catch(() => undefined);
          setCameraActive(false);
          void resolveAndNavigate(decoded);
        },
        () => undefined
      );
    } catch {
      setCameraActive(false);
      setScanError('تعذر تشغيل الكاميرا. تأكد من منح صلاحية الكاميرا للمتصفح أو استخدم مسح صورة / البحث برقم الجهاز.');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => undefined);
    }
    setCameraActive(false);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');
    try {
      const html5Qr = new Html5Qrcode('omor-qr-file-temp');
      const result = await html5Qr.scanFile(file, true);
      await resolveAndNavigate(result);
    } catch {
      setScanError('تعذر قراءة رمز QR من الصورة المحددة. تأكد من وضوح الرمز.');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError('');
    if (!manualInput.trim()) return;
    await resolveAndNavigate(manualInput);
  };

  const handleSerialLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = serialCheckInput.replace(/[\s-]/g, '').trim();
    if (clean.length < 4) {
      setSerialCheckResult({
        tone: 'neutral',
        title: 'أدخل 4 أحرف أو أرقام على الأقل',
        detail: 'للفحص السريع أدخل IMEI (15 رقمًا) أو الرقم التسلسلي أو معرّف OMR.',
      });
      return;
    }

    let luhnNote: string | undefined;
    if (/^\d{15}$/.test(clean)) {
      const luhn = validateImeiLuhn(clean);
      luhnNote = luhn.reason;
    }

    const lookup = await lookupDeviceIdentifier(clean);

    if (!lookup.found) {
      setSerialCheckResult({
        tone: 'neutral',
        title: 'غير مسجل في بلاغات الفقدان على OMOR حاليًا',
        detail:
          'لم يُعثر على بلاغ فقدان أو سرقة مطابق في قاعدة بيانات OMOR الحالية. تنبيه: هذا الفحص يغطي سجلات OMOR ولا يتصل بقواعد شركات المحمول أو NTRA.',
        luhnNote,
      });
      return;
    }

    if (lookup.status === 'reported_stolen') {
      setSerialCheckResult({
        tone: 'danger',
        title: `تحذير أمني خطير: جهاز مُبلغ عن فقدانه / سرقته (${lookup.brand || ''} ${lookup.deviceName || ''})`,
        detail: `السجل ${lookup.deviceCode || ''} مقفل ببلاغ فقدان/سرقة من مالكه${lookup.lostReportedAt ? ` بتاريخ ${formatArabicDate(lookup.lostReportedAt)}` : ''}. لا تشترِ هذا الجهاز ولا تنقل ملكيته (بيانات المالك محجوبة للخصوصية).${lookup.lostReportNote ? ` (${lookup.lostReportNote})` : ''}`,
        luhnNote,
        publicToken: lookup.publicToken,
      });
      return;
    }

    setSerialCheckResult({
      tone: 'safe',
      title: `سجل نظيف — ${lookup.brand || ''} ${lookup.deviceName || ''} (${lookup.deviceCode || ''})`,
      detail: 'الجهاز مسجل وحالته نشطة بدون أي بلاغات فقدان أو سرقة.',
      luhnNote,
      publicToken: lookup.publicToken,
    });
  };

  return (
    <AppShell title="مسح رمز QR">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
                التحقق من الهوية الرقمية للجهاز
              </h2>
            </div>
            <BrandLogo size="sm" />
          </div>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
            امسح رمز QR الخاص بالجهاز لعرض ملفه العام وموثوقية السجل دون كشف بيانات المالك الشخصية.
          </p>

          <div className="mt-5">
            <div
              id={readerElementId}
              className={`w-full rounded-xl overflow-hidden bg-[#0B1220] ${
                cameraActive ? 'min-h-[280px]' : 'h-0'
              }`}
            />
            <div id="omor-qr-file-temp" className="hidden" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B]"
              >
                <Camera className="w-4 h-4" />
                فتح الكاميرا للمسح
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white text-sm font-bold"
              >
                إيقاف الكاميرا
              </button>
            )}

            <label className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold cursor-pointer hover:border-[#D4AF37]">
              <Upload className="w-4 h-4 text-[#D4AF37]" />
              <span>قراءة QR من صورة</span>
              <input type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
            </label>
          </div>

          <form onSubmit={handleManualSubmit} className="mt-5 pt-5 border-t border-[#E8EBF0] dark:border-[#222834] flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="أو أدخل رقم السجل (مثل OMR-2026-841920)"
              dir="ltr"
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              فحص
            </button>
          </form>

          {scanError && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
              {scanError}
            </div>
          )}
        </div>

        {/* Privacy-safe IMEI & Lost/Stolen Blacklist Checker */}
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
              فحص IMEI والسيريال ضد بلاغات الفقدان والسرقة (مع فحص Luhn الرياضي)
            </h3>
          </div>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
            تحقق قبل الشراء من سلامة رقم IMEI رياضيًا ومن عدم تسجيل الجهاز كمفقود أو مسروق، دون كشف أي بيانات خاصة للمالك.
          </p>
          <form onSubmit={handleSerialLookup} className="flex gap-2">
            <input
              type="text"
              value={serialCheckInput}
              onChange={(e) => setSerialCheckInput(e.target.value)}
              placeholder="أدخل IMEI (15 رقمًا) أو Serial Number"
              dir="ltr"
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold whitespace-nowrap"
            >
              فحص أمني
            </button>
          </form>

          {serialCheckResult && (
            <div
              className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                serialCheckResult.tone === 'danger'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : serialCheckResult.tone === 'safe'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] text-[#363E4D] dark:text-[#C5CCD8]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {serialCheckResult.tone === 'danger' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : serialCheckResult.tone === 'safe' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : null}
                <span>{serialCheckResult.title}</span>
              </div>
              <p className="leading-relaxed">{serialCheckResult.detail}</p>
              {serialCheckResult.luhnNote && (
                <p className="text-[11px] opacity-90 font-medium">تحقق IMEI القياسي: {serialCheckResult.luhnNote}</p>
              )}
              {serialCheckResult.publicToken && (
                <Link
                  to={`/d/${serialCheckResult.publicToken}`}
                  className="inline-flex mt-1 font-bold underline"
                >
                  فتح الملف العام للجهاز
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Quick verifiable samples from visible public devices */}
        {devices.filter((d) => d.visibility.isPublic).length > 0 && (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
            <div className="text-xs font-bold text-[#363E4D] dark:text-[#C5CCD8] mb-3">
              تجربة فتح ملف عام مسجل:
            </div>
            <div className="flex flex-wrap gap-2">
              {devices
                .filter((d) => d.visibility.isPublic)
                .slice(0, 3)
                .map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => navigate(`/d/${d.publicToken}`)}
                    className="min-h-[40px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3 text-xs hover:border-[#D4AF37]"
                  >
                    {d.deviceName} · <span className="font-mono-code">{d.deviceCode}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const PublicDeviceProfilePage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { devices, repairRecords, warranties, inspections, recordPublicProfileScan } = useApp();
  const [reportOpen, setReportOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const countedRef = useRef<string | null>(null);

  const device = devices.find(
    (d) => d.publicToken === publicId || d.deviceCode === publicId
  );

  useEffect(() => {
    if (device && device.visibility.isPublic && countedRef.current !== device.id) {
      countedRef.current = device.id;
      void recordPublicProfileScan(device.id);
    }
  }, [device, recordPublicProfileScan]);

  if (!device || !device.visibility.isPublic) {
    return (
      <AppShell title="ملف الجهاز العام">
        <div className="max-w-xl mx-auto rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-8 text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo size="sm" />
          </div>
          <Lock className="w-8 h-8 text-[#7A8394] mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            الملف غير متاح للعرض العام
          </h2>
          <p className="mt-2 text-xs text-[#687182] dark:text-[#8E97A8]">
            قد يكون هذا السجل خاصًا أو أوقفه المالك وفق إعدادات الخصوصية.
          </p>
          <Link
            to="/scan"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#0B1220]"
          >
            مسح رمز آخر
          </Link>
        </div>
      </AppShell>
    );
  }

  // Strictly only owner-approved repair records if showRepairs is enabled
  const approvedRepairs = device.visibility.showRepairs
    ? repairRecords.filter((r) => r.deviceId === device.id && r.ownerApproved)
    : [];

  const publicWarranties = device.visibility.showWarranty
    ? warranties.filter((w) => w.deviceId === device.id)
    : [];

  const publicInspections = device.visibility.showCondition
    ? inspections.filter((i) => i.deviceId === device.id)
    : [];

  const handleSharePublicProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ملف التحقق العام — ${device.brand} ${device.deviceName}`,
          text: `سجل الجهاز الرقمي ${device.deviceCode} على منصة SASA STORE | OMOR`,
          url,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('تم نسخ رابط الملف العام بنجاح.');
      setTimeout(() => setShareMsg(''), 2500);
    } catch {
      setShareMsg(url);
    }
  };

  return (
    <AppShell title={`ملف التحقق العام — ${device.deviceCode}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {device.status === 'reported_stolen' && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/15 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-7 h-7 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                  تحذير أمني عاجل: هذا الجهاز مُبلغ عن فقدانه أو سرقته!
                </h2>
                <p className="text-xs text-[#363E4D] dark:text-[#DCE1EA] mt-1 leading-relaxed">
                  أقفل المالك الأصلي هذا الجهاز عبر منصة OMOR. يُحظر شراؤه أو استبداله أو نقل ملكيته.
                  {device.lostReportNote ? ` ملاحظة البلاغ: ${device.lostReportNote}` : ''}
                </p>
              </div>
            </div>
            <SupportContactButtons variant="footer" />
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden">
              <div className="aspect-[16/9] bg-[#EEF0F4] dark:bg-[#10151F]">
                <ImageWithFallback
                  src={device.imageUrl}
                  alt={device.deviceName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E8EBF0] dark:border-[#222834]">
                  <BrandLogo size="sm" />
                  <span className="font-mono-code text-xs text-[#8F6D14] dark:text-[#D4AF37] font-bold">
                    {device.deviceCode}
                  </span>
                </div>
                <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  <span>{CATEGORY_LABELS[device.category]} · {DEVICE_STATUS_LABELS[device.status]}</span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  {device.brand} {device.deviceName}
                </h2>
                <p className="text-sm text-[#4A5363] dark:text-[#C5CCD8]">{device.model}</p>

                <div className="mt-4 rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#1E2430] dark:text-[#DCE1EA]">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>مستوى موثوقية السجل: {VERIFICATION_TIER_LABELS[device.verificationTier]}</span>
                  </div>
                  <p className="text-[#687182] dark:text-[#8E97A8]">
                    تاريخ إنشاء الهوية الرقمية: {formatArabicDate(device.createdAt)} · عدد مرات الفحص العام: {device.publicScanCount || 1}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/v3/risk-report?deviceId=${device.id}`}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/25"
                  >
                    <FileWarning className="w-4 h-4" />
                    تقرير مخاطر الشراء وتقدير السعر
                  </Link>
                  <Link
                    to={`/inspections?deviceId=${device.id}`}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
                  >
                    <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
                    نموذج فحص قبل الشراء
                  </Link>
                  <button
                    type="button"
                    onClick={handleSharePublicProfile}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
                  >
                    <Share2 className="w-4 h-4 text-[#D4AF37]" />
                    مشاركة الملف
                  </button>
                </div>
                {shareMsg && (
                  <div className="mt-2 text-xs text-emerald-500 font-semibold">{shareMsg}</div>
                )}

                <dl className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-[#E8EBF0] dark:border-[#222834] text-xs">
                  {device.visibility.showCondition && (
                    <div>
                      <dt className="text-[#687182] dark:text-[#8E97A8]">الحالة المسجلة</dt>
                      <dd className="mt-1 font-semibold">{CONDITION_LABELS[device.condition]}</dd>
                    </div>
                  )}
                  {device.visibility.showMaskedSerial && (
                    <div>
                      <dt className="text-[#687182] dark:text-[#8E97A8]">الرقم التسلسلي (مقنّع)</dt>
                      <dd className="mt-1 font-mono-code">
                        {maskSensitiveCode(device.privateData.serialNumber)}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Privacy guarantee notice + Trust disclaimer */}
                <div className="mt-5 pt-4 border-t border-[#E8EBF0] dark:border-[#222834] space-y-2 text-[11px] text-[#687182] dark:text-[#8E97A8]">
                  <div className="flex items-center justify-between gap-3">
                    <span>محمي بالخصوصية: لا يتم عرض هاتف المالك أو عنوانه أو IMEI أو الفواتير الخاصة.</span>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="inline-flex items-center gap-1 text-rose-500 hover:underline shrink-0"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      إبلاغ
                    </button>
                  </div>
                  <p className="leading-relaxed opacity-90">{PLATFORM_TRUST_DISCLAIMER}</p>
                </div>
              </div>
            </section>

            {/* Public Pre-Purchase Inspection Summaries */}
            {publicInspections.length > 0 && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>تقارير الفحص المسجلة قبل الشراء ({publicInspections.length})</span>
                </h3>
                <div className="space-y-2.5">
                  {publicInspections.slice(0, 2).map((ins) => (
                    <div key={ins.id} className="rounded-xl border border-[#E8EBF0] dark:border-[#222834] p-3.5 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                          {ins.inspectionCode}
                        </span>
                        <span className="text-[#687182] dark:text-[#8E97A8]">{formatArabicDate(ins.createdAt)}</span>
                      </div>
                      <div className="text-[#363E4D] dark:text-[#DCE1EA] font-semibold">
                        المصدر: {TRUST_SOURCE_LABELS[ins.trustLevel]} · لم يُفحص: {ins.untestedItems.length} محور
                      </div>
                      {ins.untestedItems.length > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          الأجزاء غير المفحوصة: {ins.untestedItems.map((k) => INSPECTION_ITEM_LABELS[k]).join('، ')}
                        </div>
                      )}
                      {ins.inspectorNotes && (
                        <p className="text-[#4A5363] dark:text-[#8E97A8]">{ins.inspectorNotes}</p>
                      )}
                      <div className="text-[10px] text-[#7A8394]">
                        حالة المحاور المفحوصة: {INSPECTION_STATUS_LABELS.passed} / {INSPECTION_STATUS_LABELS.issue_found} حسب وقت الفحص فقط
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Public Approved Repairs */}
            {device.visibility.showRepairs && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
                <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2 mb-4">
                  <Wrench className="w-4 h-4 text-[#D4AF37]" />
                  تاريخ الصيانة الموثق (المصرح بنشره)
                </h3>
                {approvedRepairs.length === 0 ? (
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8]">لا توجد عمليات صيانة مسجلة أو مصرح بنشرها.</p>
                ) : (
                  <div className="space-y-3">
                    {approvedRepairs.map((r) => (
                      <div key={r.id} className="rounded-xl border border-[#E8EBF0] dark:border-[#222834] p-3.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-[#11161F] dark:text-[#F3F5F8]">
                          <span>{r.issueType}</span>
                          <span className="tabular-nums text-[#687182] dark:text-[#8E97A8]">{formatArabicDate(r.intakeDate)}</span>
                        </div>
                        <p className="mt-1 text-[#4A5363] dark:text-[#C5CCD8]">{r.actionTaken}</p>
                        <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مركز: {r.centerName} · معتمد من المالك</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Public Warranty */}
            {device.visibility.showWarranty && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
                <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
                  حالة الضمان المسجلة
                </h3>
                {publicWarranties.length === 0 ? (
                  <p className="text-xs text-[#687182] dark:text-[#8E97A8]">لا توجد بيانات ضمان عامة لهذا الجهاز.</p>
                ) : (
                  <div className="space-y-2.5">
                    {publicWarranties.map((w) => (
                      <div key={w.id} className="flex items-center justify-between text-xs py-2 border-b border-[#E8EBF0] dark:border-[#222834] last:border-b-0">
                        <div>
                          <div className="font-semibold text-[#11161F] dark:text-[#F3F5F8]">{w.itemOrPartName}</div>
                          <div className="text-[#687182] dark:text-[#8E97A8]">
                            {w.issuerName} · {w.isSourceVerified ? 'مصدر موثق' : 'مسجل من المالك'}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                            {WARRANTY_STATUS_LABELS[w.status]}
                          </div>
                          <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] tabular-nums">
                            حتى {formatArabicDate(w.endDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="lg:col-span-5">
            <QRCodeCard
              publicToken={device.publicToken}
              deviceCode={device.deviceCode}
              deviceName={`${device.brand} ${device.deviceName}`}
            />
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="device"
        targetId={device.id}
        targetLabel={`${device.brand} ${device.deviceName} (${device.deviceCode})`}
      />
    </AppShell>
  );
};

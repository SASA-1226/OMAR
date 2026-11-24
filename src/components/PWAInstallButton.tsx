import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!showGuide || !appUrl) return;
    let active = true;
    QRCode.toDataURL(appUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0B1220',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch(() => {
        // ignore qr generation error
      });
    return () => {
      active = false;
    };
  }, [showGuide, appUrl]);

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleShareUrl = async () => {
    if (!appUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SASA STORE | OMOR — عُمْر',
          text: 'افتح الرابط في متصفح Chrome أو Safari لتثبيت تطبيق SASA STORE OMOR على هاتفك',
          url: appUrl,
        });
        return;
      } catch {
        // user dismissed
      }
    }
    await handleCopyUrl();
  };

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          التطبيق مثبت ويعمل بوضع التطبيق المستقل على جهازك ✓
        </div>
      );
    }
    return null;
  }

  // Direct native browser install prompt available (Chrome / Edge / Samsung Internet)
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-3 sm:px-3.5 py-2 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>تثبيت التطبيق الآن</span>
        {variant === 'compact' && <span className="sm:hidden">تثبيت</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={
          variant === 'full'
            ? 'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors whitespace-nowrap shrink-0'
            : 'min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-2.5 sm:px-3 py-2 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors whitespace-nowrap shrink-0'
        }
        aria-label="تنزيل التطبيق على التليفون"
      >
        <Smartphone className="w-4 h-4 shrink-0" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>تنزيل على التليفون</span>
        {variant === 'compact' && <span className="sm:hidden">التطبيق</span>}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                  <span>تنزيل SASA STORE OMOR على التليفون</span>
                </h3>
                <p className="mt-1 text-xs text-[#687182] dark:text-[#8E97A8]">
                  يعمل كتطبيق مستقل على Android وiPhone بوضع عدم الاتصال وإشعارات المتصفح.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-[#7A8394] hover:text-[#363E4D] dark:hover:text-[#F3F5F8]"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInIframe && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                أنت تفتح المنصة حاليًا داخل نافذة معاينة مضمّنة. لتثبيت التطبيق على التليفون مباشرة، افتح الرابط التالي في متصفح <strong>Chrome</strong> (أندرويد) أو <strong>Safari</strong> (آيفون) خارج نافذة المعاينة.
              </div>
            )}

            {/* Step-by-step OS Instructions */}
            <div className="space-y-2.5 text-xs">
              <div
                className={`rounded-xl border p-3.5 space-y-1.5 ${
                  !isIOS
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                    : 'border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C]'
                }`}
              >
                <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  1) لهواتف Android (متصفح Google Chrome / Edge):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                  <li>افتح رابط التطبيق في متصفح <strong>Chrome</strong> على هاتفك.</li>
                  <li>اضغط على قائمة الثلاث نقاط (<strong>⋮</strong>) أعلى المتصفح.</li>
                  <li>اختر <strong>«تثبيت التطبيق» (Install app)</strong> أو <strong>«الإضافة إلى الشاشة الرئيسية»</strong>.</li>
                </ol>
              </div>

              <div
                className={`rounded-xl border p-3.5 space-y-1.5 ${
                  isIOS
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                    : 'border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C]'
                }`}
              >
                <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  2) لهواتف iPhone / iPad (متصفح Safari):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                  <li>افتح الرابط في متصفح <strong>Safari</strong> الأصلي.</li>
                  <li>اضغط زر <strong>المشاركة (Share)</strong> في شريط Safari.</li>
                  <li>اختر <strong>«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong> ثم <strong>إضافة</strong>.</li>
                </ol>
              </div>
            </div>

            {/* QR Code for quick phone scan from desktop */}
            <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-4 flex flex-col sm:flex-row items-center gap-4">
              {qrUrl && (
                <div className="rounded-xl bg-white p-2 border border-[#DCE0E7] shrink-0">
                  <img
                    src={qrUrl}
                    alt="QR لفتح التطبيق على الموبايل"
                    className="w-28 h-28 object-contain"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-right">
                <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  تفتح الموقع من الكمبيوتر؟ امسح QR بكاميرا التليفون
                </div>
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  dir="ltr"
                  className="w-full rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-2.5 py-1.5 text-[11px] font-mono-code text-[#4A5363] dark:text-[#C5CCD8]"
                />
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 text-[11px] font-semibold hover:border-[#D4AF37]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareUrl}
                    className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 text-[11px] font-bold text-[#0B1220] hover:bg-[#E2C25B]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    إرسال للموبايل
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] text-xs font-bold hover:bg-[#273042] dark:hover:bg-[#2D3648] dark:hover:bg-[#2A3242]"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};

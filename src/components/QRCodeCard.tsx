import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Printer, Share2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface QRCodeCardProps {
  publicToken: string;
  deviceCode: string;
  deviceName: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  publicToken,
  deviceCode,
  deviceName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string>('');

  // QR contains ONLY the safe public route token — never personal data, IMEI, or invoices
  const publicUrl = `${window.location.origin}/d/${publicToken}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(publicUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0B1220',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (active) setDataUrl(url);
    });

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, publicUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0B1220',
          light: '#FFFFFF',
        },
      });
    }
    return () => {
      active = false;
    };
  }, [publicUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareNote('تعذر النسخ التلقائي — انسخ الرابط من الحقل أعلاه');
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `OMOR-QR-${deviceCode}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ملف الجهاز الرقمي — ${deviceName}`,
          text: `تحقق من السجل الرقمي لجهاز ${deviceName} (${deviceCode}) على منصة SASA STORE OMOR`,
          url: publicUrl,
        });
      } catch {
        // user dismissed share sheet
      }
    } else {
      await handleCopy();
      setShareNote('تم نسخ رابط الملف العام للمشاركة');
      setTimeout(() => setShareNote(''), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            الهوية الرقمية ورمز QR
          </h3>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
            يحتوي الرمز على رابط التحقق العام الآمن فقط دون أي بيانات شخصية أو IMEI كامل.
          </p>
        </div>
        <span className="font-mono-code text-xs text-[#8F6D14] dark:text-[#D4AF37] shrink-0">
          {deviceCode}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 border border-[#DCE0E7]">
        <BrandLogo size="sm" onLight className="mb-2.5" />
        <canvas ref={canvasRef} className="max-w-full" aria-label={`QR Code for ${deviceName}`} />
        <div className="mt-2 text-center">
          <div className="text-xs font-bold text-[#11161F]">{deviceName}</div>
          <div className="font-mono-code text-[11px] text-[#687182]">{deviceCode}</div>
          <div className="mt-1 text-[10px] font-semibold text-[#8F6D14]">
            سجل موثق · صاصا ستور SASA STORE OMOR
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="sr-only" htmlFor="public-qr-url">
          رابط الملف العام
        </label>
        <input
          id="public-qr-url"
          type="text"
          readOnly
          value={publicUrl}
          dir="ltr"
          className="w-full rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 py-2 text-xs font-mono-code text-[#4A5363] dark:text-[#C5CCD8]"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 no-print">
        <button
          type="button"
          onClick={handleShare}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D4AF37] text-[#0B1220] px-3 py-2 text-xs font-bold hover:bg-[#E2C25B] transition-colors whitespace-nowrap"
        >
          <Share2 className="w-4 h-4" />
          مشاركة
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 py-2 text-xs font-medium text-[#363E4D] dark:text-[#DCE1EA] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633] transition-colors whitespace-nowrap"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'تم النسخ' : 'نسخ الرابط'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 py-2 text-xs font-medium text-[#363E4D] dark:text-[#DCE1EA] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633] transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          تنزيل QR
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 py-2 text-xs font-medium text-[#363E4D] dark:text-[#DCE1EA] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633] transition-colors whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      </div>

      {shareNote && (
        <p className="mt-2 text-xs text-[#8F6D14] dark:text-[#D4AF37]">{shareNote}</p>
      )}
    </div>
  );
};

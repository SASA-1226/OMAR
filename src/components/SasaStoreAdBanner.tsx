import React from 'react';
import { Cpu, ExternalLink, Smartphone, Sparkles } from 'lucide-react';
import { SASA_STORE_WEBSITE_URL } from '../lib/constants';
import { BrandLogo } from './BrandLogo';

interface SasaStoreAdBannerProps {
  className?: string;
}

const EGYPT_POPULAR_SCHEMATICS = [
  'iPhone 13 / 14 Pro Max / 15 & 16 Pro Max',
  'Samsung A15 / A35 / A55 / S24 Ultra',
  'Redmi Note 13 Pro / Poco X6 Pro',
  'Oppo Reno 11 / Realme 12 Pro+ / Infinix Note 40',
];

export const SasaStoreAdBanner: React.FC<SasaStoreAdBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-l from-[#141923] via-[#0B1220] to-[#141923] p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <BrandLogo size="sm" />
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#D4AF37]">
              <Sparkles className="w-3 h-3" />
              إعلان رسمي · مخططات الصيانة الاحترافية
            </span>
          </div>

          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#F3F5F8] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>مخطط صاصا ستور — مخططات بوردة الموبايل (Board Schematics)</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#C5CCD8] mt-1 leading-relaxed">
              تتبّع مسارات الشحن، الإضاءة، الشبكة، والـ Bitmap والقياسات الدقيقة لأشهر هواتف السوق المصري لفنيي ومراكز الصيانة:
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {EGYPT_POPULAR_SCHEMATICS.map((modelGroup) => (
              <span
                key={modelGroup}
                dir="ltr"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#252C38] bg-[#0B1220]/90 px-2.5 py-1 text-[11px] font-medium text-[#DCE1EA]"
              >
                <Smartphone className="w-3 h-3 text-[#D4AF37] shrink-0" />
                {modelGroup}
              </span>
            ))}
          </div>
        </div>

        <a
          href={SASA_STORE_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-extrabold text-[#0B1220] hover:bg-[#E2C25B] transition-colors shrink-0 whitespace-nowrap"
        >
          <span>فتح مخططات صاصا ستور</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

import React from 'react';
import { Phone } from 'lucide-react';

export const SUPPORT_PHONE = '01214899889';
export const SUPPORT_WHATSAPP_URL = 'https://wa.me/201214899889';
export const SUPPORT_TEL_URL = 'tel:01214899889';

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={`shrink-0 ${className}`}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM17.89 16.07C17.64 16.77 16.45 17.4 15.88 17.49C15.36 17.57 14.71 17.61 13.99 17.38C13.55 17.24 12.99 17.05 12.27 16.74C9.24 15.43 7.26 12.38 7.11 12.18C6.96 11.98 5.88 10.54 5.88 9.05C5.88 7.56 6.66 6.83 6.94 6.53C7.22 6.23 7.55 6.15 7.75 6.15C7.95 6.15 8.15 6.15 8.33 6.16C8.52 6.17 8.77 6.09 9.02 6.69C9.27 7.3 9.88 8.79 9.96 8.95C10.04 9.1 10.09 9.28 9.99 9.48C9.89 9.68 9.84 9.8 9.69 9.98C9.54 10.16 9.37 10.38 9.24 10.52C9.09 10.67 8.93 10.83 9.11 11.14C9.29 11.45 9.91 12.46 10.83 13.28C12.01 14.33 13 14.66 13.31 14.81C13.62 14.96 13.8 14.94 13.98 14.73C14.16 14.52 14.75 13.83 14.96 13.52C15.17 13.21 15.38 13.26 15.66 13.36C15.94 13.46 17.44 14.2 17.75 14.35C18.06 14.5 18.27 14.58 18.35 14.71C18.43 14.84 18.43 15.46 17.89 16.07Z" />
  </svg>
);

interface SupportContactButtonsProps {
  variant?: 'footer' | 'card';
  className?: string;
}

export const SupportContactButtons: React.FC<SupportContactButtonsProps> = ({
  variant = 'footer',
  className = '',
}) => {
  if (variant === 'card') {
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#0B1220] px-4 py-2 text-xs font-extrabold shadow-sm shadow-[#25D366]/20 transition-all active:scale-[0.99] whitespace-nowrap"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>الدعم الفني واتساب</span>
          <span className="font-mono-code tabular-nums" dir="ltr">
            {SUPPORT_PHONE}
          </span>
        </a>
        <a
          href={SUPPORT_TEL_URL}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#E2C25B] text-[#0B1220] px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap"
        >
          <Phone className="w-4 h-4" />
          <span>اتصال مباشر</span>
        </a>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-[38px] inline-flex items-center gap-2 rounded-xl border border-[#25D366]/45 bg-[#25D366]/12 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-[#4ADE80] hover:bg-[#25D366] hover:text-[#0B1220] hover:border-[#25D366] transition-all whitespace-nowrap"
      >
        <WhatsAppIcon className="w-4 h-4" />
        <span>الدعم الفني واتساب</span>
        <span className="font-mono-code tabular-nums" dir="ltr">
          {SUPPORT_PHONE}
        </span>
      </a>
      <a
        href={SUPPORT_TEL_URL}
        className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B1220] transition-colors whitespace-nowrap"
      >
        <Phone className="w-3.5 h-3.5" />
        <span>اتصال</span>
      </a>
    </div>
  );
};

import React from 'react';
import { useOptionalCms } from '../context/CmsContext';

interface BrandLogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onLight?: boolean;
  onDark?: boolean;
  className?: string;
}

/**
 * Brand logo & geometric emblem for صاصا ستور | SASA STORE — OMOR (عُمْر).
 * Dynamically reflects owner-configured siteName, siteBrandPrefix, and logoUrl when set.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  compact = false,
  size = 'md',
  onLight = false,
  onDark = false,
  className = '',
}) => {
  const cms = useOptionalCms();
  const customLogo = cms?.settings.logoUrl?.trim() || '';
  const logoSrc = customLogo || '/assets/aistudio/file_00000000c7748210950721111bfbb7e2_1b9aa8fa.png';
  const brandPrefix = cms?.settings.siteBrandPrefix?.trim() || 'SASA STORE';
  const siteName = cms?.settings.siteName?.trim() || 'OMOR · عُمْر';

  const iconSize = compact ? 32 : size === 'lg' ? 68 : size === 'sm' ? 30 : 40;

  const primaryTextClass = onDark
    ? 'text-white'
    : onLight
      ? 'text-[#0B1220]'
      : 'text-[#11161F] dark:text-[#F3F5F8]';

  const subTextClass = onDark
    ? 'text-[#C5CCD8]'
    : onLight
      ? 'text-[#4A5363]'
      : 'text-[#687182] dark:text-[#8E97A8]';

  const goldTextClass = onDark
    ? 'text-[#D4AF37]'
    : onLight
      ? 'text-[#8F6D14]'
      : 'text-[#8F6D14] dark:text-[#D4AF37]';

  const titleSizeClass =
    size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-xs' : 'text-sm sm:text-base';

  const subSizeClass =
    size === 'lg' ? 'text-xs' : size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}
    >
      <img
        src={logoSrc}
        alt={`${brandPrefix} ${siteName}`}
        width={iconSize}
        height={iconSize}
        style={{ width: iconSize, height: iconSize }}
        className="rounded-xl object-cover border border-[#D4AF37]/50 shrink-0 shadow-sm"
      />

      {compact ? (
        <div className="flex flex-col leading-none">
          <span className={`font-display text-xs font-extrabold tracking-tight ${primaryTextClass}`}>
            صاصا ستور
          </span>
          <span className={`text-[9px] font-bold tracking-wider ${goldTextClass}`}>
            {brandPrefix} · {siteName}
          </span>
        </div>
      ) : (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-display font-extrabold tracking-tight ${titleSizeClass} ${primaryTextClass}`}>
              صاصا ستور
            </span>
            <span className={`font-display font-bold tracking-wide ${subSizeClass} ${goldTextClass}`}>
              {brandPrefix}
            </span>
          </div>
          <div className={`flex items-center gap-1 font-semibold tracking-wider ${subSizeClass} ${subTextClass}`}>
            <span>{siteName}</span>
          </div>
        </div>
      )}
    </div>
  );
};

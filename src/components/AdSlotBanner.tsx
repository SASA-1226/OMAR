import React, { useEffect, useRef } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import { useOptionalCms } from '../context/CmsContext';
import type { AdPlacement, AdSlot } from '../types/cms';
import { ImageWithFallback } from './ImageWithFallback';

interface AdSlotBannerProps {
  placement: AdPlacement;
  previewSlot?: AdSlot;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

function isSafeHref(url?: string): string | null {
  if (!url || !url.trim()) return null;
  const val = url.trim();
  if (val.startsWith('/') && !val.startsWith('//')) return val;
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function loadAdSenseScript(clientId: string) {
  if (!/^ca-pub-\d+$/.test(clientId)) return;
  const scriptId = 'omor-adsense-sdk';
  if (document.getElementById(scriptId)) return;
  const s = document.createElement('script');
  s.id = scriptId;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  document.head.appendChild(s);
}

export const AdSlotBanner: React.FC<AdSlotBannerProps> = ({ placement, previewSlot, className = '' }) => {
  const cms = useOptionalCms();
  const slot = previewSlot || cms?.getActiveAdForPlacement(placement);
  const impressionSentRef = useRef<string>('');
  const pushedSlotRef = useRef<string>('');

  const isPreview = Boolean(previewSlot);
  const effectiveAdsenseClient =
    slot?.adsenseClient?.trim() || cms?.settings.googleAdsenseClient?.trim() || '';
  const canRenderAdSense =
    slot?.adType === 'adsense' &&
    Boolean(cms?.settings.adsenseEnabled || isPreview) &&
    /^ca-pub-\d+$/.test(effectiveAdsenseClient) &&
    /^\d+$/.test((slot.adsenseSlot || '').trim());

  useEffect(() => {
    if (!slot || isPreview || !slot.isActive) return;
    if (impressionSentRef.current === slot.id) return;
    impressionSentRef.current = slot.id;
    fetch('/api/public/track/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot.id, event: 'impression' }),
    }).catch(() => undefined);
  }, [slot, isPreview]);

  useEffect(() => {
    if (!slot || !canRenderAdSense || isPreview) return;
    loadAdSenseScript(effectiveAdsenseClient);
    if (pushedSlotRef.current !== slot.id) {
      pushedSlotRef.current = slot.id;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        // Ignore AdSense push timing issues when blocked by browser extensions
      }
    }
  }, [slot, canRenderAdSense, effectiveAdsenseClient, isPreview]);

  if (!slot) return null;
  if (!isPreview && !slot.isActive) return null;

  const handleDirectClick = () => {
    if (isPreview) return;
    fetch('/api/public/track/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot.id, event: 'click' }),
    }).catch(() => undefined);
  };

  if (slot.adType === 'adsense') {
    if (!canRenderAdSense) {
      if (!isPreview) return null;
      return (
        <div
          className={`rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-center text-xs text-[#4A5363] dark:text-[#C5CCD8] ${className}`}
        >
          <div className="font-bold text-[#8F6D14] dark:text-[#D4AF37]">
            معاينة مساحة Google AdSense ({slot.name})
          </div>
          <p className="mt-1 text-[11px] text-[#687182] dark:text-[#8E97A8]">
            أدخل معرّف الناشر (ca-pub-...) ورقم الوحدة الإعلانية (Slot ID) وفعّل AdSense لعرض الإعلان الحقيقي.
          </p>
        </div>
      );
    }

    return (
      <div
        className={`rounded-2xl border border-[#DCE0E7]/80 dark:border-[#252C38] bg-white/70 dark:bg-[#141923]/60 p-3 text-center overflow-hidden ${className}`}
      >
        <div className="text-[10px] text-[#7A8394] mb-1.5">مساحة إعلانية برعاية Google AdSense</div>
        <ins
          className="adsbygoogle block"
          data-ad-client={effectiveAdsenseClient}
          data-ad-slot={(slot.adsenseSlot || '').trim()}
          data-ad-format={slot.adsenseFormat || 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  const safeLink = isSafeHref(slot.directLinkUrl);
  if (!slot.directTitle && !slot.directImageUrl && !isPreview) return null;

  return (
    <aside
      aria-label={slot.name}
      className={`rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-l from-white to-amber-50/40 dark:from-[#141923] dark:to-[#1B212E] p-4 sm:p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {slot.directImageUrl ? (
            <ImageWithFallback
              src={slot.directImageUrl}
              alt={slot.directTitle || slot.name}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#D5DBE5] dark:border-[#333C4B]"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#8F6D14] dark:text-[#D4AF37]">
              إعلان مميز · {slot.name}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
              {slot.directTitle || 'عنوان الإعلان المباشر'}
            </h3>
            {slot.directDescription && (
              <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] line-clamp-2">
                {slot.directDescription}
              </p>
            )}
          </div>
        </div>

        {safeLink && (
          <a
            href={safeLink}
            target={safeLink.startsWith('http') ? '_blank' : undefined}
            rel={safeLink.startsWith('http') ? 'noopener noreferrer nofollow' : undefined}
            onClick={handleDirectClick}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#E2C25B] text-[#0B1220] px-4 py-2 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors"
          >
            <span>معاينة العرض</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </aside>
  );
};

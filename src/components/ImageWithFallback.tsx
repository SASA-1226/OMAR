import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { sanitizeSafeUrl } from '../lib/security';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const safeSrc = sanitizeSafeUrl(src);

  if (!safeSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EEF0F4] dark:bg-[#1F2633]/70 text-[#7A8394] dark:text-[#7E8798] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Smartphone className="w-8 h-8 opacity-60" />
        <span className="mt-2 text-xs font-medium px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

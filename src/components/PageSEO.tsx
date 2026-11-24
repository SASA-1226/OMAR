import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOptionalCms } from '../context/CmsContext';

interface PageSEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
}

function upsertMeta(attrName: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attrName}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export const PageSEO: React.FC<PageSEOProps> = ({
  title,
  description,
  image,
  type = 'website',
  noIndex = false,
  structuredData,
}) => {
  const cms = useOptionalCms();
  const location = useLocation();

  const resolvedTitle = title || cms?.settings.seoDefaultTitle || 'SASA STORE | OMOR — عُمْر';
  const resolvedDesc =
    description ||
    cms?.settings.seoDefaultDescription ||
    'منصة عُمْر من صاصا ستور لتوثيق الأجهزة الإلكترونية وسوق الثقة في مصر.';
  const origin =
    cms?.settings.customDomain?.trim().replace(/\/+$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const canonicalUrl = `${origin}${location.pathname}`;

  useEffect(() => {
    document.title = resolvedTitle;
    upsertMeta('name', 'description', resolvedDesc);
    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', resolvedDesc);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', resolvedDesc);

    if (image) {
      const fullImg = image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? '' : '/'}${image}`;
      upsertMeta('property', 'og:image', fullImg);
      upsertMeta('name', 'twitter:image', fullImg);
    }

    if (noIndex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      upsertMeta('name', 'robots', 'index, follow');
    }

    const gscToken = cms?.settings.googleSearchConsoleToken?.trim();
    if (gscToken) {
      upsertMeta('name', 'google-site-verification', gscToken);
    }

    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    const schemaId = 'omor-jsonld';
    const existingScript = document.getElementById(schemaId);
    const defaultSchema: Record<string, unknown> = structuredData || {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: `${cms?.settings.siteBrandPrefix || 'SASA STORE'} | ${cms?.settings.siteName || 'OMOR'}`,
      url: origin || undefined,
      description: resolvedDesc,
    };

    const scriptEl = existingScript || document.createElement('script');
    scriptEl.id = schemaId;
    scriptEl.setAttribute('type', 'application/ld+json');
    scriptEl.textContent = JSON.stringify(defaultSchema);
    if (!existingScript) {
      document.head.appendChild(scriptEl);
    }
  }, [
    resolvedTitle,
    resolvedDesc,
    canonicalUrl,
    type,
    image,
    noIndex,
    origin,
    cms?.settings.googleSearchConsoleToken,
    cms?.settings.siteBrandPrefix,
    cms?.settings.siteName,
    structuredData,
  ]);

  return null;
};

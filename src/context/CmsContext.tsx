import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AdPlacement,
  AdSlot,
  AffiliateProduct,
  ArticleCategory,
  ArticleItem,
  PageConfig,
  PublicCmsBootstrap,
  SiteSettings,
  SubscriptionPlan,
} from '../types/cms';

export interface AdminAuthStatus {
  setupRequired: boolean;
  envOverrideActive: boolean;
  authenticated: boolean;
  email: string | null;
  loading: boolean;
}

const DEFAULT_PUBLIC_SETTINGS: SiteSettings = {
  siteName: 'OMOR — عُمْر',
  siteBrandPrefix: 'SASA STORE',
  slogan: 'كل جهاز له حكاية.. وكل حكاية لها سجل.',
  logoUrl: '',
  contactPhone: '01214899889',
  contactEmail: 'support@sasastore.app',
  supportWhatsapp: '201214899889',
  customDomain: '',
  seoDefaultTitle: 'SASA STORE | OMOR — عُمْر | منصة الهوية الرقمية للأجهزة وسوق الثقة',
  seoDefaultDescription:
    'منصة عُمْر (OMOR) من صاصا ستور لإنشاء الهوية الرقمية للأجهزة، توثيق الصيانة والضمانات، أدلة فحص الأجهزة المستعملة، والعروض الموثوقة في مصر.',
  googleSearchConsoleToken: '',
  googleAdsenseClient: '',
  adsenseEnabled: false,
  paidPlansEnabled: false,
  sectionFlags: {
    articles: true,
    offers: true,
    market: true,
    technicians: true,
    v3Tools: true,
    ads: true,
  },
  updatedAt: new Date().toISOString(),
};

interface CmsContextValue {
  isLoadingCms: boolean;
  settings: SiteSettings;
  pages: PageConfig[];
  categories: ArticleCategory[];
  articles: ArticleItem[];
  adSlots: AdSlot[];
  affiliates: AffiliateProduct[];
  plans: SubscriptionPlan[];
  refreshBootstrap: () => Promise<void>;
  getPageConfig: (slug: string) => PageConfig | undefined;
  getActiveAdForPlacement: (placement: AdPlacement) => AdSlot | undefined;
  trackVisit: (pathname: string) => void;
  adminToken: string | null;
  adminStatus: AdminAuthStatus;
  refreshAdminStatus: (tokenOverride?: string | null) => Promise<void>;
  adminSetup: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
  adminFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<{ ok: boolean; data?: T; error?: string }>;
}

const CmsContext = createContext<CmsContextValue | null>(null);

function getAnonymousVisitorId(): string {
  try {
    const key = 'omor_anon_vid';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    return 'anon';
  }
}

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingCms, setIsLoadingCms] = useState(true);
  const [bootstrap, setBootstrap] = useState<PublicCmsBootstrap>({
    settings: DEFAULT_PUBLIC_SETTINGS,
    pages: [],
    categories: [],
    articles: [],
    adSlots: [],
    affiliates: [],
    plans: [],
  });

  // Admin session token kept strictly in React memory (never persisted in localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminAuthStatus>({
    setupRequired: false,
    envOverrideActive: false,
    authenticated: false,
    email: null,
    loading: true,
  });

  const lastTrackedRef = useRef<{ path: string; ts: number }>({ path: '', ts: 0 });

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (res.ok) {
        const data = (await res.json()) as PublicCmsBootstrap;
        setBootstrap(data);
      }
    } catch {
      // Fall back gracefully to defaults if network temporarily unavailable
    } finally {
      setIsLoadingCms(false);
    }
  }, []);

  const refreshAdminStatus = useCallback(
    async (tokenOverride?: string | null) => {
      const activeToken = tokenOverride !== undefined ? tokenOverride : adminToken;
      try {
        const res = await fetch('/api/admin/auth/status', {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined,
        });
        if (res.ok) {
          const data = (await res.json()) as Omit<AdminAuthStatus, 'loading'>;
          setAdminStatus({ ...data, loading: false });
          if (!data.authenticated && activeToken) {
            setAdminToken(null);
          }
        } else {
          setAdminStatus((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        setAdminStatus((prev) => ({ ...prev, loading: false }));
      }
    },
    [adminToken]
  );

  useEffect(() => {
    void refreshBootstrap();
    void refreshAdminStatus(null);
  }, [refreshBootstrap, refreshAdminStatus]);

  const getPageConfig = useCallback(
    (slug: string) => bootstrap.pages.find((p) => p.slug === slug),
    [bootstrap.pages]
  );

  const getActiveAdForPlacement = useCallback(
    (placement: AdPlacement) => {
      if (!bootstrap.settings.sectionFlags.ads) return undefined;
      return bootstrap.adSlots.find((s) => s.placement === placement && s.isActive);
    },
    [bootstrap.adSlots, bootstrap.settings.sectionFlags.ads]
  );

  const trackVisit = useCallback((pathname: string) => {
    if (!pathname || pathname.startsWith('/admin-portal') || pathname.startsWith('/admin')) return;
    const now = Date.now();
    if (lastTrackedRef.current.path === pathname && now - lastTrackedRef.current.ts < 8000) {
      return;
    }
    lastTrackedRef.current = { path: pathname, ts: now };
    fetch('/api/public/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        visitorId: getAnonymousVisitorId(),
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      }),
    }).catch(() => undefined);
  }, []);

  const adminSetup = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/admin/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { ok?: boolean; token?: string; email?: string; error?: string };
        if (!res.ok || !data.token) {
          return { ok: false, error: data.error || 'تعذر إعداد حساب المدير.' };
        }
        setAdminToken(data.token);
        setAdminStatus({
          setupRequired: false,
          envOverrideActive: false,
          authenticated: true,
          email: data.email || email,
          loading: false,
        });
        return { ok: true };
      } catch {
        return { ok: false, error: 'تعذر الاتصال بالخادم.' };
      }
    },
    []
  );

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; email?: string; error?: string };
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error || 'بيانات الدخول غير صحيحة.' };
      }
      setAdminToken(data.token);
      setAdminStatus((prev) => ({
        ...prev,
        setupRequired: false,
        authenticated: true,
        email: data.email || email,
        loading: false,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'تعذر الاتصال بالخادم.' };
    }
  }, []);

  const adminLogout = useCallback(async () => {
    if (adminToken) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => undefined);
    }
    setAdminToken(null);
    setAdminStatus((prev) => ({ ...prev, authenticated: false, email: null }));
  }, [adminToken]);

  const adminFetch = useCallback(
    async <T = unknown>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> => {
      if (!adminToken) {
        return { ok: false, error: 'انتهت جلسة الإدارة. سجل الدخول مرة أخرى.' };
      }
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const json = (await res.json().catch(() => ({}))) as T & { error?: string };
        if (res.status === 401) {
          setAdminToken(null);
          setAdminStatus((prev) => ({ ...prev, authenticated: false, email: null }));
          return { ok: false, error: json.error || 'انتهت الجلسة، يرجى إعادة تسجيل الدخول.' };
        }
        if (!res.ok) {
          return { ok: false, error: json.error || 'تعذر تنفيذ الطلب.' };
        }
        return { ok: true, data: json };
      } catch {
        return { ok: false, error: 'خطأ في الاتصال بالخادم.' };
      }
    },
    [adminToken]
  );

  return (
    <CmsContext.Provider
      value={{
        isLoadingCms,
        settings: bootstrap.settings,
        pages: bootstrap.pages,
        categories: bootstrap.categories,
        articles: bootstrap.articles,
        adSlots: bootstrap.adSlots,
        affiliates: bootstrap.affiliates,
        plans: bootstrap.plans,
        refreshBootstrap,
        getPageConfig,
        getActiveAdForPlacement,
        trackVisit,
        adminToken,
        adminStatus,
        refreshAdminStatus,
        adminSetup,
        adminLogin,
        adminLogout,
        adminFetch,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
};

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error('useCms must be used inside CmsProvider');
  return ctx;
}

export function useOptionalCms(): CmsContextValue | null {
  return useContext(CmsContext);
}

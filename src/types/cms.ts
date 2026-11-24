export interface SiteSectionFlags {
  articles: boolean;
  offers: boolean;
  market: boolean;
  technicians: boolean;
  v3Tools: boolean;
  ads: boolean;
}

export interface SiteSettings {
  siteName: string;
  siteBrandPrefix: string;
  slogan: string;
  logoUrl?: string;
  contactPhone: string;
  contactEmail: string;
  supportWhatsapp: string;
  customDomain?: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  googleSearchConsoleToken?: string;
  googleAdsenseClient?: string;
  adsenseEnabled: boolean;
  paidPlansEnabled: boolean;
  sectionFlags: SiteSectionFlags;
  updatedAt: string;
}

export interface PageConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  heroBody: string;
  isEnabled: boolean;
  updatedAt: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
}

export type ArticleStatus = 'draft' | 'published' | 'hidden';

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  authorName: string;
  status: ArticleStatus;
  showOnHome: boolean;
  seoTitle?: string;
  seoDescription?: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AdPlacement =
  | 'header_top'
  | 'home_mid'
  | 'article_top'
  | 'article_bottom'
  | 'offers_top'
  | 'footer_banner'
  | 'sidebar';

export type AdType = 'adsense' | 'direct';

export interface AdSlot {
  id: string;
  name: string;
  placement: AdPlacement;
  adType: AdType;
  adsenseClient?: string;
  adsenseSlot?: string;
  adsenseFormat?: string;
  directTitle?: string;
  directDescription?: string;
  directImageUrl?: string;
  directLinkUrl?: string;
  isActive: boolean;
  impressionsCount: number;
  clicksCount: number;
  updatedAt: string;
}

export interface AffiliateProduct {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  priceEgp: number;
  oldPriceEgp?: number;
  imageUrl?: string;
  affiliateUrl: string;
  networkLabel: string;
  commissionRatePct: number;
  isFeatured: boolean;
  isActive: boolean;
  clicksCount: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  targetRole: 'user' | 'technician' | 'store' | 'enterprise';
  priceMonthlyEgp: number;
  priceYearlyEgp: number;
  billingEnabled: boolean;
  isActive: boolean;
  features: string[];
  subscriberCount: number;
  sortOrder: number;
}

export type ContactMessageStatus = 'new' | 'read' | 'replied' | 'archived';

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminNote?: string;
  createdAt: string;
}

export interface RevenueEntry {
  id: string;
  sourceType: 'adsense' | 'affiliate' | 'subscription' | 'direct_ad';
  description: string;
  amountEgp: number;
  entryDate: string;
  createdAt: string;
}

export interface AdminOverviewStats {
  visitors: {
    today: number;
    week: number;
    month: number;
    totalViews: number;
    uniqueVisitors: number;
    topPaths: Array<{ path: string; count: number }>;
  };
  content: {
    publishedArticles: number;
    draftArticles: number;
    hiddenArticles: number;
    categoriesCount: number;
  };
  monetization: {
    activeAdsCount: number;
    totalAdImpressions: number;
    totalAdClicks: number;
    activeAffiliatesCount: number;
    totalAffiliateClicks: number;
    totalRecordedRevenueEgp: number;
    estimatedAffiliateEarningsEgp: number;
    revenueBySource: Record<string, number>;
  };
  inbox: {
    totalMessages: number;
    unreadMessages: number;
  };
}

export interface PublicCmsBootstrap {
  settings: SiteSettings;
  pages: PageConfig[];
  categories: ArticleCategory[];
  articles: ArticleItem[];
  adSlots: AdSlot[];
  affiliates: AffiliateProduct[];
  plans: SubscriptionPlan[];
}

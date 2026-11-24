export type UserRole = 'user' | 'technician' | 'store' | 'admin';

export type DeviceCategorySlug =
  | 'smartphone'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'smartwatch'
  | 'tv'
  | 'home_appliance'
  | 'other';

export type DeviceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'needs_repair';
export type DeviceStatus =
  | 'active'
  | 'in_repair'
  | 'listed_for_sale'
  | 'transferred'
  | 'reported_stolen'
  | 'archived';
export type VerificationTier = 'self_recorded' | 'invoice_attached' | 'technician_verified';

export type EventType =
  | 'registered'
  | 'invoice_added'
  | 'warranty_started'
  | 'warranty_expired'
  | 'inspected'
  | 'repaired'
  | 'part_replaced'
  | 'condition_changed'
  | 'ownership_transferred'
  | 'listed_for_sale'
  | 'sale_completed'
  | 'note_added'
  | 'record_corrected'
  | 'lost_reported'
  | 'lost_cleared';

export type RepairStatus =
  | 'new'
  | 'under_inspection'
  | 'awaiting_customer_approval'
  | 'in_repair'
  | 'repaired'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'uncertain';

export type TransferStatus = 'pending' | 'buyer_accepted' | 'completed' | 'cancelled' | 'expired' | 'disputed';

export type ReportReason =
  | 'suspicious_listing'
  | 'incorrect_device_data'
  | 'questionable_repair'
  | 'uncommitted_technician'
  | 'fake_account'
  | 'identity_impersonation'
  | 'fraud_attempt'
  | 'privacy_issue'
  | 'other';

export type ReportStatus = 'new' | 'under_review' | 'needs_info' | 'resolved' | 'rejected';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  governorate?: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'deleted';
  storeName?: string;
  storeBio?: string;
  avatarUrl?: string;
  themePreference?: 'dark' | 'light';
  privacyHidePhone: boolean;
  privacyHideCity: boolean;
  activePlanSlug?: string;
  planBillingCycle?: 'monthly' | 'yearly';
  planExpiresAt?: string;
  aiQuotaBonus?: number;
  lastLoginAt?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface DevicePublicVisibility {
  isPublic: boolean;
  showRepairs: boolean;
  showWarranty: boolean;
  showCondition: boolean;
  showMaskedSerial: boolean;
}

export interface DevicePrivateData {
  serialNumber?: string;
  imei?: string;
  sellerName?: string;
  invoiceName?: string;
  invoiceDataUrl?: string;
  privateNotes?: string;
}

export interface DeviceRecord {
  id: string;
  deviceCode: string; // Non-repeatable internal ID e.g. OMR-2026-481920
  publicToken: string; // Safe token for QR & public profile URL
  ownerId: string;
  category: DeviceCategorySlug;
  brand: string;
  deviceName: string;
  model: string;
  modelNumber?: string;
  purchaseDate?: string;
  condition: DeviceCondition;
  status: DeviceStatus;
  imageUrl?: string;
  verificationTier: VerificationTier;
  visibility: DevicePublicVisibility;
  privateData: DevicePrivateData;
  createdAt: string;
  updatedAt: string;
  lostReportedAt?: string;
  lostReportNote?: string;
  publicScanCount?: number;
  isDemo?: boolean;
}

export interface DeviceEvent {
  id: string;
  eventCode: string;
  deviceId: string;
  eventType: EventType;
  occurredAt: string;
  actorId: string;
  actorLabel: string;
  description: string;
  attachments: string[];
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  ownerApproved: boolean;
  isDemo?: boolean;
}

export interface RepairPart {
  id: string;
  partName: string;
  partOrigin: 'new' | 'used' | 'unknown';
  warrantyDays: number;
}

export interface RepairRequest {
  id: string;
  deviceId: string;
  ownerId: string;
  technicianId: string;
  issueType: string;
  faultDescription: string;
  attachments: string[];
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface RepairRecord {
  id: string;
  requestId?: string;
  deviceId: string;
  technicianId: string;
  technicianName: string;
  centerName: string;
  issueType: string;
  faultDescription: string;
  diagnosis: string;
  actionTaken: string;
  parts: RepairPart[];
  repairCost?: number;
  intakeDate: string;
  deliveryDate?: string;
  warrantyDays: number;
  beforeImages: string[];
  afterImages: string[];
  notes?: string;
  status: RepairStatus;
  ownerApproved: boolean;
  ownerApprovedAt?: string;
  parentRecordId?: string;
  correctionReason?: string;
  createdBy: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface WarrantyRecord {
  id: string;
  deviceId: string;
  ownerId: string;
  itemOrPartName: string;
  issuerName: string;
  isSourceVerified: boolean;
  startDate: string;
  endDate: string;
  terms?: string;
  warrantyNumber?: string;
  documentName?: string;
  status: WarrantyStatus;
  createdAt: string;
  isDemo?: boolean;
}

export interface TechnicianProfile {
  id: string;
  userId: string;
  displayName: string;
  centerName: string;
  avatarUrl?: string;
  specialties: string[];
  supportedDeviceTypes: DeviceCategorySlug[];
  governorate: string;
  district: string;
  bio: string;
  publicContact: string;
  workingHours: string;
  isVerified: boolean;
  verifiedRepairsCount: number;
  isPro?: boolean;
  spotlightUntil?: string;
  priorityLeadsUntil?: string;
  isDemo?: boolean;
}

export interface TechnicianReview {
  id: string;
  technicianId: string;
  reviewerId: string;
  reviewerName: string;
  repairRecordId: string;
  rating: number;
  comment: string;
  isReported: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface MarketplaceListing {
  id: string;
  deviceId: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'user' | 'store';
  title: string;
  price: number;
  currency: string;
  city: string;
  condition: DeviceCondition;
  description: string;
  images: string[];
  storeWarrantyDays: number;
  isFeatured?: boolean;
  featuredUntil?: string;
  storeCertified?: boolean;
  sellerIsVip?: boolean;
  status: 'active' | 'reserved' | 'sold' | 'removed';
  createdAt: string;
  isDemo?: boolean;
}

export interface OwnershipTransfer {
  id: string;
  deviceId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  toUserName?: string;
  transferCode: string; // Temporary single-use code (hashed in DB)
  expiresAt: string;
  usedAt?: string;
  status: TransferStatus;
  disputeReason?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface Conversation {
  id: string;
  listingId?: string;
  listingTitle?: string;
  participantA: string;
  participantB: string;
  participantAName: string;
  participantBName: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    | 'device_added'
    | 'repair_logged'
    | 'repair_awaiting_approval'
    | 'repair_approved'
    | 'warranty_added'
    | 'warranty_expiring'
    | 'warranty_expired'
    | 'maintenance_reminder'
    | 'transfer_request'
    | 'transfer_completed'
    | 'new_message'
    | 'listing_updated'
    | 'security_alert';
  title: string;
  body: string;
  linkPath?: string;
  dedupeKey?: string;
  isRead: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export type MaintenanceCategory =
  | 'cleaning'
  | 'battery_check'
  | 'thermal_paste'
  | 'software_backup'
  | 'port_check'
  | 'general_inspection';

export interface MaintenanceReminder {
  id: string;
  deviceId: string;
  ownerId: string;
  title: string;
  category: MaintenanceCategory;
  intervalDays: number;
  nextDueDate: string;
  lastCompletedAt?: string;
  notes?: string;
  isAutoSuggested?: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface ReportItem {
  id: string;
  reportCode: string;
  reporterId: string;
  reporterName: string;
  targetType: 'listing' | 'device' | 'repair_record' | 'technician' | 'user' | 'review';
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
  isDemo?: boolean;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface NotificationPreferences {
  repairs: boolean;
  warranties: boolean;
  maintenanceReminders: boolean;
  warrantyAlertDays: number;
  browserPushEnabled?: boolean;
  transfers: boolean;
  messages: boolean;
  security: boolean;
}

// --- OMOR V3 Types ---

export type SparePartCategory =
  | 'screen'
  | 'battery'
  | 'charging_port'
  | 'motherboard'
  | 'cooling'
  | 'camera'
  | 'keyboard'
  | 'other';

export type SparePartOrigin = 'original' | 'oem_compatible' | 'used';

export interface SparePartStat {
  id: string;
  category: DeviceCategorySlug;
  brand: string;
  deviceModelPattern: string;
  partName: string;
  partCategory: SparePartCategory;
  origin: SparePartOrigin;
  minPriceEgp: number;
  avgPriceEgp: number;
  maxPriceEgp: number;
  avgWarrantyDays: number;
  sampleCount: number;
  trend: 'up' | 'stable' | 'down';
  lastUpdated: string;
  sourceLabel: string;
  isDemo?: boolean;
}

export type B2BPartnerType =
  | 'authorized_service_center'
  | 'enterprise_fleet'
  | 'retail_chain'
  | 'warranty_provider'
  | 'distributor';

export interface B2BPartner {
  id: string;
  companyName: string;
  partnerType: B2BPartnerType;
  governorate: string;
  branchesCount: number;
  supportedCategories: DeviceCategorySlug[];
  supportedBrands: string[];
  slaHours: number;
  warrantyPolicy: string;
  contactPhone: string;
  contactEmail: string;
  integrationStatus: 'connected' | 'pending_review' | 'sandbox';
  webhookCode: string;
  linkedTechniciansCount: number;
  isVerified: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface AIDiagnosisResult {
  summary: string;
  urgency: string;
  probableCauses: Array<{
    cause: string;
    likelihood: string;
    notes: string;
  }>;
  recommendedChecks: string[];
  suggestedParts: string[];
  safetyNote: string;
}

export interface AIIntelligenceInsight {
  headline: string;
  executiveSummary: string;
  keyHighlights: string[];
  actionRecommendations: string[];
}

export type PaidServiceCode =
  | 'store_feature_listing'
  | 'store_certified_stamp'
  | 'store_risk_pack'
  | 'tech_spotlight'
  | 'tech_priority_leads'
  | 'tech_ai_pack'
  | string;

export type PaymentMethodOption =
  | 'orange_cash'
  | 'vodafone_cash'
  | 'instapay'
  | 'bank_card'
  | 'e_gateway';

export type PaidCatalogCategory =
  | 'customer'
  | 'technician'
  | 'store'
  | 'verification_reports'
  | 'future';

export type PaidBillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'custom';

export interface DynamicPaidServiceItem {
  id: string;
  code: string;
  category: PaidCatalogCategory;
  itemType: 'service' | 'package';
  name: string;
  shortDesc: string;
  features: string[];
  priceEgp: number;
  billingPeriod: PaidBillingPeriod;
  durationDays: number;
  quotaCredits: number;
  requiresDevice: boolean;
  requiresListing: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface PaymentMethodConfigItem {
  code: PaymentMethodOption;
  displayName: string;
  receiverAccount: string;
  beneficiaryName: string;
  instructions: string;
  requiresManualProof: boolean;
  isEnabled: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface PromoCodeItem {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed_egp';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export type PaymentRequestStatus =
  | 'pending_review'
  | 'needs_more_proof'
  | 'approved'
  | 'rejected';

export interface PaymentProofRequest {
  id: string;
  userId: string;
  userName: string;
  userAccountCode: string;
  userRole: UserRole;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: PaidCatalogCategory;
  targetDeviceId?: string;
  targetListingId?: string;
  paymentMethod: PaymentMethodOption;
  receiverWallet: string;
  senderWalletPhone: string;
  originalAmountEgp: number;
  promoCode?: string;
  discountAmountEgp: number;
  expectedAmountEgp: number;
  transferredAmountEgp: number;
  referenceNumber?: string;
  transferDatetime: string;
  screenshotDataUrl: string;
  screenshotHash: string;
  userNote?: string;
  status: PaymentRequestStatus;
  adminNote?: string;
  rejectionReason?: string;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  reviewedAt?: string;
  activatedEntitlementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEntitlement {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: PaidCatalogCategory;
  itemType: 'service' | 'package';
  billingPeriod: PaidBillingPeriod;
  paidAmountEgp: number;
  status: 'active' | 'expired' | 'cancelled';
  isTrial: boolean;
  grantedByAdmin: boolean;
  sourcePaymentId?: string;
  targetDeviceId?: string;
  targetListingId?: string;
  startsAt: string;
  expiresAt?: string;
  createdAt: string;
}

export interface RevenueAnalyticsSummary {
  totalRequests: number;
  newRequestsCount: number;
  pendingReviewCount: number;
  needsMoreProofCount: number;
  approvedCount: number;
  rejectedCount: number;
  confirmedRevenueEgp: number;
  pendingAmountEgp: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  revenueByCategory: Record<string, number>;
  revenueByUserRole: Record<string, number>;
  dailySummary: Array<{ date: string; confirmedEgp: number; approvedCount: number }>;
  monthlySummary: Array<{ month: string; confirmedEgp: number; approvedCount: number }>;
}

export interface PaidServiceCatalogItem {
  code: PaidServiceCode;
  targetRole: 'technician' | 'store';
  name: string;
  shortDesc: string;
  benefits: string[];
  priceEgp: number;
  durationDays?: number;
  quotaCredits?: number;
  requiresListingSelection?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planSlug: string;
  planName: string;
  targetRole: string;
  billingCycle: 'monthly' | 'yearly';
  priceEgp: number;
  paymentMethod: PaymentMethodOption;
  paymentReference?: string;
  status: 'active' | 'cancelled' | 'expired';
  startedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaidServiceOrder {
  id: string;
  userId: string;
  serviceCode: PaidServiceCode;
  serviceName: string;
  targetType: 'listing' | 'technician' | 'account';
  targetId?: string;
  targetLabel?: string;
  priceEgp: number;
  paymentMethod: PaymentMethodOption;
  paymentReference?: string;
  status: 'active' | 'completed' | 'expired';
  expiresAt?: string;
  createdAt: string;
}

export interface SessionInfo {
  sessionId: string;
  userAgent: string;
  rememberMe: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export type TrustSourceLevel =
  | 'user_entry'
  | 'evidence_backed'
  | 'technician_checked'
  | 'verified_store';

export type InspectionItemKey =
  | 'screen'
  | 'touch'
  | 'battery'
  | 'cameras'
  | 'audio'
  | 'charging'
  | 'network'
  | 'sensors';

export type InspectionItemStatus = 'passed' | 'issue_found' | 'not_tested';

export interface DeviceInspection {
  id: string;
  inspectionCode: string;
  deviceId: string;
  inspectorId: string;
  inspectorName: string;
  trustLevel: TrustSourceLevel;
  items: Record<InspectionItemKey, InspectionItemStatus>;
  untestedItems: InspectionItemKey[];
  overallOutcome: 'pass_noted' | 'needs_attention' | 'incomplete';
  inspectorNotes: string;
  createdAt: string;
}

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  role: UserRole;
  accountStatus: string;
  activePlanSlug?: string;
  planExpiresAt?: string;
  devicesCount: number;
  createdAt: string;
}



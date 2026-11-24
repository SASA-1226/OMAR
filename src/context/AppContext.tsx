import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { computeWarrantyStatus } from '../lib/labels';
import { checkClientRateLimit } from '../lib/security';
import {
  evaluateSmartNotifications,
  sendBrowserPushNotification,
} from '../lib/smartNotifications';
import type {
  AuditLogItem,
  B2BPartner,
  B2BPartnerType,
  ChatMessage,
  Conversation,
  DeviceCategorySlug,
  DeviceCondition,
  DeviceEvent,
  DeviceInspection,
  DevicePublicVisibility,
  DeviceRecord,
  EventType,
  InspectionItemKey,
  InspectionItemStatus,
  MaintenanceCategory,
  MaintenanceReminder,
  MarketplaceListing,
  NotificationItem,
  NotificationPreferences,
  OwnershipTransfer,
  PaidServiceCatalogItem,
  PaidServiceCode,
  PaidServiceOrder,
  PaymentMethodOption,
  PaymentProofRequest,
  RepairPart,
  RepairRecord,
  RepairRequest,
  RepairStatus,
  ReportItem,
  ReportReason,
  ReportStatus,
  SessionInfo,
  SparePartCategory,
  SparePartOrigin,
  SparePartStat,
  TechnicianProfile,
  TechnicianReview,
  UserEntitlement,
  UserProfile,
  UserRole,
  UserSubscription,
  WarrantyRecord,
} from '../types/omor';

const THEME_STORAGE_KEY = 'sasa_omor_theme';
const SEARCH_HISTORY_KEY = 'sasa_omor_search_history';

export interface PlatformSettingsState {
  allowNewRegistrations: boolean;
  requireTechVerification: boolean;
  maxUploadMb: number;
  marketplaceEnabled: boolean;
}

interface WorkspaceStateSnapshot {
  currentUser: UserProfile | null;
  users: UserProfile[];
  devices: DeviceRecord[];
  events: DeviceEvent[];
  repairRequests: RepairRequest[];
  repairRecords: RepairRecord[];
  warranties: WarrantyRecord[];
  technicians: TechnicianProfile[];
  reviews: TechnicianReview[];
  listings: MarketplaceListing[];
  transfers: OwnershipTransfer[];
  conversations: Conversation[];
  messages: ChatMessage[];
  notifications: NotificationItem[];
  maintenanceReminders: MaintenanceReminder[];
  reports: ReportItem[];
  auditLogs: AuditLogItem[];
  sparePartStats: SparePartStat[];
  b2bPartners: B2BPartner[];
  notificationPrefs: NotificationPreferences;
  platformSettings: PlatformSettingsState;
  subscriptions: UserSubscription[];
  serviceOrders: PaidServiceOrder[];
  paidServicesCatalog: PaidServiceCatalogItem[];
  inspections: DeviceInspection[];
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  repairs: true,
  warranties: true,
  maintenanceReminders: true,
  warrantyAlertDays: 30,
  browserPushEnabled: false,
  transfers: true,
  messages: true,
  security: true,
};

const EMPTY_WORKSPACE: WorkspaceStateSnapshot = {
  currentUser: null,
  users: [],
  devices: [],
  events: [],
  repairRequests: [],
  repairRecords: [],
  warranties: [],
  technicians: [],
  reviews: [],
  listings: [],
  transfers: [],
  conversations: [],
  messages: [],
  notifications: [],
  maintenanceReminders: [],
  reports: [],
  auditLogs: [],
  sparePartStats: [],
  b2bPartners: [],
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  platformSettings: {
    allowNewRegistrations: true,
    requireTechVerification: true,
    maxUploadMb: 5,
    marketplaceEnabled: true,
  },
  subscriptions: [],
  serviceOrders: [],
  paidServicesCatalog: [],
  inspections: [],
};

export interface NewDevicePayload {
  category: DeviceCategorySlug;
  brand: string;
  deviceName: string;
  model: string;
  modelNumber?: string;
  serialNumber?: string;
  imei?: string;
  purchaseDate?: string;
  condition: DeviceCondition;
  imageUrl?: string;
  sellerName?: string;
  invoiceName?: string;
  privateNotes?: string;
  warrantyIssuer?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  warrantyNumber?: string;
}

export interface NewRepairRecordPayload {
  requestId?: string;
  deviceId: string;
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
}

export interface DeviceLookupResult {
  found: boolean;
  publicToken?: string;
  status?: DeviceRecord['status'];
  deviceCode?: string;
  brand?: string;
  deviceName?: string;
  lostReportedAt?: string;
  lostReportNote?: string;
}

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface AppContextValue {
  isLoadingAuth: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
  currentUser: UserProfile | null;
  users: UserProfile[];
  devices: DeviceRecord[];
  myDevices: DeviceRecord[];
  events: DeviceEvent[];
  repairRequests: RepairRequest[];
  repairRecords: RepairRecord[];
  warranties: WarrantyRecord[];
  technicians: TechnicianProfile[];
  reviews: TechnicianReview[];
  listings: MarketplaceListing[];
  transfers: OwnershipTransfer[];
  conversations: Conversation[];
  messages: ChatMessage[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  maintenanceReminders: MaintenanceReminder[];
  reports: ReportItem[];
  auditLogs: AuditLogItem[];
  sparePartStats: SparePartStat[];
  b2bPartners: B2BPartner[];
  notificationPrefs: NotificationPreferences;
  platformSettings: PlatformSettingsState;
  subscriptions: UserSubscription[];
  serviceOrders: PaidServiceOrder[];
  paidServicesCatalog: PaidServiceCatalogItem[];
  inspections: DeviceInspection[];
  myEntitlements: UserEntitlement[];
  myPaymentRequests: PaymentProofRequest[];
  sessions: SessionInfo[];
  searchHistory: string[];
  addSearchHistory: (q: string) => void;
  clearSearchHistory: () => void;
  apiFetch: <T = Record<string, unknown>>(
    url: string,
    options?: RequestInit
  ) => Promise<{ ok: boolean; status: number; data?: T; error?: string }>;
  refreshAppState: () => Promise<void>;
  refreshMonetization: () => Promise<void>;
  lookupDeviceIdentifier: (query: string) => Promise<DeviceLookupResult>;

  // Auth & Persistent Sessions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<ActionResult>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: 'user' | 'technician' | 'store';
    city: string;
    rememberMe?: boolean;
  }) => Promise<ActionResult>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  revokeSessionByPrefix: (prefix: string) => Promise<ActionResult>;
  resetPassword: (email: string) => Promise<ActionResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ActionResult>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<ActionResult>;
  deleteMyAccount: () => Promise<ActionResult>;

  // Devices & Lifecycle
  addDevice: (payload: NewDevicePayload) => Promise<ActionResult<DeviceRecord>>;
  updateDeviceVisibility: (deviceId: string, visibility: DevicePublicVisibility) => Promise<ActionResult>;
  rotateDeviceToken: (deviceId: string) => Promise<ActionResult<{ publicToken: string }>>;
  createDeviceInspection: (payload: {
    deviceId: string;
    items: Record<InspectionItemKey, InspectionItemStatus>;
    inspectorNotes?: string;
  }) => Promise<ActionResult<DeviceInspection>>;
  updateDeviceCondition: (deviceId: string, condition: DeviceCondition) => Promise<ActionResult>;
  updateDevicePrivateData: (
    deviceId: string,
    updates: {
      serialNumber?: string;
      imei?: string;
      sellerName?: string;
      invoiceName?: string;
      privateNotes?: string;
    }
  ) => Promise<ActionResult>;
  reportDeviceLostOrStolen: (deviceId: string, note: string) => Promise<ActionResult>;
  clearDeviceLostOrStolen: (deviceId: string) => Promise<ActionResult>;
  recordPublicProfileScan: (deviceId: string) => Promise<void>;
  deleteOrArchiveDevice: (deviceId: string, mode: 'archive' | 'delete') => Promise<ActionResult>;
  addDeviceEvent: (deviceId: string, eventType: EventType, description: string) => Promise<ActionResult>;

  // Repairs
  createRepairRequest: (payload: {
    deviceId: string;
    technicianId: string;
    issueType: string;
    faultDescription: string;
    attachments?: string[];
  }) => Promise<ActionResult<RepairRequest>>;
  updateRepairRequestStatus: (requestId: string, status: RepairStatus) => Promise<ActionResult>;
  createRepairRecord: (payload: NewRepairRecordPayload) => Promise<ActionResult<RepairRecord>>;
  approveRepairRecord: (recordId: string) => Promise<ActionResult>;
  rejectRepairRecord: (recordId: string, reason: string) => Promise<ActionResult>;
  createRepairCorrectionRecord: (
    originalRecordId: string,
    correctionReason: string,
    updates: Partial<NewRepairRecordPayload>
  ) => Promise<ActionResult>;

  // Warranties
  addWarranty: (payload: {
    deviceId: string;
    itemOrPartName: string;
    issuerName: string;
    startDate: string;
    endDate: string;
    warrantyNumber?: string;
    terms?: string;
    documentName?: string;
  }) => Promise<ActionResult<WarrantyRecord>>;
  cancelWarranty: (warrantyId: string) => Promise<ActionResult>;

  // Marketplace & Messaging
  createListing: (payload: {
    deviceId: string;
    title: string;
    price: number;
    city: string;
    condition: DeviceCondition;
    description: string;
    images: string[];
    storeWarrantyDays: number;
  }) => Promise<ActionResult<MarketplaceListing>>;
  updateListingStatus: (listingId: string, status: MarketplaceListing['status']) => Promise<ActionResult>;
  startOrGetConversation: (
    otherUserId: string,
    otherUserName: string,
    listingId?: string,
    listingTitle?: string
  ) => Promise<Conversation | null>;
  sendMessage: (conversationId: string, body: string) => Promise<ActionResult>;

  // Ownership Transfers
  initiateTransfer: (deviceId: string) => Promise<ActionResult<OwnershipTransfer>>;
  buyerAcceptTransfer: (transferCode: string) => Promise<ActionResult<OwnershipTransfer>>;
  ownerConfirmTransfer: (transferId: string) => Promise<ActionResult>;
  cancelOrDisputeTransfer: (
    transferId: string,
    mode: 'cancel' | 'dispute',
    reason?: string
  ) => Promise<ActionResult>;

  // Technicians & Reviews
  submitTechnicianReview: (payload: {
    technicianId: string;
    repairRecordId: string;
    rating: number;
    comment: string;
  }) => Promise<ActionResult>;
  reportReview: (reviewId: string) => Promise<void>;
  updateTechnicianProfile: (updates: Partial<TechnicianProfile>) => Promise<ActionResult>;

  // Notifications, Smart Reminders & Reports
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  updateNotificationPrefs: (prefs: NotificationPreferences) => Promise<void>;
  addMaintenanceReminder: (payload: {
    deviceId: string;
    title: string;
    category: MaintenanceCategory;
    intervalDays: number;
    nextDueDate?: string;
    notes?: string;
  }) => Promise<ActionResult<MaintenanceReminder>>;
  completeMaintenanceReminder: (reminderId: string) => Promise<ActionResult>;
  deleteMaintenanceReminder: (reminderId: string) => Promise<void>;
  runSmartReminderSweep: () => number;
  submitReport: (payload: {
    targetType: ReportItem['targetType'];
    targetId: string;
    targetLabel: string;
    reason: ReportReason;
    description: string;
  }) => Promise<ActionResult>;

  // Admin
  adminUpdateUserStatus: (userId: string, status: 'active' | 'suspended') => Promise<ActionResult>;
  adminUpdateUserRole: (userId: string, role: UserRole) => Promise<ActionResult>;
  adminToggleTechVerification: (techId: string) => Promise<ActionResult>;
  adminUpdateReportStatus: (reportId: string, status: ReportStatus) => Promise<ActionResult>;
  adminUpdatePlatformSettings: (settings: PlatformSettingsState) => Promise<ActionResult>;

  // V3: Spare Parts Stats & B2B Enterprise Integration
  addSparePartObservation: (payload: {
    category: DeviceCategorySlug;
    brand: string;
    deviceModelPattern: string;
    partName: string;
    partCategory: SparePartCategory;
    origin: SparePartOrigin;
    priceEgp: number;
    warrantyDays: number;
  }) => Promise<ActionResult<SparePartStat>>;
  registerB2BPartner: (payload: {
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
  }) => Promise<ActionResult<B2BPartner>>;
  adminToggleB2BPartnerStatus: (partnerId: string) => Promise<ActionResult>;

  // Paid Subscriptions & Optional Pro Services
  subscribeToPlan: (payload: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    paymentMethod: PaymentMethodOption;
    paymentReference?: string;
  }) => Promise<ActionResult<UserSubscription>>;
  cancelSubscription: (subscriptionId: string) => Promise<ActionResult>;
  purchasePaidService: (payload: {
    serviceCode: PaidServiceCode;
    listingId?: string;
    paymentMethod: PaymentMethodOption;
    paymentReference?: string;
  }) => Promise<ActionResult<PaidServiceOrder>>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WorkspaceStateSnapshot>(EMPTY_WORKSPACE);
  const [myEntitlements, setMyEntitlements] = useState<UserEntitlement[]>([]);
  const [myPaymentRequests, setMyPaymentRequests] = useState<PaymentProofRequest[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [localSmartAlerts, setLocalSmartAlerts] = useState<NotificationItem[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const sessionTokenRef = useRef<string>('');
  const themeSyncedUserRef = useRef<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const apiFetch = useCallback(
    async <T = Record<string, unknown>>(
      url: string,
      options: RequestInit = {}
    ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> => {
      try {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Content-Type') && options.body) {
          headers.set('Content-Type', 'application/json');
        }
        headers.set('X-Requested-With', 'XMLHttpRequest');
        if (sessionTokenRef.current) {
          headers.set('Authorization', `Bearer ${sessionTokenRef.current}`);
        }
        const res = await fetch(url, {
          ...options,
          headers,
          credentials: 'same-origin',
        });
        const json = (await res.json().catch(() => ({}))) as T & { error?: string };
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: json.error || 'تعذر تنفيذ الطلب حاليًا.',
          };
        }
        return { ok: true, status: res.status, data: json };
      } catch {
        return {
          ok: false,
          status: 0,
          error: 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.',
        };
      }
    },
    []
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (state.currentUser) {
        void apiFetch('/api/app/profile', {
          method: 'PATCH',
          body: JSON.stringify({ themePreference: next }),
        });
      }
      return next;
    });
  }, [apiFetch, state.currentUser]);

  const setThemeMode = useCallback(
    (mode: 'dark' | 'light') => {
      setTheme(mode);
      if (state.currentUser) {
        void apiFetch('/api/app/profile', {
          method: 'PATCH',
          body: JSON.stringify({ themePreference: mode }),
        });
      }
    },
    [apiFetch, state.currentUser]
  );

  const refreshMonetization = useCallback(async () => {
    const res = await apiFetch<{
      paymentRequests: PaymentProofRequest[];
      entitlements: UserEntitlement[];
    }>('/api/monetization/my');
    if (res.ok && res.data) {
      setMyPaymentRequests(res.data.paymentRequests || []);
      setMyEntitlements(res.data.entitlements || []);
    }
  }, [apiFetch]);

  const refreshAppState = useCallback(async () => {
    const res = await apiFetch<WorkspaceStateSnapshot>('/api/app/state');
    if (res.ok && res.data) {
      setState(res.data);
      const usr = res.data.currentUser;
      if (usr) {
        if (usr.themePreference && themeSyncedUserRef.current !== usr.id) {
          themeSyncedUserRef.current = usr.id;
          setTheme(usr.themePreference);
        }
        const mRes = await apiFetch<{
          paymentRequests: PaymentProofRequest[];
          entitlements: UserEntitlement[];
        }>('/api/monetization/my');
        if (mRes.ok && mRes.data) {
          setMyPaymentRequests(mRes.data.paymentRequests || []);
          setMyEntitlements(mRes.data.entitlements || []);
        }
      } else {
        themeSyncedUserRef.current = null;
        setSessions([]);
        setMyPaymentRequests([]);
        setMyEntitlements([]);
      }
    }
  }, [apiFetch]);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshAppState();
      if (active) setIsLoadingAuth(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshAppState]);

  const addSearchHistory = useCallback((q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, 6);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  const currentUser = state.currentUser;

  const computedWarranties = useMemo(
    () =>
      state.warranties.map((w) => ({
        ...w,
        status: computeWarrantyStatus(w.endDate, w.status),
      })),
    [state.warranties]
  );

  const myDevices = useMemo(
    () =>
      currentUser
        ? state.devices.filter((d) => d.ownerId === currentUser.id && d.status !== 'archived')
        : [],
    [state.devices, currentUser]
  );

  const allNotifications = useMemo(() => {
    const map = new Map<string, NotificationItem>();
    for (const n of state.notifications) map.set(n.id, n);
    for (const n of localSmartAlerts) {
      if (!map.has(n.id)) map.set(n.id, n);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [state.notifications, localSmartAlerts]);

  const unreadNotificationsCount = useMemo(
    () =>
      currentUser
        ? allNotifications.filter((n) => n.userId === currentUser.id && !n.isRead).length
        : 0,
    [allNotifications, currentUser]
  );

  const runSmartReminderSweep = useCallback((): number => {
    if (!currentUser) return 0;
    const generated = evaluateSmartNotifications({
      userId: currentUser.id,
      devices: state.devices,
      warranties: computedWarranties,
      repairs: state.repairRecords,
      maintenanceReminders: state.maintenanceReminders,
      existingNotifications: allNotifications,
      prefs: state.notificationPrefs,
      isDemo: false,
    });
    if (generated.length === 0) return 0;
    setLocalSmartAlerts((prev) => [...generated, ...prev]);
    if (state.notificationPrefs.browserPushEnabled) {
      const top = generated[0];
      sendBrowserPushNotification(top.title, top.body);
    }
    return generated.length;
  }, [
    currentUser,
    state.devices,
    computedWarranties,
    state.repairRecords,
    state.maintenanceReminders,
    allNotifications,
    state.notificationPrefs,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    runSmartReminderSweep();
  }, [
    currentUser?.id,
    computedWarranties.length,
    state.maintenanceReminders.length,
    state.repairRecords.length,
  ]);

  // --- Auth Actions ---

  const login = useCallback(
    async (email: string, password: string, rememberMe = true): Promise<ActionResult> => {
      if (!checkClientRateLimit('login', 10, 60_000)) {
        return { ok: false, error: 'محاولات متكررة سريعة، يرجى الانتظار دقيقة واحدة.' };
      }
      const res = await apiFetch<{ ok: boolean; user?: UserProfile; token?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, rememberMe }),
        }
      );
      if (!res.ok || !res.data?.token) {
        return { ok: false, error: res.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      }
      sessionTokenRef.current = res.data.token;
      themeSyncedUserRef.current = null;
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const register = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      password: string;
      role: 'user' | 'technician' | 'store';
      city: string;
      rememberMe?: boolean;
    }): Promise<ActionResult> => {
      if (!checkClientRateLimit('register', 8, 60_000)) {
        return { ok: false, error: 'محاولات تسجيل متكررة، انتظر دقيقة.' };
      }
      const res = await apiFetch<{ ok: boolean; user?: UserProfile; token?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, rememberMe: payload.rememberMe !== false }),
        }
      );
      if (!res.ok || !res.data?.token) {
        return { ok: false, error: res.error || 'تعذر إنشاء الحساب.' };
      }
      sessionTokenRef.current = res.data.token;
      themeSyncedUserRef.current = null;
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const fetchSessions = useCallback(async (): Promise<void> => {
    const res = await apiFetch<{ sessions: SessionInfo[] }>('/api/auth/sessions');
    if (res.ok && res.data?.sessions) {
      setSessions(res.data.sessions);
    }
  }, [apiFetch]);

  const revokeSessionByPrefix = useCallback(
    async (prefix: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/auth/sessions/${encodeURIComponent(prefix)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return { ok: false, error: res.error };
      await fetchSessions();
      return { ok: true };
    },
    [apiFetch, fetchSessions]
  );

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    sessionTokenRef.current = '';
    themeSyncedUserRef.current = null;
    setSessions([]);
    setLocalSmartAlerts([]);
    await refreshAppState();
  }, [apiFetch, refreshAppState]);

  const logoutAllDevices = useCallback(async () => {
    await apiFetch('/api/auth/logout-all', { method: 'POST' });
    sessionTokenRef.current = '';
    themeSyncedUserRef.current = null;
    setSessions([]);
    setLocalSmartAlerts([]);
    await refreshAppState();
  }, [apiFetch, refreshAppState]);

  const resetPassword = useCallback(
    async (email: string): Promise<ActionResult> => {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true };
    },
    [apiFetch]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<ActionResult> => {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true };
    },
    [apiFetch]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<ActionResult> => {
      const res = await apiFetch('/api/app/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const deleteMyAccount = useCallback(async (): Promise<ActionResult> => {
    const res = await apiFetch('/api/app/account', { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: res.error };
    sessionTokenRef.current = '';
    setLocalSmartAlerts([]);
    await refreshAppState();
    return { ok: true };
  }, [apiFetch, refreshAppState]);

  const lookupDeviceIdentifier = useCallback(
    async (query: string): Promise<DeviceLookupResult> => {
      const res = await apiFetch<DeviceLookupResult>(
        `/api/app/lookup-device?q=${encodeURIComponent(query)}`
      );
      if (!res.ok || !res.data) return { found: false };
      return res.data;
    },
    [apiFetch]
  );

  // --- Devices & Lifecycle ---

  const addDevice = useCallback(
    async (payload: NewDevicePayload): Promise<ActionResult<DeviceRecord>> => {
      const res = await apiFetch<{ ok: boolean; data?: DeviceRecord; error?: string }>(
        '/api/app/devices',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok || !res.data?.data) {
        return { ok: false, error: res.error || 'تعذر تسجيل الجهاز.' };
      }
      await refreshAppState();
      return { ok: true, data: res.data.data };
    },
    [apiFetch, refreshAppState]
  );

  const updateDeviceVisibility = useCallback(
    async (deviceId: string, visibility: DevicePublicVisibility): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify(visibility),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const rotateDeviceToken = useCallback(
    async (deviceId: string): Promise<ActionResult<{ publicToken: string }>> => {
      const res = await apiFetch<{ ok: boolean; publicToken?: string }>(
        `/api/app/devices/${encodeURIComponent(deviceId)}/rotate-token`,
        { method: 'POST' }
      );
      if (!res.ok || !res.data?.publicToken) {
        return { ok: false, error: res.error || 'تعذر تجديد رابط QR.' };
      }
      await refreshAppState();
      return { ok: true, data: { publicToken: res.data.publicToken } };
    },
    [apiFetch, refreshAppState]
  );

  const createDeviceInspection = useCallback(
    async (payload: {
      deviceId: string;
      items: Record<InspectionItemKey, InspectionItemStatus>;
      inspectorNotes?: string;
    }): Promise<ActionResult<DeviceInspection>> => {
      const res = await apiFetch<{ ok: boolean; data?: DeviceInspection }>('/api/app/inspections', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.data?.data) {
        return { ok: false, error: res.error || 'تعذر حفظ تقرير الفحص.' };
      }
      await refreshAppState();
      return { ok: true, data: res.data.data };
    },
    [apiFetch, refreshAppState]
  );

  const updateDeviceCondition = useCallback(
    async (deviceId: string, condition: DeviceCondition): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/condition`, {
        method: 'PATCH',
        body: JSON.stringify({ condition }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const updateDevicePrivateData = useCallback(
    async (
      deviceId: string,
      updates: {
        serialNumber?: string;
        imei?: string;
        sellerName?: string;
        invoiceName?: string;
        privateNotes?: string;
      }
    ): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/private-data`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const reportDeviceLostOrStolen = useCallback(
    async (deviceId: string, note: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/lost`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const clearDeviceLostOrStolen = useCallback(
    async (deviceId: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/lost`, {
        method: 'DELETE',
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const recordPublicProfileScan = useCallback(
    async (deviceId: string): Promise<void> => {
      await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/scan`, {
        method: 'POST',
      });
    },
    [apiFetch]
  );

  const deleteOrArchiveDevice = useCallback(
    async (deviceId: string, mode: 'archive' | 'delete'): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/devices/${encodeURIComponent(deviceId)}?mode=${encodeURIComponent(mode)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const addDeviceEvent = useCallback(
    async (deviceId: string, eventType: EventType, description: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/devices/${encodeURIComponent(deviceId)}/events`, {
        method: 'POST',
        body: JSON.stringify({ eventType, description }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Repairs & Warranties ---

  const createRepairRequest = useCallback(
    async (payload: {
      deviceId: string;
      technicianId: string;
      issueType: string;
      faultDescription: string;
      attachments?: string[];
    }): Promise<ActionResult<RepairRequest>> => {
      const res = await apiFetch<{ ok: boolean; data?: RepairRequest }>('/api/app/repair-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const updateRepairRequestStatus = useCallback(
    async (requestId: string, status: RepairStatus): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/repair-requests/${encodeURIComponent(requestId)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const createRepairRecord = useCallback(
    async (payload: NewRepairRecordPayload): Promise<ActionResult<RepairRecord>> => {
      const res = await apiFetch<{ ok: boolean; data?: RepairRecord }>('/api/app/repair-records', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const approveRepairRecord = useCallback(
    async (recordId: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/repair-records/${encodeURIComponent(recordId)}/approve`,
        { method: 'POST' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const rejectRepairRecord = useCallback(
    async (recordId: string, reason: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/repair-records/${encodeURIComponent(recordId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const createRepairCorrectionRecord = useCallback(
    async (
      originalRecordId: string,
      correctionReason: string,
      updates: Partial<NewRepairRecordPayload>
    ): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/repair-records/${encodeURIComponent(originalRecordId)}/correction`,
        {
          method: 'POST',
          body: JSON.stringify({ correctionReason, updates }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const addWarranty = useCallback(
    async (payload: {
      deviceId: string;
      itemOrPartName: string;
      issuerName: string;
      startDate: string;
      endDate: string;
      warrantyNumber?: string;
      terms?: string;
      documentName?: string;
    }): Promise<ActionResult<WarrantyRecord>> => {
      const res = await apiFetch<{ ok: boolean; data?: WarrantyRecord }>('/api/app/warranties', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const cancelWarranty = useCallback(
    async (warrantyId: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/warranties/${encodeURIComponent(warrantyId)}/cancel`, {
        method: 'PATCH',
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Marketplace, Chat & Ownership Transfers ---

  const createListing = useCallback(
    async (payload: {
      deviceId: string;
      title: string;
      price: number;
      city: string;
      condition: DeviceCondition;
      description: string;
      images: string[];
      storeWarrantyDays: number;
    }): Promise<ActionResult<MarketplaceListing>> => {
      const res = await apiFetch<{ ok: boolean; data?: MarketplaceListing }>('/api/app/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const updateListingStatus = useCallback(
    async (listingId: string, status: MarketplaceListing['status']): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/listings/${encodeURIComponent(listingId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const startOrGetConversation = useCallback(
    async (
      otherUserId: string,
      otherUserName: string,
      listingId?: string,
      listingTitle?: string
    ): Promise<Conversation | null> => {
      const res = await apiFetch<{ conversation?: Conversation }>('/api/app/conversations', {
        method: 'POST',
        body: JSON.stringify({ otherUserId, otherUserName, listingId, listingTitle }),
      });
      if (!res.ok || !res.data?.conversation) return null;
      await refreshAppState();
      return res.data.conversation;
    },
    [apiFetch, refreshAppState]
  );

  const sendMessage = useCallback(
    async (conversationId: string, body: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const initiateTransfer = useCallback(
    async (deviceId: string): Promise<ActionResult<OwnershipTransfer>> => {
      const res = await apiFetch<{ ok: boolean; data?: OwnershipTransfer }>('/api/app/transfers', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const buyerAcceptTransfer = useCallback(
    async (transferCode: string): Promise<ActionResult<OwnershipTransfer>> => {
      const res = await apiFetch<{ ok: boolean; data?: OwnershipTransfer }>(
        '/api/app/transfers/accept',
        {
          method: 'POST',
          body: JSON.stringify({ transferCode }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const ownerConfirmTransfer = useCallback(
    async (transferId: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/transfers/${encodeURIComponent(transferId)}/confirm`,
        { method: 'POST' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const cancelOrDisputeTransfer = useCallback(
    async (
      transferId: string,
      mode: 'cancel' | 'dispute',
      reason?: string
    ): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/transfers/${encodeURIComponent(transferId)}/cancel-or-dispute`,
        {
          method: 'POST',
          body: JSON.stringify({ mode, reason }),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Technicians & Reviews ---

  const submitTechnicianReview = useCallback(
    async (payload: {
      technicianId: string;
      repairRecordId: string;
      rating: number;
      comment: string;
    }): Promise<ActionResult> => {
      const res = await apiFetch('/api/app/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const reportReview = useCallback(
    async (reviewId: string): Promise<void> => {
      await apiFetch(`/api/app/reviews/${encodeURIComponent(reviewId)}/report`, {
        method: 'POST',
      });
      await refreshAppState();
    },
    [apiFetch, refreshAppState]
  );

  const updateTechnicianProfile = useCallback(
    async (updates: Partial<TechnicianProfile>): Promise<ActionResult> => {
      const res = await apiFetch('/api/app/technician-profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Notifications, Smart Maintenance & Trust Reports ---

  const markNotificationRead = useCallback(
    async (id: string): Promise<void> => {
      setLocalSmartAlerts((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await apiFetch(`/api/app/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      await refreshAppState();
    },
    [apiFetch, refreshAppState]
  );

  const markAllNotificationsRead = useCallback(async (): Promise<void> => {
    setLocalSmartAlerts((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await apiFetch('/api/app/notifications/read-all', { method: 'POST' });
    await refreshAppState();
  }, [apiFetch, refreshAppState]);

  const clearNotifications = useCallback(async (): Promise<void> => {
    setLocalSmartAlerts([]);
    await apiFetch('/api/app/notifications', { method: 'DELETE' });
    await refreshAppState();
  }, [apiFetch, refreshAppState]);

  const updateNotificationPrefs = useCallback(
    async (prefs: NotificationPreferences): Promise<void> => {
      await apiFetch('/api/app/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      await refreshAppState();
    },
    [apiFetch, refreshAppState]
  );

  const addMaintenanceReminder = useCallback(
    async (payload: {
      deviceId: string;
      title: string;
      category: MaintenanceCategory;
      intervalDays: number;
      nextDueDate?: string;
      notes?: string;
    }): Promise<ActionResult<MaintenanceReminder>> => {
      const res = await apiFetch<{ ok: boolean; data?: MaintenanceReminder }>(
        '/api/app/maintenance',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const completeMaintenanceReminder = useCallback(
    async (reminderId: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/maintenance/${encodeURIComponent(reminderId)}/complete`,
        { method: 'POST' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const deleteMaintenanceReminder = useCallback(
    async (reminderId: string): Promise<void> => {
      await apiFetch(`/api/app/maintenance/${encodeURIComponent(reminderId)}`, {
        method: 'DELETE',
      });
      await refreshAppState();
    },
    [apiFetch, refreshAppState]
  );

  const submitReport = useCallback(
    async (payload: {
      targetType: ReportItem['targetType'];
      targetId: string;
      targetLabel: string;
      reason: ReportReason;
      description: string;
    }): Promise<ActionResult> => {
      const res = await apiFetch('/api/app/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Admin ---

  const adminUpdateUserStatus = useCallback(
    async (userId: string, status: 'active' | 'suspended'): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const adminUpdateUserRole = useCallback(
    async (userId: string, role: UserRole): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const adminToggleTechVerification = useCallback(
    async (techId: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/admin/technicians/${encodeURIComponent(techId)}/toggle-verify`,
        { method: 'POST' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const adminUpdateReportStatus = useCallback(
    async (reportId: string, status: ReportStatus): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/admin/reports/${encodeURIComponent(reportId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const adminUpdatePlatformSettings = useCallback(
    async (settings: PlatformSettingsState): Promise<ActionResult> => {
      const res = await apiFetch('/api/app/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- V3 ---

  const addSparePartObservation = useCallback(
    async (payload: {
      category: DeviceCategorySlug;
      brand: string;
      deviceModelPattern: string;
      partName: string;
      partCategory: SparePartCategory;
      origin: SparePartOrigin;
      priceEgp: number;
      warrantyDays: number;
    }): Promise<ActionResult<SparePartStat>> => {
      const res = await apiFetch<{ ok: boolean; data?: SparePartStat }>('/api/app/v3/spare-parts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const registerB2BPartner = useCallback(
    async (payload: {
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
    }): Promise<ActionResult<B2BPartner>> => {
      const res = await apiFetch<{ ok: boolean; data?: B2BPartner }>('/api/app/v3/partners', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.data };
    },
    [apiFetch, refreshAppState]
  );

  const adminToggleB2BPartnerStatus = useCallback(
    async (partnerId: string): Promise<ActionResult> => {
      const res = await apiFetch(`/api/app/admin/b2b/${encodeURIComponent(partnerId)}/toggle`, {
        method: 'POST',
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  // --- Paid Subscriptions & Optional Pro Services ---

  const subscribeToPlan = useCallback(
    async (payload: {
      planId: string;
      billingCycle: 'monthly' | 'yearly';
      paymentMethod: PaymentMethodOption;
      paymentReference?: string;
    }): Promise<ActionResult<UserSubscription>> => {
      const res = await apiFetch<{ ok: boolean; subscription?: UserSubscription }>(
        '/api/app/subscriptions/subscribe',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.subscription };
    },
    [apiFetch, refreshAppState]
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string): Promise<ActionResult> => {
      const res = await apiFetch(
        `/api/app/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        { method: 'POST' }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true };
    },
    [apiFetch, refreshAppState]
  );

  const purchasePaidService = useCallback(
    async (payload: {
      serviceCode: PaidServiceCode;
      listingId?: string;
      paymentMethod: PaymentMethodOption;
      paymentReference?: string;
    }): Promise<ActionResult<PaidServiceOrder>> => {
      const res = await apiFetch<{ ok: boolean; order?: PaidServiceOrder }>(
        '/api/app/services/purchase',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return { ok: false, error: res.error };
      await refreshAppState();
      return { ok: true, data: res.data?.order };
    },
    [apiFetch, refreshAppState]
  );

  const value: AppContextValue = {
    isLoadingAuth,
    theme,
    toggleTheme,
    setThemeMode,
    currentUser,
    users: state.users,
    devices: state.devices,
    myDevices,
    events: state.events,
    repairRequests: state.repairRequests,
    repairRecords: state.repairRecords,
    warranties: computedWarranties,
    technicians: state.technicians,
    reviews: state.reviews,
    listings: state.listings,
    transfers: state.transfers,
    conversations: state.conversations,
    messages: state.messages,
    notifications: allNotifications,
    unreadNotificationsCount,
    maintenanceReminders: state.maintenanceReminders,
    reports: state.reports,
    auditLogs: state.auditLogs,
    sparePartStats: state.sparePartStats,
    b2bPartners: state.b2bPartners,
    notificationPrefs: state.notificationPrefs,
    platformSettings: state.platformSettings,
    subscriptions: state.subscriptions,
    serviceOrders: state.serviceOrders,
    paidServicesCatalog: state.paidServicesCatalog,
    inspections: state.inspections,
    myEntitlements,
    myPaymentRequests,
    sessions,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    apiFetch,
    refreshAppState,
    refreshMonetization,
    lookupDeviceIdentifier,
    login,
    register,
    logout,
    logoutAllDevices,
    fetchSessions,
    revokeSessionByPrefix,
    resetPassword,
    changePassword,
    updateProfile,
    deleteMyAccount,
    addDevice,
    updateDeviceVisibility,
    rotateDeviceToken,
    createDeviceInspection,
    updateDeviceCondition,
    updateDevicePrivateData,
    reportDeviceLostOrStolen,
    clearDeviceLostOrStolen,
    recordPublicProfileScan,
    deleteOrArchiveDevice,
    addDeviceEvent,
    createRepairRequest,
    updateRepairRequestStatus,
    createRepairRecord,
    approveRepairRecord,
    rejectRepairRecord,
    createRepairCorrectionRecord,
    addWarranty,
    cancelWarranty,
    createListing,
    updateListingStatus,
    startOrGetConversation,
    sendMessage,
    initiateTransfer,
    buyerAcceptTransfer,
    ownerConfirmTransfer,
    cancelOrDisputeTransfer,
    submitTechnicianReview,
    reportReview,
    updateTechnicianProfile,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    updateNotificationPrefs,
    addMaintenanceReminder,
    completeMaintenanceReminder,
    deleteMaintenanceReminder,
    runSmartReminderSweep,
    submitReport,
    adminUpdateUserStatus,
    adminUpdateUserRole,
    adminToggleTechVerification,
    adminUpdateReportStatus,
    adminUpdatePlatformSettings,
    addSparePartObservation,
    registerB2BPartner,
    adminToggleB2BPartnerStatus,
    subscribeToPlan,
    cancelSubscription,
    purchasePaidService,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}

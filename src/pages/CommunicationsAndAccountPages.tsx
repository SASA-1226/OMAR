import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CalendarClock,
  Camera,
  CheckCheck,
  CheckCircle2,
  Crown,
  Database,
  KeyRound,
  Laptop,
  LogOut,
  MessageSquare,
  Moon,
  RefreshCw,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import { useApp } from '../context/AppContext';
import { EGYPT_CITIES, ROLE_LABELS, formatArabicDate, formatArabicDateTime, getDaysRemaining } from '../lib/labels';
import { validateUploadFile } from '../lib/validation';
import type { NotificationItem } from '../types/omor';

type NotifFilter = 'all' | 'maintenance' | 'warranty' | 'repairs' | 'security_other';

const NOTIF_TYPE_LABELS: Record<NotificationItem['type'], string> = {
  device_added: 'هوية جهاز',
  repair_logged: 'صيانة',
  repair_awaiting_approval: 'بانتظار الموافقة',
  repair_approved: 'صيانة معتمدة',
  warranty_added: 'ضمان جديد',
  warranty_expiring: 'تنبيه ضمان',
  warranty_expired: 'انتهاء ضمان',
  maintenance_reminder: 'صيانة دورية',
  transfer_request: 'نقل ملكية',
  transfer_completed: 'تم النقل',
  new_message: 'رسالة',
  listing_updated: 'السوق',
  security_alert: 'أمان',
};

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    myDevices,
    warranties,
    maintenanceReminders,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    notificationPrefs,
    updateNotificationPrefs,
    runSmartReminderSweep,
  } = useApp();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<NotifFilter>('all');
  const [sweepFeedback, setSweepFeedback] = useState('');
  const [pushStatus, setPushStatus] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'maintenance') return n.type === 'maintenance_reminder';
      if (filter === 'warranty')
        return n.type === 'warranty_expiring' || n.type === 'warranty_expired' || n.type === 'warranty_added';
      if (filter === 'repairs')
        return n.type === 'repair_logged' || n.type === 'repair_awaiting_approval' || n.type === 'repair_approved';
      return (
        n.type === 'security_alert' ||
        n.type === 'transfer_request' ||
        n.type === 'transfer_completed' ||
        n.type === 'new_message' ||
        n.type === 'device_added' ||
        n.type === 'listing_updated'
      );
    });
  }, [notifications, filter]);

  const upcomingSchedulesCount = useMemo(() => {
    return maintenanceReminders.filter((r) => {
      const rem = getDaysRemaining(r.nextDueDate);
      return rem !== null && rem <= 14;
    }).length;
  }, [maintenanceReminders]);

  const expiringWarrantiesCount = useMemo(() => {
    const myIds = new Set(myDevices.map((d) => d.id));
    return warranties.filter((w) => myIds.has(w.deviceId) && w.status === 'expiring_soon').length;
  }, [warranties, myDevices]);

  const handleManualSweep = () => {
    const created = runSmartReminderSweep();
    if (created > 0) {
      setSweepFeedback(`تم فحص ${myDevices.length} جهاز والضمانات المسجلة — تمت إضافة ${created} تنبيه جديد.`);
    } else {
      setSweepFeedback(`تم فحص ${myDevices.length} جهاز وضماناتك — جميع التنبيهات محدثة ولا توجد تذكيرات مكررة.`);
    }
  };

  const handleEnableBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPushStatus(perm);
      updateNotificationPrefs({
        ...notificationPrefs,
        browserPushEnabled: perm === 'granted',
      });
      if (perm === 'granted') {
        new Notification('SASA STORE | OMOR', {
          body: 'تم تفعيل إشعارات المتصفح الذكية لتنبيهات الصيانة الدورية وانتهاء الضمانات.',
          dir: 'rtl',
          lang: 'ar',
        });
      }
    } catch {
      setPushStatus('denied');
    }
  };

  return (
    <AppShell title="مركز الإشعارات الذكية">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Smart Radar Summary Banner */}
        <section className="rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-l from-[#D4AF37]/10 via-white to-white dark:from-[#D4AF37]/10 dark:via-[#141923] dark:to-[#141923] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
                <Sparkles className="w-4 h-4" />
                <span>محرك التذكيرات الذكي لصيانة الأجهزة والضمانات</span>
              </div>
              <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                يراقب تواريخ انتهاء الضمانات وجداول الصيانة الدورية لأجهزتك وينبّهك تلقائيًا قبل الموعد بـ{' '}
                {notificationPrefs.warrantyAlertDays || 30} يومًا دون إزعاج أو تكرار.
              </p>
            </div>
            <button
              type="button"
              onClick={handleManualSweep}
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              فحص التذكيرات الآن
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/80 dark:bg-[#0B1220] border border-[#DCE0E7] dark:border-[#252C38] p-3">
              <span className="text-[#687182] dark:text-[#8E97A8] block">جداول الصيانة النشطة</span>
              <span className="mt-1 text-base font-bold tabular-nums text-[#11161F] dark:text-[#F3F5F8] block">
                {maintenanceReminders.length}
              </span>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-[#0B1220] border border-[#DCE0E7] dark:border-[#252C38] p-3">
              <span className="text-[#687182] dark:text-[#8E97A8] block">صيانات مستحقة قريبًا</span>
              <span className="mt-1 text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 block">
                {upcomingSchedulesCount}
              </span>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-[#0B1220] border border-[#DCE0E7] dark:border-[#252C38] p-3">
              <span className="text-[#687182] dark:text-[#8E97A8] block">ضمانات تقترب من الانتهاء</span>
              <span className="mt-1 text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 block">
                {expiringWarrantiesCount}
              </span>
            </div>
          </div>

          {sweepFeedback && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              {sweepFeedback}
            </div>
          )}
        </section>

        {/* Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
            الإشعارات ({filteredNotifications.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3 text-xs font-medium hover:border-[#D4AF37]"
            >
              <CheckCheck className="w-4 h-4 text-[#D4AF37]" />
              تحديد الكل كمقروء
            </button>
            <button
              type="button"
              onClick={clearNotifications}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 text-rose-500 px-3 text-xs font-medium hover:bg-rose-500/10"
            >
              <Trash2 className="w-4 h-4" />
              مسح الكل
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'الكل'],
              ['maintenance', 'الصيانة الدورية'],
              ['warranty', 'الضمانات'],
              ['repairs', 'موافقات الإصلاح'],
              ['security_other', 'الأمان والرسائل'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-[#D4AF37] text-[#0B1220] font-bold'
                  : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8] hover:border-[#D4AF37]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] divide-y divide-[#E8EBF0] dark:divide-[#222834]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#687182] dark:text-[#8E97A8]">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
              لا توجد إشعارات ضمن هذا التصنيف حاليًا.
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id);
                  if (n.linkPath) navigate(n.linkPath);
                }}
                className={`p-4 cursor-pointer transition-colors hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/50 ${
                  !n.isRead ? 'bg-[#D4AF37]/5' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-[#EEF0F4] dark:bg-[#1F2633] text-[#363E4D] dark:text-[#DCE1EA] shrink-0">
                      {n.type === 'maintenance_reminder' ? (
                        <CalendarClock className="w-3 h-3 text-[#D4AF37]" />
                      ) : n.type === 'warranty_expiring' || n.type === 'warranty_expired' ? (
                        <ShieldCheck className="w-3 h-3 text-amber-500" />
                      ) : n.type === 'security_alert' ? (
                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                      ) : (
                        <Wrench className="w-3 h-3 text-[#D4AF37]" />
                      )}
                      {NOTIF_TYPE_LABELS[n.type]}
                    </span>
                    <span className="font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
                      {n.title}{' '}
                      {!n.isRead && (
                        <span className="text-[#8F6D14] dark:text-[#D4AF37]">· جديد</span>
                      )}
                    </span>
                  </div>
                  <span className="tabular-nums text-[#7A8394] shrink-0">
                    {formatArabicDateTime(n.createdAt)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-end justify-between gap-3">
                  <p className="text-xs text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                    {n.body}
                  </p>
                  {n.linkPath && (
                    <span className="text-[11px] font-bold text-[#8F6D14] dark:text-[#D4AF37] shrink-0">
                      فتح ←
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Periodic Schedules Quick Overview */}
        {maintenanceReminders.length > 0 && (
          <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#D4AF37]" />
                <span>جدول الصيانات الدورية المسجلة لأجهزتك</span>
              </h3>
              <Link to="/devices" className="text-xs font-semibold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                إدارة من صفحة الجهاز
              </Link>
            </div>
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
              {maintenanceReminders.map((r) => {
                const dev = myDevices.find((d) => d.id === r.deviceId);
                const remDays = getDaysRemaining(r.nextDueDate);
                return (
                  <Link
                    key={r.id}
                    to={`/devices/${r.deviceId}`}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/40 px-2 rounded-xl transition-colors text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">{r.title}</div>
                      <div className="text-[#687182] dark:text-[#8E97A8] truncate">
                        {dev ? `${dev.brand} ${dev.deviceName}` : 'جهاز مسجل'} · كل {r.intervalDays} يوم
                      </div>
                    </div>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        remDays !== null && remDays < 0
                          ? 'text-rose-500'
                          : remDays !== null && remDays <= 7
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {remDays === null
                        ? formatArabicDate(r.nextDueDate)
                        : remDays < 0
                          ? `متأخر ${Math.abs(remDays)} يوم`
                          : remDays === 0
                            ? 'مستحق اليوم'
                            : `بعد ${remDays} يوم`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Smart Notification Preferences */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
            إعدادات التذكيرات الذكية والإشعارات
          </h3>

          <div className="space-y-2">
            {(
              [
                ['maintenanceReminders', 'تذكيرات الصيانة الدورية الذكية والفحص الوقائي'],
                ['warranties', 'تنبيهات الضمانات واقتراب انتهائها'],
                ['repairs', 'تنبيهات طلبات وموافقات الصيانة'],
                ['transfers', 'تنبيهات نقل الملكية'],
                ['messages', 'تنبيهات الرسائل والاستفسارات'],
                ['security', 'التنبيهات الأمنية والبلاغات'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between text-xs py-1.5 cursor-pointer">
                <span className="text-[#363E4D] dark:text-[#DCE1EA]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[k])}
                  onChange={(e) =>
                    updateNotificationPrefs({ ...notificationPrefs, [k]: e.target.checked })
                  }
                  className="accent-[#D4AF37] w-4 h-4"
                />
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-[#1E2430] dark:text-[#DCE1EA]">
                مهلة التنبيه المسبق قبل انتهاء الضمان
              </div>
              <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                ينبّهك النظام تلقائيًا عندما يتبقى هذا العدد من الأيام أو أقل على انتهاء الضمان
              </div>
            </div>
            <select
              value={notificationPrefs.warrantyAlertDays || 30}
              onChange={(e) =>
                updateNotificationPrefs({
                  ...notificationPrefs,
                  warrantyAlertDays: Number(e.target.value),
                })
              }
              className="min-h-[38px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs font-semibold"
            >
              <option value={7}>قبل 7 أيام</option>
              <option value={15}>قبل 15 يومًا</option>
              <option value={30}>قبل 30 يومًا (موصى به)</option>
              <option value={60}>قبل 60 يومًا</option>
            </select>
          </div>

          <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-[#1E2430] dark:text-[#DCE1EA] flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-[#D4AF37]" />
                <span>إشعارات المتصفح والهاتف (Web Notifications — مجاني)</span>
              </div>
              <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                {pushStatus === 'unsupported'
                  ? 'المتصفح الحالي لا يدعم إشعارات سطح المكتب.'
                  : pushStatus === 'denied'
                    ? 'تم حظر الإشعارات من إعدادات المتصفح — يمكنك تفعيلها من رمز القفل في شريط العنوان.'
                    : notificationPrefs.browserPushEnabled && pushStatus === 'granted'
                      ? 'مفعّلة: ستصلك تنبيهات فورية على الهاتف/المتصفح عند استحقاق الصيانة أو قرب انتهاء الضمان.'
                      : 'فعّل إذن المتصفح لاستلام تنبيهات الصيانة والضمان مباشرة على جهازك دون الحاجة لخدمة مدفوعة.'}
              </div>
            </div>
            {pushStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={() => {
                  if (pushStatus === 'granted') {
                    updateNotificationPrefs({
                      ...notificationPrefs,
                      browserPushEnabled: !notificationPrefs.browserPushEnabled,
                    });
                  } else {
                    handleEnableBrowserPush();
                  }
                }}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold shrink-0 ${
                  notificationPrefs.browserPushEnabled && pushStatus === 'granted'
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] hover:border-[#D4AF37]'
                }`}
              >
                {pushStatus === 'granted'
                  ? notificationPrefs.browserPushEnabled
                    ? 'إشعارات المتصفح مفعّلة ✓'
                    : 'تفعيل إرسال تنبيهات المتصفح'
                  : 'السماح بإشعارات المتصفح'}
              </button>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export const MessagesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser, conversations, messages, sendMessage } = useApp();

  const myConvs = useMemo(
    () =>
      currentUser
        ? conversations.filter(
            (c) => c.participantA === currentUser.id || c.participantB === currentUser.id
          )
        : [],
    [conversations, currentUser]
  );

  const [activeConvId, setActiveConvId] = useState(
    searchParams.get('conv') || myConvs[0]?.id || ''
  );
  const [body, setBody] = useState('');

  const activeConv = myConvs.find((c) => c.id === activeConvId) || myConvs[0];
  const convMessages = useMemo(
    () => (activeConv ? messages.filter((m) => m.conversationId === activeConv.id) : []),
    [activeConv, messages]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !body.trim()) return;
    const res = await sendMessage(activeConv.id, body);
    if (res.ok) setBody('');
  };

  return (
    <AppShell title="الرسائل والاستفسارات">
      <div className="grid md:grid-cols-12 gap-5 min-h-[520px]">
        <aside className="md:col-span-4 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden">
          <div className="p-4 border-b border-[#E8EBF0] dark:border-[#222834] text-sm font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
            <span>المحادثات ({myConvs.length})</span>
          </div>
          {myConvs.length === 0 ? (
            <div className="p-6 text-xs text-[#687182] dark:text-[#8E97A8]">
              لا توجد محادثات بعد. يمكنك مراسلة البائعين من صفحة إعلان الجهاز في السوق.
            </div>
          ) : (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
              {myConvs.map((c) => {
                const otherName =
                  c.participantA === currentUser?.id ? c.participantBName : c.participantAName;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full p-4 text-right transition-colors ${
                      activeConv?.id === c.id
                        ? 'bg-[#D4AF37]/10'
                        : 'hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/50'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
                      {otherName}
                    </div>
                    <div className="text-xs text-[#687182] dark:text-[#8E97A8] truncate mt-0.5">
                      {c.listingTitle || 'استفسار مباشر'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="md:col-span-8 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] flex flex-col">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#687182] dark:text-[#8E97A8]">
              اختر محادثة لعرض الرسائل.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#E8EBF0] dark:border-[#222834]">
                <div className="text-sm font-bold">
                  {activeConv.participantA === currentUser?.id
                    ? activeConv.participantBName
                    : activeConv.participantAName}
                </div>
                {activeConv.listingTitle && (
                  <div className="text-xs text-[#687182] dark:text-[#8E97A8]">بخصوص: {activeConv.listingTitle}</div>
                )}
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                {convMessages.map((m) => {
                  const mine = m.senderId === currentUser?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          mine
                            ? 'bg-[#D4AF37] text-[#0B1220] font-medium'
                            : 'bg-[#EEF0F4] dark:bg-[#1F2633] text-[#1E2430] dark:text-[#DCE1EA]'
                        }`}
                      >
                        <div>{m.body}</div>
                        <div className="mt-1 text-[10px] opacity-70 tabular-nums">
                          {formatArabicDateTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-[#E8EBF0] dark:border-[#222834] flex gap-2">
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold inline-flex items-center gap-1.5 text-xs"
                >
                  <Send className="w-4 h-4" />
                  إرسال
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export const UserProfilePage: React.FC = () => {
  const {
    currentUser,
    updateProfile,
    logout,
    logoutAllDevices,
    sessions,
    fetchSessions,
    revokeSessionByPrefix,
    technicians,
    updateTechnicianProfile,
  } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [city, setCity] = useState(currentUser?.city || EGYPT_CITIES[0]);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [storeName, setStoreName] = useState(currentUser?.storeName || '');
  const [storeBio, setStoreBio] = useState(currentUser?.storeBio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [privacyHidePhone, setPrivacyHidePhone] = useState(currentUser?.privacyHidePhone ?? true);
  const [privacyHideCity, setPrivacyHideCity] = useState(currentUser?.privacyHideCity ?? false);

  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [profileErr, setProfileErr] = useState('');
  const [sessionMsg, setSessionMsg] = useState('');

  const myTech = technicians.find((t) => t.userId === currentUser?.id);
  const [centerName, setCenterName] = useState(myTech?.centerName || '');
  const [techBio, setTechBio] = useState(myTech?.bio || '');

  const hydratedUserIdRef = React.useRef<string | null>(null);
  const skipNextAutoSaveRef = React.useRef(true);

  React.useEffect(() => {
    if (!currentUser) return;
    void fetchSessions();
    if (hydratedUserIdRef.current !== currentUser.id) {
      hydratedUserIdRef.current = currentUser.id;
      skipNextAutoSaveRef.current = true;
      setFullName(currentUser.fullName || '');
      setCity(currentUser.city || EGYPT_CITIES[0]);
      setPhone(currentUser.phone || '');
      setStoreName(currentUser.storeName || '');
      setStoreBio(currentUser.storeBio || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setPrivacyHidePhone(currentUser.privacyHidePhone ?? true);
      setPrivacyHideCity(currentUser.privacyHideCity ?? false);
    }
  }, [currentUser, fetchSessions]);

  React.useEffect(() => {
    if (myTech && !centerName) {
      setCenterName(myTech.centerName || '');
      setTechBio(myTech.bio || '');
    }
  }, [myTech, centerName]);

  // Debounced auto-save to persistent SQLite database
  React.useEffect(() => {
    if (!currentUser) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const unchanged =
      fullName.trim() === (currentUser.fullName || '') &&
      city === (currentUser.city || EGYPT_CITIES[0]) &&
      phone === (currentUser.phone || '') &&
      storeName === (currentUser.storeName || '') &&
      storeBio === (currentUser.storeBio || '') &&
      avatarUrl === (currentUser.avatarUrl || '') &&
      privacyHidePhone === Boolean(currentUser.privacyHidePhone) &&
      privacyHideCity === Boolean(currentUser.privacyHideCity);

    if (unchanged || fullName.trim().length < 2) return;

    setAutoSaveState('saving');
    const timer = window.setTimeout(async () => {
      const res = await updateProfile({
        fullName: fullName.trim(),
        city,
        phone,
        storeName,
        storeBio,
        avatarUrl: avatarUrl || undefined,
        privacyHidePhone,
        privacyHideCity,
      });
      if (res.ok) {
        setAutoSaveState('saved');
        setProfileErr('');
      } else {
        setAutoSaveState('error');
        setProfileErr(res.error || 'تعذر الحفظ التلقائي');
      }
    }, 850);

    return () => window.clearTimeout(timer);
  }, [
    avatarUrl,
    city,
    currentUser,
    fullName,
    phone,
    privacyHideCity,
    privacyHidePhone,
    storeBio,
    storeName,
    updateProfile,
  ]);

  if (!currentUser) {
    return (
      <AppShell title="ملف المستخدم">
        <div className="p-8 text-center">
          <Link to="/login" className="rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#0B1220]">
            تسجيل الدخول
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, false);
    if (!check.ok) {
      setProfileErr(check.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setProfileErr('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr('');
    setAutoSaveState('saving');
    const res = await updateProfile({
      fullName: fullName.trim(),
      city,
      phone,
      storeName,
      storeBio,
      avatarUrl: avatarUrl || undefined,
      privacyHidePhone,
      privacyHideCity,
    });
    if (!res.ok) {
      setAutoSaveState('error');
      setProfileErr(res.error || 'تعذر حفظ التعديلات');
      return;
    }
    if (myTech) {
      await updateTechnicianProfile({ centerName, bio: techBio, governorate: city });
    }
    setAutoSaveState('saved');
  };

  return (
    <AppShell title="ملف المستخدم والخصوصية">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Account Overview Card */}
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={currentUser.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#D4AF37]/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                  <User className="w-7 h-7 text-[#D4AF37]" />
                </div>
              )}
              <label
                className="absolute -bottom-1.5 -left-1.5 w-7 h-7 rounded-full bg-[#D4AF37] text-[#0B1220] flex items-center justify-center cursor-pointer shadow hover:bg-[#E2C25B]"
                title="تغيير صورة الحساب"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarPick}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">{currentUser.fullName}</h2>
                {currentUser.activePlanSlug && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2 py-0.5 text-[11px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                    <Crown className="w-3 h-3" />
                    باقة فعّالة
                  </span>
                )}
              </div>
              <div className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5">
                {ROLE_LABELS[currentUser.role]} · <span dir="ltr">{currentUser.email}</span>
              </div>
              <div className="text-[11px] text-[#7A8394] mt-1 flex flex-wrap gap-3">
                <span>تاريخ التسجيل: {formatArabicDate(currentUser.createdAt)}</span>
                {currentUser.lastLoginAt && (
                  <span>آخر دخول: {formatArabicDateTime(currentUser.lastLoginAt)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(currentUser.role === 'technician' || currentUser.role === 'store') && (
              <Link
                to="/services"
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20"
              >
                <Crown className="w-4 h-4" />
                الاشتراكات والخدمات
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/welcome');
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 text-rose-500 px-3.5 text-xs font-semibold hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Profile Form with Real-time DB Auto-save */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">تعديل البيانات الشخصية</h3>
            <span className="text-[11px] font-semibold">
              {autoSaveState === 'saving' && (
                <span className="text-amber-500">جاري الحفظ التلقائي في قاعدة البيانات...</span>
              )}
              {autoSaveState === 'saved' && (
                <span className="text-emerald-500 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الحفظ تلقائيًا في قاعدة البيانات
                </span>
              )}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">الاسم</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">المدينة</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {EGYPT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">الهاتف (محمي ولا يُنشر في QR)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                placeholder="01xxxxxxxxx"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
              />
            </div>
            <div className="flex flex-col justify-end space-y-2 pb-1">
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>إخفاء رقم الهاتف في الملفات العامة</span>
                <input
                  type="checkbox"
                  checked={privacyHidePhone}
                  onChange={(e) => setPrivacyHidePhone(e.target.checked)}
                  className="accent-[#D4AF37] w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>إخفاء المدينة عند التواصل العام</span>
                <input
                  type="checkbox"
                  checked={privacyHideCity}
                  onChange={(e) => setPrivacyHideCity(e.target.checked)}
                  className="accent-[#D4AF37] w-4 h-4"
                />
              </label>
            </div>
          </div>

          {currentUser.role === 'store' && (
            <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] space-y-3">
              <div className="text-xs font-bold text-[#D4AF37]">بيانات صفحة المتجر</div>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="اسم المتجر"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <textarea
                rows={2}
                value={storeBio}
                onChange={(e) => setStoreBio(e.target.value)}
                placeholder="نبذة عن المتجر..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>
          )}

          {myTech && (
            <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] space-y-3">
              <div className="text-xs font-bold text-[#D4AF37]">بيانات مركز الصيانة</div>
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="اسم مركز الصيانة"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <textarea
                rows={2}
                value={techBio}
                onChange={(e) => setTechBio(e.target.value)}
                placeholder="وصف خدمات المركز..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>
          )}

          {profileErr && <div className="text-xs text-rose-500">{profileErr}</div>}

          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
          >
            حفظ الملف الشخصي الآن
          </button>
        </form>

        {/* Active Sessions Management Panel */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#D4AF37]" />
                <span>الجلسات النشطة والأجهزة المتصلة ({sessions.length})</span>
              </h3>
              <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5">
                جلسات تسجيل الدخول محفوظة بأمان في قاعدة البيانات عبر HttpOnly Cookies وتتجدد تلقائيًا طالما الحساب نشط.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={async () => {
                  await logoutAllDevices();
                  navigate('/login');
                }}
                className="min-h-[38px] px-3.5 rounded-xl border border-rose-500/40 text-rose-500 text-xs font-bold hover:bg-rose-500/10"
              >
                تسجيل الخروج من جميع الأجهزة
              </button>
            )}
          </div>

          {sessionMsg && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 dark:text-emerald-300">
              {sessionMsg}
            </div>
          )}

          {sessions.length === 0 ? (
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              يتم استخدام جلستك الحالية النشطة على هذا المتصفح.
            </p>
          ) : (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
              {sessions.map((s) => (
                <div key={s.sessionId} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#11161F] dark:text-[#F3F5F8] truncate max-w-md">
                        {s.userAgent || 'متصفح ويب'}
                      </span>
                      {s.isCurrent && (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                          الجهاز الحالي
                        </span>
                      )}
                      {s.rememberMe && (
                        <span className="rounded-md bg-[#D4AF37]/15 px-2 py-0.5 text-[10px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                          تذكرني (90 يومًا)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      آخر نشاط: {formatArabicDateTime(s.lastActiveAt)} · تنتهي الصلاحية: {formatArabicDate(s.expiresAt)}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await revokeSessionByPrefix(s.sessionId);
                        if (res.ok) setSessionMsg('تم إنهاء الجلسة المحددة بنجاح.');
                      }}
                      className="min-h-[34px] px-3 rounded-lg border border-rose-500/30 text-rose-500 text-xs font-semibold hover:bg-rose-500/10"
                    >
                      إنهاء الجلسة
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, setThemeMode, currentUser, changePassword } = useApp();
  const isDark = theme === 'dark';

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passBusy, setPassBusy] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr('');
    setPassMsg('');
    setPassBusy(true);
    const res = await changePassword(currPass, newPass);
    setPassBusy(false);
    if (!res.ok) {
      setPassErr(res.error || 'تعذر تغيير كلمة المرور');
      return;
    }
    setPassMsg('تم تحديث كلمة المرور وتأمين الحساب بنجاح.');
    setCurrPass('');
    setNewPass('');
  };

  return (
    <AppShell title="الإعدادات">
      <div className="max-w-3xl mx-auto space-y-6">
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-5">
          <div className="flex items-center gap-2 text-base font-bold">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            <span>المظهر وتطبيق الهاتف (PWA)</span>
          </div>

          <div className="space-y-4 pb-4 border-b border-[#E8EBF0] dark:border-[#222834]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8]">
                  الوضع الليلي (Dark Mode) والوضع النهاري (Light Mode)
                </div>
                <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5">
                  يُحفظ تفضيلك في قاعدة بيانات حسابك وفي المتصفح ليتم تطبيقه تلقائيًا على الموبايل والكمبيوتر.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label={isDark ? 'الوضع الليلي مفعل — اضغط للتبديل للوضع النهاري' : 'الوضع النهاري مفعل — اضغط للتبديل للوضع الليلي'}
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                  isDark
                    ? 'bg-[#0B1220] border-[#D4AF37]/60'
                    : 'bg-[#E2E6ED] border-[#C8CFD9]'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${
                    isDark
                      ? '-translate-x-8 bg-[#D4AF37] text-[#0B1220]'
                      : 'translate-x-0 bg-white text-amber-500'
                  }`}
                >
                  {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  isDark
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'
                    : 'border-[#D5DBE5] dark:border-[#333C4B] text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/70'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>الوضع الليلي (Dark)</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  !isDark
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'
                    : 'border-[#D5DBE5] dark:border-[#333C4B] text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/70'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>الوضع النهاري (Light)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span>تثبيت المنصة كتطبيق Android / iOS</span>
            <PWAInstallButton variant="full" />
          </div>
        </section>

        {/* Change Password Section */}
        {currentUser && (
          <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="w-5 h-5 text-[#D4AF37]" />
              <span>تغيير كلمة المرور</span>
            </div>
            <form onSubmit={handlePasswordChange} className="grid sm:grid-cols-2 gap-3 text-xs">
              <input
                type="password"
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                placeholder="كلمة المرور الحالية"
                dir="ltr"
                className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
                dir="ltr"
                className="min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  {passErr && <span className="text-rose-500">{passErr}</span>}
                  {passMsg && <span className="text-emerald-500">{passMsg}</span>}
                </div>
                <button
                  type="submit"
                  disabled={passBusy || !currPass || newPass.length < 8}
                  className="min-h-[42px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold hover:bg-[#E2C25B] disabled:opacity-50"
                >
                  {passBusy ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Persistent Database & Session Architecture Status */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-bold">
            <Database className="w-5 h-5 text-[#D4AF37]" />
            <span>حفظ البيانات واستمرارية الجلسة</span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            متصل بقاعدة بيانات SQLite الدائمة مع جلسات مشفّرة (HttpOnly Cookie) تدوم حتى 90 يومًا وتتجدد تلقائيًا.
          </p>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8] leading-relaxed">
            تبقى جميع بيانات أجهزتك، فحوصاتك، ضماناتك، وبياناتك الشخصية محفوظة ومربوطة بحسابك ولا تُفقد عند إغلاق المتصفح أو تحديث الصفحة. يمكنك إدارة الأجهزة المتصلة أو إنهاء أي جلسة من{' '}
            <Link to="/profile" className="text-[#8F6D14] dark:text-[#D4AF37] font-bold underline">
              ملف المستخدم
            </Link>
            .
          </p>
        </section>

        {/* Technical Support */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-3">
          <div className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            الدعم الفني المباشر
          </div>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
            للمساعدة في تسجيل الأجهزة، توثيق الحسابات، أو البلاغات: <span className="font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37]">01214899889</span> (واتساب ومكالمات)
          </p>
          <SupportContactButtons variant="card" />
        </section>

        <div className="flex flex-wrap gap-4 text-xs text-[#687182] dark:text-[#8E97A8]">
          <Link to="/platform-guide" className="hover:text-[#D4AF37] underline">عن المنصة والمطور</Link>
          <Link to="/privacy" className="hover:text-[#D4AF37] underline">الخصوصية وحذف الحساب</Link>
          <Link to="/terms" className="hover:text-[#D4AF37] underline">الشروط والأحكام</Link>
          <Link to="/help" className="hover:text-[#D4AF37] underline">مركز المساعدة</Link>
        </div>
      </div>
    </AppShell>
  );
};

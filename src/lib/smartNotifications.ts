import { generateSafeId } from '../lib/security';
import { getDaysRemaining } from './labels';
import type {
  DeviceCategorySlug,
  DeviceRecord,
  MaintenanceCategory,
  MaintenanceReminder,
  NotificationItem,
  NotificationPreferences,
  RepairRecord,
  WarrantyRecord,
} from '../types/omor';

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  cleaning: 'تنظيف عميق ومراوح/سماعات',
  battery_check: 'فحص صحة وكفاءة البطارية',
  thermal_paste: 'تغيير المعجون الحراري والتبريد',
  software_backup: 'نسخ احتياطي وتحديث أمان',
  port_check: 'فحص منفذ الشحن والكابلات',
  general_inspection: 'فحص فني شامل دوري',
};

export interface MaintenancePresetItem {
  title: string;
  category: MaintenanceCategory;
  intervalDays: number;
  notes: string;
}

export const MAINTENANCE_CATEGORY_PRESETS: Record<DeviceCategorySlug, MaintenancePresetItem[]> = {
  smartphone: [
    {
      title: 'تنظيف شبكة السماعات ومنفذ الشحن USB-C/Lightning',
      category: 'cleaning',
      intervalDays: 90,
      notes: 'إزالة الأتربة المتراكمة من المنفذ والسماعة بفرشاة ناعمة آمنة.',
    },
    {
      title: 'فحص دورة البطارية وكفاءة الشحن السريع',
      category: 'battery_check',
      intervalDays: 180,
      notes: 'متابعة نسبة صحة البطارية وتجنب انتفاخها أو ضعف الشحن.',
    },
    {
      title: 'نسخ احتياطي كامل للبيانات وتحديث النظام',
      category: 'software_backup',
      intervalDays: 60,
      notes: 'حماية الصور وسجلات العمل والتأكد من آخر التحديثات الأمنية.',
    },
  ],
  tablet: [
    {
      title: 'فحص منفذ الشحن وصحة البطارية',
      category: 'battery_check',
      intervalDays: 180,
      notes: 'مراجعة استقرار الشحن وحالة البطارية والشاشة.',
    },
    {
      title: 'تحديث النظام والنسخ الاحتياطي',
      category: 'software_backup',
      intervalDays: 90,
      notes: 'الحفاظ على أداء الجهاز وسلامة الملفات.',
    },
  ],
  laptop: [
    {
      title: 'تنظيف مراوح التبريد وفتحات التهوية من الأتربة',
      category: 'cleaning',
      intervalDays: 180,
      notes: 'يمنع ارتفاع الحرارة ويحافظ على هدوء المراوح وسرعة المعالج.',
    },
    {
      title: 'فحص واستبدال المعجون الحراري (Thermal Paste)',
      category: 'thermal_paste',
      intervalDays: 365,
      notes: 'ضروري سنويًا خاصة مع الاستخدام الثقيل والأجواء الحارة في مصر.',
    },
    {
      title: 'فحص دورات البطارية والمفصلات والكيبورد',
      category: 'general_inspection',
      intervalDays: 180,
      notes: 'تجنب إجهاد المفصلات والتأكد من سلامة الشاحن الأصلي.',
    },
  ],
  desktop: [
    {
      title: 'تنظيف الكيسة وفلاتر الغبار والمراوح',
      category: 'cleaning',
      intervalDays: 90,
      notes: 'تنظيف دوري بالهواء الجاف للحفاظ على تدفق التبريد.',
    },
    {
      title: 'فحص المعجون الحراري للمعالج وكارت الشاشة',
      category: 'thermal_paste',
      intervalDays: 365,
      notes: 'فحص درجات الحرارة تحت الضغط وتجديد المعجون عند اللزوم.',
    },
  ],
  smartwatch: [
    {
      title: 'تنظيف الحساسات الخلفية ومجسات الشحن المغناطيسي',
      category: 'cleaning',
      intervalDays: 60,
      notes: 'لضمان دقة قراءات النبض وسرعة الشحن.',
    },
    {
      title: 'فحص موانع تسرب المياه والبطارية',
      category: 'battery_check',
      intervalDays: 180,
      notes: 'التأكد من سلامة الإطار المطاطي وكفاءة الشحن.',
    },
  ],
  tv: [
    {
      title: 'تنظيف فتحات التهوية وفحص استقرار الكهرباء (Stabilizer)',
      category: 'port_check',
      intervalDays: 180,
      notes: 'التأكد من توصيلات HDMI ومنظم الجهد لحماية البوردة من تذبذب التيار.',
    },
  ],
  home_appliance: [
    {
      title: 'تنظيف الفلاتر وفحص التوصيلات الكهربائية',
      category: 'cleaning',
      intervalDays: 90,
      notes: 'صيانة وقائية تزيد عمر الجهاز وتقلل استهلاك الكهرباء.',
    },
    {
      title: 'فحص فني دوري شامل للموتور والحساسات',
      category: 'general_inspection',
      intervalDays: 365,
      notes: 'فحص وقائي قبل مواسم الذروة الصيفية أو الشتوية.',
    },
  ],
  other: [
    {
      title: 'فحص دوري عام وتنظيف المنافذ',
      category: 'general_inspection',
      intervalDays: 180,
      notes: 'متابعة الحالة الفنية العامة للجهاز وحفظ آخر قراءة.',
    },
  ],
};

export function addDaysToIsoDate(baseDateStr: string, days: number): string {
  const parsed = new Date(baseDateStr);
  const start = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sendBrowserPushNotification(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
    });
    return true;
  } catch {
    return false;
  }
}

export interface EvaluateSmartNotificationsInput {
  userId: string;
  devices: DeviceRecord[];
  warranties: WarrantyRecord[];
  repairs: RepairRecord[];
  maintenanceReminders: MaintenanceReminder[];
  existingNotifications: NotificationItem[];
  prefs: NotificationPreferences;
  isDemo: boolean;
}

export function evaluateSmartNotifications({
  userId,
  devices,
  warranties,
  repairs,
  maintenanceReminders,
  existingNotifications,
  prefs,
  isDemo,
}: EvaluateSmartNotificationsInput): NotificationItem[] {
  const existingKeys = new Set(
    existingNotifications
      .filter((n) => n.userId === userId && n.dedupeKey)
      .map((n) => n.dedupeKey as string)
  );

  const ownedDevices = devices.filter(
    (d) => d.ownerId === userId && d.status !== 'archived' && d.status !== 'transferred'
  );
  const ownedDeviceMap = new Map(ownedDevices.map((d) => [d.id, d]));
  const generated: NotificationItem[] = [];
  const nowIso = new Date().toISOString();

  // 1. Smart Warranty Expiration Checks
  if (prefs.warranties) {
    const alertWindow = Math.max(7, prefs.warrantyAlertDays || 30);

    for (const w of warranties) {
      const dev = ownedDeviceMap.get(w.deviceId);
      if (!dev) continue;
      if (w.status === 'cancelled' || w.status === 'uncertain') continue;

      const diffDays = getDaysRemaining(w.endDate);
      if (diffDays === null) continue;

      if (diffDays >= 0 && diffDays <= alertWindow) {
        const bucket = diffDays <= 7 ? 'urgent7' : `win${alertWindow}`;
        const dedupeKey = `war-exp-${w.id}-${bucket}-${w.endDate}`;
        if (!existingKeys.has(dedupeKey)) {
          existingKeys.add(dedupeKey);
          generated.push({
            id: generateSafeId('NTF'),
            userId,
            type: 'warranty_expiring',
            title:
              diffDays === 0
                ? `تنبيه عاجل: ضمان ${dev.deviceName} ينتهي اليوم`
                : diffDays <= 7
                  ? `تنبيه عاجل: ضمان ${dev.deviceName} ينتهي خلال ${diffDays} أيام`
                  : `اقتراب انتهاء ضمان: ${dev.brand} ${dev.deviceName}`,
            body: `ينتهي "${w.itemOrPartName}" الصادر من (${w.issuerName}) خلال ${diffDays} يومًا. راجع الجهاز قبل انتهاء التغطية إذا احتجت لفحص مجاني.`,
            linkPath: '/warranties',
            dedupeKey,
            isRead: false,
            createdAt: nowIso,
            isDemo,
          });
        }
      } else if (diffDays < 0 && diffDays >= -60) {
        const dedupeKey = `war-ended-${w.id}-${w.endDate}`;
        if (!existingKeys.has(dedupeKey)) {
          existingKeys.add(dedupeKey);
          generated.push({
            id: generateSafeId('NTF'),
            userId,
            type: 'warranty_expired',
            title: `انتهى ضمان: ${dev.brand} ${dev.deviceName}`,
            body: `انتهت مدة "${w.itemOrPartName}" منذ ${Math.abs(diffDays)} يومًا. يمكنك جدولة صيانة دورية للحفاظ على كفاءة الجهاز وقيمته السوقية.`,
            linkPath: '/warranties',
            dedupeKey,
            isRead: false,
            createdAt: nowIso,
            isDemo,
          });
        }
      }
    }
  }

  // 2. Smart Periodic Maintenance Reminders (User-Scheduled + Smart Auto-Detection)
  if (prefs.maintenanceReminders) {
    const devicesWithExplicitReminders = new Set<string>();

    for (const rem of maintenanceReminders) {
      if (rem.ownerId !== userId) continue;
      const dev = ownedDeviceMap.get(rem.deviceId);
      if (!dev) continue;
      devicesWithExplicitReminders.add(dev.id);

      const diffDays = getDaysRemaining(rem.nextDueDate);
      if (diffDays === null || diffDays > 7) continue;

      const dedupeKey = `maint-${rem.id}-${rem.nextDueDate}`;
      if (existingKeys.has(dedupeKey)) continue;
      existingKeys.add(dedupeKey);

      const title =
        diffDays < 0
          ? `صيانة دورية متأخرة: ${dev.deviceName}`
          : diffDays === 0
            ? `موعد صيانة دورية اليوم: ${dev.deviceName}`
            : `موعد صيانة دورية قريب (${diffDays} أيام): ${dev.deviceName}`;

      const body =
        diffDays < 0
          ? `تأخر موعد "${rem.title}" بمقدار ${Math.abs(diffDays)} يومًا. افتح بطاقة الجهاز لتأكيد إتمام الصيانة وجدولة الموعد التالي.`
          : `حان وقت "${rem.title}" لجهاز ${dev.brand} ${dev.deviceName} للحفاظ على كفاءته وتوثيق سجله الزمني.`;

      generated.push({
        id: generateSafeId('NTF'),
        userId,
        type: 'maintenance_reminder',
        title,
        body,
        linkPath: `/devices/${dev.id}`,
        dedupeKey,
        isRead: false,
        createdAt: nowIso,
        isDemo,
      });
    }

    // 3. Automatic Smart Care Suggestion for devices >= 180 days without explicit schedule or recent service
    const nowMs = Date.now();
    const halfYearBucket = Math.floor(nowMs / (1000 * 60 * 60 * 24 * 180));

    for (const dev of ownedDevices) {
      if (dev.status === 'reported_stolen' || devicesWithExplicitReminders.has(dev.id)) continue;
      if (!dev.purchaseDate) continue;

      const ageDays = Math.floor((nowMs - new Date(dev.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(ageDays) || ageDays < 180) continue;

      const lastRepair = repairs
        .filter((r) => r.deviceId === dev.id && r.ownerApproved)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const daysSinceLastRepair = lastRepair
        ? Math.floor((nowMs - new Date(lastRepair.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : ageDays;

      if (daysSinceLastRepair < 180) continue;

      const dedupeKey = `auto-care-${dev.id}-${halfYearBucket}`;
      if (existingKeys.has(dedupeKey)) continue;
      existingKeys.add(dedupeKey);

      const topPreset = MAINTENANCE_CATEGORY_PRESETS[dev.category]?.[0];
      generated.push({
        id: generateSafeId('NTF'),
        userId,
        type: 'maintenance_reminder',
        title: `توصية فحص دوري ذكي: ${dev.brand} ${dev.deviceName}`,
        body: topPreset
          ? `مر أكثر من 6 أشهر دون صيانة موثقة على هذا الجهاز. يُنصح بـ: "${topPreset.title}" أو تفعيل جدول صيانة دورية.`
          : 'مر أكثر من 6 أشهر دون صيانة موثقة. ننصح بفحص سريع للجهاز وتوثيقه في السجل.',
        linkPath: `/devices/${dev.id}`,
        dedupeKey,
        isRead: false,
        createdAt: nowIso,
        isDemo,
      });
    }
  }

  return generated;
}

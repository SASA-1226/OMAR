import type {
  DeviceCategorySlug,
  DeviceCondition,
  DeviceEvent,
  DeviceRecord,
  MarketplaceListing,
  OwnershipTransfer,
  RepairRecord,
  ReportItem,
  SparePartStat,
  WarrantyRecord,
} from '../types/omor';

export interface ValuationFactor {
  label: string;
  impactPercent: number;
  note: string;
}

export interface DeviceValuationSummary {
  minPriceEgp: number;
  fairPriceEgp: number;
  maxPriceEgp: number;
  confidenceLabel: string;
  baseReferenceEgp: number;
  comparableListingsCount: number;
  comparableAvgPriceEgp: number | null;
  factors: ValuationFactor[];
}

export interface DeviceHistorySummary {
  healthScore: number;
  trustGrade: 'ممتاز' | 'جيد جدًا' | 'متوسط' | 'يتطلب تدقيقًا';
  totalEventsCount: number;
  approvedRepairsCount: number;
  correctionRecordsCount: number;
  replacedPartsCount: number;
  usedOrUnknownPartsCount: number;
  activeWarrantiesCount: number;
  completedTransfersCount: number;
  openReportsCount: number;
  strengths: string[];
  alerts: string[];
}

export interface RiskCheckAxis {
  title: string;
  status: 'pass' | 'warning' | 'danger';
  detail: string;
}

export interface UsedPurchaseRiskSummary {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0 (safest) -> 100 (highest risk)
  verdictTitle: string;
  verdictSummary: string;
  axes: RiskCheckAxis[];
  redFlags: string[];
  greenFlags: string[];
  inspectionChecklist: string[];
}

const CATEGORY_BASE_PRICE_EGP: Record<DeviceCategorySlug, number> = {
  smartphone: 24000,
  tablet: 19000,
  laptop: 42000,
  desktop: 34000,
  smartwatch: 11000,
  tv: 22000,
  home_appliance: 18000,
  other: 10000,
};

const CONDITION_MULTIPLIER: Record<DeviceCondition, number> = {
  new: 1.0,
  like_new: 0.91,
  good: 0.79,
  fair: 0.64,
  needs_repair: 0.44,
};

function inferReferenceBasePrice(device: DeviceRecord, listings: MarketplaceListing[]): number {
  const nameLower = `${device.brand} ${device.deviceName} ${device.model}`.toLowerCase();

  // Check comparable active listings in the marketplace
  const sameCategoryListings = listings.filter((l) => l.status === 'active');
  const directMatches = sameCategoryListings.filter((l) => {
    const t = l.title.toLowerCase();
    return (
      t.includes(device.brand.toLowerCase()) &&
      device.deviceName
        .toLowerCase()
        .split(' ')
        .some((token) => token.length > 2 && t.includes(token))
    );
  });

  if (directMatches.length > 0) {
    const avg = directMatches.reduce((acc, item) => acc + item.price, 0) / directMatches.length;
    return Math.round(avg / CONDITION_MULTIPLIER[device.condition]);
  }

  // Flagship heuristic adjustments using known model keywords
  if (nameLower.includes('iphone 16 pro')) return 64000;
  if (nameLower.includes('iphone 15 pro')) return 51000;
  if (nameLower.includes('iphone 14')) return 34000;
  if (nameLower.includes('s25 ultra')) return 57000;
  if (nameLower.includes('s24 ultra')) return 46000;
  if (nameLower.includes('macbook pro') && nameLower.includes('m4')) return 86000;
  if (nameLower.includes('macbook pro')) return 65000;
  if (nameLower.includes('macbook air')) return 47000;

  let base = CATEGORY_BASE_PRICE_EGP[device.category] || 15000;
  if (nameLower.includes('apple')) base *= 1.35;
  else if (nameLower.includes('samsung') || nameLower.includes('dell')) base *= 1.15;

  return Math.round(base);
}

export function computeDeviceValuation(
  device: DeviceRecord,
  repairs: RepairRecord[],
  warranties: WarrantyRecord[],
  listings: MarketplaceListing[]
): DeviceValuationSummary {
  const baseReferenceEgp = inferReferenceBasePrice(device, listings);
  const factors: ValuationFactor[] = [];

  // 1. Condition factor
  const condMult = CONDITION_MULTIPLIER[device.condition];
  const condDelta = Math.round((condMult - 1) * 100);
  factors.push({
    label: 'الحالة المعلنة للجهاز',
    impactPercent: condDelta,
    note:
      device.condition === 'needs_repair'
        ? 'الحاجة لإصلاح تخفض القيمة السوقية بشكل ملحوظ'
        : 'معدل تسعير متوافق مع حالة الاستخدام المعلنة',
  });

  // 2. Age factor
  let ageMultiplier = 1;
  if (device.purchaseDate) {
    const ageMonths = Math.max(
      0,
      Math.floor((Date.now() - new Date(device.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const depreciation = Math.min(0.32, Math.floor(ageMonths / 6) * 0.04);
    if (depreciation > 0) {
      ageMultiplier = 1 - depreciation;
      factors.push({
        label: `عمر الاستخدام (${ageMonths} شهرًا تقريبًا)`,
        impactPercent: -Math.round(depreciation * 100),
        note: 'استهلاك طبيعي بناءً على تاريخ الشراء المسجل',
      });
    }
  }

  // 3. Verification tier trust premium
  let trustMultiplier = 1;
  if (device.verificationTier === 'technician_verified') {
    trustMultiplier = 1.07;
    factors.push({
      label: 'توثيق فني معتمد',
      impactPercent: 7,
      note: 'وجود فحص وتوثيق فني يزيد ثقة المشترين ويرفع القيمة',
    });
  } else if (device.verificationTier === 'invoice_attached') {
    trustMultiplier = 1.04;
    factors.push({
      label: 'فاتورة شراء محفوظة',
      impactPercent: 4,
      note: 'إرفاق الفاتورة يثبت مصدر الجهاز القانوني',
    });
  } else {
    trustMultiplier = 0.96;
    factors.push({
      label: 'تسجيل ذاتي بدون فاتورة أو فحص',
      impactPercent: -4,
      note: 'يفضل إرفاق فاتورة أو فحص فني لرفع السعر المتوقع',
    });
  }

  // 4. Active warranty bonus
  const devWarranties = warranties.filter((w) => w.deviceId === device.id);
  const hasActiveWarranty = devWarranties.some(
    (w) => w.status === 'active' || w.status === 'expiring_soon'
  );
  let warrantyMultiplier = 1;
  if (hasActiveWarranty) {
    warrantyMultiplier = 1.05;
    factors.push({
      label: 'ضمان ساري المفعول',
      impactPercent: 5,
      note: 'وجود ضمان فعال يقلل مخاطرة المشتري',
    });
  }

  // 5. Repair history impact
  const devRepairs = repairs.filter((r) => r.deviceId === device.id && r.ownerApproved);
  let repairMultiplier = 1;
  if (devRepairs.length > 0) {
    const hasBoardRepair = devRepairs.some((r) =>
      `${r.issueType} ${r.actionTaken}`.includes('لوح') ||
      `${r.issueType} ${r.actionTaken}`.toLowerCase().includes('board')
    );
    const penalty = Math.min(0.18, devRepairs.length * 0.04 + (hasBoardRepair ? 0.06 : 0));
    repairMultiplier = 1 - penalty;
    factors.push({
      label: `سجل صيانات موثقة (${devRepairs.length})`,
      impactPercent: -Math.round(penalty * 100),
      note: hasBoardRepair
        ? 'وجود صيانة في اللوحة الأم يؤثر على تسعير المستعمل'
        : 'الشفافية في سجل الصيانة تحمي السعر من الخسارة العشوائية',
    });
  }

  const rawFair =
    baseReferenceEgp * condMult * ageMultiplier * trustMultiplier * warrantyMultiplier * repairMultiplier;
  const fairPriceEgp = Math.max(500, Math.round(rawFair / 100) * 100);
  const minPriceEgp = Math.max(400, Math.round((fairPriceEgp * 0.91) / 100) * 100);
  const maxPriceEgp = Math.round((fairPriceEgp * 1.09) / 100) * 100;

  const comparableListings = listings.filter(
    (l) =>
      l.status === 'active' &&
      l.title.toLowerCase().includes(device.brand.toLowerCase())
  );
  const comparableAvgPriceEgp =
    comparableListings.length > 0
      ? Math.round(comparableListings.reduce((sum, l) => sum + l.price, 0) / comparableListings.length)
      : null;

  const confidenceLabel =
    device.verificationTier === 'technician_verified' && device.purchaseDate
      ? 'ثقة عالية بالبيانات'
      : device.verificationTier !== 'self_recorded'
        ? 'ثقة متوسطة بالبيانات'
        : 'تقدير مبدئي (يُنصح بإضافة فاتورة أو فحص)';

  return {
    minPriceEgp,
    fairPriceEgp,
    maxPriceEgp,
    confidenceLabel,
    baseReferenceEgp,
    comparableListingsCount: comparableListings.length,
    comparableAvgPriceEgp,
    factors,
  };
}

export function analyzeDeviceHistory(
  device: DeviceRecord,
  events: DeviceEvent[],
  repairs: RepairRecord[],
  warranties: WarrantyRecord[],
  transfers: OwnershipTransfer[],
  reports: ReportItem[]
): DeviceHistorySummary {
  const devEvents = events.filter((e) => e.deviceId === device.id);
  const devRepairs = repairs.filter((r) => r.deviceId === device.id);
  const approvedRepairs = devRepairs.filter((r) => r.ownerApproved);
  const correctionRecordsCount = devRepairs.filter((r) => Boolean(r.parentRecordId)).length;
  const allParts = approvedRepairs.flatMap((r) => r.parts);
  const usedOrUnknownPartsCount = allParts.filter((p) => p.partOrigin !== 'new').length;
  const devWarranties = warranties.filter((w) => w.deviceId === device.id);
  const activeWarrantiesCount = devWarranties.filter(
    (w) => w.status === 'active' || w.status === 'expiring_soon'
  ).length;
  const completedTransfersCount = transfers.filter(
    (t) => t.deviceId === device.id && t.status === 'completed'
  ).length;
  const devReports = reports.filter(
    (rep) => rep.targetType === 'device' && rep.targetId === device.id && rep.status !== 'rejected'
  );

  let score = 68;
  const strengths: string[] = [];
  const alerts: string[] = [];

  if (device.verificationTier === 'technician_verified') {
    score += 18;
    strengths.push('الجهاز حاصل على توثيق وفحص فني معتمد.');
  } else if (device.verificationTier === 'invoice_attached') {
    score += 10;
    strengths.push('تم إرفاق فاتورة الشراء في الخزينة الخاصة.');
  } else {
    score -= 8;
    alerts.push('الهوية مسجلة ذاتيًا فقط دون فاتورة أو فحص فني.');
  }

  if (activeWarrantiesCount > 0) {
    score += 8;
    strengths.push(`يوجد ${activeWarrantiesCount} ضمان سارٍ موثق على الجهاز.`);
  }

  if (approvedRepairs.length === 0) {
    score += 6;
    strengths.push('سجل خالٍ من الأعطال أو الصيانات المسجلة.');
  } else {
    score -= Math.min(18, approvedRepairs.length * 4);
    alerts.push(`خضع الجهاز لـ ${approvedRepairs.length} عملية صيانة معتمدة.`);
  }

  if (usedOrUnknownPartsCount > 0) {
    score -= usedOrUnknownPartsCount * 5;
    alerts.push(`تحتوي الصيانة على ${usedOrUnknownPartsCount} قطعة مستعملة أو غير محددة المصدر.`);
  } else if (allParts.length > 0) {
    strengths.push('جميع القطع المستبدلة المسجلة جديدة ومحددة المصدر.');
  }

  if (correctionRecordsCount > 0) {
    score -= correctionRecordsCount * 4;
    alerts.push(`يوجد ${correctionRecordsCount} سجل تصحيح مرتبط بسجلات سابقة.`);
  }

  if (devReports.length > 0) {
    score -= devReports.length * 15;
    alerts.push(`يوجد ${devReports.length} بلاغ مسجل قيد المتابعة أو المراجعة.`);
  }

  if (device.status === 'reported_stolen') {
    score -= 45;
    alerts.push('تحذير أمني: هذا الجهاز مُبلغ عن فقدانه أو سرقته من مالكه!');
  }

  if (device.condition === 'needs_repair') {
    score -= 12;
    alerts.push('الحالة المعلنة تشير إلى أن الجهاز يحتاج صيانة حالية.');
  }

  const healthScore = Math.max(15, Math.min(100, Math.round(score)));
  const trustGrade: DeviceHistorySummary['trustGrade'] =
    healthScore >= 85
      ? 'ممتاز'
      : healthScore >= 70
        ? 'جيد جدًا'
        : healthScore >= 50
          ? 'متوسط'
          : 'يتطلب تدقيقًا';

  return {
    healthScore,
    trustGrade,
    totalEventsCount: devEvents.length,
    approvedRepairsCount: approvedRepairs.length,
    correctionRecordsCount,
    replacedPartsCount: allParts.length,
    usedOrUnknownPartsCount,
    activeWarrantiesCount,
    completedTransfersCount,
    openReportsCount: devReports.length,
    strengths,
    alerts,
  };
}

export function computeUsedPurchaseRiskReport(
  device: DeviceRecord,
  repairs: RepairRecord[],
  warranties: WarrantyRecord[],
  reports: ReportItem[],
  listing: MarketplaceListing | undefined,
  valuation: DeviceValuationSummary
): UsedPurchaseRiskSummary {
  const axes: RiskCheckAxis[] = [];
  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  let riskPoints = 15;

  if (device.status === 'reported_stolen') {
    axes.push({
      title: 'حالة الفقدان / السرقة',
      status: 'danger',
      detail: `تم تفعيل وضع البلاغ الأمني على هذا الجهاز${device.lostReportNote ? `: ${device.lostReportNote}` : '.'}`,
    });
    redFlags.push('الجهاز مُبلغ عن فقدانه أو سرقته — يُحظر تمامًا شراؤه أو نقل ملكيته.');
    riskPoints += 85;
  }

  // Axis 1: Verification & Ownership Proof
  if (device.verificationTier === 'technician_verified') {
    axes.push({
      title: 'توثيق الهوية والفحص',
      status: 'pass',
      detail: 'موثق من فني صيانة معتمد على المنصة.',
    });
    greenFlags.push('ملف موثق بفحص فني معتمد.');
  } else if (device.verificationTier === 'invoice_attached') {
    axes.push({
      title: 'توثيق الهوية والفحص',
      status: 'pass',
      detail: 'مرفق فاتورة شراء أصلية في سجل المالك.',
    });
    greenFlags.push('إثبات شراء محفوظ في الخزينة.');
    riskPoints += 8;
  } else {
    axes.push({
      title: 'توثيق الهوية والفحص',
      status: 'warning',
      detail: 'تسجيل ذاتي فقط دون فاتورة مرفقة أو فحص فني.',
    });
    redFlags.push('لا توجد فاتورة شراء مرفقة أو توثيق فني.');
    riskPoints += 22;
  }

  // Axis 2: Public Visibility & Transparency
  if (device.visibility.isPublic && device.visibility.showRepairs && device.visibility.showCondition) {
    axes.push({
      title: 'شفافية العرض العام (QR)',
      status: 'pass',
      detail: 'المالك يعرض سجل الصيانة والحالة بشكل علني عند مسح QR.',
    });
    greenFlags.push('سجل الصيانة والحالة متاحان للفحص العام.');
  } else {
    axes.push({
      title: 'شفافية العرض العام (QR)',
      status: 'warning',
      detail: 'بعض أقسام الملف العام مخفية من إعدادات الخصوصية.',
    });
    redFlags.push('إخفاء جزء من سجل الصيانة أو الحالة في العرض العام.');
    riskPoints += 15;
  }

  // Axis 3: Repair History & Parts Origin
  const approvedRepairs = repairs.filter((r) => r.deviceId === device.id && r.ownerApproved);
  const usedParts = approvedRepairs.flatMap((r) => r.parts).filter((p) => p.partOrigin !== 'new');
  if (approvedRepairs.length === 0) {
    axes.push({
      title: 'سجل الأعطال والصيانة',
      status: 'pass',
      detail: 'لم تُسجل عمليات فتح أو صيانة معتمدة على الجهاز.',
    });
    greenFlags.push('سجل خالٍ من الصيانات السابقة.');
  } else if (usedParts.length > 0 || approvedRepairs.length >= 3) {
    axes.push({
      title: 'سجل الأعطال والصيانة',
      status: 'danger',
      detail: `${approvedRepairs.length} صيانات مسجلة تتضمن قطعًا مستعملة أو غير محددة المصدر.`,
    });
    redFlags.push('تعدد الصيانات أو استخدام قطع غيار غير جديدة.');
    riskPoints += 25;
  } else {
    axes.push({
      title: 'سجل الأعطال والصيانة',
      status: 'warning',
      detail: `${approvedRepairs.length} صيانة موثقة بقطع جديدة وواضحة المصدر.`,
    });
    riskPoints += 10;
  }

  // Axis 4: Warranty Coverage
  const hasWarranty = warranties.some(
    (w) => w.deviceId === device.id && (w.status === 'active' || w.status === 'expiring_soon')
  );
  if (hasWarranty || (listing && listing.storeWarrantyDays > 0)) {
    axes.push({
      title: 'الضمان والتغطية',
      status: 'pass',
      detail: listing?.storeWarrantyDays
        ? `يشمل ضمان متجر لمدة ${listing.storeWarrantyDays} يومًا بالإضافة لسجل الضمان.`
        : 'يوجد ضمان سارٍ مسجل للجهاز.',
    });
    greenFlags.push('وجود تغطية ضمان سارية تقلل المخاطر.');
  } else {
    axes.push({
      title: 'الضمان والتغطية',
      status: 'warning',
      detail: 'لا يوجد ضمان سارٍ مسجل حاليًا.',
    });
    riskPoints += 8;
  }

  // Axis 5: Reports & Trust Flags
  const matchingReports = reports.filter(
    (rep) =>
      rep.status !== 'rejected' &&
      ((rep.targetType === 'device' && rep.targetId === device.id) ||
        (listing && rep.targetType === 'listing' && rep.targetId === listing.id))
  );
  if (matchingReports.length > 0) {
    axes.push({
      title: 'البلاغات ومؤشرات الاحتيال',
      status: 'danger',
      detail: `يوجد ${matchingReports.length} بلاغ مسجل يتطلب الحذر والتحقق.`,
    });
    redFlags.push(`تم رصد ${matchingReports.length} بلاغ على هذا الجهاز أو العرض.`);
    riskPoints += 30;
  } else {
    axes.push({
      title: 'البلاغات ومؤشرات الاحتيال',
      status: 'pass',
      detail: 'لا توجد أي بلاغات نشطة أو مخالفات مسجلة.',
    });
    greenFlags.push('سجل نظيف بدون بلاغات.');
  }

  // Axis 6: Price Fairness (if listed)
  if (listing) {
    const ratio = listing.price / valuation.fairPriceEgp;
    if (ratio < 0.7) {
      axes.push({
        title: 'تقييم السعر المطلوب',
        status: 'danger',
        detail: `السعر (${listing.price.toLocaleString('ar-EG')} ج.م) أقل بكثير من التقدير العادل، وهو مؤشر يستدعي فحصًا دقيقًا.`,
      });
      redFlags.push('سعر منخفض بشكل غير معتاد مقارنة بالقيمة التقديرية.');
      riskPoints += 20;
    } else if (ratio > 1.2) {
      axes.push({
        title: 'تقييم السعر المطلوب',
        status: 'warning',
        detail: 'السعر أعلى من متوسط التقدير السوقي بنسبة تتجاوز 20%.',
      });
      redFlags.push('السعر المطلوب مرتفع مقارنة بالتقدير المتاح.');
      riskPoints += 8;
    } else {
      axes.push({
        title: 'تقييم السعر المطلوب',
        status: 'pass',
        detail: 'السعر المطلوب متقارب مع النطاق العادل للجهاز.',
      });
      greenFlags.push('السعر ضمن النطاق العادل المتوقع.');
    }
  }

  const riskScore = device.status === 'reported_stolen' ? 98 : Math.max(5, Math.min(98, riskPoints));
  const riskLevel: UsedPurchaseRiskSummary['riskLevel'] =
    riskScore <= 30 ? 'low' : riskScore <= 58 ? 'medium' : 'high';

  const verdictTitle =
    device.status === 'reported_stolen'
      ? 'تحذير أمني خطير — جهاز مُبلغ عن فقدانه أو سرقته!'
      : riskLevel === 'low'
        ? 'مخاطر منخفضة — سجل موثوق ومشجع للشراء'
        : riskLevel === 'medium'
          ? 'مخاطر متوسطة — يُنصح بالمعاينة الفنية قبل الدفع'
          : 'مخاطر مرتفعة — توجد مؤشرات تستوجب الحذر الشديد';

  const verdictSummary =
    device.status === 'reported_stolen'
      ? 'تم قفل هذا السجل بواسطة مالكه كبلاغ فقدان أو سرقة. لا تُتم عملية الشراء مطلقًا وتواصل مع الدعم الفني 01214899889.'
      : riskLevel === 'low'
        ? 'البيانات المسجلة متسقة ولا تظهر علامات تلاعب أو بلاغات. أتمم المعاينة الميدانية ثم اطلب رمز نقل الملكية عبر OMOR.'
        : riskLevel === 'medium'
          ? 'توجد نقاط تحتاج تحققًا إضافيًا (مثل عدم وجود فاتورة أو ضمان أو وجود صيانات سابقة). افحص الجهاز لدى مركز صيانة موثق قبل الشراء.'
          : 'رُصدت عدة عوامل خطر مؤثرة في السجل أو السعر أو البلاغات. لا تُتم الدفع قبل فحص شامل وتوثيق كافة المستندات.';

  const inspectionChecklist = [
    'مسح رمز QR أمام البائع والتأكد من تطابق رقم السجل OMR والموديل.',
    'مراجعة الرقم التسلسلي المقنّع الظاهر مع الرقم في إعدادات الجهاز الفعلية.',
    'اختبار البطارية والشاشة والكاميرات والشبكة والشحن لمدة 5 دقائق على الأقل.',
    'تفعيل نقل الملكية برمز المرة الواحدة في صفحة «نقل الملكية» فور تسليم الجهاز.',
  ];

  return {
    riskLevel,
    riskScore,
    verdictTitle,
    verdictSummary,
    axes,
    redFlags,
    greenFlags,
    inspectionChecklist,
  };
}

export function computeCombinedSparePartStats(
  baseStats: SparePartStat[],
  repairs: RepairRecord[]
): SparePartStat[] {
  // Incorporate real approved repair records with repairCost & parts into observation count
  const repairDerived: SparePartStat[] = [];
  repairs
    .filter((r) => r.ownerApproved && r.repairCost && r.repairCost > 0 && r.parts.length > 0)
    .forEach((r) => {
      const firstPart = r.parts[0];
      repairDerived.push({
        id: `rep-stat-${r.id}`,
        category: 'smartphone',
        brand: r.centerName,
        deviceModelPattern: r.issueType,
        partName: firstPart.partName,
        partCategory: firstPart.partName.includes('شاشة')
          ? 'screen'
          : firstPart.partName.includes('بطارية')
            ? 'battery'
            : firstPart.partName.includes('شحن')
              ? 'charging_port'
              : 'other',
        origin: firstPart.partOrigin === 'new' ? 'original' : 'used',
        minPriceEgp: Math.round((r.repairCost || 0) * 0.9),
        avgPriceEgp: r.repairCost || 0,
        maxPriceEgp: Math.round((r.repairCost || 0) * 1.1),
        avgWarrantyDays: firstPart.warrantyDays || r.warrantyDays,
        sampleCount: 1,
        trend: 'stable',
        lastUpdated: r.createdAt,
        sourceLabel: `تكلفة مسجلة من ${r.centerName}`,
        isDemo: r.isDemo,
      });
    });

  return [...baseStats, ...repairDerived];
}

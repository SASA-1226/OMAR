import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BellRing,
  Check,
  Crown,
  FilePlus2,
  Plus,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useApp } from '../context/AppContext';
import {
  PLATFORM_TRUST_DISCLAIMER,
  REPAIR_STATUS_LABELS,
  TRUST_SOURCE_LABELS,
  WARRANTY_STATUS_LABELS,
  formatArabicDate,
  formatCurrency,
  getDaysRemaining,
} from '../lib/labels';
import { repairRecordSchema, repairRequestSchema, validateUploadFile, warrantySchema } from '../lib/validation';
import type { RepairPart, RepairRecord, RepairStatus } from '../types/omor';

export const RepairsPage: React.FC = () => {
  const {
    currentUser,
    devices,
    myDevices,
    technicians,
    repairRequests,
    repairRecords,
    createRepairRecord,
    updateRepairRequestStatus,
    approveRepairRecord,
    rejectRepairRecord,
    createRepairCorrectionRecord,
  } = useApp();
  const navigate = useNavigate();

  const isTech = currentUser?.role === 'technician' || currentUser?.role === 'admin';
  const myTechProfile = technicians.find((t) => t.userId === currentUser?.id);

  // Technician documentation modal/form state
  const [showTechForm, setShowTechForm] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState('');
  const [deviceId, setDeviceId] = useState(devices[0]?.id || '');
  const [issueType, setIssueType] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyDays, setWarrantyDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [parts, setParts] = useState<RepairPart[]>([]);
  const [partName, setPartName] = useState('');
  const [partOrigin, setPartOrigin] = useState<'new' | 'used' | 'unknown'>('new');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Correction Modal state for immutable approved records
  const [correctingRecord, setCorrectingRecord] = useState<RepairRecord | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctedAction, setCorrectedAction] = useState('');
  const [correctionError, setCorrectionError] = useState('');

  const visibleRequests = useMemo(() => {
    if (!currentUser) return [];
    if (isTech && myTechProfile) {
      return repairRequests.filter(
        (r) => r.technicianId === myTechProfile.id || r.ownerId === currentUser.id
      );
    }
    return repairRequests.filter((r) => r.ownerId === currentUser.id);
  }, [currentUser, isTech, myTechProfile, repairRequests]);

  const visibleRecords = useMemo(() => {
    if (!currentUser) return [];
    const myDevIds = new Set(myDevices.map((d) => d.id));
    if (isTech) {
      return repairRecords.filter(
        (r) => r.createdBy === currentUser.id || myDevIds.has(r.deviceId) || currentUser.role === 'admin'
      );
    }
    return repairRecords.filter((r) => myDevIds.has(r.deviceId));
  }, [currentUser, isTech, myDevices, repairRecords]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'before' | 'after'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, false);
    if (!check.ok) {
      setFormError(check.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'before') setBeforeImages((p) => [...p, reader.result as string]);
        else setAfterImages((p) => [...p, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const addPart = () => {
    if (!partName.trim()) return;
    setParts((prev) => [
      ...prev,
      {
        id: `PRT-${Date.now()}`,
        partName: partName.trim(),
        partOrigin,
        warrantyDays: Number(warrantyDays) || 0,
      },
    ]);
    setPartName('');
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsed = repairRecordSchema.safeParse({
      deviceId,
      issueType,
      faultDescription,
      diagnosis,
      actionTaken,
      repairCost: repairCost ? Number(repairCost) : undefined,
      intakeDate,
      deliveryDate: deliveryDate || undefined,
      warrantyDays: Number(warrantyDays) || 0,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'تحقق من الحقول المطلوبة');
      return;
    }
    const res = await createRepairRecord({
      requestId: selectedReqId || undefined,
      ...parsed.data,
      parts,
      beforeImages,
      afterImages,
      status: 'awaiting_customer_approval',
    });
    if (!res.ok) {
      setFormError(res.error || 'تعذر حفظ سجل الصيانة');
      return;
    }
    setShowTechForm(false);
    setIssueType('');
    setFaultDescription('');
    setDiagnosis('');
    setActionTaken('');
    setParts([]);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    setCorrectionError('');
    const res = await createRepairCorrectionRecord(correctingRecord.id, correctionReason, {
      actionTaken: correctedAction || correctingRecord.actionTaken,
    });
    if (!res.ok) {
      setCorrectionError(res.error || 'تعذر إنشاء سجل التصحيح');
      return;
    }
    setCorrectingRecord(null);
    setCorrectionReason('');
    setCorrectedAction('');
  };

  return (
    <AppShell title="سجلات الصيانة والتوثيق">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              نظام توثيق الصيانة
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              لا يُعتمد سجل الإصلاح في السجل العام إلا بموافقة مالك الجهاز، ولا يمكن تعديل السجل المعتمد بشكل صامت.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser?.role === 'technician' && (
              <Link
                to="/services"
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20"
              >
                <Crown className="w-4 h-4" />
                خدمات الفنيين Pro
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate('/repairs/request')}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
            >
              <Plus className="w-4 h-4" />
              طلب توثيق إصلاح
            </button>
            {isTech && (
              <button
                type="button"
                onClick={() => setShowTechForm((v) => !v)}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37] px-4 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]"
              >
                <FilePlus2 className="w-4 h-4" />
                {showTechForm ? 'إغلاق نموذج الفني' : 'توثيق عملية إصلاح (للفني)'}
              </button>
            )}
          </div>
        </div>

        {/* Technician Documentation Form */}
        {isTech && showTechForm && (
          <form
            onSubmit={handleCreateRecord}
            className="rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
              إصدار سجل صيانة وإرساله لموافقة المالك
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">الجهاز</label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName} ({d.deviceCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">نوع المشكلة / الإجراء</label>
                <input
                  type="text"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  placeholder="مثال: استبدال بطارية أصلية"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">وصف العطل عند الاستلام</label>
                <textarea
                  rows={2}
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">التشخيص الفني</label>
                <textarea
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">الإجراء الذي تم تنفيذه</label>
              <textarea
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>

            {/* Replaced Parts */}
            <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 space-y-3">
              <div className="text-xs font-bold">القطع التي تم تغييرها (اختياري)</div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="اسم القطعة"
                  className="flex-1 min-w-[160px] min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 text-xs"
                />
                <select
                  value={partOrigin}
                  onChange={(e) => setPartOrigin(e.target.value as 'new' | 'used' | 'unknown')}
                  className="min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 text-xs"
                >
                  <option value="new">قطعة جديدة</option>
                  <option value="used">قطعة مستعملة</option>
                  <option value="unknown">غير معلوم</option>
                </select>
                <button
                  type="button"
                  onClick={addPart}
                  className="min-h-[40px] px-4 rounded-lg bg-[#232A38] text-white text-xs font-semibold"
                >
                  إضافة قطعة
                </button>
              </div>
              {parts.length > 0 && (
                <ul className="text-xs space-y-1 text-[#4A5363] dark:text-[#C5CCD8]">
                  {parts.map((p) => (
                    <li key={p.id}>
                      • {p.partName} ({p.partOrigin === 'new' ? 'جديدة' : p.partOrigin === 'used' ? 'مستعملة' : 'غير معلوم'})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">تاريخ الدخول</label>
                <input
                  type="date"
                  value={intakeDate}
                  onChange={(e) => setIntakeDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">تاريخ التسليم</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">مدة ضمان الصيانة (يوم)</label>
                <input
                  type="number"
                  min={0}
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">التكلفة (اختياري)</label>
                <input
                  type="number"
                  min={0}
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium mb-1">صور قبل الإصلاح</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImageUpload(e, 'before')}
                />
                {beforeImages.length > 0 && (
                  <span className="text-emerald-500 mt-1 block">تم إرفاق {beforeImages.length} صورة</span>
                )}
              </div>
              <div>
                <label className="block font-medium mb-1">صور بعد الإصلاح</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImageUpload(e, 'after')}
                />
                {afterImages.length > 0 && (
                  <span className="text-emerald-500 mt-1 block">تم إرفاق {afterImages.length} صورة</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">ملاحظات إضافية</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              />
            </div>

            {formError && <div className="text-xs text-rose-500">{formError}</div>}

            <button
              type="submit"
              className="min-h-[44px] px-6 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
            >
              إرسال السجل لصاحب الجهاز للموافقة
            </button>
          </form>
        )}

        {/* Repair Requests */}
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
          <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8] mb-4">
            طلبات توثيق الصيانة ({visibleRequests.length})
          </h3>
          {visibleRequests.length === 0 ? (
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">لا توجد طلبات صيانة حاليًا.</p>
          ) : (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
              {visibleRequests.map((req) => {
                const dev = devices.find((d) => d.id === req.deviceId);
                return (
                  <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                        {req.issueType} — {dev?.deviceName || 'جهاز'}
                      </div>
                      <div className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5">{req.faultDescription}</div>
                      <div className="text-[11px] text-[#7A8394] mt-1">
                        الحالة: <strong className="text-[#8F6D14] dark:text-[#D4AF37]">{REPAIR_STATUS_LABELS[req.status]}</strong> · {formatArabicDate(req.createdAt)}
                      </div>
                    </div>
                    {isTech && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={req.status}
                          onChange={(e) => void updateRepairRequestStatus(req.id, e.target.value as RepairStatus)}
                          className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 text-xs"
                        >
                          {Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqId(req.id);
                            setDeviceId(req.deviceId);
                            setIssueType(req.issueType);
                            setFaultDescription(req.faultDescription);
                            setShowTechForm(true);
                          }}
                          className="min-h-[38px] px-3 rounded-lg bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                        >
                          توثيق
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Repair Records */}
        <section className="space-y-4">
          <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
            سجلات الإصلاح ({visibleRecords.length})
          </h3>
          {visibleRecords.length === 0 ? (
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 text-xs text-[#687182] dark:text-[#8E97A8]">
              لا توجد سجلات إصلاح مسجلة بعد.
            </div>
          ) : (
            visibleRecords.map((rec) => {
              const dev = devices.find((d) => d.id === rec.deviceId);
              const isDeviceOwner = dev?.ownerId === currentUser?.id;
              return (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-bold text-[#11161F] dark:text-[#F3F5F8] text-sm">
                        {rec.issueType}
                      </span>
                      <span>· {dev?.deviceName}</span>
                    </div>
                    <span>
                      {REPAIR_STATUS_LABELS[rec.status]} · {formatArabicDate(rec.intakeDate)}
                    </span>
                  </div>

                  {rec.parentRecordId && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                      سجل تصحيح مرتبط بالسجل <span className="font-mono-code">{rec.parentRecordId}</span> — السبب: {rec.correctionReason}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">التشخيص: </span>
                      <span className="text-[#1E2430] dark:text-[#DCE1EA]">{rec.diagnosis}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">الإجراء المنفذ: </span>
                      <span className="text-[#1E2430] dark:text-[#DCE1EA]">{rec.actionTaken}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">المركز والفني: </span>
                      <span>{rec.centerName} ({rec.technicianName})</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8]">الضمان / التكلفة: </span>
                      <span className="tabular-nums">
                        {rec.warrantyDays} يوم {rec.repairCost ? `· ${formatCurrency(rec.repairCost)}` : ''}
                      </span>
                    </div>
                  </div>

                  {(rec.beforeImages.length > 0 || rec.afterImages.length > 0) && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {rec.beforeImages.map((img, i) => (
                        <div key={i} className="w-24">
                          <ImageWithFallback src={img} alt="قبل الإصلاح" className="w-24 h-16 rounded-lg object-cover border border-[#D5DBE5] dark:border-[#333C4B]" />
                          <span className="text-[10px] text-[#687182] dark:text-[#8E97A8] block mt-0.5">قبل الإصلاح</span>
                        </div>
                      ))}
                      {rec.afterImages.map((img, i) => (
                        <div key={i} className="w-24">
                          <ImageWithFallback src={img} alt="بعد الإصلاح" className="w-24 h-16 rounded-lg object-cover border border-[#D5DBE5] dark:border-[#333C4B]" />
                          <span className="text-[10px] text-[#687182] dark:text-[#8E97A8] block mt-0.5">بعد الإصلاح</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {rec.ownerApproved ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          معتمد من المالك ({formatArabicDate(rec.ownerApprovedAt)}) — سجل محمي من التعديل
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          بانتظار موافقة صاحب الجهاز قبل الظهور في السجل العام
                        </span>
                      )}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {isDeviceOwner && !rec.ownerApproved && rec.status !== 'rejected' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void approveRepairRecord(rec.id)}
                            className="min-h-[38px] inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 text-xs font-bold hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                            موافقة واعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => void rejectRepairRecord(rec.id, 'معلومات غير مطابقة')}
                            className="min-h-[38px] inline-flex items-center gap-1 rounded-lg border border-rose-500/40 text-rose-500 px-3 text-xs font-semibold"
                          >
                            <X className="w-3.5 h-3.5" />
                            رفض
                          </button>
                        </>
                      )}

                      {rec.ownerApproved && isTech && (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingRecord(rec);
                            setCorrectedAction(rec.actionTaken);
                          }}
                          className="min-h-[38px] inline-flex items-center gap-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 text-xs font-semibold hover:border-[#D4AF37]"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                          إنشاء تصحيح سجل
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Correction Modal */}
        {correctingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <form
              onSubmit={handleCorrectionSubmit}
              className="w-full max-w-md rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">إنشاء سجل تصحيح (مع حفظ السجل الأصلي)</h3>
              <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                السجل المعتمد لا يتغير أبدًا. سيتم إنشاء سجل تصحيح مرتبط يوضح السبب والوقت والحساب القائم بالتصحيح.
              </p>
              <div>
                <label className="block text-xs font-medium mb-1">سبب التصحيح (إلزامي)</label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="مثال: تصحيح رقم القطعة المستبدلة"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">الإجراء المصحح</label>
                <textarea
                  rows={3}
                  value={correctedAction}
                  onChange={(e) => setCorrectedAction(e.target.value)}
                  className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
                />
              </div>
              {correctionError && <div className="text-xs text-rose-500">{correctionError}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="min-h-[40px] px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
                >
                  حفظ سجل التصحيح
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const RequestRepairPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { myDevices, technicians, createRepairRequest } = useApp();

  const sortedTechnicians = useMemo(
    () =>
      [...technicians].sort((a, b) => {
        const scoreA = (a.priorityLeadsUntil ? 2 : 0) + (a.isPro ? 1 : 0);
        const scoreB = (b.priorityLeadsUntil ? 2 : 0) + (b.isPro ? 1 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.verifiedRepairsCount - a.verifiedRepairsCount;
      }),
    [technicians]
  );

  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') || myDevices[0]?.id || '');
  const [technicianId, setTechnicianId] = useState(
    searchParams.get('techId') || sortedTechnicians[0]?.id || ''
  );
  const [issueType, setIssueType] = useState(searchParams.get('issueType') || '');
  const [faultDescription, setFaultDescription] = useState(searchParams.get('description') || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = repairRequestSchema.safeParse({
      deviceId,
      technicianId,
      issueType,
      faultDescription,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'يرجى استكمال الحقول');
      return;
    }
    const res = await createRepairRequest({
      deviceId: parsed.data.deviceId,
      technicianId: parsed.data.technicianId,
      issueType: parsed.data.issueType,
      faultDescription: parsed.data.faultDescription,
    });
    if (!res.ok) {
      setError(res.error || 'تعذر إرسال الطلب');
      return;
    }
    navigate('/repairs');
  };

  return (
    <AppShell title="طلب توثيق إصلاح">
      <div className="max-w-xl mx-auto rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6">
        <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1">
          طلب صيانة أو فحص موثق
        </h2>
        <p className="text-xs text-[#687182] dark:text-[#8E97A8] mb-5">
          اختر جهازك والفني المعتمد لإرسال طلب فحص أو إصلاح وتوثيقه في سجل الجهاز.
        </p>

        {myDevices.length === 0 ? (
          <div className="text-xs text-[#687182] dark:text-[#8E97A8] space-y-3">
            <p>يجب تسجيل جهاز واحد على الأقل قبل طلب توثيق إصلاح.</p>
            <Link
              to="/devices/new"
              className="inline-flex rounded-xl bg-[#D4AF37] px-4 py-2.5 font-bold text-[#0B1220]"
            >
              إضافة جهاز
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">الجهاز</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {myDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.brand} {d.deviceName} ({d.deviceCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">الفني / مركز الصيانة</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {sortedTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.centerName} — {t.displayName} ({t.governorate})
                    {t.priorityLeadsUntil || t.isPro ? ' [أولوية / Pro]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">نوع المشكلة أو الخدمة</label>
              <input
                type="text"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                placeholder="مثال: فحص شامل قبل البيع، تغيير بطارية"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">وصف العطل</label>
              <textarea
                rows={4}
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                placeholder="اشرح الأعراض أو الخدمة المطلوبة بدقة..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B]"
            >
              إرسال طلب التوثيق
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};

export const WarrantiesPage: React.FC = () => {
  const { myDevices, warranties, addWarranty, cancelWarranty, notificationPrefs } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [deviceId, setDeviceId] = useState(myDevices[0]?.id || '');
  const [itemOrPartName, setItemOrPartName] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [warrantyNumber, setWarrantyNumber] = useState('');
  const [terms, setTerms] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [error, setError] = useState('');

  const myDevIds = useMemo(() => new Set(myDevices.map((d) => d.id)), [myDevices]);
  const myWarranties = useMemo(
    () => warranties.filter((w) => myDevIds.has(w.deviceId)),
    [warranties, myDevIds]
  );

  const handleDocPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, true);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setDocumentName(file.name);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = warrantySchema.safeParse({
      deviceId,
      itemOrPartName,
      issuerName,
      startDate,
      endDate,
      warrantyNumber: warrantyNumber || undefined,
      terms: terms || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'تحقق من بيانات الضمان');
      return;
    }
    const res = await addWarranty({
      deviceId: parsed.data.deviceId,
      itemOrPartName: parsed.data.itemOrPartName,
      issuerName: parsed.data.issuerName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      warrantyNumber: parsed.data.warrantyNumber,
      terms: parsed.data.terms,
      documentName: documentName || undefined,
    });
    if (!res.ok) {
      setError(res.error || 'تعذر حفظ الضمان');
      return;
    }
    setShowAdd(false);
    setItemOrPartName('');
    setIssuerName('');
    setEndDate('');
    setWarrantyNumber('');
    setTerms('');
  };

  return (
    <AppShell title="الضمانات الإلكترونية">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              دفتر الضمانات الإلكتروني ({myWarranties.length})
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              يُشار بوضوح إلى ما إذا كان مصدر الضمان موثقًا أم مسجلًا ذاتيًا دون ادعاء رسمي غير متحقق منه.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
          >
            <Plus className="w-4 h-4" />
            {showAdd ? 'إغلاق' : 'إضافة ضمان'}
          </button>
        </div>

        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#1E2430] dark:text-[#DCE1EA]">
            <BellRing className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              التنبيه التلقائي للضمانات:{' '}
              <strong>
                {notificationPrefs.warranties
                  ? `مفعّل قبل الانتهاء بـ ${notificationPrefs.warrantyAlertDays || 30} يومًا`
                  : 'متوقف حاليًا'}
              </strong>
            </span>
          </div>
          <Link to="/notifications" className="font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
            تخصيص التنبيهات الذكية
          </Link>
        </div>

        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">الجهاز المرتبط</label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {myDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">اسم المنتج أو القطعة</label>
                <input
                  type="text"
                  value={itemOrPartName}
                  onChange={(e) => setItemOrPartName(e.target.value)}
                  placeholder="مثال: ضمان الشاشة المستبدلة"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">الجهة التي أصدرت الضمان</label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">رقم الضمان (اختياري)</label>
                <input
                  type="text"
                  value={warrantyNumber}
                  onChange={(e) => setWarrantyNumber(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">تاريخ البداية</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">تاريخ النهاية</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">شروط الضمان</label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">ملف أو صورة الضمان</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleDocPick}
                  className="w-full text-xs text-[#687182] dark:text-[#8E97A8]"
                />
              </div>
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
            >
              حفظ الضمان
            </button>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {myWarranties.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-8 text-center text-xs text-[#687182] dark:text-[#8E97A8]">
              لا توجد ضمانات مسجلة لأجهزتك بعد.
            </div>
          ) : (
            myWarranties.map((w) => {
              const dev = myDevices.find((d) => d.id === w.deviceId);
              const remDays = w.status === 'cancelled' ? null : getDaysRemaining(w.endDate);
              return (
                <div
                  key={w.id}
                  className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                        {dev?.brand} {dev?.deviceName} ·{' '}
                        {w.isSourceVerified ? TRUST_SOURCE_LABELS.verified_store : TRUST_SOURCE_LABELS.user_entry}
                      </div>
                      <h3 className="mt-1 text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                        {w.itemOrPartName}
                      </h3>
                    </div>
                    <div className="text-left shrink-0 space-y-1">
                      <span
                        className={`block text-xs font-bold ${
                          w.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : w.status === 'expiring_soon'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-500'
                        }`}
                      >
                        {WARRANTY_STATUS_LABELS[w.status]}
                      </span>
                      {remDays !== null && (
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                            remDays < 0
                              ? 'bg-rose-500/10 text-rose-500'
                              : remDays <= (notificationPrefs.warrantyAlertDays || 30)
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {remDays < 0
                            ? `منتهي منذ ${Math.abs(remDays)} يوم`
                            : remDays === 0
                              ? 'ينتهي اليوم'
                              : `متبقي ${remDays} يوم`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8] block">الجهة المصدرة</span>
                      <span className="font-semibold">{w.issuerName}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8] block">رقم الضمان</span>
                      <span className="font-mono-code">{w.warrantyNumber || 'غير مضاف'}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8] block">من</span>
                      <span className="tabular-nums">{formatArabicDate(w.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-[#687182] dark:text-[#8E97A8] block">إلى</span>
                      <span className="tabular-nums font-semibold">{formatArabicDate(w.endDate)}</span>
                    </div>
                  </div>

                  {w.terms && (
                    <p className="text-xs text-[#687182] dark:text-[#8E97A8] pt-2 border-t border-[#E8EBF0] dark:border-[#222834]">
                      {w.terms}
                    </p>
                  )}

                  {w.status !== 'cancelled' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#7A8394]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {w.documentName ? `مرفق: ${w.documentName}` : 'بدون ملف مرفق'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void cancelWarranty(w.id)}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        إلغاء الضمان
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] leading-relaxed">
          {PLATFORM_TRUST_DISCLAIMER}
        </p>
      </div>
    </AppShell>
  );
};

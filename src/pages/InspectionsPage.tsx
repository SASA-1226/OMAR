import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  Printer,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import {
  INSPECTION_ITEM_KEYS,
  INSPECTION_ITEM_LABELS,
  INSPECTION_STATUS_LABELS,
  PLATFORM_TRUST_DISCLAIMER,
  TRUST_SOURCE_LABELS,
  formatArabicDateTime,
} from '../lib/labels';
import type { InspectionItemKey, InspectionItemStatus } from '../types/omor';

function createInitialChecklist(): Record<InspectionItemKey, InspectionItemStatus> {
  return {
    screen: 'not_tested',
    touch: 'not_tested',
    battery: 'not_tested',
    cameras: 'not_tested',
    audio: 'not_tested',
    charging: 'not_tested',
    network: 'not_tested',
    sensors: 'not_tested',
  };
}

export const InspectionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    currentUser,
    devices,
    myDevices,
    inspections,
    createDeviceInspection,
  } = useApp();

  const paramDeviceId = searchParams.get('deviceId') || '';

  const inspectableDevices = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'technician' || currentUser.role === 'store' || currentUser.role === 'admin') {
      return devices.filter((d) => d.status !== 'archived');
    }
    return myDevices;
  }, [currentUser, devices, myDevices]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    paramDeviceId || inspectableDevices[0]?.id || ''
  );
  const [items, setItems] = useState<Record<InspectionItemKey, InspectionItemStatus>>(
    createInitialChecklist
  );
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [activeReportId, setActiveReportId] = useState<string>('');

  const activeDevice =
    inspectableDevices.find((d) => d.id === selectedDeviceId) ||
    devices.find((d) => d.id === selectedDeviceId) ||
    inspectableDevices[0];

  const deviceInspections = useMemo(() => {
    const list = activeDevice
      ? inspections.filter((ins) => ins.deviceId === activeDevice.id)
      : inspections;
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activeDevice, inspections]);

  const displayedReport =
    inspections.find((ins) => ins.id === activeReportId) || deviceInspections[0] || null;

  const setItemStatus = (key: InspectionItemKey, status: InspectionItemStatus) => {
    setItems((prev) => ({ ...prev, [key]: status }));
  };

  const applyAllPreset = (status: InspectionItemStatus) => {
    const next = { ...items };
    for (const k of INSPECTION_ITEM_KEYS) {
      next[k] = status;
    }
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDevice) {
      setErrorMsg('يرجى اختيار أو تسجيل جهاز أولًا.');
      return;
    }
    setErrorMsg('');
    setFeedback('');
    setSubmitting(true);
    try {
      const res = await createDeviceInspection({
        deviceId: activeDevice.id,
        items,
        inspectorNotes: inspectorNotes.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        setErrorMsg(res.error || 'تعذر حفظ تقرير الفحص.');
        return;
      }
      setFeedback(`تم توثيق وحفظ تقرير الفحص (${res.data.inspectionCode}) بنجاح.`);
      setActiveReportId(res.data.id);
      setInspectorNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareReport = async () => {
    if (!displayedReport) return;
    const dev = devices.find((d) => d.id === displayedReport.deviceId);
    const passedCount = INSPECTION_ITEM_KEYS.filter(
      (k) => displayedReport.items[k] === 'passed'
    ).length;
    const issueCount = INSPECTION_ITEM_KEYS.filter(
      (k) => displayedReport.items[k] === 'issue_found'
    ).length;
    const untestedLabels = displayedReport.untestedItems.map(
      (k) => INSPECTION_ITEM_LABELS[k] || k
    );
    const shareUrl = dev
      ? `${window.location.origin}/d/${dev.publicToken}`
      : window.location.href;
    const text = [
      `تقرير فحص قبل الشراء — SASA STORE | OMOR`,
      `الجهاز: ${dev ? `${dev.brand} ${dev.deviceName} (${dev.deviceCode})` : displayedReport.deviceId}`,
      `رقم الفحص: ${displayedReport.inspectionCode}`,
      `مستوى المصدر: ${TRUST_SOURCE_LABELS[displayedReport.trustLevel]}`,
      `النتيجة: سليم (${passedCount}/8) · ملاحظات/خلل (${issueCount}) · لم يُفحص (${untestedLabels.length})`,
      untestedLabels.length > 0 ? `الأجزاء غير المفحوصة: ${untestedLabels.join('، ')}` : '',
      displayedReport.inspectorNotes ? `ملاحظات الفاحص: ${displayedReport.inspectorNotes}` : '',
      `الرابط العام: ${shareUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: `تقرير فحص ${dev?.deviceName || 'جهاز'} — OMOR`,
          text,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShareMsg('تم نسخ/مشاركة ملخص تقرير الفحص بنجاح.');
      setTimeout(() => setShareMsg(''), 3000);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShareMsg('تم نسخ ملخص التقرير للحافظة.');
        setTimeout(() => setShareMsg(''), 3000);
      } catch {
        setShareMsg('تعذر النسخ التلقائي — يمكنك طباعة التقرير مباشرة.');
      }
    }
  };

  return (
    <AppShell title="فحص الأجهزة قبل الشراء">
      <div className="space-y-6">
        {/* Intro Banner */}
        <section className="rounded-2xl border border-[#D4AF37]/35 bg-white dark:bg-[#141923] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#8F6D14] dark:text-[#D4AF37]">
              <ClipboardCheck className="w-4 h-4" />
              <span>قائمة فحص منظمة من 8 محاور قبل الشراء</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
              توثيق حالة الجهاز بدقة ووضوح بدون ادعاء ضمان مطلق
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8] leading-relaxed">
              سجّل نتيجة كل عنصر (سليم / به ملاحظة / لم يتم فحصه) ليظهر التقرير النهائي مع تمييز الأجزاء التي لم تُختبر ومصدر الفحص.
            </p>
          </div>
          {activeDevice && (
            <Link
              to={`/devices/${activeDevice.id}`}
              className="min-h-[42px] inline-flex items-center justify-center rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold hover:border-[#D4AF37] shrink-0"
            >
              فتح ملف الجهاز
            </Link>
          )}
        </section>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Structured 8-Point Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-6 space-y-5 no-print"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                إجراء فحص فني جديد
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyAllPreset('passed')}
                  className="min-h-[34px] px-3 rounded-lg border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/10"
                >
                  تحديد الكل سليم
                </button>
                <button
                  type="button"
                  onClick={() => applyAllPreset('not_tested')}
                  className="min-h-[34px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] text-[11px] font-semibold"
                >
                  تصفير الاختيارات
                </button>
              </div>
            </div>

            {inspectableDevices.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <p>لا توجد أجهزة مسجلة حاليًا لربط الفحص بها.</p>
                <Link
                  to="/devices/new"
                  className="inline-flex rounded-lg bg-[#D4AF37] text-[#0B1220] px-4 py-2 font-bold"
                >
                  تسجيل جهاز جديد أولًا
                </Link>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold mb-1.5">اختر الجهاز المراد فحصه</label>
                <select
                  value={activeDevice?.id || ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
                >
                  {inspectableDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.deviceName} — {d.deviceCode}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 8 Inspection Criteria */}
            <div className="space-y-3">
              {INSPECTION_ITEM_KEYS.map((key, idx) => {
                const currentVal = items[key];
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#0E131C] p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#11161F] dark:text-[#F3F5F8]">
                      <span>
                        {idx + 1}. {INSPECTION_ITEM_LABELS[key]}
                      </span>
                      <span
                        className={`text-[11px] ${
                          currentVal === 'passed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : currentVal === 'issue_found'
                              ? 'text-rose-500'
                              : 'text-[#687182] dark:text-[#8E97A8]'
                        }`}
                      >
                        {INSPECTION_STATUS_LABELS[currentVal]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          ['passed', 'سليم', 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'],
                          ['issue_found', 'به ملاحظة', 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400'],
                          ['not_tested', 'لم يُفحص', 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37]'],
                        ] as const
                      ).map(([statusVal, label, activeClasses]) => (
                        <button
                          key={statusVal}
                          type="button"
                          onClick={() => setItemStatus(key, statusVal)}
                          className={`min-h-[42px] rounded-xl border font-bold transition-colors ${
                            currentVal === statusVal
                              ? activeClasses
                              : 'border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">ملاحظات الفاحص الميدانية</label>
              <textarea
                rows={3}
                value={inspectorNotes}
                onChange={(e) => setInspectorNotes(e.target.value)}
                placeholder="مثال: صحة البطارية 89%، استجابة True Tone والـ Face ID سليمة، الشاصيه به خدش بسيط أسفل اليمين..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>

            {feedback && (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-500">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || inspectableDevices.length === 0}
              className="w-full min-h-[46px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-extrabold hover:bg-[#E2C25B] disabled:opacity-50"
            >
              {submitting ? 'جاري حفظ تقرير الفحص...' : 'حفظ وإصدار تقرير الفحص قبل الشراء'}
            </button>
          </form>

          {/* Right Column: Final Inspection Report & History */}
          <div className="lg:col-span-5 space-y-5">
            {displayedReport ? (
              <section className="rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#E8EBF0] dark:border-[#222834]">
                  <div>
                    <div className="font-mono-code text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                      {displayedReport.inspectionCode}
                    </div>
                    <h3 className="text-base font-extrabold text-[#11161F] dark:text-[#F3F5F8] mt-0.5">
                      التقرير النهائي لفحص الجهاز
                    </h3>
                    <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5 tabular-nums">
                      {formatArabicDateTime(displayedReport.createdAt)} · الفاحص: {displayedReport.inspectorName}
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      displayedReport.overallOutcome === 'pass_noted'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : displayedReport.overallOutcome === 'needs_attention'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {displayedReport.overallOutcome === 'pass_noted'
                      ? 'اجتاز البنود المفحوصة'
                      : displayedReport.overallOutcome === 'needs_attention'
                        ? 'توجد ملاحظات فنية'
                        : 'فحص غير مكتمل'}
                  </span>
                </div>

                <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-xs flex items-center justify-between">
                  <span className="text-[#687182] dark:text-[#8E97A8]">مصدر التوثيق:</span>
                  <strong className="text-[#8F6D14] dark:text-[#D4AF37]">
                    {TRUST_SOURCE_LABELS[displayedReport.trustLevel]}
                  </strong>
                </div>

                <div className="space-y-2">
                  {INSPECTION_ITEM_KEYS.map((k) => {
                    const st = displayedReport.items[k] || 'not_tested';
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[#E8EBF0] dark:border-[#222834] last:border-b-0"
                      >
                        <span className="text-[#1E2430] dark:text-[#DCE1EA]">{INSPECTION_ITEM_LABELS[k]}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-bold shrink-0 ${
                            st === 'passed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : st === 'issue_found'
                                ? 'text-rose-500'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {st === 'passed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : st === 'issue_found' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <HelpCircle className="w-3.5 h-3.5" />
                          )}
                          {INSPECTION_STATUS_LABELS[st]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {displayedReport.untestedItems.length > 0 && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold">الأجزاء التي لم يتم فحصها في هذا التقرير:</div>
                    <p>
                      {displayedReport.untestedItems
                        .map((k) => INSPECTION_ITEM_LABELS[k] || k)
                        .join('، ')}
                    </p>
                  </div>
                )}

                {displayedReport.inspectorNotes && (
                  <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] p-3 text-xs space-y-1">
                    <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">ملاحظات الفاحص:</div>
                    <p className="text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                      {displayedReport.inspectorNotes}
                    </p>
                  </div>
                )}

                <div className="rounded-xl bg-[#F6F7F9] dark:bg-[#0B1220] border border-[#DCE0E7] dark:border-[#252C38] p-3 text-[11px] text-[#687182] dark:text-[#8E97A8] flex items-start gap-2 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>{PLATFORM_TRUST_DISCLAIMER}</span>
                </div>

                {shareMsg && <div className="text-xs text-emerald-500 font-semibold">{shareMsg}</div>}

                <div className="flex flex-wrap gap-2 no-print">
                  <button
                    type="button"
                    onClick={handleShareReport}
                    className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B]"
                  >
                    <Share2 className="w-4 h-4" />
                    مشاركة التقرير العام
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-8 text-center space-y-3">
                <ShieldCheck className="w-9 h-9 text-[#D4AF37]/70 mx-auto" />
                <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  لا توجد تقارير فحص مسجلة لهذا الجهاز بعد
                </div>
                <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  استخدم نموذج الفحص المكون من 8 محاور لإصدار تقرير مفصل وواضح للمشتري.
                </p>
              </section>
            )}

            {/* Saved Inspections History */}
            {deviceInspections.length > 0 && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3 no-print">
                <h4 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  سجل تقارير الفحص السابقة ({deviceInspections.length})
                </h4>
                <div className="space-y-2">
                  {deviceInspections.map((ins) => {
                    const dev = devices.find((d) => d.id === ins.deviceId);
                    const isSelected = displayedReport?.id === ins.id;
                    return (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() => setActiveReportId(ins.id)}
                        className={`w-full text-right rounded-xl border p-3 text-xs transition-colors ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-[#DCE0E7] dark:border-[#252C38] hover:border-[#D4AF37]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[#11161F] dark:text-[#F3F5F8]">
                          <span className="font-mono-code text-[#8F6D14] dark:text-[#D4AF37]">
                            {ins.inspectionCode}
                          </span>
                          <span className="tabular-nums text-[#687182] dark:text-[#8E97A8]">
                            {formatArabicDateTime(ins.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-[#4A5363] dark:text-[#C5CCD8]">
                          {dev ? `${dev.brand} ${dev.deviceName}` : ''} · {TRUST_SOURCE_LABELS[ins.trustLevel]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

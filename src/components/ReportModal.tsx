import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { REPORT_REASON_LABELS } from '../lib/labels';
import { reportSchema } from '../lib/validation';
import type { ReportItem, ReportReason } from '../types/omor';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportItem['targetType'];
  targetId: string;
  targetLabel: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}) => {
  const { submitReport, currentUser } = useApp();
  const [reason, setReason] = useState<ReportReason>('suspicious_listing');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentUser) {
      setError('يرجى تسجيل الدخول أولًا لإرسال بلاغ موثق.');
      return;
    }
    const parsed = reportSchema.safeParse({ reason, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'تحقق من البيانات المدخلة');
      return;
    }
    const res = await submitReport({
      targetType,
      targetId,
      targetLabel,
      reason: parsed.data.reason,
      description: parsed.data.description,
    });
    if (!res.ok) {
      setError(res.error || 'تعذر إرسال البلاغ');
      return;
    }
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setDescription('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#11161F] dark:text-[#F3F5F8] font-bold">
            <Flag className="w-4 h-4 text-rose-500" />
            <span>إبلاغ عن مخالفة أو مشكلة</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7A8394] hover:text-[#363E4D] dark:hover:text-[#DCE1EA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-[#687182] dark:text-[#8E97A8] mb-4">
          العنصر المبلغ عنه: <strong className="text-[#1E2430] dark:text-[#DCE1EA]">{targetLabel}</strong>
        </div>

        {done ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-600 dark:text-emerald-400">
            تم استلام البلاغ بنجاح وإحالته لفريق المراجعة.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#363E4D] dark:text-[#C5CCD8] mb-1.5">
                سبب البلاغ
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm text-[#11161F] dark:text-[#F3F5F8]"
              >
                {Object.entries(REPORT_REASON_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#363E4D] dark:text-[#C5CCD8] mb-1.5">
                تفاصيل البلاغ
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح المشكلة بوضوح لمساعدة فريق الثقة والأمان..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm text-[#11161F] dark:text-[#F3F5F8]"
              />
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-medium text-[#363E4D] dark:text-[#C5CCD8]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                إرسال البلاغ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

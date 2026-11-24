import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  Loader2,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS } from '../lib/labels';
import { BrandLogo } from './BrandLogo';

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const OmorAIAssistantDrawer: React.FC = () => {
  const {
    currentUser,
    devices,
    repairRecords,
    listings,
    b2bPartners,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(() => {
    if (currentUser?.role === 'technician') {
      return [
        'كيف أوثق عملية صيانة جديدة خطوة بخطوة في المنصة؟',
        'كيف أنشئ سجل تصحيح بعد اعتماد العميل للسجل الأصلي؟',
        'كيف أضيف سعر قطعة غيار في نظام إحصائيات القطع؟',
        'كيف أربط مركز الصيانة الخاص بي في شبكة الشركات B2B؟',
      ];
    }
    if (currentUser?.role === 'store') {
      return [
        'كيف أضيف جهازًا للبيع في OMOR MARKET بضمان المتجر؟',
        'كيف أشرح للمشتري تقرير مخاطر الشراء وتقدير السعر؟',
        'كيف أنقل ملكية الجهاز للمشتري بعد البيع؟',
        'كيف أربط سلسلة فروع المتجر في شبكة الشركات؟',
      ];
    }
    return [
      'كيف أسجل جهازي وأحصل على رمز QR مع إخفاء الفاتورة وIMEI؟',
      'كيف أستخدم مساعد تشخيص الأعطال أو أعرف سعر جهازي العادل؟',
      'كيف أفحص جهازًا مستعملًا عبر تقرير مخاطر الشراء قبل الدفع؟',
      'كيف أطلب صيانة موثقة أو أنقل ملكية جهاز بأمان؟',
    ];
  }, [currentUser?.role]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setErrorMsg('');
    if (!textOverride) setInput('');

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
          userRole: currentUser?.role || 'guest',
          currentPath: location.pathname,
          platformSnapshot: {
            devicesCount: devices.length,
            repairsCount: repairRecords.length,
            listingsCount: listings.length,
            partnersCount: b2bPartners.length,
          },
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        setErrorMsg(
          data.error || 'تعذر الحصول على رد من المساعد الذكي حاليًا.'
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: data.reply as string,
          },
        ]);
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 60);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مجددًا.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <>
      {/* Floating Launcher Button (Left side on RTL so it avoids right sidebar & center QR) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح مساعد عُمْر الذكي"
        className="fixed bottom-20 lg:bottom-6 left-4 lg:left-6 z-40 min-h-[48px] inline-flex items-center gap-2 rounded-2xl bg-[#0B1220] dark:bg-[#D4AF37] text-[#D4AF37] dark:text-[#0B1220] border border-[#D4AF37]/50 px-4 py-2.5 text-xs font-extrabold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform no-print"
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>مساعد عُمْر الذكي</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start bg-black/55 backdrop-blur-xs p-0 sm:p-5 no-print"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[440px] h-[86vh] sm:h-[640px] rounded-t-3xl sm:rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#10151F] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#141923] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-[#8F6D14] dark:text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-[#11161F] dark:text-[#F3F5F8] truncate">
                    مساعد صاصا ستور عُمْر الذكي
                  </div>
                  <div className="text-[11px] text-[#687182] dark:text-[#8E97A8] truncate">
                    {currentUser ? `مخصص لدور: ${ROLE_LABELS[currentUser.role]}` : 'دليل ذكي للعملاء والفنيين'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setErrorMsg('');
                    }}
                    title="بدء محادثة جديدة"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#7A8394] hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق المساعد"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#687182] dark:text-[#8E97A8] hover:bg-[#E4E8EE]/70 dark:hover:bg-[#1F2633]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick V3 Shortcuts */}
            <div className="px-4 py-2 border-b border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between gap-2 bg-white dark:bg-[#10151F]">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/v3/diagnose');
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/25 whitespace-nowrap"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>أدوات OMOR V3</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#141923] p-3.5 text-xs text-[#363E4D] dark:text-[#C5CCD8] leading-relaxed">
                    أهلًا بك في مساعد <strong>صاصا ستور | OMOR V3</strong>. اسألني عن أي ميزة في البرنامج:
                    تسجيل الأجهزة، الخصوصية ورمز QR، توثيق الصيانة، السجلات التصحيحية، نقل الملكية، أو أدوات V3 للتشخيص والتسعير ومخاطر الشراء.
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-[#687182] dark:text-[#8E97A8]">
                      أسئلة سريعة مقترحة:
                    </div>
                    <div className="space-y-1.5">
                      {quickPrompts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void sendMessage(q)}
                          className="w-full text-right rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3 py-2.5 text-xs text-[#363E4D] dark:text-[#DCE1EA] hover:border-[#D4AF37] transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-[#D4AF37] text-[#0B1220] font-semibold'
                          : 'bg-[#EEF0F4] dark:bg-[#141923] border border-[#DCE0E7] dark:border-[#252C38] text-[#1E2430] dark:text-[#F3F5F8]'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#687182] dark:text-[#8E97A8] py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>جاري إعداد الإجابة...</span>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={handleFormSubmit}
              className="p-3 border-t border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل عن أي خطوة أو ميزة في البرنامج..."
                className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-xs text-[#11161F] dark:text-[#F3F5F8] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="إرسال السؤال"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold disabled:opacity-45 hover:bg-[#E2C25B]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Lock,
  Shield,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AdminMonetizationCenter } from '../components/AdminMonetizationCenter';
import { BrandLogo } from '../components/BrandLogo';
import { SupportContactButtons } from '../components/SupportWhatsAppButton';
import { useApp } from '../context/AppContext';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  ROLE_LABELS,
  formatArabicDateTime,
} from '../lib/labels';
import type { ReportStatus, UserRole } from '../types/omor';

export const PrivacyPage: React.FC = () => {
  const { currentUser, deleteMyAccount } = useApp();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [deletedMsg, setDeletedMsg] = useState('');

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim() !== 'حذف حسابي') return;
    const res = await deleteMyAccount();
    if (res.ok) {
      setDeletedMsg('تم إخفاء بياناتك وحذف حسابك وفق سياسة الخصوصية.');
      setTimeout(() => navigate('/welcome'), 1500);
    }
  };

  return (
    <AppShell title="الخصوصية وحذف الحساب">
      <div className="max-w-3xl mx-auto space-y-6">
        <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Lock className="w-5 h-5 text-[#D4AF37]" />
            <h2>سياسة الخصوصية وحماية البيانات</h2>
          </div>
          <div className="space-y-3 text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
            <p>
              تلتزم منصة <strong>SASA STORE | OMOR (عُمْر)</strong> بحماية بيانات المستخدمين وعدم كشف أي معلومات شخصية أو تعريفية حساسة للعامة.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm">
              <li>لا يؤدي مسح رمز QR العام أبدًا إلى كشف رقم هاتف المالك أو عنوانه أو IMEI بالكامل أو الفواتير الخاصة.</li>
              <li>لا يُستخدم رقم IMEI كمفتاح أساسي في قاعدة البيانات؛ لكل جهاز معرّف داخلي مستقل ورمز عام آمن.</li>
              <li>يتحكم المالك بشكل كامل في إظهار أو إخفاء حالة الجهاز، سجل الصيانة، الضمان، أو الرقم التسلسلي المقنّع.</li>
              <li>عند نقل الملكية، لا تُعرض بيانات المالك السابق للمشتري الجديد أو للعامة.</li>
              <li>
                <strong>الإعلانات وملفات تعريف الارتباط (Google AdSense & Cookies):</strong> قد نستخدم إعلانات Google AdSense أو روابط تسويق بالعمولة؛ للاطلاع على تفاصيل ملفات الارتباط وتعطيل التخصيص راجع{' '}
                <Link to="/cookies" className="text-[#8F6D14] dark:text-[#D4AF37] underline font-bold">
                  سياسة ملفات تعريف الارتباط (Cookies)
                </Link>
                .
              </li>
            </ul>
          </div>
        </section>

        {currentUser && (
          <section className="rounded-2xl border border-rose-500/30 bg-white dark:bg-[#141923] p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-rose-500">
              <Trash2 className="w-5 h-5" />
              <h3>حذف الحساب وإخفاء البيانات</h3>
            </div>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              عند تأكيد الحذف سيتم تعطيل وصول الحساب وإخفاء بياناتك الشخصية وإيقاف الملفات العامة لأجهزتك المسجلة. اكتب «حذف حسابي» للتأكيد.
            </p>
            <form onSubmit={handleDelete} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="اكتب: حذف حسابي"
                className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
              <button
                type="submit"
                disabled={confirmText.trim() !== 'حذف حسابي'}
                className="min-h-[44px] px-5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-40"
              >
                تأكيد حذف الحساب
              </button>
            </form>
            {deletedMsg && <div className="text-xs text-emerald-500">{deletedMsg}</div>}
          </section>
        )}
      </div>
    </AppShell>
  );
};

export const HelpCenterPage: React.FC = () => {
  const faqs = [
    {
      q: 'ما هو المعرّف الرقمي OMR وهل يكشف رقم IMEI الخاص بي؟',
      a: 'معرّف OMR هو رقم مستقل غير قابل للتكرار يُنشأ لجهازك داخل المنصة. رقم IMEI والفواتير يبقيان في الخزينة الخاصة ولا يظهران عند مسح رمز QR العام.',
    },
    {
      q: 'كيف يتم توثيق الصيانة؟',
      a: 'يسجل الفني تفاصيل العطل والقطع المستبدلة والصور، ثم يصلك إشعار للموافقة. لا يظهر السجل في ملف الجهاز العام إلا بعد موافقتك، ولا يُسمح بتعديله لاحقًا إلا بإنشاء سجل تصحيح واضح.',
    },
    {
      q: 'كيف أنقل ملكية جهاز عند بيعه؟',
      a: 'من صفحة «نقل الملكية»، اختر الجهاز لتوليد رمز نقل مؤقت صالح لـ 15 دقيقة. يسجل المشتري الدخول ويدخل الرمز للموافقة، ثم تؤكد العملية لإتمام النقل وإبطال الرمز.',
    },
    {
      q: 'هل خدمات المنصة مجانية للمستخدمين؟',
      a: 'نعم، تسجيل الأجهزة وسجلاتها ورمز QR ونقل الملكية والفحص الاسترشادي مجانية 100% للمستخدمين العاديين بدون أي رسوم مخفية، مع توفر باقات وخدمات احترافية اختيارية لفنيي الصيانة والمتاجر.',
    },
  ];

  return (
    <AppShell title="مركز المساعدة">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Technical Support Contact Card */}
        <section className="rounded-2xl border border-[#D4AF37]/40 bg-white dark:bg-[#141923] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                الدعم الفني المباشر — SASA STORE OMOR
              </h2>
              <p className="mt-1 text-xs text-[#687182] dark:text-[#8E97A8]">
                متاح للاستفسارات، توثيق الحسابات، ومساعدة المستخدمين عبر الواتساب والمكالمات الهاتفية على الرقم:
              </p>
              <div className="mt-2 font-mono-code text-lg font-extrabold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums" dir="ltr">
                01214899889
              </div>
            </div>

            <SupportContactButtons variant="card" className="shrink-0" />
          </div>
        </section>

        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
            <h2>الأسئلة الشائعة ودليل الاستخدام</h2>
          </div>

          <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
            {faqs.map((item) => (
              <div key={item.q} className="py-4">
                <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">{item.q}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <AppShell title="الشروط والأحكام">
      <div className="max-w-3xl mx-auto rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
          الشروط والأحكام — SASA STORE | OMOR
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
          <p>
            1. يلتزم المستخدمون والفنيون والمتاجر بإدخال بيانات صحيحة، وتخضع السجلات للمراجعة عند وجود بلاغات.
          </p>
          <p>
            2. لا تضمن المنصة حالة الجهاز المادية تلقائيًا؛ تعرض المنصة درجات توثيق واضحة بناءً على المستندات وسجلات الصيانة المعتمدة فقط.
          </p>
          <p>
            3. سوق OMOR MARKET منصة لعرض الأجهزة بسجلها الرقمي ولا يتضمن دفعًا إلكترونيًا؛ تتم المعاينة والتسليم بمسؤولية الأطراف مع استخدام أداة نقل الملكية الرقمية.
          </p>
          <p>
            4. يُحظر تزييف الفواتير أو التقييمات الوهمية أو محاولات الاحتيال، ويحق للإدارة تعطيل الحسابات المخالفة.
          </p>
          <p>
            5. بعض الروابط في صفحة «العروض والمنتجات» قد تكون روابط تسويق بالعمولة لمواقع خارجية تخضع لشروط وسياسات تلك المواقع.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

type AdminTab =
  | 'overview'
  | 'monetization'
  | 'users'
  | 'devices'
  | 'repairs'
  | 'technicians'
  | 'stores'
  | 'marketplace'
  | 'reports'
  | 'transfers'
  | 'notifications'
  | 'audit'
  | 'settings';

export const AdminDashboardPage: React.FC = () => {
  const {
    currentUser,
    users,
    devices,
    repairRecords,
    technicians,
    listings,
    reports,
    transfers,
    notifications,
    auditLogs,
    inspections,
    subscriptions,
    platformSettings,
    adminUpdateUserStatus,
    adminUpdateUserRole,
    adminToggleTechVerification,
    adminUpdateReportStatus,
    adminUpdatePlatformSettings,
  } = useApp();

  const [tab, setTab] = useState<AdminTab>('overview');

  if (currentUser?.role !== 'admin') {
    return (
      <AppShell title="لوحة الإدارة">
        <div className="max-w-md mx-auto rounded-2xl border border-rose-500/30 bg-white dark:bg-[#141923] p-8 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold">وصول محظور — صلاحية مدير النظام فقط</h2>
          <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
            هذه الصفحة محمية بصلاحيات الإدارة على مستوى الجلسة وقاعدة البيانات (RLS).
          </p>
          <Link to="/dashboard" className="inline-block text-xs font-bold text-[#D4AF37] underline">
            العودة للرئيسية
          </Link>
        </div>
      </AppShell>
    );
  }

  const stores = users.filter((u) => u.role === 'store');

  return (
    <AppShell title="لوحة إدارة النظام — Admin">
      <div className="space-y-6">
        {/* Top Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
            إدارة النظام، المستخدمين، الفنيين، الفحوصات والاشتراكات الاختيارية
          </div>
          <Link
            to="/admin-portal"
            className="min-h-[38px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-extrabold inline-flex items-center hover:bg-[#E2C25B]"
          >
            فتح بوابة الإدارة المتقدمة (الأرباح والاشتراكات)
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            ['المستخدمون', users.length],
            ['الأجهزة المسجلة', devices.length],
            ['الفنيون والمراكز', technicians.length],
            ['المتاجر', stores.length],
            ['إعلانات السوق', listings.length],
            ['سجلات الصيانة', repairRecords.length],
            ['فحوصات ما قبل الشراء', inspections.length],
            ['اشتراكات Pro النشطة', subscriptions.filter((s) => s.status === 'active').length],
            ['البلاغات', reports.length],
            ['نقل الملكية', transfers.length],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4"
            >
              <div className="text-xs text-[#687182] dark:text-[#8E97A8]">{label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{val}</div>
            </div>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {(
            [
              ['overview', 'ملخص'],
              ['monetization', 'المدفوعات والأرباح Pro'],
              ['users', 'Users'],
              ['devices', 'Devices'],
              ['repairs', 'Repair Records'],
              ['technicians', 'Technicians'],
              ['stores', 'Stores'],
              ['marketplace', 'Marketplace'],
              ['reports', 'Reports'],
              ['transfers', 'Transfers'],
              ['notifications', 'Notifications'],
              ['audit', 'Audit Logs'],
              ['settings', 'Settings'],
            ] as [AdminTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'bg-[#D4AF37] text-[#0B1220] font-bold'
                  : 'border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] text-[#4A5363] dark:text-[#C5CCD8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 overflow-x-auto">
          {tab === 'overview' && (
            <div className="space-y-4 text-xs text-[#4A5363] dark:text-[#C5CCD8]">
              <div className="flex items-center gap-2 text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                <Shield className="w-5 h-5 text-[#D4AF37]" />
                <span>نظرة عامة على النظام والخدمات الاختيارية</span>
              </div>
              <p>
                الخدمات الأساسية لتسجيل الأجهزة وQR ونقل الملكية وفحص ما قبل الشراء مجانية 100% للمستخدمين العاديين، مع توفر خدمات واشتراكات Pro اختيارية لفنيي الصيانة والمتاجر عبر قسم <Link to="/services" className="text-[#D4AF37] underline font-bold">/services</Link>.
              </p>
              <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-1.5">
                <div className="font-bold text-[#11161F] dark:text-[#F3F5F8]">الخدمات المدفوعة الاختيارية المفعّلة حاليًا:</div>
                <p>• باقات فني Pro ومراكز الصيانة · باقات المتاجر والتجار · تمييز الإعلانات · أولوية الظهور وطلبات الصيانة · ربط B2B للمؤسسات.</p>
              </div>
            </div>
          )}

          {tab === 'monetization' && <AdminMonetizationCenter authMode="app" />}

          {tab === 'users' && (
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#DCE0E7] dark:border-[#252C38] text-[#687182] dark:text-[#8E97A8]">
                  <th className="py-2.5">الاسم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 font-semibold">{u.fullName}</td>
                    <td dir="ltr" className="text-right font-mono-code">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u.id === currentUser.id}
                        onChange={(e) => void adminUpdateUserRole(u.id, e.target.value as UserRole)}
                        className="min-h-[34px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2 text-xs disabled:opacity-60"
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{u.accountStatus}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() =>
                            void adminUpdateUserStatus(
                              u.id,
                              u.accountStatus === 'active' ? 'suspended' : 'active'
                            )
                          }
                          className="text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline"
                        >
                          {u.accountStatus === 'active' ? 'تعطيل' : 'تفعيل'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'devices' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {devices.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold">{d.brand} {d.deviceName}</span> ·{' '}
                    <span className="font-mono-code">{d.deviceCode}</span>
                  </div>
                  <span>{d.status}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'repairs' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {repairRecords.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <strong>{r.issueType}</strong> — {r.centerName}
                  </div>
                  <span>{r.ownerApproved ? 'معتمد' : 'بانتظار الموافقة'}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'technicians' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {technicians.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{t.centerName}</div>
                    <div className="text-[#687182] dark:text-[#8E97A8]">{t.displayName} · {t.governorate}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void adminToggleTechVerification(t.id)}
                    className="min-h-[36px] px-3 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] font-bold"
                  >
                    {t.isVerified ? 'موثق (إلغاء)' : 'توثيق المركز'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'stores' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {stores.map((s) => (
                <div key={s.id} className="py-3 flex justify-between">
                  <span>{s.storeName || s.fullName}</span>
                  <span>{s.city}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'marketplace' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {listings.map((l) => (
                <div key={l.id} className="py-3 flex justify-between">
                  <span>{l.title}</span>
                  <span>{l.status}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'reports' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {reports.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">
                      {r.reportCode} · {REPORT_REASON_LABELS[r.reason]}
                    </div>
                    <div className="text-[#687182] dark:text-[#8E97A8]">
                      {r.targetLabel} — {r.description}
                    </div>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) => void adminUpdateReportStatus(r.id, e.target.value as ReportStatus)}
                    className="min-h-[36px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5"
                  >
                    {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {tab === 'transfers' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {transfers.length === 0 ? (
                <p className="text-[#687182] dark:text-[#8E97A8]">لا توجد عمليات نقل مسجلة.</p>
              ) : (
                transfers.map((t) => (
                  <div key={t.id} className="py-3 flex justify-between">
                    <span>{t.deviceId}</span>
                    <span>{t.status}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
              إجمالي الإشعارات النشطة للحساب الحالي: {notifications.length}
            </div>
          )}

          {tab === 'audit' && (
            <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834] text-xs">
              {auditLogs.map((a) => (
                <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{a.action}</strong> ({a.entityType}) — {a.details}
                  </div>
                  <span className="tabular-nums text-[#7A8394]">
                    {formatArabicDateTime(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between py-1">
                <span>السماح بإنشاء حسابات جديدة</span>
                <input
                  type="checkbox"
                  checked={platformSettings.allowNewRegistrations}
                  onChange={(e) =>
                    void adminUpdatePlatformSettings({
                      ...platformSettings,
                      allowNewRegistrations: e.target.checked,
                    })
                  }
                  className="accent-[#D4AF37]"
                />
              </label>
              <label className="flex items-center justify-between py-1">
                <span>تفعيل سوق OMOR MARKET</span>
                <input
                  type="checkbox"
                  checked={platformSettings.marketplaceEnabled}
                  onChange={(e) =>
                    void adminUpdatePlatformSettings({
                      ...platformSettings,
                      marketplaceEnabled: e.target.checked,
                    })
                  }
                  className="accent-[#D4AF37]"
                />
              </label>
              <label className="flex items-center justify-between py-1">
                <span>اشتراط توثيق الفنيين قبل اعتماد العلامة</span>
                <input
                  type="checkbox"
                  checked={platformSettings.requireTechVerification}
                  onChange={(e) =>
                    void adminUpdatePlatformSettings({
                      ...platformSettings,
                      requireTechVerification: e.target.checked,
                    })
                  }
                  className="accent-[#D4AF37]"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-center">
      <BrandLogo className="mb-6" />
      <div className="font-mono-code text-5xl font-bold text-[#D4AF37]">404</div>
      <h1 className="mt-3 text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
        الصفحة المطلوبة غير موجودة
      </h1>
      <p className="mt-2 text-xs text-[#687182] dark:text-[#8E97A8] max-w-sm">
        تأكد من صحة الرابط أو ارجع إلى الرئيسية لاستعراض أجهزتك وسجلاتها.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/welcome"
          className="min-h-[44px] inline-flex items-center px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold"
        >
          الصفحة الرئيسية
        </Link>
        <Link
          to="/articles"
          className="min-h-[44px] inline-flex items-center px-5 rounded-xl border border-[#C8CFD9] dark:border-[#333C4B] text-xs font-semibold"
        >
          المقالات والأدلة
        </Link>
        <Link
          to="/offers"
          className="min-h-[44px] inline-flex items-center px-5 rounded-xl border border-[#C8CFD9] dark:border-[#333C4B] text-xs font-semibold"
        >
          العروض والمنتجات
        </Link>
        <Link
          to="/scan"
          className="min-h-[44px] inline-flex items-center px-5 rounded-xl border border-[#C8CFD9] dark:border-[#333C4B] text-xs font-semibold"
        >
          مسح QR
        </Link>
      </div>
    </div>
  );
};

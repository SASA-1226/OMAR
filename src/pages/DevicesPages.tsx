import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  History,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Store,
  Trash2,
  Wrench,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { QRCodeCard } from '../components/QRCodeCard';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  DEVICE_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  PLATFORM_TRUST_DISCLAIMER,
  TRUST_SOURCE_LABELS,
  VERIFICATION_TIER_LABELS,
  formatArabicDate,
  formatArabicDateTime,
  getDaysRemaining,
} from '../lib/labels';
import { fuzzyArabicMatch, maskSensitiveCode, validateImeiLuhn } from '../lib/security';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_PRESETS,
  addDaysToIsoDate,
  getTodayIsoDate,
} from '../lib/smartNotifications';
import { addDeviceSchema, validateUploadFile } from '../lib/validation';
import type { DeviceCategorySlug, DeviceCondition, EventType, MaintenanceCategory } from '../types/omor';

export const DevicesListPage: React.FC = () => {
  const { myDevices } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const filtered = useMemo(
    () =>
      myDevices.filter((d) => {
        if (catFilter !== 'all' && d.category !== catFilter) return false;
        return fuzzyArabicMatch(`${d.brand} ${d.deviceName} ${d.model} ${d.deviceCode}`, query);
      }),
    [myDevices, catFilter, query]
  );

  return (
    <AppShell title="أجهزتي">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              خزينة الأجهزة الرقمية ({myDevices.length})
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              كل جهاز يحصل على معرّف مستقل وملف عام محكوم بإعدادات خصوصيتك.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/devices/new')}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            إضافة جهاز جديد
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A8394] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الجهاز، الشركة، الموديل، أو معرّف OMR..."
              className="w-full min-h-[44px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] pr-10 pl-4 text-sm"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3.5 text-sm"
          >
            <option value="all">كل أنواع الأجهزة</option>
            {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center">
            <p className="text-sm text-[#687182] dark:text-[#8E97A8] mb-4">
              لا توجد أجهزة مطابقة حاليًا.
            </p>
            <button
              type="button"
              onClick={() => navigate('/devices/new')}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 text-xs font-bold text-[#0B1220]"
            >
              <Plus className="w-4 h-4" />
              تسجيل أول جهاز
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((device) => (
              <Link
                key={device.id}
                to={`/devices/${device.id}`}
                className="group rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden hover:border-[#D4AF37]/60 transition-colors flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#EEF0F4] dark:bg-[#10151F]">
                  <ImageWithFallback
                    src={device.imageUrl}
                    alt={`${device.brand} ${device.deviceName}`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                      <span>{CATEGORY_LABELS[device.category]}</span>
                      <span
                        className={
                          device.status === 'reported_stolen'
                            ? 'font-bold text-rose-500'
                            : ''
                        }
                      >
                        {DEVICE_STATUS_LABELS[device.status]}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                      {device.brand} {device.deviceName}
                    </h3>
                    <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-0.5 line-clamp-1">
                      {device.model}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between text-xs">
                    <span className="font-mono-code text-[#687182] dark:text-[#8E97A8]">{device.deviceCode}</span>
                    <span className="font-semibold text-[#8F6D14] dark:text-[#D4AF37]">
                      {VERIFICATION_TIER_LABELS[device.verificationTier]}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const AddDevicePage: React.FC = () => {
  const { addDevice } = useApp();
  const navigate = useNavigate();

  const [category, setCategory] = useState<DeviceCategorySlug>('smartphone');
  const [brand, setBrand] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [model, setModel] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [condition, setCondition] = useState<DeviceCondition>('good');
  const [sellerName, setSellerName] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/demo_phone_pro_1795361833294.jpg');
  const [warrantyIssuer, setWarrantyIssuer] = useState('');
  const [warrantyStart, setWarrantyStart] = useState('');
  const [warrantyEnd, setWarrantyEnd] = useState('');
  const [warrantyNumber, setWarrantyNumber] = useState('');
  const [error, setError] = useState('');

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, false);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInvoicePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, true);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setInvoiceName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = addDeviceSchema.safeParse({
      category,
      brand,
      deviceName,
      model,
      modelNumber: modelNumber || undefined,
      serialNumber: serialNumber || undefined,
      imei: imei || undefined,
      purchaseDate: purchaseDate || undefined,
      condition,
      sellerName: sellerName || undefined,
      privateNotes: privateNotes || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'يرجى التحقق من البيانات المدخلة');
      return;
    }

    const res = await addDevice({
      ...parsed.data,
      imageUrl,
      invoiceName: invoiceName || undefined,
      warrantyIssuer: warrantyIssuer || undefined,
      warrantyStart: warrantyStart || undefined,
      warrantyEnd: warrantyEnd || undefined,
      warrantyNumber: warrantyNumber || undefined,
    });
    if (!res.ok || !res.data) {
      setError(res.error || 'تعذر حفظ الجهاز');
      return;
    }
    navigate(`/devices/${res.data.id}`);
  };

  return (
    <AppShell title="إضافة جهاز جديد">
      <div className="max-w-3xl mx-auto">
        <Link to="/devices" className="inline-flex items-center gap-1.5 text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37] mb-4">
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة إلى أجهزتي
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              إصدار هوية رقمية لجهاز جديد
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8] mt-1">
              يُمنح الجهاز رقمًا داخليًا غير قابل للتكرار ورمز QR آمنًا. الأرقام التسلسلية وIMEI والفواتير تبقى خاصة بك.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">نوع الجهاز</label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value as DeviceCategorySlug;
                  setCategory(val);
                  if (val === 'laptop' || val === 'desktop') {
                    setImageUrl('/src/assets/images/demo_laptop_air_1795361832982.jpg');
                  } else {
                    setImageUrl('/src/assets/images/demo_phone_pro_1795361833294.jpg');
                  }
                }}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">الشركة المصنعة</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="مثال: Apple، Samsung، Dell"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">اسم الجهاز</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="مثال: iPhone 16 Pro"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">الموديل والسعة</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="مثال: 256GB Natural Titanium"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">رقم الموديل (اختياري)</label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="مثال: MYWV3LL/A"
                dir="ltr"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">حالة الجهاز</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as DeviceCondition)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm"
              >
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">تاريخ الشراء (اختياري)</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">صورة الجهاز</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImagePick}
                className="w-full text-xs text-[#687182] dark:text-[#8E97A8] file:ml-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#EEF0F4] dark:file:bg-[#232A38] file:text-xs file:font-semibold"
              />
            </div>
          </div>

          {/* Private Protected Fields */}
          <div className="pt-5 border-t border-[#DCE0E7] dark:border-[#252C38] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E2430] dark:text-[#DCE1EA]">
              <Lock className="w-4 h-4 text-[#D4AF37]" />
              <span>بيانات خاصة محمية (لا تُكشف في QR العام أبدًا)</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Serial Number (اختياري)</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">IMEI للهواتف — 15 رقمًا (اختياري)</label>
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  maxLength={15}
                  dir="ltr"
                  placeholder="358491029384712"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
                />
                {imei.trim().length > 0 && (() => {
                  const luhn = validateImeiLuhn(imei);
                  if (!luhn.isNumeric15) {
                    return (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
                        متبقي {Math.max(0, 15 - imei.replace(/\D/g, '').length)} أرقام للتحقق القياسي.
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`text-[11px] mt-1 block ${
                        luhn.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {luhn.reason}
                    </span>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">اسم البائع / المتجر (اختياري)</label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">فاتورة الشراء (JPG/PNG/PDF - 5MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleInvoicePick}
                  className="w-full text-xs text-[#687182] dark:text-[#8E97A8] file:ml-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#EEF0F4] dark:file:bg-[#232A38] file:text-xs file:font-semibold"
                />
                {invoiceName && (
                  <span className="text-[11px] text-emerald-500 mt-1 block">تم اختيار: {invoiceName}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">ملاحظات المستخدم الخاصة</label>
              <textarea
                rows={2}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>
          </div>

          {/* Optional Warranty at registration */}
          <div className="pt-5 border-t border-[#DCE0E7] dark:border-[#252C38] space-y-4">
            <div className="text-xs font-bold text-[#1E2430] dark:text-[#DCE1EA]">
              بيانات الضمان المبدئية (اختياري)
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">الجهة المصدرة للضمان</label>
                <input
                  type="text"
                  value={warrantyIssuer}
                  onChange={(e) => setWarrantyIssuer(e.target.value)}
                  placeholder="مثال: الوكيل الرسمي"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">رقم الضمان</label>
                <input
                  type="text"
                  value={warrantyNumber}
                  onChange={(e) => setWarrantyNumber(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm font-mono-code"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">تاريخ بداية الضمان</label>
                <input
                  type="date"
                  value={warrantyStart}
                  onChange={(e) => setWarrantyStart(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">تاريخ انتهاء الضمان</label>
                <input
                  type="date"
                  value={warrantyEnd}
                  onChange={(e) => setWarrantyEnd(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/devices')}
              className="min-h-[44px] px-5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B]"
            >
              حفظ وإصدار الهوية الرقمية
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    devices,
    myDevices,
    currentUser,
    events,
    warranties,
    repairRecords,
    maintenanceReminders,
    inspections,
    updateDeviceVisibility,
    rotateDeviceToken,
    updateDeviceCondition,
    updateDevicePrivateData,
    reportDeviceLostOrStolen,
    clearDeviceLostOrStolen,
    addMaintenanceReminder,
    completeMaintenanceReminder,
    deleteMaintenanceReminder,
    deleteOrArchiveDevice,
  } = useApp();

  const device = devices.find((d) => d.id === id);

  const [editingVault, setEditingVault] = useState(false);
  const [vaultSerial, setVaultSerial] = useState(device?.privateData.serialNumber || '');
  const [vaultImei, setVaultImei] = useState(device?.privateData.imei || '');
  const [vaultSeller, setVaultSeller] = useState(device?.privateData.sellerName || '');
  const [vaultInvoice, setVaultInvoice] = useState(device?.privateData.invoiceName || '');
  const [vaultNotes, setVaultNotes] = useState(device?.privateData.privateNotes || '');
  const [vaultMsg, setVaultMsg] = useState('');
  const [vaultErr, setVaultErr] = useState('');

  const [lostFormOpen, setLostFormOpen] = useState(false);
  const [lostNote, setLostNote] = useState('');
  const [lostFeedback, setLostFeedback] = useState('');

  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('general_inspection');
  const [maintInterval, setMaintInterval] = useState(90);
  const [maintNextDate, setMaintNextDate] = useState(() => addDaysToIsoDate(getTodayIsoDate(), 90));
  const [maintNotes, setMaintNotes] = useState('');
  const [maintFeedback, setMaintFeedback] = useState('');
  const [maintErr, setMaintErr] = useState('');
  const [qrMsg, setQrMsg] = useState('');
  const [shareToast, setShareToast] = useState('');

  React.useEffect(() => {
    if (device) {
      setVaultSerial(device.privateData.serialNumber || '');
      setVaultImei(device.privateData.imei || '');
      setVaultSeller(device.privateData.sellerName || '');
      setVaultInvoice(device.privateData.invoiceName || '');
      setVaultNotes(device.privateData.privateNotes || '');
    }
  }, [device]);

  if (!device) {
    return (
      <AppShell title="تفاصيل الجهاز">
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center">
          <p className="text-sm text-[#687182] dark:text-[#8E97A8] mb-4">الجهاز غير موجود أو تم حذفه.</p>
          <Link to="/devices" className="text-xs font-bold text-[#D4AF37] underline">
            العودة إلى أجهزتي
          </Link>
        </div>
      </AppShell>
    );
  }

  const isOwner = currentUser?.id === device.ownerId;
  const deviceEvents = events.filter((e) => e.deviceId === device.id);
  const deviceWarranties = warranties.filter((w) => w.deviceId === device.id);
  const deviceRepairs = repairRecords.filter((r) => r.deviceId === device.id);
  const deviceReminders = maintenanceReminders.filter((r) => r.deviceId === device.id);
  const deviceInspections = inspections.filter((i) => i.deviceId === device.id);
  const categoryPresets = MAINTENANCE_CATEGORY_PRESETS[device.category] || MAINTENANCE_CATEGORY_PRESETS.other;

  // Vault completeness checklist
  const protectionChecklist = [
    { label: 'تسجيل السيريال أو IMEI', done: Boolean(device.privateData.serialNumber || device.privateData.imei) },
    { label: 'إرفاق فاتورة الشراء', done: Boolean(device.privateData.invoiceName) },
    { label: 'توثيق ضمان للجهاز', done: deviceWarranties.length > 0 },
    { label: 'تفعيل صفحة التحقق QR', done: device.visibility.isPublic },
    { label: 'فحص أو توثيق فني', done: device.verificationTier === 'technician_verified' },
  ];
  const protectionPercent = Math.round(
    (protectionChecklist.filter((c) => c.done).length / protectionChecklist.length) * 100
  );

  const handleExportPassportJson = () => {
    const payload = {
      platform: 'SASA STORE | OMOR (عُمْر)',
      exportedAt: new Date().toISOString(),
      device: {
        deviceCode: device.deviceCode,
        publicToken: device.publicToken,
        category: device.category,
        brand: device.brand,
        deviceName: device.deviceName,
        model: device.model,
        modelNumber: device.modelNumber,
        purchaseDate: device.purchaseDate,
        condition: device.condition,
        status: device.status,
        verificationTier: device.verificationTier,
        privateData: isOwner ? device.privateData : undefined,
      },
      warranties: deviceWarranties,
      approvedRepairs: deviceRepairs.filter((r) => r.ownerApproved),
      timelineEvents: deviceEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMOR-${device.deviceCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultErr('');
    setVaultMsg('');
    const res = await updateDevicePrivateData(device.id, {
      serialNumber: vaultSerial,
      imei: vaultImei,
      sellerName: vaultSeller,
      invoiceName: vaultInvoice,
      privateNotes: vaultNotes,
    });
    if (!res.ok) {
      setVaultErr(res.error || 'تعذر حفظ التعديلات');
      return;
    }
    setVaultMsg('تم تحديث بيانات الخزينة الخاصة بنجاح.');
    setEditingVault(false);
  };

  const handleSharePublicReport = async () => {
    const publicUrl = `${window.location.origin}/d/${device.publicToken}`;
    const shareTitle = `${device.brand} ${device.deviceName} (${device.deviceCode})`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ملف التحقق العام — ${shareTitle}`,
          text: `راجع السجل العام للجهاز ${shareTitle} على منصة SASA STORE | OMOR`,
          url: publicUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareToast('تم نسخ رابط التقرير العام للمشاركة.');
      setTimeout(() => setShareToast(''), 2500);
    } catch {
      setShareToast(`رابط المشاركة: ${publicUrl}`);
    }
  };

  const handleVaultInvoicePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadFile(file, true);
    if (!check.ok) {
      setVaultErr(check.error);
      return;
    }
    setVaultInvoice(file.name);
    setVaultErr('');
  };

  return (
    <AppShell title={`${device.brand} ${device.deviceName}`}>
      <div className="space-y-6">
        {device.status === 'reported_stolen' && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  تنبيه أمني نشط: هذا الجهاز مُبلغ عن فقدانه أو سرقته
                </h3>
                <p className="text-xs text-[#363E4D] dark:text-[#C5CCD8] mt-1">
                  تم إيقاف عرضه في السوق ومنع نقل ملكيته، ويظهر تحذير فوري لأي شخص يفحص رمز QR أو السيريال/IMEI.
                  {device.lostReportNote ? ` (${device.lostReportNote})` : ''}
                </p>
              </div>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={async () => {
                  const res = await clearDeviceLostOrStolen(device.id);
                  if (res.ok) setLostFeedback('تم إلغاء بلاغ الفقدان وعاد الجهاز للحالة النشطة.');
                }}
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0"
              >
                تم العثور عليه — إلغاء البلاغ
              </button>
            )}
          </div>
        )}

        {lostFeedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            {lostFeedback}
          </div>
        )}

        {shareToast && (
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-3 text-xs text-[#8F6D14] dark:text-[#D4AF37]">
            {shareToast}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/devices" className="inline-flex items-center gap-1.5 text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37]">
              <ArrowLeft className="w-4 h-4 rotate-180" />
              العودة إلى أجهزتي
            </Link>
            {myDevices.length > 1 && (
              <select
                value={device.id}
                onChange={(e) => navigate(`/devices/${e.target.value}`)}
                aria-label="التبديل السريع بين أجهزتك"
                className="min-h-[38px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3 text-xs font-semibold"
              >
                {myDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    التبديل إلى: {d.brand} {d.deviceName} ({d.deviceCode})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/inspections?deviceId=${device.id}`}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
            >
              <ClipboardCheck className="w-4 h-4" />
              فحص قبل الشراء ({deviceInspections.length})
            </Link>
            <Link
              to={`/v3/diagnose?deviceId=${device.id}`}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <Stethoscope className="w-4 h-4 text-[#D4AF37]" />
              تشخيص عطل (AI)
            </Link>
            <Link
              to={`/v3/valuation?deviceId=${device.id}`}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20"
            >
              تقدير السعر
            </Link>
            <Link
              to={`/devices/${device.id}/lifecycle`}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <History className="w-4 h-4 text-[#D4AF37]" />
              السجل الزمني ({deviceEvents.length})
            </Link>
            <Link
              to={`/d/${device.publicToken}`}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <Eye className="w-4 h-4" />
              معاينة الملف العام
            </Link>
            <button
              type="button"
              onClick={handleSharePublicReport}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <Share2 className="w-4 h-4 text-[#D4AF37]" />
              مشاركة التقرير
            </button>
            <button
              type="button"
              onClick={handleExportPassportJson}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
              نسخة احتياطية JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-3.5 text-xs font-semibold hover:border-[#D4AF37]"
            >
              <Printer className="w-4 h-4" />
              طباعة الجواز
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Device Overview & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden">
              <div className="aspect-[16/9] w-full bg-[#EEF0F4] dark:bg-[#10151F]">
                <ImageWithFallback
                  src={device.imageUrl}
                  alt={device.deviceName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 sm:p-6">
                <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  {CATEGORY_LABELS[device.category]} ·{' '}
                  <span className={device.status === 'reported_stolen' ? 'font-bold text-rose-500' : ''}>
                    {DEVICE_STATUS_LABELS[device.status]}
                  </span>{' '}
                  · {VERIFICATION_TIER_LABELS[device.verificationTier]}
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">
                  {device.brand} {device.deviceName}
                </h2>
                <p className="text-sm text-[#4A5363] dark:text-[#C5CCD8]">{device.model}</p>

                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#E8EBF0] dark:border-[#222834] text-xs">
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">رقم السجل</dt>
                    <dd className="mt-1 font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                      {device.deviceCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">رقم الموديل</dt>
                    <dd className="mt-1 font-mono-code">{device.modelNumber || 'غير مضاف'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">تاريخ الشراء</dt>
                    <dd className="mt-1 tabular-nums">{formatArabicDate(device.purchaseDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">الحالة المسجلة</dt>
                    <dd className="mt-1 font-semibold">{CONDITION_LABELS[device.condition]}</dd>
                  </div>
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">الضمانات المرتبطة</dt>
                    <dd className="mt-1 tabular-nums">{deviceWarranties.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[#687182] dark:text-[#8E97A8]">فحوصات QR العامة</dt>
                    <dd className="mt-1 tabular-nums">{device.publicScanCount || 0} مرة</dd>
                  </div>
                </dl>

                {isOwner && (
                  <div className="mt-6 pt-5 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap gap-2 no-print">
                    <button
                      type="button"
                      onClick={() => navigate(`/repairs/request?deviceId=${device.id}`)}
                      className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#1B2230] dark:bg-[#232A38] text-[#F3F5F8] border border-transparent dark:border-[#333C4B] px-4 text-xs font-semibold hover:bg-[#273042] dark:hover:bg-[#2D3648]"
                    >
                      <Wrench className="w-4 h-4 text-[#D4AF37]" />
                      طلب توثيق صيانة
                    </button>
                    <button
                      type="button"
                      disabled={device.status === 'reported_stolen'}
                      onClick={() => navigate(`/market/new?deviceId=${device.id}`)}
                      className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold hover:border-[#D4AF37] disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Store className="w-4 h-4" />
                      عرض للبيع في السوق
                    </button>
                    <button
                      type="button"
                      disabled={device.status === 'reported_stolen'}
                      onClick={() => navigate(`/transfer?deviceId=${device.id}`)}
                      className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] px-4 text-xs font-semibold hover:border-[#D4AF37] disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      نقل الملكية
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Vault Readiness Indicator */}
            {isOwner && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3 no-print">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#11161F] dark:text-[#F3F5F8]">جاهزية حماية وقوة توثيق الجهاز</span>
                  <span className="font-mono-code text-[#8F6D14] dark:text-[#D4AF37]">{protectionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#EEF0F4] dark:bg-[#1F2633] overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] rounded-full transition-all"
                    style={{ width: `${protectionPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {protectionChecklist.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                        item.done
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[#EEF0F4] dark:bg-[#1F2633] text-[#687182] dark:text-[#8E97A8]'
                      }`}
                    >
                      {item.done ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Periodic Maintenance Smart Schedules */}
            {isOwner && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4 no-print">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                      <CalendarClock className="w-4 h-4 text-[#D4AF37]" />
                      <span>جدول الصيانة الدورية والتنبيهات ({deviceReminders.length})</span>
                    </div>
                    <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                      يذكّرك النظام تلقائيًا بمواعيد التنظيف والفحص الدوري لتفادي الأعطال المفاجئة ورفع قيمة الجهاز.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaintForm((v) => !v);
                      setMaintErr('');
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1 rounded-xl bg-[#D4AF37] px-3 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showMaintForm ? 'إغلاق' : 'جدولة صيانة دورية'}
                  </button>
                </div>

                {maintFeedback && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                    {maintFeedback}
                  </div>
                )}

                {showMaintForm && (
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-3 text-xs">
                    <div>
                      <div className="font-bold text-[#1E2430] dark:text-[#DCE1EA] mb-2">
                        قوالب سريعة مقترحة لهذا النوع من الأجهزة:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryPresets.map((preset) => (
                          <button
                            key={preset.title}
                            type="button"
                            onClick={() => {
                              setMaintTitle(preset.title);
                              setMaintCategory(preset.category);
                              setMaintInterval(preset.intervalDays);
                              setMaintNextDate(addDaysToIsoDate(getTodayIsoDate(), preset.intervalDays));
                              setMaintNotes(preset.notes);
                              setMaintErr('');
                            }}
                            className="rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-2.5 py-1.5 text-[11px] font-medium hover:border-[#D4AF37]"
                          >
                            + {preset.title} (كل {preset.intervalDays} يوم)
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-[#DCE0E7] dark:border-[#252C38]">
                      <div className="sm:col-span-2">
                        <label className="block font-medium mb-1">اسم الصيانة أو الفحص الدوري</label>
                        <input
                          type="text"
                          value={maintTitle}
                          onChange={(e) => setMaintTitle(e.target.value)}
                          placeholder="مثال: تنظيف مراوح التبريد وفحص البطارية"
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">نوع الصيانة</label>
                        <select
                          value={maintCategory}
                          onChange={(e) => setMaintCategory(e.target.value as MaintenanceCategory)}
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        >
                          {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">التكرار الدوري</label>
                        <select
                          value={maintInterval}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMaintInterval(val);
                            setMaintNextDate(addDaysToIsoDate(getTodayIsoDate(), val));
                          }}
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        >
                          <option value={30}>كل شهر (30 يومًا)</option>
                          <option value={60}>كل شهرين (60 يومًا)</option>
                          <option value={90}>كل 3 أشهر (90 يومًا)</option>
                          <option value={180}>كل 6 أشهر (180 يومًا)</option>
                          <option value={365}>كل سنة (365 يومًا)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">تاريخ التنبيه القادم</label>
                        <input
                          type="date"
                          value={maintNextDate}
                          onChange={(e) => setMaintNextDate(e.target.value)}
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">ملاحظات (اختياري)</label>
                        <input
                          type="text"
                          value={maintNotes}
                          onChange={(e) => setMaintNotes(e.target.value)}
                          placeholder="مثال: عند مركز معتمد"
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        />
                      </div>
                    </div>

                    {maintErr && <div className="text-rose-500">{maintErr}</div>}

                    <button
                      type="button"
                      onClick={async () => {
                        const res = await addMaintenanceReminder({
                          deviceId: device.id,
                          title: maintTitle,
                          category: maintCategory,
                          intervalDays: maintInterval,
                          nextDueDate: maintNextDate,
                          notes: maintNotes,
                        });
                        if (!res.ok) {
                          setMaintErr(res.error || 'تعذر حفظ الموعد');
                          return;
                        }
                        setShowMaintForm(false);
                        setMaintTitle('');
                        setMaintNotes('');
                        setMaintFeedback('تمت جدولة الصيانة الدورية وسيقوم النظام بتذكيرك تلقائيًا قبل الموعد.');
                      }}
                      className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                    >
                      حفظ موعد الصيانة الدورية
                    </button>
                  </div>
                )}

                {deviceReminders.length === 0 ? (
                  <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 text-xs text-[#687182] dark:text-[#8E97A8]">
                    لا توجد جداول صيانة مخصصة لهذا الجهاز بعد. يمكنك اختيار أحد القوالب السريعة لإضافة أول تذكير دوري.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deviceReminders.map((rem) => {
                      const remDays = getDaysRemaining(rem.nextDueDate);
                      return (
                        <div
                          key={rem.id}
                          className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F1F3F6] dark:bg-[#0E131C] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[#11161F] dark:text-[#F3F5F8]">{rem.title}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                                  remDays !== null && remDays < 0
                                    ? 'bg-rose-500/15 text-rose-500'
                                    : remDays !== null && remDays <= 7
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {remDays === null
                                  ? formatArabicDate(rem.nextDueDate)
                                  : remDays < 0
                                    ? `متأخر ${Math.abs(remDays)} يوم`
                                    : remDays === 0
                                      ? 'مستحق اليوم'
                                      : `متبقي ${remDays} يوم`}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                              {MAINTENANCE_CATEGORY_LABELS[rem.category]} · يتكرر كل {rem.intervalDays} يوم · الموعد القادم:{' '}
                              <span className="tabular-nums font-semibold">{formatArabicDate(rem.nextDueDate)}</span>
                              {rem.lastCompletedAt && ` · آخر إتمام: ${formatArabicDate(rem.lastCompletedAt)}`}
                            </div>
                            {rem.notes && <div className="text-[11px] text-[#687182] dark:text-[#8E97A8]">{rem.notes}</div>}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await completeMaintenanceReminder(rem.id);
                                if (res.ok) {
                                  setMaintFeedback(
                                    `تم توثيق إتمام "${rem.title}" في السجل الزمني وجدولة الموعد القادم بعد ${rem.intervalDays} يومًا.`
                                  );
                                }
                              }}
                              className="min-h-[34px] px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                            >
                              تمت الصيانة ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteMaintenanceReminder(rem.id)}
                              className="min-h-[34px] px-2.5 rounded-lg border border-rose-500/30 text-rose-500 text-[11px] hover:bg-rose-500/10"
                              aria-label="حذف جدول الصيانة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Private Owner Vault */}
            {isOwner && (
              <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    <Lock className="w-4 h-4 text-[#D4AF37]" />
                    <span>الخزينة الخاصة للجهاز (للمالك فقط)</span>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVault((v) => !v);
                        setVaultErr('');
                        setVaultMsg('');
                      }}
                      className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 text-xs font-semibold hover:border-[#D4AF37]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {editingVault ? 'إلغاء التعديل' : 'تحديث / إرفاق فاتورة'}
                    </button>
                    <select
                      value={device.condition}
                      onChange={(e) => void updateDeviceCondition(device.id, e.target.value as DeviceCondition)}
                      className="min-h-[36px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 text-xs"
                      aria-label="تحديث حالة الجهاز"
                    >
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          الحالة: {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {vaultMsg && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                    {vaultMsg}
                  </div>
                )}

                {editingVault ? (
                  <form onSubmit={handleSaveVault} className="rounded-xl border border-[#D4AF37]/30 bg-[#F1F3F6] dark:bg-[#0E131C] p-4 space-y-3 text-xs">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium mb-1">Serial Number</label>
                        <input
                          type="text"
                          value={vaultSerial}
                          onChange={(e) => setVaultSerial(e.target.value)}
                          dir="ltr"
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">IMEI (15 رقمًا)</label>
                        <input
                          type="text"
                          value={vaultImei}
                          onChange={(e) => setVaultImei(e.target.value)}
                          maxLength={15}
                          dir="ltr"
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3 font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">البائع / المتجر</label>
                        <input
                          type="text"
                          value={vaultSeller}
                          onChange={(e) => setVaultSeller(e.target.value)}
                          className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">فاتورة الشراء (JPG/PNG/PDF)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleVaultInvoicePick}
                          className="w-full text-[11px]"
                        />
                        {vaultInvoice && <span className="text-emerald-600 block mt-0.5">{vaultInvoice}</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">ملاحظات خاصة</label>
                      <input
                        type="text"
                        value={vaultNotes}
                        onChange={(e) => setVaultNotes(e.target.value)}
                        className="w-full min-h-[40px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-white dark:bg-[#141923] px-3"
                      />
                    </div>
                    {vaultErr && <div className="text-rose-500">{vaultErr}</div>}
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold"
                    >
                      حفظ بيانات الخزينة
                    </button>
                  </form>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <span className="text-[#687182] dark:text-[#8E97A8] block">Serial Number الكامل</span>
                      <span className="font-mono-code font-semibold mt-1 block">
                        {device.privateData.serialNumber || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <span className="text-[#687182] dark:text-[#8E97A8] block">IMEI الكامل</span>
                      <span className="font-mono-code font-semibold mt-1 block">
                        {device.privateData.imei || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <span className="text-[#687182] dark:text-[#8E97A8] block">البائع / جهة الشراء</span>
                      <span className="font-semibold mt-1 block">
                        {device.privateData.sellerName || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#F1F3F6] dark:bg-[#0E131C] p-3">
                      <span className="text-[#687182] dark:text-[#8E97A8] block">فاتورة الشراء</span>
                      <span className="font-semibold mt-1 inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {device.privateData.invoiceName || 'لا توجد فاتورة مرفقة'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Lost / Stolen Emergency Protection Control */}
                <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] space-y-2.5 no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <span>حماية الفقدان أو السرقة الفورية</span>
                      </div>
                      <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] mt-0.5">
                        عند التفعيل يُغلق السوق ونقل الملكية فورًا، ويظهر تحذير أحمر لكل من يفحص QR أو رقم IMEI.
                      </p>
                    </div>
                    {device.status !== 'reported_stolen' && (
                      <button
                        type="button"
                        onClick={() => setLostFormOpen((o) => !o)}
                        className="min-h-[38px] px-3.5 rounded-xl border border-rose-500/40 text-rose-500 text-xs font-bold hover:bg-rose-500/10"
                      >
                        {lostFormOpen ? 'إغلاق' : 'الإبلاغ عن فقدان / سرقة'}
                      </button>
                    )}
                  </div>
                  {lostFormOpen && device.status !== 'reported_stolen' && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-2.5 text-xs">
                      <input
                        type="text"
                        value={lostNote}
                        onChange={(e) => setLostNote(e.target.value)}
                        placeholder="ملحوظة البلاغ (مثال: فُقد في محطة مترو رمسيس بتاريخ اليوم)"
                        className="w-full min-h-[40px] rounded-lg border border-rose-500/30 bg-white dark:bg-[#0B1220] px-3"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await reportDeviceLostOrStolen(device.id, lostNote);
                          if (res.ok) {
                            setLostFormOpen(false);
                            setLostNote('');
                            setLostFeedback('تم تفعيل وضع الجهاز المفقود / المسروق وتأمين السجل.');
                          }
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-rose-600 text-white font-bold"
                      >
                        تأكيد قفل الجهاز كبلاغ فقدان/سرقة
                      </button>
                    </div>
                  )}
                </div>

                {/* Public QR Visibility Controls */}
                <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] space-y-2.5 no-print">
                  <div className="text-xs font-bold text-[#1E2430] dark:text-[#DCE1EA]">
                    إعدادات الخصوصية عند مسح QR العام
                  </div>
                  {(
                    [
                      ['isPublic', 'تفعيل صفحة الملف العام للجهاز'],
                      ['showRepairs', 'إظهار سجل الصيانة المعتمد'],
                      ['showWarranty', 'إظهار حالة الضمان'],
                      ['showCondition', 'إظهار حالة الجهاز المسجلة'],
                      ['showMaskedSerial', `إظهار آخر 4 أرقام فقط من السيريال (${maskSensitiveCode(device.privateData.serialNumber)})`],
                    ] as const
                  ).map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-center justify-between gap-3 py-1.5 text-xs text-[#363E4D] dark:text-[#C5CCD8] cursor-pointer"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={device.visibility[field]}
                        onChange={(e) =>
                          void updateDeviceVisibility(device.id, {
                            ...device.visibility,
                            [field]: e.target.checked,
                          })
                        }
                        className="rounded border-[#C8CFD9] accent-[#D4AF37]"
                      />
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap items-center justify-between gap-2 no-print">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteOrArchiveDevice(device.id, 'archive');
                      navigate('/devices');
                    }}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] px-3 text-xs text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    إخفاء / أرشفة الجهاز
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteOrArchiveDevice(device.id, 'delete');
                      navigate('/devices');
                    }}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 text-xs text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف السجل نهائيًا
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* QR Code & Quick Timeline */}
          <div className="lg:col-span-5 space-y-6">
            {device.visibility.isPublic ? (
              <div className="space-y-3">
                <QRCodeCard
                  publicToken={device.publicToken}
                  deviceCode={device.deviceCode}
                  deviceName={`${device.brand} ${device.deviceName}`}
                />
                {isOwner && (
                  <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 space-y-2.5 no-print">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#11161F] dark:text-[#F3F5F8]">
                        إدارة رابط المشاركة الذكي
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await rotateDeviceToken(device.id);
                          if (res.ok) {
                            setQrMsg('تم تجديد رمز QR بنجاح وإبطال الرابط القديم نهائيًا.');
                          } else {
                            setQrMsg(res.error || 'تعذر تجديد الرابط');
                          }
                        }}
                        className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        تجديد رابط QR (إلغاء السابق)
                      </button>
                    </div>
                    {qrMsg && <div className="text-[11px] text-emerald-500 font-semibold">{qrMsg}</div>}
                    <p className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                      لإيقاف الرابط مؤقتًا أطفئ «تفعيل صفحة الملف العام»، ولإلغائه وإصدار رابط جديد اضغط «تجديد رابط QR».
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 text-xs text-[#687182] dark:text-[#8E97A8] flex items-center gap-2">
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>تم إيقاف الملف العام لهذا الجهاز من إعدادات الخصوصية.</span>
              </div>
            )}

            {/* Trust Transparency Box */}
            <section className="rounded-2xl border border-[#D4AF37]/30 bg-white dark:bg-[#141923] p-5 space-y-2.5 text-xs">
              <div className="font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>مصدر معلومات هذا السجل</span>
              </div>
              <div className="space-y-1 text-[#4A5363] dark:text-[#C5CCD8]">
                <div>• بيانات الجهاز الأساسية والفاتورة: {device.privateData.invoiceName ? TRUST_SOURCE_LABELS.evidence_backed : TRUST_SOURCE_LABELS.user_entry}</div>
                <div>• الصيانات المعتمدة: {deviceRepairs.some((r) => r.ownerApproved) ? TRUST_SOURCE_LABELS.technician_checked : 'لا توجد صيانات فنية معتمدة بعد'}</div>
                <div>• فحوصات ما قبل الشراء: {deviceInspections.length > 0 ? `${deviceInspections.length} فحص مسجل` : 'لا توجد تقارير فحص بعد'}</div>
              </div>
              <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] pt-2 border-t border-[#E8EBF0] dark:border-[#222834] leading-relaxed">
                {PLATFORM_TRUST_DISCLAIMER}
              </p>
            </section>

            <section className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  أحدث أحداث السجل
                </h3>
                <Link to={`/devices/${device.id}/lifecycle`} className="text-xs text-[#8F6D14] dark:text-[#D4AF37] hover:underline">
                  السجل الكامل
                </Link>
              </div>
              <div className="space-y-3">
                {deviceEvents.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="text-xs pb-2.5 border-b border-[#E8EBF0] dark:border-[#222834] last:border-b-0">
                    <div className="flex items-center justify-between text-[#687182] dark:text-[#8E97A8]">
                      <span className="font-semibold text-[#1E2430] dark:text-[#DCE1EA]">
                        {EVENT_TYPE_LABELS[ev.eventType]}
                      </span>
                      <span className="tabular-nums">{formatArabicDate(ev.occurredAt)}</span>
                    </div>
                    <p className="mt-1 text-[#4A5363] dark:text-[#8E97A8]">{ev.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export const DeviceLifecyclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { devices, events, currentUser, addDeviceEvent } = useApp();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default oldest to newest with toggle
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [noteText, setNoteText] = useState('');

  const device = devices.find((d) => d.id === id);
  const isOwner = device && currentUser?.id === device.ownerId;

  const filteredEvents = useMemo(() => {
    const list = events.filter(
      (e) => e.deviceId === id && (typeFilter === 'all' || e.eventType === typeFilter)
    );
    return [...list].sort((a, b) =>
      sortOrder === 'asc'
        ? new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
        : new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }, [events, id, sortOrder, typeFilter]);

  if (!device) {
    return (
      <AppShell title="سجل الجهاز">
        <div className="p-8 text-center text-sm text-[#687182] dark:text-[#8E97A8]">الجهاز غير موجود.</div>
      </AppShell>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await addDeviceEvent(device.id, 'note_added', noteText);
    setNoteText('');
  };

  return (
    <AppShell title={`سجل الجهاز — ${device.deviceName}`}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={`/devices/${device.id}`} className="inline-flex items-center gap-1.5 text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37]">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة لتفاصيل الجهاز
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-h-[40px] rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3 text-xs"
            >
              <option value="all">جميع الأحداث</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] px-3.5 text-xs font-semibold"
            >
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              {sortOrder === 'asc' ? 'الأقدم أولًا' : 'الأحدث أولًا'}
            </button>
          </div>
        </div>

        {isOwner && (
          <form
            onSubmit={handleAddNote}
            className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="إضافة ملاحظة أو حدث جديد إلى سجل الجهاز الزمني..."
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
            />
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#0B1220] text-xs font-bold hover:bg-[#E2C25B] whitespace-nowrap"
            >
              إضافة للسجل
            </button>
          </form>
        )}

        <div className="space-y-4">
          {filteredEvents.map((ev, index) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                    #{index + 1} · {ev.eventCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-code">{device.deviceCode}</span>
                </div>
                <span className="tabular-nums">{formatArabicDateTime(ev.occurredAt)}</span>
              </div>

              <h3 className="mt-2 text-base font-bold text-[#11161F] dark:text-[#F3F5F8]">
                {EVENT_TYPE_LABELS[ev.eventType as EventType]}
              </h3>
              <p className="mt-1.5 text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                {ev.description}
              </p>

              <div className="mt-3 pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex flex-wrap items-center justify-between gap-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                <span>الجهة المسجلة: {ev.actorLabel}</span>
                <span>
                  التوثيق:{' '}
                  {ev.verificationStatus === 'verified'
                    ? 'موثق'
                    : ev.verificationStatus === 'pending'
                    ? 'قيد المراجعة'
                    : 'تسجيل ذاتي'}{' '}
                  · موافقة المالك: {ev.ownerApproved ? 'معتمد' : 'بانتظار الموافقة'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

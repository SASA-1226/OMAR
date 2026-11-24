import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Crown,
  Flag,
  MessageSquare,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ReportModal } from '../components/ReportModal';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  EGYPT_CITIES,
  PLATFORM_TRUST_DISCLAIMER,
  VERIFICATION_TIER_LABELS,
  formatArabicDate,
  formatCurrency,
} from '../lib/labels';
import { fuzzyArabicMatch } from '../lib/security';
import { listingSchema, validateUploadFile } from '../lib/validation';
import type { DeviceCondition } from '../types/omor';

export const MarketplacePage: React.FC = () => {
  const { listings, devices, warranties, repairRecords, currentUser } = useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyVerifiedRecord, setOnlyVerifiedRecord] = useState(false);
  const [onlyWithWarranty, setOnlyWithWarranty] = useState(false);
  const [onlyWithRepairs, setOnlyWithRepairs] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(devices.map((d) => d.brand))),
    [devices]
  );

  const filtered = useMemo(() => {
    return listings
      .filter((l) => l.status === 'active')
      .filter((l) => {
        const dev = devices.find((d) => d.id === l.deviceId);
        if (!dev || dev.status === 'reported_stolen') return false;
        if (brandFilter !== 'all' && dev.brand !== brandFilter) return false;
        if (categoryFilter !== 'all' && dev.category !== categoryFilter) return false;
        if (conditionFilter !== 'all' && l.condition !== conditionFilter) return false;
        if (cityFilter !== 'all' && l.city !== cityFilter) return false;
        if (minPrice && l.price < Number(minPrice)) return false;
        if (maxPrice && l.price > Number(maxPrice)) return false;
        if (onlyVerifiedRecord && dev.verificationTier === 'self_recorded') return false;
        if (
          onlyWithWarranty &&
          !warranties.some((w) => w.deviceId === dev.id && w.status === 'active') &&
          l.storeWarrantyDays === 0
        )
          return false;
        if (
          onlyWithRepairs &&
          !repairRecords.some((r) => r.deviceId === dev.id && r.ownerApproved)
        )
          return false;

        return fuzzyArabicMatch(
          `${l.title} ${dev.brand} ${dev.model} ${l.city} ${l.sellerName} ${l.description}`,
          query
        );
      })
      .sort((a, b) => {
        const featDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
        if (featDiff !== 0) return featDiff;
        const certDiff = Number(Boolean(b.storeCertified)) - Number(Boolean(a.storeCertified));
        if (certDiff !== 0) return certDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    brandFilter,
    categoryFilter,
    cityFilter,
    conditionFilter,
    devices,
    listings,
    maxPrice,
    minPrice,
    onlyVerifiedRecord,
    onlyWithRepairs,
    onlyWithWarranty,
    query,
    repairRecords,
    warranties,
  ]);

  return (
    <AppShell title="OMOR MARKET — سوق الأجهزة الموثق">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8]">
              سوق الأجهزة المستعملة والمعتمدة
            </h2>
            <p className="text-xs text-[#687182] dark:text-[#8E97A8]">
              تصفح الأجهزة بناءً على سجلها الموثق وتاريخ صيانتها. لا توجد بوابة دفع إلكترونية لبيع الأجهزة — يتم الفحص ونقل الملكية يدًا بيد عبر المنصة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.role === 'store' && (
              <Link
                to="/services"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/20 whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                تمييز إعلانات المتجر
              </Link>
            )}
            {currentUser && (
              <button
                type="button"
                onClick={() => navigate('/market/new')}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-5 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                إضافة جهاز للبيع
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-[#7A8394] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالموديل، البائع، المدينة..."
                className="w-full min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] pr-10 pl-3 text-sm"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
            >
              <option value="all">كل الأنواع</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
            >
              <option value="all">كل الشركات</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="min-h-[42px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
            >
              <option value="all">كل المدن</option>
              {EGYPT_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-xs"
            >
              <option value="all">كل الحالات</option>
              {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="السعر من"
              className="w-28 min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 text-xs tabular-nums"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="السعر إلى"
              className="w-28 min-h-[38px] rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-2.5 text-xs tabular-nums"
            />

            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyVerifiedRecord}
                onChange={(e) => setOnlyVerifiedRecord(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              <span>له سجل موثق</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithWarranty}
                onChange={(e) => setOnlyWithWarranty(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              <span>ضمان ساري</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithRepairs}
                onChange={(e) => setOnlyWithRepairs(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              <span>صيانة مسجلة</span>
            </label>
          </div>
        </div>

        {/* Listings Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-10 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
            لا توجد عروض مطابقة لمعايير البحث الحالية.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing) => {
              const dev = devices.find((d) => d.id === listing.deviceId);
              return (
                <Link
                  key={listing.id}
                  to={`/market/${listing.id}`}
                  className="group rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden hover:border-[#D4AF37]/60 transition-colors flex flex-col"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#EEF0F4] dark:bg-[#10151F]">
                    <ImageWithFallback
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {(listing.isFeatured || listing.storeCertified || listing.sellerIsVip) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {listing.isFeatured && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37] px-2 py-0.5 text-[10px] font-extrabold text-[#0B1220]">
                              <Sparkles className="w-3 h-3" />
                              إعلان مميّز
                            </span>
                          )}
                          {listing.storeCertified && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              <Award className="w-3 h-3" />
                              مفحوص ومعتمد
                            </span>
                          )}
                          {listing.sellerIsVip && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                              <Crown className="w-3 h-3" />
                              تاجر VIP
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                        {listing.city} · {CONDITION_LABELS[listing.condition]}
                      </div>
                      <h3 className="mt-1 text-base font-bold text-[#11161F] dark:text-[#F3F5F8] line-clamp-2">
                        {listing.title}
                      </h3>
                      <div className="mt-2 text-xs text-[#687182] dark:text-[#8E97A8]">
                        {listing.sellerType === 'store' ? `متجر: ${listing.sellerName}` : `البائع: ${listing.sellerName}`}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E8EBF0] dark:border-[#222834] flex items-center justify-between">
                      <span className="text-base font-extrabold tabular-nums text-[#8F6D14] dark:text-[#D4AF37]">
                        {formatCurrency(listing.price, listing.currency)}
                      </span>
                      <span className="text-[11px] text-[#687182] dark:text-[#8E97A8]">
                        {dev ? VERIFICATION_TIER_LABELS[dev.verificationTier] : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const AddListingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { myDevices, currentUser, createListing } = useApp();

  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') || myDevices[0]?.id || '');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState(currentUser?.city || EGYPT_CITIES[0]);
  const [condition, setCondition] = useState<DeviceCondition>('good');
  const [description, setDescription] = useState('');
  const [storeWarrantyDays, setStoreWarrantyDays] = useState('0');
  const [images, setImages] = useState<string[]>([]);
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
        setImages((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = listingSchema.safeParse({
      deviceId,
      title,
      price: Number(price),
      city,
      condition,
      description,
      storeWarrantyDays: Number(storeWarrantyDays) || 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'تحقق من الحقول');
      return;
    }
    const res = await createListing({
      deviceId: parsed.data.deviceId,
      title: parsed.data.title,
      price: parsed.data.price,
      city: parsed.data.city,
      condition: parsed.data.condition,
      description: parsed.data.description,
      storeWarrantyDays: parsed.data.storeWarrantyDays,
      images,
    });
    if (!res.ok || !res.data) {
      setError(res.error || 'تعذر نشر الإعلان');
      return;
    }
    navigate(`/market/${res.data.id}`);
  };

  return (
    <AppShell title="إضافة جهاز للبيع">
      <div className="max-w-2xl mx-auto rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-6">
        <h2 className="text-lg font-bold text-[#11161F] dark:text-[#F3F5F8] mb-1">
          نشر جهاز في OMOR MARKET
        </h2>
        <p className="text-xs text-[#687182] dark:text-[#8E97A8] mb-5">
          سيتم ربط الإعلان بملف الجهاز العام المسموح بنشره دون كشف أي بيانات خاصة أو فواتير.
        </p>

        {myDevices.length === 0 ? (
          <div className="text-xs text-[#687182] dark:text-[#8E97A8] space-y-3">
            <p>يجب إضافة الجهاز إلى خزينتك أولًا لإنشاء هويته الرقمية قبل عرضه للبيع.</p>
            <Link to="/devices/new" className="inline-flex rounded-xl bg-[#D4AF37] px-4 py-2.5 font-bold text-[#0B1220]">
              تسجيل جهاز جديد
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">اختر الجهاز من أجهزتك</label>
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
              <label className="block text-xs font-medium mb-1">عنوان الإعلان</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: iPhone 16 Pro 256GB بسجل فحص موثق"
                className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3.5 text-sm"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm tabular-nums"
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
                <label className="block text-xs font-medium mb-1">الحالة</label>
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
            </div>

            {currentUser?.role === 'store' && (
              <div>
                <label className="block text-xs font-medium mb-1">ضمان المتجر المقدم (بالأيام)</label>
                <input
                  type="number"
                  min={0}
                  value={storeWarrantyDays}
                  onChange={(e) => setStoreWarrantyDays(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] px-3 text-sm tabular-nums"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">وصف البائع</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اذكر تفاصيل الاستخدام والمرفقات..."
                className="w-full rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] bg-[#F1F3F6] dark:bg-[#0E131C] p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">صور إضافية للجهاز</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} className="text-xs" />
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B]"
            >
              نشر الإعلان في السوق
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};

export const ListingDetailPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const {
    listings,
    devices,
    repairRecords,
    currentUser,
    startOrGetConversation,
    updateListingStatus,
  } = useApp();
  const [reportOpen, setReportOpen] = useState(false);

  const listing = listings.find((l) => l.id === listingId);
  const device = listing ? devices.find((d) => d.id === listing.deviceId) : undefined;

  if (!listing || !device) {
    return (
      <AppShell title="تفاصيل الإعلان">
        <div className="p-8 text-center text-sm text-[#687182] dark:text-[#8E97A8]">الإعلان غير موجود أو تم حذفه.</div>
      </AppShell>
    );
  }

  const approvedRepairs = device.visibility.showRepairs
    ? repairRecords.filter((r) => r.deviceId === device.id && r.ownerApproved)
    : [];

  const handleContact = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const conv = await startOrGetConversation(
      listing.sellerId,
      listing.sellerName,
      listing.id,
      listing.title
    );
    if (conv) {
      navigate(`/messages?conv=${conv.id}`);
    }
  };

  return (
    <AppShell title={listing.title}>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/market" className="inline-flex items-center gap-1.5 text-xs text-[#687182] dark:text-[#8E97A8] hover:text-[#D4AF37]">
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة إلى سوق الأجهزة
        </Link>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] overflow-hidden">
              <div className="aspect-[4/3] bg-[#EEF0F4] dark:bg-[#10151F]">
                <ImageWithFallback
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                  {listing.city} · {CONDITION_LABELS[listing.condition]} · نُشر في {formatArabicDate(listing.createdAt)}
                </div>
                <h2 className="text-xl font-bold text-[#11161F] dark:text-[#F3F5F8]">{listing.title}</h2>
                <div className="text-2xl font-extrabold tabular-nums text-[#8F6D14] dark:text-[#D4AF37]">
                  {formatCurrency(listing.price, listing.currency)}
                </div>
                <p className="text-sm text-[#4A5363] dark:text-[#C5CCD8] leading-relaxed">
                  {listing.description}
                </p>

                {listing.storeWarrantyDays > 0 && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                    يشمل ضمان المتجر المعلن لمدة {listing.storeWarrantyDays} يومًا من البائع ({listing.sellerName}).
                  </div>
                )}
              </div>
            </div>

            {/* Permitted Device History */}
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  ملخص السجل الرقمي المصرح بنشره
                </h3>
                <span className="font-mono-code text-xs text-[#687182] dark:text-[#8E97A8]">{device.deviceCode}</span>
              </div>
              <div className="text-xs text-[#4A5363] dark:text-[#C5CCD8]">
                درجة التوثيق: <strong>{VERIFICATION_TIER_LABELS[device.verificationTier]}</strong> · عدد الصيانات المعتمدة: <strong className="tabular-nums">{approvedRepairs.length}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to={`/d/${device.publicToken}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:underline"
                >
                  <QrCode className="w-4 h-4" />
                  فتح ملف QR العام الكامل للجهاز
                </Link>
                <Link
                  to={`/v3/risk-report?listingId=${listing.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-2 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/25"
                >
                  <ShieldCheck className="w-4 h-4" />
                  تقرير مخاطر الشراء وتقدير السعر (V3)
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EEF0F4] dark:bg-[#1F2633] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#11161F] dark:text-[#F3F5F8]">
                    {listing.sellerName}
                  </div>
                  <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                    {listing.sellerType === 'store' ? 'حساب متجر أجهزة' : 'مالك الجهاز'} · {listing.city}
                  </div>
                </div>
              </div>

              {device.status === 'reported_stolen' && (
                <div className="rounded-xl border border-rose-500 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    هذا الجهاز مُبلغ عن فقدانه أو سرقته من مالكه الأصلي. تم إيقاف إمكانية شرائه أو التواصل بشأنه.
                  </span>
                </div>
              )}

              {currentUser?.id !== listing.sellerId ? (
                <button
                  type="button"
                  disabled={device.status === 'reported_stolen'}
                  onClick={() => void handleContact()}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B] disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" />
                  {device.status === 'reported_stolen' ? 'موقوف أمنيًا' : 'تواصل مع البائع'}
                </button>
              ) : (
                <div className="space-y-2">
                  {listing.status === 'active' && (
                    <Link
                      to={`/services?service=store_feature_listing&listingId=${listing.id}`}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-bold text-[#8F6D14] dark:text-[#D4AF37] hover:bg-[#D4AF37]/25"
                    >
                      <Sparkles className="w-4 h-4" />
                      تمييز الإعلان وتصدّره في السوق
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void updateListingStatus(listing.id, 'sold')}
                    className="w-full min-h-[44px] rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                  >
                    تحديد الإعلان كمُباع
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-xs text-rose-500 hover:bg-rose-500/10"
              >
                <Flag className="w-3.5 h-3.5" />
                الإبلاغ عن هذا الإعلان
              </button>

              <p className="text-[11px] text-[#687182] dark:text-[#8E97A8] leading-relaxed">
                تنبيه: منصة OMOR لا تجري دفعًا إلكترونيًا نيابة عنك. افحص الجهاز شخصيًا وتحقق من رمز QR ثم استخدم نظام نقل الملكية الرقمي عند الاستلام. {PLATFORM_TRUST_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="listing"
        targetId={listing.id}
        targetLabel={listing.title}
      />
    </AppShell>
  );
};

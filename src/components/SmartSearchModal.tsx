import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, Smartphone, Store, Wrench, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, formatCurrency } from '../lib/labels';
import { fuzzyArabicMatch } from '../lib/security';

interface SmartSearchModalProps {
  open: boolean;
  onClose: () => void;
}

type SearchScope = 'all' | 'devices' | 'market' | 'technicians' | 'repairs';

export const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const {
    devices,
    listings,
    technicians,
    repairRecords,
    users,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
  } = useApp();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');

  const results = useMemo(() => {
    const q = query.trim();
    const matchedDevices =
      scope === 'all' || scope === 'devices'
        ? devices.filter(
            (d) =>
              d.status !== 'archived' &&
              fuzzyArabicMatch(
                `${d.brand} ${d.deviceName} ${d.model} ${d.modelNumber || ''} ${d.deviceCode} ${CATEGORY_LABELS[d.category]}`,
                q
              )
          )
        : [];

    const matchedListings =
      scope === 'all' || scope === 'market'
        ? listings.filter(
            (l) =>
              l.status === 'active' &&
              fuzzyArabicMatch(`${l.title} ${l.city} ${l.sellerName} ${l.description}`, q)
          )
        : [];

    const matchedTechs =
      scope === 'all' || scope === 'technicians'
        ? technicians.filter((t) =>
            fuzzyArabicMatch(
              `${t.displayName} ${t.centerName} ${t.governorate} ${t.district} ${t.specialties.join(' ')}`,
              q
            )
          )
        : [];

    const matchedStores =
      scope === 'all'
        ? users.filter(
            (u) =>
              u.role === 'store' &&
              u.accountStatus === 'active' &&
              fuzzyArabicMatch(`${u.storeName || u.fullName} ${u.city || ''}`, q)
          )
        : [];

    const matchedRepairs =
      scope === 'all' || scope === 'repairs'
        ? repairRecords.filter(
            (r) =>
              r.ownerApproved &&
              fuzzyArabicMatch(`${r.issueType} ${r.actionTaken} ${r.centerName}`, q)
          )
        : [];

    return {
      devices: matchedDevices.slice(0, 5),
      listings: matchedListings.slice(0, 5),
      technicians: matchedTechs.slice(0, 4),
      stores: matchedStores.slice(0, 3),
      repairs: matchedRepairs.slice(0, 4),
    };
  }, [devices, listings, repairRecords, scope, technicians, users, query]);

  if (!open) return null;

  const goTo = (path: string) => {
    if (query.trim()) addSearchHistory(query.trim());
    onClose();
    navigate(path);
  };

  const suggestions = ['iPhone 16', 'MacBook', 'صيانة شاشة', 'القاهرة', 'OMR-2026'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 backdrop-blur-sm p-4 pt-12 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#141923] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#DCE0E7] dark:border-[#252C38]">
          <Search className="w-5 h-5 text-[#8F6D14] dark:text-[#D4AF37] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن جهاز، موديل، رقم سجل OMR، فني صيانة، متجر، أو نوع عطل..."
            className="w-full bg-transparent text-sm text-[#11161F] dark:text-[#F3F5F8] placeholder:text-[#7A8394] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-[#7A8394] hover:text-[#47505E] dark:hover:text-[#DCE1EA] p-1"
              aria-label="مسح البحث"
            >
              مسح
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#7A8394] hover:text-[#363E4D] dark:hover:text-[#DCE1EA]"
            aria-label="إغلاق البحث"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Filters */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#E8EBF0] dark:border-[#222834]/80 overflow-x-auto">
          {(
            [
              ['all', 'الكل'],
              ['devices', 'الأجهزة'],
              ['market', 'السوق'],
              ['technicians', 'الفنيون'],
              ['repairs', 'الصيانة'],
            ] as [SearchScope, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                scope === key
                  ? 'bg-[#D4AF37] text-[#0B1220] font-bold'
                  : 'text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {/* History & Suggestions when query empty */}
          {!query.trim() && (
            <div className="space-y-4">
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-[#687182] dark:text-[#8E97A8] mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      عمليات البحث السابقة
                    </span>
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-[#7A8394] hover:text-rose-500"
                    >
                      مسح السجل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[#D5DBE5] dark:border-[#333C4B] text-[#363E4D] dark:text-[#DCE1EA] hover:border-[#D4AF37]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-[#687182] dark:text-[#8E97A8] mb-2">اقتراحات البحث السريع</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#EEF0F4] dark:bg-[#1F2633] text-[#363E4D] dark:text-[#DCE1EA] hover:bg-[#D4AF37]/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.devices.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-2">
                الأجهزة المسجلة
              </div>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {results.devices.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => goTo(`/d/${d.publicToken}`)}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-right hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/60 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Smartphone className="w-4 h-4 text-[#8F6D14] dark:text-[#D4AF37] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8] truncate">
                          {d.brand} {d.deviceName}
                        </div>
                        <div className="text-xs text-[#687182] dark:text-[#8E97A8] truncate">
                          {d.model} · <span className="font-mono-code">{d.deviceCode}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F6D14] dark:text-[#D4AF37] shrink-0">عرض</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.listings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-2">
                إعلانات OMOR MARKET
              </div>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {results.listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => goTo(`/market/${l.id}`)}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-right hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/60 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8] truncate">
                        {l.title}
                      </div>
                      <div className="text-xs text-[#687182] dark:text-[#8E97A8]">
                        {l.city} · {l.sellerName}
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[#11161F] dark:text-[#F3F5F8] shrink-0">
                      {formatCurrency(l.price, l.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.technicians.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-2">
                الفنيون ومراكز الصيانة
              </div>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {results.technicians.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goTo(`/technicians/${t.id}`)}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-right hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/60 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Wrench className="w-4 h-4 text-[#8F6D14] dark:text-[#D4AF37] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8] truncate">
                          {t.centerName}
                        </div>
                        <div className="text-xs text-[#687182] dark:text-[#8E97A8] truncate">
                          {t.displayName} · {t.governorate}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#687182] dark:text-[#8E97A8] shrink-0 tabular-nums">
                      {t.verifiedRepairsCount} توثيق
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.stores.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-2">
                المتاجر المسجلة
              </div>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {results.stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo('/market')}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-right hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/60 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-4 h-4 text-[#8F6D14] dark:text-[#D4AF37]" />
                      <div>
                        <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8]">
                          {s.storeName || s.fullName}
                        </div>
                        <div className="text-xs text-[#687182] dark:text-[#8E97A8]">{s.city}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.repairs.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#687182] dark:text-[#8E97A8] mb-2">
                أنواع الصيانة الموثقة
              </div>
              <div className="divide-y divide-[#E8EBF0] dark:divide-[#222834]">
                {results.repairs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goTo('/repairs')}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-right hover:bg-[#F1F3F6] dark:hover:bg-[#1F2633]/60 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#11161F] dark:text-[#F3F5F8] truncate">
                        {r.issueType}
                      </div>
                      <div className="text-xs text-[#687182] dark:text-[#8E97A8] truncate">{r.centerName}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() &&
            results.devices.length === 0 &&
            results.listings.length === 0 &&
            results.technicians.length === 0 &&
            results.stores.length === 0 &&
            results.repairs.length === 0 && (
              <div className="py-8 text-center text-sm text-[#687182] dark:text-[#8E97A8]">
                لا توجد نتائج مطابقة لـ «{query}». جرّب البحث برقم السجل أو اسم الموديل أو المحافظة.
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

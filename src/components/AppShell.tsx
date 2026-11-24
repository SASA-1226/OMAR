import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  Crown,
  HelpCircle,
  Info,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  QrCode,
  Receipt,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  User,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS } from '../lib/labels';
import { BrandLogo } from './BrandLogo';
import { OfflineIndicator } from './OfflineIndicator';
import { OmorAIAssistantDrawer } from './OmorAIAssistantDrawer';
import { PWAInstallButton } from './PWAInstallButton';
import { SmartSearchModal } from './SmartSearchModal';
import { SupportContactButtons } from './SupportWhatsAppButton';

interface AppShellProps {
  title?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, children }) => {
  const {
    theme,
    toggleTheme,
    currentUser,
    unreadNotificationsCount,
  } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { to: '/devices', label: 'أجهزتي', icon: Smartphone },
    { to: '/inspections', label: 'فحص قبل الشراء', icon: ClipboardCheck },
    { to: '/repairs', label: 'الصيانة', icon: Wrench },
    { to: '/warranties', label: 'الضمانات', icon: ShieldCheck },
    { to: '/market', label: 'السوق', icon: Store },
    { to: '/articles', label: 'المقالات والأدلة', icon: BookOpen },
    { to: '/offers', label: 'العروض والمنتجات', icon: ShoppingBag },
    { to: '/v3', label: 'الذكاء والتحليل V3', icon: Sparkles },
    { to: '/v3/parts-stats', label: 'أسعار قطع الغيار', icon: BarChart3 },
    { to: '/v3/partners', label: 'ربط الشركات والمراكز', icon: Building2 },
    { to: '/transfer', label: 'نقل الملكية', icon: ArrowLeftRight },
    { to: '/technicians', label: 'الفنيون والمراكز', icon: Wrench },
    { to: '/services', label: 'الخدمات المدفوعة OMOR Premium', icon: Crown },
    { to: '/my-payments', label: 'مدفوعاتي واشتراكاتي', icon: Receipt },
    { to: '/messages', label: 'الاستفسارات', icon: MessageSquare },
    { to: '/notifications', label: 'الإشعارات', icon: Bell, badge: unreadNotificationsCount },
    { to: '/profile', label: 'حسابي', icon: User },
    { to: '/settings', label: 'الإعدادات', icon: Settings },
    { to: '/platform-guide', label: 'عن المنصة والمطور', icon: Info },
    { to: '/about', label: 'من نحن', icon: Info },
    { to: '/contact', label: 'تواصل معنا', icon: Mail },
    { to: '/help', label: 'المساعدة', icon: HelpCircle },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'إدارة النظام والمراقبة', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] text-[#11161F] dark:text-[#F3F5F8] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 border-l border-[#DCE0E7] dark:border-[#252C38] bg-white dark:bg-[#10151F] z-30 no-print">
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#DCE0E7] dark:border-[#252C38]">
          <NavLink to={currentUser ? '/dashboard' : '/welcome'}>
            <BrandLogo />
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D4AF37]/15 text-[#8F6D14] dark:text-[#D4AF37] font-bold'
                      : 'text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]/80'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="text-xs font-mono-code font-bold text-[#8F6D14] dark:text-[#D4AF37] tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DCE0E7] dark:border-[#252C38] space-y-2.5">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[#0B1220] text-sm font-bold hover:bg-[#E2C25B] transition-colors"
          >
            <QrCode className="w-4 h-4" />
            مسح QR جهاز
          </button>
          {currentUser && (
            <div className="pt-1 text-xs text-[#687182] dark:text-[#8E97A8]">
              <div className="font-semibold text-[#1E2430] dark:text-[#DCE1EA] truncate">
                {currentUser.fullName}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span>{ROLE_LABELS[currentUser.role]}</span>
                <span className="text-[10px] font-bold text-[#8F6D14] dark:text-[#D4AF37]">
                  {currentUser.activePlanSlug ? 'PRO / VIP' : 'صاصا ستور'}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pr-64 flex flex-col min-w-0">
        {/* Top Bar (Compact on Mobile to respect <=15% sticky cap) */}
        <header className="sticky top-0 z-20 h-14 border-b border-[#DCE0E7] dark:border-[#252C38] bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <NavLink to={currentUser ? '/dashboard' : '/welcome'}>
                <BrandLogo compact />
              </NavLink>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#11161F] dark:text-[#F3F5F8] truncate">
              {title || 'SASA STORE OMOR'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="min-h-[40px] px-3 flex items-center gap-2 rounded-xl border border-[#DCE0E7] dark:border-[#252C38] bg-[#F6F7F9] dark:bg-[#141923] text-xs text-[#687182] dark:text-[#8E97A8] hover:border-[#D4AF37]/60 transition-colors"
              aria-label="بحث ذكي"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">بحث في المنصة...</span>
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#DCE0E7] dark:border-[#252C38] text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]"
              aria-label="الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-[#0B1220] text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#DCE0E7] dark:border-[#252C38] text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]"
              aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => navigate('/devices/new')}
                className="hidden md:inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                إضافة جهاز
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-[#DCE0E7] dark:border-[#252C38] px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-5 text-xs text-[#687182] dark:text-[#8E97A8] no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo size="sm" />
              <span className="hidden sm:inline text-[#7A8394] dark:text-[#7E8798]">—</span>
              <span>كل جهاز له حكاية.. وكل حكاية لها سجل.</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SupportContactButtons variant="footer" />
              <NavLink to="/platform-guide" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                دليل المنصة والمطور
              </NavLink>
              <NavLink to="/about" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                من نحن
              </NavLink>
              <NavLink to="/contact" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                تواصل معنا
              </NavLink>
              <NavLink to="/help" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                المساعدة
              </NavLink>
              <NavLink to="/privacy" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                الخصوصية
              </NavLink>
              <NavLink to="/terms" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                الشروط
              </NavLink>
              <NavLink to="/cookies" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">
                الكوكيز
              </NavLink>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation (5 items with prominent central QR) */}
      <nav
        aria-label="التنقل السريع"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#DCE0E7] dark:border-[#252C38] bg-white/95 dark:bg-[#10151F]/95 backdrop-blur-md pb-safe no-print"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
                isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : 'text-[#687182] dark:text-[#8E97A8]'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>الرئيسية</span>
          </NavLink>

          <NavLink
            to="/devices"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
                isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : 'text-[#687182] dark:text-[#8E97A8]'
              }`
            }
          >
            <Smartphone className="w-5 h-5" />
            <span>أجهزتي</span>
          </NavLink>

          {/* Prominent Center QR Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate('/scan')}
              aria-label="مسح رمز QR"
              className={`-mt-5 w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
                location.pathname === '/scan'
                  ? 'bg-[#E2C25B] text-[#0B1220]'
                  : 'bg-[#D4AF37] text-[#0B1220]'
              }`}
            >
              <QrCode className="w-6 h-6" />
              <span className="text-[9px] font-extrabold leading-none mt-0.5">QR</span>
            </button>
          </div>

          <NavLink
            to="/market"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
                isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : 'text-[#687182] dark:text-[#8E97A8]'
              }`
            }
          >
            <Store className="w-5 h-5" />
            <span>السوق</span>
          </NavLink>

          <NavLink
            to={currentUser ? '/profile' : '/login'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
                isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : 'text-[#687182] dark:text-[#8E97A8]'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span>حسابي</span>
          </NavLink>
        </div>
      </nav>

      <SmartSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <OfflineIndicator />
      <OmorAIAssistantDrawer />
    </div>
  );
};

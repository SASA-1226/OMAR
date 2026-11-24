import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOptionalCms } from '../context/CmsContext';
import { AdSlotBanner } from './AdSlotBanner';
import { BrandLogo } from './BrandLogo';
import { OmorAIAssistantDrawer } from './OmorAIAssistantDrawer';
import { PWAInstallButton } from './PWAInstallButton';
import { SupportContactButtons } from './SupportWhatsAppButton';

interface PublicShellProps {
  children: React.ReactNode;
}

export const PublicShell: React.FC<PublicShellProps> = ({ children }) => {
  const { currentUser, theme, toggleTheme } = useApp();
  const cms = useOptionalCms();
  const flags = cms?.settings.sectionFlags;

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B1220] text-[#11161F] dark:text-[#F3F5F8] flex flex-col">
      <header className="border-b border-[#DCE0E7] dark:border-[#252C38] bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/welcome" className="shrink-0">
            <BrandLogo />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#4A5363] dark:text-[#C5CCD8]">
            <NavLink
              to="/welcome"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8] ${
                  isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                }`
              }
            >
              الرئيسية
            </NavLink>
            {(flags?.articles ?? true) && (
              <NavLink
                to="/articles"
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8] ${
                    isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                  }`
                }
              >
                المقالات والأدلة
              </NavLink>
            )}
            {(flags?.offers ?? true) && (
              <NavLink
                to="/offers"
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:text-[#F3F5F8] ${
                    isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                  }`
                }
              >
                العروض والمنتجات
              </NavLink>
            )}
            {(flags?.market ?? true) && (
              <NavLink
                to="/market"
                className="whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8]"
              >
                السوق الموثق
              </NavLink>
            )}
            {(flags?.technicians ?? true) && (
              <NavLink
                to="/technicians"
                className="whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8]"
              >
                مراكز الصيانة
              </NavLink>
            )}
            <NavLink
              to="/platform-guide"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8] ${
                  isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                }`
              }
            >
              عن المنصة والمطور
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8] ${
                  isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                }`
              }
            >
              من نحن
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 hover:text-[#11161F] dark:hover:text-[#F3F5F8] ${
                  isActive ? 'text-[#8F6D14] dark:text-[#D4AF37] font-bold' : ''
                }`
              }
            >
              تواصل معنا
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#D5DBE5] dark:border-[#333C4B] text-[#4A5363] dark:text-[#C5CCD8] hover:bg-[#E9ECF2] dark:hover:bg-[#1F2633]"
              aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to={currentUser ? '/dashboard' : '/login'}
              className="min-h-[40px] inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-[#0B1220] hover:bg-[#E2C25B] transition-colors whitespace-nowrap shrink-0"
            >
              {currentUser ? 'لوحة الحساب' : 'تسجيل الدخول'}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <AdSlotBanner placement="header_top" />
      </div>

      <main className="flex-1">{children}</main>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <AdSlotBanner placement="footer_banner" />
      </div>

      <footer className="border-t border-[#DCE0E7] dark:border-[#252C38] py-6 px-4 text-xs text-[#687182] dark:text-[#8E97A8]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo size="sm" />
            <span>— {cms?.settings.slogan || 'كل جهاز له حكاية.. وكل حكاية لها سجل.'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SupportContactButtons variant="footer" />
            <Link to="/platform-guide" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">دليل المنصة والمطور</Link>
            <Link to="/about" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">من نحن</Link>
            <Link to="/contact" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">تواصل معنا</Link>
            <Link to="/articles" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">المقالات</Link>
            <Link to="/offers" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">العروض</Link>
            <Link to="/privacy" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">سياسة الخصوصية</Link>
            <Link to="/terms" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">شروط الاستخدام</Link>
            <Link to="/cookies" className="hover:text-[#11161F] dark:hover:text-[#F3F5F8]">الكوكيز</Link>
            <Link to="/admin-portal" className="text-[#7A8394] hover:text-[#D4AF37]">بوابة الإدارة</Link>
          </div>
        </div>
      </footer>
      <OmorAIAssistantDrawer />
    </div>
  );
};

import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { CmsProvider, useCms } from './context/CmsContext';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  SplashScreen,
  WelcomePage,
} from './pages/AuthAndOnboardingPages';
import {
  MessagesPage,
  NotificationsPage,
  SettingsPage,
  UserProfilePage,
} from './pages/CommunicationsAndAccountPages';
import { DashboardPage } from './pages/DashboardPage';
import {
  AddDevicePage,
  DeviceDetailPage,
  DeviceLifecyclePage,
  DevicesListPage,
} from './pages/DevicesPages';
import {
  AdminDashboardPage,
  HelpCenterPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from './pages/InfoAndAdminPages';
import {
  AddListingPage,
  ListingDetailPage,
  MarketplacePage,
} from './pages/MarketplacePages';
import { OwnerAdminPortalPage } from './pages/OwnerAdminPortalPage';
import {
  AboutPage,
  ArticleDetailPage,
  ArticlesListPage,
  ContactPage,
  CookiesPolicyPage,
  OffersPage,
} from './pages/PublicContentPages';
import { PublicDeviceProfilePage, ScanQRPage } from './pages/QRPages';
import {
  RepairsPage,
  RequestRepairPage,
  WarrantiesPage,
} from './pages/RepairsAndWarrantiesPages';
import {
  OwnershipTransferPage,
  TechnicianProfilePage,
  TechniciansPage,
} from './pages/TransferAndTechniciansPages';
import { OmorV3HubPage } from './pages/OmorV3Pages';
import { ProServicesPage } from './pages/ProServicesPage';
import { MyPaymentsPage } from './pages/MyPaymentsPage';
import { PlatformGuidePage } from './pages/PlatformGuidePage';
import { InspectionsPage } from './pages/InspectionsPage';
import type { UserRole } from './types/omor';

const RouteVisitTracker: React.FC = () => {
  const location = useLocation();
  const { trackVisit } = useCms();

  useEffect(() => {
    trackVisit(location.pathname);
  }, [location.pathname, trackVisit]);

  return null;
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { currentUser, isLoadingAuth } = useApp();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#C9D0DC] flex items-center justify-center text-sm">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AppProvider>
      <CmsProvider>
        <BrowserRouter>
          <RouteVisitTracker />
          <Routes>
            {/* 1-5: Splash, Welcome & Auth */}
            <Route path="/" element={<SplashScreen />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Public Content, Articles, Affiliate Offers & Policies */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/platform-guide" element={<PlatformGuidePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cookies" element={<CookiesPolicyPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/articles" element={<ArticlesListPage />} />
            <Route path="/articles/:slug" element={<ArticleDetailPage />} />

            {/* 6-12: Core Platform, Devices, Repairs & Warranties */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices"
              element={
                <ProtectedRoute>
                  <DevicesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices/new"
              element={
                <ProtectedRoute>
                  <AddDevicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices/:id"
              element={
                <ProtectedRoute>
                  <DeviceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices/:id/lifecycle"
              element={
                <ProtectedRoute>
                  <DeviceLifecyclePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repairs"
              element={
                <ProtectedRoute>
                  <RepairsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repairs/request"
              element={
                <ProtectedRoute>
                  <RequestRepairPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warranties"
              element={
                <ProtectedRoute>
                  <WarrantiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute>
                  <InspectionsPage />
                </ProtectedRoute>
              }
            />

            {/* 13-14: Public QR Scan & Public Device Profile */}
            <Route path="/scan" element={<ScanQRPage />} />
            <Route path="/d/:publicId" element={<PublicDeviceProfilePage />} />

            {/* 15-17: OMOR MARKET */}
            <Route path="/market" element={<MarketplacePage />} />
            <Route
              path="/market/new"
              element={
                <ProtectedRoute>
                  <AddListingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/market/:listingId" element={<ListingDetailPage />} />

            {/* 18-21: Ownership Transfer & Technicians Directory */}
            <Route
              path="/transfer"
              element={
                <ProtectedRoute>
                  <OwnershipTransferPage />
                </ProtectedRoute>
              }
            />
            <Route path="/technicians" element={<TechniciansPage />} />
            <Route path="/technicians/:id" element={<TechnicianProfilePage />} />

            {/* 22-28: Notifications, Messages, Profile, Settings, Privacy, Help, Terms */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* OMOR V3 Intelligence, Parts Stats & Enterprise Network */}
            <Route path="/v3" element={<OmorV3HubPage initialSection="diagnose" />} />
            <Route path="/v3/diagnose" element={<OmorV3HubPage initialSection="diagnose" />} />
            <Route path="/v3/valuation" element={<OmorV3HubPage initialSection="valuation" />} />
            <Route path="/v3/history" element={<OmorV3HubPage initialSection="history" />} />
            <Route path="/v3/risk-report" element={<OmorV3HubPage initialSection="risk-report" />} />
            <Route path="/v3/parts-stats" element={<OmorV3HubPage initialSection="parts-stats" />} />
            <Route path="/v3/partners" element={<OmorV3HubPage initialSection="partners" />} />
            <Route path="/services" element={<ProServicesPage />} />
            <Route
              path="/my-payments"
              element={
                <ProtectedRoute>
                  <MyPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* 29: Admin Console + Dedicated Server-Authenticated Owner Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin-portal" element={<OwnerAdminPortalPage />} />

            {/* 30: 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </CmsProvider>
    </AppProvider>
  );
}

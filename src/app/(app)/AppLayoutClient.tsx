// src/app/(app)/AppLayoutClient.tsx
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar';
import { LeftNavigationBar } from '@/components/layout/LeftNavigationBar';
import { AiHelpButton } from '@/components/layout/AiHelpButton';
import Footer from '@/components/layout/Footer';
import { getMockCurrentUser, getMockClubs, setGlobalCurrentUser } from '@/lib/mockData';
import type { User, Club, ActivityViewType } from '@/types';
import LogoutConfirmationDialog from '@/components/layout/LogoutConfirmationDialog';
import ProfessionalAccessDialog from '@/components/layout/ProfessionalAccessDialog';
import { useToast } from '@/hooks/use-toast';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { MobileFiltersSheet } from '@/components/layout/MobileFiltersSheet';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [clubInfo, setClubInfo] = React.useState<Club | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);
  const [isProfessionalAccessOpen, setIsProfessionalAccessOpen] = React.useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);

  // Move activityFilters hook BEFORE any conditional returns
  const activityFilters = useActivityFilters(currentUser, (newFavoriteIds) => {
    setCurrentUser(prevUser => prevUser ? { ...prevUser, favoriteInstructorIds: newFavoriteIds } : null);
  });

  // Destructure to exclude filterByFavorites and handleApplyFavorites from sidebar props
  const { filterByFavorites, handleApplyFavorites, ...sidebarFilters } = activityFilters;

  React.useEffect(() => {
    setMounted(true);
    const fetchUserAndClub = async () => {
      setLoading(true);

      // ✅ FIXED: Cargar usuario con JWT authentication
      try {
        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const userResponse = await fetch('/api/users/current', { headers });

        if (userResponse.status === 401) {
          // No autenticado - SOLO redirigir si NO estamos en páginas con auth propia
          if (!['/instructor', '/admin', '/superadmin'].some(path => pathname.startsWith(path))) {
            console.log('❌ AppLayout: Usuario no autenticado, redirigiendo...');
            localStorage.removeItem('auth_token');
            router.push('/');
          }
          return;
        }

        if (userResponse.ok) {
          const data = await userResponse.json();
          const userData = data.user || data; // Soportar ambos formatos
          console.log('✅ AppLayout: Usuario JWT cargado:', userData.name, userData.email);
          setCurrentUser(userData);
        } else {
          // Si falla, solo redirigir si NO estamos en páginas con auth propia
          if (!['/instructor', '/admin', '/superadmin'].some(path => pathname.startsWith(path))) {
            console.log('❌ AppLayout: Error al cargar usuario, redirigiendo...');
            router.push('/');
          }
          return;
        }
      } catch (error) {
        console.error('❌ AppLayout: Error loading user:', error);
        // Solo redirigir si NO estamos en páginas con auth propia
        if (!['/instructor', '/admin', '/superadmin'].some(path => pathname.startsWith(path))) {
          router.push('/');
        }
        return;
      }

      // Cargar clubes desde la API real en lugar de mock
      try {
        const clubsResponse = await fetch('/api/clubs');
        if (clubsResponse.ok) {
          const clubsData = await clubsResponse.json();
          setClubInfo(clubsData.length > 0 ? clubsData[0] : null);
        } else {
          // Fallback a mock si falla
          const clubs = await getMockClubs();
          setClubInfo(clubs.length > 0 ? clubs[0] : null);
        }
      } catch (error) {
        console.error('Error loading clubs:', error);
        // Fallback a mock si hay error
        const clubs = await getMockClubs();
        setClubInfo(clubs.length > 0 ? clubs[0] : null);
      }

      setLoading(false);
    };
    fetchUserAndClub();

    // ❌ REMOVED: Auto-refresh every 3 seconds was causing navigation issues
    // Users were being redirected to login constantly if any fetch failed
  }, [router, pathname]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <main className="flex-1 flex flex-col pb-14 md:pb-0 overflow-x-hidden md:ml-72">
          {children}
        </main>
      </div>
    );
  }

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setGlobalCurrentUser(null);
    toast({ title: "Sesión Cerrada" });
    setIsLogoutConfirmOpen(false);
    router.push('/');
  };

  return (
    <>
      <div className="flex min-h-screen overflow-x-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <main className="flex-1 flex flex-col pb-14 md:pb-0 overflow-x-hidden" style={{ position: 'relative', zIndex: 1 }}>

          {children}
          <Footer />

          {/* Mobile Footer Navigation - Fixed at bottom */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {pathname === '/dashboard' ? (
              <>
                <span className="font-bold text-xl text-gray-800">PadelPro</span>
                <div className="text-xs text-gray-400 font-medium">v1.2</div>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 text-gray-700 font-medium active:opacity-70"
                >
                  <div className="bg-gray-100 p-2 rounded-full">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </div>
                  <span className="text-sm font-bold">Menú</span>
                </button>

                <button
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="flex items-center gap-2 text-blue-600 font-medium active:opacity-70"
                >
                  <span className="text-sm font-bold">Filtros</span>
                  <div className="bg-blue-50 p-2 rounded-full">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H3" /><path d="M18 8H6" /><path d="M15 12H9" /><path d="M12 16h0" /></svg>
                  </div>
                </button>
              </>
            )}
          </div>
        </main>
      </div>
      <div className={pathname === '/admin/calendar' || pathname === '/matchgames' || true ? 'hidden md:block' : 'hidden md:block'}>
        <LeftNavigationBar />
      </div>
      <AiHelpButton onMobileFiltersClick={() => setIsMobileFiltersOpen(true)} />

      <LogoutConfirmationDialog
        isOpen={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
        onConfirm={handleConfirmLogout}
      />
      <ProfessionalAccessDialog
        isOpen={isProfessionalAccessOpen}
        onOpenChange={setIsProfessionalAccessOpen}
      />
      <MobileFiltersSheet
        isOpen={isMobileFiltersOpen}
        onOpenChange={setIsMobileFiltersOpen}
        timeSlotFilter={activityFilters.timeSlotFilter}
        viewPreference={activityFilters.viewPreference}
        filterByFavorites={activityFilters.filterByFavorites}
        showPointsBonus={activityFilters.showPointsBonus}
        selectedPlayerCounts={activityFilters.selectedPlayerCounts}
        selectedInstructorIds={activityFilters.selectedInstructorIds}
        onTimeFilterChange={activityFilters.handleTimeFilterChange}
        onViewPreferenceChange={(pref) => activityFilters.handleViewPrefChange(pref, activityFilters.activeView as ActivityViewType)}
        onFavoritesClick={() => activityFilters.updateUrlFilter('favorites', !activityFilters.filterByFavorites)}
        onTogglePointsBonus={activityFilters.handleTogglePointsBonus}
        onTogglePlayerCount={activityFilters.handleTogglePlayerCount}
        onClearFilters={activityFilters.clearAllFilters}
        onInstructorChange={activityFilters.handleInstructorChange}
      />
    </>
  );
}

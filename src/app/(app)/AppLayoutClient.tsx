// src/app/(app)/AppLayoutClient.tsx
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import DesktopSidebar from '@/components/layout/DesktopSidebar';
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
      
      // Cargar usuario desde la API real
      try {
        const userResponse = await fetch('/api/users/current');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData);
        } else {
          // Fallback a mock si falla
          const user = await getMockCurrentUser();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Fallback a mock si hay error
        const user = await getMockCurrentUser();
        setCurrentUser(user);
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

    const intervalId = setInterval(fetchUserAndClub, 3000); 
    return () => clearInterval(intervalId);
  }, []);

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
      <div className="flex min-h-screen overflow-x-hidden">
        <DesktopSidebar
            currentUser={currentUser}
            clubInfo={clubInfo}
            onProfessionalAccessClick={() => setIsProfessionalAccessOpen(true)}
            onLogoutClick={handleLogout}
            onMobileFiltersClick={() => setIsMobileFiltersOpen(true)}
            isActivitiesPage={pathname.startsWith('/activities')}
            {...sidebarFilters}
        />
        <main className="flex-1 flex flex-col pb-14 md:pb-0 overflow-x-hidden md:ml-72">
          {children}
          <Footer />
        </main>
      </div>
      <LeftNavigationBar />
      <BottomNavigationBar onMobileFiltersClick={() => setIsMobileFiltersOpen(true)} />
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

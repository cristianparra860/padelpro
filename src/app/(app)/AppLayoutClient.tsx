// src/app/(app)/AppLayoutClient.tsx
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import DesktopSidebar from '@/components/layout/DesktopSidebar';
import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar';
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

  React.useEffect(() => {
    setMounted(true);
    const fetchUserAndClub = async () => {
      setLoading(true);
      const user = await getMockCurrentUser();
      const clubs = await getMockClubs();
      setCurrentUser(user);
      setClubInfo(clubs.length > 0 ? clubs[0] : null);
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
        <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-x-hidden md:ml-72">
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
            {...activityFilters}
        />
        <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-x-hidden md:ml-72">
          {children}
          <Footer />
        </main>
      </div>
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
            onTimeFilterChange={activityFilters.handleTimeFilterChange}
            onViewPreferenceChange={(pref) => activityFilters.handleViewPrefChange(pref, activityFilters.activeView as ActivityViewType)}
            onFavoritesClick={() => activityFilters.updateUrlFilter('favorites', !activityFilters.filterByFavorites)}
            onTogglePointsBonus={activityFilters.handleTogglePointsBonus}
            onTogglePlayerCount={activityFilters.handleTogglePlayerCount}
            onClearFilters={activityFilters.clearAllFilters}
        />
    </>
  );
}

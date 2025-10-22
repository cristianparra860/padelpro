

"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { startOfDay, format, isSameDay, addDays, differenceInDays } from 'date-fns';
import type { User, MatchPadelLevel, TimeOfDayFilterType, MatchDayEvent, UserActivityStatusForDay, ViewPreference, ActivityViewType } from '@/types';
import { updateUserFavoriteInstructors, getUserActivityStatusForDay, fetchMatchDayEventsForDate } from '@/lib/mockData';

export function useActivityFilters(
  currentUser: User | null,
  onCurrentUserUpdate: (newFavoriteIds: string[]) => void
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshKey, setRefreshKey] = useState(0); // Internal refresh trigger

  // --- Filter State (driven by URL params) ---
  const timeSlotFilter = (searchParams.get('time') as TimeOfDayFilterType) || 'all';
  const filterByFavorites = searchParams.get('favorites') === 'true';
  const viewPreference = (searchParams.get('viewPref') as ViewPreference) || 'all';
  const matchShareCode = searchParams.get('code');
  const matchIdFilter = searchParams.get('matchId');
  const filterByGratisOnly = searchParams.get('filter') === 'gratis';
  const filterByLiberadasOnly = searchParams.get('filter') === 'liberadas';
  const filterByPuntosOnly = searchParams.get('filter') === 'puntos';
  const filterByProOnly = searchParams.get('filter') === 'pro';
  const showPointsBonus = searchParams.get('showPoints') === 'true';
  
  // --- Player Count Filter State ---
  const playerCountsParam = searchParams.get('players');
  const selectedPlayerCounts = useMemo(() => {
    if (!playerCountsParam) return new Set([1, 2, 3, 4]); // All by default
    return new Set(playerCountsParam.split(',').map(Number).filter(n => n >= 1 && n <= 4));
  }, [playerCountsParam]);


  // --- Local State ---
  const activeView = (searchParams.get('view') as ActivityViewType) || 'clases';
  const selectedDateParam = searchParams.get('date');
  const initialDate = selectedDateParam ? startOfDay(new Date(selectedDateParam)) : startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [isUpdatingFavorites, startFavoritesTransition] = useTransition();

  // --- NEW: Centralized state for date strip indicators ---
  const [dateStripIndicators, setDateStripIndicators] = useState<Record<string, UserActivityStatusForDay>>({});
  const dateStripDates = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i)), []);
  
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchIndicators = async () => {
      if (!currentUser) return;
      const newIndicators: Record<string, UserActivityStatusForDay> = {};
      const clubIdFromParams = searchParams.get('clubId');
      const today = startOfDay(new Date());

      for (const date of dateStripDates) {
        const dateKey = format(date, 'yyyy-MM-dd');
        
        try {
          // Intentar obtener datos reales de la API primero
          const response = await fetch(`/api/user-activity-status?userId=${currentUser.id}&date=${dateKey}`);
          if (response.ok) {
            const statusResult = await response.json();
            const anticipationPoints = differenceInDays(date, today);
            
            newIndicators[dateKey] = {
              ...statusResult,
              anticipationPoints: Math.max(0, anticipationPoints)
            };
          } else {
            // Fallback a datos mock si falla la API
            const statusResult = await getUserActivityStatusForDay(currentUser.id, date);
            const anticipationPoints = differenceInDays(date, today);
            
            newIndicators[dateKey] = {
              ...statusResult,
              anticipationPoints: Math.max(0, anticipationPoints)
            };
          }
        } catch (error) {
          console.warn('⚠️ Error fetching activity status, using mock data:', error);
          // Fallback a datos mock en caso de error
          const statusResult = await getUserActivityStatusForDay(currentUser.id, date);
          const anticipationPoints = differenceInDays(date, today);
          
          newIndicators[dateKey] = {
            ...statusResult,
            anticipationPoints: Math.max(0, anticipationPoints)
          };
        }
      }
      setDateStripIndicators(newIndicators);
    };

    fetchIndicators();
  }, [currentUser, dateStripDates, searchParams, refreshKey]);


  // --- URL Update Logic ---
  const updateUrlFilter = useCallback((key: string, value: string | boolean | null) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    const shouldKeep =
      (typeof value === 'string' && value.length > 0 && value !== 'all' && value !== 'normal') ||
      (typeof value === 'boolean' && value === true);
    if (shouldKeep) {
      newSearchParams.set(key, String(value));
    } else {
      newSearchParams.delete(key);
    }
    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);
  
  const setUrlFilters = useCallback((filters: Record<string, string | boolean | null>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    for (const key in filters) {
      const value = filters[key];
      const shouldKeep =
        (typeof value === 'string' && value.length > 0 && value !== 'all' && value !== 'normal') ||
        (typeof value === 'boolean' && value === true);
      if (shouldKeep) {
        newSearchParams.set(key, String(value));
      } else {
        newSearchParams.delete(key);
      }
    }
    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const clearAllFilters = useCallback(() => {
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('view', activeView); // Keep the current view
    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [router, pathname, activeView]);

  // --- Event Handlers ---
  const handleTimeFilterChange = (value: TimeOfDayFilterType) => updateUrlFilter('time', value);
  
  const handleDateChange = useCallback((date: Date) => {
      setSelectedDate(startOfDay(date));
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('date', format(date, 'yyyy-MM-dd'));
      newSearchParams.delete('viewPref'); 
      router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);
  
  const handleTogglePointsBonus = () => updateUrlFilter('showPoints', !showPointsBonus);

  const handleApplyFavorites = (newFavoriteIds: string[]) => {
    if (currentUser) {
      startFavoritesTransition(async () => {
        await updateUserFavoriteInstructors(currentUser.id, newFavoriteIds);
        onCurrentUserUpdate(newFavoriteIds); // Notify parent to update its state
        updateUrlFilter('favorites', newFavoriteIds.length > 0);
      });
    }
  };
  
  const handleFavoritesClick = (openManagementDialog: () => void) => {
    if (filterByFavorites) {
        updateUrlFilter('favorites', false);
    } else {
        openManagementDialog();
    }
  };
  
  const handleViewPrefChange = useCallback((
    pref: ViewPreference,
    type: ActivityViewType,
    date?: Date,
  ) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('view', type);
    
    if (pref !== 'normal') {
      newSearchParams.set('viewPref', pref);
    } else {
      newSearchParams.delete('viewPref');
    }
    
    if (date) {
        newSearchParams.set('date', format(date, 'yyyy-MM-dd'));
        setSelectedDate(startOfDay(date));
    }
    
    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);



  // --- Effects to Sync State with URL/User ---
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (filterByGratisOnly || filterByLiberadasOnly || filterByPuntosOnly || matchIdFilter || matchShareCode) {
      setSelectedDate(null);
    } else if (dateParam) {
        const newDate = startOfDay(new Date(dateParam));
        if (!selectedDate || newDate.getTime() !== selectedDate.getTime()) {
           setSelectedDate(newDate);
        }
    } else {
        if (!selectedDate) {
           setSelectedDate(startOfDay(new Date()));
        }
    }
  }, [searchParams, filterByGratisOnly, filterByLiberadasOnly, filterByPuntosOnly, matchIdFilter, matchShareCode, selectedDate]);

  // --- Player Count Filter Handlers ---
  const handleTogglePlayerCount = useCallback((count: number) => {
    const newCounts = new Set(selectedPlayerCounts);
    if (newCounts.has(count)) {
      newCounts.delete(count);
    } else {
      newCounts.add(count);
    }
    
    const countsArray = Array.from(newCounts).sort();
    if (countsArray.length === 4) {
      // All selected, remove param
      updateUrlFilter('players', null);
    } else if (countsArray.length === 0) {
      // None selected, reset to all
      updateUrlFilter('players', null);
    } else {
      updateUrlFilter('players', countsArray.join(','));
    }
  }, [selectedPlayerCounts, updateUrlFilter]);

  const handleSelectAllPlayerCounts = useCallback(() => {
    updateUrlFilter('players', null); // Null means all selected
  }, [updateUrlFilter]);

  const handleDeselectAllPlayerCounts = useCallback(() => {
    updateUrlFilter('players', ''); // Empty means none selected, will reset to all
  }, [updateUrlFilter]);

  return {
    activeView,
    selectedDate,
    setSelectedDate,
    timeSlotFilter,
    filterByFavorites,
    viewPreference,
    proposalView: 'join', 
    matchShareCode,
    matchIdFilter,
    filterByGratisOnly,
    filterByLiberadasOnly,
    filterByPuntosOnly,
    filterByProOnly,
    isUpdatingFavorites,
    dateStripIndicators, 
    dateStripDates,      
    refreshKey,
    showPointsBonus,
    selectedPlayerCounts,
    handleTimeFilterChange,
    handleApplyFavorites,
    handleDateChange,
    handleViewPrefChange,
    clearAllFilters,
    triggerRefresh,
    handleTogglePointsBonus,
    handleTogglePlayerCount,
    handleSelectAllPlayerCounts,
    handleDeselectAllPlayerCounts,
    updateUrlFilter,
  };
}

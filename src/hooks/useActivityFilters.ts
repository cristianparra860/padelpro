

"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { startOfDay, format, isSameDay, addDays, differenceInDays } from 'date-fns';
import type { User, MatchPadelLevel, TimeOfDayFilterType, MatchDayEvent, UserActivityStatusForDay, ViewPreference, ActivityViewType } from '@/types';
import { updateUserFavoriteInstructors, getUserActivityStatusForDay, fetchMatchDayEventsForDate } from '@/lib/mockData';
import { useUserPreferences } from './useUserPreferences';

export function useActivityFilters(
  currentUser: User | null,
  onCurrentUserUpdate: (newFavoriteIds: string[]) => void
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshKey, setRefreshKey] = useState(0); // Internal refresh trigger

  // Cargar preferencias guardadas del usuario
  const { preferences, updatePreferences, isLoading: isLoadingPreferences } = useUserPreferences(currentUser?.id);

  // --- Filter State (driven by URL params OR saved preferences) ---
  const timeSlotFilter = (searchParams.get('time') as TimeOfDayFilterType) || preferences.timeSlotFilter;
  const filterByFavorites = searchParams.get('favorites') === 'true';
  const viewPreference = (searchParams.get('viewPref') as ViewPreference) || preferences.viewPreference;
  const matchShareCode = searchParams.get('code');
  const matchIdFilter = searchParams.get('matchId');
  const filterByGratisOnly = searchParams.get('filter') === 'gratis';
  const filterByLiberadasOnly = searchParams.get('filter') === 'liberadas';
  const filterByPuntosOnly = searchParams.get('filter') === 'puntos';
  const filterByProOnly = searchParams.get('filter') === 'pro';
  const showPointsBonus = searchParams.get('showPoints') === 'true';

  // --- Player Count Filter State (con preferencias) ---
  const playerCountsParam = searchParams.get('players');
  const selectedPlayerCounts = useMemo(() => {
    if (!playerCountsParam) return new Set(preferences.playerCounts); // Usar preferencias guardadas
    return new Set(playerCountsParam.split(',').map(Number).filter(n => n >= 1 && n <= 4));
  }, [playerCountsParam, preferences.playerCounts]);

  // --- Instructor Filter State (con preferencias) ---
  const instructorsParam = searchParams.get('instructors');
  const selectedInstructorIds = useMemo(() => {
    if (!instructorsParam) return preferences.instructorIds; // Usar preferencias guardadas
    return instructorsParam.split(',').filter(id => id.length > 0);
  }, [instructorsParam, preferences.instructorIds]);


  // --- Local State ---
  const activeView = (searchParams.get('view') as ActivityViewType) || 'clases';
  const selectedDateParam = searchParams.get('date');

  // 📅 Leer fecha guardada del localStorage si no hay parámetro en URL
  const getSavedDate = (): Date => {
    if (selectedDateParam) {
      return startOfDay(new Date(selectedDateParam));
    }

    // ✅ Solo acceder a localStorage en el cliente
    if (typeof window !== 'undefined') {
      try {
        const savedDate = localStorage.getItem('selectedCalendarDate');
        if (savedDate) {
          const parsed = new Date(savedDate);
          if (!isNaN(parsed.getTime())) {
            return startOfDay(parsed);
          }
        }
      } catch (error) {
        console.error('Error reading saved date:', error);
      }
    }

    return startOfDay(new Date());
  };

  const initialDate = getSavedDate();
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
      const today = startOfDay(new Date());

      // Usar endpoint batch en lugar de múltiples peticiones
      const startDate = format(dateStripDates[0], 'yyyy-MM-dd');
      const endDate = format(dateStripDates[dateStripDates.length - 1], 'yyyy-MM-dd');

      try {
        const response = await fetch(`/api/user-activity-batch?userId=${currentUser.id}&startDate=${startDate}&endDate=${endDate}`);

        console.log('🔍 Respuesta de /api/user-activity-batch:', response.status);

        if (response.ok) {
          const batchResult = await response.json();
          console.log('✅ Datos recibidos de /api/user-activity-batch:', Object.keys(batchResult).length, 'días');

          // Procesar resultados batch
          for (const date of dateStripDates) {
            const dateKey = format(date, 'yyyy-MM-dd');
            const statusResult = batchResult[dateKey];
            const anticipationPoints = differenceInDays(date, today);

            if (statusResult) {
              newIndicators[dateKey] = {
                ...statusResult,
                anticipationPoints: Math.max(0, anticipationPoints)
              };
            } else {
              // Día sin datos
              newIndicators[dateKey] = {
                activityStatus: 'none',
                activityTypes: [],
                hasEvent: false,
                anticipationPoints: Math.max(0, anticipationPoints),
                bookingsCount: 0,
                confirmedCount: 0
              };
            }
          }
        } else {
          console.error('❌ API /user-activity-batch falló con status:', response.status);
          // NO USAR FALLBACK A MOCK - mostrar indicadores vacíos
          for (const date of dateStripDates) {
            const dateKey = format(date, 'yyyy-MM-dd');
            const anticipationPoints = differenceInDays(date, today);
            newIndicators[dateKey] = {
              activityStatus: 'none',
              activityTypes: [],
              hasEvent: false,
              anticipationPoints: Math.max(0, anticipationPoints),
              bookingsCount: 0,
              confirmedCount: 0
            };
          }
        }
      } catch (error) {
        console.error('❌ Error fetching batch activity status:', error);
        // NO USAR FALLBACK A MOCK - mostrar indicadores vacíos
        for (const date of dateStripDates) {
          const dateKey = format(date, 'yyyy-MM-dd');
          const anticipationPoints = differenceInDays(date, today);
          newIndicators[dateKey] = {
            activityStatus: 'none',
            activityTypes: [],
            hasEvent: false,
            anticipationPoints: Math.max(0, anticipationPoints),
            bookingsCount: 0,
            confirmedCount: 0
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

  // --- Event Handlers (con guardado de preferencias) ---
  const handleTimeFilterChange = (value: TimeOfDayFilterType) => {
    updateUrlFilter('time', value);
    // Guardar preferencia
    updatePreferences({ timeSlotFilter: value });
  };

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('date', format(date, 'yyyy-MM-dd'));
    // ✅ Mantener viewPref al cambiar de fecha (no borrar)
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

    // Guardar preferencia
    updatePreferences({ viewPreference: pref });

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

  // --- Player Count Filter Handlers (con guardado de preferencias) ---
  const handleTogglePlayerCount = useCallback((count: number) => {
    const newCounts = new Set(selectedPlayerCounts);
    if (newCounts.has(count)) {
      newCounts.delete(count);
    } else {
      newCounts.add(count);
    }

    const countsArray = Array.from(newCounts).sort();

    // Guardar preferencia
    updatePreferences({ playerCounts: countsArray.length > 0 ? countsArray : [1, 2, 3, 4] });

    if (countsArray.length === 4) {
      // All selected, remove param
      updateUrlFilter('players', null);
    } else if (countsArray.length === 0) {
      // None selected, reset to all
      updateUrlFilter('players', null);
    } else {
      updateUrlFilter('players', countsArray.join(','));
    }
  }, [selectedPlayerCounts, updateUrlFilter, updatePreferences]);

  const handleSelectAllPlayerCounts = useCallback(() => {
    updateUrlFilter('players', null); // Null means all selected
    updatePreferences({ playerCounts: [1, 2, 3, 4] });
  }, [updateUrlFilter, updatePreferences]);

  const handleDeselectAllPlayerCounts = useCallback(() => {
    updateUrlFilter('players', ''); // Empty means none selected, will reset to all
  }, [updateUrlFilter, updatePreferences]);

  const handleInstructorChange = useCallback((instructorIds: string[]) => {
    // Guardar preferencia
    updatePreferences({ instructorIds });

    if (instructorIds.length === 0) {
      // None selected means all
      updateUrlFilter('instructors', null);
    } else {
      updateUrlFilter('instructors', instructorIds.join(','));
    }
  }, [updateUrlFilter, updatePreferences]);

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
    selectedInstructorIds,
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
    handleInstructorChange,
    updateUrlFilter,
  };
}

// src/app/(app)/activities/components/ActivitiesPageContent.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ClassDisplay from '@/components/classfinder/ClassDisplay';
import MatchDisplay from '@/components/classfinder/MatchDisplay';
import { ClassesDisplay } from '@/components/class/ClassesDisplay';
import OpenGroupClasses from '@/components/class/OpenGroupClasses';
import { getMockTimeSlots, fetchMatches, fetchMatchDayEventsForDate, createMatchesForDay, getMockClubs } from '@/lib/mockData';
import type { TimeSlot, User, Match, MatchDayEvent, Club, ActivityViewType } from '@/types';
import { addDays, isSameDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ActivityTypeSelectionDialog from './ActivityTypeSelectionDialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import DateSelector from '@/components/admin/DateSelector';

interface ActivitiesPageContentProps {
    currentUser: User | null;
    onCurrentUserUpdate: (newFavoriteIds: string[]) => void;
}

export default function ActivitiesPageContent({ currentUser, onCurrentUserUpdate }: ActivitiesPageContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [userBookings, setUserBookings] = useState<any[]>([]);
    
    const activityFilters = useActivityFilters(currentUser, onCurrentUserUpdate);
    
    // Cargar bookings del usuario para los indicadores
    useEffect(() => {
        const loadUserBookings = async () => {
            if (!currentUser?.id) return;
            try {
                const response = await fetch(`/api/users/${currentUser.id}/bookings`);
                if (response.ok) {
                    const bookings = await response.json();
                    const formattedBookings = bookings.map((b: any) => ({
                        timeSlotId: b.timeSlotId,
                        status: b.status,
                        date: b.timeSlot?.start || b.start || new Date()
                    }));
                    setUserBookings(formattedBookings);
                }
            } catch (error) {
                console.error('❌ Error cargando bookings:', error);
            }
        };
        loadUserBookings();
    }, [currentUser, activityFilters.refreshKey]);

    // 🔄 Detectar parámetro de refresh en la URL para forzar recarga
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('refresh')) {
                console.log('🔄 Parámetro refresh detectado - Forzando recarga de datos');
                // Limpiar el parámetro de la URL sin recargar
                window.history.replaceState({}, '', '/activities');
                // Forzar recarga incrementando el refreshKey
                activityFilters.triggerRefresh();
            }
        }
    }, [activityFilters]);
    
    const {
        activeView,
        selectedDate,
        handleDateChange,
        triggerRefresh,
        dateStripIndicators,
        dateStripDates,
        showPointsBonus,
        handleViewPrefChange,
        handleTimeFilterChange,
        handleInstructorChange,
        ...restOfFilters
    } = activityFilters;
    
    const [currentClub, setCurrentClub] = useState<Club | null>(null);
    const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);
    const [allMatches, setAllMatches] = useState<Match[]>([]);
    const [matchDayEvents, setMatchDayEvents] = useState<MatchDayEvent[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [useNewClassesSystem, setUseNewClassesSystem] = useState(true);

    const [activitySelection, setActivitySelection] = useState<{
        isOpen: boolean;
        date: Date | null;
        preference: any | null;
        types: ('class' | 'match')[];
    }>({ isOpen: false, date: null, preference: null, types: [] });

    // Guard against disabled sections based on club settings
    useEffect(() => {
        if (!currentClub) return;
        const isClassesEnabled = currentClub.showClassesTabOnFrontend ?? true;
        if (activityFilters.activeView === 'clases' && !isClassesEnabled) {
            const fallback: ActivityViewType = 'clases';
            if (activityFilters.activeView !== fallback) {
                toast({ title: 'Sección deshabilitada', description: 'Esta actividad no está disponible en tu club.', variant: 'default' });
                activityFilters.handleViewPrefChange(activityFilters.viewPreference, fallback);
            }
        }
    }, [currentClub, activityFilters.activeView, activityFilters.viewPreference]);


    const handleBookingSuccess = useCallback(async () => {
        if (currentClub) {
            setIsInitialLoading(true);
            try {
                const matches = await fetchMatches(currentClub.id);
                // SOLO usar matches reales de la API - NO GENERAR MOCK
                console.log('📋 Usando SOLO matches reales:', matches.length);
                setAllMatches(matches);
            } catch (error) {
                console.error("Error refreshing matches after booking", error);
            } finally {
                setIsInitialLoading(false);
                // Force refresh of date strip indicators and other derived data
                triggerRefresh();
            }
        } else {
            triggerRefresh();
        }
    }, [currentClub, triggerRefresh]);
    
    useEffect(() => {
        const loadInitialData = async () => {
            setIsInitialLoading(true);
            try {
                // Usar clubes reales de la API
                let clubs = [];
                let club = null;
                
                try {
                    const clubsResponse = await fetch('/api/clubs');
                    if (clubsResponse.ok) {
                        clubs = await clubsResponse.json();
                        // Priorizar "Padel Estrella" por ID o nombre
                        club = clubs.find(c => 
                            c.id === 'cmftnbe2o0001tgkobtrxipip' || 
                            c.name.toLowerCase().includes('estrella')
                        ) || clubs[0];
                        console.log('🏢 Clubes disponibles:', clubs.map(c => `${c.name} (${c.id})`));
                        console.log('✅ Club seleccionado:', club?.name, 'ID:', club?.id);
                    }
                } catch (error) {
                    console.log('Fallback to mock clubs');
                    clubs = await getMockClubs();
                    club = clubs[0];
                }
                
                console.log('🏢 Club seleccionado:', club?.name, 'ID:', club?.id);
                setCurrentClub(club);
                
                let slots: TimeSlot[] = [];
                let existingMatches: Match[] = [];

                if (club) {
                    // Solo cargar timeslots (clases) desde la API
                    try {
                        const allSlots = await fetch(`/api/timeslots?clubId=${club.id}`)
                            .then(async res => {
                                if (!res.ok) {
                                    const errorText = await res.text();
                                    console.error('❌ Error fetching timeslots:', res.status, res.statusText);
                                    console.error('❌ Detalle del error:', errorText);
                                    throw new Error(`API Error ${res.status}: ${errorText}`);
                                }
                                const data = await res.json();
                                console.log('✅ Timeslots cargados desde API:', data.length);
                                return data.slots || data;
                            });
                        
                        slots = Array.isArray(allSlots) ? allSlots.filter(s => s.clubId === club.id) : allSlots.filter(s => s.clubId === club.id);
                    } catch (timeslotError) {
                        console.error('Error loading timeslots:', timeslotError);
                        // No mostrar toast si es solo error de timeslots, continuar con array vacío
                        slots = [];
                    }
                    
                    // Solo cargar matches si están habilitados en el club
                    if (club.matchesEnabled !== false) {
                        try {
                            existingMatches = await fetchMatches(club.id);
                            console.log('🎾 Matches cargados:', existingMatches.length);
                        } catch (matchError) {
                            console.error('Error loading matches:', matchError);
                            // No mostrar toast si es solo error de matches
                            existingMatches = [];
                        }
                    } else {
                        console.log('🚫 Matches deshabilitados para este club');
                    }
                    
                    console.log('📊 Total slots filtrados para club:', slots.length);
                }

                setAllTimeSlots(slots);
                
                // SOLO usar matches reales de la API - NO GENERAR MOCK DATA
                console.log('📋 Usando SOLO matches reales de fetchMatches:', existingMatches.length);
                setAllMatches(existingMatches);

            } catch (error) {
                console.error("Error fetching initial data", error);
                // Solo mostrar toast si es un error crítico (no pudo cargar clubs)
                toast({ title: "Error", description: "No se pudieron cargar las actividades.", variant: "destructive" });
            } finally {
                setIsInitialLoading(false);
            }
        };
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityFilters.refreshKey]);

    useEffect(() => {
        const fetchEventsForDate = async () => {
            if (selectedDate && currentClub) {
                const events = await fetchMatchDayEventsForDate(selectedDate, currentClub.id);
                setMatchDayEvents(events);
            } else {
                setMatchDayEvents([]);
            }
        };
        fetchEventsForDate();
    }, [selectedDate, currentClub]);
    

    // Helper to map dialog types to ActivityViewType used in URL/state
    const toActivityViewType = (t: 'class' | 'match' | 'clases'): ActivityViewType => {
        if (t === 'class') return 'clases';
        if (t === 'match') return 'matchpro'; // Redirigir matches a matchpro
        return t as ActivityViewType;
    };

    // Accept either a single type string or an array (defensive), and normalize.
    const onViewPrefChange = (
        date: Date,
        pref: any,
        types: ('class' | 'match' | 'event')[] | 'class' | 'match' | 'clases',
        eventId?: string
    ) => {
        const arr = Array.isArray(types) ? types : [types];
        // Normalize any 'clases' inputs into 'class' for internal branching
        const normalized = arr.map((t) => (t === 'clases' ? 'class' : t)) as ('class'|'match'|'event')[];
        const relevantTypes = normalized.filter(t => t !== 'event') as ('class' | 'match')[];

        if (relevantTypes.length > 1) {
            setActivitySelection({ isOpen: true, date, preference: pref, types: relevantTypes });
        } else if (relevantTypes.length === 1) {
            // IMPORTANT: handleViewPrefChange expects (pref, type, date)
            handleViewPrefChange(pref, toActivityViewType(relevantTypes[0]), date);
        } else if (normalized.includes('event') && eventId) {
            router.push(`/match-day/${eventId}`);
        } else {
            handleViewPrefChange(pref, activeView, date);
        }
    };

    // Prop-compatible wrapper to match child components' expected signature
    const onViewPrefChangeCompat = (
        date: Date,
        pref: any,
        type: 'class' | 'match' | 'event',
        eventId?: string
    ) => {
        if (type === 'event') {
            if (eventId) router.push(`/match-day/${eventId}`);
            return;
        }
        const mapped: ActivityViewType = type === 'class' ? 'clases' : 'matchpro';
        handleViewPrefChange(pref, mapped, date);
    };
    
    const handleActivityTypeSelect = (type: 'class' | 'match') => {
        if (activitySelection.date && activitySelection.preference) {
            // Map to ActivityViewType and call with correct parameter order
            handleViewPrefChange(activitySelection.preference, toActivityViewType(type), activitySelection.date);
        }
        setActivitySelection({ isOpen: false, date: null, preference: null, types: [] });
    };

    // Pre-filter classes by favorites as an extra safety net (top-level to respect Hooks rules)
    const preFilteredClasses = useMemo(() => {
        const favoritesActive = activityFilters.filterByFavorites || ((currentUser?.favoriteInstructorIds?.length || 0) > 0);
        if (!favoritesActive) return allTimeSlots;
        const favIds = currentUser?.favoriteInstructorIds || [];
        if (!favIds.length) return [];
        return allTimeSlots.filter(cls => favIds.includes(cls.instructorId || ''));
    }, [activityFilters.filterByFavorites, allTimeSlots, currentUser?.favoriteInstructorIds]);

    const renderContent = () => {
        if (isInitialLoading) return <PageSkeleton />;
        
        switch(activeView) {
            case 'clases':
                return (
                    <div className="space-y-4">
                        <ClassesDisplay 
                            selectedDate={selectedDate}
                            clubId={currentClub?.id || "club-1"}
                            currentUser={currentUser}
                            onBookingSuccess={triggerRefresh}
                            timeSlotFilter={activityFilters.timeSlotFilter}
                            selectedPlayerCounts={Array.from(activityFilters.selectedPlayerCounts)}
                            selectedInstructorIds={activityFilters.selectedInstructorIds}
                            viewPreference={activityFilters.viewPreference as 'withBookings' | 'all' | 'myConfirmed'}
                            externalRefreshKey={activityFilters.refreshKey}
                            onTimeSlotFilterChange={handleTimeFilterChange}
                            onInstructorIdsChange={handleInstructorChange}
                            onViewPreferenceChange={(view) => handleViewPrefChange(view, 'clases')}
                        />
                    </div>
                );
            case 'grupos':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-green-900">🎯 Clases Grupales Abiertas</h3>
                                <p className="text-sm text-green-700">
                                    Únete a clases propuestas por instructores. Cuando se complete el grupo (4 jugadores), se asignará automáticamente una cancha.
                                </p>
                            </div>
                        </div>
                        <OpenGroupClasses 
                            clubId="club-1"
                            selectedDate={selectedDate}
                            currentUserId={currentUser?.id || 'user-1'}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    // 🔄 Sincronización: Recargar cuando el usuario vuelve a esta página
    useEffect(() => {
        // Detectar cuando la página gana foco (usuario regresa desde otra página)
        const handleFocus = () => {
            console.log('🔄 Página enfocada - Refrescando datos...');
            triggerRefresh();
        };

        // Detectar cambios de storage (cancelaciones en otras pestañas)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'bookingCancelled' && e.newValue) {
                console.log('🔄 Cancelación detectada desde otra pestaña - Refrescando...');
                triggerRefresh();
            }
        };

        // Detectar cuando la página se hace visible
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('🔄 Página visible - Refrescando datos...');
                triggerRefresh();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [triggerRefresh]);

    return (
        <>
            {/* Contenedor principal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto px-2 md:px-6 pb-[70px] md:pb-6 space-y-2 md:space-y-4 md:pt-4">
                    {/* Calendario unificado - usa el mismo componente que ClubCalendar */}
                    <div className="hidden md:block">
                        <DateSelector
                            selectedDate={selectedDate}
                            onDateChange={handleDateChange}
                            daysToShow={30}
                            userBookings={userBookings}
                        />
                    </div>

                    {/* Calendario móvil - mismo componente pero en posición fija abajo */}
                    <div className="block md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
                        <DateSelector
                            selectedDate={selectedDate}
                            onDateChange={handleDateChange}
                            daysToShow={30}
                            userBookings={userBookings}
                        />
                    </div>

                    {renderContent()}
                </main>
                <ActivityTypeSelectionDialog
                    isOpen={activitySelection.isOpen}
                    onOpenChange={(isOpen) => setActivitySelection(prev => ({ ...prev, isOpen }))}
                    onSelect={handleActivityTypeSelect}
                />
            </div>
        </>
    );
}

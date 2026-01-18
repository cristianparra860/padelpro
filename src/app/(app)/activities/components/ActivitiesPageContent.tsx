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
import { Plus, Gift } from 'lucide-react';
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
                // 1. Fetch Class Bookings
                const classBookingsRes = await fetch(`/api/users/${currentUser.id}/bookings`);
                let classBookings = [];
                if (classBookingsRes.ok) {
                    classBookings = await classBookingsRes.json();
                }

                // 2. Fetch Match Bookings
                const matchBookingsRes = await fetch(`/api/users/${currentUser.id}/match-bookings`);
                let matchBookings = [];
                if (matchBookingsRes.ok) {
                    matchBookings = await matchBookingsRes.json();
                }

                // 3. Format Class Bookings
                const formattedClassBookings = classBookings.map((b: any) => ({
                    timeSlotId: b.timeSlotId,
                    status: b.status,
                    date: b.timeSlot?.start || b.start || new Date()
                }));

                // 4. Format Match Bookings
                // Los bookings de match vienen con structure { matchGame: { start: ... }, status: ... }
                // Debemos mapear el status real.
                const formattedMatchBookings = matchBookings.map((mb: any) => ({
                    timeSlotId: mb.matchGameId,
                    status: mb.status, // Usar el status real (CONFIRMED/PENDING)
                    date: mb.matchGame?.start || new Date()
                }));

                // 5. Combine and Set
                setUserBookings([...formattedClassBookings, ...formattedMatchBookings]);

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
    // AllMatches removed as it was unused
    const [matchDayEvents, setMatchDayEvents] = useState<MatchDayEvent[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [useNewClassesSystem, setUseNewClassesSystem] = useState(true);

    // 🎁 Estado para modo puntos (solo instructores)
    const [creditsEditMode, setCreditsEditMode] = useState(false);
    const isInstructor = currentUser?.role === 'instructor';

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
                // Matches logic removed as it was unused and slowing down
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
                let clubs: Club[] = [];
                let club: Club | null = null;

                try {
                    const clubsResponse = await fetch('/api/clubs');
                    if (clubsResponse.ok) {
                        const data = await clubsResponse.json();
                        clubs = data as Club[];
                        // Priorizar "Padel Estrella" por ID o nombre
                        club = clubs.find((c: Club) =>
                            c.id === 'cmftnbe2o0001tgkobtrxipip' ||
                            c.name.toLowerCase().includes('estrella')
                        ) || clubs[0];
                        console.log('🏢 Clubes disponibles:', clubs.map((c: Club) => `${c.name} (${c.id})`));
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
                if (club) {
                    // ⚡ OPTIMIZACIÓN: No cargar 1000 timeslots al inicio.
                    // ClassesDisplay se encarga de cargar los timeslots por fecha.
                    console.log('⚡ Optimización: Saltando carga masiva de timeslots (se cargarán por fecha en ClassesDisplay)');
                    slots = [];

                    console.log('📊 Total slots filtrados para club:', slots.length);
                }

                setAllTimeSlots(slots);

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
        const normalized = arr.map((t) => (t === 'clases' ? 'class' : t)) as ('class' | 'match' | 'event')[];
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

        switch (activeView) {
            case 'clases':
                return (
                    <div className="space-y-4">
                        {/* Botones HOY/MAÑANA - Alineados con el grid de tarjetas */}
                        <div className="ml-0 md:ml-64 lg:ml-72 xl:ml-80 flex items-center gap-3">
                            {/* Button Hoy */}
                            <button
                                onClick={() => handleDateChange(new Date())}
                                className="group relative px-6 py-2 bg-black hover:bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 border-2 border-white ring-1 ring-gray-200/50"
                            >
                                Hoy
                                {/* Glow effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
                            </button>

                            {/* Button Mañana */}
                            <button
                                onClick={() => handleDateChange(new Date(Date.now() + 86400000))}
                                className="group relative px-6 py-2 bg-black hover:bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 border-2 border-white ring-1 ring-gray-200/50"
                            >
                                Mañana
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
                            </button>
                        </div>

                        <ClassesDisplay
                            selectedDate={selectedDate || new Date()}
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
                            creditsEditMode={creditsEditMode}
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
                            selectedDate={selectedDate || new Date()}
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
            <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
                {/* Calendario desktop fijo - fuera del scroll */}
                <div className="hidden md:block md:sticky md:top-0 md:z-30 md:bg-white md:border-b md:border-gray-100 md:shadow-sm">
                    {/* Header Combinado: Botones Hoy/Mañana y Calendario */}
                    <div className="flex items-center w-full mb-1">
                        {/* DateSelector - Flexible */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <DateSelector
                                selectedDate={selectedDate || new Date()}
                                onDateChange={handleDateChange}
                                daysToShow={30}
                                userBookings={userBookings}
                            />
                        </div>
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-6 pb-6 space-y-2 md:space-y-4 md:pt-4">
                    {/* Calendario móvil - arriba de la página solo en móvil */}
                    <div className="block md:hidden bg-white border-b border-gray-100 -mx-2 sticky top-0 z-30">
                        <DateSelector
                            selectedDate={selectedDate || new Date()}
                            onDateChange={handleDateChange}
                            daysToShow={30}
                            userBookings={userBookings}
                        />
                    </div>

                    {/* 🎁 Botón Modo Puntos - Solo para instructores */}
                    {isInstructor && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setCreditsEditMode(!creditsEditMode)}
                                variant={creditsEditMode ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    "gap-2 transition-all",
                                    creditsEditMode
                                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md"
                                        : "border-amber-400 text-amber-700 hover:bg-amber-50"
                                )}
                            >
                                <Gift className="w-4 h-4" />
                                {creditsEditMode ? "✓ Modo Puntos Activo" : "🎁 Activar Modo Puntos"}
                            </Button>
                        </div>
                    )}

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

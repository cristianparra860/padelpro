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

interface ActivitiesPageContentProps {
    currentUser: User | null;
    onCurrentUserUpdate: (newFavoriteIds: string[]) => void;
}

export default function ActivitiesPageContent({ currentUser, onCurrentUserUpdate }: ActivitiesPageContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    
    const activityFilters = useActivityFilters(currentUser, onCurrentUserUpdate);
    
    const {
        activeView,
        selectedDate,
        handleDateChange,
        triggerRefresh,
        dateStripIndicators,
        dateStripDates,
        showPointsBonus,
        handleViewPrefChange,
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
                // Generate proposals first, then append fetched matches so fetched overwrite proposals on duplicate ids
                let combinedMatches: Match[] = [];
                for (let i = 0; i < 7; i++) {
                    const date = addDays(new Date(), i);
                    combinedMatches = [...combinedMatches, ...createMatchesForDay(currentClub, date)];
                }
                combinedMatches = [...combinedMatches, ...matches];
                const uniqueMatches = Array.from(new Map(combinedMatches.map(item => [item['id'], item])).values());
                setAllMatches(uniqueMatches);
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
                    const [allSlots, fetchedMatches] = await Promise.all([
                        // Usar datos reales de la API en lugar de mock
                        fetch(`/api/timeslots?clubId=${club.id}`)
                            .then(async res => {
                                if (!res.ok) {
                                    console.error('❌ Error fetching timeslots:', res.status, res.statusText);
                                    throw new Error(`HTTP error! status: ${res.status}`);
                                }
                                const data = await res.json();
                                console.log('✅ Timeslots cargados:', data.length);
                                return data;
                            })
                            .catch(error => {
                                console.error('❌ Error en fetch de timeslots:', error);
                                return getMockTimeSlots();
                            }),
                        fetchMatches(club.id),
                    ]);
                    slots = Array.isArray(allSlots) ? allSlots.filter(s => s.clubId === club.id) : allSlots.filter(s => s.clubId === club.id);
                    existingMatches = fetchedMatches;
                    console.log('📊 Total slots filtrados para club:', slots.length);
                }

                setAllTimeSlots(slots);
                
                // Generate proposals first, then append fetched matches so fetched overwrite proposals on duplicate ids
                let combinedMatches: Match[] = [];
                if (club) {
                    for (let i = 0; i < 7; i++) {
                        const date = addDays(new Date(), i);
                        combinedMatches = [...combinedMatches, ...createMatchesForDay(club, date)];
                    }
                }
                combinedMatches = [...combinedMatches, ...existingMatches];
                const uniqueMatches = Array.from(new Map(combinedMatches.map(item => [item['id'], item])).values());
                setAllMatches(uniqueMatches);

            } catch (error) {
                console.error("Error fetching initial data", error);
                toast({ title: "Error", description: "No se pudieron cargar las actividades.", variant: "destructive" });
            } finally {
                setIsInitialLoading(false);
            }
        };
        loadInitialData();
    }, [activityFilters.refreshKey, toast]);

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
                        {/* Toggle para alternar entre sistemas de clases */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-blue-900">
                                    {useNewClassesSystem ? 'Sistema de Clases (Base de Datos)' : 'Sistema de Clases (Mock)'}
                                </h3>
                                <p className="text-sm text-blue-700">
                                    {useNewClassesSystem 
                                        ? 'Mostrando clases reales desde la base de datos con instructores y reservas'
                                        : 'Mostrando clases del sistema mock original'
                                    }
                                </p>
                            </div>
                            <Button
                                onClick={() => setUseNewClassesSystem(!useNewClassesSystem)}
                                variant={useNewClassesSystem ? "default" : "outline"}
                                className="ml-4"
                            >
                                {useNewClassesSystem ? 'Usar Mock' : 'Usar BD'}
                            </Button>
                        </div>

                        {/* Renderizar el sistema correspondiente */}
                        {useNewClassesSystem ? (
                            <ClassesDisplay 
                                selectedDate={selectedDate}
                                clubId={currentClub?.id || "club-1"}
                                currentUser={currentUser}
                                onBookingSuccess={triggerRefresh}
                                timeSlotFilter={activityFilters.timeSlotFilter}
                                selectedPlayerCounts={Array.from(activityFilters.selectedPlayerCounts)}
                                viewPreference={activityFilters.viewPreference as 'withBookings' | 'all' | 'myConfirmed'}
                            />
                        ) : (
                            <ClassDisplay
                                {...restOfFilters}
                                currentUser={currentUser}
                                onBookingSuccess={handleBookingSuccess}
                                selectedDate={selectedDate}
                                onDateChange={handleDateChange}
                                filterByFavoriteInstructors={activityFilters.filterByFavorites}
                                allClasses={preFilteredClasses}
                                isLoading={isInitialLoading}
                                dateStripIndicators={dateStripIndicators}
                                dateStripDates={dateStripDates}
                                onViewPrefChange={onViewPrefChangeCompat}
                                selectedLevelsSheet={[]}
                                sortBy={'time'}
                                filterAlsoConfirmedClasses={false}
                                proposalView={'join'}
                                showPointsBonus={showPointsBonus}
                            />
                        )}
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

    return (
        <>
            {/* Calendario fijo solo para móvil - COMPLETAMENTE FIJO en la pantalla */}
            <div className="fixed top-0 left-0 right-0 z-50 md:hidden">
                {/* Fondo con gradiente blanco - más opaco arriba, 1% en la parte baja */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/100 via-white/70 via-white/50 via-white/[0.01] to-white/[0.01] backdrop-blur-sm"></div>
                {/* Zona transparente para los pequeños indicadores */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent"></div>
                <div className="relative px-2 pt-1 pb-1">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-1 py-0.5">
                            {dateStripDates.map(day => {
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const indicators = dateStripIndicators[dateKey] || { activityStatus: 'none', hasEvent: false, anticipationPoints: 0 };
                                
                                return (
                                <div key={day.toISOString()} className="flex flex-col items-center space-y-0.5 relative pt-2">
                                    {indicators.anticipationPoints > 0 && showPointsBonus && (
                                        <div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex h-auto items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-white shadow"
                                        title={`+${indicators.anticipationPoints} puntos por reservar con antelación`}
                                        >
                                        <span className="text-[9px] font-bold">+{indicators.anticipationPoints}</span>
                                        </div>
                                    )}
                                    <Button variant={isSelected ? "default" : "outline"} size="sm"
                                        className={cn(
                                            "h-auto px-1 py-0.5 flex flex-col items-center justify-center leading-tight shadow-sm w-9",
                                            isSameDay(day, new Date()) && !isSelected && "border-primary text-primary font-semibold",
                                            isSelected && "shadow-md"
                                        )}
                                        onClick={() => handleDateChange(day)}
                                    >
                                        <span className="font-bold text-[9px] uppercase">{format(day, "EEE", { locale: es }).slice(0, 3)}</span>
                                        <span className="text-xs font-bold">{format(day, "d", { locale: es })}</span>
                                        <span className="text-[8px] text-muted-foreground capitalize -mt-0.5">{format(day, "MMM", { locale: es }).slice(0,3)}</span>
                                    </Button>

                                    <div className="h-10 w-8 flex flex-col items-center justify-center relative space-y-0.5 bg-transparent">
                                        <TooltipProvider delayDuration={150}>
                                            {indicators.activityStatus === 'confirmed' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => onViewPrefChangeCompat(day, 'myConfirmed', indicators.activityTypes.includes('class') ? 'class' : 'match')}
                                                            className="h-6 w-6 flex items-center justify-center bg-destructive text-destructive-foreground rounded-md font-bold text-xs leading-none cursor-pointer hover:scale-110 transition-transform"
                                                        >
                                                            R
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Ver mis reservas</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                            {indicators.activityStatus === 'inscribed' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        {indicators.activityTypes.includes('event') && indicators.eventId ? (
                                                            <Link href={`/match-day/${indicators.eventId}`} passHref>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-blue-500 text-white hover:bg-blue-600">I</Button>
                                                            </Link>
                                                        ) : (
                                                            <button
                                                                onClick={() => onViewPrefChangeCompat(day, 'myInscriptions', indicators.activityTypes.includes('class') ? 'class' : 'match')}
                                                                className="h-6 w-6 flex items-center justify-center bg-blue-500 text-white rounded-md font-bold text-xs leading-none cursor-pointer hover:scale-110 transition-transform"
                                                            >
                                                                I
                                                            </button>
                                                        )}
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Ver mis inscripciones</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                            {indicators.hasEvent && indicators.activityStatus === 'none' && (
                                                <Tooltip><TooltipTrigger asChild><Link href={`/match-day/${indicators.eventId}`} passHref><Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-primary/10 hover:bg-primary/20 animate-pulse-blue border border-primary/50"><Plus className="h-4 w-4 text-primary" /></Button></Link></TooltipTrigger><TooltipContent><p>¡Apúntate al Match-Day!</p></TooltipContent></Tooltip>
                                            )}
                                        </TooltipProvider>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" className="h-1 mt-0.5" />
                    </ScrollArea>
                </div>
            </div>

            {/* Contenedor principal con padding-top para evitar que el calendario fijo oculte el contenido */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-20 md:pb-6 space-y-4 pt-[80px] md:pt-4">
                    {/* Calendario para desktop */}
                    <div className="hidden md:block -mt-4">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex space-x-2 py-1">
                                {dateStripDates.map(day => {
                                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const indicators = dateStripIndicators[dateKey] || { activityStatus: 'none', hasEvent: false, anticipationPoints: 0 };
                                    
                                    return (
                                    <div key={day.toISOString()} className="flex flex-col items-center space-y-1 relative pt-4">
                                        {indicators.anticipationPoints > 0 && showPointsBonus && (
                                            <div
                                            className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex h-auto items-center justify-center rounded-full bg-amber-400 px-2 py-0.5 text-white shadow"
                                            title={`+${indicators.anticipationPoints} puntos por reservar con antelación`}
                                            >
                                            <span className="text-[10px] font-bold">+{indicators.anticipationPoints}</span>
                                            </div>
                                        )}
                                        <Button variant={isSelected ? "default" : "outline"} size="sm"
                                            className={cn(
                                                "h-auto px-1.5 py-1 flex flex-col items-center justify-center leading-tight shadow-sm w-10",
                                                isSameDay(day, new Date()) && !isSelected && "border-primary text-primary font-semibold",
                                                isSelected && "shadow-md"
                                            )}
                                            onClick={() => handleDateChange(day)}
                                        >
                                            <span className="font-bold text-[10px] uppercase">{format(day, "EEE", { locale: es }).slice(0, 3)}</span>
                                            <span className="text-sm font-bold">{format(day, "d", { locale: es })}</span>
                                            <span className="text-[9px] text-muted-foreground capitalize -mt-0.5">{format(day, "MMM", { locale: es }).slice(0,3)}</span>
                                        </Button>

                                        <div className="h-10 w-8 flex flex-col items-center justify-center relative space-y-0.5">
                                            <TooltipProvider delayDuration={150}>
                                                {indicators.activityStatus === 'confirmed' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => onViewPrefChangeCompat(day, 'myConfirmed', indicators.activityTypes.includes('class') ? 'class' : 'match')}
                                                                className="h-6 w-6 flex items-center justify-center bg-destructive text-destructive-foreground rounded-md font-bold text-xs leading-none cursor-pointer hover:scale-110 transition-transform"
                                                            >
                                                                R
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Ver mis reservas</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {indicators.activityStatus === 'inscribed' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            {indicators.activityTypes.includes('event') && indicators.eventId ? (
                                                                <Link href={`/match-day/${indicators.eventId}`} passHref>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-blue-500 text-white hover:bg-blue-600">I</Button>
                                                                </Link>
                                                            ) : (
                                                                <button
                                                                    onClick={() => onViewPrefChangeCompat(day, 'myInscriptions', indicators.activityTypes.includes('class') ? 'class' : 'match')}
                                                                    className="h-6 w-6 flex items-center justify-center bg-blue-500 text-white rounded-md font-bold text-xs leading-none cursor-pointer hover:scale-110 transition-transform"
                                                                >
                                                                    I
                                                                </button>
                                                            )}
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Ver mis inscripciones</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {indicators.hasEvent && indicators.activityStatus === 'none' && (
                                                    <Tooltip><TooltipTrigger asChild><Link href={`/match-day/${indicators.eventId}`} passHref><Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-primary/10 hover:bg-primary/20 animate-pulse-blue border border-primary/50"><Plus className="h-4 w-4 text-primary" /></Button></Link></TooltipTrigger><TooltipContent><p>¡Apúntate al Match-Day!</p></TooltipContent></Tooltip>
                                                )}
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-2 mt-1" />
                        </ScrollArea>
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

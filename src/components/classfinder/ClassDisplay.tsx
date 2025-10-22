

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, SearchX, CalendarDays, Plus, CheckCircle, Eye, Users, Sparkles, ArrowRight } from 'lucide-react';
import ClassCard from '@/components/class/ClassCard';
import { isProposalSlot as checkIsProposalSlot } from '@/lib/mockDataSources/classProposals';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { fetchTimeSlots, getMockCurrentUser, isSlotEffectivelyCompleted, findAvailableCourt, isSlotGratisAndAvailable, fetchMatchDayEventsForDate, getUserActivityStatusForDay, getMockClubs, getCourtAvailabilityForInterval, getMockInstructors } from '@/lib/mockData';
import type { TimeSlot, User, Booking, MatchPadelLevel, SortOption, Instructor, MatchDayEvent, UserActivityStatusForDay, ViewPreference } from '@/types';
import { format, isSameDay, addDays, startOfDay, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, isUserLevelCompatibleWithActivity } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


interface ClassDisplayProps {
  currentUser: User | null;
  onBookingSuccess: () => void;
  filterByClubId?: string | null;
  filterByGratisOnly?: boolean;
  filterByLiberadasOnly?: boolean;
  onDeactivateGratisFilter?: () => void;
  // Shared filter props
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  timeSlotFilter: string;
  selectedLevelsSheet: MatchPadelLevel[];
  sortBy: SortOption;
  filterAlsoConfirmedClasses: boolean;
  filterByFavoriteInstructors: boolean;
  viewPreference: ViewPreference;
  proposalView: 'join' | 'propose';
  refreshKey: number;
  allClasses: TimeSlot[];
  isLoading: boolean;
  dateStripIndicators: Record<string, UserActivityStatusForDay>;
  dateStripDates: Date[];
  onViewPrefChange: (date: Date, pref: ViewPreference, type: 'class' | 'match' | 'event', eventId?: string) => void;
  showPointsBonus: boolean; // New prop for visibility
  selectedPlayerCounts: Set<number>; // New prop for player count filter
}

const ITEMS_PER_PAGE = 9;

const ClassDisplay: React.FC<ClassDisplayProps> = ({
    currentUser, onBookingSuccess, filterByClubId, filterByGratisOnly, filterByLiberadasOnly, onDeactivateGratisFilter,
    selectedDate, onDateChange, timeSlotFilter, selectedLevelsSheet: selectedLevelsFromParent, sortBy,
    filterAlsoConfirmedClasses, filterByFavoriteInstructors, viewPreference, proposalView, refreshKey,
    allClasses, isLoading, dateStripIndicators, dateStripDates, onViewPrefChange, showPointsBonus, selectedPlayerCounts
}) => {
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [filteredClasses, setFilteredClasses] = useState<TimeSlot[]>([]);
    const [displayedClasses, setDisplayedClasses] = useState<TimeSlot[]>([]);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [canLoadMore, setCanLoadMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    
    const selectedLevel = searchParams.get('level') as MatchPadelLevel | 'all' || 'all';
    const favoritesFlagFromUrl = searchParams.get('favorites') === 'true';
    const favoritesActive = filterByFavoriteInstructors || favoritesFlagFromUrl;

    const calculateOptionOccupancy = (slot: TimeSlot): number => {
        if (!slot.bookedPlayers || slot.bookedPlayers.length === 0) return 0;
        const maxOccupancy = Math.max(0, ...slot.bookedPlayers.map(p => {
             const groupBookings = slot.bookedPlayers.filter(bp => bp.groupSize === p.groupSize);
             return groupBookings.length / p.groupSize;
        }));
        return maxOccupancy;
    };

    const applyClassFilters = useCallback(async (classesToFilter: TimeSlot[]) => {
        if (!currentUser) {
            setFilteredClasses([]);
            return;
        }

        let workingClasses = [...classesToFilter];
        
    if (filterByLiberadasOnly) {
            workingClasses = workingClasses.filter(cls => {
                const isLiberada = (cls.status === 'confirmed' || cls.status === 'confirmed_private') && isSlotGratisAndAvailable(cls);
                if (!isLiberada) return false;
                return isUserLevelCompatibleWithActivity(cls.level, currentUser?.level);
            });
        } else if (filterByGratisOnly) {
            workingClasses = workingClasses.filter(cls => {
                const isGratis = isSlotGratisAndAvailable(cls);
                if (!isGratis) return false;
                return isUserLevelCompatibleWithActivity(cls.level, currentUser?.level);
            });
        } else {
             if (selectedDate) {
                 workingClasses = workingClasses.filter(cls =>
                    isSameDay(new Date(cls.startTime), selectedDate)
                );
            } else {
                 setFilteredClasses([]);
                 return;
            }
            
            if (timeSlotFilter !== 'all') {
                workingClasses = workingClasses.filter(cls => {
                    const classHour = new Date(cls.startTime).getHours();
                    if (timeSlotFilter === 'morning') return classHour >= 8 && classHour < 13;
                    if (timeSlotFilter === 'midday') return classHour >= 13 && classHour < 18;
                    if (timeSlotFilter === 'evening') return classHour >= 18 && classHour <= 22;
                    return true;
                });
            }

            if (selectedLevel && selectedLevel !== 'all') {
                const club = getMockClubs().find(c => c.id === filterByClubId);
                const range = club?.levelRanges?.find(r => r.name === selectedLevel);
                
                workingClasses = workingClasses.filter(cls => {
                    if (cls.level === 'abierto') {
                        return selectedLevel === 'abierto';
                    }
                    if (range && typeof cls.level === 'object' && 'min' in cls.level && 'max' in cls.level) {
                        return parseFloat(cls.level.min) >= parseFloat(range.min) && parseFloat(cls.level.max) <= parseFloat(range.max);
                    }
                    return false;
                });
            }
            
            // Filtrar según la preferencia de vista
            if (viewPreference === 'withBookings') {
                // Mostrar solo clases que tienen al menos un usuario inscrito
                console.log('🔍 Filtrando por "Con Usuarios"...');
                console.log('📋 Clases antes del filtro:', workingClasses.length);
                workingClasses = workingClasses.filter(cls => {
                    const hasPlayers = (cls.bookedPlayers || []).length > 0;
                    console.log(`   Clase ${cls.id?.substring(0, 8)}: ${hasPlayers ? '✅ Tiene jugadores' : '❌ Sin jugadores'} (${(cls.bookedPlayers || []).length} inscritos)`);
                    return hasPlayers;
                });
                console.log('📋 Clases después del filtro:', workingClasses.length);
            }
            // Si viewPreference === 'all', no aplicamos filtro adicional (mostrar todas)
        }
        
        // Apply favorites filter across all branches, if active
    if (favoritesActive) {
            let favoriteInstructorIds: string[] = [];
            try {
                const fresh = await getMockCurrentUser();
                favoriteInstructorIds = fresh?.favoriteInstructorIds || [];
            } catch {
                favoriteInstructorIds = currentUser?.favoriteInstructorIds || [];
            }
            if (favoriteInstructorIds.length > 0) {
                const instructors = getMockInstructors();
                const favoritesByName = new Set(
                    instructors
                        .filter(inst => favoriteInstructorIds.includes(inst.id))
                        .map(inst => (inst.name || '').trim().toLowerCase())
                );
                workingClasses = workingClasses.filter(cls => {
                    if (cls.instructorId && favoriteInstructorIds.includes(cls.instructorId)) return true;
                    const name = (cls.instructorName || '').trim().toLowerCase();
                    return !cls.instructorId && name && favoritesByName.has(name);
                });
            } else {
                workingClasses = [];
            }
        }

        // Final filter: check court availability
        const availableClasses = [];
        for (const cls of workingClasses) {
            const availability = await getCourtAvailabilityForInterval(cls.clubId, new Date(cls.startTime), new Date(cls.endTime));
            if (availability.available.length > 0) {
                availableClasses.push(cls);
            }
        }

        // Sorting logic with user's bookings first
        availableClasses.sort((a, b) => {
            const isUserInA = (a.bookedPlayers || []).some(p => p.userId === currentUser.id);
            const isUserInB = (b.bookedPlayers || []).some(p => p.userId === currentUser.id);
            if (isUserInA && !isUserInB) return -1;
            if (!isUserInA && isUserInB) return 1;

            const aHasPlayers = (a.bookedPlayers || []).length > 0;
            const bHasPlayers = (b.bookedPlayers || []).length > 0;
            if (aHasPlayers && !bHasPlayers) return -1;
            if (!bHasPlayers && aHasPlayers) return 1;

            const dateA = new Date(a.startTime).getTime();
            const dateB = new Date(b.startTime).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const aOccupancy = calculateOptionOccupancy(a);
            const bOccupancy = calculateOptionOccupancy(b);
            return bOccupancy - aOccupancy;
        });


        setFilteredClasses(availableClasses);
    }, [filterByGratisOnly, filterByLiberadasOnly, selectedDate, timeSlotFilter, selectedLevel, favoritesActive, filterAlsoConfirmedClasses, sortBy, currentUser, viewPreference, filterByClubId]);
    
    useEffect(() => {
        if (!isLoading) {
            applyClassFilters(allClasses);
        }
    }, [applyClassFilters, refreshKey, selectedDate, selectedLevel, allClasses, isLoading, viewPreference, timeSlotFilter, favoritesActive, filterAlsoConfirmedClasses]);

     // Effect to reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredClasses]);

    // Effect to update the displayed list based on pagination
    useEffect(() => {
        setDisplayedClasses(filteredClasses.slice(0, ITEMS_PER_PAGE * currentPage));
        setCanLoadMore(filteredClasses.length > ITEMS_PER_PAGE * currentPage);
    }, [filteredClasses, currentPage]);

    const handleClassBookingSuccess = () => {
        onBookingSuccess();
    };
    
    const handleLoadMore = useCallback(() => {
        if (!canLoadMore || isLoadingMore) return;
        setIsLoadingMore(true);
        setTimeout(() => {
            const nextPage = currentPage + 1;
            setDisplayedClasses(prev => [...prev, ...filteredClasses.slice(prev.length, prev.length + ITEMS_PER_PAGE)]);
            setCurrentPage(nextPage);
            setIsLoadingMore(false);
        }, 300);
    }, [canLoadMore, isLoadingMore, currentPage, filteredClasses]);
    
    useEffect(() => {
        if (!canLoadMore || isLoadingMore || !loadMoreRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) handleLoadMore();
        }, { threshold: 0.1 });
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); observer.disconnect(); };
    }, [canLoadMore, isLoadingMore, handleLoadMore]);
    
    if (isLoading) return <div className="space-y-4"> <Skeleton className="h-10 w-full" /> <div className="w-full px-0 sm:px-3"><div className="space-y-4"><Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" /></div></div></div>

    const handleBackToAvailable = () => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('viewPref', 'all');
        router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    };

    const findNextAvailableDay = (): Date | null => {
        const today = startOfDay(new Date());
        let currentDateToCheck = selectedDate ? addDays(selectedDate, 1) : today;
        const limit = addDays(today, 30); // Search up to 30 days in the future

        while (currentDateToCheck <= limit) {
            const hasClasses = allClasses.some(cls => isSameDay(new Date(cls.startTime), currentDateToCheck));
            if (hasClasses) {
                return currentDateToCheck;
            }
            currentDateToCheck = addDays(currentDateToCheck, 1);
        }
        return null;
    };
    
    const handleNextAvailableClick = () => {
        const nextDay = findNextAvailableDay();
        if (nextDay) {
            onDateChange(nextDay);
        } else {
            toast({
                title: "No hay clases futuras",
                description: "No se encontraron clases disponibles en los próximos 30 días.",
            });
        }
    };


    const activeFavoriteIds = (filterByFavoriteInstructors || favoritesActive) ? (currentUser?.favoriteInstructorIds || []) : [];
    const activeFavoriteNames = useMemo(() => {
        if (!activeFavoriteIds.length) return [] as string[];
        const all = getMockInstructors();
        return all.filter(i => activeFavoriteIds.includes(i.id)).map(i => i.name || i.id);
    }, [activeFavoriteIds]);

    return (
        <div>
            <div className="mt-2">
                {(filterByFavoriteInstructors || favoritesActive) && activeFavoriteNames.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 mb-3">
                        <span className="text-sm text-muted-foreground">Filtrando por:</span>
                        {activeFavoriteNames.map(name => (
                            <Badge key={name} variant="secondary" className="rounded-full px-2 py-1 text-xs">{name}</Badge>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 h-7 px-2 text-xs"
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.delete('favorites');
                                const qs = params.toString();
                                router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                            }}
                        >
                            Quitar filtro
                        </Button>
                    </div>
                )}
                
                {((!selectedDate && !filterByGratisOnly && !filterByLiberadasOnly)) && (
                    <div className="text-center py-16">
                        <CalendarDays className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                        <h2 className="text-2xl font-semibold text-foreground mb-3">Selecciona una fecha</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">Elige un día para ver las clases disponibles.</p>
                    </div>
                )}
                {((selectedDate || filterByGratisOnly || filterByLiberadasOnly)) && displayedClasses.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <SearchX className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                         <h2 className="text-2xl font-semibold text-foreground mb-3">
                            {viewPreference === 'withBookings' ? "No hay clases con usuarios inscritos" :
                             "No se encontraron clases"}
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                             {viewPreference === 'withBookings' ? "No hay clases con usuarios inscritos para este día." :
                             filterByLiberadasOnly ? "No hay plazas liberadas en clases confirmadas por ahora." : 
                             "Prueba a cambiar las fechas o ajusta los filtros."}
                        </p>
                         {viewPreference === 'withBookings' && (
                            <Button onClick={handleBackToAvailable} className="mt-4">
                                <Eye className="mr-2 h-4 w-4"/> Ver Todas
                            </Button>
                        )}
                        {viewPreference === 'all' && (
                            <Button onClick={handleNextAvailableClick} className="mt-4">
                                Próximo día con clases <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
                {displayedClasses.length > 0 && currentUser && (
                    <div className="w-full px-0 sm:px-3">
                        <div className="space-y-4 max-w-[350px] mx-auto md:max-w-none md:mx-0 md:space-y-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(350px,1fr))] md:gap-6">
                            {displayedClasses.map((classData) => (
                                <div key={classData.id} className="w-full">
                                    <ClassCard 
                                        classData={classData} 
                                        currentUser={currentUser} 
                                        onBookingSuccess={handleClassBookingSuccess} 
                                        showPointsBonus={showPointsBonus}
                                        allowedPlayerCounts={Array.from(selectedPlayerCounts)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {canLoadMore && displayedClasses.length > 0 && (
                    <div ref={loadMoreRef} className="h-10 flex justify-center items-center text-muted-foreground mt-6">
                        {isLoadingMore && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClassDisplay;

// src/components/classfinder/MatchDisplay.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Match, User, MatchBooking, MatchPadelLevel, PadelCategoryForSlot, SortOption, TimeOfDayFilterType, MatchDayEvent, UserActivityStatusForDay, ViewPreference, MatchDayInscription } from '@/types';
import { matchPadelLevels, timeSlotFilterOptions } from '@/types';
import MatchCard from '@/components/match/MatchCard';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMatches, getMockClubs, findAvailableCourt, fetchMatchDayEventsForDate, getUserActivityStatusForDay, getMatchDayInscriptions, isUserLevelCompatibleWithActivity, getCourtAvailabilityForInterval } from '@/lib/mockData';
import { isMatchBookableWithPoints } from '@/lib/mockDataSources/utils';
import { Loader2, SearchX, CalendarDays, Plus, CheckCircle, PartyPopper, ArrowRight, Users, Sparkles, Euro, ThumbsUp, Lock, Scissors } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format, isSameDay, addDays, startOfDay, addMinutes, getDay, parse, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PiggyBank, Star, Rocket } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


interface MatchDisplayProps {
  currentUser: User | null;
  onBookingSuccess: () => void;
  filterByClubId?: string | null;
  filterByGratisOnly?: boolean;
  filterByLiberadasOnly?: boolean;
  filterByPuntosOnly?: boolean;
  filterByProOnly?: boolean;
  onDeactivateGratisFilter?: () => void;
  matchShareCode?: string | null;
  matchIdFilter?: string | null;
  // Shared filter props
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  timeSlotFilter: TimeOfDayFilterType;
  selectedLevel: MatchPadelLevel | 'all';
  sortBy: SortOption;
  filterAlsoConfirmedMatches: boolean;
  viewPreference: ViewPreference;
  proposalView: 'join' | 'propose';
  refreshKey: number;
  allMatches: Match[];
  isLoading: boolean;
  matchDayEvents: MatchDayEvent[]; // Changed to array
  dateStripIndicators: Record<string, UserActivityStatusForDay>;
  dateStripDates: Date[];
  onViewPrefChange: (date: Date, pref: ViewPreference, type: 'class' | 'match' | 'event', eventId?: string) => void;
  showPointsBonus: boolean;
}

const ITEMS_PER_PAGE = 9;

type EnhancedEvent = MatchDayEvent & {
    isEventCard: true;
    inscriptionsDetailed: MatchDayInscription[];
};


const MatchDisplay: React.FC<MatchDisplayProps> = ({
    currentUser, onBookingSuccess, filterByClubId, filterByGratisOnly, filterByLiberadasOnly, onDeactivateGratisFilter, matchShareCode,
    matchIdFilter, selectedDate, onDateChange, timeSlotFilter, selectedLevel, sortBy,
    filterAlsoConfirmedMatches, viewPreference, proposalView, refreshKey, allMatches, isLoading,
    matchDayEvents, filterByPuntosOnly, filterByProOnly, dateStripIndicators, dateStripDates, onViewPrefChange, showPointsBonus
}) => {
  const [filteredMatches, setFilteredMatches] = useState<(Match | EnhancedEvent)[]>([]);
  const [displayedMatches, setDisplayedMatches] = useState<(Match | EnhancedEvent)[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreMatchesRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleProposalViewChange = (newView: 'join' | 'propose') => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('subview', newView);
        router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    };

  
  const applyMatchFilters = useCallback(async (matchesToFilter: Match[]) => {
    if (!currentUser) {
        setFilteredMatches([]);
        return;
    }
    
    let finalMatches: (Match | EnhancedEvent)[] = [];

    if (matchIdFilter) {
        const singleMatch = matchesToFilter.find(m => m.id === matchIdFilter);
        finalMatches = singleMatch ? [singleMatch] : [];
    } else if (matchShareCode) {
        const singleMatch = matchesToFilter.find(m => m.privateShareCode === matchShareCode);
        finalMatches = singleMatch ? [singleMatch] : [];
    } else {
    let workingMatches: (Match | EnhancedEvent)[] = [...matchesToFilter];

        // Add MatchDayEvent as special cards if it exists for the date.
        if (selectedDate && matchDayEvents.length > 0) {
            const eventCards = await Promise.all(matchDayEvents.map(async (event) => {
                const inscriptionsDetailed = await getMatchDayInscriptions(event.id);
                return {
                    ...event,
                    id: `${event.id}`,
                    isEventCard: true as const,
                    inscriptionsDetailed,
                };
            }));
            workingMatches.push(...eventCards);
        }

        workingMatches = workingMatches.filter((match) => {
            if ('isEventCard' in match && match.isEventCard) return true; // Always include event cards for the selected date
            const regularMatch = match as Match;
            // EXCLUDE fixed matches from normal list
            if (regularMatch.isFixedMatch) return false;
            // Allow user to see their own private matches
            if (regularMatch.status === 'confirmed_private') return regularMatch.organizerId === currentUser.id;
            // Don't show pro matches unless the pro filter is on
            if (regularMatch.isProMatch && !filterByProOnly) return false;
            return true;
        });

        if (filterByClubId) {
            workingMatches = workingMatches.filter(match => match.clubId === filterByClubId);
        }
        
        // --- View Preference Filter (has priority) ---
        if (viewPreference === 'myInscriptions') {
            workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match) return false;
                const regularMatch = match as Match;
                // Solo mostrar inscripciones del usuario que estén confirmadas o forming
                return (regularMatch.bookedPlayers || []).some(p => p.userId === currentUser.id) && (regularMatch.status === 'forming' || regularMatch.status === 'confirmed' || regularMatch.status === 'confirmed_private');
            });
        } else if (viewPreference === 'myConfirmed') {
             workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match) return false;
                const regularMatch = match as Match;
                const isUserInMatch = (regularMatch.bookedPlayers || []).some(p => p.userId === currentUser.id);
                if (!isUserInMatch) return false;
                return regularMatch.status === 'confirmed' || regularMatch.status === 'confirmed_private';
            });
        } else if (viewPreference === 'withPlayers') {
            workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match) return false;
                const regularMatch = match as Match;
                const hasPlayers = (regularMatch.bookedPlayers || []).length > 0;
                const isFull = (regularMatch.bookedPlayers || []).length >= 4;
                return hasPlayers && !isFull && regularMatch.status !== 'confirmed_private';
            });
        }
        
        // --- Special Filters (Gratis, Liberadas, Puntos, Pro) ---
        if (filterByLiberadasOnly) {
            workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match && match.isEventCard) return false;
                const regularMatch = match as Match;
                const isLiberada = (regularMatch.status === 'confirmed' || regularMatch.status === 'confirmed_private') && regularMatch.gratisSpotAvailable && (regularMatch.bookedPlayers || []).length === 3;
                if (!isLiberada) return false;
                return isUserLevelCompatibleWithActivity(regularMatch.level, currentUser?.level, false);
            });
        } else if (filterByGratisOnly) {
            workingMatches = workingMatches.filter(match => {
                 if ('isEventCard' in match && match.isEventCard) return false;
                const regularMatch = match as Match;
                const isGratis = regularMatch.gratisSpotAvailable && (regularMatch.bookedPlayers || []).length === 3;
                if (!isGratis) return false;
                return isUserLevelCompatibleWithActivity(regularMatch.level, currentUser?.level, false);
            });
        } else if (filterByPuntosOnly) {
            const club = getMockClubs().find(c => c.id === filterByClubId);
            workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match) return false;
                const regularMatch = match as Match;
                return isMatchBookableWithPoints(regularMatch, club);
            });
        } else if (filterByProOnly) {
            workingMatches = workingMatches.filter(match => {
                if ('isEventCard' in match) return false;
                return (match as Match).isProMatch === true;
            });
        } else if (viewPreference === 'normal') { // Standard filters if no special filter is active AND view is normal
             if (selectedDate) {
                workingMatches = workingMatches.filter(match => isSameDay(new Date('isEventCard' in match ? match.eventDate : match.startTime), selectedDate));
            }

            if (timeSlotFilter !== 'all') {
                workingMatches = workingMatches.filter(match => {
                    const matchHour = new Date('isEventCard' in match ? match.eventDate : match.startTime).getHours();
                    if (timeSlotFilter === 'morning') return matchHour >= 8 && matchHour < 13;
                    if (timeSlotFilter === 'midday') return matchHour >= 13 && matchHour < 18;
                    if (timeSlotFilter === 'evening') return matchHour >= 18 && matchHour <= 22;
                    return true;
                });
            }

            if (selectedLevel && selectedLevel !== 'all') {
                const club = getMockClubs().find(c => c.id === filterByClubId);
                
                workingMatches = workingMatches.filter(m => {
                    if('isEventCard' in m) return false; // Match-Day events don't have level filtering
                    const match = m as Match;
                    
                    if (match.level === 'abierto') {
                        return selectedLevel === 'abierto';
                    }

                    if (selectedLevel !== 'abierto') {
                        const range = club?.levelRanges?.find(r => r.name === selectedLevel);
                        if (range) {
                           const matchNumericLevel = parseFloat(match.level);
                           return matchNumericLevel >= parseFloat(range.min) && matchNumericLevel <= parseFloat(range.max);
                        }
                    }
                    
                    return false;
                });
            }

            // In normal view, show placeholders, forming matches, and matches the user is in.
            workingMatches = workingMatches.filter(m => {
                if ('isEventCard' in m) return true;
                const match = m as Match;
                const isUserInscribed = (match.bookedPlayers || []).some(p => p.userId === currentUser.id);
                return match.isPlaceholder || match.status === 'forming' || isUserInscribed;
            });
        }
        
        // Final filter: check court availability, but never drop matches where the user is inscribed
        const availableActivities = [] as (Match | EnhancedEvent)[];
        for (const activity of workingMatches) {
            if ('isEventCard' in activity) {
                availableActivities.push(activity); // Events bypass availability
                continue;
            }
            const match = activity as Match;
            const isUserInscribed = (match.bookedPlayers || []).some(p => p.userId === currentUser.id);
            
            // Always show matches where user is inscribed
            if (isUserInscribed) {
                availableActivities.push(match);
                continue;
            }
            
            // Always show confirmed matches (they already have a court assigned)
            if (match.status === 'confirmed' || match.status === 'confirmed_private') {
                availableActivities.push(match);
                continue;
            }
            
            // For placeholders and forming matches, check court availability
            const availability = await getCourtAvailabilityForInterval(match.clubId, new Date(match.startTime), new Date(match.endTime));
            
            // Only show if there are available courts (at least one green indicator)
            if (availability.available.length > 0) {
                availableActivities.push(match);
            }
            // If no courts available (all red indicators), don't show the match
        }
        
        workingMatches = availableActivities;

        workingMatches.sort((a, b) => {
            const isUserInA = !('isEventCard' in a) && (a as Match).bookedPlayers?.some(p => p.userId === currentUser.id);
            const isUserInB = !('isEventCard' in b) && (b as Match).bookedPlayers?.some(p => p.userId === currentUser.id);
            if (isUserInA && !isUserInB) return -1;
            if (!isUserInA && isUserInB) return 1;

            const aHasPlayers = !('isEventCard' in a) && (a as Match).bookedPlayers && (a as Match).bookedPlayers.length > 0;
            const bHasPlayers = !('isEventCard' in b) && (b as Match).bookedPlayers && (b as Match).bookedPlayers.length > 0;
            if (aHasPlayers && !bHasPlayers) return -1;
            if (!bHasPlayers && aHasPlayers) return 1;

            const dateA = new Date('isEventCard' in a ? a.eventDate : a.startTime).getTime();
            const dateB = new Date('isEventCard' in b ? b.eventDate : b.startTime).getTime();
            if (dateA !== dateB) return dateA - dateB;

            if ('isEventCard' in a && !('isEventCard' in b)) return -1;
            if (!('isEventCard' in a) && 'isEventCard' in b) return 1;

            if (!('isEventCard' in a) && !('isEventCard' in b)) {
                const aRegular = a as Match;
                const bRegular = b as Match;
                const aOccupancy = (aRegular.bookedPlayers || []).length;
                const bOccupancy = (bRegular.bookedPlayers || []).length;
                if (bOccupancy !== aOccupancy) return bOccupancy - aOccupancy;
            }

            return 0; // Keep original order if all else is equal
        });
        
        finalMatches = workingMatches;
    }
    
    setFilteredMatches(finalMatches); 
  }, [allMatches, currentUser, filterByClubId, filterByGratisOnly, filterByLiberadasOnly, filterByPuntosOnly, filterByProOnly, selectedDate, timeSlotFilter, selectedLevel, viewPreference, matchIdFilter, matchShareCode, matchDayEvents]);
  
  useEffect(() => {
    if (!isLoading) {
        applyMatchFilters(allMatches);
    }
  }, [applyMatchFilters, refreshKey, selectedDate, selectedLevel, allMatches, isLoading, viewPreference, timeSlotFilter]);

  // Effect to reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredMatches]);

    // Effect to update the displayed list based on pagination
    useEffect(() => {
            // Siempre mostrar primero los partidos donde el usuario está inscrito
            const userMatches = filteredMatches.filter(
                m => !('isEventCard' in m) && (m as Match).bookedPlayers?.some(p => currentUser && p.userId === currentUser.id)
            );
            const otherMatches = filteredMatches.filter(
                m => !userMatches.includes(m)
            );
            // Los partidos del usuario siempre visibles en la primera página
            const paginatedOthers = otherMatches.slice(0, Math.max(0, ITEMS_PER_PAGE * currentPage - userMatches.length));
            setDisplayedMatches([...userMatches, ...paginatedOthers]);
            setCanLoadMore(otherMatches.length > paginatedOthers.length);
    }, [filteredMatches, currentPage]);

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
        const nextPage = currentPage + 1;
        setDisplayedMatches(filteredMatches.slice(0, ITEMS_PER_PAGE * nextPage));
        setCurrentPage(nextPage);
        setCanLoadMore(filteredMatches.length > ITEMS_PER_PAGE * nextPage);
        setIsLoadingMore(false);
    }, 300);
  }, [canLoadMore, isLoadingMore, currentPage, filteredMatches]);

  useEffect(() => {
    if (!canLoadMore || isLoadingMore || !loadMoreMatchesRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) handleLoadMore();
    }, { threshold: 0.1 });
    const currentRef = loadMoreMatchesRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); observer.disconnect(); };
  }, [canLoadMore, isLoadingMore, handleLoadMore]);

    const handleLocalMatchBookingUpdate = async (updatedMatch: Match) => {
        // Recargar los matches desde el mock tras inscribirse
        const allNewMatches = await fetchMatches();
        applyMatchFilters(allNewMatches);
        onBookingSuccess();
    };
  
  const findNextAvailableDay = (): Date | null => {
        const today = startOfDay(new Date());
        let currentDateToCheck = selectedDate ? addDays(selectedDate, 1) : today;
        const limit = addDays(today, 30); // Search up to 30 days in the future

        while (currentDateToCheck <= limit) {
             const hasActivity = allMatches.some(match => {
                if (isSameDay(new Date(match.startTime), currentDateToCheck)) {
                    if (viewPreference === 'myInscriptions') {
                        return (match.bookedPlayers || []).some(p => p.userId === currentUser?.id);
                    }
                    return true;
                }
                return false;
            });

            if (hasActivity) {
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
                title: viewPreference === 'myInscriptions' ? "No tienes más inscripciones" : "No hay partidas futuras",
                description: viewPreference === 'myInscriptions' ? "No estás apuntado a más partidas en los próximos 30 días." : "No se encontraron partidas disponibles en los próximos 30 días.",
            });
        }
    };

  if (isLoading) return <div className="space-y-4"> <Skeleton className="h-10 w-full" /> <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div></div>

  const clubName = filterByClubId ? getMockClubs().find(c => c.id === filterByClubId)?.name : "Todos los Clubes";
  const availableCredit = (currentUser?.credit ?? 0) - (currentUser?.blockedCredit ?? 0);

  return (
    <div>
      <div className="mt-2">
        {((!selectedDate && !filterByGratisOnly && !filterByLiberadasOnly && !filterByPuntosOnly && !matchIdFilter && !matchShareCode)) && (
            <div className="text-center py-16">
                <CalendarDays className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                <h2 className="text-2xl font-semibold text-foreground mb-3">Selecciona una fecha</h2>
                <p className="text-muted-foreground max-w-md mx-auto">Elige un día para ver las partidas disponibles.</p>
            </div>
        )}

        {((selectedDate || filterByGratisOnly || filterByLiberadasOnly || filterByPuntosOnly || matchIdFilter || matchShareCode)) && displayedMatches.length === 0 && !isLoading && (
            <div className="text-center py-16">
                <SearchX className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                    {viewPreference === 'myInscriptions' ? 'No tienes próximas partidas' : 'No se encontraron partidas'}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {viewPreference === 'myInscriptions' ? "No estás apuntado/a a ninguna partida para este día." : "Prueba a cambiar las fechas o ajusta los filtros."}
                </p>
                <Button onClick={handleNextAvailableClick} className="mt-4">
                    {viewPreference === 'myInscriptions' ? 'Próximo día con inscripciones' : 'Próximo día con partidas'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="mt-6 text-sm text-muted-foreground">
                    ¿Buscas “partidas fijas”? <Link href="/activities?view=matchpro" className="font-semibold text-primary underline">Ver partidas fijas</Link>
                </div>
            </div>
        )}

        {((selectedDate || filterByGratisOnly || filterByLiberadasOnly || filterByPuntosOnly || matchIdFilter || matchShareCode)) && displayedMatches.length > 0 && currentUser && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] justify-center gap-6">
            {displayedMatches.map((activity) => {
               if ('isEventCard' in activity && activity.isEventCard) {
                   const isFull = (activity.inscriptionsDetailed?.length ?? 0) >= activity.maxPlayers;
                   const allSpots = Array.from({ length: activity.maxPlayers });
                   const isUserInscribed = activity.inscriptionsDetailed.some((i: any) => i.userId === currentUser.id);

                   return (
                        <div key={activity.id} className="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-4 h-full flex flex-col justify-between shadow-sm">
                             <Link href={`/match-day/${activity.id}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <div className="font-bold text-orange-800 flex items-center">
                                            <PartyPopper className="h-5 w-5 mr-2"/>
                                            {activity.name}
                                        </div>
                                        <p className="text-sm text-muted-foreground font-semibold">
                                            {`${format(new Date(activity.eventDate), "HH:mm'h'")} - ${format(activity.eventEndTime ? new Date(activity.eventEndTime) : addMinutes(new Date(activity.eventDate), 180), "HH:mm'h'")}`}
                                        </p>
                                    </div>
                                    <Badge variant={isFull ? 'secondary' : 'default'} className={cn(isFull ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800")}>
                                        {isFull ? "Completo" : "Plazas Libres"}
                                    </Badge>
                                </div>
                            </Link>
                            <AlertDialog>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {allSpots.map((_, index) => {
                                        const inscription = activity.inscriptionsDetailed[index];
                                        if(inscription){
                                            return (
                                                 <div key={inscription?.id} className="relative inline-flex items-center justify-center h-12 w-12 rounded-full border-[3px] z-0 transition-all shadow-inner bg-slate-100 border-slate-300">
                                                    <Avatar className="h-[calc(100%-4px)] w-[calc(100%-4px)]">
                                                        <AvatarImage src={inscription?.userProfilePictureUrl} data-ai-hint="player avatar small" />
                                                        <AvatarFallback className={cn("text-xs", "bg-primary text-primary-foreground")}>
                                                            {getInitials(inscription.userName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            )
                                        }
                                        return (
                                            <AlertDialogTrigger asChild key={`empty-${index}`}>
                                                <button disabled={isFull || isUserInscribed} className="relative inline-flex items-center justify-center h-12 w-12 rounded-full border-[3px] z-0 transition-all shadow-inner bg-slate-100 border-slate-300 border-dashed hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
                                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                                </button>
                                            </AlertDialogTrigger>
                                        )
                                     })}
                                </div>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-bold flex items-center justify-center"><Rocket className="h-8 w-8 mr-3 text-blue-500" /> ¡Casi dentro!</AlertDialogTitle>
                                    </AlertDialogHeader>
                                     <AlertDialogDescription asChild>
                                        <div className="text-center text-lg text-foreground space-y-4 py-4">
                                            <div className="space-y-1">
                                                <div>Te apuntas al evento: <br/><span className="font-semibold">{activity.name}</span></div>
                                                <div className="flex items-center justify-center text-3xl font-bold">
                                                    <Euro className="h-7 w-7 mr-1" /> {activity.price?.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 p-2 bg-slate-100 rounded-md">
                                                <PiggyBank className="h-6 w-6 text-slate-500" />
                                                <span className="text-sm">Tu hucha tiene:</span>
                                                <span className="font-bold text-slate-800">{availableCredit.toFixed(2)}€</span>
                                                <span className="text-slate-400">/</span>
                                                <Star className="h-5 w-5 text-amber-500"/>
                                                <span className="font-bold text-slate-800">{currentUser?.loyaltyPoints ?? 0}</span>
                                            </div>
                                        </div>
                                    </AlertDialogDescription>
                                    <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-lg space-y-2">
                                        <p className="font-bold text-center">¡Recuerda las reglas del juego!</p>
                                        <ul className="space-y-1.5">
                                            <li className="flex items-start"><ThumbsUp className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" /><span>Cuando llegue la hora del sorteo, se formarán las partidas.</span></li>
                                            <li className="flex items-start"><Lock className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" /><span>Tu saldo será bloqueado hasta que se juegue el evento.</span></li>
                                        </ul>
                                    </div>
                                    <AlertDialogFooter className="grid grid-cols-2 gap-2 mt-4">
                                        <AlertDialogCancel className="h-12 text-base" disabled={false}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {}} disabled={false} className="h-12 text-base bg-green-600 text-white hover:bg-green-700">
                                            Sí, ¡Me apunto!
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <div className="flex justify-between items-end mt-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    {activity.inscriptionsDetailed.length} / {activity.maxPlayers} inscritos
                                </div>
                                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold" asChild>
                                     <Link href={`/match-day/${activity.id}`}>
                                        Ver Evento
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )
               }
               const match = activity as Match;
               return (
                <div key={match.id} className="w-full max-w-sm mx-auto">
                    <MatchCard
                        match={match}
                        currentUser={currentUser}
                        onBookingSuccess={() => handleLocalMatchBookingUpdate(match)}
                        onMatchUpdate={handleLocalMatchBookingUpdate}
                        matchShareCode={matchShareCode}
                        showPointsBonus={showPointsBonus}
                    />
                 </div>
               )
            })}
          </div>
        )}
        {canLoadMore && displayedMatches.length > 0 && (
            <div ref={loadMoreMatchesRef} className="h-10 flex justify-center items-center text-muted-foreground mt-6">
                {isLoadingMore && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            </div>
        )}
      </div>
    </div>
  );
};

export default MatchDisplay;

// src/components/schedule/PersonalMatches.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import type { Booking, User, Review, TimeSlot, PadelCourt, Instructor, UserActivityStatusForDay, MatchBooking, Match, Club, PadelCategoryForSlot, MatchBookingMatchDetails } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { List, Clock, Users, CalendarCheck, CalendarX, Loader2, Ban, Hash, Trophy, UserCircle, Gift, Info, MessageSquare, Euro, Users2 as CategoryIcon, Venus, Mars, Share2, Unlock, Lock, Repeat, Lightbulb, BarChartHorizontal, Plus, CheckCircle, Edit } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchUserMatchBookings, cancelMatchBooking, getMockClubs, makeMatchPublic, cancelPrivateMatchAndReofferWithPoints, getMockMatches, renewRecurringMatch, fillMatchAndMakePrivate, updateMatchLevelAndCategory, removePlayerFromMatch, deleteFixedMatch, getMockUserDatabase } from '@/lib/mockData';
import * as state from '@/lib/mockDataSources/state';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog as InfoDialog, DialogContent as InfoDialogContent, DialogHeader as InfoDialogHeader, DialogTitle as InfoDialogTitle, DialogFooter as InfoDialogFooter, DialogClose as InfoDialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getPlaceholderUserName, calculatePricePerPerson } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const MatchChatDialog = dynamic(() => import('@/components/chat/MatchChatDialog'), { ssr: false });
import { displayClassCategory } from '@/types';
 
import { Separator } from '../ui/separator';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CourtAvailabilityIndicator from '@/components/class/CourtAvailabilityIndicator';
import { hasAnyActivityForDay, getCourtAvailabilityForInterval } from '@/lib/mockData';
import { MatchSpotDisplay } from '@/components/match/MatchSpotDisplay';
import MatchCard from '@/components/match/MatchCard';


interface PersonalMatchesProps {
  currentUser: User;
  newMatchBooking?: MatchBooking | null;
  onBookingActionSuccess: () => void;
}

interface CourtAvailabilityState {
    available: PadelCourt[];
    occupied: PadelCourt[];
    total: number;
}

const InfoButton: React.FC<{
    icon: React.ElementType;
    text: string;
    onClick: () => void;
    className?: string;
}> = ({ icon: Icon, text, onClick, className }) => (
    <button className="flex-1" onClick={onClick}>
        <Badge variant="outline" className={cn("w-full justify-center text-xs py-1.5 rounded-full capitalize shadow-inner bg-slate-50 border-slate-200 hover:border-slate-300 transition-colors", className)}>
            <Icon className="mr-1.5 h-3 w-3 text-slate-500" /> 
            <span className="font-medium text-slate-700">{text}</span>
        </Badge>
    </button>
);


const DialogInfo: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: React.ElementType;
}> = ({ isOpen, onOpenChange, title, description, icon: Icon }) => {
  return (
    <InfoDialog open={isOpen} onOpenChange={onOpenChange}>
      <InfoDialogContent>
        <InfoDialogHeader>
          <InfoDialogTitle className="flex items-center text-xl">
            <Icon className="mr-3 h-6 w-6 text-primary" />
            {title}
          </InfoDialogTitle>
        </InfoDialogHeader>
        <div className="py-4 text-base text-muted-foreground leading-relaxed whitespace-pre-line">
            {description.split('\n').map((item, key) => (
                <p key={key} className="mb-2">{`• ${item}`}</p>
            ))}
        </div>
        <InfoDialogFooter>
          <InfoDialogClose asChild>
            <Button className="w-full">¡Entendido!</Button>
          </InfoDialogClose>
        </InfoDialogFooter>
      </InfoDialogContent>
    </InfoDialog>
  );
};


const PersonalMatches: React.FC<PersonalMatchesProps> = ({ currentUser, newMatchBooking, onBookingActionSuccess }) => {
  const [bookings, setBookings] = useState<MatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, startProcessingTransition] = useTransition();
  const [currentActionInfo, setCurrentActionInfo] = useState<{ type: 'cancel' | 'cede' | 'cancelAndReoffer' | 'renew' | 'makePrivate' | 'removePlayer' | 'deleteFixed', bookingId: string, matchId?: string, targetUserId?: string } | null>(null);
  const { toast } = useToast();

  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [selectedMatchForChat, setSelectedMatchForChat] = useState<Match | null | undefined>(null);
  const [now, setNow] = useState(new Date());
  const [availabilityData, setAvailabilityData] = useState<Record<string, CourtAvailabilityState>>({});
  const [infoDialog, setInfoDialog] = useState<{ open: boolean, title: string, description: string, icon: React.ElementType }>({ open: false, title: '', description: '', icon: Lightbulb });
  const [isConfirmPrivateDialogOpen, setIsConfirmPrivateDialogOpen] = useState(false);
  const [isProcessingPrivateAction, setIsProcessingPrivateAction] = useState(false);

  // Edit config for fixed matches (Mi agenda)
  const [editConfig, setEditConfig] = useState<{ open: boolean; matchId: string | null; level: string; category: 'abierta' | 'chico' | 'chica' }>(
    { open: false, matchId: null, level: 'abierto', category: 'abierta' }
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);


  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedBookings = await fetchUserMatchBookings(currentUser.id);
      
    const enrichedBookings = fetchedBookings.map(booking => {
      const matchDetails = state.getMockMatches().find(m => m.id === booking.activityId);
      if (!matchDetails) return { ...booking, matchDetails: undefined };

      const resolvedBookedPlayers = (matchDetails.bookedPlayers || []).map(p => {
        const student = state.getMockStudents().find(s => s.id === p.userId);
        const userDb = state.getMockUserDatabase().find(u => u.id === p.userId);
        const resolved = student || userDb || p;
        return {
          userId: p.userId,
          name: (resolved as any)?.name || p.name,
          profilePictureUrl: (resolved as any)?.profilePictureUrl || p.profilePictureUrl,
        };
      });

      return {
        ...booking,
        matchDetails: {
          ...matchDetails,
          startTime: new Date(matchDetails.startTime),
          endTime: new Date(matchDetails.endTime),
          bookedPlayers: resolvedBookedPlayers,
        }
      };
    });

      enrichedBookings.sort((a, b) => (a.matchDetails?.startTime?.getTime() ?? 0) - (b.matchDetails?.startTime?.getTime() ?? 0));
      setBookings(enrichedBookings);
      setError(null);

    const upcoming = enrichedBookings.filter(b => b.matchDetails && new Date(b.matchDetails.endTime) > new Date());
    const PREFETCH_LIMIT = 5;
    const newAvailabilityData: Record<string, CourtAvailabilityState> = {};
    for (const booking of upcoming.slice(0, PREFETCH_LIMIT)) {
      if (booking.matchDetails) {
        const availability = await getCourtAvailabilityForInterval(booking.matchDetails.clubId, new Date(booking.matchDetails.startTime), new Date(booking.matchDetails.endTime));
        newAvailabilityData[booking.activityId] = availability;
      }
    }
    setAvailabilityData(prev => ({ ...prev, ...newAvailabilityData }));

    } catch (err) {
      console.error("Failed to fetch user match bookings:", err);
      setError("No se pudo cargar tu horario de partidas.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadData();
    // Reduce re-render frequency
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, [currentUser.id, newMatchBooking, onBookingActionSuccess]); // Removed loadData to prevent infinite loop

  const handleCancellationAction = (booking: MatchBooking) => {
    if (!booking.matchDetails) {
      toast({ title: "Error", description: "Detalles de la partida no disponibles.", variant: "destructive" });
      return;
    }
    setCurrentActionInfo({ type: 'cancel', bookingId: booking.id });
    startProcessingTransition(async () => {
      const result = await cancelMatchBooking(currentUser.id, booking.id);
      if ('error'in result) {
        toast({ title: 'Error al Cancelar', description: result.error, variant: 'destructive' });
      } else {
        toast({
          title: result.message?.includes("Bonificada") ? "Cancelación Bonificada" : result.message?.includes("NO Bonificada") ? "Cancelación NO Bonificada" : "Inscripción Cancelada",
          description: result.message || 'Tu inscripción ha sido cancelada.',
          className: (result.pointsAwarded && result.pointsAwarded > 0) ? 'bg-green-600 text-white' : (result.penaltyApplied) ? 'bg-yellow-500 text-white' : 'bg-accent text-accent-foreground',
          duration: 7000,
        });
        onBookingActionSuccess();
      }
      setCurrentActionInfo(null);
    });
  };

  const handleOpenChatDialog = (matchDetails: Match['id']) => {
    const fullMatchDetails = state.getMockMatches().find(m => m.id === matchDetails);
    if (fullMatchDetails) {
        setSelectedMatchForChat(fullMatchDetails);
        setIsChatDialogOpen(true);
    } else {
        toast({
            title: "Error de Chat",
            description: "No se pudieron cargar los detalles de la partida para el chat.",
            variant: "destructive",
        });
    }
  };
  
    const handleInfoClick = (type: 'level' | 'court' | 'category', match: Match) => {
        let dialogData;
        const CategoryIconDisplay = match.category === 'chica' ? Venus : match.category === 'chico' ? Mars : CategoryIcon;

        switch (type) {
            case 'level':
                 dialogData = { title: 'Nivel', description: `El nivel de la partida lo define el primer jugador que se inscribe.\nEsto asegura que las partidas sean siempre equilibradas.`, icon: Lightbulb };
                 break;
            case 'court':
                 dialogData = { title: 'Pista', description: `La pista se asigna automáticamente solo cuando la partida está completa (4 jugadores).\nRecibirás una notificación con el número de pista cuando se confirme.`, icon: Hash };
                 break;
            case 'category':
                 dialogData = { title: 'Categoría', description: `La categoría (chicos/chicas) la sugiere el primer jugador que se apunta.\nNo es una regla estricta, solo una guía para los demás.`, icon: CategoryIconDisplay };
                 break;
        }
        setInfoDialog({ open: true, ...dialogData });
    };

  const handleCancelAndReoffer = (matchId: string) => {
    setCurrentActionInfo({ type: 'cancelAndReoffer', bookingId: '', matchId: matchId });
    startProcessingTransition(async () => {
        const result = await cancelPrivateMatchAndReofferWithPoints(currentUser.id, matchId);
        if ('error' in result) {
            toast({ title: "Error al Cancelar", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Partida Cancelada y Ofertada", description: "Tu reserva ha sido cancelada y la pista está ahora disponible por puntos." });
            onBookingActionSuccess();
        }
        setCurrentActionInfo(null);
    });
  };
  
  const handleMakePrivate = (booking: MatchBooking) => {
    if (!booking.matchDetails) return;
    setCurrentActionInfo({ type: 'makePrivate', bookingId: booking.id, matchId: booking.activityId });
    startProcessingTransition(async () => {
        const result = await fillMatchAndMakePrivate(currentUser.id, booking.activityId);
        if ('error' in result) {
            toast({ title: "Error al Hacer Privada", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "¡Partida Privada!", description: `Has completado la partida. Coste de plazas restantes: ${result.cost.toFixed(2)}€.`, className: "bg-purple-600 text-white" });
            onBookingActionSuccess();
        }
        setCurrentActionInfo(null);
    });
  };


  const handleRenew = (completedMatchId: string) => {
    setCurrentActionInfo({ type: 'renew', bookingId: '', matchId: completedMatchId });
    startProcessingTransition(async () => {
        const result = await renewRecurringMatch(currentUser.id, completedMatchId);
        if ('error' in result) {
            toast({ title: "Error al Renovar", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "¡Reserva Renovada!", description: "Tu partida para la próxima semana ha sido confirmada." });
            // Refresh local bookings so the renewed match appears immediately in Mi agenda
            await loadData();
            onBookingActionSuccess();
        }
        setCurrentActionInfo(null);
    });
  };

  const upcomingBookings = useMemo(() => bookings.filter(b => b.matchDetails && new Date(b.matchDetails.endTime) > now), [bookings, now]);
  const pastBookings = useMemo(() => bookings.filter(b => b.matchDetails && new Date(b.matchDetails.endTime) <= now), [bookings, now]);


  if (loading) {
    return (
      <div className="space-y-3">
         <Skeleton className="h-8 w-1/2" />
         <div className="flex space-x-1">
            <Skeleton className="h-96 w-80" />
            <Skeleton className="h-96 w-80" />
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-4 text-center">{error}</div>
    );
  }

  const hasUpcomingBookings = upcomingBookings.length > 0;
  const hasPastBookings = pastBookings.length > 0;
  
  if (!hasUpcomingBookings && !hasPastBookings) {
    return (
     <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
       <Trophy className="h-6 w-6 opacity-60" />
       <p className="text-sm">Aún no tienes partidas en tu agenda.</p>
     </div>
    );
  }

  const renderBookingItem = (booking: MatchBooking, isUpcomingItem: boolean) => {
      const matchDetails = bookings.find(b => b.id === booking.id)?.matchDetails;
      if (!matchDetails) {
          return (
            <div key={booking.id} className="flex items-start space-x-3 p-3 sm:p-4 rounded-lg bg-muted/30 opacity-50 w-80">
               <div className="flex-shrink-0 mt-1">
                 <CalendarX className="h-5 w-5 text-muted-foreground" />
               </div>
               <div className="flex-grow space-y-1">
                   <p className="font-medium capitalize italic">Detalles de la partida no disponibles</p>
                   <p className="text-sm text-muted-foreground">Reserva ID: {booking.id}</p>
               </div>
            </div>
          );
      }

  const { id: matchId, startTime, endTime, courtNumber, level, category, bookedPlayers, totalCourtFee, clubId, status, organizerId, privateShareCode, isRecurring, nextRecurringMatchId, durationMinutes } = matchDetails;
  const isMatchFull = (bookedPlayers || []).length >= 4;
      const wasBookedWithPoints = booking.bookedWithPoints === true;
      const clubDetails = getMockClubs().find(c => c.id === clubId);
  const isOrganizerOfPrivateMatch = status === 'confirmed_private' && organizerId === currentUser.id;
  const isFixedMatch = (matchDetails as any).isFixedMatch === true;
  const isOrganizerOfFixed = isFixedMatch && organizerId === currentUser.id;
      const availability = availabilityData[booking.activityId];
      const pricePerPlayer = calculatePricePerPerson(totalCourtFee || 0, 4);
      const isUserInMatch = (bookedPlayers || []).some(p => p.userId === currentUser.id);

      const isLevelAssigned = level !== 'abierto';
      const isCategoryAssigned = category !== 'abierta';
      const isCourtAssigned = !!courtNumber;
      const classifiedBadgeClass = 'text-blue-700 border-blue-200 bg-blue-100 hover:border-blue-300';
      const CategoryIconDisplay = category === 'chica' ? Venus : category === 'chico' ? Mars : CategoryIcon;

      const levelRange = level !== 'abierto' && clubDetails?.levelRanges?.find(r => parseFloat(level) >= parseFloat(r.min) && parseFloat(level) <= parseFloat(r.max));
      const levelToDisplay = levelRange ? `${levelRange.min}-${levelRange.max}` : level;
      const courtDisplay = isCourtAssigned ? `# ${courtNumber}` : '# Pista';

      let cancellationButtonText = "Cancelar Inscripción";
      let cancellationDialogText = "¿Estás seguro de que quieres cancelar tu inscripción?";
      let buttonVariant: "destructive" | "outline" = "destructive";

      if (isMatchFull) {
          if (wasBookedWithPoints) {
              cancellationButtonText = "Cancelación NO Bonificada";
              buttonVariant = "destructive";
              cancellationDialogText = "Cancelación NO Bonificada: Al cancelar esta partida (pagada con puntos), los puntos NO serán devueltos. Tu plaza se liberará como 'Libre'.";
          } else { 
              cancellationButtonText = "Cancelación Bonificada";
              buttonVariant = "outline";
              const pricePaid = calculatePricePerPerson(totalCourtFee || 0, 4);
              const bonusPoints = Math.round(pricePaid * (clubDetails?.pointSettings?.cancellationPointPerEuro || 0));
              cancellationDialogText = `Cancelación Bonificada: Al cancelar, recibirás ${bonusPoints} puntos. Tu plaza (valor ${pricePaid.toFixed(2)}€) se liberará como 'Gratis'.`;
          }
      } else { 
          const penaltyPoints = clubDetails?.pointSettings?.unconfirmedCancelPenaltyPoints ?? 1;
          const penaltyEuros = clubDetails?.pointSettings?.unconfirmedCancelPenaltyEuros ?? 1;
           if(wasBookedWithPoints){
                cancellationDialogText = `Al cancelar esta pre-inscripción (pagada con puntos), los puntos NO serán devueltos. La plaza se liberará como "Libre".`;
            } else {
                cancellationDialogText = `Al cancelar esta pre-inscripción, se aplicará una penalización de ${penaltyPoints} punto(s) o ${penaltyEuros}€. La plaza se liberará como "Libre".`;
            }
      }

      const handleSharePrivateMatch = () => {
        if (!privateShareCode) {
            toast({ title: "Error", description: "No se encontró el código para compartir esta partida.", variant: "destructive" });
            return;
        }
        const shareUrl = `${window.location.origin}/?view=partidas&code=${privateShareCode}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => toast({ title: "Enlace de Partida Privada Copiado", description: "Comparte este enlace con tus amigos." }))
            .catch(() => toast({ title: "Error al Copiar", description: "No se pudo copiar el enlace.", variant: "destructive" }));
      };
      
      const handleMakeMatchPublic = () => {
         startProcessingTransition(async () => {
            const result = await makeMatchPublic(currentUser.id, booking.activityId);
            if ('error' in result) {
                toast({ title: "Error al Hacer Pública", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Partida Hecha Pública", description: "La partida ahora está abierta a todos.", className: "bg-primary text-primary-foreground" });
                onBookingActionSuccess();
            }
        });
      };
      
      const provisionalMatch = !isUpcomingItem && nextRecurringMatchId ? state.getMockMatches().find(m => m.id === nextRecurringMatchId) : undefined;
      let renewalTimeLeft = '';
      let isRenewalExpired = false;
      if (provisionalMatch?.provisionalExpiresAt) {
          const diff = new Date(provisionalMatch.provisionalExpiresAt).getTime() - now.getTime();
          isRenewalExpired = diff <= 0;
          if (!isRenewalExpired) {
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              renewalTimeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
      }

  const canMakePrivate = isUpcomingItem && isUserInMatch && !isMatchFull && status !== 'confirmed_private';
  const canEditFixedConfig = isOrganizerOfFixed && (matchDetails as any).isFixedMatch === true;
      const cardBorderColor = isUpcomingItem
        ? (status === 'confirmed_private' ? 'border-l-purple-600' : (isMatchFull ? 'border-l-red-500' : 'border-l-blue-500'))
        : 'border-l-gray-400';

      // Fixed matches: render using shared MatchCard for identical look/behavior
      if (isFixedMatch) {
        return (
      <div
            key={booking.id}
            className={cn(
        // Responsive: limit to mobile width and allow shrink on smaller screens; prevent flex stretching in horizontal scroll
        "flex-none flex flex-col space-y-2 w-full max-w-sm overflow-visible",
              isUpcomingItem ? '' : ''
            )}
          >
            <MatchCard
              match={matchDetails as any}
              currentUser={currentUser}
              onBookingSuccess={onBookingActionSuccess}
              onMatchUpdate={(updated) => {
                setBookings(prev => prev.map(b => b.activityId === updated.id ? {
                  ...b,
                  matchDetails: {
                    ...(updated as any),
                    startTime: new Date(updated.startTime),
                    endTime: new Date(updated.endTime),
                  }
                } : b));
              }}
              showPointsBonus={false}
              compact
              inlineRemovalEnabled={isOrganizerOfFixed && status !== 'confirmed'}
              onRemovePlayer={(userId: string) => {
                if (!userId) return;
                startProcessingTransition(async () => {
                  const res = await removePlayerFromMatch(booking.activityId, userId);
                  if ('error' in res) {
                    toast({ title: 'No eliminado', description: res.error, variant: 'destructive' });
                  } else {
                    // Update local state to reflect removal instantly
                    setBookings(prev => prev.map(b => b.activityId === booking.activityId ? {
                      ...b,
                      matchDetails: b.matchDetails ? {
                        ...b.matchDetails,
                        bookedPlayers: (b.matchDetails.bookedPlayers || []).filter(p => p.userId !== userId)
                      } : b.matchDetails
                    } : b));
                    toast({ title: 'Jugador eliminado', description: res.message || 'Se ha quitado al jugador.' });
                    onBookingActionSuccess();
                  }
                });
              }}
            />
            {/* Organizer extra actions below the card (Mi agenda specific) */}
            {(isOrganizerOfFixed) && isUpcomingItem && (
              <div className="pt-2 grid grid-cols-2 gap-1 w-full sm:flex sm:gap-2">
                {/* Cancelar y Ofrecer por puntos */}
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3 text-destructive border-destructive hover:bg-destructive/10" disabled={isProcessingAction}><Ban className="mr-1.5 h-3.5 w-3.5" /> Ofrecer</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Cancelar y Ofrecer por Puntos</AlertDialogTitle><AlertDialogDescription>Se te reembolsará el coste total de la pista ({totalCourtFee?.toFixed(2)}€). La pista quedará disponible para que otro jugador la reserve únicamente con puntos de fidelidad. ¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isProcessingAction}>Cerrar</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelAndReoffer(booking.activityId)} disabled={isProcessingAction && currentActionInfo?.type === 'cancelAndReoffer'} className="bg-destructive hover:bg-destructive/90">{currentActionInfo?.type === 'cancelAndReoffer' && isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Cancelar y Ofrecer"}</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* Quitar jugador (si no está confirmada) */}
                {status !== 'confirmed' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3 border-red-400 text-red-600 hover:bg-red-50" disabled={isProcessingAction}>
                        <Ban className="mr-1.5 h-3.5 w-3.5" /> Quitar<span className="hidden sm:inline"> Jugador</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar jugador</AlertDialogTitle>
                        <AlertDialogDescription>Selecciona a quién quieres quitar de esta partida fija.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="grid grid-cols-1 gap-2">
                        {(bookedPlayers || []).map(p => (
                          <Button key={p.userId} variant="outline" className="justify-start" onClick={() => {
                            setCurrentActionInfo({ type: 'removePlayer', bookingId: booking.id, matchId: booking.activityId, targetUserId: p.userId });
                            startProcessingTransition(async () => {
                              const res = await removePlayerFromMatch(booking.activityId, p.userId!);
                              if ('error' in res) {
                                toast({ title: 'No eliminado', description: res.error, variant: 'destructive' });
                              } else {
                                toast({ title: 'Jugador eliminado', description: res.message || 'Se ha quitado al jugador.' });
                                onBookingActionSuccess();
                              }
                              setCurrentActionInfo(null);
                            });
                          }}>
                            {p.name || p.userId}
                          </Button>
                        ))}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cerrar</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {/* Editar nivel/categoría */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3 border-blue-400 text-blue-700 hover:bg-blue-50"
                  onClick={() => setEditConfig({ open: true, matchId, level: (level as string) || 'abierto', category: (category as any) || 'abierta' })}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar<span className="hidden sm:inline"> Nivel/Cat.</span>
                </Button>
                {/* Cancelar partida fija */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3 border-slate-400 text-slate-700 hover:bg-slate-50" disabled={isProcessingAction}>
                      <CalendarX className="mr-1.5 h-3.5 w-3.5" /> Cancelar<span className="hidden sm:inline"> Partida</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar partida fija</AlertDialogTitle>
                      <AlertDialogDescription>Se eliminará la partida. Si está confirmada/privada, se gestionarán reembolsos según el flujo actual.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isProcessingAction}>Volver</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setCurrentActionInfo({ type: 'deleteFixed', bookingId: booking.id, matchId: booking.activityId });
                          startProcessingTransition(async () => {
                            const res = await deleteFixedMatch(booking.activityId);
                            if ('error' in res) {
                              toast({ title: 'No cancelada', description: res.error, variant: 'destructive' });
                            } else {
                              toast({ title: 'Partida cancelada', description: res.message || 'Partida eliminada.' });
                              onBookingActionSuccess();
                            }
                            setCurrentActionInfo(null);
                          });
                        }}
                        disabled={isProcessingAction}
                        className="bg-slate-700 text-white hover:bg-slate-800"
                      >{isProcessingAction && currentActionInfo?.type === 'deleteFixed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Sí, Cancelar'}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {/* Renew banner for completed fixed matches */}
            {!isUpcomingItem && provisionalMatch && !isRenewalExpired && (
              <div className="w-full flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-2 p-2 bg-blue-50 border border-blue-200 text-center rounded-md">
                <span className="text-[11px] sm:text-xs text-blue-700 font-medium break-words whitespace-normal leading-snug min-w-0 w-full sm:flex-1">Renovar para la próxima semana (expira en {renewalTimeLeft}):</span>
                <Button onClick={() => handleRenew(booking.activityId)} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shrink-0" disabled={isProcessingAction}>{isProcessingAction && currentActionInfo?.type === 'renew' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>} Renovar Reserva</Button>
              </div>
            )}
          </div>
        );
      }

      // Non-fixed matches: keep existing compact agenda card
      return (
        <div key={booking.id} className={cn(
          // Responsive: limitar al ancho móvil y evitar estirarse en el carrusel
          "flex-none flex flex-col p-3 rounded-lg shadow-md space-y-2 border-l-4 w-full max-w-sm overflow-hidden",
          cardBorderColor,
          isUpcomingItem ? 'bg-card border' : 'bg-muted/60 border border-border/50'
        )}>
             <div className="flex items-start justify-between">
                 <div className="flex items-center space-x-3">
                     <div className="flex-shrink-0 text-center font-bold bg-white p-1 rounded-md w-14 shadow-lg border border-border/20">
                        <p className="text-xs uppercase">{format(new Date(startTime), "EEE", { locale: es })}</p>
                        <p className="text-3xl leading-none">{format(new Date(startTime), "d")}</p>
                        <p className="text-xs uppercase">{format(new Date(startTime), "MMM", { locale: es })}</p>
                    </div>
                     <div className="flex flex-col">
                        <span className="font-semibold text-lg">{format(new Date(startTime), 'HH:mm')}h</span>
                        <span className="text-sm text-muted-foreground flex items-center"><Clock className="mr-1 h-3.5 w-3.5"/>{durationMinutes || 90} min</span>
                        <span className="text-sm text-muted-foreground">{clubDetails?.name || 'Club Padel'}</span>
                    </div>
                </div>
                  <div className="mt-0.5 flex flex-col items-end gap-1.5">
                    {isFixedMatch && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-12 w-12 bg-gradient-to-b from-white to-slate-50 shadow-sm">
                            <AvatarImage loading="lazy" src={organizerId ? (getMockUserDatabase().find(u => u.id === organizerId)?.profilePictureUrl || '') : ''} alt="Organizador" />
                            <AvatarFallback>{organizerId ? getInitials(getMockUserDatabase().find(u => u.id === organizerId)?.name || 'Org') : ''}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="leading-tight hidden sm:block">
                          <div className="text-sm font-semibold truncate max-w-[140px]">
                            {organizerId ? (getMockUserDatabase().find(u => u.id === organizerId)?.name || 'Organizador') : 'Organizador'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Badge className="px-2 py-0.5 h-5 rounded-full bg-sky-600 text-white hover:bg-sky-600">Partida Fija</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    {isUpcomingItem && status !== 'confirmed_private' && (
                      isUserInMatch ? (
                        <Badge variant="default" className="text-xs bg-blue-500">Inscrito</Badge>
                      ) : (
                        isMatchFull ? <Badge variant="destructive" className="text-xs bg-red-500">Completa</Badge> : null
                      )
                    )}
                    {isUpcomingItem && status === 'confirmed_private' && <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-400">Privada</Badge>}
                    {!isUpcomingItem && <Badge variant="outline" className="text-xs">Finalizada</Badge>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Share2 className="h-4 w-4"/></Button>
                  </div>
             </div>
             
             <div className="flex justify-around items-center gap-1.5 my-1">
                <InfoButton
                  icon={CategoryIconDisplay}
                  text={displayClassCategory(category, true)}
                  onClick={() => {
                    if (canEditFixedConfig) {
                      setEditConfig({ open: true, matchId, level: (level as string) || 'abierto', category: (category as any) || 'abierta' });
                    } else {
                      handleInfoClick('category', booking.matchDetails!);
                    }
                  }}
                  className={cn(isCategoryAssigned && classifiedBadgeClass)}
                />
                <InfoButton icon={Hash} text={courtDisplay} onClick={() => handleInfoClick('court', booking.matchDetails!)} className={cn(isCourtAssigned && classifiedBadgeClass)} />
                <InfoButton
                  icon={BarChartHorizontal}
                  text={levelToDisplay}
                  onClick={() => {
                    if (canEditFixedConfig) {
                      setEditConfig({ open: true, matchId, level: (level as string) || 'abierto', category: (category as any) || 'abierta' });
                    } else {
                      handleInfoClick('level', booking.matchDetails!);
                    }
                  }}
                  className={cn(isLevelAssigned && classifiedBadgeClass)}
                />
             </div>
           
            <div className="grid grid-cols-4 gap-2 items-start justify-items-center mt-1">
              {Array.from({ length: 4 }).map((_, idx) => (
                <MatchSpotDisplay
                  key={idx}
                  spotIndex={idx}
                  match={matchDetails}
                  currentUser={currentUser}
                  onJoin={() => {}}
                  onJoinPrivate={() => {}}
                  isPending={false}
                  userHasOtherConfirmedActivityToday={true}
                  isUserLevelCompatible={true}
                  canJoinThisPrivateMatch={false}
                  isOrganizer={isOrganizerOfPrivateMatch || isOrganizerOfFixed}
                  canBookWithPoints={false}
                  showPointsBonus={false}
                  pricePerPlayer={pricePerPlayer}
                  pointsToAward={0}
                  inlineRemovalEnabled={isOrganizerOfFixed && status !== 'confirmed'}
                  onRemovePlayer={(userId: string) => {
                    if (!userId) return;
                    startProcessingTransition(async () => {
                      const res = await removePlayerFromMatch(booking.activityId, userId);
                      if ('error' in res) {
                        toast({ title: 'No eliminado', description: res.error, variant: 'destructive' });
                      } else {
                        // Update local UI quickly
                        setBookings(prev => prev.map(b => b.activityId === booking.activityId ? {
                          ...b,
                          matchDetails: b.matchDetails ? {
                            ...b.matchDetails,
                            bookedPlayers: (b.matchDetails.bookedPlayers || []).filter(p => p.userId !== userId)
                          } : b.matchDetails
                        } : b));
                        toast({ title: 'Jugador eliminado', description: res.message || 'Se ha quitado al jugador.' });
                        onBookingActionSuccess();
                      }
                    });
                  }}
                />
              ))}
            </div>

            <div className="pt-2 border-t mt-2">
              {availability && (
                <CourtAvailabilityIndicator
                  availableCourts={availability.available}
                  occupiedCourts={availability.occupied}
                  totalCourts={availability.total}
                />
              )}
            </div>


              <div className="pt-2 border-t mt-2 flex flex-col items-center justify-center space-y-2">
         {(isOrganizerOfPrivateMatch || isOrganizerOfFixed) && isUpcomingItem && (
           <div className="flex w-full gap-2">
                         <AlertDialog>
                             <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="flex-1 text-xs border-orange-500 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700" disabled={isProcessingAction}>{isProcessingAction ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Unlock className="mr-1.5 h-3.5 w-3.5"/>} Pública</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                 <AlertDialogHeader><AlertDialogTitle>¿Hacer Pública esta Partida?</AlertDialogTitle><AlertDialogDescription>La partida será visible para todos y podrán unirse nuevos jugadores. No se realizarán reembolsos automáticos.</AlertDialogDescription></AlertDialogHeader>
                                 <AlertDialogFooter><AlertDialogCancel disabled={isProcessingAction}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleMakeMatchPublic} disabled={isProcessingAction} className="bg-orange-500 hover:bg-orange-600 text-white">{isProcessingAction ? <Loader2 className="animate-spin h-4 w-4" /> : "Sí, Hacer Pública"}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                         </AlertDialog>
                         <AlertDialog>
                             <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="flex-1 text-xs text-destructive border-destructive hover:bg-destructive/10" disabled={isProcessingAction}><Ban className="mr-1.5 h-3.5 w-3.5" /> Ofrecer</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                 <AlertDialogHeader><AlertDialogTitle>Cancelar y Ofrecer por Puntos</AlertDialogTitle><AlertDialogDescription>Se te reembolsará el coste total de la pista ({totalCourtFee?.toFixed(2)}€). La pista quedará disponible para que otro jugador la reserve únicamente con puntos de fidelidad. ¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
                                 <AlertDialogFooter><AlertDialogCancel disabled={isProcessingAction}>Cerrar</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelAndReoffer(booking.activityId)} disabled={isProcessingAction && currentActionInfo?.type === 'cancelAndReoffer'} className="bg-destructive hover:bg-destructive/90">{currentActionInfo?.type === 'cancelAndReoffer' && isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Cancelar y Ofrecer"}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                         </AlertDialog>
                         {/* Organizer: remove player from fixed match while forming */}
                        {isOrganizerOfFixed && status !== 'confirmed' && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="outline" size="sm" className="flex-1 text-xs border-red-400 text-red-600 hover:bg-red-50" disabled={isProcessingAction}>
                                 <Ban className="mr-1.5 h-3.5 w-3.5" /> Quitar Jugador
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Eliminar jugador</AlertDialogTitle>
                                 <AlertDialogDescription>Selecciona a quién quieres quitar de esta partida fija.</AlertDialogDescription>
                               </AlertDialogHeader>
                               <div className="grid grid-cols-1 gap-2">
                                 {(bookedPlayers || []).map(p => (
                                   <Button key={p.userId} variant="outline" className="justify-start" onClick={() => {
                                     setCurrentActionInfo({ type: 'removePlayer', bookingId: booking.id, matchId: booking.activityId, targetUserId: p.userId });
                                     startProcessingTransition(async () => {
                                       const res = await removePlayerFromMatch(booking.activityId, p.userId!);
                                       if ('error' in res) {
                                         toast({ title: 'No eliminado', description: res.error, variant: 'destructive' });
                                       } else {
                                         toast({ title: 'Jugador eliminado', description: res.message || 'Se ha quitado al jugador.' });
                                         onBookingActionSuccess();
                                       }
                                       setCurrentActionInfo(null);
                                     });
                                   }}>
                                     {p.name || p.userId}
                                   </Button>
                                 ))}
                               </div>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cerrar</AlertDialogCancel>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                         {/* Organizer: cancel entire fixed match */}
                        {isOrganizerOfFixed && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="outline" size="sm" className="flex-1 text-xs border-slate-400 text-slate-700 hover:bg-slate-50" disabled={isProcessingAction}>
                                 <CalendarX className="mr-1.5 h-3.5 w-3.5" /> Cancelar Partida
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Cancelar partida fija</AlertDialogTitle>
                                 <AlertDialogDescription>Se eliminará la partida. Si está confirmada/privada, se gestionarán reembolsos según el flujo actual.</AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel disabled={isProcessingAction}>Volver</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => {
                                     setCurrentActionInfo({ type: 'deleteFixed', bookingId: booking.id, matchId: booking.activityId });
                                     startProcessingTransition(async () => {
                                       const res = await deleteFixedMatch(booking.activityId);
                                       if ('error' in res) {
                                         toast({ title: 'No cancelada', description: res.error, variant: 'destructive' });
                                       } else {
                                         toast({ title: 'Partida cancelada', description: res.message || 'Partida eliminada.' });
                                         onBookingActionSuccess();
                                       }
                                       setCurrentActionInfo(null);
                                     });
                                   }}
                                   disabled={isProcessingAction}
                                   className="bg-slate-700 text-white hover:bg-slate-800"
                                 >{isProcessingAction && currentActionInfo?.type === 'deleteFixed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Sí, Cancelar'}</AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                         {canEditFixedConfig && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-blue-400 text-blue-700 hover:bg-blue-50"
                              onClick={() => setEditConfig({ open: true, matchId, level: (level as string) || 'abierto', category: (category as any) || 'abierta' })}
                            >
                              <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar Nivel/Cat.
                            </Button>
                         )}
                      </div>
                 )}
                 {isUpcomingItem && !isOrganizerOfPrivateMatch && (
                     <div className="flex items-center justify-center w-full gap-2">
                         <AlertDialog>
                             <AlertDialogTrigger asChild>
                                <Button 
                                    variant={buttonVariant} 
                                    size="sm" 
                                    className={cn(
                                        "w-full sm:w-auto text-xs shadow-md border", 
                                        buttonVariant === "destructive" && "bg-card text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive", 
                                        buttonVariant === "outline" && cancellationButtonText.includes("Bonificada") && "bg-green-500 text-white border-green-600 hover:bg-green-600",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )} 
                                    disabled={isProcessingAction && currentActionInfo?.bookingId === booking.id}
                                >
                                    {isProcessingAction && currentActionInfo?.bookingId === booking.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
                                    {cancellationButtonText}
                                </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar Cancelación?</AlertDialogTitle><AlertDialogDescription>{cancellationDialogText}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isProcessingAction && currentActionInfo?.bookingId === booking.id}>Volver</AlertDialogCancel><AlertDialogAction onClick={() => handleCancellationAction(booking)} disabled={isProcessingAction && currentActionInfo?.bookingId === booking.id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isProcessingAction && currentActionInfo?.bookingId === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Cancelar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                         </AlertDialog>
                         {isMatchFull && isUpcomingItem && (<Button variant="outline" size="sm" className="w-full sm:w-auto ml-2 text-xs bg-blue-500 text-white border-blue-600 hover:bg-blue-600" onClick={() => handleOpenChatDialog(booking.activityId)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Chat</Button>)}
                         {canMakePrivate && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 hover:text-purple-800" disabled={isProcessingAction}>
                                        {isProcessingAction && currentActionInfo?.bookingId === booking.id && currentActionInfo.type === 'makePrivate' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
                                        Hacer Privada
                                    </Button>
                                </AlertDialogTrigger>
                                 <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Hacer Partida Privada</AlertDialogTitle><AlertDialogDescription>Pagarás las plazas restantes para completar la partida y asegurarla. Se te cobrará el coste correspondiente de tu saldo. ¿Continuar?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel disabled={isProcessingAction}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleMakePrivate(booking)} disabled={isProcessingAction} className="bg-purple-600 text-white hover:bg-purple-700">{isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Sí, Hacer Privada"}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                     </div>
                 )}
        {!isUpcomingItem && provisionalMatch && !isRenewalExpired && (
          <div className="w-full flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-2 p-2 bg-blue-50 border-t border-blue-200 text-center">
            <span className="text-[11px] sm:text-xs text-blue-700 font-medium break-words whitespace-normal leading-snug min-w-0 w-full sm:flex-1">Renovar para la próxima semana (expira en {renewalTimeLeft}):</span>
            <Button onClick={() => handleRenew(booking.activityId)} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shrink-0" disabled={isProcessingAction}>{isProcessingAction && currentActionInfo?.type === 'renew' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>} Renovar Reserva</Button>
          </div>
        )}
             </div>
         </div>
       );
    };

    return (
    <>
      <div className="space-y-6">
          {(hasUpcomingBookings || hasPastBookings) &&
            <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center"><Trophy className="mr-2 h-5 w-5" /> Mis Partidas</h3>
          }
          {hasUpcomingBookings && (
              <div>
                <h4 className="text-base font-semibold mb-3 text-foreground flex items-center"><Clock className="mr-2 h-4 w-4" /> Próximas</h4>
                  <ScrollArea className="w-full whitespace-nowrap px-1">
                    <div className="flex pb-4 space-x-4">
                        {upcomingBookings.map(b => renderBookingItem(b, true))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
              </div>
          )}
          {hasUpcomingBookings && hasPastBookings && <Separator />}
          {hasPastBookings && (
              <div>
                <h4 className="text-base font-semibold mb-3 text-muted-foreground flex items-center"><CheckCircle className="mr-2 h-4 w-4" /> Historial</h4>
                 <ScrollArea className="w-full whitespace-nowrap px-1">
                    <div className="flex pb-4 space-x-4">
                      {pastBookings.map(b => renderBookingItem(b, false))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                 </ScrollArea>
              </div>
          )}
      </div>
      <DialogInfo isOpen={infoDialog.open} onOpenChange={(open) => setInfoDialog(prev => ({ ...prev, open }))} title={infoDialog.title} description={infoDialog.description} icon={infoDialog.icon} />
      {/* Edit fixed match config dialog */}
      <InfoDialog open={editConfig.open} onOpenChange={(open) => setEditConfig(prev => ({ ...prev, open }))}>
        <InfoDialogContent>
          <InfoDialogHeader>
            <InfoDialogTitle>Editar partida fija</InfoDialogTitle>
          </InfoDialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Categoría:</span>
              <div className="flex gap-2">
                {(['abierta','chico','chica'] as const).map(cat => (
                  <button
                    key={cat}
                    className={cn('text-xs px-2 py-1 rounded border', (editConfig.category) === cat ? 'bg-blue-600 text-white border-blue-700' : 'bg-white')}
                    onClick={() => setEditConfig(prev => ({ ...prev, category: cat }))}
                  >{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Nivel:</span>
              <select
                className="text-xs border rounded px-2 py-1"
                value={editConfig.level}
                onChange={e => setEditConfig(prev => ({ ...prev, level: e.target.value }))}
              >
                <option value="abierto">Abierto</option>
                {['1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <InfoDialogFooter>
            <InfoDialogClose asChild>
              <Button variant="outline" disabled={isSavingConfig}>Cancelar</Button>
            </InfoDialogClose>
            <Button
              onClick={async () => {
                if (!editConfig.matchId) return;
                try {
                  setIsSavingConfig(true);
                  const updates: any = {};
                  if (editConfig.level) updates.level = editConfig.level as any;
                  if (editConfig.category) updates.category = editConfig.category;
                  const res = await updateMatchLevelAndCategory(currentUser.id, editConfig.matchId, updates);
                  if ('error' in res) {
                    toast({ title: 'No actualizado', description: res.error, variant: 'destructive' });
                  } else {
                    // Update local state
                    setBookings(prev => prev.map(b => b.activityId === editConfig.matchId ? {
                      ...b,
                      matchDetails: b.matchDetails ? { ...b.matchDetails, level: res.updatedMatch.level, category: res.updatedMatch.category } : b.matchDetails
                    } : b));
                    toast({ title: 'Partida actualizada', description: 'Nivel y/o categoría guardados.' });
                    setEditConfig({ open: false, matchId: null, level: 'abierto', category: 'abierta' });
                  }
                } finally {
                  setIsSavingConfig(false);
                }
              }}
              disabled={isSavingConfig}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >{isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
          </InfoDialogFooter>
        </InfoDialogContent>
      </InfoDialog>
      {selectedMatchForChat && (
          <MatchChatDialog
              isOpen={isChatDialogOpen}
              onOpenChange={setIsChatDialogOpen}
              matchDetails={selectedMatchForChat}
          />
      )}
    </>
  );
};

export default PersonalMatches;

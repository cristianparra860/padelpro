
"use client";
// DEBUG: Log temporal para depuración de plazas y avatares
import { useEffect } from 'react';

// ...existing code...

// Hook temporal para log de depuración
// (debe ir dentro del componente para tener acceso a match)

import React from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User as UserIcon, Plus, Loader2, Gift, CreditCard, AlertTriangle, Lock, Star, X as XIcon } from 'lucide-react';
import type { Match, User } from '@/types';
import { cn, getInitials, calculatePricePerPerson, roundPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getMockStudents, getMockClubs } from '@/lib/mockData';
import { differenceInDays, startOfDay } from 'date-fns';

interface MatchSpotDisplayProps {
  spotIndex: number;
  match: Match;
  currentUser: User | null;
  onJoin: (spotIndex: number, usePoints?: boolean) => void;
  onJoinPrivate: () => void;
  isPending: boolean;
  userHasOtherConfirmedActivityToday: boolean;
  isUserLevelCompatible: boolean;
  canJoinThisPrivateMatch: boolean;
  isOrganizer: boolean;
  canBookWithPoints?: boolean;
  showPointsBonus: boolean;
  pricePerPlayer: number;
  pointsToAward: number;
    // Optional: when viewing in "Mi agenda" as organizer, show an inline X to remove player
    inlineRemovalEnabled?: boolean;
    onRemovePlayer?: (userId: string) => void;
}

const MatchSpotDisplayComponent: React.FC<MatchSpotDisplayProps> = ({
  spotIndex,
  match,
  currentUser,
  onJoin,
  onJoinPrivate,
  isPending,
  userHasOtherConfirmedActivityToday,
  isUserLevelCompatible,
  canJoinThisPrivateMatch,
  isOrganizer,
  canBookWithPoints,
  showPointsBonus,
  pricePerPlayer,
  pointsToAward,
    inlineRemovalEnabled,
    onRemovePlayer,
}) => {
    const { toast } = useToast();
    
    // Debug: log de ALL bookedPlayers del match
    if (spotIndex === 0) {
        console.log('🎯 Match bookedPlayers:', match.bookedPlayers);
    }
    
    // Buscar el usuario real para este spot: solo mostrar el usuario si está en esta posición
    let player = match.bookedPlayers?.[spotIndex];
    let isSlotEmpty = !player || !player.userId;
    let isCurrentUserInSpot = !!(player && currentUser && player.userId === currentUser.id);
    const isMatchFull = (match.bookedPlayers || []).length >= 4;
    const isPlaceholderMatch = match.isPlaceholder === true;
    
    // Debug: log para ver datos del player
    if (player) {
        console.log('🔍 Player raw data:', { spotIndex, player, hasUserId: !!player.userId });
    }
    
    // 1) If the spot is already occupied, always show avatar and disable
    // 2) Global day-block: if user already has a confirmed activity today, disable everything

    const pointsCost = match.isPointsOnlyBooking 
        ? (calculatePricePerPerson(match.totalCourtFee, 4) || 20)
        : pricePerPlayer;

    let spotTooltipText = "";
    let iconToShow: React.ReactNode = <Plus className="h-5 w-5 text-green-600 opacity-60 stroke-[3]" />;
    let spotVariant: "solid" | "dashed" | "gratis" = "dashed";
    let isDisabled = true;
    let animationClass = "";
    
    const isUserAlreadyBooked = !!(currentUser && (match.bookedPlayers || []).some(p => p.userId === currentUser.id));
    const availableCredit = (currentUser?.credit ?? 0) - (currentUser?.blockedCredit ?? 0);
    const hasEnoughCredit = availableCredit >= pricePerPlayer;
    const hasEnoughPoints = (currentUser?.loyaltyPoints ?? 0) >= pointsCost;

    const isMatchBookableWithPoints = canBookWithPoints && isPlaceholderMatch;
    const isPointsBonusVisible = showPointsBonus && !isMatchBookableWithPoints && pointsToAward > 0 && !player && !isMatchFull;


    let actionHandler = () => {
        if (!currentUser) {
            toast({ title: "Acción Requerida", description: 'Por favor, inicia sesión para unirte a la partida.', variant: "default" });
            return;
        }
        if (isDisabled && spotTooltipText) {
            toast({ title: "Información", description: spotTooltipText, variant: "default", duration: 4000 });
        }
    };


    // Siempre usar el usuario actual si coincide el userId, si no buscar en estudiantes o en user database
    const userDb = require('@/lib/mockDataSources/state');
    const fullPlayer = player && player.userId
        ? (currentUser && player.userId === currentUser.id
            ? currentUser
            : getMockStudents().find(s => s.id === player.userId)
              || userDb.getMockUserDatabase().find((u: any) => u.id === player.userId)
              || player)
        : null;

    // Día bloqueado: si el usuario tiene otra actividad confirmada hoy, bloquear todas las plazas vacías
    if (userHasOtherConfirmedActivityToday && isSlotEmpty) {
        iconToShow = <Plus className="h-5 w-5 text-muted-foreground opacity-60" />;
        spotTooltipText = "Ya tienes una reserva este día. Máximo una reserva por día.";
        spotVariant = "dashed";
        isDisabled = true;
    } else if (!isSlotEmpty && fullPlayer) {
        spotTooltipText = `${fullPlayer.name || 'Jugador'}${isCurrentUserInSpot ? ' (Tú)' : ''}`;
        spotVariant = "solid";
        isDisabled = true;
    } else if (isSlotEmpty) {
        iconToShow = <Plus className="h-5 w-5 text-green-600 opacity-60 stroke-[3]" />;
        spotTooltipText = isPlaceholderMatch ? `Iniciar Partida (Coste: ${roundPrice(pricePerPlayer).toFixed(2)}€)` : `Unirse (Coste: ${roundPrice(pricePerPlayer).toFixed(2)}€)`;
        spotVariant = "dashed";
        isDisabled = false;
        actionHandler = () => onJoin(spotIndex, false);
    } else if (isPending) {
        spotTooltipText = "Procesando...";
        isDisabled = true;
    } else if (isUserAlreadyBooked) {
        spotTooltipText = "Ya estás inscrito en esta partida.";
    } else if (userHasOtherConfirmedActivityToday) {
        // Safety net (should already be handled above for empty spots)
        spotTooltipText = "Ya tienes una reserva este día. Máximo una reserva por día.";
        isDisabled = true;
    } else if (match.status === 'confirmed_private') {
        if(canJoinThisPrivateMatch) {
            iconToShow = <UserIcon className="h-5 w-5 text-purple-600" />;
            spotTooltipText = `Unirme a esta Partida Privada (Coste: ${roundPrice(pricePerPlayer).toFixed(2)}€)`;
            spotVariant = "gratis";
            isDisabled = false;
            actionHandler = () => {
                if (!currentUser) { toast({ title: "Acción Requerida", description: 'Por favor, inicia sesión para unirte.' }); return; }
                onJoinPrivate();
            };
        } else if (!isOrganizer) {
            spotTooltipText = "Partida privada. Necesitas invitación.";
            iconToShow = <Lock className="h-5 w-5 text-purple-500 opacity-70"/>;
            isDisabled = true;
        } else {
             spotTooltipText = "Plaza libre para tu invitado.";
             isDisabled = true;
        }
    } else { 
        const isThisSpotTheGratisOne = match.gratisSpotAvailable && (match.bookedPlayers || []).length === 3;
        
        if (isThisSpotTheGratisOne) {
            if (!isUserLevelCompatible) {
                iconToShow = <Gift className="h-5 w-5 text-purple-400 opacity-60" />;
                spotTooltipText = `Nivel incompatible (${currentUser?.level || 'N/A'}) para plaza gratis.`;
                spotVariant = "gratis";
                isDisabled = true;
            } else if (hasEnoughPoints) {
                iconToShow = <Gift className="h-5 w-5 text-purple-600" />;
                spotTooltipText = `Unirse (Coste: ${pointsCost} Puntos)`;
                spotVariant = "gratis";
                isDisabled = false;
                actionHandler = () => onJoin(spotIndex, true);
                animationClass = "animate-pulse-purple";
            } else {
                iconToShow = <Gift className="h-5 w-5 text-purple-400 opacity-60" />;
                spotTooltipText = `Puntos insuficientes (${currentUser?.loyaltyPoints ?? 0} / ${pointsCost}) para plaza gratis.`;
                spotVariant = "gratis";
                isDisabled = true;
            }
        } else if (match.isPointsOnlyBooking || (canBookWithPoints && isPlaceholderMatch)) {
            if (!isUserLevelCompatible) {
                iconToShow = <Gift className="h-5 w-5 text-purple-400 opacity-60" />;
                spotTooltipText = `Nivel incompatible (${currentUser?.level || 'N/A'}) para plaza de puntos.`;
                spotVariant = "gratis";
                isDisabled = true;
            } else if (hasEnoughPoints) {
                iconToShow = <Gift className="h-5 w-5 text-purple-600" />;
                spotTooltipText = `Reservar Plaza (Coste: ${pointsCost} Puntos)`;
                spotVariant = "gratis";
                isDisabled = false;
                actionHandler = () => onJoin(spotIndex, true); 
                animationClass = "animate-pulse-purple";
            } else {
                iconToShow = <Gift className="h-5 w-5 text-purple-400 opacity-60" />;
                spotTooltipText = `Puntos insuficientes (${currentUser?.loyaltyPoints ?? 0} / ${pointsCost}) para reservar la plaza.`;
                spotVariant = "gratis";
                isDisabled = true;
            }
        } else if (isMatchFull) {
            spotTooltipText = "Partida Completa.";
            isDisabled = true;
        } else if (!isUserLevelCompatible) {
            iconToShow = <AlertTriangle className="h-5 w-5 text-destructive/70" />;
            spotTooltipText = `Nivel incompatible (${currentUser?.level || 'N/A'}).`;
            isDisabled = true;
        } else if (!hasEnoughCredit) {
            iconToShow = <CreditCard className="h-5 w-5 text-destructive/70" />;
            spotTooltipText = `Saldo disponible insuficiente (${roundPrice(availableCredit).toFixed(2)}€ / ${roundPrice(pricePerPlayer).toFixed(2)}€).`;
            isDisabled = true;
        } else { // This is the final "can join" case
            iconToShow = <Plus className="h-5 w-5 text-green-600 stroke-[3]" />;
            spotTooltipText = isPlaceholderMatch ? `Iniciar Partida (Coste: ${roundPrice(pricePerPlayer).toFixed(2)}€)` : `Unirse (Coste: ${roundPrice(pricePerPlayer).toFixed(2)}€)`;
            isDisabled = false;
            actionHandler = () => onJoin(spotIndex, false);
        }
    }
    
        // Mostrar nivel del jugador: si tiene level y no es 'abierto', mostrarlo; si no, mostrar '?'
        const playerLevelDisplay = (fullPlayer && player && player.userId) 
            ? (fullPlayer.level && fullPlayer.level !== 'abierto' ? fullPlayer.level : '?')
            : '';
        
        // Debug: log para verificar datos del jugador
        if (fullPlayer && player && player.userId) {
            console.log('🎯 MatchSpotDisplay - Player Data:', {
                spotIndex,
                name: fullPlayer.name,
                level: fullPlayer.level,
                playerLevelDisplay,
                hasUserId: !!player.userId
            });
        }

        const spotLabel = !isSlotEmpty && fullPlayer
            ? (fullPlayer.name || 'Jugador').split(' ')[0]
            : (match.gratisSpotAvailable && (match.bookedPlayers || []).length === 3 && isSlotEmpty)
            ? ""
            : (pricePerPlayer > 0 ? `${roundPrice(pricePerPlayer).toFixed(2)}€` : "");


    return (
        <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    onClick={actionHandler}
                    className={cn( "flex flex-col items-center group/avatar-wrapper space-y-0.5 relative", !isDisabled ? "cursor-pointer" : "cursor-not-allowed")}
                    aria-label={spotTooltipText}
                >
                    {/* 🎯 Badge de nivel encima del avatar - FUERA del círculo para que sea visible */}
                    {player && player.userId && playerLevelDisplay && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-40">
                            <div className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-white">
                                {playerLevelDisplay}
                            </div>
                        </div>
                    )}
                    
                    <div className={cn(
                        "relative inline-flex items-center justify-center h-12 w-12 rounded-full border-[3px] z-0 transition-all shadow-[inset_0_3px_6px_0_rgba(0,0,0,0.2)]",
                        animationClass,
                        spotVariant === "solid" && "bg-slate-100 border-slate-300",
                        spotVariant === "dashed" && "border-dashed border-green-400 bg-slate-100 hover:bg-green-100/50",
                        spotVariant === "gratis" && "border-solid border-purple-500 bg-purple-100 hover:bg-purple-200",
                        isCurrentUserInSpot && "border-4 border-primary shadow-lg",
                        isDisabled && !player && 'opacity-70 hover:bg-transparent'
                    )}>
                    {player && player.userId ? (
                        <>
                            <Avatar className="h-[calc(100%-4px)] w-[calc(100%-4px)]">
                                <AvatarImage
                                    src={(fullPlayer as any)?.profilePictureUrl || player.profilePictureUrl || ''}
                                    alt={`Avatar ${fullPlayer?.name || player.name || 'Sin nombre'}`}
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                    data-ai-hint="player avatar large"
                                />
                                <AvatarFallback className="text-sm border border-border">
                                    {getInitials((fullPlayer?.name || player.name || '').trim()) || '??'}
                                </AvatarFallback>
                            </Avatar>
                                                        {inlineRemovalEnabled && onRemovePlayer && (
                                                            <button
                                                                type="button"
                                                                aria-label="Quitar jugador"
                                                                className="absolute -top-1.5 -left-1.5 z-30 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700 focus:outline-none"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (player?.userId) onRemovePlayer(player.userId);
                                                                }}
                                                            >
                                                                <XIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                        </>
                    ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center">
                            {iconToShow}
                        </div>
                    )}
                        {isPointsBonusVisible && (
                            <div className={cn("absolute -top-1 -right-1 flex h-auto items-center justify-center rounded-full bg-amber-400 px-1 py-0 text-white shadow-md text-[10px] font-bold")} title={`${pointsToAward} puntos de bonificación`}>
                                +{pointsToAward.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                        )}
                    </div>
                     <span className={cn(
                        "text-[11px] font-medium truncate w-auto max-w-[60px] text-center",
                        player ? "text-foreground" : "text-muted-foreground",
                         (match.gratisSpotAvailable && (match.bookedPlayers || []).length === 3 && !player) && "text-purple-600 font-bold",
                         canJoinThisPrivateMatch && !player && "text-purple-600 font-bold",
                         (match.isPointsOnlyBooking || (canBookWithPoints && isPlaceholderMatch)) && !player && "text-purple-600 font-bold"
                     )}>{spotLabel}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs p-1.5">{spotTooltipText}</TooltipContent>
        </Tooltip>
        </TooltipProvider>
    );
};

// Exportar SIN memo temporalmente para debug
export const MatchSpotDisplay = MatchSpotDisplayComponent;

"use client";

import React from 'react';
import type { Match, Club } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { format, isPast, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Trash2, UserX, Loader2, ShieldQuestion, CalendarClock, Users, Hash, Euro, Gift } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getPlaceholderUserName, calculatePricePerPerson } from '@/lib/utils';
import { getMockClubs, getMockStudents } from '@/lib/mockData';
import { cn } from '@/lib/utils';
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


interface MatchAdminCardProps {
  match: Match;
  currentAdminClubId: string; // Not used currently but good for future ACL
  onCancelMatch: (matchId: string) => void;
  onRemovePlayer: (matchId: string, playerId: string) => void;
  isProcessingActionForMatch: (type: 'cancelMatch' | 'removePlayer', entityId: string) => boolean;
}

const MatchAdminCard: React.FC<MatchAdminCardProps> = ({
  match,
  currentAdminClubId,
  onCancelMatch,
  onRemovePlayer,
  isProcessingActionForMatch
}) => {
  const startTimeFormatted = format(new Date(match.startTime), "EEEE d MMM, HH:mm", { locale: es });
  const endTimeFormatted = format(new Date(match.endTime), "HH:mm", { locale: es });
  const isPastMatch = isPast(new Date(match.endTime)); // Matches that have concluded
  const isMatchInProgress = !isPastMatch && isPast(new Date(match.startTime)); // Started but not ended

  const clubDetails: Club | undefined = getMockClubs().find(c => c.id === match.clubId);
  const clubName = clubDetails?.name || 'Club Desconocido';
  const pricePerPlayerEuro = match.totalCourtFee ? calculatePricePerPerson(match.totalCourtFee, 4) : 0;
  const pointsCostForGratisSpot = match.totalCourtFee ? calculatePricePerPerson(match.totalCourtFee, 4) : 5; // Default to 5 if no fee


  return (
    <Card className="bg-card border shadow-md rounded-lg flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4 bg-muted/30 rounded-t-lg">
        <div className="flex items-start justify-between">
            <div>
                <CardTitle className="text-base font-semibold text-foreground">{startTimeFormatted} - {endTimeFormatted}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center">
                    <CalendarClock className="h-3.5 w-3.5 mr-1"/> Pista {match.courtNumber} - {clubName}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isPastMatch && <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-300">Finalizada</Badge>}
              {isMatchInProgress && !isPastMatch && <Badge className="text-xs bg-green-100 text-green-700 border-green-400 animate-pulse">En Curso</Badge>}
              {!isPastMatch && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isProcessingActionForMatch('cancelMatch', match.id)}
                      title="Cancelar partida"
                    >
                      {isProcessingActionForMatch('cancelMatch', match.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar Cancelación de Partida?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esto cancelará la partida para todos los jugadores inscritos.<br />
                        Se les reembolsará el coste (si aplica). Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isProcessingActionForMatch('cancelMatch', match.id)}>Volver</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onCancelMatch(match.id)}
                        disabled={isProcessingActionForMatch('cancelMatch', match.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isProcessingActionForMatch('cancelMatch', match.id) ? <Loader2 className="animate-spin h-4 w-4" /> : "Sí, Cancelar Partida"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
        </div>
         <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-xs">
            <Badge variant="outline">Nivel: {match.level}</Badge>
            <Badge variant="outline" className="capitalize">Cat: {match.category}</Badge>
            {match.gratisSpotAvailable && match.bookedPlayers.length === 3 && (
                 <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100">
                    <Gift className="h-3 w-3 mr-1"/>¡4ª Plaza Gratis!
                 </Badge>
            )}
            {match.totalCourtFee && match.totalCourtFee > 0 && !(match.gratisSpotAvailable && match.bookedPlayers.length === 3) &&(
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                    <Euro className="h-3 w-3 mr-0.5"/>{pricePerPlayerEuro.toFixed(2)} p.p.
                </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3 flex-grow">
        <div className="mb-2">
          <h4 className="text-xs font-medium text-muted-foreground">Jugadores Inscritos ({match.bookedPlayers.length}/4):</h4>
        </div>
        {match.bookedPlayers && match.bookedPlayers.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {match.bookedPlayers.map(player => {
              const student = getMockStudents().find(s => s.id === player.userId);
              const playerName = student?.name || player.name || getPlaceholderUserName(player.userId, undefined);
              const playerLevel = student?.level || 'N/A';
              return (
                <div key={player.userId} className="flex items-center justify-between text-sm py-1 px-2 bg-secondary/50 rounded-md border border-border/50">
                  <div className="flex items-center space-x-2">
                     <Avatar className="h-6 w-6">
                        <AvatarImage src={student?.profilePictureUrl || `https://picsum.photos/seed/${player.userId}/24/24`} alt={playerName} data-ai-hint="player avatar small"/>
                        <AvatarFallback className="text-[10px]">{getInitials(playerName)}</AvatarFallback>
                     </Avatar>
                     <span className="truncate max-w-[100px] sm:max-w-[120px]">{playerName}</span>
                     <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-auto">N: {playerLevel}</Badge>
                  </div>
                  {!isPastMatch && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                disabled={isProcessingActionForMatch('removePlayer', player.userId)}
                                aria-label={`Eliminar a ${playerName} de la partida`}
                            >
                                {isProcessingActionForMatch('removePlayer', player.userId) ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Confirmar Eliminación de Jugador?</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar a <span className="font-semibold">{playerName}</span> de esta partida?
                                Se le reembolsará el coste (si aplica) y la plaza quedará libre.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isProcessingActionForMatch('removePlayer', player.userId)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => onRemovePlayer(match.id, player.userId)}
                                disabled={isProcessingActionForMatch('removePlayer', player.userId)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isProcessingActionForMatch('removePlayer', player.userId) ? <Loader2 className="animate-spin h-4 w-4" /> : "Sí, Eliminar Jugador"}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-3">Sin jugadores apuntados.</p>
        )}
      </CardContent>
      {/* El botón de cancelar partida ahora está en el header */}
    </Card>
  );
};

export default MatchAdminCard;

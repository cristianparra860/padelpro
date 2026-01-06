"use client";

import React from 'react';
import type { Match } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getMockStudents } from '@/lib/mockData';
import { Users, Lock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchInscriptionVisualizerProps {
  match: Match;
  isConfirmed: boolean;
}

const MatchInscriptionVisualizer: React.FC<MatchInscriptionVisualizerProps> = ({ match, isConfirmed }) => {
  const bookedPlayers = match.bookedPlayers || [];
  const allStudents = getMockStudents();
  
  // Detectar reserva privada: status=confirmed_private O 4 bookings del mismo usuario
  const isPrivateBookingPattern = bookedPlayers.length === 4 && match.courtNumber && 
    bookedPlayers.every(p => p.userId === bookedPlayers[0].userId);
  const isPrivate = match.status === 'confirmed_private' || isPrivateBookingPattern;
  const isPlaceholder = match.isPlaceholder;

  const getPlayerDetails = (userId: string) => {
    return allStudents.find(s => s.id === userId) || { id: userId, name: `ID: ${userId.slice(0, 4)}`, profilePictureUrl: '' };
  };

  if (isPlaceholder) {
     return (
        <div className="h-full w-full flex flex-col items-center justify-center p-1 text-orange-800 bg-orange-50/50">
            <Trophy className="h-5 w-5 opacity-80" />
            <p className="text-[9px] font-semibold text-center mt-0.5">Abierta</p>
        </div>
    );
  }

  return (
    <div className={cn(
        "h-full w-full flex flex-col items-center justify-center p-1", 
        isPrivate ? "bg-orange-600 text-white" : 
        isConfirmed ? "bg-rose-700 text-white" : 
        "bg-indigo-700 text-white"
    )}>
       <p className="text-[10px] font-bold text-center leading-tight mb-0.5">{isPrivate ? `Reserva Pista (4/4)` : `Partida (${bookedPlayers.length}/4)`}</p>
       <div className="flex flex-wrap items-center justify-center -space-x-2">
            {Array.from({ length: 4 }).map((_, index) => {
                const player = bookedPlayers[index];
                if (player) {
                    const student = getPlayerDetails(player.userId);
                    return (
                         <TooltipProvider key={player.userId} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5 border-2 border-white dark:border-gray-800">
                                    <AvatarImage src={student.profilePictureUrl} alt={student.name || 'avatar'} data-ai-hint="student avatar tiny"/>
                                    <AvatarFallback className="text-[7px]">{getInitials(student.name || '')}</AvatarFallback>
                                </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs p-1">
                                <p>{student.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )
                }
                return (
                     <Avatar key={`empty-${index}`} className="h-5 w-5 border-2 border-white/50 bg-white/20">
                        <AvatarFallback className="bg-transparent"></AvatarFallback>
                    </Avatar>
                )
            })}
        </div>
    </div>
  );
};

export default MatchInscriptionVisualizer;

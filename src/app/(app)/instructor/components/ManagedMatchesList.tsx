// src/app/(app)/instructor/components/ManagedMatchesList.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Clock, Users, CalendarX, Loader2, BarChart, Euro } from 'lucide-react';
import { format, isSameDay, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import MatchGameCard from '@/components/match/MatchGameCard';
import type { User } from '@/types';
import MatchGameCard from '@/components/match/MatchGameCard';
import type { User } from '@/types';

interface ManagedMatchesListProps {
  instructorId: string;
}

interface MatchGame {
  id: string;
  start: number | string;
  end: number | string;
  courtNumber: number;
  level: string;
  category: string;
  totalPrice: number;
  maxPlayers: number;
  bookings?: any[];
  clubId: string;
}

const ManagedMatchesList: React.FC<ManagedMatchesListProps> = ({ instructorId }) => {
  const [matches, setMatches] = useState<MatchGame[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { toast } = useToast();

  // Cargar usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/users/current', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user || null);
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const dateStripDates = useMemo(() => {
    const todayAnchor = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => addDays(todayAnchor, i));
  }, []);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Cargar partidas del instructor desde el API
        const response = await fetch(`/api/matchgames?instructorId=${instructorId}&date=${dateStr}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch match games');
        }
        
        const result = await response.json();
        let fetchedMatches = result.matches || result.matchGames || result || [];
        
        // Sort by start time
        fetchedMatches.sort((a: MatchGame, b: MatchGame) => {
          const aStart = typeof a.start === 'number' ? a.start : new Date(a.start).getTime();
          const bStart = typeof b.start === 'number' ? b.start : new Date(b.start).getTime();
          return aStart - bStart;
        });
        
        setMatches(fetchedMatches);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch instructor match games:", err);
        setError("No se pudieron cargar tus partidas. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    loadMatches();
  }, [instructorId, refreshKey, selectedDate]);

  const handleCancelMatch = async (matchId: string) => {
    setProcessingAction(matchId);
    try {
      const response = await fetch(`/api/admin/matchgames/${matchId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel match');
      }
      
      toast({
        title: 'Partida Cancelada',
        description: 'La partida ha sido cancelada y los jugadores reembolsados.',
        className: 'bg-green-500 text-white',
      });
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error canceling match:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la partida. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchDate = new Date(typeof match.start === 'number' ? match.start : match.start);
    return isSameDay(matchDate, selectedDate);
  });

  const upcomingMatches = filteredMatches.filter(match => {
    const matchDate = new Date(typeof match.start === 'number' ? match.start : match.start);
    return matchDate.getTime() >= Date.now();
  });

  const pastMatches = filteredMatches.filter(match => {
    const matchDate = new Date(typeof match.start === 'number' ? match.start : match.start);
    return matchDate.getTime() < Date.now();
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => setRefreshKey(prev => prev + 1)} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Strip */}
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-white p-2">
        <div className="flex gap-2">
          {dateStripDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex min-w-[80px] flex-col items-center rounded-lg p-3 transition-all hover:bg-gray-100",
                  isSelected && "bg-green-500 text-white hover:bg-green-600",
                  isToday && !isSelected && "border-2 border-green-500"
                )}
              >
                <span className="text-xs font-semibold uppercase">
                  {format(date, 'EEE', { locale: es })}
                </span>
                <span className="text-2xl font-bold">
                  {format(date, 'd')}
                </span>
                <span className="text-xs">
                  {format(date, 'MMM', { locale: es })}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Partidas</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMatches.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jugadores Confirmados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingMatches.reduce((acc, match) => acc + (match.bookings?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Potenciales</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{upcomingMatches.reduce((acc, match) => {
                const bookingsCount = match.bookings?.length || 0;
                const pricePerPlayer = match.totalPrice / match.maxPlayers;
                return acc + (pricePerPlayer * bookingsCount);
              }, 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : upcomingMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Trophy className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700">No hay partidas programadas</p>
            <p className="text-sm text-gray-500 mt-1">
              Crea una nueva partida usando el formulario de arriba
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Próximas Partidas ({upcomingMatches.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingMatches.map((match) => {
              // Convertir formato de match a matchGame para MatchGameCard
              const matchGame = {
                id: match.id,
                clubId: match.clubId,
                start: typeof match.start === 'number' ? new Date(match.start).toISOString() : match.start,
                end: typeof match.end === 'number' ? new Date(match.end).toISOString() : match.end,
                duration: 90, // Asumiendo 90 minutos por defecto
                maxPlayers: match.maxPlayers || 4,
                pricePerPlayer: match.totalPrice / (match.maxPlayers || 4),
                courtNumber: match.courtNumber,
                level: match.level,
                genderCategory: match.category,
                isOpen: false,
                bookings: match.bookings || []
              };

              return (
                <MatchGameCard
                  key={match.id}
                  matchGame={matchGame}
                  currentUser={currentUser}
                  onBookingSuccess={() => setRefreshKey(prev => prev + 1)}
                  showLeaveButton={false}
                  showPrivateBookingButton={false}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Past Matches */}
      {pastMatches.length > 0 && (
        <div className="space-y-4 opacity-60">
          <h3 className="text-lg font-semibold">Partidas Pasadas ({pastMatches.length})</h3>
          {pastMatches.map((match) => {
            const matchStart = new Date(typeof match.start === 'number' ? match.start : match.start);
            const bookingsCount = match.bookings?.length || 0;
            const maxPlayers = match.maxPlayers || 4;

            return (
              <Card key={match.id} className="border-gray-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-gray-400" />
                      Pista {match.courtNumber} - {format(matchStart, "HH:mm", { locale: es })}
                    </CardTitle>
                    <Badge variant="secondary">Finalizada</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {bookingsCount}/{maxPlayers} jugadores
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagedMatchesList;

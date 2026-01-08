"use client";

import React, { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import type { Match } from '@/types';
import { fetchMatches, removePlayerFromMatch } from '@/lib/mockData';
import MatchAdminCard from './MatchAdminCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startOfDay, isSameDay, addDays } from 'date-fns';
import DateNavigation from './DateNavigation';

interface ManageMatchesPanelProps {
  clubId: string;
}

const ManageMatchesPanel: React.FC<ManageMatchesPanelProps> = ({ clubId }) => {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState<{ type: 'cancelMatch' | 'removePlayer'; entityId: string } | null>(null);
  const [isProcessing, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  const dateStripDates = useMemo(() => {
    const todayAnchor = startOfDay(new Date());
    return Array.from({ length: 15 }, (_, i) => addDays(todayAnchor, i));
  }, []);

  const loadAndFilterMatches = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedMatches = await fetchMatches(clubId);
      const now = new Date();
      // Filter for future matches first
      const futureMatches = fetchedMatches
        .filter(match => new Date(match.endTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setAllMatches(futureMatches);
      
      // Then filter by date
      const dateFiltered = futureMatches.filter(match => isSameDay(new Date(match.startTime), selectedDate));
      setFilteredMatches(dateFiltered);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching matches for admin panel:", err);
      setError("No se pudieron cargar las partidas del club.");
    } finally {
      setLoading(false);
    }
  }, [clubId, selectedDate]);

  useEffect(() => {
    loadAndFilterMatches();
  }, [loadAndFilterMatches, refreshKey]);

  const handleCancelMatch = (matchId: string) => {
    setProcessingAction({ type: 'cancelMatch', entityId: matchId });
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/matchgames/${matchId}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
          toast({ 
            title: "Error al Cancelar Partida", 
            description: result.error || 'Error desconocido', 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Partida Cancelada", 
            description: result.message || 'Partida eliminada correctamente', 
            className: "bg-accent text-accent-foreground", 
            duration: 5000 
          });
          setRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error al cancelar partida:', error);
        toast({ 
          title: "Error de Conexión", 
          description: "No se pudo conectar con el servidor", 
          variant: "destructive" 
        });
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handleRemovePlayer = (matchId: string, playerId: string) => {
    setProcessingAction({ type: 'removePlayer', entityId: playerId });
    startTransition(async () => {
      const result = await removePlayerFromMatch(matchId, playerId);
      if ('error' in result) {
        toast({ title: "Error al Eliminar Jugador", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Jugador Eliminado", description: result.message, className: "bg-primary text-primary-foreground", duration: 5000 });
        setRefreshKey(prev => prev + 1);
      }
      setProcessingAction(null);
    });
  };

  const isProcessingThisAction = (type: 'cancelMatch' | 'removePlayer', entityId: string): boolean => {
    return processingAction?.type === type && processingAction?.entityId === entityId && isProcessing;
  };

  if (loading && !filteredMatches.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" /> Gestionar Partidas</CardTitle>
          <CardDescription>Cargando partidas...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive"><Trophy className="mr-2 h-5 w-5" /> Gestionar Partidas</CardTitle>
        </CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" /> Gestionar Partidas Activas</CardTitle>
        <CardDescription>Visualiza y administra las partidas abiertas o en curso de tu club. Las partidas finalizadas no se muestran aquí.</CardDescription>
        <div className="pt-4">
          <DateNavigation
            currentDate={selectedDate}
            setCurrentDate={setSelectedDate}
            dateStripDates={dateStripDates}
            isToday={(d) => isSameDay(d, startOfDay(new Date()))}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="flex items-center justify-center h-60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : filteredMatches.length === 0 ? (
          <p className="text-muted-foreground italic text-center py-6">No hay partidas activas para gestionar en el día seleccionado.</p>
        ) : (
          <ScrollArea className="h-[600px] pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map(match => (
                <MatchAdminCard
                  key={match.id}
                  match={match}
                  currentAdminClubId={clubId}
                  onCancelMatch={handleCancelMatch}
                  onRemovePlayer={handleRemovePlayer}
                  isProcessingActionForMatch={isProcessingThisAction}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ManageMatchesPanel;

    
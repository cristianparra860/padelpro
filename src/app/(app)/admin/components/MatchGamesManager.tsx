'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DateSelector from '@/components/admin/DateSelector';
import {
  Trophy,
  Plus,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MatchGameCard from '@/components/match/MatchGameCard';

interface MatchGameBooking {
  id: string;
  userId: string;
  status: string;
  name?: string;
  profilePictureUrl?: string;
  userLevel?: string;
  userGender?: string;
}

interface MatchGame {
  id: string;
  start: string;
  end: string;
  duration: number;
  maxPlayers: number;
  pricePerPlayer: number;
  courtNumber?: number;
  level?: string;
  genderCategory?: string;
  isOpen: boolean;
  bookings: MatchGameBooking[];
}

interface MatchGamesManagerProps {
  clubId: string;
}

export default function MatchGamesManager({ clubId }: MatchGamesManagerProps) {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Cargar usuario actual
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
      }
    };

    loadUser();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/matchgames?clubId=${clubId}&date=${dateStr}`);
      const data = await response.json();

      if (response.ok) {
        setMatches(data.matchGames || []);
      } else {
        throw new Error(data.error || 'Error al cargar partidas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las partidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedDate, clubId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-500" />
            Gestión de Partidas
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Administra las partidas de 4 jugadores del club
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={loadMatches} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => window.location.href = '/admin/matchgames/create'} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Partida
          </Button>
        </div>
      </div>

      {/* Calendario Lineal */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">Seleccionar Fecha</h3>
          </div>
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            daysToShow={14}
          />
        </CardContent>
      </Card>

      {/* Lista de partidas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay partidas</h3>
            <p className="text-gray-600 text-sm mb-4">
              No hay partidas programadas para esta fecha
            </p>
            <Button onClick={() => window.location.href = `/admin/matchgames/create?date=${format(selectedDate, 'yyyy-MM-dd')}`}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(match => (
            <MatchGameCard
              key={match.id}
              matchGame={match}
              currentUser={currentUser}
              onBookingSuccess={loadMatches}
              showLeaveButton={false}
              showPrivateBookingButton={false}
              showAdminCancelButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

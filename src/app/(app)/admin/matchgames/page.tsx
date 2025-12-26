'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Users, 
  Clock, 
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MatchGameBooking {
  id: string;
  userId: string;
  status: string;
  user: {
    name: string;
    level: string;
    profilePictureUrl?: string;
  };
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

export default function AdminMatchGamesPage() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadMatches = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/matchgames?clubId=club-1&date=${dateStr}`);
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
  }, [selectedDate]);

  const handleDelete = async (matchId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta partida? Se devolverán los créditos a los jugadores inscritos.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/matchgames/${matchId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Partida eliminada correctamente"
        });
        loadMatches();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la partida",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (match: MatchGame) => {
    const bookingsCount = match.bookings.filter(b => b.status !== 'CANCELLED').length;
    
    if (match.courtNumber) {
      return <Badge className="bg-green-500">Pista {match.courtNumber} Asignada</Badge>;
    } else if (bookingsCount === match.maxPlayers) {
      return <Badge className="bg-yellow-500">Completa - Sin Pista</Badge>;
    } else if (bookingsCount > 0) {
      return <Badge className="bg-blue-500">{bookingsCount}/{match.maxPlayers} Jugadores</Badge>;
    } else {
      return <Badge variant="outline">Vacía</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-purple-500" />
              Gestión de Partidas
            </h1>
            <p className="text-gray-600 mt-2">
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

        {/* Selector de fecha */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setSelectedDate(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setSelectedDate(new Date(Date.now() + 86400000))}
          >
            Mañana
          </Button>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border rounded-md"
          />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Partidas</p>
                  <p className="text-2xl font-bold">{matches.length}</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Jugadores</p>
                  <p className="text-2xl font-bold">
                    {matches.filter(m => m.bookings.filter(b => b.status !== 'CANCELLED').length > 0).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completas</p>
                  <p className="text-2xl font-bold">
                    {matches.filter(m => m.bookings.filter(b => b.status !== 'CANCELLED').length === m.maxPlayers).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pistas Asignadas</p>
                  <p className="text-2xl font-bold">
                    {matches.filter(m => m.courtNumber !== null).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            <Button onClick={() => window.location.href = '/admin/matchgames/create'}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map(match => {
            const activeBookings = match.bookings.filter(b => b.status !== 'CANCELLED');
            
            return (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span className="text-lg font-semibold">
                          {format(new Date(match.start), "HH:mm", { locale: es })}
                        </span>
                        <Badge variant="outline">
                          {match.duration} min
                        </Badge>
                        {getStatusBadge(match)}
                        {match.isOpen ? (
                          <Badge variant="outline" className="bg-purple-50">Abierta</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50">
                            Nivel {match.level}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Precio/Jugador</p>
                          <p className="font-semibold">{match.pricePerPlayer}€</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Jugadores</p>
                          <p className="font-semibold">{activeBookings.length}/{match.maxPlayers}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Categoría</p>
                          <p className="font-semibold capitalize">
                            {match.genderCategory || 'Por definir'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pista</p>
                          <p className="font-semibold">
                            {match.courtNumber || 'Sin asignar'}
                          </p>
                        </div>
                      </div>
                      
                      {activeBookings.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-semibold mb-2">Jugadores inscritos:</p>
                          <div className="flex flex-wrap gap-2">
                            {activeBookings.map(booking => (
                              <Badge key={booking.id} variant="outline" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.user.name} (Nivel {booking.user.level})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleDelete(match.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

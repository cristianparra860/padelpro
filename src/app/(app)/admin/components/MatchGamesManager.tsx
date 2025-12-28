'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayName = format(date, 'EEE', { locale: es });
              const dayNumber = format(date, 'd');
              const monthName = format(date, 'MMM', { locale: es });
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    flex flex-col items-center justify-center min-w-[50px] p-1.5 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-purple-500 bg-purple-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-purple-700' : 'text-gray-500'}`}>
                    {dayName}
                  </span>
                  <span className={`text-xl font-bold ${isSelected ? 'text-purple-600' : 'text-gray-800'}`}>
                    {dayNumber}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>
                    {monthName}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold text-purple-600 mt-0.5">HOY</span>
                  )}
                </button>
              );
            })}
          </div>
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
            <Button onClick={() => window.location.href = '/admin/matchgames/create'}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Partida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(match => {
            const activeBookings = match.bookings.filter(b => b.status !== 'CANCELLED');
            
            // Helper para obtener iniciales
            const getInitials = (name: string) => {
              if (!name) return '??';
              const parts = name.split(' ');
              if (parts.length >= 2) {
                return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
              }
              return name.substring(0, 2).toUpperCase();
            };

            // Level info - obtener del primer jugador inscrito
            let levelText = 'Abierto';
            let levelColor = 'bg-gray-100 text-gray-600';
            if (activeBookings.length > 0) {
              const firstPlayer = activeBookings[0];
              const playerLevel = firstPlayer?.userLevel;
              if (playerLevel) {
                const numLevel = parseFloat(playerLevel);
                if (!isNaN(numLevel)) {
                  levelColor = 'bg-blue-100 text-blue-700';
                  if (numLevel < 1.5) levelText = '0.0 - 1.5';
                  else if (numLevel < 2.5) levelText = '1.5 - 2.5';
                  else if (numLevel < 3.5) levelText = '2.5 - 3.5';
                  else if (numLevel < 4.5) levelText = '3.5 - 4.5';
                  else if (numLevel < 5.5) levelText = '4.5 - 5.5';
                  else levelText = '5.5 - 7.0';
                }
              }
            }
            
            // Category info - obtener del primer jugador inscrito
            let categoryText = 'Abierta';
            let categoryColor = 'bg-gray-100 text-gray-600';
            
            // Primero intentar obtener del match.genderCategory
            if (match.genderCategory) {
              categoryColor = 'bg-purple-100 text-purple-700';
              if (match.genderCategory === 'masculino') categoryText = 'Chicos';
              else if (match.genderCategory === 'femenino') categoryText = 'Chicas';
              else categoryText = 'Mixta';
            } 
            // Si no está asignada en el match, calcular del primer jugador
            else if (activeBookings.length > 0) {
              const firstPlayer = activeBookings[0];
              const playerGender = firstPlayer?.userGender;
              
              if (playerGender) {
                categoryColor = 'bg-purple-100 text-purple-700';
                if (playerGender === 'masculino') categoryText = 'Chicos';
                else if (playerGender === 'femenino') categoryText = 'Chicas';
                else categoryText = 'Mixta';
              }
            }
            
            return (
              <Card key={match.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-white border-2 border-gray-200 rounded-2xl relative">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-white" />
                    </div>
                    <Button
                      onClick={() => handleDelete(match.id)}
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 bg-white hover:bg-red-50 text-red-600 border-white hover:border-red-200"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>

                <div className="p-2.5">
                  {/* Nivel / Categoría / Pista */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-sm text-gray-600 border-b border-gray-100 pb-2 mb-2">
                    <div>
                      <div className="font-medium text-gray-900 text-[10px]">Nivel</div>
                      <div className={`capitalize px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${levelColor}`}>
                        {levelText}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-[10px]">Cat.</div>
                      <div className={`capitalize px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${categoryColor}`}>
                        {categoryText}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-[10px]">Pista</div>
                      <div className={`px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                        match.courtNumber ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {match.courtNumber ? `#${match.courtNumber}` : '---'}
                      </div>
                    </div>
                  </div>

                  {/* Fecha y hora */}
                  <div className="bg-gray-50 rounded-xl p-2 border border-gray-200 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-[1.5rem] font-black text-gray-900 leading-none min-w-[2.5rem] text-center">
                          {format(new Date(match.start), 'dd', { locale: es })}
                        </div>
                        <div className="flex flex-col justify-center gap-0.5">
                          <div className="text-xs font-bold text-gray-900 uppercase tracking-tight leading-none">
                            {format(new Date(match.start), 'EEEE', { locale: es })}
                          </div>
                          <div className="text-[10px] font-normal text-gray-500 capitalize leading-none">
                            {format(new Date(match.start), 'MMMM', { locale: es })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900 leading-none">
                            {format(new Date(match.start), "HH:mm", { locale: es })}
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{match.duration} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jugadores */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-900">
                          Jugadores
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-bold text-gray-900">
                          € {match.pricePerPlayer.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center items-center gap-3 py-1.5">
                      {[0, 1, 2, 3].map((index) => {
                        const booking = activeBookings[index];
                        const isOccupied = !!booking;
                        const userName = booking?.name || 'Disponible';
                        const userProfilePic = booking?.profilePictureUrl;

                        return (
                          <div key={index} className="flex flex-col items-center gap-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold transition-all border-2 overflow-hidden ${
                              isOccupied 
                                ? "bg-white border-gray-300 shadow-[inset_0_4px_8px_rgba(0,0,0,0.2)] cursor-default" 
                                : "bg-gray-100 border-gray-300 text-gray-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"
                            }`}>
                              {isOccupied ? (
                                userProfilePic ? (
                                  <img 
                                    src={userProfilePic} 
                                    alt={userName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {getInitials(userName)}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-2xl">+</span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium leading-none text-center max-w-[60px] truncate">
                              {isOccupied ? (
                                <span className="text-gray-700">{userName.split(' ')[0]}</span>
                              ) : (
                                <span className="text-gray-400">Libre</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Disponibilidad de pistas */}
                  <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100 mt-2">
                    <div className="text-center">
                      {match.courtNumber ? (
                        <>
                          <div className="text-[10px] text-gray-500 text-center mb-1">Pista asignada:</div>
                          <div className="flex items-center justify-center gap-1">
                            <div className="flex flex-col items-center">
                              <svg 
                                className="shadow-inner-custom" 
                                width="19" 
                                height="32" 
                                viewBox="0 0 40 60" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <defs>
                                  <filter id={`innerShadow-assigned-${match.id}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                                    <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                                    <feFlood floodColor="#000000" floodOpacity="0.25" result="offsetColor"/>
                                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
                                    <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
                                  </filter>
                                </defs>
                                <rect x="2" y="2" width="36" height="56" rx="4" fill="#10B981" stroke="#059669" strokeWidth="2" filter={`url(#innerShadow-assigned-${match.id})`}/>
                                <line x1="20" y1="2" x2="20" y2="58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                                <line x1="2" y1="30" x2="38" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                              </svg>
                              <div className="text-green-600 font-semibold text-[9px] leading-none mt-0.5">
                                PISTA {match.courtNumber}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-gray-500 text-center">
                          Pista pendiente de asignación
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

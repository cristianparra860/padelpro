'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, MapPin, Trophy, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MatchGameCard from '@/components/match/MatchGameCard';
import type { User as UserType } from '@/types';

interface MatchGameBooking {
  id: string;
  userId: string;
  status: string;
  user: {
    id: string;
    name: string;
    level: string;
    gender?: string;
    profilePictureUrl?: string;
  };
}

interface MatchGame {
  id: string;
  clubId: string;
  courtNumber?: number;
  start: string;
  end: string;
  duration: number;
  maxPlayers: number;
  pricePerPlayer: number;
  level?: string;
  genderCategory?: string;
  isOpen: boolean;
  bookings: MatchGameBooking[];
}

export default function MatchGamesPage() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Obtener usuario actual
    fetch('/api/users/current')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

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

  const filteredMatches = matches.filter(match => {
    if (activeTab === 'all') return true;
    if (activeTab === 'available') return match.bookings.length < match.maxPlayers;
    if (activeTab === 'myMatches') return match.bookings.some(b => b.userId === currentUser?.id);
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-orange-500" />
              Partidas 4 Jugadores
            </h1>
            <p className="text-gray-600 mt-2">
              Únete a partidas o completa tu grupo de 4 jugadores
            </p>
          </div>
          
          <Button onClick={loadMatches} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Selector de fecha */}
        <div className="flex gap-2 mb-4">
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
        </div>

        {/* Tabs para filtrar */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="available">Disponibles</TabsTrigger>
            <TabsTrigger value="myMatches">Mis Partidas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de partidas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay partidas disponibles</h3>
            <p className="text-gray-600 text-sm">
              {activeTab === 'myMatches' 
                ? 'No estás inscrito en ninguna partida para esta fecha'
                : 'No hay partidas programadas para esta fecha'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredMatches.map(match => (
            <MatchGameCard
              key={match.id}
              matchGame={match}
              currentUser={currentUser}
              onBookingSuccess={loadMatches}
            />
          ))}
        </div>
      )}
    </div>
  );
}

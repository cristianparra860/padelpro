// src/components/class/InstructorCreditsManager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gift, Search, Calendar, Clock, Users, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeSlotOption {
  id: string;
  start: string;
  end: string;
  instructorName: string;
  maxPlayers: number;
  bookings: any[];
  creditsSlots?: number[];
  creditsCost?: number;
}

export default function InstructorCreditsManager({ instructorId }: { instructorId: string }) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<TimeSlotOption[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSlots();
  }, [instructorId]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      // Cargar propuestas del instructor con límite alto para obtener todas las futuras
      // Usar limit=100 para asegurar que obtenemos suficientes propuestas futuras
      const response = await fetch(`/api/timeslots?instructorId=${instructorId}&limit=100`);
      const data = await response.json();
      
      console.log('📊 Datos recibidos del API:', data);
      
      // El API puede devolver un array directo o { slots: [...] } con paginación
      const allSlots = Array.isArray(data) ? data : (data.slots || data.timeSlots || []);
      
      console.log('📊 Total de slots:', allSlots.length);
      
      // Filtrar solo propuestas futuras SIN courtId (modificables)
      const futureProposals = allSlots.filter((slot: any) => {
        const slotDate = new Date(slot.start);
        const now = new Date();
        const isFuture = slotDate > now;
        const isProposal = !slot.courtId || slot.courtId === null; // Solo propuestas
        return isFuture && isProposal;
      });
      
      console.log('✅ Propuestas futuras (modificables):', futureProposals.length);
      
      setSlots(futureProposals);
      setFilteredSlots(futureProposals);
    } catch (error) {
      console.error('❌ Error cargando clases:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las clases',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = [...slots];
    
    if (searchDate) {
      filtered = filtered.filter(slot => {
        const slotDate = format(parseISO(slot.start), 'yyyy-MM-dd');
        return slotDate === searchDate;
      });
    }
    
    if (searchTime) {
      filtered = filtered.filter(slot => {
        const slotTime = format(parseISO(slot.start), 'HH:mm');
        return slotTime.includes(searchTime);
      });
    }
    
    setFilteredSlots(filtered);
  };

  const toggleCreditsSlot = async (slotId: string, modalitySize: number, currentCreditsSlots: number[]) => {
    console.log('🔥 toggleCreditsSlot CALLED', { slotId, modalitySize, currentCreditsSlots });
    setUpdating(`${slotId}-${modalitySize}`);
    
    try {
      const isActive = currentCreditsSlots.includes(modalitySize);
      const action = isActive ? 'remove' : 'add';
      
      console.log('📤 Sending PATCH request', { slotId, modalitySize, action });
      
      const response = await fetch(`/api/timeslots/${slotId}/credits-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: modalitySize, action })
      });
      
      console.log('📥 Response received', { ok: response.ok, status: response.status });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Error al actualizar');
      }
      
      toast({
        title: action === 'add' ? '✅ Plaza Activada con Puntos' : '❌ Plaza Desactivada',
        description: `Clase de ${modalitySize} jugador${modalitySize > 1 ? 'es' : ''} ${action === 'add' ? 'ahora usa puntos' : 'vuelve a pago normal'}`,
        className: action === 'add' ? 'bg-green-600 text-white' : ''
      });
      
      // Recargar slots
      await loadSlots();
      handleSearch();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la plaza',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Gestor de Plazas con Puntos</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadSlots}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        <p className="text-blue-100 text-sm mb-2">
          Busca y activa plazas específicas para que tus alumnos reserven con puntos
        </p>
        <div className="bg-blue-700/30 rounded-lg p-3 mb-3 border border-blue-400/30">
          <p className="text-xs text-blue-50 flex items-start gap-2">
            <span className="text-lg">🎯</span>
            <span><strong>Regla importante:</strong> Solo puedes activar puntos en la <strong>última plaza</strong> que completa el grupo (cuando falte exactamente 1 reserva). Para grupos de 1 jugador siempre puedes activar.</span>
          </p>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Total: {slots.length} clases futuras</span>
          </div>
          {(searchDate || searchTime) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span>Filtradas: {filteredSlots.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-lg border-2 border-amber-200 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-6 w-6 text-amber-600" />
          <h3 className="font-bold text-xl text-gray-800">🔍 Buscar Clases Específicas</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Ejemplo: Busca "Lunes 8 de diciembre" a las "09:00" para activar plazas específicas de esa clase
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por fecha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              📅 Fecha (día específico)
            </label>
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              placeholder="Selecciona fecha"
              className="border-2 border-blue-300 focus:border-blue-500"
            />
            {searchDate && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {format(parseISO(searchDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
              </p>
            )}
          </div>
          
          {/* Filtro por hora */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              🕐 Hora (horario específico)
            </label>
            <Input
              type="time"
              value={searchTime}
              onChange={(e) => setSearchTime(e.target.value)}
              placeholder="09:00"
              className="border-2 border-green-300 focus:border-green-500"
            />
            {searchTime && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                Clases que incluyan: {searchTime}
              </p>
            )}
          </div>
          
          {/* Botón buscar */}
          <div className="flex items-end">
            <Button 
              onClick={handleSearch}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11 shadow-lg"
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Clases
            </Button>
          </div>
        </div>
        
        {/* Botón limpiar filtros */}
        {(searchDate || searchTime) && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchDate('');
                setSearchTime('');
                setFilteredSlots(slots);
              }}
              className="text-gray-600 border-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros y mostrar todas las clases
            </Button>
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            Clases Encontradas ({filteredSlots.length})
          </h3>
          {searchDate && (
            <Badge variant="outline" className="text-sm">
              {format(parseISO(searchDate + 'T00:00:00'), 'EEEE d MMMM', { locale: es })}
            </Badge>
          )}
        </div>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No se encontraron clases</p>
            <p className="text-gray-500 text-sm mt-1">
              Intenta con otra fecha u horario
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot) => {
              const slotDate = parseISO(slot.start);
              const creditsSlots = slot.creditsSlots || [];
              
              return (
                <div
                  key={slot.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all"
                >
                  {/* Header compacto */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-500">
                        {format(slotDate, "EEE d MMM", { locale: es })}
                      </p>
                      {creditsSlots.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0">
                          {creditsSlots.length} 🎁
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {format(slotDate, 'HH:mm')}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {slot.instructorName}
                    </p>
                  </div>

                  {/* Grid 2x2 de modalidades */}
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((modalitySize) => {
                      const isActive = creditsSlots.includes(modalitySize);
                      const isUpdating = updating === `${slot.id}-${modalitySize}`;
                      
                      // Calcular inscripciones actuales
                      const bookings = slot.bookings?.filter(
                        (b: any) => b.groupSize === modalitySize && b.status !== 'CANCELLED'
                      ) || [];
                      const filledSpots = bookings.length;
                      const freeSpots = modalitySize - filledSpots;
                      
                      // 🎯 NUEVA VALIDACIÓN: Solo permitir activar si falta exactamente 1 plaza
                      const canActivate = modalitySize === 1 || freeSpots === 1;
                      const isDisabled = !canActivate && !isActive; // Deshabilitar si no se puede activar (excepto si ya está activo para poder desactivar)
                      const disabledReason = !canActivate && freeSpots > 1 
                        ? `Faltan ${freeSpots} plazas. Solo puedes activar puntos cuando falte 1 plaza.`
                        : freeSpots === 0 
                        ? 'Clase completa. No puedes activar puntos.'
                        : '';
                      
                      return (
                        <button
                          key={modalitySize}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🖱️ Button clicked!', { modalitySize, isDisabled, isUpdating });
                            if (!isDisabled && !isUpdating) {
                              toggleCreditsSlot(slot.id, modalitySize, creditsSlots);
                            } else {
                              console.warn('⚠️ Button disabled or updating', { isDisabled, isUpdating, disabledReason });
                            }
                          }}
                          disabled={isUpdating || isDisabled}
                          title={isDisabled ? disabledReason : isActive ? 'Click para desactivar' : 'Click para activar puntos'}
                          className={`
                            relative p-2.5 rounded-lg border-2 transition-all
                            ${isActive
                              ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 border-amber-500 text-white shadow-md'
                              : isDisabled
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50'
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {isActive && (
                            <Gift className="absolute top-1 right-1 h-3 w-3" />
                          )}
                          <div className="flex items-center gap-1 mb-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <p className="text-lg font-bold leading-none">{modalitySize}</p>
                          </div>
                          
                          {/* Círculos de jugadores */}
                          <div className="flex gap-0.5 mb-1.5">
                            {Array.from({ length: modalitySize }).map((_, i) => (
                              <div
                                key={i}
                                className={`
                                  w-3 h-3 rounded-full border-2
                                  ${i < filledSpots
                                    ? isActive 
                                      ? 'bg-white border-white' 
                                      : 'bg-green-500 border-green-600'
                                    : isActive
                                      ? 'bg-transparent border-white'
                                      : 'bg-transparent border-gray-400'
                                  }
                                `}
                              />
                            ))}
                          </div>
                          
                          <p className="text-[9px] opacity-90 font-medium">
                            {freeSpots > 0 
                              ? freeSpots === 1 && !isActive
                                ? '🎯 1 libre' // Última plaza - puede activar
                                : `${freeSpots} ${freeSpots === 1 ? 'libre' : 'libres'}`
                              : 'Completa'
                            }
                          </p>
                          
                          {/* Indicador visual para última plaza */}
                          {freeSpots === 1 && !isActive && modalitySize > 1 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" 
                                 title="✅ Última plaza - Puedes activar puntos" />
                          )}
                          
                          {isUpdating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Gift className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">💡 Cómo funciona:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Activar Puntos:</strong> Los alumnos verán esta plaza en dorado y podrán reservar con 50 puntos</li>
              <li>• <strong>Desactivar:</strong> La plaza vuelve a pago normal con créditos</li>
              <li>• <strong>Puedes activar</strong> una, varias o todas las modalidades de una clase</li>
              <li>• <strong>Los cambios</strong> se aplican inmediatamente para nuevas reservas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

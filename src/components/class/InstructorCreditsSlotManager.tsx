// src/components/class/InstructorCreditsSlotManager.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, X, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InstructorCreditsSlotManagerProps {
  timeSlotId: string;
  maxPlayers: number;
  bookings: any[];
  creditsSlots?: number[];
  creditsCost?: number;
  onUpdate?: () => void;
}

export default function InstructorCreditsSlotManager({
  timeSlotId,
  maxPlayers,
  bookings,
  creditsSlots = [],
  creditsCost = 50,
  onUpdate
}: InstructorCreditsSlotManagerProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const { toast } = useToast();

  const handleToggleCreditsSlot = async (modalitySize: number) => {
    setLoading(modalitySize);
    
    try {
      const isCurrentlyCreditsSlot = creditsSlots.includes(modalitySize);
      const action = isCurrentlyCreditsSlot ? 'remove' : 'add';

      const response = await fetch(`/api/timeslots/${timeSlotId}/credits-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: modalitySize, action, creditsCost })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar modalidad');
      }

      toast({
        title: action === 'add' ? '🎁 Modalidad con Puntos Activada' : '💰 Modalidad de Pago Restaurada',
        description: `Modalidad de ${modalitySize} jugador${modalitySize > 1 ? 'es' : ''}: ${action === 'add' ? `Ahora cuesta ${creditsCost} puntos` : 'Vuelve a pago normal'}`,
        className: action === 'add' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
      });

      // Refrescar datos
      if (onUpdate) onUpdate();

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  // Calcular cuántas reservas hay por modalidad
  const getModalityInfo = (modalitySize: number) => {
    const modalityBookings = bookings.filter(b => 
      (b.status === 'CONFIRMED' || b.status === 'PENDING') && 
      b.groupSize === modalitySize
    );
    
    const confirmedCount = modalityBookings.filter(b => b.status === 'CONFIRMED').length;
    const pendingCount = modalityBookings.filter(b => b.status === 'PENDING').length;
    const totalBookings = modalityBookings.length;
    const isComplete = totalBookings >= modalitySize;
    
    return {
      totalBookings,
      confirmedCount,
      pendingCount,
      isComplete,
      userNames: modalityBookings.map(b => b.name || b.userName || 'Usuario').slice(0, 3)
    };
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-sm text-gray-800">
            🎓 Panel Instructor: Modalidades con Puntos
          </h3>
        </div>
        <Badge variant="outline" className="bg-white text-xs">
          {creditsCost} pts
        </Badge>
      </div>

      <p className="text-xs text-gray-600 mb-4 flex items-start gap-2">
        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          Activa las modalidades que los alumnos podrán reservar con <strong>{creditsCost} puntos</strong> en lugar de pagar con créditos.
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((modalitySize) => {
          const info = getModalityInfo(modalitySize);
          const isCreditsSlot = creditsSlots.includes(modalitySize);
          const isLoading = loading === modalitySize;

          return (
            <div
              key={modalitySize}
              className={`
                relative p-3 rounded-lg border-2 transition-all
                ${isCreditsSlot 
                  ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-400 shadow-md' 
                  : 'bg-white border-gray-300'
                }
              `}
            >
              {/* Badge de estado */}
              {isCreditsSlot && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  {creditsCost}
                </div>
              )}

              {/* Header: Modalidad */}
              <div className="flex items-center gap-2 mb-2">
                <Users className={`h-4 w-4 ${isCreditsSlot ? 'text-amber-600' : 'text-gray-600'}`} />
                <span className={`font-semibold text-sm ${isCreditsSlot ? 'text-amber-800' : 'text-gray-800'}`}>
                  {modalitySize} {modalitySize === 1 ? 'Jugador' : 'Jugadores'}
                </span>
              </div>

              {/* Info de reservas */}
              <div className="mb-3 min-h-[40px]">
                {info.totalBookings > 0 ? (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">
                        {info.totalBookings}/{modalitySize} inscritos
                      </span>
                      {info.isComplete && (
                        <Badge className="text-[9px] px-1 py-0 bg-green-500">
                          Completa
                        </Badge>
                      )}
                    </div>
                    {info.userNames.length > 0 && (
                      <div className="text-[10px] text-gray-600">
                        {info.userNames.join(', ')}
                        {info.totalBookings > 3 && '...'}
                      </div>
                    )}
                    {info.confirmedCount > 0 && (
                      <div className="text-[10px] text-green-600 font-medium">
                        ✓ {info.confirmedCount} confirmad{info.confirmedCount > 1 ? 'os' : 'o'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Sin inscripciones
                  </div>
                )}
              </div>

              {/* Botón de toggle */}
              <Button
                size="sm"
                onClick={() => handleToggleCreditsSlot(modalitySize)}
                disabled={isLoading}
                className={`
                  w-full text-xs h-8
                  ${isCreditsSlot
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                  }
                `}
              >
                {isLoading ? (
                  <span>Guardando...</span>
                ) : isCreditsSlot ? (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Quitar Puntos
                  </>
                ) : (
                  <>
                    <Gift className="h-3 w-3 mr-1" />
                    Activar Puntos
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-3 border-t border-blue-200 flex items-start gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-yellow-400"></div>
          <span className="text-gray-700">Modalidad con puntos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white border-2 border-gray-300"></div>
          <span className="text-gray-700">Modalidad normal (pago)</span>
        </div>
      </div>
    </div>
  );
}

// src/components/user/CourtReservationCard.tsx
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, X, Trash2 } from 'lucide-react';

interface CourtReservationCardProps {
  reservation: any;
  onCancel?: (reservationId: string) => void;
  onHideFromHistory?: () => void; // 🗑️ Callback para ocultar del historial
  unlockedAmount?: number; // 🔓 Saldo desbloqueado
}

export default function CourtReservationCard({ reservation, onCancel, onHideFromHistory, unlockedAmount }: CourtReservationCardProps) {
  const startDate = new Date(reservation.start);
  const endDate = new Date(reservation.end);
  const isPast = endDate < new Date();

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: es });
  };

  return (
    <Card className="bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden w-full scale-100 md:scale-[0.88] relative transition-all duration-300 hover:shadow-xl">
      {/* Header con Badge de estado */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5">
        <div className="flex items-center justify-between">
          {/* Icono decorativo y duración */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-[10px] font-semibold">Reserva de Pista ({reservation.duration}min)</span>
          </div>

          {/* Badge de estado */}
          <Badge variant="outline" className={`h-6 text-[10px] px-2 border-white ${isPast
            ? 'bg-gray-600 text-white'
            : 'bg-green-600 text-white'
            }`}>
            {isPast ? 'Completada' : 'Confirmada'}
          </Badge>
        </div>
      </div>

      <div className="p-2.5">
        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-sm text-gray-600 border-b border-gray-100 pb-2 mb-2">
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Club</div>
            <div className="px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] bg-blue-100 text-blue-700">
              {reservation.clubName?.split(' ')[1] || 'Club'}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Pista</div>
            <div className="px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] bg-blue-100 text-blue-700">
              Pista {reservation.courtNumber}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Duración</div>
            <div className="px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] bg-purple-100 text-purple-700">
              {reservation.duration} min
            </div>
          </div>
        </div>

        {/* Time and Date */}
        <div className="bg-gray-50 rounded-xl p-2 border border-gray-200 mb-2">
          <div className="flex items-center justify-between">
            {/* Fecha - Izquierda */}
            <div className="flex items-center gap-2">
              {/* Número del día */}
              <div className="text-[1.5rem] font-black text-gray-900 leading-none min-w-[2.5rem] text-center">
                {format(startDate, 'dd', { locale: es })}
              </div>
              {/* Día y mes en texto */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-tight leading-none">
                  {format(startDate, 'EEEE', { locale: es })}
                </div>
                <div className="text-[10px] font-normal text-gray-500 capitalize leading-none">
                  {format(startDate, 'MMMM', { locale: es })}
                </div>
              </div>
            </div>

            {/* Hora y duración - Derecha */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900 leading-none">
                  {formatTime(startDate)}
                </div>
                <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatTime(startDate)} - {formatTime(endDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información de la reserva */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs font-semibold text-gray-900">
                Tu Reserva
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-base font-bold ${isPast ? 'text-gray-500' : 'text-green-600'}`}>
                {isPast ? 'Completada' : 'Activa'}
              </div>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">📍 Ubicación:</span>
                <span className="font-medium text-gray-900">{reservation.courtName || `Pista ${reservation.courtNumber}`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">🏢 Club:</span>
                <span className="font-medium text-gray-900">{reservation.clubName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">⏱️ Tiempo:</span>
                <span className="font-medium text-gray-900">{reservation.duration} minutos</span>
              </div>
            </div>
          </div>

        </div>

        {/* 🦶 Footer Unificado (Square Buttons) */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {/* Cancel Button (Red Square) */}
            {!isPast && onCancel && (
              <button
                onClick={() => onCancel(reservation.id)}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {/* Delete History Button (Gray Square) */}
            {onHideFromHistory && (
              <button
                onClick={onHideFromHistory}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                title="Borrar del historial"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Payment Info (Green Compact) */}
          <div className="flex items-center gap-2">
            {(reservation.price !== undefined && reservation.price > 0) && (
              <div className="h-9 px-3 flex items-center justify-center bg-green-50 rounded-lg border border-green-100 text-green-700" title="Pagado">
                <span className="text-xs font-medium mr-1">Pagado:</span>
                <span className="text-sm font-bold">{reservation.price.toFixed(2)}€</span>
              </div>
            )}
            {unlockedAmount !== undefined && unlockedAmount > 0 && (
              <div className="h-9 px-3 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100 text-blue-700" title="Saldo Desbloqueado">
                <span className="text-xs font-medium mr-1">Desbloqueado:</span>
                <span className="text-sm font-bold">{unlockedAmount.toFixed(2)}€</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

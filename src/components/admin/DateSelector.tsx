// src/components/admin/DateSelector.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserBooking {
  timeSlotId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  date: Date | string;
}

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysToShow?: number;
  userBookings?: UserBooking[]; // 🆕 Bookings del usuario para colorear días
}

export default function DateSelector({ 
  selectedDate, 
  onDateChange,
  daysToShow = 30,
  userBookings = [] // 🆕 Recibir bookings
}: DateSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Generar array de fechas (próximos 30 días desde hoy)
  const dates = Array.from({ length: daysToShow }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // 🆕 Función para obtener el estado de un día (inscripción o confirmado)
  const getDayBookingStatus = (date: Date): 'pending' | 'confirmed' | null => {
    if (!userBookings || userBookings.length === 0) return null;
    
    const dateStr = date.toDateString();
    
    // Verificar si hay algún booking para este día
    const dayBookings = userBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate.toDateString() === dateStr;
    });
    
    if (dayBookings.length === 0) return null;
    
    // Si hay alguno CONFIRMADO, el día es rojo
    const hasConfirmed = dayBookings.some(b => b.status === 'CONFIRMED');
    if (hasConfirmed) return 'confirmed';
    
    // Si solo hay PENDING, el día es azul
    const hasPending = dayBookings.some(b => b.status === 'PENDING');
    if (hasPending) return 'pending';
    
    return null;
  };

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateScrollButtons, 300);
    }
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date: Date) => {
    onDateChange(date);
  };

  return (
    <div className="relative w-full bg-white rounded-lg p-3">
      {/* Grid de fechas - ocupa todo el ancho */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date, index) => {
          const selected = isSelected(date);
          const today = isToday(date);
          const dayName = getDayName(date);
          const dayNumber = date.getDate();
          const monthName = getMonthName(date);
          const bookingStatus = getDayBookingStatus(date); // 🆕 Obtener estado del día

          // 🆕 Estilo armonizado: círculos blancos con borde verde
          let borderColor = 'border-gray-300';
          let shadowStyle = 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]';
          let textColor = 'text-gray-600';
          let dayTextColor = 'text-gray-900';
          
          if (selected) {
            borderColor = 'border-green-500';
            shadowStyle = 'shadow-[inset_0_2px_8px_rgba(34,197,94,0.3)]';
            textColor = 'text-green-600';
            dayTextColor = 'text-green-700';
          } else if (bookingStatus === 'confirmed') {
            // 🔴 DÍA CON RESERVA CONFIRMADA - borde rojo
            borderColor = 'border-red-400';
            shadowStyle = 'shadow-[inset_0_1px_4px_rgba(239,68,68,0.2)]';
            textColor = 'text-red-600';
            dayTextColor = 'text-red-700';
          } else if (bookingStatus === 'pending') {
            // 🔵 DÍA CON INSCRIPCIÓN PENDIENTE - borde azul
            borderColor = 'border-blue-400';
            shadowStyle = 'shadow-[inset_0_1px_4px_rgba(59,130,246,0.2)]';
            textColor = 'text-blue-600';
            dayTextColor = 'text-blue-700';
          } else if (today) {
            borderColor = 'border-blue-300';
            shadowStyle = 'shadow-[inset_0_1px_3px_rgba(59,130,246,0.15)]';
            textColor = 'text-blue-500';
            dayTextColor = 'text-blue-700';
          }

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`
                flex flex-col items-center justify-center min-w-[64px] rounded-full
                transition-all duration-200 cursor-pointer border-2 bg-white
                ${borderColor} ${shadowStyle}
                ${selected ? 'scale-110 ring-2 ring-green-200' : 'hover:scale-105'}
                relative px-3 py-2
              `}
            >
              {/* 🆕 Indicador visual en la esquina superior */}
              {!selected && bookingStatus && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  bookingStatus === 'confirmed' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
              )}

              {/* Día de la semana */}
              <span className={`text-[9px] font-bold uppercase ${textColor}`}>
                {dayName}
              </span>

              {/* Número del día - GRANDE */}
              <span className={`text-xl font-bold leading-tight ${dayTextColor}`}>
                {dayNumber}
              </span>

              {/* Mes */}
              <span className={`text-[8px] uppercase ${textColor}`}>
                {monthName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

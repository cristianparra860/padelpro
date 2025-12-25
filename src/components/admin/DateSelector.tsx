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
  layoutOrientation?: 'horizontal' | 'vertical'; // 🆕 Orientación del layout
}

export default function DateSelector({ 
  selectedDate, 
  onDateChange,
  daysToShow = 30,
  userBookings = [], // 🆕 Recibir bookings
  layoutOrientation = 'horizontal' // 🆕 Por defecto horizontal
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

  // 🐛 Debug: Log cuando cambien los userBookings
  React.useEffect(() => {
    console.log('📅 DateSelector - userBookings:', userBookings?.length || 0);
    if (userBookings && userBookings.length > 0) {
      console.log('📊 Sample bookings:', userBookings.slice(0, 3));
    }
  }, [userBookings]);

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
    <div className={`relative w-full rounded-lg py-2 md:py-3`}>
      {/* Grid de fechas - horizontal o vertical según orientación */}
      <div className={`flex ${layoutOrientation === 'vertical' ? 'flex-col space-y-2' : 'justify-between overflow-x-auto scrollbar-hide touch-pan-x'} py-2 px-4 md:px-1`}>
        {dates.map((date, index) => {
          const selected = isSelected(date);
          const today = isToday(date);
          const dayName = getDayName(date);
          const dayNumber = date.getDate();
          const monthName = getMonthName(date);
          const bookingStatus = getDayBookingStatus(date); // 🆕 Obtener estado del día

          // 🆕 Estilo armonizado con el panel de clases
          let borderColor = 'border-gray-300';
          let shadowStyle = 'shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]';
          let textColor = 'text-gray-500';
          let dayTextColor = 'text-gray-800';
          
          if (selected) {
            borderColor = 'border-green-500';
            shadowStyle = 'shadow-[inset_0_2px_8px_rgba(34,197,94,0.3)]';
            textColor = 'text-green-600';
            dayTextColor = 'text-green-700';
          } else if (today) {
            borderColor = 'border-blue-300';
            shadowStyle = 'shadow-[inset_0_1px_3px_rgba(59,130,246,0.15)]';
            textColor = 'text-blue-500';
            dayTextColor = 'text-blue-700';
          }

          return (
            <div key={index} className="flex flex-col items-center space-y-0.5 flex-shrink-0">
              <button
                onClick={() => handleDateClick(date)}
                className={`
                  flex flex-col items-center justify-center rounded-lg
                  transition-all duration-200 cursor-pointer border-2 bg-white
                  ${borderColor} ${shadowStyle}
                  ${selected 
                    ? layoutOrientation === 'vertical' 
                      ? 'w-[94px] h-[75px] scale-110 ring-2 ring-green-200' 
                      : 'w-[63px] h-[75px] scale-110 ring-2 ring-green-200'
                    : layoutOrientation === 'vertical'
                      ? 'w-[63px] h-[50px] hover:scale-105'
                      : 'w-[42px] h-[50px] hover:scale-105'
                  }
                `}
              >
                <span className={`${selected ? 'text-[13px]' : 'text-[9px]'} font-bold uppercase ${textColor}`}>
                  {dayName}
                </span>
                <span className={`${selected ? 'text-2xl' : 'text-lg'} font-bold leading-none ${dayTextColor}`}>
                  {dayNumber}
                </span>
                <span className={`${selected ? 'text-[11px]' : 'text-[8px]'} uppercase ${textColor}`}>
                  {monthName}
                </span>
              </button>

              <div className="h-4 w-full flex items-center justify-center">
                {bookingStatus && (
                  <button
                    className={`h-4 w-4 flex items-center justify-center text-white rounded-full font-bold text-[8px] leading-none shadow-sm transition-transform hover:scale-110 ${
                      bookingStatus === 'confirmed' 
                        ? 'bg-red-500' 
                        : 'bg-blue-500'
                    }`}
                  >
                    {bookingStatus === 'confirmed' ? 'R' : 'I'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

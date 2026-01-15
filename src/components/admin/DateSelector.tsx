// src/components/admin/DateSelector.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch - solo renderizar después de montar en cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // 💾 Guardar fecha seleccionada en localStorage
  const saveSelectedDate = (date: Date) => {
    try {
      localStorage.setItem('selectedCalendarDate', date.toISOString());
    } catch (error) {
      console.error('Error saving date to localStorage:', error);
    }
  };

  // Generar array de fechas (próximos X días desde hoy)
  // Usar useMemo para evitar regenerar en cada render y evitar hydration mismatch
  const dates = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0); // Normalizar hora para evitar diferencias
      return date;
    });
  }, [daysToShow]);

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
    today.setHours(0, 0, 0, 0);
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return date.toDateString() === selected.toDateString();
  };

  const handleDateClick = (date: Date) => {
    saveSelectedDate(date);
    onDateChange(date);
  };

  // Scroll automático al día seleccionado
  useEffect(() => {
    if (mounted && selectedDate) {
      const dateId = `date-${selectedDate.getDate()}-${selectedDate.getMonth()}`;
      const element = document.getElementById(dateId);

      if (element && scrollRef.current) {
        // Calcular posición para centrar el elemento
        const container = scrollRef.current;
        const scrollLeft = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [mounted, selectedDate, layoutOrientation]);

  return (
    <div className={`relative w-full rounded-lg py-2 md:py-3`}>
      {/* Botones de navegación rápida - Hoy y Mañana */}
      <div className="hidden absolute right-4 bottom-2 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            onDateChange(today);
          }}
          className="w-12 h-12 rounded-full bg-white border-2 border-blue-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center text-blue-600 font-bold text-sm"
          title="Ir a Hoy"
        >
          HOY
        </button>
        <button
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            onDateChange(tomorrow);
          }}
          className="w-12 h-12 rounded-full bg-white border-2 border-green-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center text-green-600 font-bold text-[10px] leading-tight"
          title="Ir a Mañana"
        >
          <span className="text-center">
            MAÑA<br />NA
          </span>
        </button>
      </div>

      {/* Grid de fechas - horizontal o vertical según orientación */}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className={`flex ${layoutOrientation === 'vertical' ? 'flex-col space-y-2' : 'justify-between overflow-x-auto scrollbar-hide touch-pan-x'} py-2 px-4 md:px-1 pr-20`}
      >
        {dates.map((date, index) => {
          const selected = isSelected(date);
          const today = isToday(date);
          const dayName = getDayName(date);
          const dayNumber = date.getDate();
          const monthName = getMonthName(date);
          const bookingStatus = getDayBookingStatus(date); // 🆕 Obtener estado del día

          // 🆕 Estilo armonizado con el panel de clases
          // Usar mounted para evitar mismatch entre servidor y cliente
          let borderColor = 'border-gray-300';
          let shadowStyle = 'shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]';
          let textColor = 'text-gray-500';
          let dayTextColor = 'text-gray-800';

          if (mounted && selected) {
            borderColor = 'border-green-500';
            shadowStyle = 'shadow-[inset_0_2px_8px_rgba(34,197,94,0.3)]';
            textColor = 'text-green-600';
            dayTextColor = 'text-green-700';
          } else if (mounted && today) {
            borderColor = 'border-blue-300';
            shadowStyle = 'shadow-[inset_0_1px_3px_rgba(59,130,246,0.15)]';
            textColor = 'text-blue-500';
            dayTextColor = 'text-blue-700';
          }

          return (
            <div
              key={index}
              id={`date-${date.getDate()}-${date.getMonth()}`}
              className="flex flex-col items-center space-y-0.5 flex-shrink-0"
            >
              <button
                onClick={() => handleDateClick(date)}
                className={`
                  flex flex-col items-center justify-center
                  transition-all duration-300 cursor-pointer border
                  ${mounted && selected
                    ? 'bg-gradient-to-b from-gray-900 to-black text-white border-black shadow-[0_8px_20px_rgba(0,0,0,0.3)] ring-2 ring-gray-200 ring-offset-2'
                    : 'bg-white text-gray-500 border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-gray-200'
                  }
                  ${layoutOrientation === 'vertical'
                    ? (mounted && selected ? 'w-full h-[70px] rounded-[20px]' : 'w-full h-[50px] rounded-[16px]')
                    : (mounted && selected
                      ? 'w-[50px] h-[70px] md:w-[60px] md:h-[84px] rounded-[20px] md:rounded-[24px] z-10 -translate-y-1'
                      : 'w-[42px] h-[58px] md:w-[52px] md:h-[72px] rounded-[16px] md:rounded-[20px]')
                  }
                `}
              >
                <span className={`${mounted && selected ? 'text-[9px] md:text-[10px] text-gray-300' : 'text-[8px] md:text-[9px]'} font-bold uppercase tracking-wider mb-0.5`}>
                  {dayName}
                </span>
                <span className={`${mounted && selected ? 'text-[22px] md:text-[28px] text-white' : 'text-[18px] md:text-2xl text-gray-800'} font-black leading-none`}>
                  {dayNumber}
                </span>
                <span className={`${mounted && selected ? 'text-[8px] md:text-[9px] text-gray-400 mt-0.5' : 'text-[7px] md:text-[8px] mt-0.5'} uppercase font-medium`}>
                  {monthName}
                </span>
              </button>

              <div className="h-4 w-full flex items-center justify-center">
                {bookingStatus && (
                  <button
                    className={`h-4 w-4 flex items-center justify-center text-white rounded-full font-bold text-[8px] leading-none shadow-sm transition-transform hover:scale-110 ${bookingStatus === 'confirmed'
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

// src/components/admin/DateSelector.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysToShow?: number;
}

export default function DateSelector({ 
  selectedDate, 
  onDateChange,
  daysToShow = 30 
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
    <div className="relative w-full bg-white border rounded-lg shadow-sm p-3">
      {/* Grid de fechas - ocupa todo el ancho */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${daysToShow}, minmax(0, 1fr))` }}>
        {dates.map((date, index) => {
          const selected = isSelected(date);
          const today = isToday(date);
          const dayName = getDayName(date);
          const dayNumber = date.getDate();
          const monthName = getMonthName(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`
                flex flex-col items-center justify-center px-2 py-3 rounded-lg
                transition-all duration-200 cursor-pointer border-2
                ${selected 
                  ? 'bg-blue-500 text-white border-blue-600 shadow-md scale-105' 
                  : today
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {/* Día de la semana */}
              <span className={`text-xs font-semibold mb-1 ${
                selected ? 'text-white' : today ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {dayName}
              </span>

              {/* Número del día */}
              <span className={`text-2xl font-bold ${
                selected ? 'text-white' : today ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {dayNumber}
              </span>

              {/* Mes */}
              <span className={`text-xs mt-1 ${
                selected ? 'text-blue-100' : today ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {monthName}
              </span>

              {/* Indicador "HOY" */}
              {today && !selected && (
                <span className="text-[9px] font-bold text-blue-600 mt-1">
                  HOY
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

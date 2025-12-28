'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';

// Datos simulados para demostración
const MOCK_COURTS = Array.from({ length: 8 }, (_, i) => ({
  id: `court-${i + 1}`,
  number: i + 1,
  name: `Pista ${i + 1}`,
}));

const MOCK_INSTRUCTORS = [
  { 
    id: 'inst-1', 
    name: 'Álex García', 
    photo: '/avatars/alex.jpg',
    initials: 'AG',
    availableHours: { start: 9, end: 14 }, // Solo mañanas
    description: 'Mañanas 9:00-14:00'
  },
  { 
    id: 'inst-2', 
    name: 'Carlos R.', 
    photo: '/avatars/carlos.jpg',
    initials: 'CR',
    availableHours: { start: 14, end: 22 }, // Solo tardes
    description: 'Tardes 14:00-22:00'
  },
  { 
    id: 'inst-3', 
    name: 'María López', 
    photo: '/avatars/maria.jpg',
    initials: 'ML',
    availableHours: { start: 9, end: 22 }, // Todo el día
    description: 'Todo el día'
  },
];

// Generar eventos de ejemplo - reservas confirmadas en pistas específicas
const generateMockReservations = () => {
  const today = new Date();
  const reservations: any[] = [];
  
  // Clases de Álex García - 3 clases de 9:00 a 11:00
  const alexClasses = [
    { court: 1, hour: 9, minute: 0 },   // 9:00-10:00
    { court: 2, hour: 10, minute: 0 },  // 10:00-11:00
    { court: 3, hour: 11, minute: 0 },  // 11:00-12:00
  ];
  
  alexClasses.forEach(({ court, hour, minute }) => {
    const start = new Date(today);
    start.setHours(hour, minute, 0, 0);
    reservations.push({
      id: `class-alex-${court}-${hour}`,
      type: 'class-confirmed',
      title: 'Clase Confirmada',
      start: start.toISOString(),
      end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      color: '#10B981',
      instructorId: 'inst-1',
      instructorName: 'Álex García',
      instructorInitials: 'AG',
      courtId: `court-${court}`,
      courtNumber: court,
      level: '3.5 - 4.5',
      playersCount: 4,
      maxPlayers: 4,
      price: 12,
      duration: 60
    });
  });
  
  // Otras clases confirmadas (60 min)
  const otherClassReservations = [
    { court: 5, hour: 14, instructor: 'inst-2' },
    { court: 6, hour: 16, instructor: 'inst-3' },
  ];
  
  otherClassReservations.forEach(({ court, hour, instructor }) => {
    const start = new Date(today);
    start.setHours(hour, 0, 0, 0);
    const instructorData = MOCK_INSTRUCTORS.find(i => i.id === instructor);
    reservations.push({
      id: `class-res-${court}-${hour}`,
      type: 'class-confirmed',
      title: 'Clase Confirmada',
      start: start.toISOString(),
      end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      color: '#10B981',
      instructorId: instructor,
      instructorName: instructorData?.name || 'Instructor',
      instructorInitials: instructorData?.initials || 'IN',
      courtId: `court-${court}`,
      courtNumber: court,
      level: '3.5 - 4.5',
      playersCount: 4,
      maxPlayers: 4,
      price: 12,
      duration: 60
    });
  });
  
  // Partidas confirmadas (90 min) - ocupan la pista
  const matchReservations = [
    { court: 1, hour: 12 },
    { court: 4, hour: 18 },
    { court: 7, hour: 19 },
  ];
  
  matchReservations.forEach(({ court, hour }) => {
    const start = new Date(today);
    start.setHours(hour, 0, 0, 0);
    reservations.push({
      id: `match-res-${court}-${hour}`,
      type: 'match-confirmed',
      title: 'Partida Confirmada',
      start: start.toISOString(),
      end: new Date(start.getTime() + 90 * 60 * 1000).toISOString(),
      color: '#7C3AED',
      courtId: `court-${court}`,
      courtNumber: court,
      level: '4.5 - 5.5',
      playersCount: 4,
      maxPlayers: 4,
      price: 20,
      duration: 90
    });
  });
  
  return reservations;
};

export default function DemoCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const reservations = generateMockReservations();

  // Generar slots de tiempo (9:00 - 22:00)
  const timeSlots = Array.from({ length: 27 }, (_, i) => {
    const hour = Math.floor(9 + i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  // Verificar si hay una reserva en este slot
  const hasReservationInSlot = (courtId: string, timeSlot: string) => {
    return reservations.find(res => {
      if (res.courtId !== courtId) return false;
      
      const resStart = new Date(res.start);
      const resEnd = new Date(res.end);
      const [hour, minute] = timeSlot.split(':');
      const slotTime = new Date(currentDate);
      slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      return resStart <= slotTime && resEnd > slotTime;
    });
  };

  // Verificar si es el inicio de una reserva
  const isReservationStart = (reservation: any, timeSlot: string) => {
    const resStart = new Date(reservation.start);
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    return resStart.getTime() === slotTime.getTime();
  };

  // Verificar si un instructor está disponible en un slot
  const isInstructorAvailable = (timeSlot: string) => {
    if (!selectedInstructor) return true; // Si no hay instructor seleccionado, mostrar todo
    
    const instructor = MOCK_INSTRUCTORS.find(i => i.id === selectedInstructor);
    if (!instructor) return true;
    
    const [hour] = timeSlot.split(':');
    const slotHour = parseInt(hour);
    
    return slotHour >= instructor.availableHours.start && slotHour < instructor.availableHours.end;
  };

  // Verificar si el instructor tiene una clase confirmada en este horario específico
  const instructorHasClassInSlot = (timeSlot: string) => {
    if (!selectedInstructor) return false;
    
    const instructor = MOCK_INSTRUCTORS.find(i => i.id === selectedInstructor);
    if (!instructor) return false;
    
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    return reservations.some(res => {
      if (res.type !== 'class-confirmed') return false;
      if (res.instructorInitials !== instructor.initials) return false;
      
      const resStart = new Date(res.start);
      const resEnd = new Date(res.end);
      
      return resStart <= slotTime && resEnd > slotTime;
    });
  };

  // Calcular span de filas para un evento
  const calculateRowSpan = (event: any) => {
    return event.duration / 30;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Selector de Vista */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Selecciona Vista
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Partidas para ver partidas disponibles, o un instructor para ver sus clases
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Opción: Ver partidas */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-700 mb-2 ml-1">Partidas</span>
              <button
                onClick={() => setSelectedInstructor(null)}
                className="flex flex-col items-center gap-2 p-5 rounded-xl transition-all transform hover:scale-[1.02] bg-green-500 border-[3px] border-gray-500 shadow-[0_4px_12px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(34,197,94,0.5)]"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg ring-2 ring-green-300">
                  <span className="text-white text-3xl">🏆</span>
                </div>
                <span className="text-[10px] font-medium text-white/90">4 jugadores</span>
              </button>
            </div>

            {/* Instructores */}
            {MOCK_INSTRUCTORS.map(instructor => (
              <div key={instructor.id} className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700 mb-2 ml-1">Clases con {instructor.name}</span>
                <button
                  onClick={() => setSelectedInstructor(instructor.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all transform hover:scale-[1.02] bg-blue-500 border-2 border-gray-400 shadow-[0_4px_12px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.5)]"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-300">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=random&color=fff&size=128`}
                      alt={instructor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold block text-white">{instructor.name}</span>
                    <span className="text-[9px] font-medium text-white/90">{instructor.description}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Calendario Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                {/* Barra de selección de jugadores - solo visible con instructor seleccionado */}
                {selectedInstructor && (
                  <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200">
                    <th className="p-2 text-left font-semibold border-r border-blue-200 min-w-[45px]">
                    </th>
                    <th colSpan={MOCK_COURTS.length} className="p-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm">
                          1 JUG
                        </button>
                        <button className="px-4 py-2 bg-blue-500 border-2 border-blue-600 rounded-lg text-sm font-semibold text-white shadow-md hover:bg-blue-600 transition-colors">
                          2 JUG
                        </button>
                        <button className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm">
                          3 JUG
                        </button>
                        <button className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm">
                          4 JUG
                        </button>
                      </div>
                    </th>
                  </tr>
                )}
                <tr className="bg-gradient-to-r from-gray-700 to-gray-600">
                  <th className="p-2 text-left font-semibold border-r border-gray-500/50 w-24 text-white text-xs">
                    HORA
                  </th>
                  {MOCK_COURTS.map(court => (
                    <th key={court.id} className="p-2 text-center font-semibold border-r border-gray-500/50 text-white w-24">
                      <div className="flex flex-col items-center">
                        <span className="text-xs">Pista {court.number}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot, slotIndex) => {
                  const isHalfHour = timeSlot.endsWith(':30');
                  return (
                  <tr key={timeSlot} className={`transition-colors hover:bg-gray-50/50 ${
                    isHalfHour ? 'bg-gray-100' : 'bg-white'
                  }`}>
                    <td className={`p-1 text-center font-medium border-r border-gray-100 text-xs ${
                      isHalfHour ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                        {timeSlot}
                      </td>
                      {MOCK_COURTS.map(court => {
                        const reservation = hasReservationInSlot(court.id, timeSlot);
                        
                        // Si hay reserva y es el inicio, mostrar la reserva con rowspan
                        if (reservation && isReservationStart(reservation, timeSlot)) {
                          const rowSpan = calculateRowSpan(reservation);
                          return (
                            <td
                              key={court.id}
                              rowSpan={rowSpan}
                              className={`border border-gray-200 p-0.5 h-10 bg-white ${isHalfHour ? 'border-b-[3px] border-b-gray-400 rounded-b-lg' : ''}`}
                            >
                              <div className={`rounded-xl h-full flex flex-col justify-between transform hover:scale-[1.01] transition-all border-2 border-gray-400 ${
                                reservation.type === 'class-confirmed'
                                  ? 'bg-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.5)]'
                                  : 'bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(34,197,94,0.5)]'
                              }`}>
                                <div className="p-1.5">
                                  <div className="flex items-center gap-1 mb-1">
                                    {/* Avatar del instructor */}
                                    {reservation.instructorInitials && (
                                      <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg ring-2 ${
                                        reservation.type === 'class-confirmed' ? 'ring-blue-300' : 'ring-green-300'
                                      }`}>
                                        <span className={`font-bold text-[8px] ${
                                          reservation.type === 'class-confirmed' ? 'text-blue-700' : 'text-green-700'
                                        }`}>{reservation.instructorInitials}</span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="text-[10px] font-bold text-white">
                                        {reservation.type === 'class-confirmed' ? '📚 Clase' : '🏆 Partida'}
                                      </div>
                                      {reservation.instructorName && (
                                        <div className="text-[9px] text-white/90 font-medium">{reservation.instructorName}</div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Jugadores */}
                                  {reservation.type === 'match-confirmed' ? (
                                    <div className="grid grid-cols-2 gap-1 justify-items-center">
                                      {Array.from({ length: reservation.playersCount }).map((_, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full overflow-hidden shadow-md ring-2 ring-green-300 bg-white">
                                          <img 
                                            src={`https://ui-avatars.com/api/?name=J${i+1}&background=22c55e&color=fff&size=64`}
                                            alt={`Jugador ${i+1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                      {Array.from({ length: reservation.maxPlayers - reservation.playersCount }).map((_, i) => (
                                        <div key={`empty-${i}`} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm bg-green-300">
                                          <span className="text-[9px] text-white font-semibold">+</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex gap-0.5 justify-center">
                                      {Array.from({ length: reservation.playersCount }).map((_, i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full flex items-center justify-center shadow-md ring-1 bg-white ${
                                          reservation.type === 'class-confirmed' ? 'ring-blue-300' : 'ring-green-300'
                                        }`}>
                                          <span className={`text-[7px] font-bold ${
                                            reservation.type === 'class-confirmed' ? 'text-blue-700' : 'text-green-700'
                                          }`}>{i + 1}</span>
                                        </div>
                                      ))}
                                      {Array.from({ length: reservation.maxPlayers - reservation.playersCount }).map((_, i) => (
                                        <div key={`empty-${i}`} className={`w-3 h-3 rounded-full border border-white flex items-center justify-center shadow-sm ${
                                          reservation.type === 'class-confirmed' ? 'bg-blue-300' : 'bg-green-300'
                                        }`}>
                                          <span className="text-[7px] text-white font-semibold">+</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Precio y duración */}
                                <div className={`flex items-center justify-between p-1.5 pt-1 border-t bg-white/90 rounded-b-xl ${
                                  reservation.type === 'class-confirmed' ? 'border-blue-400' : 'border-green-400'
                                }`}>
                                  <div className={`text-[10px] font-bold ${
                                    reservation.type === 'class-confirmed' ? 'text-blue-700' : 'text-green-700'
                                  }`}>€{reservation.price}</div>
                                  <div className={`text-[9px] font-medium ${
                                    reservation.type === 'class-confirmed' ? 'text-blue-600' : 'text-green-600'
                                  }`}>{reservation.duration} min</div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Si hay reserva pero no es el inicio, ya está cubierto por rowspan
                        if (reservation && !isReservationStart(reservation, timeSlot)) {
                          return null;
                        }
                        
                        // Si no hay reserva, mostrar propuestas de clase y partida
                        return (
                          <td key={court.id} className={`border border-gray-200 p-0.5 h-10 bg-white ${isHalfHour ? 'border-b-[3px] border-b-gray-400 rounded-b-lg' : ''}`}>
                            {selectedInstructor ? (
                              isInstructorAvailable(timeSlot) && !instructorHasClassInSlot(timeSlot) ? (
                                <div className="bg-white rounded p-0.5 cursor-pointer hover:shadow-md transition-all h-full border border-gray-300 shadow-sm flex items-center justify-center">
                                  {/* Propuesta de clase del instructor */}
                                  <div className="text-center">
                                    <div className="text-[8px] text-gray-800">Iniciar</div>
                                    <div className="text-[9px] font-bold text-gray-900">€12</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center bg-gray-100 rounded">
                                  <span className="text-[8px] text-gray-400">—</span>
                                </div>
                              )
                            ) : (
                              <div className="bg-white rounded-lg p-0.5 cursor-pointer hover:shadow-lg transition-all h-full border-2 border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
                                {/* Propuesta de partida */}
                                <div className="text-center">
                                  <div className="text-[9px] text-gray-900">Iniciar partida</div>
                                  <div className="text-[10px] font-bold text-gray-900">
                                    €{(() => {
                                      const hour = parseInt(timeSlot.split(':')[0]);
                                      if (hour >= 9 && hour < 14) return 5;
                                      if (hour >= 14 && hour < 18) return 6;
                                      if (hour >= 18 && hour <= 21) return 8;
                                      return 5;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  );
}

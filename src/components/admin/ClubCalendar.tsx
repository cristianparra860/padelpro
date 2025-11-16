'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Users, DoorOpen, GraduationCap } from 'lucide-react';
import CalendarEventDetails from './CalendarEventDetails';
import DateSelector from './DateSelector';
import ClassCard from '@/components/class/ClassCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  type: 'class-proposal' | 'class-confirmed' | 'match' | 'instructor-blocked' | 'court-blocked';
  title: string;
  start: string;
  end: string;
  color: string;
  instructorId?: string;
  instructorName?: string;
  instructorPhoto?: string;
  courtId?: string;
  courtNumber?: number;
  playersCount?: number;
  maxPlayers?: number;
  level?: string;
  category?: string;
  price?: number;
  bookings?: any[];
}

interface CalendarData {
  courts: Array<{
    id: string;
    number: number;
    name: string;
    clubName?: string;
  }>;
  instructors: Array<{
    id: string;
    name: string;
    email: string;
    photo?: string;
    hourlyRate?: number;
    specialties?: string[];
  }>;
  proposedClasses: CalendarEvent[];
  confirmedClasses: CalendarEvent[];
  events: CalendarEvent[];
  summary: {
    totalCourts: number;
    totalInstructors: number;
    totalClasses: number;
    confirmedClasses: number;
    proposedClasses: number;
    totalMatches: number;
    totalBookings?: number;
    emptyClasses?: number;
    fullClasses?: number;
  };
}

export default function ClubCalendar({ clubId, currentUser }: { clubId: string; currentUser?: any }) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('day');
  const [filterType, setFilterType] = useState<'all' | 'classes' | 'matches' | 'instructors' | 'courts'>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showClassCard, setShowClassCard] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]); // 🆕 Bookings del usuario para colorear días

  const handleEventClick = (event: CalendarEvent) => {
    // Si es una clase confirmada, mostrar la tarjeta de usuario
    if (event.type === 'class-confirmed') {
      setSelectedClassId(event.id);
      setShowClassCard(true);
    } else {
      // Para otros tipos, mostrar el detalle de admin
      setSelectedEvent(event);
      setShowEventDetails(true);
    }
  };

  const handleTimeSlotClick = (slotDate: Date) => {
    // Crear una nueva clase en este slot de tiempo
    console.log('Crear clase en:', slotDate);
    
    // Crear un evento temporal para mostrar el formulario de creación
    const newClassEvent: CalendarEvent = {
      id: 'new-class',
      type: 'class-proposal',
      title: 'Nueva Clase',
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hora después
      color: '#FFA500',
      maxPlayers: 4
    };
    
    setSelectedEvent(newClassEvent);
    setShowEventDetails(true);
  };

  const handleEventEdit = (event: CalendarEvent) => {
    console.log('Edit event:', event);
    // TODO: Implementar edición de evento
  };

  const handleEventCancel = async (event: CalendarEvent) => {
    console.log('Cancel event:', event);
    // TODO: Implementar cancelación de evento
    await loadCalendarData(); // Recargar datos
  };

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate);
      startDate.setDate(1); // Primer día del mes
      startDate.setHours(0, 0, 0, 0); // Inicio del día
      
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Último día del mes
      endDate.setHours(23, 59, 59, 999); // Final del día
      
      const response = await fetch(
        `/api/admin/calendar?clubId=${clubId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Calendar data received:', {
          instructors: data.instructors?.length,
          courts: data.courts?.length,
          proposedClasses: data.proposedClasses?.length,
          confirmedClasses: data.confirmedClasses?.length,
          events: data.events?.length
        });
        setCalendarData(data);
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
    if (currentUser?.id) {
      loadUserBookings(); // 🆕 Cargar bookings del usuario
    }
    
    // Auto-refresh cada 30 segundos para actualizar en tiempo real
    const interval = setInterval(() => {
      loadCalendarData();
      if (currentUser?.id) {
        loadUserBookings();
      }
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate, currentUser?.id]); // loadCalendarData se recrea cada vez que cambia clubId o currentDate

  // 🆕 Cargar bookings del usuario para colorear días en el calendario
  const loadUserBookings = async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}/bookings`);
      if (response.ok) {
        const bookings = await response.json();
        // Transformar para el DateSelector
        const formattedBookings = bookings.map((b: any) => ({
          timeSlotId: b.timeSlotId,
          status: b.status,
          date: b.timeSlot?.start || b.start || new Date()
        }));
        setUserBookings(formattedBookings);
      }
    } catch (error) {
      console.error('Error cargando bookings del usuario:', error);
    }
  };

  const getFilteredEvents = () => {
    if (!calendarData) return [];
    
    let filtered = calendarData.events;
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(event => {
        switch (filterType) {
          case 'classes':
            return event.type.includes('class');
          case 'matches':
            return event.type === 'match';
          case 'instructors':
            return event.instructorId !== undefined;
          case 'courts':
            return event.courtNumber !== undefined;
          default:
            return true;
        }
      });
    }
    
    // Filtrar por recurso específico
    if (selectedResource !== 'all') {
      if (selectedResource.startsWith('instructor-')) {
        const instructorId = selectedResource.replace('instructor-', '');
        filtered = filtered.filter(e => e.instructorId === instructorId);
      } else if (selectedResource.startsWith('court-')) {
        const courtNumber = parseInt(selectedResource.replace('court-', ''));
        filtered = filtered.filter(e => e.courtNumber === courtNumber);
      }
    }
    
    return filtered;
  };

  const getDaysInView = () => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    
    if (view === 'week') {
      // Obtener el lunes de la semana actual
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      
      for (let i = 0; i < 7; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
      }
    } else if (view === 'day') {
      days.push(new Date(currentDate));
    } else {
      // Vista mensual
      start.setDate(1);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
      }
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return getFilteredEvents().filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const hasFullHourAvailable = (instructorId: string, slotTime: string, slotDate: Date): boolean => {
    const [hourStr, minuteStr] = slotTime.split(':');
    const slotHour = parseInt(hourStr);
    const slotMinute = parseInt(minuteStr);
    
    // Crear el timestamp de inicio del slot
    const slotStart = new Date(slotDate);
    slotStart.setHours(slotHour, slotMinute, 0, 0);
    
    // Calcular cuándo TERMINARÍA una clase que empiece en este slot (60 minutos después)
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 60);

    // Verificar si alguna clase CONFIRMADA del instructor solapa con estos 60 minutos
    const hasConflict = (calendarData?.confirmedClasses || []).some(cls => {
      if (cls.instructorId !== instructorId) return false;
      
      const clsStart = new Date(cls.start);
      const clsEnd = new Date(cls.end);
      
      // Solo verificar el mismo día
      if (clsStart.toDateString() !== slotDate.toDateString()) return false;
      
      // REGLA: Bloquear solo los últimos 30 minutos antes de la clase
      // Si la nueva clase empezaría exactamente 30min antes, bloquear
      const timeDiff = clsStart.getTime() - slotStart.getTime();
      const is30MinutesBefore = timeDiff === 30 * 60 * 1000;
      
      if (is30MinutesBefore) {
        return true; // BLOQUEADO - No puede empezar 30min antes
      }
      
      // REGLA: Bloquear si hay solapamiento DESPUÉS del inicio de la clase
      // Permitir clases que terminen justo cuando empieza la otra (o antes)
      const wouldOverlap = slotEnd > clsStart && slotStart < clsEnd;
      
      return wouldOverlap;
    });

    return !hasConflict;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const getEventStyle = (event: CalendarEvent) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // horas
    
    return {
      backgroundColor: event.color,
      height: `${duration * 60}px`, // 60px por hora
      top: `${startTime.getHours() * 60 + startTime.getMinutes()}px`
    };
  };

  if (loading) {
    return (
      <div className="md:space-y-0 space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm">Cargando calendario...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback si no hay datos
  if (!calendarData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los datos del calendario.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={loadCalendarData}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = getDaysInView();
  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-6">
      {/* 🔧 MODO MÓVIL: Barra compacta fija para navegación rápida - OCULTA */}
      <div className="hidden">
        <button onClick={() => navigateDate('prev')} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">◀</button>
        <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">Hoy</button>
        <button onClick={() => navigateDate('next')} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">▶</button>
        <div className="flex-1 text-center text-white text-xs font-medium">
          {currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
        <div className="flex gap-1">
          {['day','week','month'].map(v => (
            <button key={v} onClick={() => setView(v as any)} className={`px-2 py-1 rounded text-xs font-semibold ${view===v ? 'bg-white text-purple-600' : 'bg-white/20 text-white'} transition`}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
          ))}
        </div>
      </div>
      {/* Header con controles - DISEÑO MEJORADO - Oculto en móvil */}
      <Card className="hidden md:block bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-2xl overflow-hidden">
        <CardHeader className="relative">
          {/* Fondo con efecto */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle className="flex items-center gap-3 text-white text-3xl font-bold mb-2">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <CalendarIcon className="h-8 w-8 text-white" />
                  </div>
                  Calendario del Club
                </CardTitle>
                <CardDescription className="text-white/90 text-lg font-medium">
                  📅 {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => navigateDate('prev')}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm transition-all hover:scale-105"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setCurrentDate(new Date())}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm transition-all hover:scale-105 font-semibold"
                >
                  Hoy
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => navigateDate('next')}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm transition-all hover:scale-105"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Filtros y vistas */}
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button 
                  variant={view === 'day' ? 'default' : 'secondary'} 
                  size="sm"
                  onClick={() => setView('day')}
                  className={view === 'day' 
                    ? 'bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm'
                  }
                >
                  📅 Día
                </Button>
                <Button 
                  variant={view === 'week' ? 'default' : 'secondary'} 
                  size="sm"
                  onClick={() => setView('week')}
                  className={view === 'week' 
                    ? 'bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm'
                  }
                >
                  📆 Semana
                </Button>
                <Button 
                  variant={view === 'month' ? 'default' : 'secondary'} 
                  size="sm"
                  onClick={() => setView('month')}
                  className={view === 'month' 
                    ? 'bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm'
                  }
                >
                  🗓️ Mes
                </Button>
              </div>
              
              <div className="flex-1" />
              
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white backdrop-blur-sm hover:bg-white/30 transition-all">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los eventos</SelectItem>
                  <SelectItem value="classes">Clases</SelectItem>
                  <SelectItem value="matches">Partidos</SelectItem>
                  <SelectItem value="instructors">Instructores</SelectItem>
                  <SelectItem value="courts">Pistas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger className="w-[200px] bg-white/20 border-white/30 text-white backdrop-blur-sm hover:bg-white/30 transition-all">
                  <SelectValue placeholder="Recurso específico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los recursos</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Instructores</SelectLabel>
                    {calendarData?.instructors.map(instructor => (
                      <SelectItem key={instructor.id} value={`instructor-${instructor.id}`}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Pistas</SelectLabel>
                    {calendarData?.courts.map(court => (
                      <SelectItem key={court.id} value={`court-${court.number}`}>
                        Pista {court.number} - {court.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estadísticas rápidas - Responsive: horizontal scroll en móvil - OCULTO EN MÓVIL */}
      {calendarData && (
        <div className="hidden md:grid md:grid-cols-4 gap-4">
          <Card className="min-w-[280px] md:min-w-0 snap-center bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Clases Propuestas</p>
                  <p className="text-4xl font-bold text-white">{calendarData.summary.proposedClasses}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-w-[280px] md:min-w-0 snap-center bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Clases Confirmadas</p>
                  <p className="text-4xl font-bold text-white">{calendarData.summary.confirmedClasses}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-w-[280px] md:min-w-0 snap-center bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Instructores</p>
                  <p className="text-4xl font-bold text-white">{calendarData.summary.totalInstructors || 0}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium mb-1">Pistas Activas</p>
                  <p className="text-4xl font-bold text-white">{calendarData.summary.totalCourts}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <DoorOpen className="h-10 w-10 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Versión móvil de estadísticas (scroll horizontal) - OCULTO */}
      {calendarData && (
        <div className="hidden">
          <div className="flex gap-3 pb-1 w-max">
            <div className="min-w-[150px] bg-orange-500 rounded-xl p-3 text-white shadow">
              <div className="text-[10px] opacity-80">Propuestas</div>
              <div className="text-2xl font-bold leading-none">{calendarData.summary.proposedClasses}</div>
            </div>
            <div className="min-w-[150px] bg-green-500 rounded-xl p-3 text-white shadow">
              <div className="text-[10px] opacity-80">Confirmadas</div>
              <div className="text-2xl font-bold leading-none">{calendarData.summary.confirmedClasses}</div>
            </div>
            <div className="min-w-[150px] bg-blue-500 rounded-xl p-3 text-white shadow">
              <div className="text-[10px] opacity-80">Instructores</div>
              <div className="text-2xl font-bold leading-none">{calendarData.summary.totalInstructors || 0}</div>
            </div>
            <div className="min-w-[150px] bg-purple-500 rounded-xl p-3 text-white shadow">
              <div className="text-[10px] opacity-80">Pistas</div>
              <div className="text-2xl font-bold leading-none">{calendarData.summary.totalCourts}</div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Fecha Lineal - Ancho completo (ajuste móvil spacing) */}
      <div className="w-full md:mt-0 mt-2">
        <DateSelector 
          selectedDate={currentDate}
          onDateChange={setCurrentDate}
          daysToShow={30}
          userBookings={userBookings} // 🆕 Pasar bookings del usuario
        />
      </div>

      {/* Vista del calendario basada en pistas - DISEÑO MEJORADO */}
      <Card className="shadow-xl border-gray-200">
        <CardContent className="p-0">
          {view === 'month' ? (
            // Vista mensual - grid compacto (mantener original)
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center font-semibold text-sm">
                  {day}
                </div>
              ))}
              
              {days.map(day => {
                const events = getEventsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-white p-2 min-h-[120px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: event.color, color: 'white' }}
                          title={event.title}
                          onClick={() => handleEventClick(event)}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{events.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // NUEVA VISTA: Basada en pistas con fila de propuestas - DISEÑO MEJORADO Y RESPONSIVE
            <div className="flex flex-col overflow-x-auto md:overflow-x-visible md:rounded-lg md:border md:border-gray-200 -mx-4 md:mx-0">
              {/* Columna de horas (izquierda) */}
              <div className="flex border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 shadow-sm">
                <div className="w-24 md:w-32 border-r-2 border-gray-300 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-2 md:p-3 flex-shrink-0 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  <span className="text-xs md:text-sm font-bold text-white">⏰ Horarios</span>
                </div>
                {/* Headers de slots de tiempo */}
                <div className="flex min-w-max">
                  {timeSlots.map(time => (
                    <div key={time} className="w-12 md:w-10 border-r text-center py-2 text-[10px] md:text-[9px] font-bold text-gray-700 flex-shrink-0 hover:bg-blue-50 transition-colors">
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* FILAS: Clases Propuestas por Instructor - DISEÑO MEJORADO */}
              {calendarData?.instructors.map(instructor => (
                <div key={instructor.id} className="flex border-b bg-gradient-to-r from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-100 transition-colors">
                  <div className="w-24 md:w-32 border-r flex items-center px-2 md:px-3 py-2 flex-shrink-0 sticky left-0 bg-gradient-to-r from-orange-50 to-orange-100 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-1 md:gap-2">
                      {instructor.photo ? (
                        <img 
                          src={instructor.photo} 
                          alt={instructor.name}
                          className="w-6 md:w-7 h-6 md:h-7 rounded-full object-cover border-2 border-orange-500 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 md:w-7 h-6 md:h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] md:text-xs font-bold text-orange-900 truncate">{instructor.name}</div>
                        <div className="text-[8px] md:text-[9px] text-orange-600 font-medium">✨ Propuestas</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-max">
                    {timeSlots.map((time, slotIndex) => {
                      // 🔍 VERIFICAR SI ESTE SLOT TIENE 60 MINUTOS COMPLETOS DISPONIBLES
                      const canStartClassHere = hasFullHourAvailable(instructor.id, time, currentDate);
                      
                      // Buscar clases propuestas de ESTE instructor en este slot
                      const instructorClasses = (calendarData?.proposedClasses || []).filter(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        
                        // Filtrar por instructor, día y hora
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        const isSameInstructor = cls.instructorId === instructor.id;
                        
                        return isSameInstructor && isSameDay && isSameTime;
                      });

                      // ⚠️ SOLO MOSTRAR PROPUESTAS SI HAY 60 MINUTOS DISPONIBLES
                      const visibleClasses = canStartClassHere ? instructorClasses : [];

                      return (
                        <div 
                          key={slotIndex} 
                          className={`w-12 md:w-10 h-10 border-r relative flex-shrink-0 ${!canStartClassHere ? 'bg-red-50/30' : ''}`}
                          title={!canStartClassHere ? '⚠️ No hay 60min disponibles' : ''}
                        >
                          {visibleClasses.length > 0 && (
                            <div className="absolute inset-0 p-0.5 overflow-hidden">
                              {visibleClasses.slice(0, 1).map(cls => (
                                <div
                                  key={cls.id}
                                  className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all h-full flex flex-col items-center justify-center border border-orange-400"
                                  onClick={() => handleEventClick(cls)}
                                  title={`${cls.category || cls.level} - ${cls.playersCount}/${cls.maxPlayers} alumnos - ⏱️ 60min`}
                                >
                                  <div className="text-[7px] font-bold truncate w-full text-center">✨{cls.category || cls.level}</div>
                                  <div className="text-[8px] font-bold truncate w-full text-center">
                                    👥{cls.playersCount}/{cls.maxPlayers}
                                  </div>
                                </div>
                              ))}
                              {visibleClasses.length > 1 && (
                                <div className="text-[6px] text-orange-600 font-bold text-center bg-orange-100 rounded shadow-sm">
                                  +{visibleClasses.length - 1}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* FILAS: Pistas (1, 2, 3, 4...) - DISEÑO MEJORADO Y RESPONSIVE */}
              {calendarData?.courts.map(court => (
                <div key={court.id} className="flex border-b hover:bg-blue-50/30 transition-colors">
                  <div className="w-24 md:w-32 border-r flex items-center px-2 md:px-3 py-2 flex-shrink-0 bg-white sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="p-1 md:p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm flex-shrink-0">
                        <DoorOpen className="h-3 md:h-4 w-3 md:w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] md:text-xs font-bold text-gray-900">🎾 Pista {court.number}</div>
                        <div className="text-[8px] md:text-[9px] text-gray-600 font-medium truncate">{court.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-max">
                    {timeSlots.map((time, slotIndex) => {
                      // Buscar clases confirmadas en esta pista, slot Y del día seleccionado
                      const confirmedInSlot = (calendarData?.confirmedClasses || []).filter(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        
                        // IMPORTANTE: Verificar que sea del mismo día
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        
                        return cls.courtNumber === court.number && isSameDay && isSameTime;
                      });

                      // 🔍 VERIFICAR SI ESTE SLOT ESTÁ OCUPADO POR UNA CLASE DE 60MIN
                      // Una clase que empieza 30min antes también ocupa este slot
                      const slotDate = new Date(currentDate);
                      const [hourStr, minuteStr] = time.split(':');
                      slotDate.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);
                      
                      const isOccupiedByPreviousClass = (calendarData?.confirmedClasses || []).some(cls => {
                        if (cls.courtNumber !== court.number) return false;
                        
                        const clsStart = new Date(cls.start);
                        const clsEnd = new Date(cls.end);
                        
                        // Verificar si este slot está DENTRO del rango de la clase
                        return clsStart <= slotDate && slotDate < clsEnd;
                      });

                      // ⚠️ ADVERTENCIA: Detectar solapamientos
                      if (confirmedInSlot.length > 1) {
                        console.warn(`⚠️ OVERLAP DETECTED: ${confirmedInSlot.length} classes at same time!`, {
                          court: court.number,
                          time,
                          date: currentDate.toDateString(),
                          classes: confirmedInSlot.map(c => c.id)
                        });
                      }

                      // Verificar si este slot es parte de una clase de 60min
                      const isPartOfClass = confirmedInSlot.length > 0;

                      return (
                        <div 
                          key={slotIndex} 
                          className={`w-12 md:w-10 h-10 border-r relative flex-shrink-0 ${isOccupiedByPreviousClass && !isPartOfClass ? 'bg-green-100' : ''}`}
                          title={isOccupiedByPreviousClass && !isPartOfClass ? '🔒 Ocupado por clase anterior (60min)' : ''}
                        >
                          {confirmedInSlot.slice(0, 1).map(cls => { // 🛡️ SOLO MOSTRAR LA PRIMERA CLASE para evitar solapamientos visuales
                            // Solo renderizar en el primer slot (00 o 30 inicial)
                            const clsStart = new Date(cls.start);
                            const isStartSlot = clsStart.getHours() === parseInt(time.split(':')[0]) && 
                                               clsStart.getMinutes() === parseInt(time.split(':')[1]);
                            
                            if (!isStartSlot) return null;

                            // Clase ocupa 2 slots (60min) = 96px móvil (48px * 2) o 80px desktop (40px * 2)
                            return (
                              <div
                                key={cls.id}
                                className="absolute left-0.5 top-0.5 bottom-0.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-md shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all z-10 flex flex-col items-center justify-center border-2 border-green-400"
                                style={{
                                  width: 'calc(2 * (3rem - 1px))', // 2 slots móvil: 48px * 2 - border
                                }}
                                onClick={() => handleEventClick(cls)}
                                title={`${cls.instructorName} - ${cls.category || cls.level} (${cls.playersCount}/${cls.maxPlayers}) - ⏱️ 60min`}
                              >
                                <div className="text-[8px] font-bold truncate w-full text-center">✅ {cls.category || cls.level}</div>
                                <div className="text-[7px] truncate w-full text-center font-medium">👨‍🏫 {cls.instructorName}</div>
                                <div className="text-[8px] font-bold truncate w-full text-center bg-white/20 rounded px-1 mt-0.5">
                                  👥 {cls.playersCount}/{cls.maxPlayers}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card className="hidden md:block">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold">Leyenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFA500' }}></div>
              <span>Clase Propuesta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span>Clase Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span>Partido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
              <span>Bloqueado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de detalles del evento */}
      {selectedEvent && (
        <CalendarEventDetails
          event={selectedEvent}
          open={showEventDetails}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEventEdit}
          onCancel={handleEventCancel}
        />
      )}

      {/* Modal para mostrar tarjeta de clase como la ve el usuario */}
      <Dialog open={showClassCard} onOpenChange={setShowClassCard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Clase</DialogTitle>
          </DialogHeader>
          {selectedClassId && (
            <ClassCardWrapper 
              classId={selectedClassId}
              onClose={() => setShowClassCard(false)}
              onBookingSuccess={loadCalendarData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente wrapper para cargar la clase y mostrar el ClassCard
function ClassCardWrapper({ classId, onClose, onBookingSuccess }: { classId: string; onClose: () => void; onBookingSuccess?: () => void }) {
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClassData() {
      try {
        const response = await fetch(`/api/classes/${classId}`);
        const data = await response.json();
        setClassData(data);
      } catch (error) {
        console.error('Error loading class:', error);
      } finally {
        setLoading(false);
      }
    }
    loadClassData();
  }, [classId]);

  const handleBookingSuccess = () => {
    onClose();
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando clase...</div>;
  }

  if (!classData) {
    return <div className="p-8 text-center">No se pudo cargar la clase</div>;
  }

  return (
    <ClassCard
      classData={classData}
      currentUser={null}
      onBookingSuccess={handleBookingSuccess}
      showPointsBonus={false}
    />
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight, Filter, Users, DoorOpen, GraduationCap, UserCircle, LogOut } from 'lucide-react';
import CalendarEventDetails from './CalendarEventDetails';
import DateSelector from './DateSelector';
import ClassCardReal from '@/components/class/ClassCardReal';
import LogoutConfirmationDialog from '@/components/layout/LogoutConfirmationDialog';
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
    clubLogo?: string;
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

export default function ClubCalendar2({ 
  clubId, 
  currentUser,
  viewMode = 'club' // 'user' = solo mi info, 'club' = toda info del club, 'instructor' = info del instructor
}: { 
  clubId: string; 
  currentUser?: any;
  viewMode?: 'user' | 'club' | 'instructor';
}) {
  const router = useRouter();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true); // Solo para carga inicial
  const [refreshing, setRefreshing] = useState(false); // Para refreshes en background
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('day');
  const [filterType, setFilterType] = useState<'all' | 'classes' | 'matches' | 'instructors' | 'courts'>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showClassCard, setShowClassCard] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showProposalCards, setShowProposalCards] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{ clubId: string; start: string; instructorId?: string } | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]); // 🆕 Bookings del usuario para colorear días
  // 🆕 Filtro de reservas: en modo 'user' siempre 'mine', en otros modos configurable
  const [bookingFilter, setBookingFilter] = useState<'all' | 'mine'>(viewMode === 'user' ? 'mine' : 'all');
  // Selector de cantidad de jugadores para calcular precio por plaza
  const [selectedGroupSize, setSelectedGroupSize] = useState<1 | 2 | 3 | 4>(1);
  // Layout orientation: horizontal (instructores en filas) o vertical (horas en filas)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>('vertical');
  // Estado para el diálogo de cerrar sesión
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // 📅 Escuchar eventos de cambio de layout desde la barra de navegación
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const newLayout = event.detail as 'horizontal' | 'vertical';
      setLayoutOrientation(newLayout);
    };

    window.addEventListener('setCalendarLayout', handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener('setCalendarLayout', handleLayoutChange as EventListener);
    };
  }, []);

  // Debug: verificar currentUser
  useEffect(() => {
    console.log('🎨 ClubCalendar2 - currentUser recibido:', currentUser);
  }, [currentUser]);

  const handleEventClick = (event: CalendarEvent) => {
    // Si es una clase confirmada, mostrar la tarjeta de usuario
    if (event.type === 'class-confirmed') {
      // Extraer el ID real del TimeSlot (remover prefijo "class-")
      const timeSlotId = event.id.replace('class-', '');
      setSelectedClassId(timeSlotId);
      setShowClassCard(true);
    } else if (event.type === 'class-proposal') {
      // Si es una propuesta, mostrar solo las propuestas del instructor específico
      setSelectedProposal({
        clubId: clubId,
        start: event.start,
        instructorId: event.instructorId, // ✅ Filtrar por instructor específico
      });
      setShowProposalCards(true);
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

  const loadCalendarData = async (isInitialLoad = false, forceRefresh = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
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
        { 
          cache: (isInitialLoad || forceRefresh) ? 'no-store' : 'default',
          ...((isInitialLoad || forceRefresh) ? {} : { next: { revalidate: 30 } })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Solo logs en desarrollo
        if (isInitialLoad && process.env.NODE_ENV === 'development') {
          console.log('📊 Calendar data loaded:', {
            instructors: data.instructors?.length,
            courts: data.courts?.length,
            proposedClasses: data.proposedClasses?.length,
            confirmedClasses: data.confirmedClasses?.length,
            events: data.events?.length
          });
          
          // 🔍 LOG: Verificar bookings en clases propuestas
          const sampleProposed = data.proposedClasses?.[0];
          if (sampleProposed) {
            console.log('🔍 Sample proposed class:', {
              id: sampleProposed.id,
              playersCount: sampleProposed.playersCount,
              bookingsCount: sampleProposed.bookings?.length,
              firstBooking: sampleProposed.bookings?.[0] ? {
                id: sampleProposed.bookings[0].id,
                groupSize: sampleProposed.bookings[0].groupSize,
                status: sampleProposed.bookings[0].status,
                userName: sampleProposed.bookings[0].user?.name
              } : null
            });
          }
        }
        setCalendarData(data);
        
        // 🐛 DEBUG: Log de clases confirmadas
        if (data.confirmedClasses && data.confirmedClasses.length > 0) {
          console.log('✅ Clases confirmadas cargadas:', data.confirmedClasses.length);
          const sampleConfirmed = data.confirmedClasses[0];
          console.log('📋 Sample confirmed class:', {
            id: sampleConfirmed.id,
            instructorId: sampleConfirmed.instructorId,
            instructorName: sampleConfirmed.instructorName,
            courtId: sampleConfirmed.courtId,
            courtNumber: sampleConfirmed.courtNumber,
            start: sampleConfirmed.start,
            playersCount: sampleConfirmed.playersCount
          });
        }
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // Efecto para carga inicial y cambios de fecha
  useEffect(() => {
    loadCalendarData(true); // Carga inicial con loading=true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate]);

  // Efecto separado para cargar bookings del usuario
  useEffect(() => {
    if (currentUser?.id) {
      loadUserBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Efecto para auto-refresh en background (2 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      loadCalendarData(false); // Refresh silencioso
      if (currentUser?.id) {
        loadUserBookings();
      }
    }, 120000); // Cada 2 minutos para mejor rendimiento
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate, currentUser?.id]);

  // 🆕 Cargar bookings del usuario para colorear días en el calendario
  const loadUserBookings = async () => {
    if (!currentUser?.id) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}/bookings`, {
        cache: 'default',
        next: { revalidate: 60 }
      });
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
      console.error('❌ Error cargando bookings del usuario:', error);
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
    // 🕐 Usar horarios del club si están disponibles
    let startHour = 7;
    let endHour = 22;
    
    // Intentar obtener openingHours del club desde calendarData
    if (calendarData?.courts?.[0]) {
      // Buscar en la API o usar valores por defecto
      // Por ahora, usar 9:00 - 22:00 como solicitado
      startHour = 9;
      endHour = 22;
    }
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Función para abreviar nombres de instructor
  const abbreviateName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0]; // Solo un nombre
    
    // Primer nombre + inicial del apellido
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);
    return `${firstName} ${lastInitial}.`;
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
            <Button size="sm" variant="outline" onClick={() => loadCalendarData()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

}
}
}

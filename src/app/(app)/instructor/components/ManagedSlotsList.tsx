// src/app/(app)/instructor/components/ManagedSlotsList.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { TimeSlot, Booking, User as StudentUser, ClassPadelLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { List, Clock, Users, CalendarCheck, CalendarX, Loader2, BarChart, Hash, Euro, CheckCircle, PlusCircle, Gift, Users2, Venus, Mars } from 'lucide-react';
import { format, isSameDay, startOfDay, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { getMockTimeSlots, getMockInstructors, isSlotEffectivelyCompleted, cancelClassByInstructor, updateTimeSlotInState, removeBookingFromTimeSlotInState, toggleGratisSpot } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import InstructorBookingOption from './InstructorBookingOption';
// import StudentSearchDialog from './StudentSearchDialog';
import { displayClassLevel, displayClassCategory } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTransition } from 'react';

interface ManagedSlotsListProps {
  instructorId: string;
  clubId?: string;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}


const ManagedSlotsList: React.FC<ManagedSlotsListProps> = ({ instructorId, clubId, selectedDate: externalDate, onDateChange }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isProcessing, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date>(externalDate || startOfDay(new Date()));
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [selectedSlotForEnrollment, setSelectedSlotForEnrollment] = useState<TimeSlot | null>(null);
  const [selectedOptionSize, setSelectedOptionSize] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSpotIndex, setSelectedSpotIndex] = useState<number>(0);
  const { toast } = useToast();
  // Sincronizar con fecha externa
  useEffect(() => {
    if (externalDate && externalDate.getTime() !== selectedDate.getTime()) {
      setSelectedDate(externalDate);
    }
  }, [externalDate]);

  // Función para cambiar fecha y notificar al padre
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  // Generar horarios desde 6:00 hasta 23:00 cada 30 minutos
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  const dateStripDates = useMemo(() => {
    const todayAnchor = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => addDays(todayAnchor, i));
  }, []);

  useEffect(() => {
    const loadSlots = async () => {
      // Avoid fetching if no instructor ID
      if (!instructorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // ✅ USAR API REAL seeking { slots, pagination }
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const clubIdParam = clubId ? `&clubId=${clubId}` : '';
        const response = await fetch(`/api/timeslots?instructorId=${instructorId}&date=${dateStr}&limit=1000${clubIdParam}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
        }

        const result = await response.json();
        // Corregido: API devuelve { slots: [], pagination: {} }
        let fetchedSlots: any[] = result.slots || result.timeSlots || [];

        // Sort by start time
        fetchedSlots.sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());

        setSlots(fetchedSlots.map((s: any) => ({
          ...s,
          // Handle both ISO strings and timestamps safely
          startTime: new Date(s.start).toISOString(),
          endTime: new Date(s.end).toISOString(),
          designatedGratisSpotPlaceholderIndexForOption: s.designatedGratisSpotPlaceholderIndexForOption || {},
        })));
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch instructor time slots:", err);
        setError(`No se pudieron cargar tus clases: ${err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [instructorId, clubId, refreshKey, selectedDate]);

  const handleRemoveBookingCallback = (slotId: string, userId: string, groupSize: 1 | 2 | 3 | 4) => {
    const actionKey = `remove-${slotId}-${userId}-${groupSize}`;
    setProcessingAction(actionKey);
    startTransition(async () => {
      try {
        const result = await removeBookingFromTimeSlotInState(slotId, userId, groupSize);
        if (result && typeof result === 'object' && 'error' in result) {
          toast({ title: 'Error al Eliminar', description: String((result as any).error), variant: 'destructive' });
        } else {
          toast({ title: 'Reserva Eliminada', description: 'Se ha eliminado la inscripción del alumno.', className: 'bg-accent text-accent-foreground' });
          setRefreshKey(prev => prev + 1);
        }
      } catch (err) {
        console.error("Error removing booking:", err);
        toast({ title: 'Error Inesperado', description: 'Ocurrió un problema al eliminar la reserva.', variant: 'destructive' });
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handleOpenStudentSelectCallback = (slot: TimeSlot, optionSize: 1 | 2 | 3 | 4, spotIndexVisual: number) => {
    setSelectedSlotForEnrollment(slot);
    setSelectedOptionSize(optionSize);
    setSelectedSpotIndex(spotIndexVisual);
    setIsStudentDialogOpen(true);
  };

  const handleToggleGratisCallback = (slotId: string, optionSize: 1 | 2 | 3 | 4, spotIndexVisual: number) => {
    const actionKey = `gratis-${slotId}-${optionSize}-${spotIndexVisual}`;
    setProcessingAction(actionKey);
    startTransition(async () => {
      const slotToUpdate = slots.find(s => s.id === slotId);
      if (!slotToUpdate) {
        toast({ title: 'Error', description: 'No se encontró la clase para actualizar.', variant: 'destructive' });
        setProcessingAction(null);
        return;
      }

      try {
        await toggleGratisSpot(slotId, optionSize, spotIndexVisual);
        toast({ title: 'Estado de Plaza Gratis Actualizado', description: 'Se ha cambiado el estado de la plaza.', className: 'bg-primary text-primary-foreground' });
        setRefreshKey(prev => prev + 1);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'No se pudo actualizar la plaza.', variant: 'destructive' });
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handleCancelClass = (slotId: string) => {
    const actionKey = `cancel-class-${slotId}`;
    setProcessingAction(actionKey);
    startTransition(async () => {
      try {
        const result = await cancelClassByInstructor(slotId);
        if ('error' in result) {
          toast({ title: "Error al Cancelar Clase", description: result.error, variant: "destructive" });
        } else {
          toast({ title: "Clase Cancelada", description: result.message, className: "bg-destructive text-destructive-foreground", duration: 7000 });
          setRefreshKey(prevKey => prevKey + 1);
        }
      } catch (error) {
        toast({ title: "Error al Cancelar", description: "No se pudo cancelar la clase.", variant: "destructive" });
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const renderSlotItem = (slot: TimeSlot) => {
    const slotLevel = slot.level || 'abierto';
    const slotCategory = slot.category || 'abierta';
    const courtNumber = slot.courtNumber || 'N/A';
    const { completed: isSlotCompletedOverall, size: completedClassSizeOverall } = isSlotEffectivelyCompleted(slot);
    const isPreInscripcion = false; // Placeholder for promotion logic
    const cancelClassActionKey = `cancel-class-${slot.id}`;
    const isCancellingThisClass = processingAction === cancelClassActionKey;
    const canCancelClass = !isPreInscripcion;

    const CategoryIcon = slotCategory === 'chica' ? Venus : slotCategory === 'chico' ? Mars : Users2;
    const categoryColorClass = slotCategory === 'chica' ? 'text-pink-600 border-pink-300 bg-pink-50' :
      slotCategory === 'chico' ? 'text-sky-600 border-sky-300 bg-sky-50' :
        'text-indigo-600 border-indigo-300 bg-indigo-50';

    return (
      <div key={slot.id} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300 relative group">
        {/* Header con Gradiente - Compacto */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1.5 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 z-10">
            <CalendarCheck className="h-3 w-3 opacity-90" />
            {format(new Date(slot.startTime), "eee d MMM", { locale: es })}
          </span>
        </div>

        {/* Info Principal - Hora y Detalles Compactos */}
        <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center text-gray-800 font-bold text-sm tracking-tight">
              {format(new Date(slot.startTime), 'HH:mm', { locale: es })}
              <span className="text-gray-300 font-light mx-1">|</span>
              {format(new Date(slot.endTime), 'HH:mm', { locale: es })}
            </div>
            {courtNumber && courtNumber !== 'N/A' && (
              <div className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full flex items-center gap-0.5">
                <Hash className="h-2.5 w-2.5" />
                PISTA {courtNumber}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-white border-gray-200 text-gray-600 font-medium whitespace-nowrap gap-0.5 hover:bg-gray-50">
              <BarChart className="h-2.5 w-2.5 -rotate-90 text-gray-400" />
              {displayClassLevel(slotLevel)}
            </Badge>
            {slotCategory !== 'abierta' && (
              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 whitespace-nowrap gap-0.5", categoryColorClass)}>
                <CategoryIcon className="h-2.5 w-2.5" />
                {displayClassCategory(slotCategory)}
              </Badge>
            )}
            {isSlotCompletedOverall && completedClassSizeOverall && (
              <Badge variant="default" className="text-[9px] h-4 px-1 bg-green-500 text-white hover:bg-green-600 border-0 gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" />
                Conf. ({completedClassSizeOverall})
              </Badge>
            )}
          </div>
        </div>

        {/* Lista de Opciones de Reserva - Compacta */}
        <div className="p-2 flex-grow space-y-1">
          {([1, 2, 3, 4] as const).map(optionSize => (
            <div key={`${slot.id}-${optionSize}`} className="origin-left w-[100%] scale-[0.95]">
              <InstructorBookingOption
                key={`${slot.id}-${optionSize}`}
                slot={slot}
                optionSize={optionSize}
                playersInThisOption={(slot.bookedPlayers || []).filter(p => p.groupSize === optionSize)}
                isSlotCompletedOverall={isSlotCompletedOverall}
                isProcessingAction={isProcessing}
                processingActionKey={processingAction}
                onOpenStudentSelect={handleOpenStudentSelectCallback}
                onToggleGratis={handleToggleGratisCallback}
                onRemoveBooking={handleRemoveBookingCallback}
                isCancellingClass={isCancellingThisClass}
              />
            </div>
          ))}
        </div>

        {/* Footer de Acciones - Compacto */}
        <div className="p-2 bg-gray-50 border-t border-gray-100 mt-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full text-[10px] font-semibold shadow-sm hover:bg-red-600 transition-all h-7 px-2"
                disabled={isProcessing || isCancellingThisClass || !canCancelClass}
              >
                {isCancellingThisClass ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CalendarX className="mr-1.5 h-3 w-3" />}
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar esta clase?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se notificará a los alumnos y se procesarán los reembolsos correspondientes.
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm font-medium text-gray-800">
                    {format(new Date(slot.startTime), "eeee, d 'de' MMMM", { locale: es })} • {format(new Date(slot.startTime), 'HH:mm', { locale: es })}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleCancelClass(slot.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCancellingThisClass ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Cancelación'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}</div>;
  if (error) return <div className="text-destructive p-4">{error}</div>;

  const toggleTimeSlot = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const selectAll = () => {
    setSelectedTimes(timeSlots);
  };

  const clearAll = () => {
    setSelectedTimes([]);
  };

  const handleCreateBatchClasses = async () => {
    if (selectedTimes.length === 0) {
      toast({ title: 'Sin horarios', description: 'Selecciona al menos un horario', variant: 'destructive' });
      return;
    }

    setIsCreatingBatch(true);
    try {
      // Obtener instructor desde API real
      const instructorResponse = await fetch(`/api/instructors/${instructorId}`);
      if (!instructorResponse.ok) {
        toast({ title: 'Error', description: 'No se pudo obtener información del instructor', variant: 'destructive' });
        setIsCreatingBatch(false);
        return;
      }

      const instructor = await instructorResponse.json();

      if (!instructor.clubId && !instructor.assignedClubId) {
        toast({ title: 'Sin Club Asignado', description: 'Debes estar asignado a un club para crear clases', variant: 'destructive' });
        setIsCreatingBatch(false);
        return;
      }

      // ✅ VALIDACIÓN: Verificar si el instructor tiene rangos de nivel configurados
      const hasLevelRanges = instructor.levelRanges &&
        (typeof instructor.levelRanges === 'string' ? JSON.parse(instructor.levelRanges).length > 0 : instructor.levelRanges.length > 0);

      if (!hasLevelRanges) {
        toast({
          title: 'Configura tus Rangos de Nivel',
          description: 'Debes configurar tus rangos de nivel en Preferencias antes de crear propuestas de clases. Las clases se crearán como "Nivel Abierto" por defecto.',
          variant: 'destructive',
          duration: 6000
        });
        setIsCreatingBatch(false);
        return;
      }

      const clubId = instructor.clubId || instructor.assignedClubId;

      let successCount = 0;
      let errorCount = 0;

      for (const timeStr of selectedTimes) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);

        try {
          const response = await fetch('/api/timeslots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clubId: clubId,
              startTime: startDateTime.toISOString(),
              instructorId: instructorId,
              maxPlayers: 4,
              level: 'abierto',
              category: 'abierta',
              durationMinutes: 60
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: '¡Propuestas Creadas!',
          description: `Se crearon ${successCount} propuestas de clase${successCount > 1 ? 's' : ''}`,
          className: 'bg-primary text-primary-foreground'
        });
        setSelectedTimes([]);
        setRefreshKey(prev => prev + 1);
      }

      if (errorCount > 0) {
        toast({
          title: 'Algunas clases fallaron',
          description: `${errorCount} clase${errorCount > 1 ? 's' : ''} no se pudo${errorCount > 1 ? 'ieron' : ''} crear`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al crear las propuestas', variant: 'destructive' });
    } finally {
      setIsCreatingBatch(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Selector de fecha */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Selecciona el Día</h3>
        <ScrollArea className="w-full whitespace-nowrap pb-2 -mx-1">
          <div className="flex items-center space-x-2 px-1">
            {dateStripDates.map(day => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <Button key={day.toISOString()} variant={isSelected ? "default" : "outline"} size="sm"
                  className={cn(
                    "h-auto px-2 py-1 flex flex-col items-center justify-center leading-tight shadow-sm",
                    isSameDay(day, new Date()) && !isSelected && "border-primary text-primary font-semibold",
                    isSelected && "shadow-md"
                  )}
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedTimes([]); // Limpiar selección al cambiar día
                  }}
                >
                  <span className="font-bold text-xs uppercase">{format(day, "EEE", { locale: es }).slice(0, 3)}</span>
                  <span className="text-lg font-bold my-0.5">{format(day, "d", { locale: es })}</span>
                  <span className="text-xs text-muted-foreground capitalize">{format(day, "MMM", { locale: es }).slice(0, 3)}</span>
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-2 mt-1" />
        </ScrollArea>
      </div>

      {/* Selector de horarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Selecciona Horarios</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>Todo Abierto</Button>
            <Button variant="outline" size="sm" onClick={clearAll}>Todo Cerrado</Button>
          </div>
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex items-center gap-2 px-1">
            {timeSlots.map(time => {
              const isSelected = selectedTimes.includes(time);
              return (
                <Button
                  key={time}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTimeSlot(time)}
                  className={cn(
                    "h-16 px-3 flex flex-col items-center justify-center min-w-[60px]",
                    isSelected && "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  <span className="text-sm font-bold">{time}</span>
                  <span className="text-xs mt-1">•</span>
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-2 mt-1" />
        </ScrollArea>

        <div className="mt-4 flex items-center gap-4">
          <Button
            onClick={handleCreateBatchClasses}
            disabled={selectedTimes.length === 0 || isCreatingBatch}
            className="flex-1"
          >
            {isCreatingBatch ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
            ) : (
              <><PlusCircle className="mr-2 h-4 w-4" />Añadir {selectedTimes.length} Propuesta{selectedTimes.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>
      </div>

      {/* Lista de clases existentes */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Clases del {format(selectedDate, "d 'de' MMMM", { locale: es })}</h3>
        {slots.length === 0 ? (
          <p className="text-muted-foreground italic text-center py-4">No tienes clases publicadas para este día.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">{slots.map(renderSlotItem)}</div>
        )}
      </div>

      {/* Student Search Dialog - TEMPORARILY DISABLED due to missing file */}
      {/* <StudentSearchDialog
        isOpen={isStudentDialogOpen}
        onOpenChange={setIsStudentDialogOpen}
        onSelectStudent={async (student) => {
           // ... implementation ...
        }} 
      /> */}
    </div>
  );
};

export default React.memo(ManagedSlotsList);

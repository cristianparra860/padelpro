'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Tag, Save, Trash2 } from 'lucide-react';

interface InstructorCourtReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  courtId: string;
  courtNumber: number;
  timeSlot: string; // "HH:mm" formato
  date: Date;
  existingReservation?: {
    id: string;
    duration: number;
    label: string;
  } | null;
  onSuccess: () => void;
}

export default function InstructorCourtReservationDialog({
  open,
  onOpenChange,
  instructorId,
  courtId,
  courtNumber,
  timeSlot,
  date,
  existingReservation,
  onSuccess,
}: InstructorCourtReservationDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(existingReservation?.duration || 60);
  const [label, setLabel] = useState<string>(existingReservation?.label || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const durations = [
    { value: 30, label: '30 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
    { value: 120, label: '120 min' },
  ];

  const handleSave = async () => {
    if (!label.trim()) {
      toast({
        title: 'Error',
        description: 'Debes agregar una etiqueta para la reserva',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const [hours, minutes] = timeSlot.split(':').map(Number);
      
      // Crear timestamp de inicio
      const startDateTime = new Date(date);
      startDateTime.setHours(hours, minutes, 0, 0);

      const response = await fetch('/api/instructor/court-reservations', {
        method: existingReservation ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: existingReservation?.id,
          instructorId,
          courtId,
          startTime: startDateTime.toISOString(),
          duration: selectedDuration,
          label: label.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar la reserva');
      }

      toast({
        title: '✅ Reserva guardada',
        description: `Pista ${courtNumber} reservada para ${label}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving reservation:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la reserva',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReservation) return;

    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/instructor/court-reservations?id=${existingReservation.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la reserva');
      }

      toast({
        title: '✅ Reserva eliminada',
        description: 'La reserva ha sido eliminada correctamente',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la reserva',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {existingReservation ? 'Editar Reserva' : 'Nueva Reserva de Pista'}
          </DialogTitle>
          <DialogDescription>
            Pista {courtNumber} - {timeSlot} - {date.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selector de duración */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duración
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  onClick={() => setSelectedDuration(duration.value)}
                  className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                    selectedDuration === duration.value
                      ? 'bg-primary text-primary-foreground shadow-md scale-105'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hora de fin calculada */}
          <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <span className="font-medium">Horario:</span> {timeSlot} - {(() => {
              const [hours, minutes] = timeSlot.split(':').map(Number);
              const endMinutes = hours * 60 + minutes + selectedDuration;
              const endHours = Math.floor(endMinutes / 60);
              const endMins = endMinutes % 60;
              return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
            })()}
          </div>

          {/* Input de etiqueta */}
          <div className="space-y-3">
            <Label htmlFor="label" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Etiqueta de la Reserva
            </Label>
            <Input
              id="label"
              placeholder='Ej: "Clase Junior", "Clase Senior", "Entrenamiento Personal"'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={50}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Esta etiqueta te ayudará a identificar el propósito de la reserva en el calendario
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {existingReservation && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || deleting}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {existingReservation ? 'Actualizar' : 'Reservar'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

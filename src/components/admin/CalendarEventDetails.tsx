'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Info,
  X,
  Edit,
  Trash2
} from 'lucide-react';

interface CalendarEventDetailsProps {
  event: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: any) => void;
  onCancel?: (event: any) => void;
}

export default function CalendarEventDetails({
  event,
  open,
  onClose,
  onEdit,
  onCancel
}: CalendarEventDetailsProps) {
  if (!event) return null;

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'class-proposal': return 'Clase Propuesta';
      case 'class-confirmed': return 'Clase Confirmada';
      case 'match': return 'Partido';
      case 'instructor-blocked': return 'Instructor No Disponible';
      case 'court-blocked': return 'Pista No Disponible';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class-proposal': return 'bg-orange-500';
      case 'class-confirmed': return 'bg-green-500';
      case 'match': return 'bg-blue-500';
      case 'instructor-blocked':
      case 'court-blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`} />
            {event.title}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mt-2">
              {getEventTypeLabel(event.type)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fecha y hora */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{formatDate(event.start)}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(event.start)} - {formatTime(event.end)}
              </p>
            </div>
          </div>

          {/* Instructor */}
          {event.instructorName && (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {event.instructorPhoto && (
                  <AvatarImage src={event.instructorPhoto} alt={event.instructorName} />
                )}
                <AvatarFallback>
                  {event.instructorName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Instructor</p>
                <p className="text-sm text-muted-foreground">{event.instructorName}</p>
              </div>
            </div>
          )}

          {/* Pista */}
          {event.courtNumber && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Pista</p>
                <p className="text-sm text-muted-foreground">
                  Pista {event.courtNumber}
                  {event.courtName && ` - ${event.courtName}`}
                </p>
              </div>
            </div>
          )}

          {/* Jugadores (para clases) */}
          {event.playersCount !== undefined && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Jugadores</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {event.playersCount} / {event.maxPlayers} inscritos
                  </p>
                  {event.playersCount >= event.maxPlayers && (
                    <Badge variant="secondary" className="text-xs">Completo</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Nivel (para clases) */}
          {event.level && (
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Nivel</p>
                <Badge variant="outline">{event.level}</Badge>
                {event.category && (
                  <Badge variant="outline" className="ml-2">{event.category}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Precio (para clases) */}
          {event.price && (
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Precio</p>
                <p className="text-sm text-muted-foreground">€{event.price.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Razón de bloqueo */}
          {event.reason && (
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Motivo</p>
                <p className="text-sm text-muted-foreground">{event.reason}</p>
              </div>
            </div>
          )}

          {/* Estado */}
          {event.status && (
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Estado</p>
                <Badge>{event.status}</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {onEdit && (event.type === 'class-proposal' || event.type === 'class-confirmed') && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit(event);
                onClose();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          
          {onCancel && (event.type === 'class-proposal' || event.type === 'class-confirmed' || event.type === 'match') && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('¿Estás seguro de que quieres cancelar este evento?')) {
                  onCancel(event);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

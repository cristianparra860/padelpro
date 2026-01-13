"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, PlusCircle, RefreshCw, Edit2, Euro } from 'lucide-react';
import { getMockClubs } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import ClubOpeningHours from './ClubOpeningHours';
import type { Club } from '@/types';

interface PriceSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  price: number;
  daysOfWeek: string; // JSON string
  priority: number;
  isActive: boolean;
}

interface ManageCourtRatesPanelDBProps {
  clubId: string;
}

const DAYS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ManageCourtRatesPanelDB: React.FC<ManageCourtRatesPanelDBProps> = ({ clubId }) => {
  const { toast } = useToast();
  const [club, setClub] = useState<Club | null>(null);
  const [priceSlots, setPriceSlots] = useState<PriceSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PriceSlot | null>(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '12:00',
    price: 10,
    daysOfWeek: [] as number[],
    priority: 0
  });

  useEffect(() => {
    const loadClubDate = async () => {
      try {
        const response = await fetch(`/api/clubs/${clubId}`);
        if (response.ok) {
          const data = await response.json();
          setClub(data);
        } else {
          console.error('Error loading club:', await response.text());
          toast({
            title: "Error",
            description: "No se pudo cargar la información del club",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading club:', error);
      }
    };

    if (clubId) {
      loadClubDate();
    }
    loadPriceSlots();
  }, [clubId]);

  const loadPriceSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clubs/${clubId}/price-slots`);
      const data = await response.json();

      setPriceSlots(data.map((slot: any) => ({
        ...slot,
        daysOfWeek: typeof slot.daysOfWeek === 'string' ? slot.daysOfWeek : JSON.stringify(slot.daysOfWeek || [])
      })));
    } catch (error) {
      console.error('Error cargando franjas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las franjas horarias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (slot?: PriceSlot) => {
    if (slot) {
      setEditingSlot(slot);
      setFormData({
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price,
        daysOfWeek: JSON.parse(slot.daysOfWeek),
        priority: slot.priority
      });
    } else {
      setEditingSlot(null);
      setFormData({
        name: '',
        startTime: '09:00',
        endTime: '12:00',
        price: 10,
        daysOfWeek: [],
        priority: 0
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || formData.daysOfWeek.length === 0) {
        toast({
          title: "Campos incompletos",
          description: "Completa todos los campos requeridos",
          variant: "destructive"
        });
        return;
      }

      const url = editingSlot
        ? `/api/admin/clubs/${clubId}/price-slots/${editingSlot.id}`
        : `/api/admin/clubs/${clubId}/price-slots`;

      const method = editingSlot ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      toast({
        title: editingSlot ? "Franja actualizada" : "Franja creada",
        description: "Los cambios se han guardado correctamente",
        className: "bg-green-600 text-white"
      });

      setIsDialogOpen(false);
      loadPriceSlots();
    } catch (error) {
      console.error('Error guardando:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la franja horaria",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta franja horaria?')) return;

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/price-slots/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      toast({
        title: "Franja eliminada",
        description: "La franja horaria ha sido eliminada",
        className: "bg-red-600 text-white"
      });

      loadPriceSlots();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la franja horaria",
        variant: "destructive"
      });
    }
  };

  const handleUpdateFuturePrices = async () => {
    setIsUpdatingPrices(true);

    try {
      // Primero obtener el usuario actual
      console.log('🔍 Obteniendo usuario actual...');
      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) {
        const authError = await authResponse.text();
        console.error('❌ Error auth:', authError);
        throw new Error('No se pudo obtener el usuario actual');
      }

      const authData = await authResponse.json();
      console.log('👤 Usuario actual:', authData.user);
      const userId = authData.user?.id;

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Ahora actualizar los precios con el userId
      console.log('💰 Actualizando precios con:', { clubId, userId });
      const response = await fetch('/api/admin/update-future-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          userId
        })
      });

      const result = await response.json();
      console.log('📊 Respuesta del servidor:', result);

      if (!response.ok) {
        console.error('❌ Error del servidor:', result);
        console.error('❌ Detalles:', result.details);
        console.error('❌ Stack:', result.stack);
        throw new Error(result.details || result.error || `Error ${response.status}: ${response.statusText}`);
      }

      toast({
        title: "¡Precios actualizados!",
        description: `Se actualizaron ${result.updated} clases sin usuarios. ${result.details?.withBookings > 0 ? `(${result.details.withBookings} clases con reservas no se modificaron)` : ''}`,
        className: "bg-green-600 text-white"
      });

      // Disparar evento personalizado para notificar al calendario que debe refrescarse
      window.dispatchEvent(new CustomEvent('pricesUpdated', {
        detail: { clubId, updated: result.updated }
      }));

      // Recargar la página después de 2 segundos para mostrar los nuevos precios
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ Error actualizando precios futuros:', error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado";
      console.error('📝 Mensaje de error:', errorMessage);

      toast({
        title: "Error al actualizar precios",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Cargando franjas horarias...</div>;
  }

  if (!club) {
    return <div className="text-center py-8">Club no encontrado</div>;
  }

  const handleClubUpdated = (updatedClub: Club) => {
    setClub(updatedClub);
  };

  return (
    <div className="space-y-6">
      {/* Horario de Apertura del Club */}
      <ClubOpeningHours club={club} onHoursUpdated={handleClubUpdated} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tarifas de Pista</CardTitle>
              <CardDescription>
                Define los precios de las pistas por franjas horarias y días de la semana
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Franja
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {priceSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay franjas horarias configuradas. Crea una para empezar.
            </div>
          ) : (
            <div className="space-y-4">
              {priceSlots.map((slot) => {
                const days = JSON.parse(slot.daysOfWeek);
                return (
                  <div key={slot.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{slot.name}</h3>
                        <Badge variant="secondary">
                          <Euro className="h-3 w-3 mr-1" />
                          {slot.price.toFixed(2)}/hora
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>⏰ {slot.startTime} - {slot.endTime}</div>
                        <div>📅 {days.map((d: number) => DAYS_LABELS[d]).join(', ')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDialog(slot)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(slot.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleUpdateFuturePrices}
          disabled={isUpdatingPrices}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdatingPrices ? 'animate-spin' : ''}`} />
          {isUpdatingPrices ? 'Actualizando...' : 'Aplicar a Clases Futuras'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Después de modificar las tarifas, usa el botón "Aplicar a Clases Futuras"
        para actualizar los precios de clases sin usuarios inscritos (no afecta a clases con reservas confirmadas).
      </p>

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? 'Editar Franja Horaria' : 'Nueva Franja Horaria'}
            </DialogTitle>
            <DialogDescription>
              Configura el precio de alquiler de pista para una franja horaria específica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Franja</Label>
              <Input
                placeholder="Ej: Horario Valle, Horario Punta"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Precio por Hora (€)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Días de la Semana</Label>
              <div className="flex gap-2">
                {DAYS_LABELS.map((label, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant={formData.daysOfWeek.includes(idx) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(idx)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageCourtRatesPanelDB;

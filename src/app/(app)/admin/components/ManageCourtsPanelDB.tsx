"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit2, ServerIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Court {
  id: string;
  number: number;
  name: string | null;
  clubId: string;
}

interface ManageCourtsPanelDBProps {
  clubId: string;
}

const ManageCourtsPanelDB: React.FC<ManageCourtsPanelDBProps> = ({ clubId }) => {
  const { toast } = useToast();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [realClubId, setRealClubId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    number: 1,
    name: ''
  });

  // Obtener el ID real del club desde la API
  useEffect(() => {
    const fetchRealClubId = async () => {
      try {
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Error cargando clubs');
        const clubs = await response.json();
        
        // Usar el primer club disponible (en producción habría lógica para seleccionar el correcto)
        if (clubs.length > 0) {
          setRealClubId(clubs[0].id);
          console.log('✅ Club ID real:', clubs[0].id, '| Nombre:', clubs[0].name);
        }
      } catch (error) {
        console.error('Error obteniendo club real:', error);
        toast({
          title: "Error",
          description: "No se pudo obtener el ID del club",
          variant: "destructive"
        });
      }
    };
    
    fetchRealClubId();
  }, [toast]);

  useEffect(() => {
    if (realClubId) {
      loadCourts();
    }
  }, [realClubId]);

  const loadCourts = async () => {
    if (!realClubId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Cargando pistas para club:', realClubId);
      
      const response = await fetch(`/api/admin/clubs/${realClubId}/courts`);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Pistas cargadas:', data.length);
      
      setCourts(data);
    } catch (error) {
      console.error('❌ Error cargando pistas:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar las pistas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (court?: Court) => {
    if (court) {
      setEditingCourt(court);
      setFormData({
        number: court.number,
        name: court.name || ''
      });
    } else {
      setEditingCourt(null);
      // Calcular el siguiente número disponible
      const maxNumber = courts.length > 0 ? Math.max(...courts.map(c => c.number)) : 0;
      setFormData({
        number: maxNumber + 1,
        name: `Pista ${maxNumber + 1}`
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!realClubId) {
      toast({
        title: "Error",
        description: "No se pudo determinar el ID del club",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (!formData.name || formData.number < 1) {
        toast({
          title: "Campos incompletos",
          description: "Completa todos los campos requeridos",
          variant: "destructive"
        });
        return;
      }

      const url = editingCourt
        ? `/api/admin/clubs/${realClubId}/courts/${editingCourt.id}`
        : `/api/admin/clubs/${realClubId}/courts`;
      
      const method = editingCourt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar');
      }

      toast({
        title: editingCourt ? "Pista actualizada" : "Pista creada",
        description: `${formData.name} (#${formData.number})`,
        className: "bg-green-600 text-white"
      });

      setIsDialogOpen(false);
      loadCourts();
    } catch (error) {
      console.error('Error guardando:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la pista",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (court: Court) => {
    if (!confirm(`¿Eliminar ${court.name || 'Pista #' + court.number}?`)) return;

    if (!realClubId) {
      toast({
        title: "Error",
        description: "No se pudo determinar el ID del club",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/clubs/${realClubId}/courts/${court.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar');
      }

      toast({
        title: "Pista eliminada",
        description: `${court.name || 'Pista #' + court.number} ha sido eliminada`,
        className: "bg-red-600 text-white"
      });

      loadCourts();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la pista",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando pistas...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="h-5 w-5" />
                Gestión de Pistas
              </CardTitle>
              <CardDescription>
                Administra las pistas de pádel del club
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Pista
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {courts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay pistas configuradas. Crea una para empezar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courts.map((court) => (
                <Card key={court.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-lg font-bold">
                        #{court.number}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(court)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(court)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">
                      {court.name || `Pista ${court.number}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ServerIcon className="h-4 w-4" />
                      <span>Pista de Pádel</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {courts.length > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>Total de pistas:</strong> {courts.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCourt ? 'Editar Pista' : 'Nueva Pista'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles de la pista de pádel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Pista *</Label>
              <Input
                type="number"
                min="1"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Número identificador único de la pista
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nombre de la Pista *</Label>
              <Input
                placeholder="Ej: Pista Central, Pista 1, etc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingCourt ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageCourtsPanelDB;

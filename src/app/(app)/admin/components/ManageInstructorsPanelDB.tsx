"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit2, GraduationCap, Mail, DollarSign, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Instructor {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  hourlyRate: number;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

interface ManageInstructorsPanelDBProps {
  clubId: string;
}

const ManageInstructorsPanelDB: React.FC<ManageInstructorsPanelDBProps> = ({ clubId }) => {
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '',
    hourlyRate: 25,
    bio: ''
  });

  useEffect(() => {
    loadInstructors();
  }, [clubId]);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando instructores para club:', clubId);
      
      const response = await fetch(`/api/admin/clubs/${clubId}/instructors`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Instructores cargados:', data.length);
      
      setInstructors(data);
    } catch (error) {
      console.error('❌ Error cargando instructores:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los instructores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (instructor?: Instructor) => {
    if (instructor) {
      setEditingInstructor(instructor);
      setFormData({
        name: instructor.name,
        email: instructor.email,
        specialty: instructor.specialty || '',
        hourlyRate: instructor.hourlyRate,
        bio: instructor.bio || ''
      });
    } else {
      setEditingInstructor(null);
      setFormData({
        name: '',
        email: '',
        specialty: '',
        hourlyRate: 25,
        bio: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInstructor(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) {
        toast({
          title: "Error",
          description: "Nombre y email son requeridos",
          variant: "destructive"
        });
        return;
      }

      const url = editingInstructor
        ? `/api/admin/clubs/${clubId}/instructors/${editingInstructor.id}`
        : `/api/admin/clubs/${clubId}/instructors`;

      const method = editingInstructor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      toast({
        title: "Éxito",
        description: editingInstructor ? "Instructor actualizado" : "Instructor creado"
      });

      handleCloseDialog();
      loadInstructors();
    } catch (error) {
      console.error('❌ Error guardando instructor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar instructor",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (instructorId: string) => {
    if (!confirm('¿Estás seguro de eliminar este instructor? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/instructors/${instructorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      toast({
        title: "Éxito",
        description: "Instructor eliminado correctamente"
      });

      loadInstructors();
    } catch (error) {
      console.error('❌ Error eliminando instructor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar instructor",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando instructores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Instructores</h3>
          <p className="text-sm text-muted-foreground">{instructors.length} instructor(es) registrado(s)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo Instructor
        </Button>
      </div>

      {/* Instructors Grid */}
      {instructors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay instructores</h3>
              <p className="text-muted-foreground mb-4">Crea tu primer instructor para el club</p>
              <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Crear Instructor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors.map((instructor) => (
            <Card key={instructor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={instructor.profilePictureUrl || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        {instructor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{instructor.name}</CardTitle>
                      {instructor.specialty && (
                        <Badge variant="secondary" className="mt-1">
                          <Award className="h-3 w-3 mr-1" />
                          {instructor.specialty}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(instructor)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(instructor.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{instructor.email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-600">
                    €{instructor.hourlyRate.toFixed(2)}/hora
                  </span>
                </div>

                {instructor.bio && (
                  <CardDescription className="text-xs line-clamp-2">
                    {instructor.bio}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingInstructor ? 'Editar Instructor' : 'Nuevo Instructor'}
            </DialogTitle>
            <DialogDescription>
              {editingInstructor ? 'Modifica los datos del instructor' : 'Completa los datos del nuevo instructor'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ej: Entrenador profesional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Tarifa por hora (€) *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografía / Descripción</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Información adicional sobre el instructor..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingInstructor ? 'Guardar Cambios' : 'Crear Instructor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageInstructorsPanelDB;

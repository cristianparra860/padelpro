"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  MapPin, 
  Mail, 
  Phone,
  Globe,
  Loader2,
  DollarSign,
  Eye,
  Link as LinkIcon
} from 'lucide-react';

interface Club {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  description: string | null;
  courtRentalPrice: number;
  openingHours: string | null;
  courtsCount?: number;
  instructorsCount?: number;
  usersCount?: number;
}

interface ClubFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  courtRentalPrice: number;
  openingHours: string;
}

export default function ClubsManagement() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<ClubFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    courtRentalPrice: 0,
    openingHours: '09:00-22:00'
  });

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clubs');
      if (!response.ok) throw new Error('Error al cargar clubes');
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error('Error loading clubs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clubes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      description: '',
      courtRentalPrice: 0,
      openingHours: '09:00-22:00'
    });
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del club es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    const slug = generateSlug(formData.name);

    try {
      setSaving(true);
      const response = await fetch('/api/superadmin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          slug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear club');
      }

      const newClub = await response.json();

      toast({
        title: '✅ Club creado',
        description: `El club "${formData.name}" ha sido creado exitosamente con slug: ${slug}`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      loadClubs();
    } catch (error: any) {
      console.error('Error creating club:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el club',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      address: club.address || '',
      phone: club.phone || '',
      email: club.email || '',
      website: club.website || '',
      description: club.description || '',
      courtRentalPrice: club.courtRentalPrice,
      openingHours: club.openingHours || '09:00-22:00'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingClub) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/superadmin/clubs/${editingClub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar club');
      }

      toast({
        title: '✅ Club actualizado',
        description: `El club "${formData.name}" ha sido actualizado exitosamente.`,
      });

      setIsEditDialogOpen(false);
      setEditingClub(null);
      resetForm();
      loadClubs();
    } catch (error: any) {
      console.error('Error updating club:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el club',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (club: Club) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el club "${club.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/clubs/${club.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar club');
      }

      toast({
        title: '✅ Club eliminado',
        description: `El club "${club.name}" ha sido eliminado.`,
      });

      loadClubs();
    } catch (error: any) {
      console.error('Error deleting club:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el club',
        variant: 'destructive'
      });
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.address && club.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (club.email && club.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏢 Gestión de Clubes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Administra todos los clubes de la plataforma multi-tenant
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Club
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Club</DialogTitle>
              <DialogDescription>
                Añade un nuevo club a la plataforma PadelPro. Se generará automáticamente un slug único.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nombre del Club <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Padel Estrella Madrid"
                />
                {formData.name && (
                  <p className="text-xs text-muted-foreground">
                    Slug: <code className="bg-gray-100 px-2 py-1 rounded">{generateSlug(formData.name)}</code>
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Ej: Madrid, España"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="info@club.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+34 123 456 789"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://www.club.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción del club..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="courtRentalPrice">Precio Alquiler Pista (€)</Label>
                  <Input
                    id="courtRentalPrice"
                    type="number"
                    value={formData.courtRentalPrice}
                    onChange={(e) => setFormData({...formData, courtRentalPrice: parseFloat(e.target.value) || 0})}
                    placeholder="25.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="openingHours">Horario</Label>
                  <Input
                    id="openingHours"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({...formData, openingHours: e.target.value})}
                    placeholder="09:00-22:00"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Club'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clubes</p>
                <p className="text-2xl font-bold">{clubs.length}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clubes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Clubes ({filteredClubs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              Lista de todos los clubes registrados en la plataforma
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Precio/Pista</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron clubes
                  </TableCell>
                </TableRow>
              ) : (
                filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{club.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {club.address || 'Sin dirección'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {club.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {club.email}
                          </div>
                        )}
                        {club.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {club.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <DollarSign className="h-3 w-3" />
                        {club.courtRentalPrice}€
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {club.openingHours || 'No especificado'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const slug = generateSlug(club.name);
                            window.open(`/${slug}/demo`, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(club)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(club)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Club</DialogTitle>
            <DialogDescription>
              Modifica los datos del club seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre del Club</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-website">Sitio Web</Label>
              <Input
                id="edit-website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-courtRentalPrice">Precio Alquiler Pista (€)</Label>
                <Input
                  id="edit-courtRentalPrice"
                  type="number"
                  value={formData.courtRentalPrice}
                  onChange={(e) => setFormData({...formData, courtRentalPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-openingHours">Horario</Label>
                <Input
                  id="edit-openingHours"
                  value={formData.openingHours}
                  onChange={(e) => setFormData({...formData, openingHours: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

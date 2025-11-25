"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit2, User, Mail, CreditCard, Trophy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  blockedCredits: number;
  points: number;
  level: string | null;
  genderCategory: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

interface ManageUsersPanelDBProps {
  clubId: string;
}

const ManageUsersPanelDB: React.FC<ManageUsersPanelDBProps> = ({ clubId }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    level: 'principiante',
    genderCategory: '',
    credits: 0,
    points: 0
  });

  useEffect(() => {
    loadUsers();
  }, [clubId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando usuarios para club:', clubId);
      
      const response = await fetch(`/api/admin/clubs/${clubId}/users`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Usuarios cargados:', data.length);
      
      setUsers(data);
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        level: user.level || 'principiante',
        genderCategory: user.genderCategory || '',
        credits: user.credits,
        points: user.points
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        level: 'principiante',
        genderCategory: '',
        credits: 0,
        points: 0
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
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

      const url = editingUser
        ? `/api/admin/clubs/${clubId}/users/${editingUser.id}`
        : `/api/admin/clubs/${clubId}/users`;

      const method = editingUser ? 'PUT' : 'POST';

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
        description: editingUser ? "Usuario actualizado" : "Usuario creado"
      });

      handleCloseDialog();
      loadUsers();
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar usuario",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente"
      });

      loadUsers();
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar usuario",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelBadgeColor = (level: string | null) => {
    switch (level) {
      case 'principiante': return 'bg-green-100 text-green-800';
      case 'intermedio': return 'bg-blue-100 text-blue-800';
      case 'avanzado': return 'bg-orange-100 text-orange-800';
      case 'abierto': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderIcon = (gender: string | null) => {
    switch (gender) {
      case 'masculino': return '♂️';
      case 'femenino': return '♀️';
      case 'mixto': return '⚧️';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Usuarios</h3>
          <p className="text-sm text-muted-foreground">{users.length} usuario(s) registrado(s)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer usuario'}
              </p>
              {!searchTerm && (
                <Button onClick={() => handleOpenDialog()}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profilePictureUrl || undefined} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {user.name}
                          {user.genderCategory && (
                            <span className="text-sm">{getGenderIcon(user.genderCategory)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getLevelBadgeColor(user.level)} variant="secondary">
                      {user.level || 'Sin nivel'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm">
                      <CreditCard className="h-3 w-3 text-green-600" />
                      <span className="font-medium">€{user.credits.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm">
                      <Trophy className="h-3 w-3 text-yellow-600" />
                      <span className="font-medium">{user.points}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo usuario'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Nivel</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzado">Avanzado</SelectItem>
                    <SelectItem value="abierto">Abierto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={formData.genderCategory || undefined}
                  onValueChange={(value) => setFormData({ ...formData, genderCategory: value === 'unspecified' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Sin especificar</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credits">Créditos (€)</Label>
                <Input
                  id="credits"
                  type="number"
                  step="0.01"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsersPanelDB;

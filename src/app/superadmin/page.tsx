"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import LoginAsDialog from '@/components/admin/LoginAsDialog';
import { 
  Crown,
  Building2, 
  Users, 
  GraduationCap, 
  UserCog,
  BarChart3,
  Plus,
  Eye,
  Trash2,
  ShieldAlert,
  Settings,
  Globe,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn
} from 'lucide-react';

interface Stats {
  clubs: { total: number; active: number };
  courts: { total: number };
  users: { total: number; byRole: Record<string, number> };
  instructors: { total: number };
  admins: { total: number };
  bookings: { total: number; byStatus: Record<string, number> };
  credits: { total: number; blocked: number };
}

interface Club {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  description?: string;
  courtRentalPrice: number;
  adminName: string;
  adminEmail: string;
  courtsCount: number;
  usersCount: number;
  instructorsCount: number;
  playersCount: number;
  clubAdminsCount: number;
  createdAt: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  phone?: string;
  level: string;
  role: string;
  clubId: string;
  clubName: string;
  clubAddress: string;
  credits: number;
  bookingsCount: number;
  confirmedBookingsCount: number;
  createdAt: Date;
}

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  isActive: boolean;
  clubsCount: number;
  clubs: { id: string; name: string; address: string }[];
  createdAt: Date;
}

interface Instructor {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  profilePictureUrl?: string;
  specialties?: string;
  hourlyRate?: number;
  isAvailable: boolean;
  clubId: string;
  clubName: string;
  clubAddress: string;
  classesCount: number;
  createdAt: Date;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterClub, setFilterClub] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [loginAsDialogOpen, setLoginAsDialogOpen] = useState(false);
  const [selectedUserForImpersonation, setSelectedUserForImpersonation] = useState<any>(null);
  const [currentSuperAdminId, setCurrentSuperAdminId] = useState<string>('');
  
  const router = useRouter();
  const { toast } = useToast();

  // Verificar permisos de acceso
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        const userRole = data.user?.role;
        
        // Solo SUPER_ADMIN puede acceder
        if (userRole === 'SUPER_ADMIN') {
          setHasAccess(true);
          const adminId = data.user?.id || '';
          console.log('🔐 Super Admin ID guardado:', adminId);
          setCurrentSuperAdminId(adminId);
        } else {
          setHasAccess(false);
          toast({
            title: "Acceso denegado",
            description: "Solo los super administradores pueden acceder a este panel",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error verificando permisos:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [toast]);

  // Cargar datos cuando el usuario tiene acceso
  useEffect(() => {
    if (hasAccess) {
      loadAllData();
    }
  }, [hasAccess]);

  const loadAllData = async () => {
    try {
      const [statsRes, clubsRes, usersRes, adminsRes, instructorsRes] = await Promise.all([
        fetch('/api/superadmin/stats'),
        fetch('/api/superadmin/clubs'),
        fetch('/api/superadmin/users'),
        fetch('/api/superadmin/admins'),
        fetch('/api/superadmin/instructors')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      if (clubsRes.ok) {
        const clubsData = await clubsRes.json();
        setClubs(clubsData.clubs);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins);
      }

      if (instructorsRes.ok) {
        const instructorsData = await instructorsRes.json();
        setInstructors(instructorsData.instructors);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    }
  };

  const handleCreateClub = async (formData: any) => {
    setIsCreatingClub(true);
    try {
      const response = await fetch('/api/superadmin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Club creado correctamente"
        });
        loadAllData(); // Recargar datos
        return true;
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el club",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error creating club:', error);
      toast({
        title: "Error",
        description: "Error al crear el club",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleCreateAdmin = async (formData: any) => {
    setIsCreatingAdmin(true);
    try {
      const response = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Administrador creado correctamente"
        });
        loadAllData(); // Recargar datos
        return true;
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo crear el administrador",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: "Error al crear el administrador",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteClub = async (clubId: string, clubName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el club "${clubName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/clubs?clubId=${clubId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Club eliminado",
          description: `El club "${clubName}" ha sido eliminado`
        });
        loadAllData();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el club",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el club",
        variant: "destructive"
      });
    }
  };

  const handleLoginAs = (user: any) => {
    setSelectedUserForImpersonation(user);
    setLoginAsDialogOpen(true);
  };

  // Mostrar mensaje de acceso denegado
  if (hasAccess === false) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder al panel de super administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Solo los usuarios con rol de <strong>Super Administrador</strong> pueden acceder a esta sección.
            </p>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesClub = filterClub === 'all' || user.clubId === filterClub;
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesClub && matchesSearch;
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-semibold">Panel de Super Administrador</h1>
            <p className="text-muted-foreground">Gestión global del sistema PadelPro</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="clubs">
            <Building2 className="h-4 w-4 mr-2" />
            Clubs
          </TabsTrigger>
          <TabsTrigger value="admins">
            <UserCog className="h-4 w-4 mr-2" />
            Administradores
          </TabsTrigger>
          <TabsTrigger value="instructors">
            <GraduationCap className="h-4 w-4 mr-2" />
            Instructores
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <DashboardTab stats={stats} clubs={clubs} />
        </TabsContent>

        {/* Clubs Tab */}
        <TabsContent value="clubs" className="space-y-6">
          <ClubsTab 
            clubs={clubs} 
            onCreateClub={handleCreateClub} 
            onDeleteClub={handleDeleteClub}
            isCreating={isCreatingClub}
          />
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-6">
          <AdminsTab 
            admins={admins} 
            clubs={clubs}
            onCreateAdmin={handleCreateAdmin}
            isCreating={isCreatingAdmin}
            onLoginAs={handleLoginAs}
          />
        </TabsContent>

        {/* Instructors Tab */}
        <TabsContent value="instructors" className="space-y-6">
          <InstructorsTab instructors={instructors} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UsersTab 
            users={filteredUsers} 
            clubs={clubs}
            filterRole={filterRole}
            setFilterRole={setFilterRole}
            filterClub={filterClub}
            setFilterClub={setFilterClub}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onLoginAs={handleLoginAs}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Login As */}
      {selectedUserForImpersonation && (
        <LoginAsDialog
          open={loginAsDialogOpen}
          onOpenChange={setLoginAsDialogOpen}
          superAdminId={currentSuperAdminId}
          targetUser={selectedUserForImpersonation}
        />
      )}
    </div>
  );
}

// ========== DASHBOARD TAB ==========
function DashboardTab({ stats, clubs }: { stats: Stats | null; clubs: Club[] }) {
  if (!stats) return <div>Cargando estadísticas...</div>;

  return (
    <div className="space-y-6">
      {/* Estadísticas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clubs"
          value={stats.clubs.total}
          subtitle={`${stats.clubs.active} activos`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Pistas"
          value={stats.courts.total}
          subtitle="En todos los clubs"
          icon={<Settings className="h-4 w-4" />}
        />
        <StatsCard
          title="Instructores"
          value={stats.instructors.total}
          subtitle="Activos"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatsCard
          title="Usuarios"
          value={stats.users.total}
          subtitle={`${stats.users.byRole?.PLAYER || 0} jugadores`}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Créditos y Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Créditos Totales"
          value={`${(stats.credits.total / 100).toFixed(2)}€`}
          subtitle={`${(stats.credits.blocked / 100).toFixed(2)}€ bloqueados`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatsCard
          title="Reservas Totales"
          value={stats.bookings.total}
          subtitle={`${stats.bookings.byStatus?.CONFIRMED || 0} confirmadas`}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatsCard
          title="Reservas Canceladas"
          value={stats.bookings.byStatus?.CANCELLED || 0}
          subtitle="Total cancelaciones"
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      {/* Lista rápida de clubs */}
      <Card>
        <CardHeader>
          <CardTitle>Clubs Recientes</CardTitle>
          <CardDescription>Últimos clubs registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clubs.slice(0, 5).map(club => (
              <div key={club.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{club.name}</p>
                  <p className="text-sm text-muted-foreground">{club.address}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{club.courtsCount} pistas</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{club.usersCount} usuarios</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== CLUBS TAB ==========
function ClubsTab({ 
  clubs, 
  onCreateClub, 
  onDeleteClub, 
  isCreating 
}: { 
  clubs: Club[]; 
  onCreateClub: (data: any) => Promise<boolean>;
  onDeleteClub: (clubId: string, clubName: string) => void;
  isCreating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gestión de Clubs</h2>
          <p className="text-muted-foreground">Administra todos los clubs de padel del sistema</p>
        </div>
        <CreateClubDialog onCreateClub={onCreateClub} isCreating={isCreating} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map(club => (
          <Card key={club.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {club.address}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información de contacto */}
              {club.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{club.email}</span>
                </div>
              )}
              {club.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{club.phone}</span>
                </div>
              )}

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                <div className="text-center p-2 bg-muted rounded-md">
                  <p className="text-2xl font-bold">{club.courtsCount}</p>
                  <p className="text-xs text-muted-foreground">Pistas</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-md">
                  <p className="text-2xl font-bold">{club.usersCount}</p>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-md">
                  <p className="text-2xl font-bold">{club.instructorsCount}</p>
                  <p className="text-xs text-muted-foreground">Instructores</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-md">
                  <p className="text-2xl font-bold">{club.courtRentalPrice}€</p>
                  <p className="text-xs text-muted-foreground">Precio/h</p>
                </div>
              </div>

              {/* Admin info */}
              <div className="pt-3 border-t">
                <p className="text-sm font-medium">Administrador</p>
                <p className="text-sm text-muted-foreground">{club.adminName}</p>
                <p className="text-xs text-muted-foreground">{club.adminEmail}</p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalles
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDeleteClub(club.id, club.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ========== CREATE CLUB DIALOG ==========
function CreateClubDialog({ onCreateClub, isCreating }: { onCreateClub: (data: any) => Promise<boolean>; isCreating: boolean }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    courtRentalPrice: '10.0',
    adminEmail: '',
    courtsCount: '4'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onCreateClub({
      ...formData,
      courtRentalPrice: parseFloat(formData.courtRentalPrice),
      courtsCount: parseInt(formData.courtsCount)
    });
    
    if (success) {
      setOpen(false);
      // Reset form
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        description: '',
        courtRentalPrice: '10.0',
        adminEmail: '',
        courtsCount: '4'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Crear Nuevo Club
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Club de Padel</DialogTitle>
          <DialogDescription>
            Completa la información del nuevo club. Se crearán automáticamente las pistas especificadas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nombre del Club *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Padel Estrella"
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle Principal 123, Madrid"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@club.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.club.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courtRentalPrice">Precio por Hora (€)</Label>
              <Input
                id="courtRentalPrice"
                type="number"
                step="0.1"
                value={formData.courtRentalPrice}
                onChange={(e) => setFormData({ ...formData, courtRentalPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courtsCount">Número de Pistas</Label>
              <Input
                id="courtsCount"
                type="number"
                min="1"
                value={formData.courtsCount}
                onChange={(e) => setFormData({ ...formData, courtsCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email del Administrador</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@club.com"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del club..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Club
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ========== ADMINS TAB ==========
function AdminsTab({ 
  admins, 
  clubs,
  onCreateAdmin,
  isCreating,
  onLoginAs
}: { 
  admins: Admin[]; 
  clubs: Club[];
  onCreateAdmin: (data: any) => Promise<boolean>;
  isCreating: boolean;
  onLoginAs: (admin: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Administradores</h2>
          <p className="text-muted-foreground">Gestiona los administradores del sistema</p>
        </div>
        <CreateAdminDialog onCreateAdmin={onCreateAdmin} isCreating={isCreating} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map(admin => (
          <Card key={admin.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{admin.name}</CardTitle>
                  <CardDescription>{admin.email}</CardDescription>
                </div>
                <Badge variant={admin.role === 'SUPER_ADMIN' ? 'destructive' : 'default'}>
                  {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Club Admin'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {admin.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{admin.phone}</span>
                </div>
              )}
              
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Clubs Asignados: {admin.clubsCount}</p>
                {admin.clubs.length > 0 && (
                  <div className="space-y-1">
                    {admin.clubs.map(club => (
                      <Badge key={club.id} variant="outline" className="text-xs">
                        {club.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {admin.isActive ? (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactivo
                  </Badge>
                )}
              </div>

              {/* Botón Login As */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onLoginAs({
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role
                  })}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login As
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ========== CREATE ADMIN DIALOG ==========
function CreateAdminDialog({ onCreateAdmin, isCreating }: { onCreateAdmin: (data: any) => Promise<boolean>; isCreating: boolean }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CLUB_ADMIN'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onCreateAdmin(formData);
    
    if (success) {
      setOpen(false);
      setFormData({ name: '', email: '', phone: '', role: 'CLUB_ADMIN' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Crear Administrador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Administrador</DialogTitle>
          <DialogDescription>
            Completa la información del nuevo administrador
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nombre *</Label>
            <Input
              id="admin-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email *</Label>
            <Input
              id="admin-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-phone">Teléfono</Label>
            <Input
              id="admin-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-role">Rol</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLUB_ADMIN">Administrador de Club</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ========== INSTRUCTORS TAB ==========
function InstructorsTab({ instructors }: { instructors: Instructor[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Instructores</h2>
        <p className="text-muted-foreground">Todos los instructores registrados en el sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructors.map(instructor => (
          <Card key={instructor.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{instructor.userName}</CardTitle>
                  <CardDescription>{instructor.userEmail}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructor.userPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{instructor.userPhone}</span>
                </div>
              )}

              {instructor.specialties && (
                <div>
                  <p className="text-sm font-medium mb-1">Especialidades</p>
                  <p className="text-sm text-muted-foreground">{instructor.specialties}</p>
                </div>
              )}

              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Club</span>
                  <span className="text-sm font-medium">{instructor.clubName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Clases</span>
                  <Badge variant="outline">{instructor.classesCount}</Badge>
                </div>
                {instructor.hourlyRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tarifa</span>
                    <span className="text-sm font-medium">{instructor.hourlyRate}€/h</span>
                  </div>
                )}
              </div>

              <Badge variant={instructor.isAvailable ? "default" : "secondary"} className="w-full justify-center">
                {instructor.isAvailable ? 'Disponible' : 'No disponible'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ========== USERS TAB ==========
function UsersTab({ 
  users, 
  clubs,
  filterRole,
  setFilterRole,
  filterClub,
  setFilterClub,
  searchTerm,
  setSearchTerm,
  onLoginAs
}: { 
  users: User[]; 
  clubs: Club[];
  filterRole: string;
  setFilterRole: (role: string) => void;
  filterClub: string;
  setFilterClub: (clubId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onLoginAs: (user: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Usuarios</h2>
        <p className="text-muted-foreground">Todos los usuarios registrados en el sistema</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Filtrar por Rol</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PLAYER">Jugadores</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructores</SelectItem>
                  <SelectItem value="CLUB_ADMIN">Admin Club</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtrar por Club</Label>
              <Select value={filterClub} onValueChange={setFilterClub}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clubs.map(club => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid grid-cols-1 gap-3">
        {users.map(user => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      <span className="text-xs text-muted-foreground">{user.clubName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{(user.credits / 100).toFixed(2)}€</span>
                      <span className="text-muted-foreground text-xs ml-1">créditos</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.confirmedBookingsCount} reservas
                    </p>
                    <Badge variant="secondary" className="text-xs">{user.level}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoginAs({
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.role
                    })}
                  >
                    <LogIn className="h-3 w-3 mr-1" />
                    Login As
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No se encontraron usuarios</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== STATS CARD COMPONENT ==========
function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

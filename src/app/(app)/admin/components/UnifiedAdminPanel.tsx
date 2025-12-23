"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ClubCalendar from '@/components/admin/ClubCalendar';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Calendar,
  Settings,
  BarChart3,
  ArrowLeft,
  Crown,
  ServerIcon
} from 'lucide-react';
import { getMockClubs } from '@/lib/mockData';
import type { Club } from '@/types';

// Importar componentes existentes
import ManageCourtsPanelDB from './ManageCourtsPanelDB';
import ManageCourtRatesPanelDB from './ManageCourtRatesPanelDB';
import ManageUsersPanelDB from './ManageUsersPanelDB';
import ManageInstructorsPanelDB from './ManageInstructorsPanelDB';

interface UnifiedAdminPanelProps {
  currentLevel: 'super' | 'club';
  clubId?: string;
}

const UnifiedAdminPanel: React.FC<UnifiedAdminPanelProps> = ({ currentLevel, clubId }) => {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const allClubs = getMockClubs();
    setClubs(allClubs);
    
    if (clubId) {
      const club = allClubs.find(c => c.id === clubId);
      setSelectedClub(club || null);
    }
  }, [clubId]);

  if (currentLevel === 'super') {
    return <SuperAdminView clubs={clubs} onSelectClub={setSelectedClub} />;
  }

  if (currentLevel === 'club' && selectedClub) {
    return (
      <ClubAdminView 
        club={selectedClub} 
        onBack={() => setSelectedClub(null)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    );
  }

  return <div>Cargando...</div>;
};

// Componente Super Admin
const SuperAdminView: React.FC<{ clubs: Club[], onSelectClub: (club: Club) => void }> = ({ clubs, onSelectClub }) => {
  const totalCourts = clubs.reduce((sum, club) => sum + (club.courtRateTiers?.length || 0), 0);
  const activeClubs = clubs.filter(club => club.isMatchDayEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header Super Admin */}
      <div className="flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Super Administrador</h1>
          <p className="text-muted-foreground">Gestión global del sistema PadelPro</p>
        </div>
      </div>

      {/* Estadísticas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clubs.length}</div>
            <p className="text-xs text-muted-foreground">{activeClubs} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pistas</CardTitle>
            <ServerIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourts}</div>
            <p className="text-xs text-muted-foreground">En todos los clubs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instructores</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clubs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Clubs Registrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map(club => (
              <Card key={club.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{club.name}</h3>
                    <Badge variant={club.isMatchDayEnabled ? "default" : "secondary"}>
                      {club.isMatchDayEnabled ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{club.location}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {club.adminEmail}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => onSelectClub(club)}
                      className="text-xs"
                    >
                      Administrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente Club Admin
const ClubAdminView: React.FC<{ 
  club: Club, 
  onBack: () => void,
  activeTab: string,
  setActiveTab: (tab: string) => void
}> = ({ club, onBack, activeTab, setActiveTab }) => {
  return (
    <div className="space-y-6">
      {/* Header Club Admin */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{club.name}</h1>
            <p className="text-muted-foreground">{club.location}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          ID: {club.id}
        </Badge>
      </div>

      {/* Tabs de Gestión del Club */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="courts" className="flex items-center space-x-2">
            <ServerIcon className="h-4 w-4" />
            <span>Pistas</span>
          </TabsTrigger>
          <TabsTrigger value="instructors" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>Instructores</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ClubDashboard club={club} />
        </TabsContent>

        <TabsContent value="courts" className="space-y-4">
          <ManageCourtsPanelDB clubId={club.id} />
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <ManageInstructorsPanelDB clubId={club.id} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <ManageUsersPanelDB clubId={club.id} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <ClubCalendar clubId={club.id} viewMode="club" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/admin/club-info'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información del Club
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Configura el nombre, logo, descripción y datos de contacto del club que aparecen en la página informativa.
                </p>
                <Button className="w-full">
                  Editar Información
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tarifas de Pistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Gestiona los precios y horarios de las pistas del club.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tarifas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ManageCourtRatesPanelDB clubId={club.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Dashboard específico del club
const ClubDashboard: React.FC<{ club: Club }> = ({ club }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pistas Activas</CardTitle>
          <ServerIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5</div>
          <p className="text-xs text-muted-foreground">3 disponibles ahora</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Instructores</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8</div>
          <p className="text-xs text-muted-foreground">6 disponibles hoy</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Miembros</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">156</div>
          <p className="text-xs text-muted-foreground">12 nuevos este mes</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedAdminPanel;
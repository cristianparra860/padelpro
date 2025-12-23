// src/components/admin/ImpersonationBanner.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, LogOut, User, Clock, Shield } from 'lucide-react';

interface ImpersonationData {
  logId: string;
  originalUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  startedAt: string;
}

export default function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [duration, setDuration] = useState<string>('0:00');
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Cargar datos de impersonation desde localStorage
    const loadImpersonationData = () => {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem('impersonation');
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setImpersonationData(parsed);
          } catch (error) {
            console.error('Error parsing impersonation data:', error);
            localStorage.removeItem('impersonation');
          }
        }
      }
    };

    loadImpersonationData();

    // Actualizar cada segundo para mostrar duración
    const interval = setInterval(() => {
      if (impersonationData?.startedAt) {
        const start = new Date(impersonationData.startedAt);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [impersonationData?.startedAt]);

  const handleExitImpersonation = async () => {
    if (!impersonationData) return;

    setIsExiting(true);

    try {
      const response = await fetch(
        `/api/superadmin/impersonate?logId=${impersonationData.logId}&superAdminId=${impersonationData.originalUser.id}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Limpiar localStorage
        localStorage.removeItem('impersonation');
        localStorage.removeItem('currentUser');

        // Guardar el usuario original de nuevo
        localStorage.setItem('currentUser', JSON.stringify(data.restoredUser));

        toast({
          title: "Impersonation Terminado",
          description: `Has vuelto a tu sesión como ${data.restoredUser.name}. Duración: ${data.duration}`,
        });

        // Redirigir al panel de super admin
        router.push('/superadmin');
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo terminar el impersonation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      toast({
        title: "Error",
        description: "Error al terminar el impersonation",
        variant: "destructive"
      });
    } finally {
      setIsExiting(false);
    }
  };

  // No mostrar el banner si no hay impersonation activo
  if (!impersonationData) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert className="rounded-none border-x-0 border-t-0 border-b-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <div className="container mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                Modo Impersonation Activo
              </span>
            </div>

            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 dark:text-yellow-200">
                  Super Admin: <strong>{impersonationData.originalUser.name}</strong>
                </span>
              </div>

              <div className="w-px h-4 bg-yellow-300" />

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 dark:text-yellow-200">
                  Viendo como: <strong>{impersonationData.targetUser.name}</strong>
                </span>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400">
                  {impersonationData.targetUser.role}
                </Badge>
              </div>

              <div className="w-px h-4 bg-yellow-300" />

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 dark:text-yellow-200 font-mono">
                  {duration}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleExitImpersonation}
            disabled={isExiting}
            variant="destructive"
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isExiting ? 'Saliendo...' : 'Salir de Impersonation'}
          </Button>
        </div>

        {/* Versión móvil */}
        <div className="md:hidden mt-2 pt-2 border-t border-yellow-200">
          <div className="flex flex-col gap-2 text-xs text-yellow-800 dark:text-yellow-200">
            <div>Super Admin: <strong>{impersonationData.originalUser.name}</strong></div>
            <div>Viendo como: <strong>{impersonationData.targetUser.name}</strong> ({impersonationData.targetUser.role})</div>
            <div>Duración: <strong className="font-mono">{duration}</strong></div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

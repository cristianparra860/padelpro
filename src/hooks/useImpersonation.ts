// src/hooks/useImpersonation.ts
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
    clubId?: string;
    clubName?: string;
  };
  startedAt: string;
}

export function useImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar si hay impersonation activo al cargar
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('impersonation');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setImpersonationData(parsed);
          setIsImpersonating(true);
        } catch (error) {
          console.error('Error loading impersonation data:', error);
          localStorage.removeItem('impersonation');
        }
      }
    }
  }, []);

  const startImpersonation = async (superAdminId: string, targetUserId: string, reason?: string) => {
    console.log('🚀 useImpersonation - startImpersonation:', { superAdminId, targetUserId, reason });
    
    setIsLoading(true);

    try {
      const requestBody = {
        superAdminId,
        targetUserId,
        reason
      };
      console.log('📤 Enviando request a API:', requestBody);

      const response = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        // Guardar datos de impersonation en localStorage
        const impersonationInfo: ImpersonationData = {
          logId: data.impersonationLogId,
          originalUser: data.originalUser,
          targetUser: data.targetUser,
          startedAt: new Date().toISOString()
        };

        localStorage.setItem('impersonation', JSON.stringify(impersonationInfo));
        
        // Actualizar el usuario actual con el target user
        localStorage.setItem('currentUser', JSON.stringify(data.targetUser));

        setImpersonationData(impersonationInfo);
        setIsImpersonating(true);

        toast({
          title: "Impersonation Iniciado",
          description: `Ahora estás viendo como ${data.targetUser.name}`,
        });

        // Redirigir según el rol del usuario
        switch (data.targetUser.role) {
          case 'CLUB_ADMIN':
            router.push('/admin');
            break;
          case 'INSTRUCTOR':
            router.push('/instructor');
            break;
          case 'PLAYER':
            router.push('/activities');
            break;
          default:
            router.push('/');
        }

        router.refresh();

        return true;
      } else {
        console.error('❌ Error response:', data);
        toast({
          title: "Error",
          description: data.error || "No se pudo iniciar el impersonation",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Exception en startImpersonation:', error);
      toast({
        title: "Error",
        description: "Error al iniciar el impersonation",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const endImpersonation = async () => {
    if (!impersonationData) return false;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/superadmin/impersonate?logId=${impersonationData.logId}&superAdminId=${impersonationData.originalUser.id}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Limpiar impersonation
        localStorage.removeItem('impersonation');
        localStorage.setItem('currentUser', JSON.stringify(data.restoredUser));

        setImpersonationData(null);
        setIsImpersonating(false);

        toast({
          title: "Impersonation Terminado",
          description: `Has vuelto a tu sesión como ${data.restoredUser.name}`,
        });

        router.push('/superadmin');
        router.refresh();

        return true;
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo terminar el impersonation",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
      toast({
        title: "Error",
        description: "Error al terminar el impersonation",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isImpersonating,
    impersonationData,
    isLoading,
    startImpersonation,
    endImpersonation
  };
}

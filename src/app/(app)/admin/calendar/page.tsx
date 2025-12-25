'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClubCalendar from '@/components/admin/ClubCalendar2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CalendarPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const clubId = 'padel-estrella-madrid';

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (!response.ok) {
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        const userRole = data.user?.role;
        
        // Todos los usuarios autenticados pueden acceder al calendario
        if (userRole) {
          setHasAccess(true);
          setCurrentUser(data.user);
        } else {
          setHasAccess(false);
          toast({
            title: "Acceso denegado",
            description: "Debes iniciar sesión para acceder al calendario del club",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ CalendarPage - Error cargando usuario:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [toast]);

  if (loading || hasAccess === null) {
    return (
      <div className="w-full py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 md:pl-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="w-full py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 md:pl-24">
        <div className="container mx-auto p-8 flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder al calendario del club.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Debes iniciar sesión para acceder a esta sección.
              </p>
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 md:pl-24">
      <ClubCalendar clubId={clubId} currentUser={currentUser} viewMode="club" />
    </div>
  );
}

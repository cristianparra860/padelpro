// src/app/(app)/admin/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedAdminPanel from '@/app/(app)/admin/components/UnifiedAdminPanel';
import { getMockClubs } from '@/lib/mockData';
import type { Club } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
    const [adminClub, setAdminClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        // Forzar inicialización de datos mock
        try {
            const { performInitialization } = require('@/lib/mockDataSources/init');
            performInitialization();
        } catch (error) {
            console.warn('Error en inicialización:', error);
        }

        // Obtener todos los clubs disponibles
        const allClubs = getMockClubs();
        
        // Verificar si hay un club activo guardado
        let activeClubId: string | null = null;
        if (typeof window !== 'undefined') {
            activeClubId = localStorage.getItem('activeAdminClubId');
        }

        let selectedClub: Club | null = null;

        // Si hay un club activo guardado, verificar que aún exista
        if (activeClubId) {
            selectedClub = allClubs.find(c => c.id === activeClubId) || null;
            
            // Si el club guardado no existe, limpiar localStorage
            if (!selectedClub && typeof window !== 'undefined') {
                console.warn(`⚠️ Club guardado (${activeClubId}) no existe, limpiando localStorage`);
                localStorage.removeItem('activeAdminClubId');
            }
        }

        // Si no hay club activo o no existe, seleccionar el primer club disponible
        if (!selectedClub && allClubs.length > 0) {
            selectedClub = allClubs[0]; // Usar el primer club por defecto
            if (typeof window !== 'undefined') {
                localStorage.setItem('activeAdminClubId', selectedClub.id);
            }
            console.log(`✅ Seleccionado club por defecto: ${selectedClub.name} (${selectedClub.id})`);
        }

        if (selectedClub) {
            setAdminClub(selectedClub);
            toast({ 
                title: "Acceso Concedido", 
                description: `Accediendo al panel de ${selectedClub.name}` 
            });
        } else {
            toast({ 
                title: "Error", 
                description: "No se encontraron clubs disponibles.", 
                variant: "destructive" 
            });
        }
        
        setLoading(false);
    }, [router, toast]);

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
                 <header>
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="mt-2 h-5 w-2/3" />
                </header>
                <main className="flex-1">
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                   </div>
                </main>
            </div>
        );
    }

    if (!adminClub) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
                <div className="text-center">
                    <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-semibold mb-2">No hay clubs disponibles</h2>
                    <p className="text-muted-foreground">
                        No se pudieron cargar los datos del club. Por favor, recarga la página.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
            <header>
                <h1 className="font-headline text-3xl font-semibold">Panel de Administración del Club</h1>
                <p className="text-muted-foreground">
                    Gestiona todos los aspectos de <span className="font-semibold text-primary">{adminClub.name}</span>.
                </p>
            </header>
            <main className="flex-1">
                <UnifiedAdminPanel currentLevel="club" clubId={adminClub.id} />
            </main>
        </div>
    );
}

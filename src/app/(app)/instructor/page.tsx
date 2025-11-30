"use client";

import React, { useState, useEffect } from 'react';
import InstructorPanel from './components/InstructorPanel';
import { getMockInstructors } from '@/lib/mockData';
import type { Instructor } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function InstructorPage() {
    const [instructor, setInstructor] = useState<Instructor | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchInstructor = async () => {
            setLoading(true);
            try {
                // Cargar el usuario actual desde la API
                const token = localStorage.getItem('auth_token');
                const headers: HeadersInit = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch('/api/users/current', { headers });
                
                if (response.status === 401) {
                    // No autenticado, redirigir al login
                    localStorage.removeItem('auth_token');
                    router.push('/');
                    return;
                }
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    // Obtener el registro Instructor desde la tabla Instructor
                    const instructorResponse = await fetch(`/api/instructors/by-user/${userData.id}`, { headers });
                    let instructorId = userData.id; // fallback
                    
                    if (instructorResponse.ok) {
                        const instructorRecord = await instructorResponse.json();
                        instructorId = instructorRecord.instructor?.id || instructorRecord.id; // usar el ID de la tabla Instructor
                        
                        // Convertir el usuario a formato Instructor con datos del registro
                        const instructorData: Instructor = {
                            id: instructorId,
                            name: userData.name,
                            email: userData.email,
                            profilePictureUrl: userData.profilePictureUrl || null,
                            isAvailable: userData.isAvailable ?? true,
                            assignedClubId: instructorRecord.instructor?.clubId || userData.assignedClubId || 'padel-estrella-madrid',
                            assignedCourtNumber: userData.assignedCourtNumber || undefined,
                            defaultRatePerHour: userData.defaultRatePerHour || 28,
                            rateTiers: userData.rateTiers || [],
                            unavailableHours: userData.unavailableHours || {},
                            levelRanges: instructorRecord.instructor?.levelRanges || null
                        };
                        
                        setInstructor(instructorData);
                    } else {
                        // Usuario no es instructor, redirigir al dashboard
                        console.log('Usuario no tiene registro de instructor');
                        router.push('/dashboard');
                        return;
                    }
                } else {
                    console.error('Error al cargar usuario');
                    router.push('/');
                }
            } catch (error) {
                console.error('Error loading instructor:', error);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        fetchInstructor();
    }, [router]);

    if (loading) {
        return (
             <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </header>
                <main className="flex-1">
                     <Skeleton className="h-10 w-full mb-4" />
                     <Skeleton className="h-96 w-full" />
                </main>
            </div>
        )
    }

    if (!instructor) {
        return <div className="p-6">Error: No se pudo cargar la información del instructor.</div>
    }
    
    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <header>
                <h1 className="font-headline text-3xl font-semibold">Panel de Instructor</h1>
                <p className="text-muted-foreground">
                    Gestiona tus clases, partidas y preferencias, {instructor.name}.
                </p>
            </header>
            <main className="flex-1">
                <InstructorPanel instructor={instructor} />
            </main>
        </div>
    );
}

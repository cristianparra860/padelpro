"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Instructor, DayOfWeek, TimeRange } from '@/types';
import { getMockInstructors, updateInstructor } from '@/lib/mockData';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import InstructorAvailabilitySettings from '../components/InstructorAvailabilitySettings';
import InstructorLevelRanges from '../components/InstructorLevelRanges';

interface LevelRange {
  name: string;
  minStudents: number;
  maxStudents: number;
}

export default function InstructorPreferencesPage() {
    const [instructor, setInstructor] = useState<Instructor | null>(null);
    const [loading, setLoading] = useState(true);
    const [levelRanges, setLevelRanges] = useState<LevelRange[]>([]);
    const { toast } = useToast();

    const fetchInstructorData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
                return;
            }

            // Obtener instructor actual del usuario autenticado
            const userResponse = await fetch('/api/users/current', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!userResponse.ok) {
                throw new Error('No se pudo cargar el usuario');
            }

            const userData = await userResponse.json();
            const user = userData.user || userData;

            // Obtener datos del instructor
            const instructorResponse = await fetch(`/api/instructors/by-user/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!instructorResponse.ok) {
                throw new Error('No se pudo cargar el instructor');
            }

            const instructorData = await instructorResponse.json();
            
            if (!instructorData.isInstructor) {
                throw new Error('El usuario no es un instructor');
            }
            
            setInstructor(instructorData.instructor);

            // Cargar rangos de nivel si existen
            if (instructorData.instructor.levelRanges) {
                try {
                    const ranges = typeof instructorData.instructor.levelRanges === 'string'
                        ? JSON.parse(instructorData.instructor.levelRanges)
                        : instructorData.instructor.levelRanges;
                    setLevelRanges(ranges);
                } catch (e) {
                    console.error('Error parsing level ranges:', e);
                    setLevelRanges([]);
                }
            }
        } catch (error: any) {
            console.error('Error loading instructor:', error);
            toast({ title: "Error", description: error.message || "No se pudo cargar la información del instructor.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInstructorData();
    }, [fetchInstructorData]);

    const handleSave = async (unavailableHours: Partial<Record<DayOfWeek, TimeRange[]>>) => {
        if (!instructor) return;
        const result = await updateInstructor(instructor.id, { unavailableHours });
        if ('error' in result) {
            throw new Error(result.error);
        } else {
            // Re-fetch instructor data to get the latest version
            fetchInstructorData();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
                <header>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </header>
                <main className="flex-1">
                    <div className="mx-auto max-w-4xl space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    if (!instructor) {
        return <div className="p-6 pl-16 md:pl-20 lg:pl-24">Error: No se encontró al instructor.</div>;
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pl-16 md:pl-20 lg:pl-24">
            <header>
                <h1 className="font-headline text-3xl font-semibold">Preferencias y Tarifas</h1>
                <p className="text-muted-foreground">
                    Gestiona tu horario, rangos de nivel y configuraciones.
                </p>
            </header>
            <main className="flex-1">
                <div className="mx-auto max-w-4xl space-y-6">
                   <InstructorLevelRanges 
                        instructorId={instructor.id}
                        initialRanges={levelRanges}
                   />
                   
                   <InstructorAvailabilitySettings 
                        instructor={instructor}
                        onSaveUnavailableHours={handleSave}
                   />
                </div>
            </main>
        </div>
    );
}
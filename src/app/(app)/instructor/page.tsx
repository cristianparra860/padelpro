"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InstructorPanel from './components/InstructorPanel';
import { Loader2 } from 'lucide-react';

export default function InstructorPage() {
    const [loading, setLoading] = useState(true);
    const [instructor, setInstructor] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchInstructorData = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                
                if (!token) {
                    router.push('/');
                    return;
                }
                
                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
                
                // 1. Obtener usuario actual
                const userResponse = await fetch('/api/users/current', { headers });
                
                if (!userResponse.ok) {
                    throw new Error('Error al obtener usuario');
                }
                
                const { user } = await userResponse.json();
                
                console.log('✅ Usuario obtenido:', user.id, user.email);
                
                // 2. Verificar si es instructor
                const instructorResponse = await fetch(`/api/instructors/by-user/${user.id}`, { headers });
                
                if (!instructorResponse.ok) {
                    throw new Error('Error al verificar instructor');
                }
                
                const instructorData = await instructorResponse.json();
                
                console.log('📋 Respuesta instructor:', instructorData);
                
                if (!instructorData.isInstructor || !instructorData.instructor) {
                    console.log('❌ Usuario no es instructor, redirigiendo...');
                    router.push('/dashboard');
                    return;
                }
                
                // 3. Cargar el instructor completo
                console.log('✅ Cargando panel del instructor:', instructorData.instructor.id);
                setInstructor(instructorData.instructor);
                setLoading(false);
                
            } catch (error: any) {
                console.error('❌ Error loading instructor:', error);
                setError(error.message);
                setLoading(false);
            }
        };
        
        fetchInstructorData();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Cargando panel de instructor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-red-600">
                    <p className="mb-4">Error: {error}</p>
                    <button 
                        onClick={() => router.push('/dashboard')}
                        className="text-blue-600 hover:underline"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    if (!instructor) {
        return null;
    }

    return <InstructorPanel instructor={instructor} />;
}

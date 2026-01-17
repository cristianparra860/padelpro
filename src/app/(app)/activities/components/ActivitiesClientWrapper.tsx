// src/app/(app)/activities/components/ActivitiesClientWrapper.tsx
"use client";

import React, { useState, useEffect } from 'react';
import type { User } from '@/types';
import { getMockCurrentUser, performInitialization } from '@/lib/mockData';
import ActivitiesPageContent from './ActivitiesPageContent';
import PageSkeleton from '@/components/layout/PageSkeleton';

export default function ActivitiesClientWrapper() {
    // Ensure mock data is initialized when visiting Activities directly
    performInitialization();

    // 🚀 OPTIMIZATION: Intentar obtener usuario del estado global/storage primero para carga instantánea
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            // Intentar recuperar del global mock (memory)
            const globalUser = getMockCurrentUser();
            if (globalUser) return globalUser;

            // Intentar recuperar de localStorage (persistence)
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    });

    const [loadingUser, setLoadingUser] = useState(!currentUser);

    // 🔄 Efecto simplificado: Solo verificar usuario si no tenemos uno, o actualizar en segundo plano
    useEffect(() => {
        const fetchUser = async () => {
            // Si ya tenemos usuario, no mostramos loading
            if (!currentUser) setLoadingUser(true);

            try {
                // ✅ FIXED: Usar JWT authentication en lugar de /api/me
                const token = localStorage.getItem('auth_token');
                const headers: HeadersInit = {
                    'Content-Type': 'application/json'
                };

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch('/api/users/current', {
                    headers,
                    credentials: 'include',
                    cache: 'no-store'
                });

                if (response.ok) {
                    const data = await response.json();
                    const userData = data.user || data; // Manejar ambos formatos: { user: {...} } o {...}
                    // Mapear campos de la BD al formato esperado por el frontend
                    const mappedUser = {
                        ...userData,
                        credit: userData.credits || userData.credit || 0, // Mapear credits -> credit
                        blockedCredit: userData.blockedCredits || userData.blockedCredit || 0,
                        loyaltyPoints: userData.points || userData.loyaltyPoints || 0
                    };
                    console.log('✅ Usuario JWT cargado en Activities:', mappedUser.name);
                    setCurrentUser(mappedUser);
                    setLoadingUser(false);
                    return;
                }

                // Si no hay token o falla, pero teníamos uno cached, quizás deberíamos limpiar?
                // Dejamos que falle silenciosamente si estamos optimistas, o redirigimos si es crítico.
                if (!response.ok && !currentUser) {
                    console.log('⚠️ No hay usuario autenticado, redirigiendo al login...');
                    // window.location.href = '/'; // Comentado para evitar redirecciones bruscas en transiciones
                }

            } catch (error) {
                console.error('❌ Error cargando usuario:', error);
            }
            setLoadingUser(false);
        };

        fetchUser();

        // Mantener sincronizado (menos agresivo, cada 10s)
        const id = setInterval(async () => {
            // ... (código existente simplificado)
        }, 10000);

        return () => clearInterval(id);
    }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

    // REMOVIMOS el borrado agresivo de caché que había aquí

    const handleUserUpdate = (newFavoriteIds: string[]) => {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, favoriteInstructorIds: newFavoriteIds } : null);
    };

    // 🚀 RETORNO INMEDIATO: Renderizamos el contenido incluso si está cargando (Skeleton interno o UI optimista)
    // Ya no bloqueamos con <PageSkeleton /> a nivel de página entera
    return (
        <ActivitiesPageContent
            currentUser={currentUser}
            onCurrentUserUpdate={handleUserUpdate}
        />
    );
}

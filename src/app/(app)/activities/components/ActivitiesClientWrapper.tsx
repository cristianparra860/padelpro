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
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // 🔥 LIMPIAR CACHÉ AL CARGAR LA PÁGINA
    useEffect(() => {
        console.log('🔥 ActivitiesClientWrapper montado - Limpiando caché...');
        
        // Limpiar caché del navegador
        if (typeof window !== 'undefined' && 'caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    console.log('🗑️ Borrando caché:', name);
                    caches.delete(name);
                });
            });
        }
        
        // Verificar si necesitamos recargar por datos obsoletos
        const needsReload = sessionStorage.getItem('needsReload');
        if (needsReload === 'true') {
            sessionStorage.removeItem('needsReload');
            console.log('🔄 Recargando por datos obsoletos...');
            setTimeout(() => window.location.reload(), 500);
        }
        
        console.log('✅ Caché limpiado en ActivitiesClientWrapper');
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            setLoadingUser(true);
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
                    console.log('✅ Usuario JWT cargado en Activities:', mappedUser.name, mappedUser.email, 'ID:', mappedUser.id);
                    setCurrentUser(mappedUser);
                    setLoadingUser(false);
                    return;
                }
                
                // Si no hay token o falla, redirigir al login
                console.log('⚠️ No hay usuario autenticado, redirigiendo al login...');
                window.location.href = '/';
            } catch (error) {
                console.error('❌ Error cargando usuario:', error);
                window.location.href = '/';
            }
            setLoadingUser(false);
        };
        fetchUser();
        
        // ✅ FIXED: Actualizar usuario desde API en lugar de mock
        // Mantener sincronizado con cambios del usuario (cada 5 segundos)
        const id = setInterval(async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return;
                
                const response = await fetch('/api/users/current', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: 'include',
                    cache: 'no-store'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const userData = data.user || data; // Manejar ambos formatos
                    setCurrentUser(prev => {
                        if (!prev) return {
                            ...userData,
                            credit: userData.credits || userData.credit || 0,
                            blockedCredit: userData.blockedCredits || userData.blockedCredit || 0,
                            loyaltyPoints: userData.points || userData.loyaltyPoints || 0
                        };
                        // Solo actualizar si cambió algo relevante
                        if (prev.id !== userData.id ||
                            prev.name !== userData.name ||
                            prev.credits !== userData.credits ||
                            prev.level !== userData.level) {
                            console.log('🔄 Usuario actualizado en Activities');
                            return {
                                ...userData,
                                credit: userData.credits || userData.credit || 0,
                                blockedCredit: userData.blockedCredits || userData.blockedCredit || 0,
                                loyaltyPoints: userData.points || userData.loyaltyPoints || 0
                            };
                        }
                        return prev;
                    });
                }
            } catch (error) {
                console.error('Error actualizando usuario:', error);
            }
        }, 5000);
        
        return () => clearInterval(id);
    }, []);

    const handleUserUpdate = (newFavoriteIds: string[]) => {
      setCurrentUser(prevUser => prevUser ? { ...prevUser, favoriteInstructorIds: newFavoriteIds } : null);
    };

    if (loadingUser) {
        return <PageSkeleton />;
    }

    return (
        <ActivitiesPageContent
            currentUser={currentUser}
            onCurrentUserUpdate={handleUserUpdate}
        />
    );
}

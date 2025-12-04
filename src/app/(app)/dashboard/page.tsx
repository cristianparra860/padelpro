// src/app/(app)/dashboard/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { getMockCurrentUser, setGlobalCurrentUser, updateUserLevel, updateUserGenderCategory } from '@/lib/mockData';
import type { User, MatchPadelLevel, UserGenderCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Settings, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import UserProfileSheet from '@/components/user/profile/UserProfileSheet';
import { matchPadelLevels } from '@/types';
import EditableInfoRow from '@/components/user/profile/EditableInfoRow';
import { Badge } from '@/components/ui/badge';
import UserProfileAvatar from '@/components/user/profile/UserProfileAvatar';
import ChangePasswordDialog from '@/components/user/profile/ChangePasswordDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import PersonalSchedule from '@/components/schedule/PersonalSchedule';
import PersonalMatches from '@/components/schedule/PersonalMatches';
import PersonalMatchDay from '@/components/schedule/PersonalMatchDay';
import UserBookings from '@/components/user/UserBookings';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet, Star, History, Repeat, PlusCircle, PiggyBank, Lock, Sparkles, CalendarDays, User, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreditMovementsDialog from '@/components/user/CreditMovementsDialog';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';
import EditLevelDialog from '@/components/user/EditLevelDialog';
import Link from 'next/link';


function DashboardPageContent() {
    // Feature flag to show/hide Euro balance related UI
    const SHOW_EURO_BALANCE = true;
    
    const [user, setUser] = useState<User | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    
    // Solo usar useUserProfile si tenemos un usuario real cargado
    const {
        user: mockUser,
        name, setName, isEditingName, setIsEditingName, handleNameChange, handleSaveName,
        email, setEmail, isEditingEmail, setIsEditingEmail, handleEmailChange, handleSaveEmail,
        selectedLevel, setSelectedLevel, isEditingLevel, setIsEditingLevel, handleLevelChange, handleSaveLevel,
        selectedGenderCategory, setSelectedGenderCategory, isEditingGenderCategory, setIsEditingGenderCategory, handleGenderCategoryChange, handleSaveGenderCategory,
        profilePicUrl, fileInputRef, handlePhotoUploadClick, handlePhotoChange,
        handleLogout
    } = useUserProfile(user);
    
    const [isClient, setIsClient] = useState(false);
    const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
    const [isCreditMovementsDialogOpen, setIsCreditMovementsDialogOpen] = useState(false);
    const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
    const [isConvertBalanceDialogOpen, setIsConvertBalanceDialogOpen] = useState(false);
    const [isEditLevelDialogOpen, setIsEditLevelDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isInstructor, setIsInstructor] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Cargar usuario desde la API (solo cuando refreshKey cambie)
    useEffect(() => {
        const loadUser = async () => {
            try {
                console.log('🔄 Cargando usuario desde API...');
                
                // Obtener token del localStorage
                const token = localStorage.getItem('auth_token');
                
                const headers: HeadersInit = {
                    'Content-Type': 'application/json'
                };
                
                // Si hay token, agregarlo al header
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch('/api/users/current', { headers });
                
                if (response.status === 401) {
                    // No autenticado, redirigir al login
                    console.log('❌ Usuario no autenticado, redirigiendo al login');
                    localStorage.removeItem('auth_token');
                    router.push('/');
                    return;
                }
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('✅ Usuario cargado desde API:', {
                        id: userData.id,
                        email: userData.email,
                        credits: userData.credit,
                        blockedCredits: userData.blockedCredits,
                        points: userData.points
                    });
                    setUser(userData);
                    
                    // Verificar si el usuario es instructor
                    const instructorResponse = await fetch(`/api/instructors/by-user/${userData.id}`, { headers });
                    if (instructorResponse.ok) {
                        setIsInstructor(true);
                        console.log('✅ Usuario es instructor');
                    } else {
                        setIsInstructor(false);
                    }
                } else {
                    console.error('❌ Error al cargar usuario:', response.status);
                }
            } catch (error) {
                console.error('❌ Error al cargar usuario:', error);
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUser();
        // ✅ REMOVED: Auto-refresh every 5 seconds (was causing performance issues)
        // Solo recarga cuando refreshKey cambie (tras bookings, añadir créditos, etc.)
    }, [refreshKey, router]);

    // Escuchar cambios de usuario desde otros componentes/páginas
    useEffect(() => {
        const handleUserUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            console.log('🔔 Usuario actualizado detectado:', customEvent.detail);
            setUser(customEvent.detail);
        };

        window.addEventListener('userUpdated', handleUserUpdate);
        return () => window.removeEventListener('userUpdated', handleUserUpdate);
    }, []);

    useEffect(() => {
        setIsClient(true);
        const checkUser = async () => {
            if (!user && !isLoadingUser) {
                router.push('/');
            }
        };
        checkUser();
    }, [router, user, isLoadingUser]);

    // Optionally auto-open Add Credit when coming from store link
    useEffect(() => {
        if (!isClient) return;
        const openAdd = searchParams?.get('openAddCredit');
        if (openAdd && !isAddCreditDialogOpen) {
            setIsAddCreditDialogOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient, searchParams]);
    
    const handleDataChange = useCallback(() => {
        console.log('🔄 Dashboard: handleDataChange llamado - incrementando refreshKey...');
        setRefreshKey(prev => prev + 1);
    }, []);
    
    const handleCreditAdded = (newBalance: number) => {
        // Actualizar el usuario inmediatamente (newBalance ya está en euros)
        if (user) {
            setUser({
                ...user,
                credits: newBalance,
                credit: newBalance
            });
        }
        handleDataChange();
        toast({
            title: "¡Saldo Añadido!",
            description: `Tu nuevo saldo es ${newBalance.toFixed(2)}€.`,
            className: "bg-primary text-primary-foreground",
        });
    };

    const handleConversionSuccess = (newCredit: number, newPoints: number) => {
        // Actualizar el usuario inmediatamente (newCredit ya está en euros)
        if (user) {
            setUser({
                ...user,
                credits: newCredit,
                credit: newCredit,
                points: newPoints,
                loyaltyPoints: newPoints
            });
        }
        handleDataChange();
        toast({
            title: "¡Conversión Exitosa!",
            description: `Saldo restante: ${newCredit.toFixed(2)}€. Nuevos puntos: ${newPoints}.`,
            className: "bg-primary text-primary-foreground",
        });
    };

    if (!isClient || !user || isLoadingUser) {
        return <PageSkeleton />;
    }
    
    // Los valores ya vienen en euros desde la API (ya divididos entre 100)
    const creditInEuros = (user.credits ?? user.credit ?? 0);
    const blockedCreditInEuros = (user.blockedCredits ?? user.blockedCredit ?? 0);
    const availableCredit = creditInEuros - blockedCreditInEuros;
    
    const availablePoints = (user.points ?? user.loyaltyPoints ?? 0) - (user.blockedLoyaltyPoints ?? 0);
    const hasPendingPoints = (user.pendingBonusPoints ?? 0) > 0;

    return (
        <div className="flex-1 space-y-2 sm:space-y-6 lg:space-y-8 pl-14 pr-2 py-2 sm:p-4 md:p-6 lg:p-8">
            <header className="mb-2 sm:mb-6">
                {/* Barra superior con gradiente */}
                <div className="rounded-lg p-3 sm:p-6 mb-4" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        {/* Título y nombre del usuario */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            <div>
                                <h1 className="text-lg sm:text-2xl font-bold text-white">
                                    Tu Agenda
                                </h1>
                                <p className="text-xs sm:text-sm text-white/90">{user.name}</p>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-1.5 sm:gap-2">
                            <Link href="/profile" className="flex-1 sm:flex-initial">
                                <Button variant="secondary" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                                    <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Mis Datos</span>
                                    <span className="sm:hidden">Datos</span>
                                </Button>
                            </Link>
                            {isInstructor && (
                                <Link href="/instructor" className="flex-1 sm:flex-initial">
                                    <Button variant="secondary" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                                        <CalendarDays className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Panel Instructor</span>
                                        <span className="sm:hidden">Instructor</span>
                                    </Button>
                                </Link>
                            )}
                            <Link href="/admin/calendar" className="flex-1 sm:flex-initial">
                                <Button variant="secondary" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                                    <CalendarDays className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Calendario Club</span>
                                    <span className="sm:hidden">Calendario</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="space-y-2 sm:space-y-6 lg:space-y-8">
               <div className="grid grid-cols-1 gap-2">
                    {/* Panel Unificado Compacto */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-1 pt-2 px-3 bg-gradient-to-r from-blue-50 to-amber-50">
                            <CardTitle className="text-sm flex items-center justify-center text-gray-800">
                                <Wallet className="mr-1.5 h-4 w-4 text-blue-600" />
                                Saldo y Puntos
                                <Star className="ml-1.5 h-4 w-4 text-amber-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-2 pt-2">
                            <div className="grid grid-cols-2 gap-2">
                                {/* Euros - Compacto */}
                                {SHOW_EURO_BALANCE && (
                                    <div className="space-y-1.5 p-2 bg-blue-50/30 rounded border border-blue-100/50">
                                        <div className="flex items-center gap-1">
                                            <Wallet className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-700">Euros</span>
                                        </div>
                                        <div className="text-xl font-bold text-blue-600">
                                            {availableCredit.toFixed(0)}€
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="flex-1 p-1 bg-white/80 rounded text-center">
                                                <p className="text-[9px] text-gray-500">Total</p>
                                                <p className="text-xs font-semibold">{creditInEuros.toFixed(0)}€</p>
                                            </div>
                                            <div className="flex-1 p-1 bg-white/80 rounded text-center">
                                                <p className="text-[9px] text-gray-500">Bloq</p>
                                                <p className="text-xs font-semibold">{blockedCreditInEuros.toFixed(0)}€</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="default" size="sm" onClick={() => setIsAddCreditDialogOpen(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-6 px-1">
                                                <PlusCircle className="h-3 w-3" />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setIsCreditMovementsDialogOpen(true)} className="flex-1 text-xs h-6 px-1">
                                                <History className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Puntos - Compacto */}
                                <div className="space-y-1.5 p-2 bg-amber-50/30 rounded border border-amber-100/50">
                                    <div className="flex items-center gap-1">
                                        <Star className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="text-xs font-semibold text-amber-700">Puntos</span>
                                    </div>
                                    <div className="text-xl font-bold text-amber-600">
                                        {availablePoints.toFixed(0)}
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="flex-1 p-1 bg-white/80 rounded text-center">
                                            <p className="text-[9px] text-gray-500">Total</p>
                                            <p className="text-xs font-semibold">{(user.points ?? 0).toFixed(0)}</p>
                                        </div>
                                        <div className="flex-1 p-1 bg-white/80 rounded text-center">
                                            <p className="text-[9px] text-gray-500">Bloq</p>
                                            <p className="text-xs font-semibold">{(user.blockedLoyaltyPoints ?? 0).toFixed(0)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {SHOW_EURO_BALANCE && (
                                            <Button variant="default" size="sm" onClick={() => setIsConvertBalanceDialogOpen(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-xs h-6 px-1">
                                                <Repeat className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => setIsCreditMovementsDialogOpen(true)} className="flex-1 text-xs h-6 px-1">
                                            <History className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Botón Editar Plazas para Instructores */}
                {isInstructor && (
                    <div className="flex justify-center">
                        <Button 
                            size="lg"
                            variant={editMode ? "default" : "outline"}
                            onClick={() => setEditMode(!editMode)}
                            className={cn(
                                "text-sm h-12 px-6 rounded-full transition-all shadow-md",
                                editMode 
                                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-none shadow-amber-200" 
                                    : "border-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                            )}
                        >
                            <Gift className="mr-2 h-5 w-5" />
                            {editMode ? '✓ Modo Edición Activo' : 'Editar Plazas con Puntos'}
                        </Button>
                    </div>
                )}

                {/* Componente de Reservas del Usuario */}
                <UserBookings 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                />

                <PersonalMatches 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                />
                <PersonalSchedule 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                    refreshKey={refreshKey}
                    editMode={isInstructor ? editMode : false}
                    instructorId={user.instructorId}
                />
                <PersonalMatchDay 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                />
            </main>
            {SHOW_EURO_BALANCE && (
                <CreditMovementsDialog
                    isOpen={isCreditMovementsDialogOpen}
                    onOpenChange={setIsCreditMovementsDialogOpen}
                    currentUser={user}
                />
            )}
            {SHOW_EURO_BALANCE && (
                <AddCreditDialog
                    isOpen={isAddCreditDialogOpen}
                    onOpenChange={setIsAddCreditDialogOpen}
                    userId={user.id}
                    onCreditAdded={handleCreditAdded}
                />
            )}
            {SHOW_EURO_BALANCE && (
                <ConvertBalanceDialog
                    isOpen={isConvertBalanceDialogOpen}
                    onOpenChange={setIsConvertBalanceDialogOpen}
                    currentUser={user}
                    onConversionSuccess={handleConversionSuccess}
                />
            )}
        </div>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando…</div>}>
            <DashboardPageContent />
        </Suspense>
    );
}

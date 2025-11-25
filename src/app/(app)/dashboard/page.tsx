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
import { Wallet, Star, History, Repeat, PlusCircle, PiggyBank, Lock, Sparkles, CalendarDays, User } from 'lucide-react';
import CreditMovementsDialog from '@/components/user/CreditMovementsDialog';
import PointMovementsDialog from '@/components/user/PointMovementsDialog';
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
    const [isPointMovementsDialogOpen, setIsPointMovementsDialogOpen] = useState(false);
    const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
    const [isConvertBalanceDialogOpen, setIsConvertBalanceDialogOpen] = useState(false);
    const [isEditLevelDialogOpen, setIsEditLevelDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

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
        <div className="flex-1 space-y-2 sm:space-y-6 lg:space-y-8 p-2 sm:p-4 md:p-6 lg:p-8">
            <header className="mb-2 sm:mb-6">
                {/* Barra superior con gradiente */}
                <div className="rounded-lg p-4 sm:p-6 mb-4" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Título y nombre del usuario */}
                        <div className="flex items-center gap-3">
                            <CalendarDays className="h-8 w-8 text-white" />
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white">
                                    Tu Agenda
                                </h1>
                                <p className="text-sm text-white/90">{user.name}</p>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2">
                            <Link href="/profile" className="flex-1 sm:flex-initial">
                                <Button variant="secondary" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30">
                                    <User className="mr-2 h-4 w-4" />
                                    Mis Datos
                                </Button>
                            </Link>
                            <Link href="/admin/calendar" className="flex-1 sm:flex-initial">
                                <Button variant="secondary" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    Calendario Club
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="space-y-2 sm:space-y-6 lg:space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
                    {SHOW_EURO_BALANCE && (
                        <Card className="shadow-md">
                            <CardHeader className="pb-1 pt-2 px-3 sm:pb-1.5 sm:pt-3 sm:px-4">
                                <CardTitle className="text-sm sm:text-base flex items-center text-green-700">
                                    <Wallet className="mr-1.5 h-4 w-4" />
                                    Tu Saldo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5 px-3 pb-2 sm:space-y-2 sm:px-4 sm:pb-3">
                                <div className="text-xl sm:text-2xl font-bold" style={{ color: '#2563eb' }} data-ui="balance-blue">
                                    {availableCredit.toFixed(2)}€
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <div className="flex-1 p-1 bg-muted rounded text-center">
                                        <p className="flex items-center justify-center gap-0.5 text-[10px]"><PiggyBank className="h-2.5 w-2.5"/> Total</p>
                                        <p className="font-semibold text-foreground text-xs">{creditInEuros.toFixed(2)}€</p>
                                    </div>
                                    <div className="flex-1 p-1 bg-muted rounded text-center">
                                        <p className="flex items-center justify-center gap-0.5 text-[10px]"><Lock className="h-2.5 w-2.5"/> Bloq.</p>
                                        <p className="font-semibold text-foreground text-xs">{blockedCreditInEuros.toFixed(2)}€</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <Button variant="default" size="sm" onClick={() => setIsAddCreditDialogOpen(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-7">
                                        <PlusCircle className="mr-0.5 h-3 w-3" />
                                        <span className="hidden xs:inline">Añadir</span>
                                        <span className="xs:hidden">+</span>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsCreditMovementsDialogOpen(true)} className="flex-1 text-xs h-7">
                                        <History className="mr-0.5 h-3 w-3" /> 
                                        <span className="hidden xs:inline">Movimientos</span>
                                        <span className="xs:hidden">Hist</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card className="shadow-md">
                        <CardHeader className="pb-1 pt-2 px-3 sm:pb-1.5 sm:pt-3 sm:px-4">
                            <CardTitle className="text-sm sm:text-base flex items-center text-amber-600">
                                <Star className="mr-1.5 h-4 w-4" />
                                Tus Puntos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 px-3 pb-2 sm:space-y-2 sm:px-4 sm:pb-3">
                             <div className="text-xl sm:text-2xl font-bold text-foreground">{availablePoints.toFixed(0)}</div>
                             <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                 <div className="flex-1 p-1 bg-muted rounded text-center">
                                     <p className="flex items-center justify-center gap-0.5 text-[10px]"><PiggyBank className="h-2.5 w-2.5"/> Total</p>
                                     <p className="font-semibold text-foreground text-xs">{(user.points ?? user.loyaltyPoints ?? 0).toFixed(0)}</p>
                                 </div>
                                 <div className="flex-1 p-1 bg-muted rounded text-center">
                                     <p className="flex items-center justify-center gap-0.5 text-[10px]"><Lock className="h-2.5 w-2.5"/> Bloq.</p>
                                     <p className="font-semibold text-foreground text-xs">{(user.blockedLoyaltyPoints ?? 0).toFixed(0)}</p>
                                 </div>
                                  <div className="flex-1 p-1 bg-muted rounded text-center">
                                     <p className="flex items-center justify-center gap-0.5 text-[10px]"><Sparkles className="h-2.5 w-2.5"/> Pend.</p>
                                     <p className="font-semibold text-foreground text-xs">{(user.pendingBonusPoints ?? 0).toFixed(0)}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-1.5 pt-0.5">
                                {SHOW_EURO_BALANCE && (
                                    <Button variant="default" size="sm" onClick={() => setIsConvertBalanceDialogOpen(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-xs h-7">
                                        <Repeat className="mr-0.5 h-3 w-3" />
                                        <span className="hidden xs:inline">Convertir</span>
                                        <span className="xs:hidden">Conv</span>
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setIsPointMovementsDialogOpen(true)} className="flex-1 text-xs h-7">
                                    <History className="mr-0.5 h-3 w-3" /> 
                                    <span className="hidden xs:inline">Movimientos</span>
                                    <span className="xs:hidden">Hist</span>
                                </Button>
                             </div>
                         </CardContent>
                    </Card>
                </div>

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
            <PointMovementsDialog
                isOpen={isPointMovementsDialogOpen}
                onOpenChange={setIsPointMovementsDialogOpen}
                currentUser={user}
            />
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

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
import SimpleAvatar from '@/components/user/profile/SimpleAvatar';
import ChangePasswordDialog from '@/components/user/profile/ChangePasswordDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet, Star, History, Repeat, PlusCircle, PiggyBank, Lock, Sparkles, CalendarDays, User, Gift, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';
import EditLevelDialog from '@/components/user/EditLevelDialog';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


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
    const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
    const [isConvertBalanceDialogOpen, setIsConvertBalanceDialogOpen] = useState(false);
    const [isEditLevelDialogOpen, setIsEditLevelDialogOpen] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
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
                    setIsInstructor(userData.role === 'INSTRUCTOR' || userData.role === 'ADMIN');
                }
            } catch (error) {
                console.error('❌ Error al cargar usuario:', error);
            } finally {
                setIsLoadingUser(false);
            }
        };
        
        loadUser();
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

    // Debug: Detectar overlays bloqueantes (ejecutar solo una vez)
    // Eliminado: useEffect de debug que causaba spam en consola

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
        <div className="flex-1 space-y-2 sm:space-y-6 lg:space-y-8 pl-20 sm:pl-20 md:pl-24 pr-2 sm:pr-4 md:pr-6 py-2 sm:py-4 md:py-6 lg:py-8 pointer-events-auto">
            <main className="space-y-2 sm:space-y-6 lg:space-y-8 pointer-events-auto">
                {/* Panel de Datos del Usuario */}
                <Card className="shadow-md">
                    <CardHeader className="pb-3 pt-4 px-4 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 border-b rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-white" />
                                <CardTitle className="text-lg text-white">
                                    Hola, {user.name}
                                </CardTitle>
                            </div>
                            <Button 
                                onClick={() => setIsLogoutDialogOpen(true)}
                                variant="destructive" 
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Cerrar Sesión
                            </Button>
                        </div>
                        <CardDescription className="text-sm text-white/90">
                            Información de tu perfil
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        {/* Avatar del usuario */}
                        <div className="mb-4">
                            <SimpleAvatar
                                userId={user?.id || ''}
                                userName={user?.name || ''}
                                fileInputRef={fileInputRef}
                            />
                        </div>
                        
                        <div className="bg-white rounded-lg overflow-hidden border">
                            <EditableInfoRow
                                id="dashboard-name"
                                label="Nombre"
                                value={name}
                                isEditing={isEditingName}
                                onEditClick={() => setIsEditingName(true)}
                                onSaveClick={handleSaveName}
                                onCancelClick={() => { setIsEditingName(false); setName(user.name || ''); }}
                                onChange={(e) => handleNameChange(e as React.ChangeEvent<HTMLInputElement>)}
                                isFirst
                                showSeparator={!isEditingName}
                            />
                            <EditableInfoRow
                                id="dashboard-email"
                                label="Email"
                                value={email}
                                isEditing={isEditingEmail}
                                onEditClick={() => setIsEditingEmail(true)}
                                onSaveClick={handleSaveEmail}
                                onCancelClick={() => { setIsEditingEmail(false); setEmail(user.email || ''); }}
                                onChange={(e) => handleEmailChange(e as React.ChangeEvent<HTMLInputElement>)}
                                inputType="email"
                                showSeparator={!isEditingEmail}
                            />
                            <EditableInfoRow
                                id="dashboard-level"
                                label="Nivel de Juego"
                                value={selectedLevel}
                                isEditing={isEditingLevel}
                                onEditClick={() => setIsEditingLevel(true)}
                                onSaveClick={handleSaveLevel}
                                onCancelClick={() => { setIsEditingLevel(false); setSelectedLevel(user.level); }}
                                onChange={(val) => handleLevelChange(val as MatchPadelLevel)}
                                inputType="select"
                                selectOptions={[
                                    { label: 'Principiante', value: 'principiante' },
                                    { label: 'Intermedio', value: 'intermedio' },
                                    { label: 'Avanzado', value: 'avanzado' },
                                    { label: 'Profesional', value: 'profesional' }
                                ]}
                                selectPlaceholder="Selecciona tu nivel"
                                showSeparator={!isEditingLevel}
                            />
                            <EditableInfoRow
                                id="dashboard-gender"
                                label="Categoría (Género)"
                                value={selectedGenderCategory}
                                isEditing={isEditingGenderCategory}
                                onEditClick={() => setIsEditingGenderCategory(true)}
                                onSaveClick={handleSaveGenderCategory}
                                onCancelClick={() => { setIsEditingGenderCategory(false); setSelectedGenderCategory(user.genderCategory); }}
                                onChange={(val) => handleGenderCategoryChange(val as UserGenderCategory)}
                                inputType="select"
                                selectOptions={[
                                    { label: 'Masculino', value: 'masculino' },
                                    { label: 'Femenino', value: 'femenino' },
                                    { label: 'Mixto', value: 'mixto' }
                                ]}
                                selectPlaceholder="Selecciona tu categoría"
                                showSeparator={false}
                            />
                            
                            {/* Botón de cambiar contraseña */}
                            <button 
                                onClick={() => setIsChangePasswordDialogOpen(true)} 
                                className="flex items-center justify-between p-4 bg-white w-full text-left border-t border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                                <span className="text-sm text-gray-500">••••••••</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>

               <div className="grid grid-cols-1 gap-2">
                    {/* Panel Mejorado con 3 Bloques */}
                    <Card className="shadow-md">
                        <CardHeader className="pb-3 pt-3 px-4 bg-gradient-to-r from-blue-50 via-purple-50 to-amber-50 border-b">
                            <CardTitle className="text-base flex items-center justify-center text-gray-800">
                                <Wallet className="mr-2 h-5 w-5 text-blue-600" />
                                Saldo y Puntos
                                <Star className="ml-2 h-5 w-5 text-amber-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* BLOQUE 1: Saldo en Euros */}
                                {SHOW_EURO_BALANCE && (
                                    <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-5 w-5 text-blue-600" />
                                                <span className="text-sm font-bold text-blue-900">Saldo en Euros</span>
                                            </div>
                                        </div>
                                        
                                        {/* Disponible */}
                                        <div className="bg-white/80 rounded-lg p-3 border border-blue-200">
                                            <p className="text-xs text-gray-600 mb-1">💰 Disponible</p>
                                            <p className="text-2xl font-bold text-blue-600">{availableCredit.toFixed(2)}€</p>
                                        </div>
                                        
                                        {/* Total y Bloqueado */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/60 rounded p-2 text-center border border-blue-100">
                                                <p className="text-[10px] text-gray-600">Total</p>
                                                <p className="text-sm font-semibold text-gray-800">{creditInEuros.toFixed(2)}€</p>
                                            </div>
                                            <div className="bg-white/60 rounded p-2 text-center border border-blue-100">
                                                <p className="text-[10px] text-gray-600">🔒 Bloqueado</p>
                                                <p className="text-sm font-semibold text-orange-600">{blockedCreditInEuros.toFixed(2)}€</p>
                                            </div>
                                        </div>
                                        
                                        {/* Botones */}
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={() => setIsAddCreditDialogOpen(true)} 
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-sm h-9"
                                            >
                                                <PlusCircle className="mr-1 h-4 w-4" />
                                                Añadir
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* BLOQUE 2: Saldo en Puntos */}
                                <div className="space-y-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-200 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Star className="h-5 w-5 text-amber-600" />
                                            <span className="text-sm font-bold text-amber-900">Saldo en Puntos</span>
                                        </div>
                                    </div>
                                    
                                    {/* Disponible */}
                                    <div className="bg-white/80 rounded-lg p-3 border border-amber-200">
                                        <p className="text-xs text-gray-600 mb-1">⭐ Disponibles</p>
                                        <p className="text-2xl font-bold text-amber-600">{availablePoints.toFixed(0)}</p>
                                    </div>
                                    
                                    {/* Total y Bloqueado */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/60 rounded p-2 text-center border border-amber-100">
                                            <p className="text-[10px] text-gray-600">Total</p>
                                            <p className="text-sm font-semibold text-gray-800">{(user.points ?? 0).toFixed(0)}</p>
                                        </div>
                                        <div className="bg-white/60 rounded p-2 text-center border border-amber-100">
                                            <p className="text-[10px] text-gray-600">🔒 Bloqueados</p>
                                            <p className="text-sm font-semibold text-orange-600">{(user.blockedLoyaltyPoints ?? 0).toFixed(0)}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Botones */}
                                    <div className="flex gap-2">
                                        {SHOW_EURO_BALANCE && (
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={() => setIsConvertBalanceDialogOpen(true)} 
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-sm h-9"
                                            >
                                                <Repeat className="mr-1 h-4 w-4" />
                                                Convertir
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* BLOQUE 3: Panel de Historial */}
                                <div className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <History className="h-5 w-5 text-purple-600" />
                                            <span className="text-sm font-bold text-purple-900">Historial</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs text-gray-600 text-center mb-4">
                                            Consulta todos tus movimientos de euros y puntos
                                        </p>
                                        
                                        {/* Botón grande de historial */}
                                        <Button 
                                            variant="outline" 
                                            size="lg"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('🔍 Click en Ver Historial! Navegando');
                                                window.location.href = '/movimientos';
                                            }} 
                                            className="w-full bg-white hover:bg-purple-50 border-2 border-purple-300 text-purple-700 font-semibold h-20 flex-col gap-2"
                                            style={{pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer'}}
                                        >
                                            <History className="h-8 w-8" />
                                            <span>Ver Movimientos</span>
                                        </Button>
                                        
                                        <div className="text-center text-xs text-gray-500 mt-2">
                                            <p>Euros • Puntos • Bloqueos</p>
                                        </div>
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
            </main>
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
            <ChangePasswordDialog
                isOpen={isChangePasswordDialogOpen}
                onOpenChange={setIsChangePasswordDialogOpen}
                userId={user.id}
            />

            {/* Diálogo de confirmación para cerrar sesión */}
            <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres cerrar tu sesión? Tendrás que volver a iniciar sesión para acceder a tu cuenta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                // Limpiar datos de sesión
                                localStorage.removeItem('currentUser');
                                sessionStorage.clear();
                                // Redirigir a login
                                window.location.href = '/auth/login';
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Cerrar Sesión
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

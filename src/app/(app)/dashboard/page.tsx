// src/app/(app)/dashboard/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { getMockCurrentUser, setGlobalCurrentUser, updateUserLevel, updateUserGenderCategory } from '@/lib/mockData';
import type { User, MatchPadelLevel, UserGenderCategory } from '@/types';
import MobileHub from '@/components/mobile/MobileHub';
import { Button } from '@/components/ui/button';
import { Settings, Edit, UserCircle2 } from 'lucide-react';
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
import { Wallet, Star, History, Repeat, PlusCircle, PiggyBank, Lock, Sparkles, CalendarDays, Gift, LogOut, GraduationCap, Shield, Crown } from 'lucide-react';
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
                    const data = await response.json();
                    const userData = data.user || data; // Soportar ambos formatos
                    console.log('✅ Usuario cargado desde API:', {
                        id: userData.id,
                        email: userData.email,
                        credits: userData.credits,
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

    // Pass logout handler to MobileHub
    const handleMobileLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (e) {
            window.location.href = '/';
        }
    };

    // Los valores ya vienen en euros desde la API (ya divididos entre 100)
    const creditInEuros = (user.credits ?? user.credit ?? 0);
    const blockedCreditInEuros = (user.blockedCredits ?? user.blockedCredit ?? 0);
    const availableCredit = creditInEuros - blockedCreditInEuros;

    const availablePoints = (user.points ?? user.loyaltyPoints ?? 0) - (user.blockedLoyaltyPoints ?? 0);
    const hasPendingPoints = (user.pendingBonusPoints ?? 0) > 0;

    // Determinar el rol y sus características
    const userRole = user.role || 'PLAYER';
    const getRoleConfig = () => {
        switch (userRole) {
            case 'SUPER_ADMIN':
                return {
                    title: 'Super Administrador',
                    icon: Crown,
                    gradient: 'from-purple-500 via-pink-500 to-red-500',
                    badge: 'destructive',
                    description: 'Acceso completo al sistema'
                };
            case 'CLUB_ADMIN':
                return {
                    title: 'Administrador del Club',
                    icon: Shield,
                    gradient: 'from-orange-400 via-red-500 to-pink-500',
                    badge: 'default',
                    description: 'Gestión del club'
                };
            case 'INSTRUCTOR':
                return {
                    title: 'Instructor',
                    icon: GraduationCap,
                    gradient: 'from-green-400 via-teal-500 to-blue-500',
                    badge: 'secondary',
                    description: 'Gestión de clases y partidas'
                };
            default:
                return {
                    title: 'Jugador',
                    icon: UserCircle2,
                    gradient: 'from-blue-400 via-blue-500 to-blue-600',
                    badge: 'outline',
                    description: 'Información de tu perfil'
                };
        }
    };

    const roleConfig = getRoleConfig();
    const RoleIcon = roleConfig.icon;

    return (
        <>
            {/* Mobile Hub View - Visible only on mobile */}
            <MobileHub user={user} club={null} onLogout={handleMobileLogout} />

            {/* Desktop Dashboard View - Visible only on desktop */}
            <div className="hidden md:block w-full max-w-[1150px] space-y-2 sm:space-y-6 lg:space-y-8 pl-0 md:pl-36 lg:pl-44 pr-6 py-8 pointer-events-auto">
                <main className="space-y-2 sm:space-y-6 lg:space-y-8 pointer-events-auto">
                    {/* Panel de Datos del Usuario */}
                    <Card className="shadow-md">
                        <CardHeader className={`pb-3 pt-4 px-4 bg-gradient-to-r ${roleConfig.gradient} border-b rounded-t-lg`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                                        <RoleIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg text-white flex items-center gap-2">
                                            Hola, {user.name}
                                            <Badge variant={roleConfig.badge as any} className="text-xs">
                                                {roleConfig.title}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-sm text-white/90">
                                            {roleConfig.description}
                                        </CardDescription>
                                    </div>
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

                            {/* Información específica del rol */}
                            {userRole !== 'PLAYER' && (
                                <div className={`mb-4 p-3 rounded-lg border-2 ${userRole === 'SUPER_ADMIN' ? 'bg-purple-50 border-purple-200' :
                                    userRole === 'CLUB_ADMIN' ? 'bg-orange-50 border-orange-200' :
                                        'bg-green-50 border-green-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <RoleIcon className={`h-5 w-5 ${userRole === 'SUPER_ADMIN' ? 'text-purple-600' :
                                            userRole === 'CLUB_ADMIN' ? 'text-orange-600' :
                                                'text-green-600'
                                            }`} />
                                        <h3 className={`font-semibold ${userRole === 'SUPER_ADMIN' ? 'text-purple-900' :
                                            userRole === 'CLUB_ADMIN' ? 'text-orange-900' :
                                                'text-green-900'
                                            }`}>
                                            Privilegios de {roleConfig.title}
                                        </h3>
                                    </div>
                                    <div className={`text-sm space-y-1 ${userRole === 'SUPER_ADMIN' ? 'text-purple-700' :
                                        userRole === 'CLUB_ADMIN' ? 'text-orange-700' :
                                            'text-green-700'
                                        }`}>
                                        {userRole === 'SUPER_ADMIN' && (
                                            <>
                                                <p>✓ Acceso completo al sistema</p>
                                                <p>✓ Gestión de todos los clubes</p>
                                                <p>✓ Administración de usuarios globales</p>
                                                <p>✓ Configuración avanzada del sistema</p>
                                            </>
                                        )}
                                        {userRole === 'CLUB_ADMIN' && (
                                            <>
                                                <p>✓ Gestión completa del club</p>
                                                <p>✓ Administración de pistas e instructores</p>
                                                <p>✓ Gestión de clases y partidas</p>
                                                <p>✓ Reportes y estadísticas del club</p>
                                            </>
                                        )}
                                        {userRole === 'INSTRUCTOR' && (
                                            <>
                                                <p>✓ Gestión de tus clases programadas</p>
                                                <p>✓ Organización de partidas de 4 jugadores</p>
                                                <p>✓ Configuración de preferencias de enseñanza</p>
                                                <p>✓ Acceso al calendario del club</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                    label="Nivel de Juego (0.0 - 7.0)"
                                    value={selectedLevel}
                                    isEditing={isEditingLevel}
                                    onEditClick={() => setIsEditingLevel(true)}
                                    onSaveClick={handleSaveLevel}
                                    onCancelClick={() => { setIsEditingLevel(false); setSelectedLevel(user.level); }}
                                    onChange={(val) => handleLevelChange(val as MatchPadelLevel)}
                                    inputType="select"
                                    selectOptions={[
                                        { label: '0.0 - Principiante', value: '0.0' },
                                        { label: '0.5', value: '0.5' },
                                        { label: '1.0', value: '1.0' },
                                        { label: '1.5', value: '1.5' },
                                        { label: '2.0', value: '2.0' },
                                        { label: '2.5', value: '2.5' },
                                        { label: '3.0 - Intermedio bajo', value: '3.0' },
                                        { label: '3.5', value: '3.5' },
                                        { label: '4.0 - Intermedio', value: '4.0' },
                                        { label: '4.5', value: '4.5' },
                                        { label: '5.0 - Intermedio alto', value: '5.0' },
                                        { label: '5.5', value: '5.5' },
                                        { label: '6.0 - Avanzado', value: '6.0' },
                                        { label: '6.5', value: '6.5' },
                                        { label: '7.0 - Profesional', value: '7.0' }
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

                            {/* Accesos rápidos según el rol */}
                            {userRole !== 'PLAYER' && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Accesos Rápidos</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {userRole === 'SUPER_ADMIN' && (
                                            <>
                                                <Link href="/superadmin">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <Crown className="h-4 w-4 text-purple-600" />
                                                        Panel Super Admin
                                                    </Button>
                                                </Link>
                                                <Link href="/admin/database">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <Shield className="h-4 w-4 text-orange-600" />
                                                        Base de Datos
                                                    </Button>
                                                </Link>
                                            </>
                                        )}
                                        {userRole === 'CLUB_ADMIN' && (
                                            <>
                                                <Link href="/admin">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <Shield className="h-4 w-4 text-orange-600" />
                                                        Panel Admin
                                                    </Button>
                                                </Link>
                                                <Link href="/admin/calendar">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <CalendarDays className="h-4 w-4 text-blue-600" />
                                                        Calendario
                                                    </Button>
                                                </Link>
                                            </>
                                        )}
                                        {userRole === 'INSTRUCTOR' && (
                                            <>
                                                <Link href="/instructor">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <GraduationCap className="h-4 w-4 text-green-600" />
                                                        Panel Instructor
                                                    </Button>
                                                </Link>
                                                <Link href="/admin/calendar">
                                                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                                        <CalendarDays className="h-4 w-4 text-blue-600" />
                                                        Calendario
                                                    </Button>
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

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
        </>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando…</div>}>
            <DashboardPageContent />
        </Suspense>
    );
}

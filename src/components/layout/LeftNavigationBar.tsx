'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Calendar, CalendarDays, UserCircle, Database, Settings, Target, GraduationCap, Wallet, SlidersHorizontal, UserCog, Trophy, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Club } from '@/types';

export function LeftNavigationBar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [clubInfo, setClubInfo] = useState<Club | null>(null);
    const [hasReservations, setHasReservations] = useState(false);
    const [hasInscriptions, setHasInscriptions] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [instructors, setInstructors] = useState<any[]>([]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/users/current');
                if (response.ok) {
                    const data = await response.json();
                    const userData = data.user || data; // Soportar ambos formatos
                    setCurrentUser(userData);
                    
                    // Después de obtener el usuario, obtener sus reservas
                    if (userData?.id) {
                        fetchBookingsStatus(userData.id);
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        const fetchClub = async () => {
            try {
                // Primero intentar obtener el usuario para saber su clubId
                let clubId = 'padel-estrella-madrid'; // Default
                try {
                    const userResponse = await fetch('/api/users/current');
                    if (userResponse.ok) {
                        const data = await userResponse.json();
                        const userData = data.user || data; // Soportar ambos formatos
                        if (userData.clubId) {
                            clubId = userData.clubId;
                        }
                    }
                } catch (e) {
                    // Ignorar errores de usuario no autenticado
                }
                
                const response = await fetch('/api/clubs');
                if (response.ok) {
                    const clubs = await response.json();
                    
                    // Buscar el club del usuario
                    let club = clubs.find((c: any) => c.id === clubId);
                    
                    // Si no encuentra, buscar "Padel Estrella Madrid"
                    if (!club) {
                        club = clubs.find((c: any) => c.id === 'padel-estrella-madrid');
                    }
                    
                    // Si tampoco, usar el primero
                    if (!club && clubs.length > 0) {
                        club = clubs[0];
                    }
                    
                    if (club) {
                        setClubInfo(club);
                    }
                }
            } catch (error) {
                console.error('Error fetching club:', error);
            }
        };
        
        const fetchInstructors = async () => {
            try {
                const response = await fetch('/api/instructors?clubId=club-1');
                if (response.ok) {
                    const data = await response.json();
                    setInstructors(data);
                }
            } catch (error) {
                console.error('Error fetching instructors:', error);
            }
        };
        
        const fetchBookingsStatus = async (userId: string) => {
            try {
                const response = await fetch(`/api/bookings?userId=${userId}`);
                
                if (response.ok) {
                    const bookings = await response.json();
                    console.log('📊 Bookings fetched:', bookings);
                    
                    const now = new Date();
                    
                    // Verificar si hay reservas confirmadas FUTURAS (CONFIRMED y fecha futura)
                    const confirmed = bookings.filter((b: any) => 
                        b.status === 'CONFIRMED' && 
                        b.classStart && 
                        new Date(b.classStart) > now
                    );
                    setHasReservations(confirmed.length > 0);
                    console.log('✅ Reservas confirmadas futuras:', confirmed.length);
                    
                    // Verificar si hay inscripciones pendientes FUTURAS (PENDING y fecha futura)
                    const pending = bookings.filter((b: any) => 
                        b.status === 'PENDING' && 
                        b.classStart && 
                        new Date(b.classStart) > now
                    );
                    setHasInscriptions(pending.length > 0);
                    console.log('⏳ Inscripciones pendientes futuras:', pending.length);
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
            }
        };
        
        fetchUser();
        fetchClub();
        fetchInstructors();
    }, []); // Solo ejecutar una vez al montar
    
    // Recargar bookings periódicamente (separado del useEffect principal)
    useEffect(() => {
        if (!currentUser?.id) return;
        
        const intervalId = setInterval(() => {
            const fetchBookingsStatus = async (userId: string) => {
                try {
                    const response = await fetch(`/api/bookings?userId=${userId}`);
                    
                    if (response.ok) {
                        const bookings = await response.json();
                        const now = new Date();
                        
                        const confirmed = bookings.filter((b: any) => 
                            b.status === 'CONFIRMED' && 
                            b.classStart && 
                            new Date(b.classStart) > now
                        );
                        setHasReservations(confirmed.length > 0);
                        
                        const pending = bookings.filter((b: any) => 
                            b.status === 'PENDING' && 
                            b.classStart && 
                            new Date(b.classStart) > now
                        );
                        setHasInscriptions(pending.length > 0);
                    }
                } catch (error) {
                    console.error('Error fetching bookings:', error);
                }
            };
            
            fetchBookingsStatus(currentUser.id);
        }, 30000); // Cada 30 segundos (aumentado de 10 a 30)
        
        return () => clearInterval(intervalId);
    }, [currentUser?.id]);

    // Recargar cuando cambia la ruta (navegación)
    useEffect(() => {
        if (currentUser?.id) {
            const fetchBookingsStatus = async (userId: string) => {
                try {
                    const response = await fetch(`/api/bookings?userId=${userId}`);
                    
                    if (response.ok) {
                        const bookings = await response.json();
                        const now = new Date();
                        
                        const confirmed = bookings.filter((b: any) => 
                            b.status === 'CONFIRMED' && 
                            b.classStart && 
                            new Date(b.classStart) > now
                        );
                        setHasReservations(confirmed.length > 0);
                        
                        const pending = bookings.filter((b: any) => 
                            b.status === 'PENDING' && 
                            b.classStart && 
                            new Date(b.classStart) > now
                        );
                        setHasInscriptions(pending.length > 0);
                    }
                } catch (error) {
                    console.error('Error fetching bookings:', error);
                }
            };
            
            fetchBookingsStatus(currentUser.id);
        }
    }, [pathname, currentUser?.id]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const navItems = [
        {
            key: 'clases',
            href: '/activities?view=clases',
            icon: GraduationCap,
            label: 'Clases',
            isActive: pathname === '/activities',
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'partidas',
            href: '/matchgames',
            icon: Trophy,
            label: 'Partidas',
            isActive: pathname === '/matchgames',
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'calendario-club',
            href: '/admin/calendar',
            icon: CalendarDays,
            label: 'Calendario',
            isActive: pathname === '/admin/calendar',
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'super-admin',
            href: '/superadmin',
            icon: Target,
            label: 'Super Admin',
            isActive: pathname === '/superadmin',
            allowedRoles: ['SUPER_ADMIN'], // Solo Super Admin
        },
        {
            key: 'config-instructor',
            href: '/instructor',
            icon: UserCog,
            label: 'Config Instructor',
            isActive: pathname === '/instructor',
            allowedRoles: ['SUPER_ADMIN', 'INSTRUCTOR'], // Solo Super Admin e Instructor
        },
        {
            key: 'config-club',
            href: '/admin',
            icon: Settings,
            label: 'Config',
            isActive: pathname === '/admin',
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN'], // Solo Super Admin y Club Admin
        },
        {
            key: 'base-datos',
            href: '/admin/database',
            icon: Database,
            label: 'Base Datos',
            isActive: pathname === '/admin/database',
            allowedRoles: ['SUPER_ADMIN'], // Solo Super Admin
        },
    ];

    // Filtrar botones según el rol del usuario
    const visibleNavItems = navItems.filter(item => 
        currentUser && item.allowedRoles.includes(currentUser.role || 'PLAYER')
    );

    const misDatosItem = {
        key: 'mis-datos',
        href: '/dashboard',
        icon: UserCircle,
        label: 'Mis Datos',
        isActive: pathname === '/dashboard',
    };

    const misReservasItem = {
        key: 'mis-reservas',
        href: '/agenda',
        icon: ClipboardList,
        label: 'Reservas',
        isActive: pathname === '/agenda',
    };

    const handleNavClick = (e: React.MouseEvent, href: string, label: string) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Click en ${label}! Navegando a:`, href);
        window.location.href = href;
    };

    // Determinar si usar modo compacto
    const isCompactMode = pathname === '/admin/calendar' || 
                          pathname === '/agenda' ||
                          pathname === '/admin' ||
                          pathname === '/admin/club-info' ||
                          pathname === '/admin/matchgames' ||
                          pathname === '/admin/matchgames/create' ||
                          pathname.startsWith('/admin/') ||
                          pathname.startsWith('/instructor');

    // No mostrar nada mientras está cargando el usuario
    if (isLoading) {
        return null;
    }

    return (
        <>
            <div 
                className="fixed left-4 top-40 flex flex-col gap-2 items-start" 
                style={{ pointerEvents: 'auto', zIndex: 50, position: 'fixed' }}
            >
            {/* Botón de Cerrar Sesión / Iniciar Sesión - Grande y centrado */}
            <button
                onClick={async (e) => {
                    e.preventDefault();
                    if (currentUser) {
                        // Si hay usuario logueado, cerrar sesión
                        try {
                            const response = await fetch('/api/auth/logout', { method: 'POST' });
                            if (response.ok) {
                                window.location.href = '/';
                            } else {
                                console.error('Error en logout:', response.statusText);
                                window.location.href = '/';
                            }
                        } catch (error) {
                            console.error('Error al cerrar sesión:', error);
                            window.location.href = '/';
                        }
                    } else {
                        // Si no hay usuario, ir a página de inicio
                        window.location.href = '/';
                    }
                }}
                className={cn(
                    "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200 hover:border-red-400 shadow-lg",
                    isCompactMode
                        ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                        : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                )}
                style={{ pointerEvents: 'auto', zIndex: 99999 }}
            >
                <div className={cn(
                    "rounded-full flex items-center justify-center text-white flex-shrink-0",
                    isCompactMode ? 'w-10 h-10' : 'w-14 h-14',
                    "bg-gradient-to-br from-red-400 to-red-600"
                )}>
                    <Power className={isCompactMode ? 'w-5 h-5' : 'w-8 h-8'} />
                </div>
                <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                    {isCompactMode ? (
                        <div className="text-[10px] font-semibold text-gray-800">
                            {currentUser ? 'Salir' : 'Entrar'}
                        </div>
                    ) : (
                        <div className="text-sm font-semibold text-red-600">
                            {currentUser ? 'Cerrar sesión' : 'Iniciar sesión'}
                        </div>
                    )}
                </div>
            </button>
            
            {clubInfo && (
                <a
                    href="/club"
                    className={cn(
                        "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                        isCompactMode
                            ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]',
                        pathname === '/club' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                    )}
                >
                    <div className={cn(
                        "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                        isCompactMode ? 'w-10 h-10' : 'w-14 h-14',
                        "bg-gradient-to-br from-red-400 to-red-600",
                        pathname === '/club' && 'ring-4 ring-red-300 ring-opacity-50 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                    )}>
                        {clubInfo.logoUrl ? (
                            <img 
                                src={clubInfo.logoUrl} 
                                alt={clubInfo.name}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <span className={cn(
                                "font-bold text-white",
                                isCompactMode ? 'text-sm' : 'text-xl'
                            )}>
                                {clubInfo.name.substring(0, 2).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                        {isCompactMode ? (
                            <div className="text-[10px] font-semibold text-gray-800">Club</div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-800">
                                    {clubInfo.name}
                                </div>
                                <div className="text-xs text-gray-500">Ver club</div>
                            </>
                        )}
                    </div>
                </a>
            )}
            
            {/* Contenedor Mis Datos (antes Mi Agenda) */}
            <a
                href={misDatosItem.href}
                onClick={(e) => handleNavClick(e, misDatosItem.href, misDatosItem.label)}
                className={cn(
                    "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                    isCompactMode
                        ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                        : 'flex items-center gap-3 px-4 py-3 min-w-[220px]',
                    pathname === '/dashboard' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                )}
                style={{ pointerEvents: 'auto', zIndex: 99999 }}
            >
                <div className={cn(
                    "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    isCompactMode ? 'w-10 h-10' : 'w-14 h-14',
                    "bg-gradient-to-br from-blue-400 to-blue-600",
                    pathname === '/dashboard' && 'ring-4 ring-blue-300 ring-opacity-50 shadow-[0_0_25px_rgba(59,130,246,0.5)]'
                )}>
                    {currentUser?.profilePictureUrl ? (
                        <Avatar className={isCompactMode ? 'h-8 w-8' : 'h-10 w-10'}>
                            <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                            <AvatarFallback className="text-white bg-blue-500">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <UserCircle className={isCompactMode ? 'w-5 h-5 text-white' : 'w-8 h-8 text-white'} />
                    )}
                </div>
                <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                    {isCompactMode ? (
                        <div className="text-[10px] font-semibold text-gray-800">Perfil</div>
                    ) : (
                        <>
                            <div className="text-sm font-semibold text-gray-800">
                                {currentUser?.name || 'Usuario'}
                            </div>
                            <div className="text-xs text-gray-500">Mis Datos</div>
                        </>
                    )}
                </div>
            </a>
            
            {/* Contenedor para Clases, Partidas y Calendario */}
            <div className="flex flex-col gap-1.5">
                {visibleNavItems.filter(item => item.key === 'clases' || item.key === 'partidas' || item.key === 'calendario-club').map((item) => {
                    const IconComponent = item.icon;
                    
                    return (
                        <a
                            key={item.key}
                            href={item.href}
                            onClick={(e) => handleNavClick(e, item.href, item.label)}
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                                    : 'flex items-center gap-3 px-4 py-3 min-w-[220px]',
                                item.isActive ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                            )}
                            style={{ pointerEvents: 'auto', zIndex: 99999 }}
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300",
                                isCompactMode ? 'w-10 h-10' : 'w-14 h-14',
                                item.key === 'clases' 
                                    ? "bg-gradient-to-br from-blue-400 to-purple-600 text-white"
                                    : item.key === 'partidas'
                                    ? "bg-gradient-to-br from-green-400 to-green-600 text-white"
                                    : "bg-white text-gray-500 border-2 border-gray-500",
                                item.isActive && (
                                    item.key === 'clases' 
                                        ? 'ring-4 ring-purple-300 ring-opacity-50 shadow-[0_0_25px_rgba(168,85,247,0.5)]'
                                        : item.key === 'partidas'
                                        ? 'ring-4 ring-green-300 ring-opacity-50 shadow-[0_0_25px_rgba(34,197,94,0.5)]'
                                        : 'ring-4 ring-gray-300 ring-opacity-50 shadow-[0_0_25px_rgba(156,163,175,0.5)]'
                                )
                            )}>
                                <IconComponent className={isCompactMode ? 'w-5 h-5' : 'w-8 h-8'} />
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                                {isCompactMode ? (
                                    <div className="text-[10px] font-semibold text-gray-800">
                                        {item.key === 'clases' ? 'Clases' : item.key === 'partidas' ? 'Partidas' : 'Calendario'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-gray-800">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.key === 'clases' ? 'Ver clases' : item.key === 'partidas' ? 'Ver partidas' : 'Ver calendario'}
                                        </div>
                                    </>
                                )}
                            </div>
                        </a>
                    );
                })}
            </div>
            
            {/* Instructores Disponibles - Solo en la página del calendario del club */}
            {instructors.length > 0 && pathname === '/admin/calendar' && (
                <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t-2 border-gray-200">
                    <div className={cn(
                        "text-gray-600 font-semibold uppercase tracking-wide mb-2",
                        isCompactMode ? 'text-[9px] text-center px-1' : 'text-xs px-2'
                    )}>
                        FILTROS
                    </div>
                    <div className={cn(
                        "text-gray-600 font-semibold pt-2 border-t border-gray-200",
                        isCompactMode ? 'text-[9px] text-center px-1' : 'text-xs px-2'
                    )}>
                        Instructores
                    </div>
                    {instructors.map((instructor) => {
                        // Determinar la URL de la foto del instructor
                        const photoUrl = instructor.photo || instructor.profilePicture || instructor.profilePictureUrl || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=6366f1&color=fff&size=128`;
                        
                        // Verificar si este instructor está seleccionado
                        const isSelected = searchParams.get('instructor') === instructor.id;
                        
                        return (
                            <button
                                key={instructor.id}
                                onClick={() => router.push(`/admin/calendar?instructor=${instructor.id}`)}
                                className={cn(
                                    "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 shadow-lg",
                                    isSelected ? 'border-blue-500 scale-105 animate-bounce-subtle' : 'border-gray-200',
                                    isCompactMode
                                        ? 'flex flex-col items-center gap-1 px-3 py-2' 
                                        : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                                )}
                                style={{ pointerEvents: 'auto', zIndex: 99999 }}
                            >
                                <div className={cn(
                                    "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 border-2 border-white shadow-md",
                                    isCompactMode ? 'w-10 h-10' : 'w-14 h-14'
                                )}>
                                    <img 
                                        src={photoUrl} 
                                        alt={instructor.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback si la imagen falla
                                            const target = e.target as HTMLImageElement;
                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=6366f1&color=fff&size=128`;
                                        }}
                                    />
                                </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                                {isCompactMode ? (
                                    <div className="text-[10px] font-semibold text-gray-800 max-w-[70px] truncate">
                                        {instructor.name.split(' ')[0]}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-gray-800">
                                            {instructor.name.split(' ')[0]}
                                        </div>
                                        <div className="text-xs text-gray-500">Instructor</div>
                                    </>
                                )}
                            </div>
                        </button>
                    );
                    })}
                </div>
            )}
            
            {/* Contenedor múltiple con Reservas, Inscripciones, Saldo y otros botones */}
            <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t-2 border-gray-200">
                {/* 🎯 Botón R - Ir a Mis Reservas */}
                <button
                    onClick={() => window.location.href = '/agenda?tab=confirmed'}
                    className={cn(
                        "bg-white rounded-3xl border-2 border-gray-200 hover:shadow-xl transition-all",
                        isCompactMode
                            ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]',
                        pathname === '/agenda' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                    )}
                    title="Reservas (R): Clases confirmadas con pista asignada"
                >
                    <div className={cn(
                        "rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold",
                        isCompactMode ? 'w-10 h-10 text-lg' : 'w-14 h-14 text-2xl',
                        'bg-white text-gray-500 border-gray-500',
                        pathname === '/agenda' && 'ring-4 ring-gray-300 ring-opacity-50 shadow-[0_0_25px_rgba(156,163,175,0.5)]'
                    )}>
                        R
                    </div>
                    <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                        {isCompactMode ? (
                            <div className="text-[10px] font-semibold text-gray-800">Reservas</div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-800">Reservas</div>
                                <div className="text-xs text-gray-500">
                                    {hasReservations ? 'Tienes reservas' : 'Sin reservas'}
                                </div>
                            </>
                        )}
                    </div>
                </button>

                {/* ℹ️ Botón I - Inscripciones */}
                <button
                    onClick={() => window.location.href = '/agenda'}
                    className={cn(
                        "bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all",
                        isCompactMode
                            ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                    )}
                    title="Inscripciones (I): Clases pendientes esperando completar grupo"
                >
                    <div className={cn(
                        "rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold",
                        isCompactMode ? 'w-10 h-10 text-lg' : 'w-14 h-14 text-2xl',
                        'bg-white text-gray-500 border-gray-500'
                    )}>
                        I
                    </div>
                    <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                        {isCompactMode ? (
                            <div className="text-[10px] font-semibold text-gray-800">Inscrip.</div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-800">Inscripciones</div>
                                <div className="text-xs text-gray-500">
                                    {hasInscriptions ? 'Pendientes' : 'Sin inscripciones'}
                                </div>
                            </>
                        )}
                    </div>
                </button>

                {/* 💰 Botón Saldo - Movimientos de Saldo */}
                <button
                    onClick={() => window.location.href = '/movimientos'}
                    className={cn(
                        "bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all",
                        isCompactMode
                            ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                    )}
                    title="Movimientos de Saldo: Consulta tu saldo y transacciones"
                >
                    <div className={cn(
                        "rounded-full flex items-center justify-center flex-shrink-0 bg-white text-gray-500 border-2 border-gray-500",
                        isCompactMode ? 'w-10 h-10' : 'w-14 h-14'
                    )}>
                        <Wallet className={isCompactMode ? 'w-5 h-5' : 'w-8 h-8'} />
                    </div>
                    <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                        {isCompactMode ? (
                            <div className="text-[10px] font-semibold text-gray-800">Saldo</div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-800">Saldo</div>
                                <div className="text-xs text-gray-500">Movimientos</div>
                            </>
                        )}
                    </div>
                </button>
                
                {/* Resto de botones (Base Datos, Config) excepto Clases, Partidas y Calendario */}
                {visibleNavItems.filter(item => item.key !== 'clases' && item.key !== 'partidas' && item.key !== 'calendario-club').map((item) => {
                    const IconComponent = item.icon;
                    
                    return (
                        <a
                            key={item.key}
                            href={item.href}
                            onClick={(e) => handleNavClick(e, item.href, item.label)}
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-3 py-2 w-20' 
                                    : 'flex items-center gap-3 px-4 py-3 min-w-[220px]',
                                item.isActive ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                            )}
                            style={{ pointerEvents: 'auto', zIndex: 99999 }}
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300",
                                isCompactMode ? 'w-10 h-10' : 'w-14 h-14',
                                item.key === 'calendario-club' && "bg-white text-gray-500 border-2 border-gray-500",
                                item.key === 'base-datos' && "bg-white text-gray-500 border-2 border-gray-500",
                                item.key === 'config-club' && "bg-white text-gray-500 border-2 border-gray-500",
                                item.key === 'config-instructor' && "bg-white text-gray-500 border-2 border-gray-500",
                                item.isActive && (
                                    item.key === 'calendario-club' 
                                        ? 'ring-4 ring-orange-300 ring-opacity-50 shadow-[0_0_25px_rgba(251,146,60,0.5)]'
                                        : item.key === 'base-datos'
                                        ? 'ring-4 ring-indigo-300 ring-opacity-50 shadow-[0_0_25px_rgba(129,140,248,0.5)]'
                                        : item.key === 'config-instructor'
                                        ? 'ring-4 ring-teal-300 ring-opacity-50 shadow-[0_0_25px_rgba(45,212,191,0.5)]'
                                        : 'ring-4 ring-gray-300 ring-opacity-50 shadow-[0_0_25px_rgba(156,163,175,0.5)]'
                                )
                            )}>
                                <IconComponent className={isCompactMode ? 'w-5 h-5' : 'w-8 h-8'} />
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1')}>
                                {isCompactMode ? (
                                    <div className="text-[10px] font-semibold text-gray-800">
                                        {item.key === 'calendario-club' && 'Calend.'}
                                        {item.key === 'base-datos' && 'Datos'}
                                        {item.key === 'config-club' && 'Config'}
                                        {item.key === 'config-instructor' && 'Instr.'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.key === 'calendario-club' && 'Ver calendario'}
                                            {item.key === 'base-datos' && 'Administrar'}
                                            {item.key === 'config-club' && 'Configurar'}
                                        </div>
                                    </>
                                )}
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
        </>
    );
}



'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Calendar, CalendarDays, UserCircle, Database, Settings, Target, GraduationCap, Wallet, SlidersHorizontal, UserCog, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Club } from '@/types';

export function LeftNavigationBar() {
    const pathname = usePathname();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [clubInfo, setClubInfo] = useState<Club | null>(null);
    const [hasReservations, setHasReservations] = useState(false);
    const [hasInscriptions, setHasInscriptions] = useState(false);

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
        !currentUser || item.allowedRoles.includes(currentUser.role || 'USER')
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

    return (
        <>
            <div 
                className="fixed left-4 top-40 flex flex-col gap-2 items-start" 
                style={{ pointerEvents: 'auto', zIndex: 50, position: 'fixed' }}
            >
            {clubInfo && (
                <a
                    href="/club"
                    className={cn(
                        "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                        pathname === '/admin/calendar' 
                            ? 'flex flex-col items-center gap-1 px-3 py-2' 
                            : 'flex items-center gap-3 px-4 min-w-[220px]',
                        pathname === '/club' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg',
                        pathname === '/club' && pathname !== '/admin/calendar' ? 'py-4' : pathname !== '/admin/calendar' ? 'py-3' : ''
                    )}
                >
                    <div className={cn(
                        "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                        pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
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
                                pathname === '/admin/calendar' ? 'text-sm' : 'text-xl'
                            )}>
                                {clubInfo.name.substring(0, 2).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                        {pathname === '/admin/calendar' ? (
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
                    pathname === '/admin/calendar' 
                        ? 'flex flex-col items-center gap-1 px-3 py-2' 
                        : 'flex items-center gap-3 px-4 min-w-[220px]',
                    pathname === '/dashboard' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg',
                    pathname === '/dashboard' && pathname !== '/admin/calendar' ? 'py-4' : pathname !== '/admin/calendar' ? 'py-3' : ''
                )}
                style={{ pointerEvents: 'auto', zIndex: 99999 }}
            >
                <div className={cn(
                    "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
                    "bg-gradient-to-br from-blue-400 to-blue-600",
                    pathname === '/dashboard' && 'ring-4 ring-blue-300 ring-opacity-50 shadow-[0_0_25px_rgba(59,130,246,0.5)]'
                )}>
                    {currentUser?.profilePictureUrl ? (
                        <Avatar className={pathname === '/admin/calendar' ? 'h-10 w-10' : 'h-14 w-14'}>
                            <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                            <AvatarFallback className="text-white bg-blue-500">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <UserCircle className={pathname === '/admin/calendar' ? 'w-5 h-5 text-white' : 'w-8 h-8 text-white'} />
                    )}
                </div>
                <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                    {pathname === '/admin/calendar' ? (
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
            
            {/* Contenedor para Clases y Partidas */}
            <div className="flex flex-col gap-1.5">
                {visibleNavItems.filter(item => item.key === 'clases' || item.key === 'partidas').map((item) => {
                    const IconComponent = item.icon;
                    
                    return (
                        <a
                            key={item.key}
                            href={item.href}
                            onClick={(e) => handleNavClick(e, item.href, item.label)}
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                pathname === '/admin/calendar' 
                                    ? 'flex flex-col items-center gap-1 px-3 py-2' 
                                    : 'flex items-center gap-3 px-4 min-w-[220px]',
                                item.isActive ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg',
                                item.isActive && pathname !== '/admin/calendar' ? 'py-4' : pathname !== '/admin/calendar' ? 'py-3' : ''
                            )}
                            style={{ pointerEvents: 'auto', zIndex: 99999 }}
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden transition-all duration-300",
                                pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
                                item.key === 'clases' 
                                    ? "bg-gradient-to-br from-green-400 to-green-600"
                                    : "bg-gradient-to-br from-purple-400 to-purple-600",
                                item.isActive && (
                                    item.key === 'clases' 
                                        ? 'ring-4 ring-green-300 ring-opacity-50 shadow-[0_0_25px_rgba(34,197,94,0.5)]'
                                        : 'ring-4 ring-purple-300 ring-opacity-50 shadow-[0_0_25px_rgba(168,85,247,0.5)]'
                                )
                            )}>
                                <IconComponent className={pathname === '/admin/calendar' ? 'w-5 h-5' : 'w-8 h-8'} />
                            </div>
                            <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                                {pathname === '/admin/calendar' ? (
                                    <div className="text-[10px] font-semibold text-gray-800">
                                        {item.key === 'clases' ? 'Clases' : 'Partidas'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-gray-800">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.key === 'clases' ? 'Ver clases' : 'Ver partidas'}
                                        </div>
                                    </>
                                )}
                            </div>
                        </a>
                    );
                })}
            </div>
            
            {/* Contenedor múltiple con Reservas, Inscripciones, Saldo y otros botones */}
            <div className="flex flex-col gap-1.5">
                {/* 🎯 Botón R - Ir a Mis Reservas */}
                <button
                    onClick={() => window.location.href = '/agenda?tab=confirmed'}
                    className={cn(
                        "bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all",
                        pathname === '/admin/calendar' 
                            ? 'flex flex-col items-center gap-1 px-3 py-2' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                    )}
                    title="Reservas (R): Clases confirmadas con pista asignada"
                >
                    <div className={cn(
                        "rounded-full flex items-center justify-center flex-shrink-0",
                        pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
                        hasReservations 
                            ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' 
                            : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-600'
                    )}>
                        <span className={cn("font-black", pathname === '/admin/calendar' ? 'text-sm' : 'text-xl')}>R</span>
                    </div>
                    <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                        {pathname === '/admin/calendar' ? (
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
                        pathname === '/admin/calendar' 
                            ? 'flex flex-col items-center gap-1 px-3 py-2' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                    )}
                    title="Inscripciones (I): Clases pendientes esperando completar grupo"
                >
                    <div className={cn(
                        "rounded-full flex items-center justify-center flex-shrink-0",
                        pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
                        hasInscriptions 
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' 
                            : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-600'
                    )}>
                        <span className={cn("font-black", pathname === '/admin/calendar' ? 'text-sm' : 'text-xl')}>I</span>
                    </div>
                    <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                        {pathname === '/admin/calendar' ? (
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
                        pathname === '/admin/calendar' 
                            ? 'flex flex-col items-center gap-1 px-3 py-2' 
                            : 'flex items-center gap-3 px-4 py-3 min-w-[220px]'
                    )}
                    title="Movimientos de Saldo: Consulta tu saldo y transacciones"
                >
                    <div className={cn(
                        "rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white flex-shrink-0",
                        pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14'
                    )}>
                        <Wallet className={pathname === '/admin/calendar' ? 'w-5 h-5' : 'w-8 h-8'} />
                    </div>
                    <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                        {pathname === '/admin/calendar' ? (
                            <div className="text-[10px] font-semibold text-gray-800">Saldo</div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-800">Saldo</div>
                                <div className="text-xs text-gray-500">Movimientos</div>
                            </>
                        )}
                    </div>
                </button>
                
                {/* Resto de botones (Calendario, Base Datos, Config) excepto Clases y Partidas */}
                {visibleNavItems.filter(item => item.key !== 'clases' && item.key !== 'partidas').map((item) => {
                    const IconComponent = item.icon;
                    
                    return (
                        <a
                            key={item.key}
                            href={item.href}
                            onClick={(e) => handleNavClick(e, item.href, item.label)}
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                pathname === '/admin/calendar' 
                                    ? 'flex flex-col items-center gap-1 px-3 py-2' 
                                    : 'flex items-center gap-3 px-4 min-w-[220px]',
                                item.isActive ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg',
                                item.isActive && pathname !== '/admin/calendar' ? 'py-4' : pathname !== '/admin/calendar' ? 'py-3' : ''
                            )}
                            style={{ pointerEvents: 'auto', zIndex: 99999 }}
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden transition-all duration-300",
                                pathname === '/admin/calendar' ? 'w-10 h-10' : 'w-14 h-14',
                                item.key === 'calendario-club' && "bg-gradient-to-br from-yellow-400 to-orange-600",
                                item.key === 'base-datos' && "bg-gradient-to-br from-indigo-400 to-indigo-600",
                                item.key === 'config-club' && "bg-gradient-to-br from-gray-400 to-gray-600",
                                item.isActive && (
                                    item.key === 'calendario-club' 
                                        ? 'ring-4 ring-orange-300 ring-opacity-50 shadow-[0_0_25px_rgba(251,146,60,0.5)]'
                                        : item.key === 'base-datos'
                                        ? 'ring-4 ring-indigo-300 ring-opacity-50 shadow-[0_0_25px_rgba(129,140,248,0.5)]'
                                        : 'ring-4 ring-gray-300 ring-opacity-50 shadow-[0_0_25px_rgba(156,163,175,0.5)]'
                                )
                            )}>
                                <IconComponent className={pathname === '/admin/calendar' ? 'w-5 h-5' : 'w-8 h-8'} />
                            </div>
                            <div className={cn(pathname === '/admin/calendar' ? 'text-center' : 'text-left flex-1')}>
                                {pathname === '/admin/calendar' ? (
                                    <div className="text-[10px] font-semibold text-gray-800">
                                        {item.key === 'calendario-club' && 'Calend.'}
                                        {item.key === 'base-datos' && 'Datos'}
                                        {item.key === 'config-club' && 'Config'}
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

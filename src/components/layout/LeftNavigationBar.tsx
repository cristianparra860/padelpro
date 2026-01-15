'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Calendar, CalendarDays, UserCircle, Database, Settings, Target, GraduationCap, Wallet, SlidersHorizontal, UserCog, Trophy, Power, MapPin, Ticket, Hash } from 'lucide-react';
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

    const isClubAdmin = currentUser?.role === 'CLUB_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const isInstructor = currentUser?.role === 'INSTRUCTOR';
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

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
                // Pass current date to include inactive instructors who have classes today
                // Si la URL tiene fecha (estamos en el calendario), usar esa. Si no, usar hoy.
                const urlDate = searchParams.get('date');
                const dateToUse = urlDate || new Date().toISOString().split('T')[0];

                // console.log('🔄 Actualizando sidebar con fecha:', dateToUse);

                const response = await fetch(`/api/instructors?clubId=club-1&date=${dateToUse}`);
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

        // Polling para mantener saldo actualizado
        const intervalId = setInterval(fetchUser, 10000); // Actualizar cada 10 segundos

        return () => clearInterval(intervalId);
    }, [searchParams]); // Recargar si cambian los params de la URL (fecha)

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
        }, 120000); // Cada 2 minutos para evitar sobrecarga

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

    // Determinar el link del calendario basado en el contexto actual
    let calendarHref = '/admin/calendar';
    const currentView = searchParams.get('viewType') || searchParams.get('view');

    if (pathname === '/matchgames' || pathname.includes('/matchgames')) {
        calendarHref = '/admin/calendar?viewType=partidas';
    } else if (pathname === '/activities' && currentView === 'clases') {
        calendarHref = '/admin/calendar?viewType=clases';
    } else if (pathname.includes('/clases')) { // Por si acaso hay rutas directas
        calendarHref = '/admin/calendar?viewType=clases';
    }

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
            key: 'reservar-pista',
            href: '/admin/calendar?viewType=reservar-pistas',
            icon: CalendarDays, // Reusing CalendarDays or similar. Maybe MapPin or Ticket? Let's use CalendarDays for now as it is related to calendar
            label: 'Reservar Pista',
            isActive: pathname === '/admin/calendar' && currentView === 'reservar-pistas',
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'],
        },
        {
            key: 'calendario-club',
            href: calendarHref,
            icon: Calendar, // Changed to Calendar distinct from CalendarDays to avoid confusion if needed, or keep consistent.
            label: 'Calendario',
            isActive: pathname === '/admin/calendar' && (!currentView || (currentView !== 'reservar-pistas' && currentView !== 'clases' && currentView !== 'partidas')), // Only active if no specific view or default
            allowedRoles: ['SUPER_ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'],
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

    // Detectar si estamos en modo clases sin instructor (para oscurecer botones)
    const isInCalendar = pathname === '/admin/calendar';
    const viewTypeParam = searchParams.get('viewType') || 'partidas'; // Default a partidas
    const isInClasesMode = viewTypeParam === 'clases';

    const selectedInstructorId = searchParams.get('instructor');
    const isSelectedInstructorAvailable = instructors.some(i => i.id === selectedInstructorId);

    // Considerar "no seleccionado" si no hay ID o si el ID seleccionado no está en la lista disponible para hoy
    const noInstructorSelected = !selectedInstructorId || !isSelectedInstructorAvailable;

    const shouldDimOtherButtons = isInCalendar && isInClasesMode && noInstructorSelected && instructors.length > 0;

    // No mostrar nada mientras está cargando el usuario
    if (isLoading) {
        return null;
    }

    return (
        <>
            <div
                className="fixed left-4 top-16 md:top-40 flex flex-col gap-4 md:gap-2 items-start"
                style={{
                    pointerEvents: 'auto',
                    zIndex: 50,
                    position: 'fixed'
                }}
            >
                <div className="hidden md:contents">
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
                            shouldDimOtherButtons && "opacity-20 pointer-events-none",
                            isCompactMode
                                ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-0.5 md:px-0.5'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]'
                        )}
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center text-white flex-shrink-0",
                            isCompactMode ? 'w-8 h-8' : 'w-8 h-8 md:w-12 md:h-12',
                            "bg-gradient-to-br from-red-400 to-red-600"
                        )}>
                            <Power className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                            {isCompactMode ? (
                                <div className="text-[10px] font-semibold text-gray-800">
                                    {currentUser ? 'Salir' : 'Entrar'}
                                </div>
                            ) : (
                                <>
                                    <div className="hidden md:block text-sm font-semibold text-red-600 truncate">
                                        {currentUser ? 'Cerrar sesión' : 'Iniciar sesión'}
                                    </div>
                                    <div className="md:hidden text-[10px] font-semibold text-gray-800">
                                        {currentUser ? 'Salir' : 'Entrar'}
                                    </div>
                                </>
                            )}
                        </div>
                    </button>
                </div>

                {clubInfo && (
                    <div className="hidden md:contents">
                        <a
                            href="/club"
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                shouldDimOtherButtons && "opacity-20 pointer-events-none",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-14'
                                    : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                                pathname === '/club' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                            )}
                        >
                            <div className={cn(
                                "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                                isCompactMode ? 'w-8 h-8' : 'w-8 h-8 md:w-12 md:h-12',
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
                                        isCompactMode ? 'text-sm' : 'text-sm md:text-xl'
                                    )}>
                                        {clubInfo.name.substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                                {isCompactMode ? (
                                    <div className="text-[10px] font-semibold text-gray-800">Club</div>
                                ) : (
                                    <>
                                        <div className="hidden md:block text-sm font-semibold text-gray-800 truncate">
                                            {clubInfo.name}
                                        </div>
                                        <div className="md:hidden text-[10px] font-semibold text-gray-800">
                                            Club
                                        </div>
                                        <div className="hidden md:block text-xs text-gray-500 truncate">Ver club</div>
                                    </>
                                )}
                            </div>
                        </a>
                    </div>
                )}

                {/* Contenedor Mis Datos (antes Mi Agenda) */}
                <a
                    href={misDatosItem.href}
                    onClick={(e) => handleNavClick(e, misDatosItem.href, misDatosItem.label)}
                    className={cn(
                        "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                        shouldDimOtherButtons && "opacity-20 pointer-events-none",
                        isCompactMode
                            ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-14'
                            : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                        pathname === '/dashboard' ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                    )}
                >
                    <div className={cn(
                        "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
                        isCompactMode ? 'w-10 h-10' : 'w-10 h-10 md:w-14 md:h-14'
                    )}>
                        {currentUser?.profilePictureUrl ? (
                            <Avatar className={cn("w-full h-full", isCompactMode ? 'h-12 w-12' : 'h-12 w-12 md:h-16 md:w-16')}>
                                <AvatarImage
                                    src={currentUser.profilePictureUrl}
                                    alt={currentUser.name || 'avatar'}
                                    className="object-cover w-full h-full"
                                />
                                <AvatarFallback className="text-white bg-blue-500">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <UserCircle className={isCompactMode ? 'w-6 h-6 text-white' : 'w-6 h-6 md:w-10 md:h-10 text-white'} />
                            </div>
                        )}
                    </div>
                    <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1')}>
                        {isCompactMode ? (
                            <div className="text-[10px] font-semibold text-gray-800">Perfil</div>
                        ) : (
                            <>
                                <div className="hidden md:block text-sm font-semibold text-gray-800">
                                    {currentUser?.name || 'Usuario'}
                                </div>
                                <div className="md:hidden text-[10px] font-semibold text-gray-800">
                                    Perfil
                                </div>
                                <div className="hidden md:block text-xs text-gray-500">Mis Datos</div>
                            </>
                        )}
                    </div>
                </a>

                {/* 🛠️ Admin / Config Tools - Row of small icons below profile */}
                {(isInstructor || isClubAdmin || isSuperAdmin) && (
                    <div className="flex flex-wrap gap-2 justify-center w-full px-2 mt-2">
                        {navItems.filter(item =>
                            ['config-instructor', 'config-club', 'base-datos', 'super-admin'].includes(item.key) &&
                            (!item.allowedRoles || (currentUser?.role && item.allowedRoles.includes(currentUser.role)))
                        ).map(item => {
                            const IconComponent = item.icon;
                            return (
                                <a
                                    key={item.key}
                                    href={item.href}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-105",
                                        item.isActive ? "bg-gray-100 border-gray-300" : "text-gray-500 hover:text-gray-700"
                                    )}
                                    title={item.label}
                                >
                                    <IconComponent className="w-4 h-4" />
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* Separador solicitado */}
                <div className="hidden md:flex w-full justify-center my-3 opacity-50">
                    <div className="w-3/4 h-px bg-gray-300"></div>
                </div>

                {/* Contenedor para Clases, Partidas, Reservar Pista y Calendario */}
                <div className={cn(
                    "flex flex-col gap-3 md:gap-2 p-0 md:p-3 rounded-none md:rounded-[36px] transition-all",
                    "md:bg-gradient-to-br md:from-gray-100/90 md:to-gray-50/80 md:backdrop-blur-md",
                    "md:border-2 md:border-white md:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
                    shouldDimOtherButtons && "opacity-20 pointer-events-none"
                )}>
                    {visibleNavItems.filter(item => item.key === 'clases' || item.key === 'partidas' || item.key === 'reservar-pista' || item.key === 'calendario-club').map((item) => {
                        const IconComponent = item.icon;

                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                onClick={(e) => handleNavClick(e, item.href, item.label)}
                                className={cn(
                                    "rounded-3xl hover:shadow-xl transition-all cursor-pointer",
                                    shouldDimOtherButtons && "opacity-20 pointer-events-none",
                                    isCompactMode
                                        ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-1.5 md:px-1'
                                        : 'flex flex-col items-center gap-0.5 px-0.5 py-1 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-3 md:w-[170px]',
                                    item.isActive
                                        ? 'bg-white shadow-2xl scale-105 animate-bounce-subtle border-2 border-gray-200 z-10'
                                        : 'bg-white shadow-md border-2 border-transparent hover:border-gray-200'
                                )}
                            >
                                <div className={cn(
                                    "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300",
                                    isCompactMode ? 'w-9 h-9' : 'w-12 h-12',
                                    item.isActive
                                        ? item.key === 'clases'
                                            ? "bg-gradient-to-br from-blue-400 to-purple-600 text-white ring-4 ring-purple-300 ring-opacity-50 shadow-[0_0_25px_rgba(168,85,247,0.5)]"
                                            : item.key === 'partidas'
                                                ? "bg-gradient-to-br from-green-400 to-green-600 text-white ring-4 ring-green-300 ring-opacity-50 shadow-[0_0_25px_rgba(34,197,94,0.5)]"
                                                : item.key === 'reservar-pista'
                                                    ? "bg-gradient-to-br from-orange-400 to-red-600 text-white ring-4 ring-orange-300 ring-opacity-50 shadow-[0_0_25px_rgba(249,115,22,0.5)]"
                                                    : "bg-gradient-to-br from-gray-500 to-gray-700 text-white ring-4 ring-gray-300 ring-opacity-50 shadow-[0_0_25px_rgba(107,114,128,0.5)]"
                                        : "bg-gray-50 text-gray-500 border-2 border-gray-100 group-hover:border-gray-200"
                                )}>
                                    {item.key === 'reservar-pista' ? (
                                        <svg
                                            className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-7 md:h-7'}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            {/* Court outline */}
                                            <rect x="2" y="4" width="20" height="16" rx="1" />
                                            {/* Net in the middle */}
                                            <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1.5" />
                                            {/* Net pattern */}
                                            <line x1="12" y1="7" x2="12" y2="7" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="10" x2="12" y2="10" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="13" x2="12" y2="13" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    ) : (
                                        <IconComponent className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-7 md:h-7'} />
                                    )}
                                </div>
                                <div className={cn(
                                    isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0'
                                )}>
                                    {isCompactMode ? (
                                        <div className="text-[10px] font-semibold text-gray-800 leading-tight">
                                            {item.key === 'clases' ? 'Clases' : item.key === 'partidas' ? 'Partidas' : item.key === 'reservar-pista' ? (
                                                <div className="flex flex-col">
                                                    <span>Reservar</span>
                                                    <span>Pista</span>
                                                </div>
                                            ) : 'Calendario'}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <div className="text-[10px] font-semibold text-gray-800 leading-tight md:text-sm md:font-bold">
                                                {item.key === 'reservar-pista' ? (
                                                    <div className="flex flex-col">
                                                        <span>Reservar</span>
                                                        <span>Pista</span>
                                                    </div>
                                                ) : (
                                                    <span className="truncate block">{item.label}</span>
                                                )}
                                            </div>
                                            <div className="hidden md:block text-xs text-gray-500 truncate mt-0.5">
                                                {item.key === 'clases' ? 'Ver clases' : item.key === 'partidas' ? 'Ver partidas' : item.key === 'reservar-pista' ? 'Ver horarios' : 'Ver calendario'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>


                {/* Instructores Disponibles - MOVIDO AQUI: Solo en la página del calendario del club Y modo clases */}
                {pathname === '/admin/calendar' && isInClasesMode && (
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

                        {instructors.length === 0 ? (
                            <div className={cn(
                                "text-gray-500 italic text-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-300 mx-1",
                                isCompactMode ? 'text-[9px] p-1' : 'text-xs px-3'
                            )}>
                                {isCompactMode ? 'Sin clases' : 'No hay instructores con clases disponibles'}
                            </div>
                        ) : (
                            instructors.map((instructor) => {
                                // Determinar la URL de la foto del instructor
                                const photoUrl = instructor.photo || instructor.profilePicture || instructor.profilePictureUrl ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=6366f1&color=fff&size=128`;

                                // Verificar si este instructor está seleccionado
                                const isSelected = searchParams.get('instructor') === instructor.id;

                                // Detectar si estamos en modo clases sin instructor seleccionado (para efecto pulsante)
                                const viewTypeParam = searchParams.get('viewType') || 'partidas';
                                const isInClasesMode = viewTypeParam === 'clases';

                                const selectedInstructorId = searchParams.get('instructor');
                                const isSelectedInstructorAvailable = instructors.some(i => i.id === selectedInstructorId);
                                const noInstructorSelected = !selectedInstructorId || !isSelectedInstructorAvailable;

                                const shouldPulse = isInCalendar && isInClasesMode && noInstructorSelected && instructors.length > 0;

                                return (
                                    <button
                                        key={instructor.id}
                                        onClick={() => {
                                            const currentParams = new URLSearchParams(searchParams.toString());

                                            // Si ya está seleccionado, deseleccionar
                                            if (currentParams.get('instructor') === instructor.id) {
                                                currentParams.delete('instructor');
                                            } else {
                                                currentParams.set('instructor', instructor.id);
                                            }

                                            router.push(`${pathname}?${currentParams.toString()}`);
                                        }}
                                        className={cn(
                                            "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 shadow-lg",
                                            isSelected ? 'border-blue-500 scale-105 animate-bounce-subtle' : 'border-gray-200',
                                            shouldPulse && 'animate-bounce-subtle relative z-[150]',
                                            isCompactMode
                                                ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-20 md:py-1.5 md:px-2.5'
                                                : 'flex items-center gap-3 px-3.5 py-2.5 w-[198px]'
                                        )}
                                        style={{
                                            pointerEvents: 'auto',
                                            position: 'relative',
                                            zIndex: shouldPulse ? 150 : 'auto'
                                        }}
                                    >
                                        {/* Efecto de onda (gota de agua) */}
                                        {shouldPulse && (
                                            <div className="absolute inset-0 -z-10 rounded-3xl bg-gray-300 opacity-75 animate-ping"></div>
                                        )}
                                        <div className={cn(
                                            "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 border-2 shadow-md border-white",
                                            isCompactMode ? 'w-9 h-9' : 'w-12 h-12'
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
                                        <div className={cn(isCompactMode ? 'text-center' : 'text-left flex-1 min-w-0 overflow-hidden')}>
                                            {isCompactMode ? (
                                                <div className="text-[10px] font-semibold text-gray-800 max-w-[70px] truncate">
                                                    {instructor.name.split(' ')[0]}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-sm font-semibold text-gray-800 truncate">
                                                        {instructor.name.split(' ')[0]}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">Instructor</div>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Contenedor múltiple con Reservas, Inscripciones, Saldo y otros botones */}
                <div className="flex flex-col gap-0.5 md:gap-1.5 mt-0 pt-0 md:mt-4 md:pt-4 border-none md:border-t-2 md:border-gray-200">
                    {/* 🎯 Botón R - Ir a Mis Reservas */}
                    <button
                        onClick={() => window.location.href = '/agenda?tab=confirmed'}
                        className={cn(
                            "bg-white rounded-3xl hover:shadow-xl transition-all",
                            shouldDimOtherButtons && "opacity-20 pointer-events-none",
                            isCompactMode
                                ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-1.5 md:px-1'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                            pathname === '/agenda' ? 'shadow-2xl scale-105 animate-bounce-subtle border-2 border-gray-200' : 'shadow-lg border-2 border-gray-300'
                        )}
                        title="Reservas (R): Clases confirmadas con pista asignada"
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold transition-all duration-300",
                            isCompactMode ? 'w-9 h-9 text-lg' : 'w-9 h-9 text-lg md:w-12 md:h-12 md:text-2xl',
                            pathname === '/agenda'
                                ? 'bg-gradient-to-br from-pink-400 to-rose-600 text-white ring-4 ring-pink-300 ring-opacity-50 shadow-[0_0_25px_rgba(244,114,182,0.5)]'
                                : 'bg-white text-gray-600 border-gray-300'
                        )}>
                            R
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                            {isCompactMode ? (
                                <div className="text-[10px] font-semibold text-gray-800">Reservas</div>
                            ) : (
                                <>
                                    <div className="text-[10px] font-semibold text-gray-800 md:text-sm md:font-semibold truncate">Reservas</div>
                                    <div className="hidden md:block text-xs text-gray-500 truncate">
                                        {hasReservations ? 'Tienes reservas' : 'Sin reservas'}
                                    </div>
                                </>
                            )}
                        </div>
                    </button>



                    {/* 💰 Botón Saldo - Movimientos de Saldo */}
                    <button
                        onClick={() => window.location.href = '/movimientos'}
                        className={cn(
                            "bg-white rounded-3xl hover:shadow-xl transition-all",
                            shouldDimOtherButtons && "opacity-20 pointer-events-none",
                            isCompactMode
                                ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-1.5 md:px-1'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                            pathname === '/movimientos'
                                ? 'shadow-2xl scale-105 animate-bounce-subtle border-2 border-gray-200'
                                : 'shadow-lg border-2 border-transparent hover:border-gray-200' // Inactive: border-transparent hover:border-gray-200
                        )}
                        title="Movimientos de Saldo: Consulta tu saldo y transacciones"
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                            isCompactMode ? 'w-9 h-9' : 'w-9 h-9 md:w-12 md:h-12',
                            pathname === '/movimientos'
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-600 text-white ring-4 ring-yellow-300 ring-opacity-50 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
                                : 'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200' // Inactive: grisaceo
                        )}>
                            <Wallet className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                            {isCompactMode ? (
                                <div className="flex flex-col items-center">
                                    <div className={cn("text-[10px] font-semibold", pathname === '/movimientos' ? "text-gray-800" : "text-gray-500")}>Saldo</div>
                                    <div className={cn("text-[10px] font-bold", pathname === '/movimientos' ? "text-gray-600" : "text-gray-400")}>€{((currentUser?.credit || currentUser?.credits || 0) / 100).toFixed(2)}</div>
                                </div>
                            ) : (
                                <>
                                    <div className={cn("text-[10px] font-semibold md:text-sm truncate", pathname === '/movimientos' ? "text-gray-800" : "text-gray-500")}>Saldo</div>
                                    <div className={cn("text-[10px] font-bold md:text-sm truncate", pathname === '/movimientos' ? "text-gray-600" : "text-gray-400")}>€{((currentUser?.credit || currentUser?.credits || 0) / 100).toFixed(2)}</div>
                                </>
                            )}
                        </div>
                    </button>

                    {/* 🏆 Botón Puntos (Nuevo) - Debajo de Saldo */}
                    <div className="hidden md:contents">
                        <button
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-default", // cursor-default porque por ahora no navega
                                shouldDimOtherButtons && "opacity-20 pointer-events-none",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-0.5 md:px-0.5'
                                    : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                                'shadow-lg border-2 border-transparent hover:border-gray-200' // Inactive style
                            )}
                            title="Puntos de Fidelidad"
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                                isCompactMode ? 'w-9 h-9' : 'w-9 h-9 md:w-12 md:h-12',
                                'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200' // Inactive: grisaceo
                            )}>
                                <Trophy className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                                {isCompactMode ? (
                                    <div className="flex flex-col items-center">
                                        <div className="text-[10px] font-semibold text-gray-500">Puntos</div>
                                        <div className="text-[10px] font-bold text-gray-400">{((currentUser?.loyaltyPoints || 0) / 100).toFixed(0)}</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-semibold md:text-sm text-gray-500 truncate">Puntos</div>
                                        <div className="text-[10px] font-bold md:text-sm text-gray-400 truncate">{((currentUser?.loyaltyPoints || 0) / 100).toFixed(0)} Pts</div>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* 🌀 PORTAL TARGET for Filters (Placed directly under Puntos) */}
                    <div id="sidebar-filters-portal" className="w-full flex flex-col gap-1.5 mt-2 empty:hidden" />

                    {/* Resto de botones (Base Datos, Config) - AHORA EXCLUYENDO ADMIN/CONFIG que se movieron arriba */}
                    {visibleNavItems.filter(item =>
                        item.key !== 'clases' &&
                        item.key !== 'partidas' &&
                        item.key !== 'reservar-pista' &&
                        item.key !== 'calendario-club' &&
                        item.key !== 'config-instructor' && // Excluir Config Instructor
                        item.key !== 'config-club' && // Excluir Config Club
                        item.key !== 'base-datos' && // Excluir Base Datos
                        item.key !== 'super-admin' // Excluir Super Admin
                    ).map((item) => {
                        const IconComponent = item.icon;

                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                onClick={(e) => handleNavClick(e, item.href, item.label)}
                                className={cn(
                                    "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200",
                                    shouldDimOtherButtons && "opacity-20 pointer-events-none",
                                    isCompactMode
                                        ? 'flex flex-col items-center gap-1 px-1 py-2 w-[62px] md:w-14 md:py-1.5 md:px-1'
                                        : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-3.5 md:py-2.5 md:w-[198px]',
                                    item.isActive ? 'shadow-2xl scale-105 animate-bounce-subtle' : 'shadow-lg'
                                )}
                                style={{ pointerEvents: 'auto', zIndex: 99999 }}
                            >
                                <div className={cn(
                                    "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300 border-2",
                                    isCompactMode ? 'w-9 h-9' : 'w-9 h-9 md:w-12 md:h-12',
                                    item.isActive
                                        ? 'bg-white text-gray-600 border-gray-300' // Default fallback
                                        : 'bg-white text-gray-600 border-gray-300'
                                )}>
                                    <IconComponent className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                                </div>
                                <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                                    {isCompactMode ? (
                                        <div className="text-[10px] font-semibold text-gray-800">
                                            {item.label}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-[10px] font-semibold md:text-sm text-gray-800">{item.label}</div>
                                            <div className="hidden md:block text-xs text-gray-500">
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



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
                {/* Contenedor Superior: Perfil, Club, Configuración y Salir */}
                <div className={cn(
                    "flex flex-col gap-3 md:gap-2 p-0 md:p-3 rounded-none md:rounded-[36px] transition-all mb-4",
                    "md:bg-gradient-to-br md:from-gray-50/90 md:to-white/80 md:border-2 md:border-white md:shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
                    "md:backdrop-blur-md",
                    shouldDimOtherButtons && "opacity-20 pointer-events-none"
                )}>
                    {/* Botón Salir (Moficado para encajar en el grupo) */}
                    <div className="hidden md:contents">
                        <button
                            onClick={async (e) => {
                                e.preventDefault();
                                if (currentUser) {
                                    try {
                                        const response = await fetch('/api/auth/logout', { method: 'POST' });
                                        if (response.ok) { window.location.href = '/'; }
                                        else { window.location.href = '/'; }
                                    } catch (error) { window.location.href = '/'; }
                                } else { window.location.href = '/'; }
                            }}
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-white hover:border-red-100",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                    : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                                "shadow-lg hover:scale-[1.02]"
                            )}
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all",
                                isCompactMode ? 'w-10 h-10' : 'w-8 h-8 md:w-10 md:h-10',
                                "bg-gradient-to-br from-red-400 to-red-600 shadow-sm"
                            )}>
                                <Power className={isCompactMode ? 'w-5 h-5' : 'w-4 h-4 md:w-5 md:h-5'} />
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0')}>
                                {isCompactMode ? (
                                    <div className="text-[10px] font-semibold text-gray-700">Salir</div>
                                ) : (
                                    <>
                                        <div className="hidden md:block text-sm font-semibold text-gray-700 truncate">
                                            {currentUser ? 'Cerrar sesión' : 'Entrar'}
                                        </div>
                                        <div className="md:hidden text-[10px] font-semibold text-gray-700">
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
                                    "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-white hover:border-red-100",
                                    isCompactMode
                                        ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                        : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                                    pathname === '/club' ? 'shadow-xl scale-105 border-red-100' : 'shadow-lg hover:scale-[1.02]'
                                )}
                            >
                                <div className={cn(
                                    "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300",
                                    isCompactMode ? 'w-10 h-10' : 'w-8 h-8 md:w-10 md:h-10',
                                    "bg-gradient-to-br from-red-400 to-red-600",
                                    pathname === '/club' && 'ring-2 ring-red-200 shadow-md'
                                )}>
                                    {clubInfo.logoUrl ? (
                                        <img
                                            src={clubInfo.logoUrl}
                                            alt={clubInfo.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className={cn("font-bold text-white", isCompactMode ? 'text-xs' : 'text-xs md:text-sm')}>
                                            {clubInfo.name.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0')}>
                                    {isCompactMode ? (
                                        <div className="text-[10px] font-semibold text-gray-700">Club</div>
                                    ) : (
                                        <>
                                            <div className="hidden md:block text-sm font-semibold text-gray-700 truncate">
                                                {clubInfo.name}
                                            </div>
                                            <div className="md:hidden text-[10px] font-semibold text-gray-700">Club</div>
                                        </>
                                    )}
                                </div>
                            </a>
                        </div>
                    )}

                    {/* Botón Mis Datos (Perfil) */}
                    <a
                        href={misDatosItem.href}
                        onClick={(e) => handleNavClick(e, misDatosItem.href, misDatosItem.label)}
                        className={cn(
                            "bg-white rounded-3xl hover:shadow-xl transition-all cursor-pointer border-2 border-white hover:border-blue-100",
                            isCompactMode
                                ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                            pathname === '/dashboard' ? 'shadow-xl scale-105 border-blue-100' : 'shadow-lg hover:scale-[1.02]'
                        )}
                    >
                        <div className={cn(
                            "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
                            isCompactMode ? 'w-10 h-10' : 'w-10 h-10 md:w-12 md:h-12'
                        )}>
                            {currentUser?.profilePictureUrl ? (
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={currentUser.profilePictureUrl} className="object-cover w-full h-full" />
                                    <AvatarFallback className="text-white bg-blue-500 text-xs">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                    <UserCircle className="w-6 h-6 text-white" />
                                </div>
                            )}
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0')}>
                            {isCompactMode ? (
                                <div className="text-[10px] font-semibold text-gray-700">Perfil</div>
                            ) : (
                                <>
                                    <div className="hidden md:block text-sm font-semibold text-gray-700 truncate">
                                        {currentUser?.name || 'Usuario'}
                                    </div>
                                    <div className="md:hidden text-[10px] font-semibold text-gray-700">Perfil</div>
                                    <div className="hidden md:block text-[10px] text-gray-400 font-medium">Mis Datos</div>
                                </>
                            )}
                        </div>
                    </a>

                    {/* Admin / Config Tools */}
                    {(isInstructor || isClubAdmin || isSuperAdmin) && (
                        <div className="flex flex-wrap gap-2 justify-center w-full px-2 mt-1">
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
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white border border-white shadow-md hover:shadow-lg hover:scale-110",
                                            item.isActive ? "bg-gray-100 border-gray-300 ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600"
                                        )}
                                        title={item.label}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Separador solicitado */}
                <div className="hidden md:flex w-full justify-center my-3 opacity-50">
                    <div className="w-3/4 h-px bg-gray-300"></div>
                </div>

                {/* Contenedor para Clases, Partidas, Reservar Pista y Calendario */}
                <div className={cn(
                    "flex flex-col gap-3 md:gap-2 p-0 md:p-3 rounded-none md:rounded-[36px] transition-all",
                    // Dynamic background based on active section
                    (pathname === '/activities' || currentView === 'clases')
                        ? "md:bg-gradient-to-br md:from-blue-50/90 md:to-purple-50/90 md:border-2 md:border-purple-200/50 md:shadow-[0_8px_30px_rgba(168,85,247,0.1)]"
                        : (pathname === '/matchgames' || currentView === 'partidas')
                            ? "md:bg-gradient-to-br md:from-green-50/90 md:to-emerald-50/90 md:border-2 md:border-green-200/50 md:shadow-[0_8px_30px_rgba(34,197,94,0.1)]"
                            : (pathname === '/admin/calendar' && currentView === 'reservar-pistas')
                                ? "md:bg-gradient-to-br md:from-orange-50/90 md:to-amber-50/90 md:border-2 md:border-orange-200/50 md:shadow-[0_8px_30px_rgba(249,115,22,0.1)]"
                                : "md:bg-gradient-to-br md:from-gray-100/90 md:to-gray-50/80 md:border-2 md:border-white md:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
                    "md:backdrop-blur-md",
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
                                        ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                        : 'flex flex-col items-center gap-0.5 px-0.5 py-1 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-3 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                                    item.isActive
                                        ? 'bg-white shadow-2xl scale-105 animate-bounce-subtle border-2 border-gray-200 z-10'
                                        : 'bg-white shadow-md border-2 border-transparent hover:border-gray-200'
                                )}
                            >
                                <div className={cn(
                                    "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300",
                                    isCompactMode ? 'w-10 h-10 md:w-10 md:h-10' : 'w-12 h-12',
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
                                            className={isCompactMode ? 'w-6 h-6' : 'w-5 h-5 md:w-7 md:h-7'}
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
                                        <IconComponent className={isCompactMode ? 'w-6 h-6' : 'w-5 h-5 md:w-7 md:h-7'} />
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




                {/* Contenedor Inferior: Reservas, Saldo y Puntos */}
                <div className={cn(
                    "flex flex-col gap-3 md:gap-2 p-0 md:p-3 rounded-none md:rounded-[36px] transition-all mt-4",
                    "md:bg-gradient-to-br md:from-gray-50/90 md:to-white/80 md:border-2 md:border-white md:shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
                    "md:backdrop-blur-md",
                    shouldDimOtherButtons && "opacity-20 pointer-events-none"
                )}>
                    {/* 🎯 Botón R - Ir a Mis Reservas */}
                    <button
                        onClick={() => window.location.href = '/agenda?tab=confirmed'}
                        className={cn(
                            "bg-white rounded-3xl hover:shadow-xl transition-all",
                            shouldDimOtherButtons && "opacity-20 pointer-events-none",
                            isCompactMode
                                ? 'flex flex-col items-center gap-1 px-1 py-2 w-[85px]'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                            pathname === '/agenda' ? 'shadow-2xl scale-105 animate-bounce-subtle border-2 border-white' : 'shadow-lg border-2 border-white hover:border-gray-200'
                        )}
                        title="Reservas (R): Clases confirmadas con pista asignada"
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold transition-all duration-300",
                            isCompactMode ? 'w-10 h-10 text-xl md:w-10 md:h-10 md:text-xl' : 'w-8 h-8 text-lg md:w-12 md:h-12 md:text-2xl',
                            pathname === '/agenda'
                                ? 'bg-gradient-to-br from-pink-400 to-rose-600 text-white ring-4 ring-pink-300 ring-opacity-50 shadow-[0_0_25px_rgba(244,114,182,0.5)]'
                                : 'bg-white text-gray-600 border-gray-300'
                        )}>
                            R
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                            {isCompactMode ? (
                                <div className="text-xs font-semibold text-gray-800">Reservas</div>
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
                                ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                            pathname === '/movimientos'
                                ? 'shadow-2xl scale-105 animate-bounce-subtle border-2 border-white'
                                : 'shadow-lg border-2 border-white hover:border-gray-200'
                        )}
                        title="Movimientos de Saldo: Consulta tu saldo y transacciones"
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                            isCompactMode ? 'w-10 h-10 md:w-10 md:h-10' : 'w-8 h-8 md:w-12 md:h-12',
                            pathname === '/movimientos'
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-600 text-white ring-4 ring-yellow-300 ring-opacity-50 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
                                : 'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200'
                        )}>
                            <Wallet className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                        </div>
                        <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                            {isCompactMode ? (
                                <div className="flex flex-col items-center">
                                    <div className={cn("text-[10px] font-semibold", pathname === '/movimientos' ? "text-gray-800" : "text-gray-500")}>Saldo</div>
                                    <div className={cn("text-[10px] font-bold text-emerald-600")}>€{((currentUser?.credit || currentUser?.credits || 0) / 100).toFixed(2)}</div>
                                </div>
                            ) : (
                                <>
                                    <div className={cn("text-[10px] font-semibold md:text-sm truncate", pathname === '/movimientos' ? "text-gray-800" : "text-gray-500")}>Saldo</div>
                                    <div className={cn("text-[10px] font-bold md:text-sm truncate text-emerald-600")}>€{((currentUser?.credit || currentUser?.credits || 0) / 100).toFixed(2)}</div>
                                </>
                            )}
                        </div>
                    </button>

                    {/* 🏆 Botón Puntos (Nuevo) - Debajo de Saldo */}
                    <div className="hidden md:contents">
                        <button
                            className={cn(
                                "bg-white rounded-3xl hover:shadow-xl transition-all cursor-default",
                                shouldDimOtherButtons && "opacity-20 pointer-events-none",
                                isCompactMode
                                    ? 'flex flex-col items-center gap-1 px-1 py-1.5 w-[75px] md:w-[85px]'
                                    : 'flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]',
                                'shadow-lg border-2 border-white hover:border-gray-200'
                            )}
                            title="Puntos de Fidelidad"
                        >
                            <div className={cn(
                                "rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                                isCompactMode ? 'w-10 h-10 md:w-10 md:h-10' : 'w-8 h-8 md:w-12 md:h-12',
                                'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200'
                            )}>
                                <Trophy className={isCompactMode ? 'w-5 h-5' : 'w-5 h-5 md:w-8 md:h-8'} />
                            </div>
                            <div className={cn(isCompactMode ? 'text-center' : 'text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden')}>
                                {isCompactMode ? (
                                    <div className="flex flex-col items-center">
                                        <div className="text-[10px] font-semibold text-gray-500">Puntos</div>
                                        <div className="text-[10px] font-bold text-amber-600">{((currentUser?.loyaltyPoints || 0) / 100).toFixed(0)}</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-semibold md:text-sm text-gray-500 truncate">Puntos</div>
                                        <div className="text-[10px] font-bold md:text-sm text-amber-600 truncate">{((currentUser?.loyaltyPoints || 0) / 100).toFixed(0)} Pts</div>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                    {/* 🌀 PORTAL TARGET for Filters (Placed directly under Puntos) */}

                    {/* 🌀 PORTAL TARGET for Filters (Placed directly under Puntos) */}
                    <div id="sidebar-filters-portal" className="w-full flex flex-col gap-1.5 mt-2 empty:hidden" />
                </div>

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
            </div >





        </>
    );
}



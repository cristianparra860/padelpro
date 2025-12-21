'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Calendar, CalendarDays, UserCircle, Database, Settings, Target, GraduationCap, Wallet, SlidersHorizontal } from 'lucide-react';
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
                    const userData = await response.json();
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
                const response = await fetch('/api/clubs');
                if (response.ok) {
                    const clubs = await response.json();
                    if (clubs.length > 0) {
                        setClubInfo(clubs[0]);
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
            allowedRoles: ['ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'calendario-club',
            href: '/admin/calendar',
            icon: CalendarDays,
            label: 'Calendario',
            isActive: pathname === '/admin/calendar',
            allowedRoles: ['ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'base-datos',
            href: '/admin/database',
            icon: Database,
            label: 'Base Datos',
            isActive: pathname === '/admin/database',
            allowedRoles: ['ADMIN'], // Solo administrador de PadelPro
        },
        {
            key: 'config-club',
            href: '/admin',
            icon: Settings,
            label: 'Config',
            isActive: pathname === '/admin',
            allowedRoles: ['ADMIN', 'CLUB_ADMIN', 'INSTRUCTOR'], // Admins del club y de PadelPro
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
                className="fixed left-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 items-center ml-2" 
                style={{ pointerEvents: 'auto', zIndex: 999999, position: 'fixed' }}
            >
            {clubInfo && (
                <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-4 w-[48px] md:w-[68px]">
                    <a 
                        href="/club"
                        className="flex flex-col items-center gap-0.5 w-full hover:opacity-80 transition-opacity cursor-pointer block"
                    >
                        <div className="w-12 h-12 md:w-[72px] md:h-[72px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ring-2 ring-white ring-offset-0 -mx-1 md:-mx-1">
                            {clubInfo.logoUrl ? (
                                <img 
                                    src={clubInfo.logoUrl} 
                                    alt={clubInfo.name}
                                    className="w-9 h-9 md:w-[60px] md:h-[60px] object-contain"
                                />
                            ) : (
                                <span className="text-xs md:text-lg font-bold text-gray-600">
                                    {clubInfo.name.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wide text-gray-600 max-w-[45px] md:max-w-[55px] text-center leading-tight">
                            {clubInfo.name}
                        </span>
                    </a>
                </div>
            )}
            
            {/* Contenedor Mis Datos (antes Mi Agenda) */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-4 w-[48px] md:w-[68px]">
                <div className="flex flex-col gap-1.5 items-center">
                    <div className="flex flex-col items-center gap-0.5">
                        {/* Nombre del usuario en la parte superior */}
                        {currentUser?.name && (
                            <div className="text-center mb-1">
                                <p className="text-[7px] md:text-[9px] font-bold text-gray-700 uppercase tracking-tight leading-tight">
                                    {currentUser.name.split(' ')[0]}
                                </p>
                            </div>
                        )}
                        <a
                            href={misDatosItem.href}
                            onClick={(e) => handleNavClick(e, misDatosItem.href, misDatosItem.label)}
                            className="group flex flex-col items-center gap-0.5 cursor-pointer relative"
                            style={{ pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}
                        >
                            <div className={cn(
                                "w-10 h-10 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                misDatosItem.isActive
                                    ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                    : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                            )}>
                                {currentUser?.profilePictureUrl ? (
                                    <Avatar className="h-9 w-9 md:h-14 md:w-14">
                                        <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                                        <AvatarFallback>{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <UserCircle className={cn(
                                        "w-5 h-5 md:w-8 md:h-8",
                                        misDatosItem.isActive ? "text-green-600" : "text-gray-500"
                                    )} />
                                )}
                            </div>
                            <span className={cn(
                                "text-[7px] md:text-[9px] font-bold uppercase tracking-wide",
                                misDatosItem.isActive ? "text-green-600" : "text-gray-500"
                            )}>
                                {misDatosItem.label}
                            </span>
                        </a>
                    </div>
                </div>
            </div>
            
            {/* Contenedor individual para Clases (antes estaba en el contenedor de múltiples botones) */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-4 w-[48px] md:w-[68px]">
                <div className="flex flex-col gap-1.5 items-center">
                    {visibleNavItems.filter(item => item.key === 'clases').map((item) => {
                        const IconComponent = item.icon;
                        
                        return (
                            <div key={item.key} className="flex flex-col items-center gap-0.5">
                                <a
                                    href={item.href}
                                    onClick={(e) => handleNavClick(e, item.href, item.label)}
                                    className="group flex flex-col items-center gap-0.5 cursor-pointer relative"
                                    style={{ pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}
                                >
                                    <div className={cn(
                                        "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                        "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                        item.isActive
                                            ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                                    )}>
                                        <IconComponent className={cn(
                                            "w-4 h-4 md:w-6 md:h-6",
                                            item.isActive ? "text-green-600" : "text-gray-500"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "text-[8px] md:text-[10px] font-semibold uppercase tracking-wide",
                                        item.isActive ? "text-green-600" : "text-gray-500"
                                    )}>
                                        {item.label}
                                    </span>
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Contenedor múltiple con Calendario + otros botones */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-6 w-[48px] md:w-[68px]">
                <div className="flex flex-col gap-1.5 md:gap-2.5 items-center">
                    {/* 🎯 Botón R - Ir a Mis Reservas */}
                    <div className="flex flex-col items-center gap-0.5">
                        <button
                            onClick={() => window.location.href = '/agenda?tab=confirmed'}
                            className={`w-8 h-8 md:w-12 md:h-12 rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center ${
                                hasReservations 
                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                    : 'bg-white hover:bg-gray-50 text-gray-500 border border-gray-300'
                            }`}
                            title="Reservas (R): Clases confirmadas con pista asignada"
                        >
                            <span className="text-xs md:text-base font-black">R</span>
                        </button>
                        <span className="text-[6px] md:text-[7px] font-medium uppercase tracking-wide text-gray-500">
                            Reservas
                        </span>
                    </div>

                    {/* ℹ️ Botón I - Inscripciones */}
                    <div className="flex flex-col items-center gap-0.5">
                        <button
                            onClick={() => window.location.href = '/agenda'}
                            className={`w-8 h-8 md:w-12 md:h-12 rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center ${
                                hasInscriptions 
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
                                    : 'bg-white hover:bg-gray-50 text-gray-500 border border-gray-300'
                            }`}
                            title="Inscripciones (I): Clases pendientes esperando completar grupo"
                        >
                            <span className="text-xs md:text-base font-black">I</span>
                        </button>
                        <span className="text-[6px] md:text-[7px] font-medium uppercase tracking-wide text-gray-500">
                            Inscripciones
                        </span>
                    </div>

                    {/* 💰 Botón Saldo - Movimientos de Saldo */}
                    <div className="flex flex-col items-center gap-0.5">
                        <button
                            onClick={() => window.location.href = '/movimientos'}
                            className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center"
                            title="Movimientos de Saldo: Consulta tu saldo y transacciones"
                        >
                            <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        <span className="text-[6px] md:text-[7px] font-medium uppercase tracking-wide text-gray-500">
                            Saldo
                        </span>
                    </div>

                    {/* 🎚️ Botón Filtros - Solo móvil y solo en página de clases */}
                    {pathname === '/activities' && (
                        <div className="flex flex-col items-center gap-0.5 md:hidden">
                            <button
                                onClick={() => {
                                    // Disparar evento personalizado para toggle de filtros
                                    window.dispatchEvent(new CustomEvent('toggleMobileFilters'));
                                }}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200 flex items-center justify-center"
                                title="Mostrar/Ocultar Filtros"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <span className="text-[6px] font-medium uppercase tracking-wide text-gray-500">
                                Filtros
                            </span>
                        </div>
                    )}
                    
                    {/* Resto de botones (Calendario, Base Datos, Config) excepto Clases */}
                    {visibleNavItems.filter(item => item.key !== 'clases').map((item) => {
                        const IconComponent = item.icon;
                        // ...comportamiento estándar para otros botones
                        return (
                            <div key={item.key} className="flex flex-col items-center gap-0.5">
                                <a 
                                    href={item.href}
                                    onClick={(e) => handleNavClick(e, item.href, item.label)}
                                    className="group flex flex-col items-center gap-0.5 cursor-pointer relative"
                                    style={{ pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}
                                >
                                    <div className={cn(
                                        "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                        "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                        item.isActive
                                            ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                                    )}>
                                        <IconComponent className={cn(
                                            "w-4 h-4 md:w-6 md:h-6",
                                            item.isActive ? "text-green-600" : "text-gray-500"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "text-[6px] md:text-[7px] font-medium uppercase tracking-wide",
                                        item.isActive ? "text-green-600" : "text-gray-500"
                                    )}>
                                        {item.label}
                                    </span>
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        </>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ClipboardList, Calendar, UserCircle, ArrowUp, ArrowDown, Database, Settings, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Club } from '@/types';

export function LeftNavigationBar() {
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [clubInfo, setClubInfo] = useState<Club | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/users/current');
                if (response.ok) {
                    const userData = await response.json();
                    setCurrentUser(userData);
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
        
        fetchUser();
        fetchClub();
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    };

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
            icon: Target,
            label: 'Clases',
            isActive: pathname === '/activities',
            allowedRoles: ['ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'calendario-club',
            href: '/admin/calendar',
            icon: Calendar,
            label: 'Calendario',
            isActive: pathname === '/admin/calendar',
            allowedRoles: ['ADMIN', 'INSTRUCTOR', 'PLAYER'], // Todos pueden ver
        },
        {
            key: 'base-datos',
            href: '/admin/database',
            icon: Database,
            label: 'Base Datos',
            isActive: pathname === '/admin/database',
            allowedRoles: ['ADMIN'], // Solo administradores
        },
        {
            key: 'config-club',
            href: '/admin',
            icon: Settings,
            label: 'Config',
            isActive: pathname === '/admin',
            allowedRoles: ['ADMIN', 'INSTRUCTOR'], // Admin e instructor
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
        icon: Calendar,
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
        <div 
            className="fixed left-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 items-center ml-2" 
            style={{ pointerEvents: 'auto', zIndex: 999999, position: 'fixed' }}
        >
            {/* Botón Scroll to Top - Siempre visible */}
            <button
                onClick={scrollToTop}
                className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            >
                <ArrowUp className="w-3 h-3 md:w-5 md:h-5 text-green-600" />
            </button>

            {clubInfo && (
                <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-4 w-[48px] md:w-[68px]">
                    <div className="flex flex-col items-center gap-0.5">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200">
                            {clubInfo.logoUrl ? (
                                <img 
                                    src={clubInfo.logoUrl} 
                                    alt={clubInfo.name}
                                    className="w-8 h-8 md:w-11 md:h-11 object-contain"
                                />
                            ) : (
                                <span className="text-xs md:text-base font-bold text-gray-600">
                                    {clubInfo.name.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-[6px] md:text-[7px] font-medium uppercase tracking-wide text-gray-600 max-w-[45px] md:max-w-[55px] text-center leading-tight">
                            {clubInfo.name}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Contenedor Mis Datos (antes Mi Agenda) */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-4 w-[48px] md:w-[68px]">
                <div className="flex flex-col gap-1.5 items-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <a
                            href={misDatosItem.href}
                            onClick={(e) => handleNavClick(e, misDatosItem.href, misDatosItem.label)}
                            className="group flex flex-col items-center gap-0.5 cursor-pointer relative"
                            style={{ pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}
                        >
                            <div className={cn(
                                "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                misDatosItem.isActive
                                    ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                    : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                            )}>
                                {currentUser?.profilePictureUrl ? (
                                    <Avatar className="h-7 w-7 md:h-10 md:w-10">
                                        <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                                        <AvatarFallback>{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <UserCircle className={cn(
                                        "w-4 h-4 md:w-6 md:h-6",
                                        misDatosItem.isActive ? "text-green-600" : "text-gray-500"
                                    )} />
                                )}
                            </div>
                            <span className={cn(
                                "text-[6px] md:text-[7px] font-medium uppercase tracking-wide",
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
            
            {/* Contenedor múltiple con Mis Reservas + Calendario + otros botones */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border border-gray-300 px-0.5 py-2 md:px-3 md:py-6 w-[48px] md:w-[68px]">
                <div className="flex flex-col gap-1.5 md:gap-2.5 items-center">
                    {/* Botón Mis Reservas */}
                    <div className="flex flex-col items-center gap-0.5">
                        <a
                            href={misReservasItem.href}
                            onClick={(e) => handleNavClick(e, misReservasItem.href, misReservasItem.label)}
                            className="group flex flex-col items-center gap-0.5 cursor-pointer relative"
                            style={{ pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}
                        >
                            <div className={cn(
                                "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                misReservasItem.isActive
                                    ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                    : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                            )}>
                                <Calendar className={cn(
                                    "w-4 h-4 md:w-6 md:h-6",
                                    misReservasItem.isActive ? "text-green-600" : "text-gray-500"
                                )} />
                            </div>
                            <span className={cn(
                                "text-[6px] md:text-[7px] font-medium uppercase tracking-wide",
                                misReservasItem.isActive ? "text-green-600" : "text-gray-500"
                            )}>
                                {misReservasItem.label}
                            </span>
                        </a>
                    </div>

                    {/* 🎯 Botón R - Ir a Mis Reservas */}
                    <div className="flex flex-col items-center gap-0.5">
                        <button
                            onClick={() => window.location.href = '/agenda'}
                            className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center"
                            title="Ir a Mis Reservas"
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
                            className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center"
                            title="Ir a Inscripciones"
                        >
                            <span className="text-xs md:text-base font-black">I</span>
                        </button>
                        <span className="text-[6px] md:text-[7px] font-medium uppercase tracking-wide text-gray-500">
                            Inscripciones
                        </span>
                    </div>
                    
                    {/* Resto de botones (Calendario, Base Datos, Config) excepto Clases */}
                    {visibleNavItems.filter(item => item.key !== 'clases').map((item) => {
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

            {/* Botón Scroll to Bottom - Siempre visible */}
            <button
                onClick={scrollToBottom}
                className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            >
                <ArrowDown className="w-3 h-3 md:w-5 md:h-5 text-green-600" />
            </button>
        </div>
    );
}

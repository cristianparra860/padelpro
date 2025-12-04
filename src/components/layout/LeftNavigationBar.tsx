'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Calendar, UserCircle, ArrowUp, ArrowDown, Database, Settings } from 'lucide-react';
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
            icon: ClipboardList,
            label: 'Clases',
            isActive: pathname === '/activities',
            showAvatar: false,
        },
        {
            key: 'calendario-club',
            href: '/admin/calendar',
            icon: Calendar,
            label: 'Calendario',
            isActive: pathname === '/admin/calendar',
            showAvatar: false,
        },
        {
            key: 'base-datos',
            href: '/admin/database',
            icon: Database,
            label: 'Base Datos',
            isActive: pathname === '/admin/database',
            showAvatar: false,
        },
        {
            key: 'config-club',
            href: '/admin',
            icon: Settings,
            label: 'Config',
            isActive: pathname === '/admin',
            showAvatar: false,
        },
    ];

    const agendaItem = {
        key: 'agenda',
        href: '/dashboard',
        icon: UserCircle,
        label: 'Agenda',
        isActive: pathname === '/dashboard',
        showAvatar: true,
    };

    return (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 items-start">
            {/* Contenedor individual para el logo del club */}
            {clubInfo && (
                <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border md:border-2 border-gray-200 px-0.5 py-2 md:px-3 md:py-4">
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
            
            {/* Contenedor con efecto de profundidad para los botones */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border md:border-2 border-gray-200 px-0.5 py-2 md:px-3 md:py-6">
                <div className="flex flex-col gap-1.5 md:gap-2.5 items-center">
                    {navItems.map((item, index) => {
                const IconComponent = item.icon;
                const isClasesButton = item.key === 'clases';
                const isAgendaButton = item.key === 'agenda';
                
                return (
                    <div key={item.key} className="flex flex-col items-center gap-0.5">
                        {/* Flecha "ir arriba" solo para el botón de Clases */}
                        {isClasesButton && item.isActive && (
                            <button
                                onClick={scrollToTop}
                                className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] md:shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center mb-0.5 hover:scale-110 transition-transform"
                                aria-label="Ir arriba"
                                title="Ir al inicio"
                            >
                                <ArrowUp className="w-2 h-2 md:w-2.5 md:h-2.5 text-green-600" />
                            </button>
                        )}
                        
                        <Link 
                            href={item.href}
                            className="group flex flex-col items-center gap-0.5"
                            title={item.label}
                        >
                        <div className="relative">
                            {/* Botón circular con sombra similar al logo */}
                            <div 
                                className={cn(
                                    "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                    "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                    item.isActive
                                        ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                        : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                                )}
                            >
                                {item.showAvatar && currentUser?.profilePictureUrl ? (
                                    <Avatar className="h-6 w-6 md:h-8 md:w-8">
                                        <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                                        <AvatarFallback className="text-xs md:text-sm">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <IconComponent 
                                        className={cn(
                                            "w-4 h-4 md:w-6 md:h-6",
                                            item.isActive ? "text-green-600" : "text-gray-500 group-hover:text-gray-700"
                                        )} 
                                    />
                                )}
                            </div>
                        </div>
                        <span 
                            className={cn(
                                "text-[6px] md:text-[7px] font-medium uppercase tracking-wide transition-colors",
                                item.isActive ? "text-green-600" : "text-gray-500"
                            )}
                        >
                            {item.label}
                        </span>
                    </Link>
                    
                    {/* Flecha "ir abajo" solo para el botón de Agenda */}
                    {isAgendaButton && item.isActive && (
                        <button
                            onClick={scrollToBottom}
                            className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] md:shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center mt-0.5 hover:scale-110 transition-transform"
                            aria-label="Ir abajo"
                            title="Ir al final"
                        >
                            <ArrowDown className="w-2 h-2 md:w-2.5 md:h-2.5 text-green-600" />
                        </button>
                    )}
                    </div>
                );
            })}
                </div>
            </div>
            
            {/* Contenedor individual para el botón de Agenda */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-lg shadow-[8px_0_24px_rgba(0,0,0,0.12),inset_-2px_0_8px_rgba(0,0,0,0.06)] border md:border-2 border-gray-200 px-0.5 py-2 md:px-3 md:py-4">
                <div className="flex flex-col gap-1.5 items-center">
                    <div className="flex flex-col items-center gap-0.5">
                        {/* Flecha "ir arriba" para Agenda */}
                        {agendaItem.isActive && (
                            <button
                                onClick={scrollToTop}
                                className="w-4 h-4 md:w-12 md:h-12 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center mb-0.5 hover:scale-110 transition-transform"
                                aria-label="Ir arriba"
                                title="Ir al inicio"
                            >
                                <ArrowUp className="w-2 h-2 md:w-5 md:h-5 text-green-600" />
                            </button>
                        )}
                        
                        <Link 
                            href={agendaItem.href}
                            className="group flex flex-col items-center gap-0.5"
                            title={agendaItem.label}
                        >
                            <div className="relative">
                                <div 
                                    className={cn(
                                        "w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-200",
                                        "shadow-[0_2px_8px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                                        agendaItem.isActive
                                            ? "ring-1 md:ring-2 ring-green-500 ring-offset-1 md:ring-offset-2"
                                            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                                    )}
                                >
                                    {currentUser?.profilePictureUrl ? (
                                        <Avatar className="h-7 w-7 md:h-10 md:w-10">
                                            <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                                            <AvatarFallback className="text-xs md:text-sm">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <UserCircle 
                                            className={cn(
                                                "w-4 h-4 md:w-6 md:h-6",
                                                agendaItem.isActive ? "text-green-600" : "text-gray-500 group-hover:text-gray-700"
                                            )} 
                                        />
                                    )}
                                </div>
                            </div>
                            <span 
                                className={cn(
                                    "text-[6px] md:text-[7px] font-medium uppercase tracking-wide transition-colors",
                                    agendaItem.isActive ? "text-green-600" : "text-gray-500"
                                )}
                            >
                                {agendaItem.label}
                            </span>
                        </Link>
                        
                        {/* Flecha "ir abajo" para Agenda */}
                        {agendaItem.isActive && (
                            <button
                                onClick={scrollToBottom}
                                className="w-4 h-4 md:w-12 md:h-12 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] md:shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center mt-0.5 hover:scale-110 transition-transform"
                                aria-label="Ir abajo"
                                title="Ir al final"
                            >
                                <ArrowDown className="w-2 h-2 md:w-5 md:h-5 text-green-600" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

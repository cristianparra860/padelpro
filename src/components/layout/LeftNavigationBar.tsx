'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Calendar, UserCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/types';

export function LeftNavigationBar() {
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<User | null>(null);

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
        fetchUser();
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
            key: 'agenda',
            href: '/dashboard',
            icon: UserCircle,
            label: 'Agenda',
            isActive: pathname === '/dashboard',
            showAvatar: true,
        },
    ];

    return (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2.5 items-center pl-0.5 md:hidden">
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
                                className="w-5 h-5 rounded-full bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)] flex items-center justify-center mb-0.5 hover:scale-110 transition-transform"
                                aria-label="Ir arriba"
                                title="Ir al inicio"
                            >
                                <ArrowUp className="w-2.5 h-2.5 text-green-600" />
                            </button>
                        )}
                        
                        <Link 
                            href={item.href}
                            className="group flex flex-col items-center gap-0.5"
                            title={item.label}
                        >
                        <div className="relative">
                            {/* Círculo exterior */}
                            <div 
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                                    item.isActive
                                        ? "border border-green-500"
                                        : "border border-gray-300 group-hover:border-gray-400"
                                )}
                            >
                                {/* Círculo interior con icono o avatar */}
                                <button
                                    aria-label={item.label}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                                        item.isActive
                                            ? "bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]"
                                            : "bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400"
                                    )}
                                >
                                    {item.showAvatar && currentUser?.profilePictureUrl ? (
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                                            <AvatarFallback className="text-[10px]">{getInitials(currentUser.name || 'U')}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <IconComponent 
                                            className={cn(
                                                "w-4.5 h-4.5",
                                                item.isActive ? "text-green-600" : "text-gray-400 group-hover:text-gray-600"
                                            )} 
                                        />
                                    )}
                                </button>
                            </div>
                        </div>
                        <span 
                            className={cn(
                                "text-[7px] font-medium uppercase tracking-wide transition-colors",
                                item.isActive ? "text-green-600" : "text-gray-400"
                            )}
                        >
                            {item.label}
                        </span>
                    </Link>
                    
                    {/* Flecha "ir abajo" solo para el botón de Agenda */}
                    {isAgendaButton && item.isActive && (
                        <button
                            onClick={scrollToBottom}
                            className="w-5 h-5 rounded-full bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)] flex items-center justify-center mt-0.5 hover:scale-110 transition-transform"
                            aria-label="Ir abajo"
                            title="Ir al final"
                        >
                            <ArrowDown className="w-2.5 h-2.5 text-green-600" />
                        </button>
                    )}
                    </div>
                );
            })}
        </div>
    );
}

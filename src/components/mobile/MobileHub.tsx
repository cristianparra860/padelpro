'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Club } from '@/types';
import { Trophy, Calendar, CalendarDays, Wallet, ClipboardList, Power, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MobileHubProps {
    user: User | null;
    club: Club | null;
    onLogout: () => void;
}

export default function MobileHub({ user, club, onLogout }: MobileHubProps) {
    const router = useRouter();

    const creditFormatted = user?.credit ? (user.credit / 100).toFixed(2) + '€' : '0.00€';
    const pointsFormatted = user?.points ? user.points.toString() : '0';

    const primaryItems = [
        {
            label: 'Clases',
            icon: GraduationCap,
            href: '/activities',
            gradient: "bg-gradient-to-br from-blue-400 to-purple-600",
            shadow: "shadow-[0_0_20px_rgba(168,85,247,0.4)]",
            ring: "ring-2 ring-purple-200"
        },
        {
            label: 'Partidas',
            icon: Trophy,
            href: '/matchgames',
            gradient: "bg-gradient-to-br from-green-400 to-green-600",
            shadow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
            ring: "ring-2 ring-green-200"
        },
        {
            label: 'Reservar Pista',
            icon: CalendarDays,
            href: '/admin/calendar?viewType=reservar-pistas',
            gradient: "bg-gradient-to-br from-orange-400 to-red-600",
            shadow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]",
            ring: "ring-2 ring-orange-200"
        },
        {
            label: 'Calendario',
            icon: Calendar,
            href: '/admin/calendar',
            gradient: "bg-gradient-to-br from-gray-500 to-gray-700",
            shadow: "shadow-[0_0_20px_rgba(107,114,128,0.4)]",
            ring: "ring-2 ring-gray-200"
        }
    ];

    useEffect(() => {
        // Precargar rutas principales para navegación instantánea
        const routes = ['/activities', '/matchgames', '/admin/calendar'];
        routes.forEach(route => router.prefetch(route));
        console.log('🚀 Rutas precargadas:', routes);
    }, [router]);

    const secondaryItems = [
        {
            label: 'Reservas',
            icon: ClipboardList,
            href: '/agenda',
            gradient: "bg-gradient-to-br from-pink-400 to-rose-600",
            shadow: "shadow-sm",
            ring: "ring-1 ring-pink-100"
        },
        {
            label: 'Saldo',
            value: creditFormatted,
            icon: Wallet,
            href: '/movimientos',
            gradient: "bg-gradient-to-br from-yellow-400 to-orange-600",
            shadow: "shadow-sm",
            ring: "ring-1 ring-yellow-100"
        },
        {
            label: 'Puntos',
            value: pointsFormatted,
            icon: Trophy,
            href: '#',
            gradient: "bg-gradient-to-br from-indigo-400 to-blue-600",
            shadow: "shadow-sm",
            ring: "ring-1 ring-blue-100"
        }
    ];

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col pb-32">

            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="fixed top-0 left-0 w-full h-full object-cover object-center z-0 opacity-20 pointer-events-none"
            >
                <source src="/video_mejorado.mp4" type="video/mp4" />
            </video>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col flex-grow">

                {/* 1. Header: Club Logo base principal y Avatar Usuario */}
                <div className="flex flex-col items-center justify-center pt-8 pb-4">
                    <div className="w-24 h-24 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-1 flex items-center justify-center mb-3">
                        {club?.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-contain rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-300 font-bold text-3xl">
                                {club?.name?.charAt(0) || 'C'}
                            </div>
                        )}
                    </div>

                    <h1 className="text-xl font-bold text-gray-800 drop-shadow-sm">{club?.name || 'Mi Club'}</h1>

                    <div className="flex items-center gap-3 mt-3 bg-white/60 backdrop-blur-md py-1 px-4 rounded-full shadow-sm">
                        <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                            <AvatarImage src={(user as any)?.image || user?.profilePictureUrl} />
                            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm text-gray-700 font-semibold">
                            Hola, {user?.name?.split(' ')[0]}
                        </div>
                    </div>
                </div>

                {/* 2. Primary Group: 2x2 Grid */}
                <div className="px-6 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        {primaryItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => router.push(item.href)}
                                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md active:scale-95"
                            >
                                <div className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg",
                                    item.gradient,
                                    item.ring
                                )}>
                                    {item.label === 'Reservar Pista' ? (
                                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="2" y="4" width="20" height="16" rx="1" />
                                            <line x1="12" y1="4" x2="12" y2="20" />
                                            <line x1="12" y1="7" x2="12" y2="7" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="10" x2="12" y2="10" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="13" x2="12" y2="13" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    ) : (
                                        <item.icon className="w-7 h-7" strokeWidth={1.5} />
                                    )}
                                </div>
                                <span className="text-sm font-bold text-gray-700">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Secondary Group: Row of smaller items (Reservas, Saldo, Puntos, Salir) */}
                <div className="px-6 mt-6">
                    <div className="grid grid-cols-4 gap-2">
                        {secondaryItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => router.push(item.href)}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-90",
                                    item.gradient,
                                    item.ring
                                )}>
                                    <item.icon className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex flex-col items-center w-full">
                                    <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center drop-shadow-sm">
                                        {item.label}
                                    </span>
                                    {(item as any).value && (
                                        <span className="text-[10px] font-bold text-blue-700 -mt-0.5 drop-shadow-sm">
                                            {(item as any).value}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}

                        {/* Salir Button integrated in this row */}
                        <button
                            onClick={onLogout}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm border border-red-100 text-red-500 shadow-sm transition-all active:scale-90">
                                <Power className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col items-center w-full">
                                <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center drop-shadow-sm">
                                    Salir
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { User, Club } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Swords, Calendar, Clock, User as UserIcon, LogOut, Wallet, CreditCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MobileHubProps {
    user: User | null;
    club: Club | null;
    onLogout: () => void;
}

export default function MobileHub({ user, club, onLogout }: MobileHubProps) {
    const router = useRouter();

    const menuItems = [
        {
            label: 'Partidas',
            description: 'Apúntate a partidos abiertos',
            icon: Swords,
            href: '/matchgames',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100'
        },
        {
            label: 'Clases',
            description: 'Mejora tu nivel con clases',
            icon: Calendar,
            href: '/activities',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100'
        },
        {
            label: 'Mis Reservas',
            description: 'Gestiona tus partidos y clases',
            icon: Clock,
            href: '/bookings', // Asumiendo ruta estándar, si no existe el usuario corregirá
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100'
        },
        {
            label: 'Mi Perfil',
            description: 'Datos personales y nivel',
            icon: UserIcon,
            href: '/profile', // Placeholder
            color: 'text-gray-600',
            bg: 'bg-gray-50',
            border: 'border-gray-100'
        }
    ];

    return (
        <div className="flex flex-col min-h-[80vh] bg-white p-4 space-y-6 pb-32">
            {/* Header Profile Section */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarImage src={user?.image || ''} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">
                            Hola, {user?.name?.split(' ')[0] || 'Jugador'}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            {user?.credit !== undefined && (
                                <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                    <Wallet className="w-3 h-3" /> {user.credit}€
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Navigation */}
            <div className="grid grid-cols-1 gap-4">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => router.push(item.href)}
                        className={cn(
                            "flex items-center p-4 rounded-xl border transition-all duration-200 shadow-sm active:scale-[0.98]",
                            "hover:shadow-md bg-white",
                            item.border
                        )}
                    >
                        <div className={cn("p-3 rounded-xl mr-4", item.bg, item.color)}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-900 text-lg">{item.label}</h3>
                            <p className="text-xs text-gray-500 font-medium">{item.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>
                ))}
            </div>

            {/* Secondary Actions */}
            <div className="mt-auto space-y-3 pt-6 border-t border-gray-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 gap-3 h-12 rounded-xl"
                    onClick={onLogout}
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-semibold">Cerrar Sesión</span>
                </Button>
            </div>
        </div>
    );
}

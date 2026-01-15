import React from 'react';
import { useRouter } from 'next/navigation';
import { User, Club } from '@/types';
import { cn } from '@/lib/utils';
import {
    Calendar, Trophy, CircleDot, Wallet, User as UserIcon,
    LogOut, Settings, ClipboardList
} from 'lucide-react';

interface MobileHubProps {
    user: User | null;
    club: Club | null;
    onLogout: () => void;
}

export default function MobileHub({ user, club, onLogout }: MobileHubProps) {
    const router = useRouter();

    const menuItems = [
        {
            label: "Perfil",
            icon: UserIcon,
            color: "from-blue-400 to-blue-600",
            href: "/dashboard", // Currently viewing profile usually
        },
        {
            label: "Clases",
            icon: Calendar,
            color: "from-purple-400 to-purple-600",
            href: "/activities", // Link to the Activities/Classes page
        },
        {
            label: "Partidas",
            icon: Trophy,
            color: "from-green-400 to-green-600",
            href: "/matchgames",
            // Note: This page usually has the "Linear Calendar"
        },
        {
            label: "Reservar Pista",
            icon: CircleDot,
            color: "from-orange-400 to-orange-600",
            href: "/admin/calendar?viewType=reservar-pista",
        },
        {
            label: "Club",
            icon: Trophy, // Placeholder
            color: "from-red-400 to-red-600",
            href: "/club",
            hidden: !club
        },
        {
            label: "Saldo",
            icon: Wallet,
            color: "from-yellow-400 to-yellow-600",
            href: "/movimientos",
            value: user ? `${((user.credit || 0) / 100).toFixed(2)}€` : undefined
        },
        {
            label: "Mis Reservas",
            icon: ClipboardList,
            color: "from-pink-400 to-pink-600",
            href: "/agenda?tab=confirmed",
        }
    ];

    return (
        <div className="flex flex-col gap-6 p-4 pt-8 min-h-screen bg-gray-50 md:hidden">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Menú Principal</h1>

            <div className="grid grid-cols-2 gap-4">
                {menuItems.filter(item => !item.hidden).map((item, index) => (
                    <button
                        key={index}
                        onClick={() => router.push(item.href)}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl p-6 shadow-md border border-gray-100 active:scale-95 transition-transform"
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg",
                            `bg-gradient-to-br ${item.color}`
                        )}>
                            <item.icon className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-gray-800 text-lg">{item.label}</span>
                        {item.value && (
                            <span className="text-sm font-semibold text-gray-500 mt-1">{item.value}</span>
                        )}
                    </button>
                ))}

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex flex-col items-center justify-center bg-white rounded-3xl p-6 shadow-md border border-gray-100 active:scale-95 transition-transform col-span-2 mt-4"
                >
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
                        <LogOut className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-red-600">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { User, Club, TimeOfDayFilterType, MatchPadelLevel, ActivityViewType, ViewPreference } from '@/types';
import { timeSlotFilterOptions } from '@/types';
import {
    Activity, Users, Gift, Clock, BarChartHorizontal,
    Briefcase, LogOut, Building, CalendarDays, Eye, ClipboardList, CheckCircle, LogIn, PartyPopper, Star, Sparkles, Plus, Calendar, User as UserIcon, Wallet, Trophy, Database, Settings, Target
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { usePathname, useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import LevelFilterDialog from '../classfinder/LevelFilterDialog';
interface DesktopSidebarProps {
    currentUser: User | null;
    clubInfo: Club | null;
    onProfessionalAccessClick: () => void;
    onLogoutClick: () => void;
    onMobileFiltersClick: () => void; // New prop for mobile
    // Filter props
    isActivitiesPage: boolean;
    activeView: ActivityViewType;
    timeSlotFilter: TimeOfDayFilterType;
    viewPreference: ViewPreference;
    showPointsBonus: boolean;
    selectedPlayerCounts: Set<number>;
    selectedInstructorIds: string[];
    handleTimeFilterChange: (value: TimeOfDayFilterType) => void;
    handleViewPrefChange: (pref: ViewPreference, type: ActivityViewType) => void;
    handleTogglePointsBonus: () => void;
    handleTogglePlayerCount: (count: number) => void;
    handleSelectAllPlayerCounts: () => void;
    handleDeselectAllPlayerCounts: () => void;
    handleInstructorChange: (instructorIds: string[]) => void;
    updateUrlFilter: (key: string, value: string | boolean | null) => void;
}
const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return 'rgba(168,85,247,0.7)'; // Fallback color
};
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
    currentUser, clubInfo, onProfessionalAccessClick, onLogoutClick, onMobileFiltersClick,
    isActivitiesPage, activeView, timeSlotFilter, viewPreference,
    showPointsBonus, selectedPlayerCounts, selectedInstructorIds, handleTimeFilterChange,
    handleViewPrefChange, handleTogglePointsBonus, handleTogglePlayerCount,
    handleSelectAllPlayerCounts, handleDeselectAllPlayerCounts, handleInstructorChange, updateUrlFilter
}) => {
    const pathname = usePathname();
    const router = useRouter();
    
    const viewPreferenceLabel = useMemo(() => {
        switch (viewPreference) {
            case 'withBookings': return 'Con Usuarios';
            case 'all': return 'Todas';
            default: return 'Ocupación';
        }
    }, [viewPreference]);
    
    const isClassesEnabled = clubInfo?.showClassesTabOnFrontend ?? true;
    const isMatchesEnabled = clubInfo?.showMatchesTabOnFrontend ?? true;
    const isMatchDayEnabled = clubInfo?.isMatchDayEnabled ?? false;
    const isStoreEnabled = clubInfo?.isStoreEnabled ?? true;
    const navItemCount = 1 + (isClassesEnabled ? 1 : 0) + (isMatchesEnabled ? 1 : 0) + (isMatchDayEnabled ? 1 : 0) + (isStoreEnabled ? 1 : 0);
    const navGridClass = `grid-cols-${navItemCount}`;
    
    // Verificar si el usuario tiene permisos de admin
    const isClubAdmin = currentUser?.role === 'CLUB_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const renderLoginPrompt = () => (
      <aside className="hidden md:block w-72 p-4">
        <Card className="p-4 flex flex-col gap-4 sticky top-6 h-fit w-full rounded-2xl">
            {clubInfo && (
                <Link href="/" className="flex flex-col items-center text-center gap-2 hover:opacity-90 transition-opacity">
                    <Avatar className="h-24 w-24 rounded-md">
                        <AvatarImage src={clubInfo.logoUrl} alt={clubInfo.name} data-ai-hint="club logo" />
                        <AvatarFallback className="rounded-md bg-muted"><Building className="h-12 w-12" /></AvatarFallback>
                    </Avatar>
                    <div><h2 className="font-bold text-xl">{clubInfo.name}</h2><p className="text-sm text-muted-foreground">{clubInfo.location}</p></div>
                </Link>
            )}
            <div className="p-4 text-center rounded-full"><p className="text-sm font-semibold">¡Bienvenido!</p><p className="text-xs text-muted-foreground mt-1">Inicia sesión para empezar a reservar.</p></div>
            <Link href="/auth/login" passHref><Button variant="default" className="w-full justify-center text-base h-12 rounded-full"><LogIn className="mr-3 h-5 w-5" /> Acceder / Registrarse</Button></Link>
            <Button variant="outline" className="w-full justify-center text-base h-12 rounded-full" onClick={onProfessionalAccessClick}><Briefcase className="mr-3 h-4 w-4" /> Acceso Profesional</Button>
        </Card>
      </aside>
    );
    if (!currentUser || !clubInfo) {
        return renderLoginPrompt();
    }
    const shadowEffect = clubInfo?.cardShadowEffect;
    const shadowStyle = shadowEffect?.enabled && shadowEffect.color
      ? { boxShadow: `0 0 35px ${hexToRgba(shadowEffect.color, shadowEffect.intensity)}` }
      : {};
    const navButtonShadowStyle = shadowEffect?.enabled && shadowEffect.color
      ? { boxShadow: `0 4px 15px -2px ${hexToRgba(shadowEffect.color, shadowEffect.intensity * 0.5)}` }
      : {};
    const inactiveFilterShadowStyle = shadowEffect?.enabled && shadowEffect.color
      ? { boxShadow: `inset 0 2px 8px 0 ${hexToRgba(shadowEffect.color, shadowEffect.intensity * 0.35)}` }
      : { boxShadow: `inset 0 2px 8px 0 rgba(0, 0, 0, 0.08)` };
    const activeFilterClasses = "font-semibold bg-white text-primary border-primary border-2 shadow-sm";
    return (
        <>
            <aside className="hidden md:flex md:flex-col md:w-72 md:p-4 md:fixed md:h-screen md:left-0 md:top-0">
                <div className="p-4 flex flex-col gap-4 top-6 h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] rounded-2xl bg-card border shadow-lg overflow-y-auto">
                     <div className="flex flex-col items-center text-center gap-2">
                            <Avatar className="h-20 w-20 rounded-md">
                                <AvatarImage src={clubInfo.logoUrl} alt={clubInfo.name} data-ai-hint="club logo" />
                                <AvatarFallback className="rounded-md bg-muted"><Building className="h-10 w-10" /></AvatarFallback>
                            </Avatar>
                            <div><h2 className="font-bold text-lg">{clubInfo.name}</h2><p className="text-xs text-muted-foreground">{clubInfo.location}</p></div>
                        </div>
                    <Separator />
                    <Link href="/profile" className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12"><AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} data-ai-hint="user profile picture" /><AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback></Avatar>
                            <div className="flex-grow"><p className="font-semibold text-base">{currentUser.name}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="flex items-center"><Wallet className="h-3 w-3 mr-1"/> {((currentUser.credits ?? currentUser.credit ?? 0) / 100).toFixed(2)}€</div><div className="flex items-center"><Star className="h-3 w-3 mr-1"/> {currentUser.points ?? currentUser.loyaltyPoints ?? 0} Pts</div></div></div>
                        </div>
                    </Link>
                    <Separator />
                    <div className="p-1 space-y-3">
                                                <Link href="/dashboard" className="w-full"><Button variant={pathname.startsWith('/dashboard') || pathname.startsWith('/schedule') ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><UserIcon className="mr-3 h-5 w-5" /> Mis Datos</Button></Link>
                                                {isClassesEnabled && (
                                                    <Link href="/activities?view=clases" className="w-full"><Button variant={isActivitiesPage && activeView === 'clases' ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><Target className="mr-3 h-5 w-5" /> Clases</Button></Link>
                                                )}
                                                <Separator />
                                                <Link href="/agenda" className="w-full"><Button variant={pathname.startsWith('/agenda') ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><ClipboardList className="mr-3 h-5 w-5" /> Mis Reservas</Button></Link>
                                                <Link href="/admin/calendar" className="w-full"><Button variant={pathname.startsWith('/admin/calendar') ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><Calendar className="mr-3 h-5 w-5" /> Calendario Club</Button></Link>
                                                {isMatchDayEnabled && (
                                                    <Link href="/match-day" className="w-full"><Button variant={pathname.startsWith('/match-day') ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><PartyPopper className="mr-3 h-5 w-5" /> Match-Day</Button></Link>
                                                )}
                                                {/* Enlaces de administración - solo para CLUB_ADMIN y SUPER_ADMIN */}
                                                {isClubAdmin && (
                                                    <>
                                                        <Separator />
                                                        <Link href="/admin/database" className="w-full"><Button variant={pathname.startsWith('/admin/database') ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><Database className="mr-3 h-5 w-5" /> Database Admin</Button></Link>
                                                        <Link href="/admin" className="w-full"><Button variant={pathname === '/admin' ? "default" : "outline"} className="w-full justify-start text-base h-12 rounded-md" style={navButtonShadowStyle}><Settings className="mr-3 h-5 w-5" /> Config Club</Button></Link>
                                                    </>
                                                )}
                    </div>
                    {/* Botón +Puntos comentado por solicitud del usuario
                    {isActivitiesPage && (
                        <>
                            <Separator />
                            <div className="space-y-1 p-1">
                                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase">Filtros</h3>
                                <Button variant="ghost" style={!showPointsBonus ? inactiveFilterShadowStyle : {}} className={cn("w-full justify-start text-sm h-10 rounded-full relative", showPointsBonus && activeFilterClasses)} onClick={handleTogglePointsBonus}>
                                    <Sparkles className="mr-3 h-4 w-4 text-amber-500" /> 
                                    <span className="flex-1 text-left">+ Puntos</span>
                                    {showPointsBonus && (
                                        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 border-amber-300">
                                            Activo
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                    */}
                    <div className="mt-auto pt-2 border-t space-y-2">
                        <Button variant="outline" className="w-full justify-start text-sm h-10 rounded-full" onClick={onProfessionalAccessClick}><Briefcase className="mr-3 h-4 w-4" /> Acceso Profesional</Button>
                        <Button variant="outline" className="w-full justify-start text-sm h-10 rounded-full" onClick={onLogoutClick}><LogOut className="mr-3 h-4 w-4" /> Salir</Button>
                    </div>
                </div>
            </aside>
        </>
    );
};
export default DesktopSidebar;
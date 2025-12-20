
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn, getInitials } from '@/lib/utils';
import { Home, Activity, Users, User as UserIconLucideProfile, ClipboardList, PartyPopper, SlidersHorizontal, Star, Trophy, Calendar, Zap, Building, Target } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    getMockCurrentUser,
    getMockClubs,
    getHasNewGratisSpotNotification,
    setHasNewGratisSpotNotificationState,
    getMockUserBookings,
    getMockTimeSlots,
    isSlotEffectivelyCompleted,
    getMockUserMatchBookings,
    getMockMatches,
    fetchMatchDayEventsForDate,
    countUserReservedProducts,
} from '@/lib/mockData';
import type { User, Club } from '@/types';
import { Badge } from '@/components/ui/badge';
import { addDays } from 'date-fns';

interface BottomNavigationBarProps {
    onMobileFiltersClick: () => void;
}

export function BottomNavigationBar({ onMobileFiltersClick }: BottomNavigationBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    const [currentUser, setCurrentUserLocal] = useState<User | null>(null);
    
    const [clubInfo, setClubInfo] = useState<Club | null>(null);
    const [currentDisplayClubId, setCurrentDisplayClubId] = useState<string | null>(null);
    
    const [reservedProductsCount, setReservedProductsCount] = useState(0);
    const [showGratisNotificationDot, setShowGratisNotificationDot] = useState(false);
    const [confirmedBookingsCount, setConfirmedBookingsCount] = useState<number>(0);
    const [nextMatchDayEventId, setNextMatchDayEventId] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
        const fetchUser = async () => {
            const user = await getMockCurrentUser();
            setCurrentUserLocal(user);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const clubIdFromParams = searchParams.get('clubId');
        let activeClubId = clubIdFromParams;

        if (!activeClubId && typeof window !== 'undefined') {
            activeClubId = localStorage.getItem('activeAdminClubId');
        }
        
        const clubs = getMockClubs();
        if (!activeClubId && clubs && clubs.length > 0) {
            activeClubId = clubs[0].id;
        }
        setCurrentDisplayClubId(activeClubId);

    }, [searchParams, isClient]);

    const calculateTotalConfirmedBookings = useCallback(async (userId: string | undefined) => {
        if (!isClient || !userId) {
            setConfirmedBookingsCount(0);
            return;
        }
        let count = 0;
        const now = new Date();
    const userClassBookingsData = await getMockUserBookings();
        const allTimeSlots = await getMockTimeSlots();
        userClassBookingsData.forEach(booking => {
            const slot = allTimeSlots.find(s => s.id === booking.activityId && booking.activityType === 'class');
            if (slot && new Date(slot.startTime) > now && isSlotEffectivelyCompleted(slot).completed) {
                count++;
            }
        });
    const userMatchBookingsDataAll = await getMockUserMatchBookings();
        const allMatches = await getMockMatches();
        userMatchBookingsDataAll.forEach(booking => {
            const match = allMatches.find(m => m.id === booking.activityId);
            if (match && new Date(match.startTime) > now && (match.bookedPlayers || []).length === 4) {
                count++;
            }
        });
        setConfirmedBookingsCount(count);
    }, [isClient]);

    useEffect(() => {
        if (isClient && currentUser) {
            const updateConfirmedBookings = () => calculateTotalConfirmedBookings(currentUser.id);
            updateConfirmedBookings(); // Initial call
            const intervalId = setInterval(updateConfirmedBookings, 3000); // Update every 3 seconds
            return () => clearInterval(intervalId);
        } else if (isClient && !currentUser) {
            setConfirmedBookingsCount(0);
        }
    }, [isClient, currentUser, calculateTotalConfirmedBookings]);


    const updateCountsAndNotifications = useCallback(async () => {
        if (currentUser) {
            const count = await countUserReservedProducts(currentUser.id);
            setReservedProductsCount(count);
        }
        setShowGratisNotificationDot(getHasNewGratisSpotNotification());
    }, [currentUser]);


    useEffect(() => {
        if (!isClient) return;
        
        const clubs = getMockClubs();
        let currentClub: Club | undefined | null = null;
        if (currentDisplayClubId) {
            currentClub = clubs.find(c => c.id === currentDisplayClubId);
        } else if (clubs.length > 0) {
            currentClub = clubs[0];
        }
        
    setClubInfo(currentClub ?? null);

        updateCountsAndNotifications();
        const intervalId = setInterval(updateCountsAndNotifications, 5000);
        
        const handleReservationChange = () => updateCountsAndNotifications();
        window.addEventListener('productReservationChanged', handleReservationChange);
        window.addEventListener('gratisSpotsUpdated', updateCountsAndNotifications);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('productReservationChanged', handleReservationChange);
            window.removeEventListener('gratisSpotsUpdated', updateCountsAndNotifications);
        };

    }, [currentDisplayClubId, isClient, updateCountsAndNotifications]);
    
    useEffect(() => {
        const findEvent = async () => {
            if (!clubInfo) {
                setNextMatchDayEventId(null);
                return;
            }
            for (let i = 0; i < 14; i++) { // check next 2 weeks
                const events = await fetchMatchDayEventsForDate(addDays(new Date(), i), clubInfo.id);
                if (events && events.length > 0) {
                    setNextMatchDayEventId(events[0].id); // Get the first event for the notification link
                    return;
                }
            }
            setNextMatchDayEventId(null); // No event found
        };
        findEvent();
    }, [clubInfo]);


    useEffect(() => {
        const queryFilter = searchParams.get('filter');
        if (isClient && pathname === '/activities' && queryFilter === 'liberadas' && getHasNewGratisSpotNotification()) {
            setHasNewGratisSpotNotificationState(false);
            setShowGratisNotificationDot(false);
        }
    }, [isClient, pathname, searchParams]);

    const isActivitiesPage = pathname.startsWith('/activities');
    
    const navItems = [
        {
            key: 'filtros',
            icon: SlidersHorizontal,
            label: 'Filtros',
            isActive: false,
            hidden: true,
            onClick: onMobileFiltersClick,
        },
        {
            key: 'clases',
            href: '/activities?view=clases',
            icon: Target,
            label: 'Clases',
            isActive: pathname === '/activities' && searchParams.get('view') === 'clases',
            hidden: !currentUser,
        },
        // 🆕 Mis Reservas (nueva ruta a la agenda)
        {
            key: 'mis-reservas',
            href: '/agenda',
            icon: ClipboardList,
            label: 'Reservas',
            isActive: pathname === '/agenda',
            hidden: !currentUser,
        },
        // 🆕 Calendario del Club (versión móvil)
        {
            key: 'calendario-club',
            href: '/admin/calendar',
            icon: Calendar,
            label: 'Calendario',
            isActive: pathname === '/admin/calendar',
            hidden: !currentUser,
        },
        {
            key: 'match-day',
            href: '/match-day',
            icon: Calendar,
            label: 'Match Day',
            isActive: pathname === '/match-day' || pathname.startsWith('/match-day/'),
            hidden: !currentUser,
        },
        {
            key: 'mis-datos',
            href: '/dashboard',
            icon: currentUser?.profilePictureUrl ? null : UserIconLucideProfile,
            label: 'Mis Datos',
            isActive: pathname === '/dashboard',
            hidden: !currentUser,
            renderCustomIcon: () => currentUser ? (
                <Avatar className="h-5 w-5 mb-1">
                    <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} />
                    <AvatarFallback className="text-xs">{getInitials(currentUser.name || '')}</AvatarFallback>
                </Avatar>
            ) : null,
        },
    ];

    // Define navigation items for guests (when no user is logged in)
    const guestNavItems = [
        {
            key: 'home',
            href: '/',
            icon: Home,
            label: 'Inicio',
            isActive: pathname === '/',
            hidden: false,
        },
        {
            key: 'login',
            href: '/auth/login',
            icon: UserIconLucideProfile,
            label: 'Acceder',
            isActive: pathname.startsWith('/auth/login'),
            hidden: false,
        }
    ];

    const navItemsToUse = currentUser ? navItems : guestNavItems;
    const visibleNavItems = navItemsToUse.filter(item => !item.hidden);
    const visibleNavItemsCount = visibleNavItems.length;
    const itemWidthClass = visibleNavItemsCount > 0 ? `w-1/${visibleNavItemsCount}` : 'w-full';

    // Hide on mobile (navigation moved to left sidebar)
    return (
        <>
            {/* Bottom Navigation Bar - Hidden on mobile, visible on desktop */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 hidden md:flex pb-safe">
                {/* Fondo limpio */}
                <div className="absolute inset-0 bg-white border-t border-gray-100"></div>
                <div className="relative w-full px-4 py-2 flex items-center justify-around gap-2">
                    {visibleNavItems.map(item => {
                        const IconComponent = item.icon;
                        const hasCustomIcon = 'renderCustomIcon' in item && item.renderCustomIcon;
                        
                        const buttonContent = (
                            <>
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2",
                                    item.isActive 
                                        ? "bg-white border-green-500 shadow-[inset_0_2px_8px_rgba(34,197,94,0.3)]" 
                                        : "bg-white border-gray-300 shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]"
                                )}>
                                    {hasCustomIcon ? (
                                        (item as any).renderCustomIcon()
                                    ) : IconComponent ? (
                                        <IconComponent className={cn(
                                            "h-4 w-4",
                                            item.isActive ? "text-green-600" : "text-gray-400"
                                        )} />
                                    ) : null}
                                </div>
                                <span className={cn(
                                    "text-[9px] leading-none font-medium mt-0.5",
                                    item.isActive ? "text-green-600" : "text-gray-500"
                                )}>{item.label}</span>
                            </>
                        );

                        const className = "flex flex-col items-center justify-center transition-all duration-200";

                        if ('href' in item && item.href) {
                            return (
                                <Link key={item.key} href={item.href} scroll={false} className={className}>
                                    {buttonContent}
                                </Link>
                            );
                        }
                        return (
                            <button
                                key={item.key}
                                onClick={(item as any).onClick}
                                className={className}
                            >
                                {buttonContent}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
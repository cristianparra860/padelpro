
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn, getInitials } from '@/lib/utils';
import { Home, Activity, Users, User as UserIconLucideProfile, ClipboardList, PartyPopper, SlidersHorizontal, Star, Trophy, Calendar, Zap, Building } from 'lucide-react';
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
            key: 'clases',
            href: '/activities?view=clases',
            icon: ClipboardList,
            label: 'Clases',
            isActive: pathname === '/activities' && searchParams.get('view') === 'clases',
            hidden: !currentUser,
        },
        {
            key: 'grupos',
            href: '/activities?view=grupos',
            icon: Users,
            label: 'Grupos',
            isActive: pathname === '/activities' && searchParams.get('view') === 'grupos',
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

     if (!isClient) {
        return (
            <>
                <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t md:hidden" />
            </>
        );
    }

    // Show on all pages in mobile
    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-30 md:hidden">
                {/* Fondo con gradiente blanco sutil - permite ver los iconos claramente */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/60 via-white/30 via-white/10 to-white/5 backdrop-blur-sm"></div>
                <div className="relative w-full px-2 h-16 flex items-center">
                    {visibleNavItems.map(item => {
                        const IconComponent = item.icon;
                        const buttonContent = (
                            <>
                                <div className="relative">
                                    <IconComponent className={cn("h-4 w-4 mb-1", item.isActive && "text-primary")} />
                                </div>
                                <span className={cn("text-[10px] leading-none", item.isActive ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
                            </>
                        );

                        const className = cn(
                            "flex flex-col items-center justify-center font-medium px-1 py-2 rounded-lg h-full transition-transform duration-200 ease-in-out flex-1",
                            item.isActive && 'scale-105'
                        );

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
                                aria-pressed={item.isActive}
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
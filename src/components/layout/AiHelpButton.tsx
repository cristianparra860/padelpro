"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { User, Plus } from 'lucide-react';
import { getMockCurrentUser } from '@/lib/mockData';
import type { User as UserType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface AiHelpButtonProps {
    onMobileFiltersClick?: () => void;
}

export function AiHelpButton({ onMobileFiltersClick }: AiHelpButtonProps) {
    const [isClient, setIsClient] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    
    useEffect(() => {
        setIsClient(true);
        const fetchUser = async () => {
            const user = await getMockCurrentUser();
            setCurrentUser(user);
        }
        
        fetchUser(); // Fetch immediately
        
        // Set up an interval to check for user changes, simulating login/logout
        const interval = setInterval(fetchUser, 1000); // Check every second
        
        return () => clearInterval(interval); // Cleanup interval
    }, []);

    // Return null during SSR to prevent hydration mismatch
    if (!isClient) {
        return null;
    }

    const agendaButtonContent = currentUser ? (
        <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name || 'avatar'} data-ai-hint="user profile photo small" />
            <AvatarFallback>{getInitials(currentUser.name || '')}</AvatarFallback>
        </Avatar>
    ) : (
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
            <Plus className="h-6 w-6 text-primary" />
        </div>
    );
    
    const buttonLabel = currentUser ? 'Agenda' : 'Inicio';
    const buttonLink = currentUser ? '/dashboard' : '/';

    return (
        <>
            {/* Botones flotantes eliminados - ahora están en la barra inferior */}
        </>
    );
}

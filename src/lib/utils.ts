import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClassPadelLevel, MatchPadelLevel, PadelCourt, TimeSlot, Match } from '@/types';
import { getMockPadelCourts, hasAnyActivityForDay as hasAnyActivityForDayFromMockData } from "./mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string): string => {
  if (!name) return '';
  const words = name.split(' ').filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + (words[words.length - 1][0] || '')).toUpperCase();
};

export const getPlaceholderUserName = (userId: string | undefined, currentUserId: string | undefined, currentUserName?: string): string => {
  if (!userId) return 'Desconocido';
  if (userId === currentUserId) {
    return `${currentUserName || 'Usuario'} (Tú)`;
  }
  // In a real app, you'd fetch this from mockStudents or similar data source if needed.
  // For simplicity, we'll just use a generic placeholder if not the current user.
  return `Jugador ${userId.substring(userId.length - 4)}`;
};

export const calculatePricePerPerson = (totalPrice: number | undefined, groupSize: number): number => {
    if (totalPrice === undefined || totalPrice === null || groupSize <= 0) return 0;
    const validGroupSize = [1, 2, 3, 4].includes(groupSize) ? groupSize : 4;
    return totalPrice / validGroupSize;
};

/**
 * Redondea un precio siempre hacia arriba a .00 o .50
 * Ejemplos:
 * - 9.00 → 9.00
 * - 9.23 → 9.50
 * - 9.67 → 10.00
 * - 12.67 → 13.00
 */
export const roundPrice = (price: number): number => {
  const floor = Math.floor(price);
  const decimal = price - floor;
  
  if (decimal === 0) return price;
  if (decimal <= 0.5) return floor + 0.5;
  return floor + 1;
};

export const isUserLevelCompatibleWithActivity = (
  activityLevel: ClassPadelLevel | MatchPadelLevel | undefined,
  userLevel: MatchPadelLevel | undefined,
  isPlaceholder?: boolean
): boolean => {
  // If user has no level or activity is open to all, it's compatible
  if (!userLevel || userLevel === 'abierto' || !activityLevel || activityLevel === 'abierto' || isPlaceholder) {
    return true;
  }

  const userNumeric = parseFloat(userLevel);
  if (isNaN(userNumeric)) return true; // User with invalid level string is allowed anywhere

  // Case 1: Activity level is a range object (like some classes)
  if (typeof activityLevel === 'object' && 'min' in activityLevel && 'max' in activityLevel) {
    const min = parseFloat(activityLevel.min);
    const max = parseFloat(activityLevel.max);
    if (isNaN(min) || isNaN(max)) return true; // Invalid range, allow user in
    return userNumeric >= min && userNumeric <= max;
  }

  // Case 2: Activity level is a single string (like matches or some classes)
  if (typeof activityLevel === 'string') {
    const activityNumeric = parseFloat(activityLevel);
    if (isNaN(activityNumeric)) return true; // Invalid activity level string, allow user in

    // For single-level activities, allow a +/- 0.5 range
    const minAllowed = Math.max(0.5, activityNumeric - 0.5);
    const maxAllowed = activityNumeric + 0.5;
    return userNumeric >= minAllowed && userNumeric <= maxAllowed;
  }

  return true; // Default to compatible if type is unexpected
};

export const hasAnyActivityForDay = (userId: string, date: Date, excludingId?: string, type?: 'class' | 'match'): boolean => {
    return hasAnyActivityForDayFromMockData(userId, date, date, excludingId, type);
};

export const findAvailableCourt = (clubId: string, startTime: Date, endTime: Date): PadelCourt | null => {
    // This is a placeholder. A real implementation would check for court availability.
    const courts = getMockPadelCourts().filter(c => c.clubId === clubId && c.isActive);
    return courts.length > 0 ? courts[0] : null;
};

export const isSlotGratisAndAvailable = (slot: TimeSlot): boolean => {
    if (!slot.designatedGratisSpotPlaceholderIndexForOption) return false;
    for (const [size, index] of Object.entries(slot.designatedGratisSpotPlaceholderIndexForOption)) {
        if (index !== null && index !== undefined) {
             const bookingInSpot = (slot.bookedPlayers || []).find((p, idx) => p.groupSize === parseInt(size) && idx === index);
             if (!bookingInSpot) return true;
        }
    }
    return false;
};

// Annul conflicting pre-registrations
export const _annulConflictingActivities = (confirmedActivity: TimeSlot | Match) => {
    // Placeholder for a more complex logic
};

export const removeUserPreInscriptionsForDay = async (userId: string, date: Date, excludingId: string, type: 'class' | 'match') => {
    // Placeholder
};

export const findConflictingConfirmedActivity = (activity: TimeSlot, allTimeSlots: TimeSlot[], allMatches: Match[]): TimeSlot | Match | null => {
    // Placeholder
    return null;
}

export const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return 'rgba(0,0,0,0)';
};


// src/lib/mockDataSources/matches.ts

import { addHours, setHours, setMinutes, startOfDay, format, isSameDay, addDays, addMinutes, areIntervalsOverlapping, getDay, parse, differenceInHours, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Match, MatchPadelLevel, PadelCategoryForSlot, MatchBooking, User, Club, DayOfWeek, TimeRange, Instructor, TimeSlot } from '@/types'; // Changed PadelCategory to PadelCategoryForSlot
import { matchPadelLevels, padelCategoryForSlotOptions, daysOfWeek as dayOfWeekArray } from '@/types'; // Use padelCategoryForSlotOptions
import * as state from './index';
import * as config from '../config';
import * as mockUtils from './utils';
import { getPlaceholderUserName } from './utils';
import { calculatePricePerPerson } from '@/lib/utils';
import { addUserPointsAndAddTransaction, deductCredit, addCreditToStudent, recalculateAndSetBlockedBalances, confirmAndAwardPendingPoints } from './users';
import { getMockStudents } from './state'; // Import getMockStudents directly from state
import { _classifyLevelAndCategoryForSlot } from './classProposals';
import { findAvailableCourt, _annulConflictingActivities, removeUserPreInscriptionsForDay, isUserLevelCompatibleWithActivity as isUserLevelCompatible, getCourtAvailabilityForInterval } from './utils';
import { calculateActivityPrice } from './clubs';


export const fetchMatches = async (clubId?: string): Promise<Match[]> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    
    // 🚫 DESHABILITADO: No devolver matches mock - solo devolver array vacío
    // Cuando se implemente API real de matches, reemplazar esto con fetch a /api/matches
    console.log('⚠️ fetchMatches llamado - devolviendo array vacío (no hay API real de matches aún)');
    return [];
    
    /* CÓDIGO MOCK DESHABILITADO
    let matchesToReturn = JSON.parse(JSON.stringify(state.getMockMatches())) as Match[];
    if (clubId) {
        matchesToReturn = matchesToReturn.filter(match => match.clubId === clubId);
    }
    return matchesToReturn.map(match => ({
        ...match,
        startTime: new Date(match.startTime),
        endTime: new Date(match.endTime),
        level: match.level || matchPadelLevels[0],
        category: match.category || 'abierta',
    isFixedMatch: match.isFixedMatch === true,
    fixedSchedule: (match as any).fixedSchedule,
        bookedPlayers: (match.bookedPlayers || [])
            .filter(p => p.userId && p.userId.trim() !== '')
            .map(p => {
                const student = state.getMockStudents().find(s => s.id === p.userId);
                const userDb = state.getMockUserDatabase().find(u => u.id === p.userId);
                return {
                    userId: p.userId,
                    name: p.name || student?.name || userDb?.name || getPlaceholderUserName(p.userId, state.getMockCurrentUser()?.id, state.getMockCurrentUser()?.name),
                    profilePictureUrl: p.profilePictureUrl || student?.profilePictureUrl || userDb?.profilePictureUrl || ''
                };
            }),
        isPlaceholder: match.isPlaceholder === undefined ? false : match.isPlaceholder,
        status: match.status || 'forming',
        organizerId: match.organizerId,
        privateShareCode: match.privateShareCode,
        durationMinutes: match.durationMinutes || 90,
    }));
    */
};

export const bookMatch = async (
    userId: string,
    matchId: string,
    usePoints: boolean = false
): Promise<{ newBooking: MatchBooking | null, updatedMatch: Match } | { error: string }> => {
    // 1. Validaciones previas y obtención de datos
    const user = state.getMockUserDatabase().find(u => u.id === userId);
    if (!user) return { error: "Usuario no encontrado." };
    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: "Partida no encontrada." };
    let match = { ...state.getMockMatches()[matchIndex] };
    const club = state.getMockClubs().find(c => c.id === match.clubId);
    if (!club) return { error: "Club no encontrado para esta partida." };

    // 2. Si el usuario ya está en bookedPlayers, actualiza todos sus datos (nombre, foto, nivel, categoría)
    match.bookedPlayers = (match.bookedPlayers || []).map(p =>
        p.userId === user.id
            ? {
                userId: user.id,
                name: user.name,
                profilePictureUrl: user.profilePictureUrl || p.profilePictureUrl || ''
            }
            : {
                userId: p.userId,
                name: p.name,
                profilePictureUrl: p.profilePictureUrl || ''
            }
    );

    // 3. No permitir doble inscripción
    if ((match.bookedPlayers || []).some(p => p.userId === userId)) {
        return { error: "Ya estás inscrito en esta partida." };
    }

    // 4. Comprobar solapamientos y bloqueo por día
    const targetEndTime = new Date(new Date(match.startTime).getTime() + (match.durationMinutes || 90) * 60000);
    if (mockUtils.hasAnyActivityForDay(userId, new Date(match.startTime), targetEndTime, matchId, 'match')) {
        return { error: 'Ya tienes otra actividad (clase o partida) que se solapa con este horario.' };
    }
    // Bloqueo por día: si ya tiene alguna actividad confirmada ese mismo día, no permitir inscribir
    if (mockUtils.countUserConfirmedActivitiesForDay(userId, new Date(match.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }

    // 5. Validaciones de plazas y nivel
    if ((match.bookedPlayers || []).length >= 4) {
        return { error: "Esta partida ya está completa." };
    }
    if (match.level !== 'abierto' && !match.isProMatch && !isUserLevelCompatible(match.level, user.level, match.isPlaceholder)) {
        return { error: 'Tu nivel de juego no es compatible con el de esta partida.' };
    }

    // 6. Añadir usuario a la primera plaza libre (sin persistir placeholders vacíos)
    const hadNoPlayersBefore = Array.isArray(match.bookedPlayers) ? match.bookedPlayers.filter(p => p.userId && p.userId.trim() !== '').length === 0 : true;
    if (!Array.isArray(match.bookedPlayers)) match.bookedPlayers = [];
    // Intenta ocupar un hueco vacío si existe; si no, añade al final
    const freeIndex = match.bookedPlayers.findIndex((p) => !p.userId);
    if (freeIndex !== -1) {
        match.bookedPlayers[freeIndex] = {
            userId: user.id,
            name: user.name,
            profilePictureUrl: user.profilePictureUrl || ''
        };
    } else if (match.bookedPlayers.length < 4) {
        match.bookedPlayers.push({ userId: user.id, name: user.name, profilePictureUrl: user.profilePictureUrl || '' });
    } else {
        return { error: "Esta partida ya está completa." };
    }

    // 7. Refuerza: actualizar nombre y foto en todas las plazas ocupadas por el usuario
    // Refuerza: actualizar todos los datos del usuario en todas las plazas ocupadas por él
    match.bookedPlayers = match.bookedPlayers.map((p) =>
        p.userId === user.id
            ? {
                userId: user.id,
                name: user.name,
                profilePictureUrl: user.profilePictureUrl
            }
            : {
                userId: p.userId,
                name: p.name,
                profilePictureUrl: p.profilePictureUrl
            }
    );
    // Limpieza: elimina entradas vacías y limita a 4 jugadores reales
    match.bookedPlayers = match.bookedPlayers.filter(p => p.userId && p.userId.trim() !== '').slice(0, 4);
    // Persistir inmediatamente el cambio de jugadores en el estado global para que otras vistas lo reflejen
    if (typeof (state as any).updateMatchInState === 'function') {
        (state as any).updateMatchInState(match.id, match);
    }
    // Migration removed

    // 8. Si el usuario es el primero en inscribirse (tanto en placeholder como en partidas vacías)
    const nowHasOnePlayer = (match.bookedPlayers || []).filter(p => p.userId && p.userId.trim() !== '').length === 1;
    const isOriginalProposal = match.isPlaceholder === true && nowHasOnePlayer;
    if (hadNoPlayersBefore && nowHasOnePlayer) {
        // Para placeholders, marca como no-placeholder
        if (match.isPlaceholder === true) {
            match.isPlaceholder = false;
        }
        // Si estaba abierto, sugerir nivel/categoría del primer jugador inscrito (también para partidas fijas)
        if (match.level === 'abierto' || !match.level) {
            match.level = (user.level as any) || '1.0';
        }
        if (match.category === 'abierta' || !match.category) {
            match.category = (user.genderCategory === 'femenino' ? 'chica' : user.genderCategory === 'masculino' ? 'chico' : 'abierta') as any;
        }
        // El primer inscrito pasa a ser el organizador SOLO en partidas fijas
        if (match.isFixedMatch) {
            match.organizerId = user.id;
        }
        if (typeof (state as any).updateMatchInState === 'function') {
            (state as any).updateMatchInState(match.id, match);
        }
    }

    // 9. Variables de control para inscripción y confirmación
    const validPlayers = match.bookedPlayers.filter((p) => p.userId && p.userId.trim() !== '');
    const uniquePlayerIds = new Set(validPlayers.map((p) => p.userId));
    let shouldConfirm = validPlayers.length === 4 && uniquePlayerIds.size === 4;

    // 10. Persistence removed - no longer needed

    let newBooking: MatchBooking | null = null;
    if (shouldConfirm) {
        match.status = 'confirmed';
        const foundCourt = findAvailableCourt(match.clubId, new Date(match.startTime), new Date(match.endTime));
        if (foundCourt && typeof foundCourt.courtNumber === 'number') {
            match.courtNumber = foundCourt.courtNumber;
        } else {
            console.error(`CRITICAL: No court available for confirmed match ${matchId}.`);
            match.courtNumber = 99; // Indicate an issue
        }
        // Escribir el estado confirmado con pista en el estado global
        if (typeof (state as any).updateMatchInState === 'function') {
            (state as any).updateMatchInState(match.id, match);
        }
        _annulConflictingActivities(match);
        for (const player of match.bookedPlayers) {
            await removeUserPreInscriptionsForDay(player.userId, new Date(match.startTime), match.id, 'match');
        }
        // Limpiar cualquier MatchBooking antiguo para este usuario y partida
        if (typeof (state as any).removeUserMatchBookingFromState === 'function') {
            (state as any).removeUserMatchBookingFromState(userId, matchId);
        }
        // Solo registrar el MatchBooking cuando la partida se confirma
        newBooking = {
            id: `matchbooking-${matchId}-${userId}-${Date.now()}`,
            userId,
            activityId: matchId,
            activityType: 'match',
            bookedAt: new Date(),
            bookedWithPoints: usePoints,
            matchDetails: { ...match }
        };
        state.addUserMatchBookingToState(newBooking);
    } else {
        // Si no está confirmada, asegurar que status es 'forming' y no hay pista asignada
        match.status = 'forming';
        match.courtNumber = undefined;
        if (typeof (state as any).updateMatchInState === 'function') {
            (state as any).updateMatchInState(match.id, match);
        }
        // Eliminar cualquier booking anterior para este usuario y partida
        if (typeof (state as any).removeUserMatchBookingFromState === 'function') {
            (state as any).removeUserMatchBookingFromState(userId, matchId);
        }
        // Solo crear booking si no existe ya uno
        const alreadyBooked = state.getMockUserMatchBookings().some((b) => b.activityId === matchId && b.userId === userId);
        if (!alreadyBooked) {
            newBooking = {
                id: `matchbooking-pre-${matchId}-${userId}-${Date.now()}`,
                userId: userId,
                activityId: matchId,
                activityType: 'match',
                bookedAt: new Date(),
                bookedWithPoints: usePoints,
                matchDetails: { ...match }
            };
            state.addUserMatchBookingToState(newBooking);
        }
    }

    // Recalcular y persistir siempre el precio total y los jugadores tras la inscripción
    if (!match.totalCourtFee || match.totalCourtFee === 0) {
        match.totalCourtFee = calculateActivityPrice(club, new Date(match.startTime));
    }
    match.bookedPlayers = (match.bookedPlayers || []).map(p => ({
        userId: p.userId,
        name: p.name,
        profilePictureUrl: p.profilePictureUrl
    }));
    // Migration removed
    // Asegurar que el estado del match queda actualizado con totalCourtFee y jugadores definitivos
    if (typeof (state as any).updateMatchInState === 'function') {
        (state as any).updateMatchInState(match.id, match);
    }
    // Persistence removed

    // Si era una propuesta original, crear la nueva partida abierta para otros usuarios
    if (isOriginalProposal) {
        const newProposalMatch: Match = {
            ...match, // Inherit properties like time, club, duration
            id: `match-ph-${match.clubId}-${format(new Date(match.startTime), 'yyyyMMddHHmm')}-new`,
            level: 'abierto',
            category: 'abierta',
            bookedPlayers: [],
            isPlaceholder: true, // This is the new placeholder
            isProMatch: match.isProMatch, // Preserve pro status if applicable
            status: 'forming',
            courtNumber: undefined,
            organizerId: undefined,
            privateShareCode: undefined,
            // ...existing code...
        };
        state.addMatchToState(newProposalMatch);
    }

    await recalculateAndSetBlockedBalances(userId);

    // Recalcular y persistir siempre el precio total y los jugadores tras la inscripción
    if (!match.totalCourtFee || match.totalCourtFee === 0) {
        match.totalCourtFee = calculateActivityPrice(club, new Date(match.startTime));
    }
    match.bookedPlayers = (match.bookedPlayers || []).map(p => ({
        userId: p.userId,
        name: p.name,
        profilePictureUrl: p.profilePictureUrl
    }));
    // Migration removed
    if (typeof (state as any).updateMatchInState === 'function') {
        (state as any).updateMatchInState(match.id, match);
    }
    // Persistence removed
    // DEBUG: Log temporal para depuración de bookedPlayers tras inscripción
    // eslint-disable-next-line no-console
    console.log('DEBUG [bookMatch] bookedPlayers:', JSON.stringify(match.bookedPlayers));
    return { newBooking, updatedMatch: match };
};



export const addMatch = async (matchData: Omit<Match, 'id' | 'status' | 'organizerId' | 'privateShareCode'> & { creatorId?: string }): Promise<Match | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    if (!matchData.clubId) return { error: "Se requiere el ID del club." };
    if (!matchData.startTime || !matchData.endTime || new Date(matchData.startTime) >= new Date(matchData.endTime)) {
        return { error: 'La hora de inicio debe ser anterior a la hora de fin.' };
    }
    const startTimeDate = new Date(matchData.startTime);
    const endTimeDate = new Date(matchData.endTime);
    if (matchData.creatorId) {
        const creator = state.getMockInstructors().find(inst => inst.id === matchData.creatorId);
        if (creator) {
            if (creator.isAvailable === false) {
                return { error: `El creador (${creator.name}) no está disponible actualmente (configuración general).` };
            }
            const dayKey = dayOfWeekArray[getDay(startTimeDate)];
            const creatorUnavailableRanges = creator.unavailableHours?.[dayKey] || [];
            for (const unavailableRange of creatorUnavailableRanges) {
                const unavailableStart = parse(unavailableRange.start, 'HH:mm', startTimeDate);
                const unavailableEnd = parse(unavailableRange.end, 'HH:mm', startTimeDate);
                if (areIntervalsOverlapping(
                    { start: startTimeDate, end: endTimeDate },
                    { start: unavailableStart, end: unavailableEnd },
                    { inclusive: false }
                )) {
                    return { error: `El creador (${creator.name}) no está disponible de ${unavailableRange.start} a ${unavailableRange.end} los ${format(startTimeDate, 'eeee', { locale: es })}.` };
                }
            }
            const instructorIsAlreadyBookedWithClass = state.getMockTimeSlots().find(
                existingSlot => existingSlot.instructorId === creator.id &&
                                existingSlot.clubId === matchData.clubId &&
                                existingSlot.status !== 'cancelled' &&
                                areIntervalsOverlapping(
                                    { start: startTimeDate, end: endTimeDate },
                                    { start: new Date(existingSlot.startTime), end: new Date(existingSlot.endTime) },
                                    { inclusive: false }
                                )
            );
            if (instructorIsAlreadyBookedWithClass) {
                return { error: `El creador (${creator.name}) ya tiene una clase en ${instructorIsAlreadyBookedWithClass.clubId} Pista ${instructorIsAlreadyBookedWithClass.courtNumber} de ${format(new Date(instructorIsAlreadyBookedWithClass.startTime), 'HH:mm')} a ${format(new Date(instructorIsAlreadyBookedWithClass.endTime), 'HH:mm')}.` };
            }
        }
    }

    if (matchData.courtNumber) {
        const existingBlockingActivity = mockUtils.findConflictingConfirmedActivity({
            startTime: startTimeDate,
            endTime: endTimeDate,
            clubId: matchData.clubId,
            courtNumber: typeof matchData.courtNumber === 'number' ? matchData.courtNumber : -1,
        } as any, state.getMockTimeSlots(), state.getMockMatches());

        if (existingBlockingActivity) {
            const activityType = 'instructorName' in existingBlockingActivity ? 'clase' : 'partida';
            return { error: `La Pista ${matchData.courtNumber} ya está reservada por una ${activityType} confirmada a esta hora.` };
        }
    }


    const newMatch: Match = {
        id: (matchData as Match).id || `match-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
        clubId: matchData.clubId,
        startTime: startTimeDate,
        endTime: endTimeDate,
        courtNumber: (matchData.bookedPlayers || []).length === 4 ? matchData.courtNumber : undefined,
        level: matchData.level || matchPadelLevels[0],
        category: matchData.category || 'abierta',
        bookedPlayers: matchData.bookedPlayers || [],
        gratisSpotAvailable: matchData.gratisSpotAvailable || false,
        isPlaceholder: matchData.isPlaceholder || false,
    isFixedMatch: (matchData as any).isFixedMatch || false,
    fixedSchedule: (matchData as any).fixedSchedule,
        status: (matchData.bookedPlayers || []).length === 4 ? 'confirmed' : 'forming',
        organizerId: undefined,
        privateShareCode: undefined,
    // ...existing code...
        eventId: matchData.eventId,
        totalCourtFee: matchData.totalCourtFee,
        durationMinutes: matchData.durationMinutes || 90,
        isProMatch: matchData.isProMatch || false,
    };
    state.addMatchToState(newMatch);

    if (matchData.bookedPlayers && matchData.bookedPlayers.length > 0) {
        matchData.bookedPlayers.forEach(player => {
            const student = getMockStudents().find(s => s.id === player.userId) || (state.getMockCurrentUser()?.id === player.userId ? state.getMockCurrentUser() : { name: 'Jugador Desc.' });
            state.addUserMatchBookingToState({
                id: `matchbooking-${newMatch.id}-${player.userId}-${Date.now()}-${Math.random()}`,
                userId: player.userId,
                activityId: newMatch.id,
                activityType: 'match',
                bookedAt: new Date(),
                matchDetails: { ...newMatch, clubId: newMatch.clubId, startTime: new Date(newMatch.startTime), endTime: new Date(newMatch.endTime), bookedPlayers: newMatch.bookedPlayers.map(p => ({ userId: p.userId, name: p.name || (p.userId === player.userId ? student?.name : undefined) })) }
            });
        });
    }

    if (!newMatch.isPlaceholder) {
        _annulConflictingActivities(newMatch);
    }

    return { ...newMatch };
};

export const deleteMatch = async (matchId: string): Promise<{ success: true, message: string } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const matchToDelete = state.getMockMatches().find(m => m.id === matchId);
    if (!matchToDelete) return { error: 'Partida no encontrada.' };

    let refundMessage = "";
    let playersRefundedCount = 0;

    if (!matchToDelete.isPlaceholder) {
        const club = state.getMockClubs().find(c => c.id === matchToDelete.clubId);
        const price = club ? calculateActivityPrice(club, new Date(matchToDelete.startTime)) : 0;
        for (const player of (matchToDelete.bookedPlayers || [])) {
            const booking = state.getMockUserMatchBookings().find(b => b.activityId === matchId && b.userId === player.userId);
            if (booking) {
                if (booking.bookedWithPoints) {
                    const pointsToRefund = calculatePricePerPerson(price || 0, 4);
                    await addUserPointsAndAddTransaction(player.userId, pointsToRefund, 'reembolso_error_reserva', `Devolución puntos por cancelación de partida (Admin)`, matchId, matchToDelete.clubId);
                    refundMessage += ` ${player.name || player.userId.slice(0,6)} (+${pointsToRefund} pts).`;
                } else if (matchToDelete.clubId) {
                    const creditToRefund = calculatePricePerPerson(price, 4);
                    await addCreditToStudent(player.userId, creditToRefund, `Reembolso partida cancelada por admin ${format(new Date(matchToDelete.startTime), "dd/MM")}`);
                    refundMessage += ` ${player.name || player.userId.slice(0,6)} (+${creditToRefund.toFixed(2)}€).`;
                }
                playersRefundedCount++;
            }
        }
    }

    state.removeMatchFromState(matchId);
    state.removeUserMatchBookingFromStateByMatch(matchId);

    const mainMessage = `Partida ${matchToDelete.isPlaceholder ? 'placeholder ' : ''}cancelada exitosamente.`;
    const finalMessage = (playersRefundedCount > 0 && !matchToDelete.isPlaceholder) ? `${mainMessage} ${refundMessage}` : `${mainMessage} ${matchToDelete.isPlaceholder ? '' : 'No había jugadores con coste para reembolsar.'}`;

    return { success: true, message: finalMessage };
};

export const cancelMatchBooking = async (
    userId: string,
    bookingId: string
): Promise<{ success: true, updatedMatch: Match, message?: string, pointsAwarded?: number, penaltyApplied?: boolean } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const bookingIndex = state.getMockUserMatchBookings().findIndex(b => b.id === bookingId && b.userId === userId);
    if (bookingIndex === -1) return { error: "Reserva de partida no encontrada." };

    const booking = state.getMockUserMatchBookings()[bookingIndex];
    const match = state.getMockMatches().find(m => m.id === booking.activityId);

    if (!match) {
        state.removeUserMatchBookingFromState(booking.id);
        return { success: true, updatedMatch: {} as Match, message: 'Tu inscripción para una partida ya eliminada ha sido borrada.' };
    }

    const club = state.getMockClubs().find(c => c.id === match.clubId);
    const price = club ? calculateActivityPrice(club, new Date(match.startTime)) : 0;
    let message = 'Inscripción cancelada.';
    let pointsAwarded = 0;
    let penaltyApplied = false;

    if (match.status === 'confirmed') {
        const pricePaid = calculatePricePerPerson(price || 0, 4);
        const basePointsToAward = Math.round(pricePaid * (club?.pointSettings?.cancellationPointPerEuro || 0));
        pointsAwarded = basePointsToAward;
        
        const hoursDifference = differenceInHours(new Date(match.startTime), new Date());
        const penaltyTiers = club?.pointSettings?.cancellationPenaltyTiers?.sort((a,b) => a.hoursBefore - b.hoursBefore) || [];
        const applicableTier = penaltyTiers.find(tier => hoursDifference < tier.hoursBefore);
        let penaltyMessage = "";

        if (applicableTier) {
            const penaltyAmount = Math.round(basePointsToAward * (applicableTier.penaltyPercentage / 100));
            pointsAwarded -= penaltyAmount;
            penaltyMessage = ` Se ha aplicado una penalización del ${applicableTier.penaltyPercentage}% por cancelación tardía.`;
            penaltyApplied = true;
        }

        if (pointsAwarded > 0) {
            await addUserPointsAndAddTransaction(userId, pointsAwarded, 'cancelacion_partida', `Bonificación por cancelación de partida confirmada`, booking.activityId, match.clubId);
        }
        message = `Cancelación Bonificada: Tu plaza se liberará como "Gratis". Has recibido ${pointsAwarded} puntos.${penaltyMessage}`;

    } else { // Pre-registration cancellation ('forming')
        const penaltyPoints = club?.pointSettings?.unconfirmedCancelPenaltyPoints ?? 1;
        await addUserPointsAndAddTransaction(userId, -penaltyPoints, 'penalizacion_cancelacion_no_confirmada', 'Penalización por cancelación de partida no confirmada', booking.activityId, match.clubId);
        message += ` Se ha aplicado una penalización de ${penaltyPoints} punto(s).`;
        penaltyApplied = true;
    }

    const removalResult = await removePlayerFromMatch(match.id, userId, true);
    if ('error' in removalResult) return removalResult;

    return {
        success: true,
        updatedMatch: removalResult.updatedMatch,
        message,
        pointsAwarded: pointsAwarded > 0 ? pointsAwarded : undefined,
        penaltyApplied
    };
};

export const removePlayerFromMatch = async (matchId: string, userId: string, isSystemRemoval: boolean = false): Promise<{ success: true, updatedMatch: Match, message: string } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const matchIndex = state.getMockMatches().findIndex((m: Match) => m.id === matchId);
    if (matchIndex === -1) return { error: 'Partida no encontrada.' };
    const originalMatch = state.getMockMatches()[matchIndex];

    const playerBooking = state.getMockUserMatchBookings().find((b: MatchBooking) => b.activityId === matchId && b.userId === userId);
    let message = "";

    if (!originalMatch.bookedPlayers.some((p: any) => p.userId === userId)) return { error: 'Jugador no encontrado en esta partida.' };
    if (originalMatch.isPlaceholder && !isSystemRemoval) return { error: "No se pueden eliminar jugadores de una tarjeta de partida abierta placeholder."};

    if (!isSystemRemoval) {
        const club = state.getMockClubs().find((c: Club) => c.id === originalMatch.clubId);
        if (!club) return { error: "Club no encontrado" };
        const price = calculateActivityPrice(club, new Date(originalMatch.startTime));
        if (playerBooking?.bookedWithPoints) {
            const pointsToRefund = calculatePricePerPerson(price || 0, 4);
            await addUserPointsAndAddTransaction(userId, pointsToRefund, 'reembolso_error_reserva', `Devolución puntos por eliminación de partida (Admin)`, matchId, originalMatch.clubId);
            message = `Jugador eliminado. ${pointsToRefund} puntos devueltos.`;
        } else if (originalMatch.clubId) {
            const creditToRefund = calculatePricePerPerson(price, 4);
            await addCreditToStudent(userId, creditToRefund, `Reembolso partida cancelada por admin ${format(new Date(originalMatch.startTime), "dd/MM")}`);
            message = `Jugador eliminado. ${creditToRefund.toFixed(2)}€ devueltos.`;
        } else {
            message = "Jugador eliminado de la partida.";
        }
    } else {
        message = "Has sido eliminado de la partida por saldo insuficiente."; // Simple message for system removal
    }


    const updatedBookedPlayers = originalMatch.bookedPlayers.filter((p: any) => p.userId !== userId);
    let newGratisSpotAvailable = originalMatch.gratisSpotAvailable;

    const wasConfirmed = originalMatch.bookedPlayers.length === 4;
    const isNowNotConfirmed = updatedBookedPlayers.length < 4;

    if (wasConfirmed && isNowNotConfirmed) {
        // A confirmed match now has an open spot.
        // It should now be offered as a gratis spot.
        newGratisSpotAvailable = true;
    } else if (updatedBookedPlayers.length < 3) {
        // If less than 3 players, the gratis offer is no longer valid.
        newGratisSpotAvailable = false;
    }


    const updatedMatch: Match = {
        ...originalMatch,
        bookedPlayers: updatedBookedPlayers,
        gratisSpotAvailable: newGratisSpotAvailable,
        status: 'confirmed', // It remains confirmed, the spot is just open
    };
    state.updateMatchInState(originalMatch.id, updatedMatch);
    state.removeUserMatchBookingFromStateByMatchAndUser(matchId, userId);
    await recalculateAndSetBlockedBalances(userId);

    return { success: true, updatedMatch: JSON.parse(JSON.stringify(updatedMatch)), message };
};

export function createMatchesForDay(club: Club, date: Date): Match[] {
    const matchesForDay: Match[] = [];
    const startHour = 9;
    const endHour = 22;
    const matchDurationMinutes = 90;
    const timeSlotIntervalMinutes = 30; // Check every 30 minutes for a potential start

    const dayKey = dayOfWeekArray[getDay(date)];
    const clubUnavailableRanges = club.unavailableMatchHours?.[dayKey] || [];
    
    // Check only for confirmed activities that would block a slot
    const confirmedActivitiesToday: Array<{ startTime: Date|string; endTime?: Date|string; courtNumber?: number; status?: string; clubId?: string; }> = [
        ...state.getMockTimeSlots().filter((s: any) => isSameDay(new Date(s.startTime), date) && s.clubId === club.id && s.courtNumber !== undefined && (s.status === 'confirmed' || s.status === 'confirmed_private')),
        ...state.getMockMatches().filter((m: any) => isSameDay(new Date(m.startTime), date) && m.clubId === club.id && m.courtNumber !== undefined && (m.status === 'confirmed' || m.status === 'confirmed_private')),
    ];

    let currentTimeSlotStart = setMinutes(setHours(date, startHour), 0);
    const endOfDayOperations = setHours(date, endHour);

    while (currentTimeSlotStart < endOfDayOperations) {
        const matchStartTime = new Date(currentTimeSlotStart);
        const matchEndTime = addMinutes(matchStartTime, matchDurationMinutes);

        // Check against unavailable blocks defined in club settings
        const isUnavailableBlock = clubUnavailableRanges.some(range => {
            const unavailableStart = parse(range.start, 'HH:mm', matchStartTime);
            const unavailableEnd = parse(range.end, 'HH:mm', matchStartTime);
            return matchStartTime >= unavailableStart && matchStartTime < unavailableEnd;
        });

        if (isUnavailableBlock) {
            currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
            continue;
        }
        
       const hasConfirmedConflict = confirmedActivitiesToday.some((activity) => 
             areIntervalsOverlapping(
                { start: matchStartTime, end: matchEndTime },
                { start: new Date(activity.startTime), end: activity.endTime ? new Date(activity.endTime) : addMinutes(new Date(activity.startTime), 90) },
                { inclusive: false }
            )
        );

        if (hasConfirmedConflict) {
             currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
            continue;
        }

        const existingIdenticalProposal = state.getMockMatches().find(m =>
             m.clubId === club.id && new Date(m.startTime).getTime() === matchStartTime.getTime()
        );
        
        if (existingIdenticalProposal) {
             currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
            continue;
        }
        
        // Create Regular Match
        const newMatch: Match = {
            id: `match-ph-${club.id}-${format(matchStartTime, 'yyyyMMddHHmm')}`,
            clubId: club.id,
            startTime: matchStartTime,
            endTime: matchEndTime,
            level: 'abierto',
            category: 'abierta',
            bookedPlayers: [],
            isPlaceholder: true,
            status: 'forming',
            durationMinutes: matchDurationMinutes,
        };
        matchesForDay.push(newMatch);

    // No MatchPro placeholders; fixed matches are user-organized

        currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
    }
    return matchesForDay;
}

// Generate "Partida fija" placeholders every 30 minutes throughout the day.
// These do not block courts and allow users to start a weekly fixed match from a card.
export function createFixedPlaceholdersForDay(club: Club, date: Date): Match[] {
    const fixedMatchesForDay: Match[] = [];
    const startHour = 9;
    const endHour = 22;
    const matchDurationMinutes = 90;
    const timeSlotIntervalMinutes = 30;
    const MAX_PLACEHOLDERS_PER_INTERVAL = 1; // Only one open-level card per 30 min slot

    const dayKey = dayOfWeekArray[getDay(date)];
    const clubUnavailableRanges = club.unavailableMatchHours?.[dayKey] || [];

        let currentTimeSlotStart = setMinutes(setHours(date, startHour), 0);
    const endOfDayOperations = setHours(date, endHour);

        // Cleanup expired provisional holds (free their slots)
        const now = new Date();
        state.getMockMatches()
            .filter(m => (m as any).isProvisional === true && (m as any).provisionalExpiresAt && new Date((m as any).provisionalExpiresAt) < now)
            .forEach(m => state.removeMatchFromState(m.id));

    while (currentTimeSlotStart < endOfDayOperations) {
        const matchStartTime = new Date(currentTimeSlotStart);
        const matchEndTime = addMinutes(matchStartTime, matchDurationMinutes);

        // Skip ranges where club disables matches
        const isUnavailableBlock = clubUnavailableRanges.some(range => {
            const unavailableStart = parse(range.start, 'HH:mm', matchStartTime);
            const unavailableEnd = parse(range.end, 'HH:mm', matchStartTime);
            return matchStartTime >= unavailableStart && matchStartTime < unavailableEnd;
        });
        if (isUnavailableBlock) {
            currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
            continue;
        }

        // Compute number of available courts for this interval
        const { available } = getCourtAvailabilityForInterval(club.id, matchStartTime, matchEndTime);
        let availableCount = available.length;
        // Subtract unexpired provisional holds for this exact slot (simulate a held court)
        const activeProvisionalHolds = state.getMockMatches().filter(m =>
            m.clubId === club.id &&
            (m as any).isProvisional === true &&
            (m as any).provisionalExpiresAt && new Date((m as any).provisionalExpiresAt) > now &&
            new Date(m.startTime).getTime() === matchStartTime.getTime()
        ).length;
        availableCount = Math.max(0, availableCount - activeProvisionalHolds);
        if (availableCount <= 0) {
            currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
            continue;
        }

        // Count existing fixed placeholders already persisted for this exact timestamp
        const existingCountForSlot = state.getMockMatches().filter(m =>
            m.clubId === club.id &&
            m.isPlaceholder === true &&
            m.isFixedMatch === true &&
            new Date(m.startTime).getTime() === matchStartTime.getTime()
        ).length;

    // Only one placeholder per slot (if there is at least one court available)
    const targetCount = availableCount > 0 ? 1 : 0;
        const toCreate = Math.max(0, targetCount - existingCountForSlot);
        for (let i = 0; i < toCreate; i++) {
            const uniqueSuffix = Math.random().toString(36).slice(2, 7);
            const newFixedPlaceholder: Match = {
                id: `match-fixed-ph-${club.id}-${format(matchStartTime, 'yyyyMMddHHmm')}-${uniqueSuffix}`,
                clubId: club.id,
                startTime: matchStartTime,
                endTime: matchEndTime,
                level: 'abierto',
                category: 'abierta',
                bookedPlayers: [],
                isPlaceholder: true,
                isFixedMatch: true,
                status: 'forming',
                durationMinutes: matchDurationMinutes,
            } as Match;
            fixedMatchesForDay.push(newFixedPlaceholder);
        }

        currentTimeSlotStart = addMinutes(currentTimeSlotStart, timeSlotIntervalMinutes);
    }
    return fixedMatchesForDay;
}

export const bookCourtForMatchWithPoints = async (
    userId: string,
    matchId: string,
): Promise<{ updatedMatch: Match } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    
    const user = state.getMockUserDatabase().find(u => u.id === userId);
    if (!user) return { error: "Usuario no encontrado." };

    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: "Partida no encontrada." };

    const match = { ...state.getMockMatches()[matchIndex] };
    if (!match.isPlaceholder) {
        return { error: "Esta partida ya ha sido iniciada por otro jugador." };
    }

    const club = state.getMockClubs().find(c => c.id === match.clubId);
    if (!club) return { error: "Club no encontrado para esta partida." };

    const pointsCost = club.pointSettings?.pointsCostForCourt ?? 0;
    // Día bloqueado: impedir reservar si ya tiene actividad confirmada ese día
    if (mockUtils.countUserConfirmedActivitiesForDay(userId, new Date(match.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }
    if ((user.loyaltyPoints ?? 0) < pointsCost) {
        return { error: `Puntos insuficientes. Se requieren ${pointsCost} puntos.` };
    }

    // Deduct points
    await addUserPointsAndAddTransaction(
        userId,
        -pointsCost,
        'reserva_pista_puntos',
        `Reserva de pista con puntos para partida`,
        matchId,
        club.id
    );

    const privateShareCode = `privmatch-${matchId.slice(-6)}-${Date.now().toString().slice(-6)}`;
    
    // Update the match
    match.isPlaceholder = false;
    match.status = 'confirmed_private';
    match.organizerId = userId;
    match.bookedPlayers = [{ userId: user.id, name: user.name }];
    // ...existing code...
    match.privateShareCode = privateShareCode;
    match.totalCourtFee = 0; // It's a points-based booking

    state.updateMatchInState(matchId, match);

    // Create a booking for the organizer
    const newBooking: MatchBooking = {
        id: `matchbooking-${matchId}-${userId}-${Date.now()}`,
        userId,
        activityId: matchId,
        activityType: 'match',
        bookedAt: new Date(),
        bookedWithPoints: true,
        isOrganizerBooking: true,
        matchDetails: { ...match }
    };
    state.addUserMatchBookingToState(newBooking);

    return { updatedMatch: match };
};


export const confirmMatchAsPrivate = async (
    organizerUserId: string,
    matchId: string,
    isRecurring: boolean // When true (renewal de fijas), flexibiliza restricciones de día
): Promise<{ updatedMatch: Match; shareLink: string } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const organizerUser = state.getMockUserDatabase().find(u => u.id === organizerUserId);
    if (!organizerUser) return { error: "Usuario organizador no encontrado." };

    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: "Partida no encontrada." };

    let matchToConfirm = JSON.parse(JSON.stringify(state.getMockMatches()[matchIndex])) as Match;

    if (matchToConfirm.isPlaceholder !== true) {
        return { error: "Solo se puede confirmar como privada una partida abierta (placeholder)." };
    }

    if ((matchToConfirm.bookedPlayers || []).length > 0) {
        return { error: "No se puede confirmar como privada, esta partida ya tiene jugadores." };
    }
    
    const club = state.getMockClubs().find(c => c.id === matchToConfirm.clubId);
    if (!club) return { error: "Club no encontrado para esta partida." };
    
    const totalPrice = calculateActivityPrice(club, new Date(matchToConfirm.startTime));
    // Día bloqueado: para renovaciones de partidas fijas (isRecurring=true) permitimos múltiples
    // Confirmaciones el mismo día; en otros casos aplicamos la restricción normal
    if (!isRecurring && mockUtils.countUserConfirmedActivitiesForDay(organizerUserId, new Date(matchToConfirm.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }

    if ((organizerUser.credit ?? 0) < totalPrice) {
        return { error: `Saldo insuficiente. Necesitas ${totalPrice.toFixed(2)}€ y tienes ${(organizerUser.credit ?? 0).toFixed(2)}€.` };
    }

    const availableCourt = findAvailableCourt(matchToConfirm.clubId, new Date(matchToConfirm.startTime), new Date(matchToConfirm.endTime));
    if (!availableCourt) {
        return { error: "No hay pistas disponibles en este momento para confirmar la partida." };
    }

    deductCredit(organizerUserId, totalPrice, matchToConfirm, 'Partida');

    const privateShareCode = `privmatch-${matchId.slice(-6)}-${Date.now().toString().slice(-6)}`;

    matchToConfirm.status = 'confirmed_private';
    matchToConfirm.organizerId = organizerUserId;
    matchToConfirm.privateShareCode = privateShareCode;
    // ...existing code...
    matchToConfirm.courtNumber = availableCourt.courtNumber;
    matchToConfirm.bookedPlayers = [{ userId: organizerUserId, name: organizerUser.name, profilePictureUrl: organizerUser.profilePictureUrl }];
    // Assign level/category from organizer if still open
    if (!matchToConfirm.level || matchToConfirm.level === 'abierto') {
        matchToConfirm.level = (organizerUser.level as any) || '1.0';
    }
    if (!matchToConfirm.category || matchToConfirm.category === 'abierta') {
        matchToConfirm.category = organizerUser.genderCategory === 'femenino' ? 'chica' : organizerUser.genderCategory === 'masculino' ? 'chico' : 'abierta';
    }
    matchToConfirm.isPlaceholder = false; // It's no longer a placeholder
    // If this was a provisional fixed match, clear provisional markers
    if ((matchToConfirm as any).isProvisional) {
        (matchToConfirm as any).isProvisional = false;
        (matchToConfirm as any).provisionalExpiresAt = undefined as any;
        (matchToConfirm as any).provisionalForUserId = undefined as any;
    }
    matchToConfirm.isRecurring = isRecurring;
    matchToConfirm.totalCourtFee = totalPrice;

    state.updateMatchInState(matchId, matchToConfirm);

    // Create the organizer's booking record
    const newOrganizerBooking: MatchBooking = {
        id: `privmatchbooking-${matchId}-${organizerUserId}-${Date.now()}`,
        userId: organizerUserId,
        activityId: matchId,
        activityType: 'match',
        bookedAt: new Date(),
        isOrganizerBooking: true,
        matchDetails: { ...matchToConfirm }
    };
    state.addUserMatchBookingToState(newOrganizerBooking);

    _annulConflictingActivities(matchToConfirm);
    await recalculateAndSetBlockedBalances(organizerUserId);

    const shareLink = `/?view=partidas&code=${privateShareCode}`;
    return { updatedMatch: JSON.parse(JSON.stringify(matchToConfirm)), shareLink };
};

// Helper: schedule next week's provisional fixed match with a 24h renewal window after the current match ends
function _scheduleNextFixedMatch(baseMatch: Match) {
        try {
        const baseStart = new Date(baseMatch.startTime);
        const computedEnd = baseMatch.endTime ? new Date(baseMatch.endTime) : addMinutes(new Date(baseMatch.startTime), baseMatch.durationMinutes || 90);
        const nextStart = addDays(baseStart, 7);
        const nextEnd = addDays(computedEnd, 7);
        const renewalDeadline = addHours(computedEnd, 24);
                const provisional: Match = {
                        id: `match-provisional-${baseMatch.clubId}-${format(nextStart, 'yyyyMMddHHmm')}-${Math.random().toString(36).slice(2,7)}`,
                        clubId: baseMatch.clubId,
                        startTime: nextStart,
                        endTime: nextEnd,
                        durationMinutes: baseMatch.durationMinutes || 90,
                        level: baseMatch.level || 'abierto',
                        category: baseMatch.category || 'abierta',
                        bookedPlayers: baseMatch.bookedPlayers?.length ? [...baseMatch.bookedPlayers] : [],
                        status: 'forming',
                        isPlaceholder: true,
                        isFixedMatch: true,
                        fixedSchedule: baseMatch.fixedSchedule || undefined,
                        isProvisional: true,
                        provisionalForUserId: baseMatch.organizerId,
            provisionalExpiresAt: renewalDeadline,
                        organizerId: baseMatch.organizerId,
                } as Match;
                state.addMatchToState(provisional);
                const updatedCurrent = { ...baseMatch, isRecurring: true, nextRecurringMatchId: provisional.id } as Match;
                state.updateMatchInState(baseMatch.id, updatedCurrent);
                return provisional;
        } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('Failed to schedule next fixed match', e);
                return null;
        }
}

export const createFixedMatchFromPlaceholder = async (
    organizerUserId: string,
    matchId: string,
    options: { hasReservedCourt: boolean; organizerJoins?: boolean }
): Promise<{ updatedMatch: Match; shareLink?: string } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const organizerUser = state.getMockUserDatabase().find(u => u.id === organizerUserId);
    if (!organizerUser) return { error: 'Usuario organizador no encontrado.' };
    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: 'Partida no encontrada.' };
    let match = { ...state.getMockMatches()[matchIndex] } as Match;
    if (!match.isPlaceholder) return { error: 'Solo puedes fijar partidas abiertas (placeholder).' };
    if ((match.bookedPlayers || []).length > 0) return { error: 'Esta partida ya tiene jugadores.' };

    const club = state.getMockClubs().find(c => c.id === match.clubId);
    if (!club) return { error: 'Club no encontrado.' };

    // Compute fixed schedule
    const dayKey = dayOfWeekArray[getDay(new Date(match.startTime))];
    const time = format(new Date(match.startTime), 'HH:mm');

    if (options.hasReservedCourt) {
        // Manually confirm as private without forcing the organizer to join as a player
        const organizerUser = state.getMockUserDatabase().find(u => u.id === organizerUserId);
        if (!organizerUser) return { error: 'Usuario organizador no encontrado.' };

        const totalPrice = calculateActivityPrice(club, new Date(match.startTime));
    // Allow multiple fixed private reservations per day for the organizer
        if (((organizerUser.credit ?? 0) - (organizerUser.blockedCredit ?? 0)) < totalPrice) {
            return { error: `Saldo insuficiente. Necesitas ${totalPrice.toFixed(2)}€.` };
        }

        const availableCourt = findAvailableCourt(match.clubId, new Date(match.startTime), new Date(match.endTime));
        if (!availableCourt) {
            return { error: 'No hay pistas disponibles en este momento para confirmar la partida.' };
        }

        deductCredit(organizerUserId, totalPrice, match, 'Partida');
        const privateShareCode = `privmatch-${matchId.slice(-6)}-${Date.now().toString().slice(-6)}`;

        match.isPlaceholder = false;
        match.status = 'confirmed_private';
        match.organizerId = organizerUserId;
        match.privateShareCode = privateShareCode;
        match.courtNumber = availableCourt.courtNumber;
        match.isFixedMatch = true;
        match.fixedSchedule = { dayOfWeek: dayKey, time, hasReservedCourt: true } as any;
        // Nivel/categoría por defecto: si el organizador se inscribe como jugador, fijarlos según su perfil; en caso contrario, dejarlos abiertos
        if (options.organizerJoins) {
            match.level = (organizerUser.level as any) || '1.0';
            match.category = (organizerUser.genderCategory === 'femenino' ? 'chica' : organizerUser.genderCategory === 'masculino' ? 'chico' : 'abierta') as any;
        } else {
            match.level = 'abierto' as any;
            match.category = 'abierta' as any;
        }
        match.totalCourtFee = totalPrice;
        // Only add organizer to players if explicitly requested
        match.bookedPlayers = options.organizerJoins ? [{ userId: organizerUserId, name: organizerUser.name, profilePictureUrl: organizerUser.profilePictureUrl }] : [];

        state.updateMatchInState(matchId, match);

        // Create a booking record for the organizer (payment record), independent of being a player
        const newOrganizerBooking: MatchBooking = {
            id: `privmatchbooking-${matchId}-${organizerUserId}-${Date.now()}`,
            userId: organizerUserId,
            activityId: matchId,
            activityType: 'match',
            bookedAt: new Date(),
            isOrganizerBooking: true,
            matchDetails: { ...match }
        };
        state.addUserMatchBookingToState(newOrganizerBooking);

        _annulConflictingActivities(match);
        await recalculateAndSetBlockedBalances(organizerUserId);

        const shareLink = `/?view=partidas&code=${privateShareCode}`;
        _scheduleNextFixedMatch(match);
        return { updatedMatch: { ...match }, shareLink };
    }

    // Without reserved court: turn into forming fixed match with organizer joined
    // Day-blocking applies only to this path (joining as a player)
    if (mockUtils.countUserConfirmedActivitiesForDay(organizerUserId, new Date(match.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }
    match = {
        ...match,
        isPlaceholder: false,
        isFixedMatch: true,
        fixedSchedule: { dayOfWeek: dayKey, time, hasReservedCourt: false },
        organizerId: organizerUserId,
        status: 'forming',
        bookedPlayers: [{ userId: organizerUserId, name: organizerUser.name, profilePictureUrl: organizerUser.profilePictureUrl }],
    };
    // Nivel/categoría por defecto: primer inscrito (organizador) define
    match.level = (organizerUser.level as any) || '1.0';
    match.category = (organizerUser.genderCategory === 'femenino' ? 'chica' : organizerUser.genderCategory === 'masculino' ? 'chico' : 'abierta') as any;
    state.updateMatchInState(matchId, match);
    state.addUserMatchBookingToState({
        id: `matchbooking-${matchId}-${organizerUserId}-${Date.now()}`,
        userId: organizerUserId,
        activityId: matchId,
        activityType: 'match',
        bookedAt: new Date(),
        isOrganizerBooking: true,
        matchDetails: { ...match }
    });
    _annulConflictingActivities(match);
    _scheduleNextFixedMatch(match);
    return { updatedMatch: match };
};

export const joinPrivateMatch = async (
    inviteeUserId: string,
    matchId: string,
    shareCode: string
): Promise<{ newBooking: MatchBooking; updatedMatch: Match; organizerRefundAmount: number } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const inviteeUser = state.getMockUserDatabase().find(u => u.id === inviteeUserId);
    if (!inviteeUser) return { error: "Usuario no encontrado." };

    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId && m.privateShareCode === shareCode);
    if (matchIndex === -1) return { error: "Partida privada no encontrada o código incorrecto." };

    let match = { ...state.getMockMatches()[matchIndex] };
    if (match.status !== 'confirmed_private') return { error: "Esta partida no es privada." };
    if ((match.bookedPlayers || []).length >= 4) return { error: "Esta partida privada ya está completa." };
    if ((match.bookedPlayers || []).some(p => p.userId === inviteeUserId)) return { error: "Ya estás en esta partida." };
    
    const club = state.getMockClubs().find(c => c.id === match.clubId);
    if (!club) return { error: "Club no encontrado."};

    const pricePerPerson = calculatePricePerPerson(calculateActivityPrice(club, new Date(match.startTime)), 4);
    // Día bloqueado: impedir si ya tiene actividad confirmada ese día
    if (mockUtils.countUserConfirmedActivitiesForDay(inviteeUserId, new Date(match.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }
    
    if ((inviteeUser.credit ?? 0) < pricePerPerson) {
        return { error: `Saldo insuficiente. Necesitas ${pricePerPerson.toFixed(2)}€.` };
    }

    deductCredit(inviteeUserId, pricePerPerson, match, 'Partida');
    
    if (match.organizerId) {
        addCreditToStudent(match.organizerId, pricePerPerson, `Reembolso por invitado: ${inviteeUser.name}`);
    }

    const hadNoPlayers = (match.bookedPlayers || []).length === 0;
    match.bookedPlayers.push({ userId: inviteeUserId, name: inviteeUser.name, profilePictureUrl: inviteeUser.profilePictureUrl });
    // Si no había jugadores aún y el nivel/categoría siguen abiertos, fijarlos según el primer invitado
    if (hadNoPlayers) {
        if (match.level === 'abierto' || !match.level) {
            match.level = (inviteeUser.level as any) || '1.0';
        }
        if (match.category === 'abierta' || !match.category) {
            match.category = (inviteeUser.genderCategory === 'femenino' ? 'chica' : inviteeUser.genderCategory === 'masculino' ? 'chico' : 'abierta') as any;
        }
    }
    state.updateMatchInState(matchId, match);

    const newBooking: MatchBooking = {
        id: `matchbooking-${matchId}-${inviteeUserId}-${Date.now()}`,
        userId: inviteeUserId,
        activityId: matchId,
        activityType: 'match',
        bookedAt: new Date(),
        amountPaidByInvitee: pricePerPerson,
        matchDetails: { ...match }
    };
    state.addUserMatchBookingToState(newBooking);
    
    return { newBooking, updatedMatch: match, organizerRefundAmount: pricePerPerson };
};

export const makeMatchPublic = async (
    organizerUserId: string,
    matchId: string
): Promise<{ success: true, updatedMatch: Match } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: "Partida no encontrada." };
    
    let match = { ...state.getMockMatches()[matchIndex] };
    if (match.organizerId !== organizerUserId) return { error: "Solo el organizador puede hacer pública la partida." };
    if (match.status !== 'confirmed_private') return { error: "Esta partida ya es pública o está en otro estado." };

    match.status = 'forming';
    match.organizerId = undefined;
    match.privateShareCode = undefined;
    // ...existing code...
    // Don't modify bookedPlayers or fees, as payments are managed manually from this point.
    
    state.updateMatchInState(matchId, match);
    return { success: true, updatedMatch: match };
};

// Allow a booked user to set/update the match level and/or category while the match is forming
export const updateMatchLevelAndCategory = async (
    userId: string,
    matchId: string,
    updates: { level?: MatchPadelLevel; category?: 'abierta' | 'chico' | 'chica' }
): Promise<{ success: true; updatedMatch: Match } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: 'Partida no encontrada.' };
    const match = { ...state.getMockMatches()[matchIndex] } as Match;
    // Scope: only allow configurable updates for fixed matches
    if (!match.isFixedMatch) {
        return { error: 'Solo configurable en partidas fijas.' };
    }
    if (match.status === 'confirmed') {
        return { error: 'No se pueden cambiar los datos de una partida confirmada.' };
    }
    const isOrganizer = match.organizerId === userId;
    if (!isOrganizer) {
        return { error: 'Solo el organizador puede configurar nivel o categoría.' };
    }

    // Apply updates
    if (updates.level) {
        match.level = updates.level;
    }
    if (updates.category) {
        match.category = updates.category as any;
    }

    state.updateMatchInState(matchId, match);
    // Persistence removed
    return { success: true, updatedMatch: match };
};

export const countAvailableGratisMatches = (clubId?: string | null): number => {
    const matchesToCheck = clubId ? state.getMockMatches().filter(m => m.clubId === clubId) : state.getMockMatches();
    return matchesToCheck.filter(match => 
        !match.eventId && // Exclude match-day matches
        (match.status === 'confirmed' || match.status === 'confirmed_private') &&
        match.gratisSpotAvailable &&
        (match.bookedPlayers || []).length === 3
    ).length;
};

export const cancelPrivateMatchAndReofferWithPoints = async (organizerUserId: string, matchId: string): Promise<{ success: true, newPlaceholderMatch: Match } | { error: string }> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
    if (matchIndex === -1) return { error: "Partida no encontrada." };

    const match = state.getMockMatches()[matchIndex];
    if (match.organizerId !== organizerUserId || match.status !== 'confirmed_private') {
        return { error: "No tienes permiso para realizar esta acción o la partida no es privada." };
    }

    const club = state.getMockClubs().find(c => c.id === match.clubId);
    if (!club) return { error: "Club no encontrado." };

    // 1. Refund the organizer
    const refundAmount = match.totalCourtFee || 0;
    if (refundAmount > 0) {
        await addCreditToStudent(organizerUserId, refundAmount, `Reembolso por cancelación de partida privada y oferta por puntos.`);
    }

    // 2. Remove the private match and its bookings
    state.removeMatchFromState(matchId);
    state.removeUserMatchBookingFromStateByMatch(matchId);

    // 3. Create a new placeholder match that can only be booked with points
    const pointsCost = club.pointSettings?.pointsCostForCourt || 20;
    const newPlaceholder: Match = {
        id: `match-ph-points-${match.clubId}-${format(new Date(match.startTime), 'yyyyMMddHHmm')}`,
        clubId: match.clubId,
        startTime: match.startTime,
        endTime: match.endTime,
        level: 'abierto',
        category: 'abierta',
        bookedPlayers: [],
        isPlaceholder: true,
        status: 'forming',
        totalCourtFee: 0, // No direct euro cost
        isPointsOnlyBooking: true, // Custom flag to identify this type of match
        durationMinutes: match.durationMinutes,
    };
    state.addMatchToState(newPlaceholder);

    return { success: true, newPlaceholderMatch: newPlaceholder };
};
    
export const renewRecurringMatch = async (userId: string, completedMatchId: string): Promise<{ success: true, newMatch: Match } | { error: string }> => {
  await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
  
  const completedMatch = state.getMockMatches().find(m => m.id === completedMatchId);
  if (!completedMatch || completedMatch.organizerId !== userId || !completedMatch.isRecurring) {
    return { error: "Partida no válida para renovación." };
  }
  
  const provisionalMatch = state.getMockMatches().find(m => m.id === completedMatch.nextRecurringMatchId);
  if (!provisionalMatch || !provisionalMatch.isProvisional) {
    return { error: "No se encontró la reserva provisional para renovar." };
  }
  
  if (new Date(provisionalMatch.provisionalExpiresAt!) < new Date()) {
    return { error: "El tiempo para renovar esta reserva ha expirado." };
  }
  
    // Confirmar la provisional: si ya tiene jugadores y el organizador está inscrito,
    // completar como privada pagando el resto; si no, confirmar como privada completa.
    let confirmed:
        | { updatedMatch: Match; shareLink?: string }
        | { error: string };
    if ((provisionalMatch.bookedPlayers || []).some(p => p.userId === userId)) {
        confirmed = await fillMatchAndMakePrivate(userId, provisionalMatch.id);
    } else {
        confirmed = await confirmMatchAsPrivate(userId, provisionalMatch.id, true);
    }

    if ('error' in confirmed) {
        return confirmed;
    }

    // Programar la siguiente provisional una semana después (próximo mismo día)
    _scheduleNextFixedMatch(confirmed.updatedMatch);

    return { success: true, newMatch: confirmed.updatedMatch };
};

export const fetchUserMatchBookings = async (userId: string): Promise<MatchBooking[]> => {
    await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));
    const userBookingsData = state.getMockUserMatchBookings().filter(booking => booking.userId === userId);
    
    // Create a helper map to avoid multiple lookups
    const allMatchesMap = new Map<string, Match>();
    state.getMockMatches().forEach(m => allMatchesMap.set(m.id, m));
    
    return userBookingsData.map(booking => {
        const match = allMatchesMap.get(booking.activityId);
        
        let fullBookedPlayers: { userId: string, name?: string, profilePictureUrl?: string }[] = [];
        if (match && match.bookedPlayers) {
            fullBookedPlayers = match.bookedPlayers
                .filter(p => p.userId && p.userId.trim() !== '')
                .map(p => {
                const studentData = state.getMockStudents().find(s => s.id === p.userId);
                const userDbData = state.getMockUserDatabase().find(u => u.id === p.userId);
                return {
                    userId: p.userId,
                    name: studentData?.name || userDbData?.name || p.name || 'Jugador',
                    profilePictureUrl: studentData?.profilePictureUrl || userDbData?.profilePictureUrl || p.profilePictureUrl || undefined,
                };
            });
        }
        
        return {
            ...booking,
            bookedAt: new Date(booking.bookedAt),
            matchDetails: match ? {
                id: match.id,
                clubId: match.clubId,
                startTime: new Date(match.startTime),
                endTime: new Date(match.endTime),
                courtNumber: match.courtNumber,
                level: match.level,
                category: match.category,
                bookedPlayers: fullBookedPlayers,
                totalCourtFee: match.totalCourtFee,
                status: match.status,
                organizerId: match.organizerId,
                privateShareCode: match.privateShareCode,
                isRecurring: match.isRecurring,
                nextRecurringMatchId: match.nextRecurringMatchId,
                eventId: match.eventId,
                durationMinutes: match.durationMinutes,
            } : booking.matchDetails
        };
    });
};

export const fillMatchAndMakePrivate = async (userId: string, matchId: string): Promise<{ updatedMatch: Match; cost: number } | { error: string }> => {
  await new Promise(resolve => setTimeout(resolve, config.MINIMAL_DELAY));

  const user = state.getMockUserDatabase().find(u => u.id === userId);
  if (!user) return { error: "Usuario no encontrado." };

  const matchIndex = state.getMockMatches().findIndex(m => m.id === matchId);
  if (matchIndex === -1) return { error: "Partida no encontrada." };

  let match = { ...state.getMockMatches()[matchIndex] };
  const club = state.getMockClubs().find(c => c.id === match.clubId);
  if (!club) return { error: "Club no encontrado." };

  if (match.status !== 'forming') {
    return { error: "Solo se pueden hacer privadas las partidas en formación." };
  }

  const playersInMatch = match.bookedPlayers || [];
  if (!playersInMatch.some(p => p.userId === userId)) {
    return { error: "Debes estar inscrito en la partida para hacerla privada." };
  }
  
  const emptySpots = 4 - playersInMatch.length;
  if (emptySpots <= 0) {
    return { error: "La partida ya está llena." };
  }
  
  const pricePerPlayer = calculatePricePerPerson(calculateActivityPrice(club, new Date(match.startTime)), 4);
  const totalCost = emptySpots * pricePerPlayer;

  if (((user.credit ?? 0) - (user.blockedCredit ?? 0)) < totalCost) {
    return { error: `Saldo insuficiente. Necesitas ${totalCost.toFixed(2)}€.` };
  }
  
    // Bloqueo por día: no permitir si ya tiene otra confirmada ese día,
    // excepto cuando se trata de la confirmación de una provisional fija (renovación)
    const isProvisionalFixed = (match.isFixedMatch && (match as any).isProvisional === true);
    if (!isProvisionalFixed && mockUtils.countUserConfirmedActivitiesForDay(userId, new Date(match.startTime), matchId, 'match') > 0) {
        return { error: 'Ya tienes otra actividad confirmada hoy.' };
    }

    const availableCourt = findAvailableCourt(match.clubId, new Date(match.startTime), new Date(match.endTime));
    if (!availableCourt) {
        return { error: "No hay pistas disponibles en este momento para confirmar la partida." };
    }

  // Deduct credit for the remaining spots
  deductCredit(userId, totalCost, match, 'Partida');

  // Update match state
  match.status = 'confirmed_private';
  match.organizerId = userId; // The user who pays becomes the organizer
  match.privateShareCode = `privmatch-${matchId.slice(-6)}-${Date.now().toString().slice(-6)}`;
  match.courtNumber = availableCourt.courtNumber;
    // If this was a provisional fixed match, clear provisional markers and unset placeholder
    if ((match as any).isProvisional) {
        (match as any).isProvisional = false;
        (match as any).provisionalExpiresAt = undefined as any;
        (match as any).provisionalForUserId = undefined as any;
    }
    if (match.isPlaceholder) {
        match.isPlaceholder = false;
    }
  
  state.updateMatchInState(matchId, match);
  _annulConflictingActivities(match);

    // Ensure there is a booking record for the organizer after confirming as private
    const existingOrganizerBooking = state.getMockUserMatchBookings().find(
        (b: any) => b.activityId === matchId && b.userId === userId
    );
    if (!existingOrganizerBooking) {
        const newOrganizerBooking: MatchBooking = {
            id: `matchbooking-${matchId}-${userId}-${Date.now()}`,
            userId,
            activityId: matchId,
            activityType: 'match',
            bookedAt: new Date(),
            isOrganizerBooking: true,
            matchDetails: { ...(match as any) },
        } as MatchBooking;
        state.addUserMatchBookingToState(newOrganizerBooking);
        await recalculateAndSetBlockedBalances(userId);
    }

  return { updatedMatch: match, cost: totalCost };
};



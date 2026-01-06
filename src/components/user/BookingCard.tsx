// src/components/user/BookingCard.tsx
"use client";

import React, { useMemo } from 'react';
import ClassCardReal from '@/components/class/ClassCardReal';
import type { User, TimeSlot } from '@/types';

interface BookingCardProps {
  booking: any;
  currentUser: User | null;
  onBookingSuccess: () => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  isPastClass?: boolean;
  isCancelled?: boolean;
}

// Wrapper component que memoriza la conversión de Booking → TimeSlot
const BookingCard = React.memo<BookingCardProps>(({ 
  booking, 
  currentUser, 
  onBookingSuccess, 
  onCancelBooking,
  isPastClass = false,
  isCancelled = false
}) => {
  // Memoizar la conversión para que el objeto no cambie si booking.id no cambia
  const timeSlotData = useMemo<TimeSlot>(() => ({
    id: booking.timeSlot.id,
    start: booking.timeSlot.start,
    end: booking.timeSlot.end,
    level: booking.timeSlot.level || 'abierto',
    genderCategory: booking.timeSlot.genderCategory || null,
    instructorId: booking.timeSlot.instructorId || booking.timeSlot.instructor?.id || '',
    instructorName: booking.timeSlot.instructorName || booking.timeSlot.instructor?.name || 'Instructor',
    instructorProfilePicture: booking.timeSlot.instructorProfilePicture || booking.timeSlot.instructor?.profilePictureUrl,
    courtId: booking.timeSlot.courtId || null,
    courtNumber: booking.timeSlot.courtNumber || booking.timeSlot.court?.number || null,
    clubId: '',
    totalPrice: booking.timeSlot.totalPrice || 55,
    creditsSlots: booking.timeSlot.creditsSlots || [],
    bookings: booking.timeSlot.bookings || [],
    bookedPlayers: booking.timeSlot.bookings || [],
    courtsAvailability: []
  }), [
    booking.id, 
    booking.timeSlot.id,
    booking.timeSlot.courtNumber, 
    booking.timeSlot.bookings?.length
  ]); // NO incluir start/end para evitar cambios de referencia

  const allowedPlayerCounts = useMemo(() => [1, 2, 3, 4], []);

  return (
    <ClassCardReal
      classData={timeSlotData}
      currentUser={currentUser}
      onBookingSuccess={onBookingSuccess}
      showPointsBonus={false}
      allowedPlayerCounts={allowedPlayerCounts}
      agendaMode={true}
      bookingId={booking.id}
      onCancelBooking={onCancelBooking}
      isPastClass={isPastClass}
      isCancelled={isCancelled}
      cancelledGroupSize={isCancelled ? booking.groupSize : undefined}
      cancelledUserData={isCancelled ? {
        name: booking.user?.name || currentUser?.name,
        profilePictureUrl: booking.user?.profilePictureUrl || currentUser?.profilePictureUrl
      } : undefined}
    />
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambia el ID del booking, el usuario, o propiedades críticas
  const sameBookingId = prevProps.booking.id === nextProps.booking.id;
  const sameUser = prevProps.currentUser?.id === nextProps.currentUser?.id;
  const sameTimeSlotId = prevProps.booking.timeSlot.id === nextProps.booking.timeSlot.id;
  const sameBookingsCount = prevProps.booking.timeSlot.bookings?.length === nextProps.booking.timeSlot.bookings?.length;
  const sameCourtNumber = prevProps.booking.timeSlot.courtNumber === nextProps.booking.timeSlot.courtNumber;
  
  // Retornar true para BLOQUEAR el re-render (son iguales)
  return sameBookingId && sameUser && sameTimeSlotId && sameBookingsCount && sameCourtNumber;
});

BookingCard.displayName = 'BookingCard';

export default BookingCard;

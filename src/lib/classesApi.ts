// lib/classesApi.ts
export interface Instructor {
  id: string;
  clubId: string;
  name: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  id: string;
  clubId: string;
  courtId?: string;
  instructorId?: string;
  start: string;
  end: string;
  maxPlayers: number;
  totalPrice?: number;
  level?: string;
  levelRange?: string; // Rango de nivel del instructor (e.g., "5-7")
  category?: string;
  genderCategory?: string; // Categoría de género: masculino, femenino, mixto
  createdAt: string;
  updatedAt: string;
  instructorName?: string;
  instructorProfilePicture?: string;
  courtNumber?: number;
  bookedPlayers: number;
  bookings?: Array<{
    id: string;
    userId: string;
    groupSize: number;
    status: string;
    userName?: string;
    profilePictureUrl?: string;
    userLevel?: string;
    userGender?: string;
    createdAt?: string;
  }>;
  // 🏟️ Nuevos campos para disponibilidad de pistas
  courtsAvailability?: Array<{
    courtNumber: number;
    courtId: string;
    status: 'available' | 'occupied' | 'unavailable';
  }>;
  availableCourtsCount?: number;
  // 🎁 Nuevos campos para plazas reservables con puntos
  creditsSlots?: number[]; // Array de índices [1,2,3,4] que son reservables con puntos
  creditsCost?: number; // Coste en puntos (default: 50)
}

export interface Booking {
  id: string;
  userId: string;
  timeSlotId: string;
  groupSize: number;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  classStart?: string;
  classEnd?: string;
  instructorName?: string;
}

export class ClassesApi {
  private static baseUrl = '/api';

  static async getInstructors(clubId?: string): Promise<Instructor[]> {
    const params = new URLSearchParams();
    if (clubId) params.append('clubId', clubId);
    
    const response = await fetch(`${this.baseUrl}/instructors?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch instructors');
    }
    return response.json();
  }

  static async getTimeSlots(options: {
    clubId?: string;
    date?: string;
    instructorId?: string;
    userLevel?: string;
    userGender?: string;
    timeSlotFilter?: string; // 🕐 morning, midday, evening, all
    page?: number;
    limit?: number;
  } = {}): Promise<{ slots: TimeSlot[]; pagination: { page: number; limit: number; totalSlots: number; totalPages: number; hasMore: boolean } }> {
    const params = new URLSearchParams();
    if (options.clubId) params.append('clubId', options.clubId);
    if (options.date) params.append('date', options.date);
    if (options.instructorId) params.append('instructorId', options.instructorId);
    if (options.userLevel) params.append('userLevel', options.userLevel);
    if (options.userGender) params.append('userGender', options.userGender);
    if (options.timeSlotFilter) params.append('timeSlotFilter', options.timeSlotFilter); // 🕐 Pasar filtro de horario
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    
    // Agregar timestamp para romper caché del navegador
    params.append('_t', Date.now().toString());
    
    const response = await fetch(`${this.baseUrl}/timeslots?${params}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch time slots');
    }
    return response.json();
  }

  static async getBookings(options: {
    userId?: string;
    timeSlotId?: string;
  } = {}): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (options.userId) params.append('userId', options.userId);
    if (options.timeSlotId) params.append('timeSlotId', options.timeSlotId);
    
    const response = await fetch(`${this.baseUrl}/bookings?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }
    return response.json();
  }

  static async createBooking(data: {
    userId: string;
    timeSlotId: string;
    groupSize?: number;
  }): Promise<{ success: boolean; bookingId: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }

    return response.json();
  }

  // Utilidades para formatear datos
  static formatTimeSlotForDisplay(timeSlot: TimeSlot) {
    const startTime = new Date(timeSlot.start);
    const endTime = new Date(timeSlot.end);
    
    return {
      ...timeSlot,
      timeRange: `${startTime.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })} - ${endTime.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`,
      date: startTime.toLocaleDateString('es-ES'),
      availableSpots: timeSlot.maxPlayers - timeSlot.bookedPlayers,
      isFull: timeSlot.bookedPlayers >= timeSlot.maxPlayers,
      price: timeSlot.totalPrice ? `€${timeSlot.totalPrice}` : 'Precio no definido'
    };
  }
}

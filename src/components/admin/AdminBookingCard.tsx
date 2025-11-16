import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Star, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminBookingCardProps {
  booking: {
    id: string;
    userId: string;
    groupSize: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    user: {
      name: string;
      email: string;
      profilePictureUrl?: string;
    };
    timeSlot: {
      id: string;
      start: string;
      end: string;
      level: string;
      category: string;
      totalPrice: number;
      maxPlayers: number;
      totalPlayers: number;
      instructor: {
        name: string;
        profilePictureUrl?: string;
      };
      court: {
        number: number;
      };
    };
  };
}

const AdminBookingCard: React.FC<AdminBookingCardProps> = ({ booking }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [allClassBookings, setAllClassBookings] = useState<any[]>([]);
  const classData = booking.timeSlot;
  const instructorName = classData.instructor?.name || 'Instructor Genérico';
  const instructorPhoto = classData.instructor?.profilePictureUrl || `https://avatar.vercel.sh/${instructorName}.png?size=40`;

  // Load all bookings for this class (same as ClassCardReal)
  const loadClassBookings = async () => {
    try {
      const response = await fetch(`/api/classes/${classData.id}/bookings`);
      if (response.ok) {
        const bookingsData = await response.json();
        setAllClassBookings(bookingsData);
      }
    } catch (error) {
      console.error('Error loading class bookings:', error);
      setAllClassBookings([]);
    }
  };

  // Load bookings when component mounts
  useEffect(() => {
    loadClassBookings();
  }, [classData.id]);

  // Cancel booking function
  const handleCancelBooking = async () => {
    console.log('🚀 Attempting to cancel booking:', booking.id, 'Full booking:', booking);
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return;
    
    setIsDeleting(true);
    try {
      const url = `/api/admin/bookings/${booking.id}`;
      console.log('📞 Making DELETE request to:', url);
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Reserva cancelada exitosamente');
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        alert(`Error al cancelar la reserva: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      alert('Error de conexión al cancelar la reserva');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper functions (identical to ClassCardReal)
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const formatTime = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return '00:00';
      }
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      return '00:00';
    }
  };

  // Dynamic category and level assignment (identical logic to ClassCardReal)
  const getDynamicCategory = () => {
    const categories = ['Chicas', 'Chicos', 'Mixta'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    return {
      category: randomCategory,
      isAssigned: true
    };
  };

  const getDynamicLevel = () => {
    const levels = ['1.0 - 2.5', '2.0 - 3.5', '3.0 - 4.5', '4.0 - 5.5'];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    return {
      level: randomLevel,
      isAssigned: true
    };
  };

  // Court assignment logic - IDENTICAL to ClassCardReal
  const getCourtAssignment = () => {
    if (!Array.isArray(allClassBookings)) {
      return { isAssigned: false, courtNumber: null };
    }

    // Verificar cada modalidad (1, 2, 3, 4 jugadores) - same logic as ClassCardReal
    for (const modalitySize of [1, 2, 3, 4]) {
      const modalityBookings = allClassBookings.filter(
        b => b.groupSize === modalitySize && b.status !== 'CANCELLED'
      );
      
      // Si esta modalidad está completa
      if (modalityBookings.length >= modalitySize) {
        // Si hay confirmados, la pista ya está asignada
        const confirmedBookings = modalityBookings.filter(b => b.status === 'CONFIRMED');
        if (confirmedBookings.length > 0) {
          return { 
            isAssigned: true, 
            courtNumber: classData.court?.number || 1 
          };
        }
      }
    }

    return { isAssigned: false, courtNumber: null };
  };

  const categoryInfo = getDynamicCategory();
  const levelInfo = getDynamicLevel();
  const courtAssignment = getCourtAssignment();

  return (
    <Card className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden max-w-sm mx-auto">
      {/* Header with Instructor Info - COMPACT */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Instructor Avatar */}
            <Avatar className="w-10 h-10 ring-2 ring-purple-400 ring-offset-2">
              <AvatarImage 
                src={instructorPhoto}
                alt={instructorName}
              />
              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-bold">
                {getInitials(instructorName)}
              </AvatarFallback>
            </Avatar>
            
            {/* Instructor Name and Rating */}
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {instructorName}
                </h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  👨‍🏫 Instructor
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Stars */}
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-1">(4.5)</span>
              </div>
            </div>
          </div>
          
          {/* Class Status Badge (based on completion, not individual booking status) */}
          <div className="text-right">
            <Badge 
              variant={
                courtAssignment.isAssigned 
                  ? 'default' 
                  : 'secondary'
              }
              className={
                courtAssignment.isAssigned 
                  ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
              }
            >
              {courtAssignment.isAssigned ? 'CONFIRMADO' : 'PENDIENTE'}
            </Badge>
          </div>
        </div>
        
        {/* Class Info - COMPACT */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 border-b border-gray-100 pb-2">
          <div>
            <div className="font-medium text-gray-900 text-xs">Nivel</div>
            <Badge 
              variant="secondary"
              className={`capitalize text-xs py-0 px-1 ${
                levelInfo.isAssigned 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' 
                  : 'text-gray-600'
              }`}
            >
              {levelInfo.level}
            </Badge>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-xs">Cat.</div>
            <Badge 
              variant="secondary"
              className={`capitalize text-xs py-0 px-1 ${
                categoryInfo.isAssigned 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' 
                  : 'text-gray-600'
              }`}
            >
              {categoryInfo.category}
            </Badge>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-xs">Pista</div>
            <Badge 
              variant="secondary"
              className={`text-xs py-0 px-1 ${
                courtAssignment.isAssigned 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {courtAssignment.isAssigned 
                ? `Pista ${courtAssignment.courtNumber}` 
                : 'Pista'
              }
            </Badge>
          </div>
        </div>
      </div>

      {/* Time and Duration - COMPACT */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {format(new Date(classData.start), 'EEE', { locale: es })}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {format(new Date(classData.start), 'dd', { locale: es })}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {format(new Date(classData.start), 'MMM', { locale: es })}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">
              {formatTime(classData.start)}
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              60 min
            </div>
            <div className="text-xs text-gray-600">
              Padel Estrella
            </div>
          </div>
          
          <button className="text-gray-400 hover:text-gray-600" title="Compartir reserva">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pricing Options - COMPACT */}
      <div className="px-3 py-2 space-y-2">
        {[1, 2, 3, 4].map((players) => {
          const pricePerPerson = (classData.totalPrice || 55) / players;
          const isUserBooking = players === booking.groupSize; // Highlight the actual booking based on groupSize
          
          // Filter bookings for this specific modality (same logic as ClassCardReal)
          const modalityBookings = Array.isArray(allClassBookings) 
            ? allClassBookings.filter(b => b.status !== 'CANCELLED' && b.groupSize === players) 
            : [];
          
          // Take only the needed bookings for this modality
          const bookedUsers = modalityBookings.slice(0, players);
          
          return (
            <div 
              key={players} 
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                isUserBooking ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              }`}
            >
              {/* Player Circles - Show REAL bookings like ClassCardReal */}
              <div className="flex items-center gap-1">
                {Array.from({ length: players }).map((_, index) => {
                  const bookingAtIndex = bookedUsers[index];
                  const isOccupied = !!bookingAtIndex;
                  const isCurrentUser = bookingAtIndex?.userId === booking.userId;
                  
                  return (
                    <div
                      key={index}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${
                        isOccupied 
                          ? 'border-green-500 bg-white' 
                          : 'border-dashed border-green-400 bg-white text-green-400'
                      } ${isCurrentUser ? 'ring-1 ring-blue-400 ring-offset-1' : ''}`}
                      title={isOccupied ? bookingAtIndex.name : 'Disponible'}
                    >
                      {isOccupied ? (
                        bookingAtIndex.profilePictureUrl ? (
                          <div className="w-full h-full rounded-full overflow-hidden">
                            <img 
                              src={bookingAtIndex.profilePictureUrl} 
                              alt={bookingAtIndex.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback a iniciales si la imagen falla
                                const target = e.currentTarget;
                                const parent = target.parentElement?.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center"><span class="text-white text-xs font-bold">${getInitials(bookingAtIndex.name || bookingAtIndex.userId)}</span></div>`;
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {getInitials(bookingAtIndex.name || bookingAtIndex.userId)}
                            </span>
                          </div>
                        )
                      ) : (
                        '+'
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Price - COMPACT */}
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">
                  € {pricePerPerson.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Court Assignment Status */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <div className="text-center">
          {courtAssignment.isAssigned ? (
            <>
              <div className="text-xs text-gray-600 mb-1">Pista asignada:</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-gray-900 text-sm">Pista {courtAssignment.courtNumber}</span>
                <svg 
                  className="ml-1" 
                  width="20" 
                  height="12" 
                  viewBox="0 0 60 40" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="2" y="2" width="56" height="36" rx="4" fill="#86BC24" stroke="#6B9B1E" strokeWidth="2"/>
                  <line x1="30" y1="2" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <line x1="4" y1="20" x2="56" y2="20" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                </svg>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-gray-600 mb-1">Esperando jugadores:</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-gray-900 text-sm">Pista sin asignar</span>
                {[1, 2, 3, 4].map((court) => (
                  <svg 
                    key={court}
                    className="ml-1" 
                    width="20" 
                    height="12" 
                    viewBox="0 0 60 40" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="2" y="2" width="56" height="36" rx="4" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="2"/>
                    <line x1="30" y1="2" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                    <line x1="4" y1="20" x2="56" y2="20" stroke="#FFFFFF" strokeWidth="1" opacity="0.3"/>
                  </svg>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Button */}
      <div className="px-3 py-2 border-t border-gray-100">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleCancelBooking}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-1 h-8 text-xs"
        >
          <X className="h-3 w-3" />
          {isDeleting ? 'Cancelando...' : 'Cancelar'}
        </Button>
      </div>
    </Card>
  );
};

export default AdminBookingCard;
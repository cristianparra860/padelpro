// src/components/class/ClassCardPremium.tsx
"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, Star, Plus } from 'lucide-react';

import type { TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

interface ClassCardPremiumProps {
    classData: ApiTimeSlot & { 
        availableSpots: number; 
        price: number; 
    };
    currentUser: User | null;
    onBookingSuccess: () => void;
    allowedPlayerCounts?: number[];
}

const ClassCardPremium: React.FC<ClassCardPremiumProps> = ({ 
    classData, 
    currentUser, 
    onBookingSuccess,
    allowedPlayerCounts = [1, 2, 3, 4]
}) => {
    const { toast } = useToast();
    const [isBooking, setIsBooking] = useState(false);
    const [selectedGroupSize, setSelectedGroupSize] = useState<number | null>(null);

    // Formatear fecha y hora
    let dayNum = '14';
    let monthName = 'SEP';
    let dayName = 'DOMINGO';
    let startTime = '08:00H';
    let duration = '90 min';
    
    try {
        if (classData.start) {
            const startDate = new Date(classData.start);
            const endDate = new Date(classData.end);
            
            dayNum = format(startDate, 'd');
            monthName = format(startDate, 'MMM', { locale: es }).toUpperCase();
            dayName = format(startDate, 'EEEE', { locale: es }).toUpperCase();
            startTime = format(startDate, 'HH:mm') + 'H';
            
            // Calcular duración
            const durationMs = endDate.getTime() - startDate.getTime();
            const durationMin = Math.round(durationMs / (1000 * 60));
            duration = `${durationMin} min`;
        }
    } catch (error) {
        console.error('Error al formatear fechas:', error);
    }

    // Calcular precios por grupo
    const totalPrice = classData.totalPrice || 55;
    const priceFor1 = totalPrice;
    const priceFor2 = totalPrice / 2;
    const priceFor3 = totalPrice / 3;
    const priceFor4 = totalPrice / 4;

    // Simular rating del instructor
    const instructorRating = 4.5;
    const fullStars = Math.floor(instructorRating);
    const hasHalfStar = instructorRating % 1 !== 0;

    // Determinar nivel basado en el nivel de la clase
    const getLevelRange = (level: string | undefined) => {
        const levelMap: Record<string, string> = {
            'principiante': '1.0-2.5',
            'intermedio': '3.0-4.5',
            'avanzado': '4.0-5.5',
            'competicion': '5.0-6.0'
        };
        return levelMap[level?.toLowerCase() || ''] || '4.0-5.5';
    };

    // Determinar categoría
    const getCategoryLabel = (category: string | undefined) => {
        const categoryMap: Record<string, string> = {
            'masculina': 'Chicos',
            'femenina': 'Chicas', 
            'abierta': 'Mixto',
            'infantil': 'Niños'
        };
        return categoryMap[category?.toLowerCase() || ''] || 'Mixto';
    };

    const handleBooking = async (spotNumber: number) => {
        const userId = 'user-alex-test';
        
        if (!userId) {
            toast({
                title: "Error",
                description: "No se pudo identificar el usuario",
                variant: "destructive",
            });
            return;
        }

        setIsBooking(true);
        setSelectedGroupSize(spotNumber);
        
        try {
            const response = await fetch('/api/classes/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timeSlotId: classData.id,
                    userId: userId,
                    groupSize: 1 // Siempre 1 porque es inscripción individual
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al inscribirse en la clase');
            }

            const result = await response.json();
            
            toast({
                title: "¡Inscripción exitosa!",
                description: `Te has inscrito en la clase. ${4 - classData.bookedPlayers - 1} lugares restantes.`,
            });

            if (onBookingSuccess) {
                onBookingSuccess();
            }
        } catch (error) {
            toast({
                title: "Error al inscribirse",
                description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
                variant: "destructive",
            });
        } finally {
            setIsBooking(false);
            setSelectedGroupSize(null);
        }
    };

    return (
        <Card className="w-full max-w-sm mx-auto overflow-hidden bg-white shadow-lg border-0 rounded-2xl">
            {/* Header del instructor */}
            <div className="p-4 pb-3">
                <div className="flex items-center space-x-3 mb-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={classData.instructorProfilePicture} alt={classData.instructorName} />
                        <AvatarFallback>
                            {classData.instructorName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'IN'}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                            {classData.instructorName || 'Instructor'}
                        </h3>
                        <div className="flex items-center space-x-1">
                            {/* Estrellas */}
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        "h-4 w-4",
                                        star <= fullStars 
                                            ? "text-amber-400 fill-amber-400"
                                            : star === fullStars + 1 && hasHalfStar
                                            ? "text-amber-400 fill-amber-400/50"
                                            : "text-gray-300"
                                    )}
                                />
                            ))}
                            <span className="text-sm text-gray-600 ml-1">
                                ({instructorRating})
                            </span>
                        </div>
                    </div>
                    
                    <Button variant="ghost" size="sm" className="text-gray-400">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Badges de nivel, categoría y pista */}
                <div className="flex items-center space-x-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">
                        {getLevelRange(classData.level)}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-medium">
                        {getCategoryLabel(classData.category)}
                    </Badge>
                    <span className="text-sm text-gray-500 font-medium">Pista</span>
                </div>
            </div>

            {/* Fecha y hora */}
            <div className="px-4 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-gray-900">{dayNum}</span>
                        <div className="text-sm text-gray-600 ml-1">
                            <div className="font-semibold">{monthName}</div>
                        </div>
                        <div className="text-sm text-gray-600 ml-3">
                            <div className="font-semibold">{dayName} {startTime}</div>
                            <div className="flex items-center text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {duration}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Sistema de inscripciones individuales */}
            <div className="px-4 pb-4 space-y-2">
                <p className="text-sm text-gray-600 font-medium mb-3">Inscripciones:</p>
                
                {/* Espacios individuales filtrados según opciones permitidas */}
                <div className="space-y-2">
                    {[1, 2, 3, 4].filter(spotNumber => allowedPlayerCounts.includes(spotNumber)).map((spotNumber) => {
                        const isOccupied = spotNumber <= classData.bookedPlayers;
                        const isCurrentUserSpot = isOccupied; // Simplificado por ahora
                        const pricePerPerson = totalPrice / 4; // Precio dividido entre 4 siempre
                        
                        return (
                            <div key={spotNumber} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-500 w-8">#{spotNumber}</span>
                                    
                                    {isOccupied ? (
                                        <div className="flex items-center space-x-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src="/placeholder-user.jpg" />
                                                <AvatarFallback className="bg-green-500 text-white text-xs">
                                                    {isCurrentUserSpot ? 'TU' : 'AL'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-700">
                                                {isCurrentUserSpot ? 'Tu inscripción' : 'Alex García'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                <Plus className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <span className="text-sm text-gray-500">Lugar disponible</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg font-bold text-green-600">€{pricePerPerson.toFixed(2)}</span>
                                    
                                    {!isOccupied && (
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleBooking(spotNumber)}
                                            disabled={isBooking}
                                            className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs"
                                        >
                                            {isBooking && selectedGroupSize === spotNumber ? (
                                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                'Inscribirse'
                                            )}
                                        </Button>
                                    )}
                                    
                                    {isOccupied && isCurrentUserSpot && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                            Inscrito
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Estado de la clase */}
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                            Estado de la clase:
                        </span>
                        <span className="text-sm font-bold text-blue-900">
                            {classData.bookedPlayers >= 4 ? (
                                '✅ Completa - Pista reservada'
                            ) : classData.bookedPlayers >= 2 ? (
                                '⏳ En formación - Faltan ' + (4 - classData.bookedPlayers) + ' alumnos'
                            ) : (
                                '🕐 Esperando inscripciones - Faltan ' + (4 - classData.bookedPlayers) + ' alumnos'
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pistas disponibles */}
            <div className="px-4 pb-4">
                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Pistas disponibles:</p>
                    <div className="flex items-center justify-center space-x-1 mb-3">
                        <span className="font-bold text-gray-900">4/4</span>
                        <div className="flex space-x-1 ml-2">
                            {[1, 2, 3, 4].map((court) => (
                                <div key={court} className="w-6 h-4 bg-green-400 rounded-sm"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Botón valorar */}
            <div className="px-4 pb-4">
                <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-800">
                    <Star className="h-4 w-4 mr-2" />
                    Valorar Clase
                </Button>
            </div>
        </Card>
    );
};

export default ClassCardPremium;
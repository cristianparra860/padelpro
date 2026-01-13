"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Save, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Club } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ClubOpeningHoursProps {
    club: Club;
    onHoursUpdated: (updatedClub: Club) => void;
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type WeeklyHours = Record<DayOfWeek, boolean[]>;

const ClubOpeningHours: React.FC<ClubOpeningHoursProps> = ({ club, onHoursUpdated }) => {
    console.log('🕐 ClubOpeningHours renderizando para club:', club.name);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');

    // Estado para las horas de apertura por día de la semana
    // Cada día tiene 19 booleanos (6:00 AM a 12:00 AM)
    const [openingHours, setOpeningHours] = useState<WeeklyHours>(() => {
        console.log('🏗️ Inicializando estado openingHours...');
        console.log('📦 Club prop:', club);
        console.log('📦 club.openingHours type:', typeof club.openingHours);
        console.log('📦 club.openingHours value:', club.openingHours);

        const defaultHours = Array.from({ length: 19 }, (_, i) => i >= 2 && i <= 17);

        // Si el club tiene horarios guardados, verificar formato
        if (club.openingHours) {
            // Nuevo formato: objeto con días de la semana
            if (typeof club.openingHours === 'object' && !Array.isArray(club.openingHours)) {
                console.log('✅ Formato objeto detectado');
                return club.openingHours as WeeklyHours;
            }
            // Formato legacy: array de booleanos (aplicar a todos los días)
            if (Array.isArray(club.openingHours)) {
                console.log('⚠️ Formato legacy (array) detectado');
                return {
                    monday: club.openingHours,
                    tuesday: club.openingHours,
                    wednesday: club.openingHours,
                    thursday: club.openingHours,
                    friday: club.openingHours,
                    saturday: club.openingHours,
                    sunday: club.openingHours
                };
            }
            // Intento de parseo si es string (por si acaso el padre no lo parseó)
            if (typeof club.openingHours === 'string') {
                try {
                    const parsed = JSON.parse(club.openingHours);
                    console.log('🔄 Parseado desde string:', parsed);
                    if (!Array.isArray(parsed)) return parsed;
                } catch (e) {
                    console.error('❌ Error parseando string openingHours:', e);
                }
            }
        }

        console.log('ℹ️ Usando horarios por defecto');
        // Por defecto: 8:00 AM a 11:00 PM todos los días
        return {
            monday: defaultHours,
            tuesday: defaultHours,
            wednesday: defaultHours,
            thursday: defaultHours,
            friday: defaultHours,
            saturday: defaultHours,
            sunday: defaultHours
        };
    });

    // Generar las horas desde 6:00 AM hasta 12:00 AM (medianoche)
    const hours = Array.from({ length: 19 }, (_, i) => {
        const hour = i + 6; // Empieza en 6
        const displayHour = hour > 12 ? hour - 12 : hour;
        const period = hour < 12 ? 'AM' : 'PM';
        const hourFormatted = hour === 24 ? 12 : (hour > 12 ? hour - 12 : hour);
        return {
            value: hour,
            label: `${hourFormatted}:00 ${period}`,
            displayLabel: hour < 12 ? `${hour}:00` : hour === 12 ? '12:00' : `${hour}:00`
        };
    });

    const days: { key: DayOfWeek; label: string; short: string }[] = [
        { key: 'monday', label: 'Lunes', short: 'L' },
        { key: 'tuesday', label: 'Martes', short: 'M' },
        { key: 'wednesday', label: 'Miércoles', short: 'X' },
        { key: 'thursday', label: 'Jueves', short: 'J' },
        { key: 'friday', label: 'Viernes', short: 'V' },
        { key: 'saturday', label: 'Sábado', short: 'S' },
        { key: 'sunday', label: 'Domingo', short: 'D' }
    ];

    const toggleHour = (day: DayOfWeek, index: number) => {
        setOpeningHours(prev => ({
            ...prev,
            [day]: prev[day].map((h, i) => i === index ? !h : h)
        }));
    };

    const toggleAll = (day: DayOfWeek, active: boolean) => {
        setOpeningHours(prev => ({
            ...prev,
            [day]: Array(19).fill(active)
        }));
    };

    const copyToAllDays = (sourceDay: DayOfWeek) => {
        const sourceDayHours = openingHours[sourceDay];
        setOpeningHours({
            monday: [...sourceDayHours],
            tuesday: [...sourceDayHours],
            wednesday: [...sourceDayHours],
            thursday: [...sourceDayHours],
            friday: [...sourceDayHours],
            saturday: [...sourceDayHours],
            sunday: [...sourceDayHours]
        });
        toast({
            title: "✅ Horarios copiados",
            description: `Los horarios del ${days.find(d => d.key === sourceDay)?.label} se aplicaron a todos los días.`,
            className: "bg-blue-600 text-white"
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/clubs/${club.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openingHours })
            });

            if (!response.ok) {
                throw new Error('Error al guardar horarios');
            }

            const updatedClub = await response.json();

            toast({
                title: "✅ Horarios actualizados",
                description: "Los horarios de apertura se han guardado correctamente.",
                className: "bg-green-600 text-white"
            });

            onHoursUpdated(updatedClub);

            // Disparar evento para recargar calendario
            window.dispatchEvent(new CustomEvent('club-hours-updated', {
                detail: { clubId: club.id, openingHours: updatedClub.openingHours }
            }));

            // Disparar evento personalizado para notificar al calendario
            window.dispatchEvent(new CustomEvent('club-hours-updated', {
                detail: { clubId: club.id, openingHours: updatedClub.openingHours }
            }));
        } catch (error) {
            console.error('Error guardando horarios:', error);
            toast({
                title: "Error al guardar",
                description: "No se pudieron actualizar los horarios de apertura.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Verificar si hay cambios
    const hasChanges = JSON.stringify(openingHours) !== JSON.stringify(club.openingHours || {});

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center text-lg">
                    <Clock className="mr-2 h-5 w-5 text-blue-600" />
                    Horario de Apertura del Club
                </CardTitle>
                <CardDescription>
                    Define las horas en las que el club está abierto para cada día de la semana.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayOfWeek)}>
                    <TabsList className="grid w-full grid-cols-7">
                        {days.map(day => (
                            <TabsTrigger key={day.key} value={day.key} className="text-xs">
                                <span className="hidden sm:inline">{day.short}</span>
                                <span className="sm:hidden">{day.short}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {days.map(day => (
                        <TabsContent key={day.key} value={day.key} className="space-y-4">
                            {/* Calendario Horizontal de Horas */}
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border-2 border-blue-100">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <span className="text-sm font-semibold text-gray-700">
                                        {day.label}
                                    </span>
                                    <div className="flex gap-2 flex-wrap">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToAllDays(day.key)}
                                            className="h-7 text-xs"
                                        >
                                            <Copy className="mr-1 h-3 w-3" />
                                            Copiar a todos
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleAll(day.key, true)}
                                            className="h-7 text-xs"
                                        >
                                            Todo Abierto
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleAll(day.key, false)}
                                            className="h-7 text-xs"
                                        >
                                            Todo Cerrado
                                        </Button>
                                    </div>
                                </div>

                                {/* Grid de horas */}
                                <div className="flex gap-1 overflow-x-auto pb-2">
                                    {hours.map((hour, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => toggleHour(day.key, index)}
                                            className={cn(
                                                "relative flex flex-col items-center justify-center px-2 py-2 rounded border-2 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0",
                                                openingHours[day.key][index]
                                                    ? "bg-blue-500 border-blue-600 text-white shadow-md hover:bg-blue-600"
                                                    : "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200"
                                            )}
                                            title={`${hour.label} - ${openingHours[day.key][index] ? 'Abierto' : 'Cerrado'}`}
                                        >
                                            {/* Hora */}
                                            <span className={cn(
                                                "text-[11px] font-bold",
                                                openingHours[day.key][index] ? "text-white" : "text-gray-500"
                                            )}>
                                                {hour.value}:00
                                            </span>

                                            {/* Indicador de estado */}
                                            <div className={cn(
                                                "mt-0.5 h-1 w-1 rounded-full",
                                                openingHours[day.key][index] ? "bg-white" : "bg-gray-400"
                                            )} />
                                        </button>
                                    ))}
                                </div>

                                {/* Leyenda */}
                                <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600" />
                                        <span className="text-xs text-gray-600 font-medium">Abierto</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200" />
                                        <span className="text-xs text-gray-600 font-medium">Cerrado</span>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen de horarios del día */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>{day.label}:</strong>{' '}
                                    {openingHours[day.key].some(h => h) ? (
                                        <>
                                            {(() => {
                                                const openHours = openingHours[day.key]
                                                    .map((isOpen, i) => isOpen ? i + 6 : null)
                                                    .filter(h => h !== null) as number[];

                                                if (openHours.length === 0) return 'Cerrado';

                                                const firstOpen = Math.min(...openHours);
                                                const lastOpen = Math.max(...openHours);

                                                return `${firstOpen}:00 - ${lastOpen + 1}:00 (${openHours.length}h)`;
                                            })()}
                                        </>
                                    ) : (
                                        'Cerrado'
                                    )}
                                </p>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>

                {/* Botón de guardar */}
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="w-full sm:w-auto"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Horarios'}
                </Button>

                {!hasChanges && (
                    <p className="text-xs text-muted-foreground">
                        No hay cambios pendientes
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default ClubOpeningHours;

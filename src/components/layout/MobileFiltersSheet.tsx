

"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Heart, SlidersHorizontal, Eye, ClipboardList, CheckCircle, Sparkles, Star, Clock, BarChartHorizontal, X, Users, UserCheck } from 'lucide-react';
import { timeSlotFilterOptions } from '@/types';
import type { TimeOfDayFilterType, MatchPadelLevel, ClubLevelRange, ViewPreference } from '@/types';
import { cn } from '@/lib/utils';
import { getMockClubs } from '@/lib/mockData';
import { InstructorFilter } from '@/components/class/InstructorFilter';

interface MobileFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlotFilter: TimeOfDayFilterType;
  viewPreference: ViewPreference;
  filterByFavorites: boolean;
  showPointsBonus: boolean;
  selectedPlayerCounts: Set<number>;
  selectedInstructorIds: string[];
  onTimeFilterChange: (value: TimeOfDayFilterType) => void;
  onViewPreferenceChange: (value: ViewPreference) => void;
  onFavoritesClick: () => void;
  onTogglePointsBonus: () => void;
  onTogglePlayerCount: (count: number) => void;
  onClearFilters: () => void;
  onInstructorChange: (instructorIds: string[]) => void;
}

const FilterButton: React.FC<{
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    className?: string;
}> = ({ label, icon: Icon, isActive, onClick, className }) => (
    <Button
        variant={isActive ? "secondary" : "outline"}
        onClick={onClick}
        className={cn("h-auto py-3 justify-center font-semibold text-sm w-full flex flex-col items-center gap-1", isActive && 'border-primary text-primary', className)}
    >
        <Icon className="h-5 w-5 mb-1" />
        {label}
    </Button>
);

export function MobileFiltersSheet({
    isOpen,
    onOpenChange,
    timeSlotFilter,
    viewPreference,
    filterByFavorites,
    showPointsBonus,
    selectedPlayerCounts,
    selectedInstructorIds,
    onTimeFilterChange,
    onViewPreferenceChange,
    onFavoritesClick,
    onTogglePointsBonus,
    onTogglePlayerCount,
    onClearFilters,
    onInstructorChange,
}: MobileFiltersSheetProps) {

    const club = getMockClubs()[0]; // Assuming single club for now
    const levelRanges: (ClubLevelRange | {name: string, min: string, max: string})[] = [{name: 'Todos', min: 'all', max: 'all'}, ...(club?.levelRanges || [])];


    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-lg h-auto flex flex-col p-0">
                <SheetHeader className="text-left p-4 border-b">
                    <SheetTitle className="flex items-center"><SlidersHorizontal className="mr-2 h-5 w-5" /> Filtros y Opciones</SheetTitle>
                    <SheetDescription>Aplica filtros para encontrar la actividad perfecta para ti.</SheetDescription>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    
                    <div>
                        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Franja Horaria</h4>
                        <div className="grid grid-cols-4 gap-2">
                            <Button 
                                variant={timeSlotFilter === 'all' ? "default" : "outline"} 
                                onClick={() => onTimeFilterChange('all')} 
                                className={cn(
                                    "h-auto py-2 font-semibold transition-all",
                                    timeSlotFilter === 'all' 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                        : 'hover:bg-gray-100'
                                )}
                            >
                                Todos
                            </Button>
                            <Button 
                                variant={timeSlotFilter === 'morning' ? "default" : "outline"} 
                                onClick={() => onTimeFilterChange('morning')} 
                                className={cn(
                                    "h-auto py-2 font-semibold transition-all",
                                    timeSlotFilter === 'morning' 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                        : 'hover:bg-gray-100'
                                )}
                            >
                                Mañanas
                            </Button>
                            <Button 
                                variant={timeSlotFilter === 'midday' ? "default" : "outline"} 
                                onClick={() => onTimeFilterChange('midday')} 
                                className={cn(
                                    "h-auto py-2 font-semibold transition-all",
                                    timeSlotFilter === 'midday' 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                        : 'hover:bg-gray-100'
                                )}
                            >
                                Mediodía
                            </Button>
                            <Button 
                                variant={timeSlotFilter === 'evening' ? "default" : "outline"} 
                                onClick={() => onTimeFilterChange('evening')} 
                                className={cn(
                                    "h-auto py-2 font-semibold transition-all",
                                    timeSlotFilter === 'evening' 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                        : 'hover:bg-gray-100'
                                )}
                            >
                                Tardes
                            </Button>
                        </div>
                    </div>

                    {/* 🚫 FILTRO DE JUGADORES DESHABILITADO - Ahora se usa el filtro flotante */}
                    {/* <div>
                        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Número de Jugadores</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((count) => {
                                const isActive = selectedPlayerCounts.has(count);
                                return (
                                    <Button
                                        key={count}
                                        variant={isActive ? "default" : "outline"}
                                        onClick={() => onTogglePlayerCount(count)}
                                        className={cn(
                                            "h-auto py-3 flex flex-col items-center gap-1 font-semibold transition-all",
                                            isActive 
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                                : 'hover:bg-gray-100'
                                        )}
                                    >
                                        <span className="text-xl">
                                            {count === 1 ? '👤' : count === 2 ? '👥' : count === 3 ? '👨‍👨‍👦' : '👨‍👩‍👧‍👦'}
                                        </span>
                                        <span className="text-sm font-bold">{count}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div> */}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Vista</h4>
                            <div className="space-y-1">
                                <Button 
                                    variant={viewPreference === 'withBookings' ? "default" : "outline"} 
                                    onClick={() => onViewPreferenceChange('withBookings')} 
                                    className={cn(
                                        "h-auto w-full py-2 justify-start font-semibold transition-all",
                                        viewPreference === 'withBookings' 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                            : 'hover:bg-gray-100'
                                    )}
                                >
                                    <Users className="mr-2 h-4 w-4" /> Con Usuarios
                                </Button>
                                <Button 
                                    variant={viewPreference === 'all' ? "default" : "outline"} 
                                    onClick={() => onViewPreferenceChange('all')} 
                                    className={cn(
                                        "h-auto w-full py-2 justify-start font-semibold transition-all",
                                        viewPreference === 'all' 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                            : 'hover:bg-gray-100'
                                    )}
                                >
                                    <ClipboardList className="mr-2 h-4 w-4" /> Todas
                                </Button>
                            </div>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Preferencias</h4>
                             <div className="space-y-1">
                                <div className="w-full">
                                    <InstructorFilter
                                        selectedInstructorIds={selectedInstructorIds}
                                        onInstructorChange={onInstructorChange}
                                    />
                                </div>
                                <Button 
                                    variant={showPointsBonus ? 'default' : 'outline'} 
                                    className={cn(
                                        "w-full h-auto py-2 justify-start font-semibold transition-all",
                                        showPointsBonus 
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-md' 
                                            : 'hover:bg-gray-100'
                                    )} 
                                    onClick={onTogglePointsBonus}
                                >
                                    <Sparkles className="mr-2 h-4 w-4"/>
                                    + Puntos
                                </Button>
                             </div>
                        </div>
                    </div>
                </div>
                 <SheetFooter className="p-4 border-t bg-background flex flex-row gap-2">
                    <Button variant="ghost" onClick={onClearFilters} className="flex-1">
                        <X className="mr-2 h-4 w-4" />
                        Limpiar Filtros
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="flex-1">
                        Ver Resultados
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
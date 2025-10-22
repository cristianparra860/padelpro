

"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Heart, SlidersHorizontal, Eye, ClipboardList, CheckCircle, Sparkles, Star, Clock, BarChartHorizontal, X, Users } from 'lucide-react';
import { timeSlotFilterOptions } from '@/types';
import type { TimeOfDayFilterType, MatchPadelLevel, ClubLevelRange, ViewPreference } from '@/types';
import { cn } from '@/lib/utils';
import { getMockClubs } from '@/lib/mockData';

interface MobileFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlotFilter: TimeOfDayFilterType;
  viewPreference: ViewPreference;
  filterByFavorites: boolean;
  showPointsBonus: boolean;
  selectedPlayerCounts: Set<number>;
  onTimeFilterChange: (value: TimeOfDayFilterType) => void;
  onViewPreferenceChange: (value: ViewPreference) => void;
  onFavoritesClick: () => void;
  onTogglePointsBonus: () => void;
  onTogglePlayerCount: (count: number) => void;
  onClearFilters: () => void;
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
    onTimeFilterChange,
    onViewPreferenceChange,
    onFavoritesClick,
    onTogglePointsBonus,
    onTogglePlayerCount,
    onClearFilters,
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
                            <Button variant={timeSlotFilter === 'all' ? "secondary" : "outline"} onClick={() => onTimeFilterChange('all')} className={cn("h-auto py-2 shadow-inner", timeSlotFilter === 'all' && 'border-primary bg-sidebar')}>Todos</Button>
                            <Button variant={timeSlotFilter === 'morning' ? "secondary" : "outline"} onClick={() => onTimeFilterChange('morning')} className={cn("h-auto py-2 shadow-inner", timeSlotFilter === 'morning' && 'border-primary bg-sidebar')}>Mañanas</Button>
                            <Button variant={timeSlotFilter === 'midday' ? "secondary" : "outline"} onClick={() => onTimeFilterChange('midday')} className={cn("h-auto py-2 shadow-inner", timeSlotFilter === 'midday' && 'border-primary bg-sidebar')}>Mediodía</Button>
                            <Button variant={timeSlotFilter === 'evening' ? "secondary" : "outline"} onClick={() => onTimeFilterChange('evening')} className={cn("h-auto py-2 shadow-inner", timeSlotFilter === 'evening' && 'border-primary bg-sidebar')}>Tardes</Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Número de Jugadores</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((count) => {
                                const isActive = selectedPlayerCounts.has(count);
                                return (
                                    <Button
                                        key={count}
                                        variant={isActive ? "secondary" : "outline"}
                                        onClick={() => onTogglePlayerCount(count)}
                                        className={cn(
                                            "h-auto py-3 flex flex-col items-center gap-1 shadow-inner",
                                            isActive && 'border-primary bg-sidebar'
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
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Vista</h4>
                            <div className="space-y-1">
                                <Button variant={viewPreference === 'withBookings' ? "secondary" : "outline"} onClick={() => onViewPreferenceChange('withBookings')} className={cn("h-auto w-full py-2 justify-start font-semibold shadow-inner", viewPreference === 'withBookings' && 'border-primary bg-sidebar')}><Users className="mr-2 h-4 w-4" /> Con Usuarios</Button>
                                <Button variant={viewPreference === 'all' ? "secondary" : "outline"} onClick={() => onViewPreferenceChange('all')} className={cn("h-auto w-full py-2 justify-start font-semibold shadow-inner", viewPreference === 'all' && 'border-primary bg-sidebar')}><ClipboardList className="mr-2 h-4 w-4" /> Todas</Button>
                            </div>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Preferencias</h4>
                             <div className="space-y-1">
                                <Button variant={filterByFavorites ? 'secondary' : 'outline'} className={cn("w-full h-auto py-2 justify-start font-semibold shadow-inner", filterByFavorites && 'border-primary bg-sidebar')} onClick={onFavoritesClick}>
                                    <Heart className={cn("mr-2 h-4 w-4", filterByFavorites && "fill-current text-destructive")} />
                                    Favoritos
                                </Button>
                                <Button variant={showPointsBonus ? 'secondary' : 'outline'} className={cn("w-full h-auto py-2 justify-start font-semibold shadow-inner", showPointsBonus && 'border-primary bg-sidebar')} onClick={onTogglePointsBonus}>
                                    <Sparkles className="mr-2 h-4 w-4 text-amber-500"/>
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
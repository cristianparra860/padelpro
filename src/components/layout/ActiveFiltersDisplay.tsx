
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Activity, Users, Clock, BarChartHorizontal, Heart, Eye } from 'lucide-react';
import type { TimeOfDayFilterType, MatchPadelLevel, ViewPreference } from '@/types';
import { timeSlotFilterOptions } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ActiveFiltersDisplayProps {
  activeView: 'clases' | 'partidas';
  timeSlotFilter: TimeOfDayFilterType;
  selectedLevel: MatchPadelLevel | 'all';
  viewPreference: ViewPreference;
  filterByFavorites: boolean;
  onClearFilters: () => void;
}

const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({
  activeView,
  timeSlotFilter,
  selectedLevel,
  viewPreference,
  filterByFavorites,
  onClearFilters,
}) => {
  const timeFilterLabel = timeSlotFilterOptions.find(o => o.value === timeSlotFilter)?.label.replace(' (8-13h)', '').replace(' (13-18h)', '').replace(' (18-22h)', '');

  const getViewPreferenceLabel = (pref: ViewPreference): string => {
    switch (pref) {
      case 'withBookings':
        return 'Con Usuarios';
      case 'all':
        return 'Todas';
      default:
        return '';
    }
  };


  const filters = [
    {
      isActive: true,
      label: activeView === 'clases' ? 'Clases' : 'Partidas',
      icon: activeView === 'clases' ? Activity : Users,
    },
    {
      isActive: timeSlotFilter !== 'all',
      label: timeFilterLabel,
      icon: Clock,
    },
    {
      isActive: selectedLevel !== 'all',
      label: `Nivel ${selectedLevel}`,
      icon: BarChartHorizontal,
    },
    {
      isActive: viewPreference !== 'normal',
      label: getViewPreferenceLabel(viewPreference),
      icon: Eye,
    },
    {
      isActive: filterByFavorites,
      label: 'Favoritos',
      icon: Heart,
    },
  ];

  const activeFilters = filters.filter(f => f.isActive && f.label);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-2 items-center">
            {activeFilters.map((filter, index) => (
                <Badge
                key={index}
                className="text-sm px-3 py-1.5 bg-blue-950 text-white hover:bg-blue-950/80 shadow-md rounded-full font-bold"
                >
                <filter.icon className="mr-1.5 h-4 w-4" />
                {filter.label}
                </Badge>
            ))}
            <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-auto text-xs px-3 py-1.5 rounded-full bg-blue-950 text-white hover:bg-blue-950/80 shadow-md font-bold"
            >
                <X className="mr-1 h-3 w-3" />
                Limpiar
            </Button>
            </div>
            <ScrollBar orientation="horizontal" className="h-2 mt-2" />
      </ScrollArea>
    </div>
  );
};

export default ActiveFiltersDisplay;

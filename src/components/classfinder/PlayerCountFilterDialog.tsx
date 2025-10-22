"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerCountFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCounts: Set<number>;
  onToggleCount: (count: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const PlayerCountFilterDialog: React.FC<PlayerCountFilterDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedCounts,
  onToggleCount,
  onSelectAll,
  onDeselectAll
}) => {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Filtrar por número de jugadores
          </DialogTitle>
          <DialogDescription>
            Elige cuántos jugadores quieres ver en las clases.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((players) => {
              const isActive = selectedCounts.has(players);
              
              return (
                <Button
                  key={players}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => onToggleCount(players)}
                  className={cn(
                    "h-auto flex flex-col items-center gap-1 py-4 px-2 transition-all",
                    isActive && "shadow-lg scale-105"
                  )}
                >
                  <span className="text-3xl mb-1">
                    {players === 1 ? '👤' : players === 2 ? '👥' : players === 3 ? '👨‍👨‍👦' : '👨‍👩‍👧‍👦'}
                  </span>
                  <span className="text-xl font-bold">
                    {players}
                  </span>
                  <span className="text-xs">
                    {players === 1 ? 'jugador' : 'jugadores'}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerCountFilterDialog;

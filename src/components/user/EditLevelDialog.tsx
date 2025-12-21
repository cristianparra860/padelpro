"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChartHorizontal, Check, X } from 'lucide-react';
import type { MatchPadelLevel } from '@/types';
import { matchPadelLevels } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface EditLevelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: MatchPadelLevel | undefined;
  onSave: (newLevel: MatchPadelLevel) => void;
}

const EditLevelDialog: React.FC<EditLevelDialogProps> = ({
  isOpen,
  onOpenChange,
  currentLevel,
  onSave,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<MatchPadelLevel | undefined>(currentLevel);
  const { toast } = useToast();

  const handleSaveClick = () => {
    if (!selectedLevel) {
      toast({
        title: "Selección Requerida",
        description: "Por favor, selecciona un nivel de juego.",
        variant: "destructive",
      });
      return;
    }
    onSave(selectedLevel);
  };
  
  // Update internal state if the prop changes (e.g., after a save and refresh)
  React.useEffect(() => {
    setSelectedLevel(currentLevel);
  }, [currentLevel, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BarChartHorizontal className="mr-2 h-5 w-5 text-primary" />
            Editar Nivel de Juego
          </DialogTitle>
          <DialogDescription>
            Selecciona tu nivel de juego actual. Esto ayudará a que el sistema te recomiende clases y partidas más adecuadas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedLevel} onValueChange={(val: MatchPadelLevel) => setSelectedLevel(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu nivel..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.0">0.0 - Principiante</SelectItem>
              <SelectItem value="0.5">0.5</SelectItem>
              <SelectItem value="1.0">1.0</SelectItem>
              <SelectItem value="1.5">1.5</SelectItem>
              <SelectItem value="2.0">2.0</SelectItem>
              <SelectItem value="2.5">2.5</SelectItem>
              <SelectItem value="3.0">3.0 - Intermedio bajo</SelectItem>
              <SelectItem value="3.5">3.5</SelectItem>
              <SelectItem value="4.0">4.0 - Intermedio</SelectItem>
              <SelectItem value="4.5">4.5</SelectItem>
              <SelectItem value="5.0">5.0 - Intermedio alto</SelectItem>
              <SelectItem value="5.5">5.5</SelectItem>
              <SelectItem value="6.0">6.0 - Avanzado</SelectItem>
              <SelectItem value="6.5">6.5</SelectItem>
              <SelectItem value="7.0">7.0 - Profesional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSaveClick}>
            <Check className="mr-2 h-4 w-4" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditLevelDialog;

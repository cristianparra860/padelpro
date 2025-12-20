"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, ListFilter } from 'lucide-react';

interface ViewOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showConfirmed: boolean;
  onShowConfirmedChange: (checked: boolean) => void;
  viewPreference: 'normal' | 'myInscriptions' | 'myConfirmed';
  onViewPreferenceChange: (value: 'normal' | 'myInscriptions' | 'myConfirmed') => void;
  hideWithStudents: boolean;
  onHideWithStudentsChange: (checked: boolean) => void;
  hideFull: boolean;
  onHideFullChange: (checked: boolean) => void;
  hideEmpty: boolean;
  onHideEmptyChange: (checked: boolean) => void;
}

const ViewOptionsDialog: React.FC<ViewOptionsDialogProps> = ({
  isOpen,
  onOpenChange,
  showConfirmed,
  onShowConfirmedChange,
  viewPreference,
  onViewPreferenceChange,
  hideWithStudents,
  onHideWithStudentsChange,
  hideFull,
  onHideFullChange,
  hideEmpty,
  onHideEmptyChange
}) => {

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <div className="w-full p-6">
          <h2 className="text-lg font-bold text-center mb-2">Filtrar por tipo de clase</h2>
          <p className="text-sm text-gray-500 text-center mb-4">Selecciona qué clases quieres ver</p>
          <div className="flex flex-col gap-4">
            {/* Opción 1: Ocultar con alumnos inscritos */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <span className="text-blue-600 text-lg font-bold">I</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Ocultar inscripciones</div>
                <div className="text-xs text-gray-500">No mostrar clases con alumnos inscritos</div>
              </div>
              <Switch id="hideWithStudents" checked={hideWithStudents} onCheckedChange={onHideWithStudentsChange} />
            </div>
            {/* Opción 2: Ocultar clases completas */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <span className="text-red-600 text-lg font-bold">R</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Ocultar reservas</div>
                <div className="text-xs text-gray-500">No mostrar clases completas</div>
              </div>
              <Switch id="hideFull" checked={hideFull} onCheckedChange={onHideFullChange} />
            </div>
            {/* Opción 3: Ocultar vacías */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200">
                <span className="text-gray-600 text-lg font-bold">Ø</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Ocultar vacías</div>
                <div className="text-xs text-gray-500">No mostrar clases sin alumnos</div>
              </div>
              <Switch id="hideEmpty" checked={hideEmpty} onCheckedChange={onHideEmptyChange} />
            </div>
          </div>
          <div className="py-4 space-y-6">
          
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="show-confirmed-switch" className="text-sm font-medium">Mostrar Llenas/Confirmadas</Label>
              <p className="text-xs text-muted-foreground">Incluye actividades que ya no tienen plazas.</p>
            </div>
            <Switch
              id="show-confirmed-switch"
              checked={showConfirmed}
              onCheckedChange={onShowConfirmedChange}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Priorizar Vista</Label>
            <RadioGroup 
              defaultValue={viewPreference} 
              onValueChange={onViewPreferenceChange as (value: string) => void} 
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="view-normal" />
                <Label htmlFor="view-normal" className="font-normal">Vista Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="myInscriptions" id="view-inscriptions" />
                <Label htmlFor="view-inscriptions" className="font-normal">Mis Inscripciones Primero</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="myConfirmed" id="view-confirmed" />
                <Label htmlFor="view-confirmed" className="font-normal">Mis Confirmadas Primero</Label>
              </div>
            </RadioGroup>
          </div>

          </div>
          <div className="flex flex-col gap-2 mt-6">
            <button
              className="w-full py-2 rounded-lg bg-green-500 text-white font-bold text-base hover:bg-green-600 transition"
              onClick={handleClose}
            >
              Aplicar filtros
            </button>
            <button
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-base hover:bg-gray-200 transition"
              onClick={handleClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewOptionsDialog;

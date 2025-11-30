"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export default function GenerateProposalsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);
  const [cleanOld, setCleanOld] = useState(true);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      console.log('🚀 Iniciando generación de propuestas...');
      
      const response = await fetch('/api/admin/generate-proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daysAhead,
          cleanOld,
          clubId: 'padel-estrella-madrid',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Propuestas Generadas',
          description: `${data.stats.slotsCreated} nuevas clases creadas. ${data.stats.slotsSkipped} ya existían.`,
          className: 'bg-green-600 text-white',
        });
        
        setIsOpen(false);
        
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: '❌ Error',
          description: data.message || 'No se pudieron generar las propuestas',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: '❌ Error',
        description: 'Error al conectar con el servidor',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generar Propuestas
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generar Propuestas de Clases
          </DialogTitle>
          <DialogDescription>
            Crea automáticamente propuestas de clases para todos los horarios disponibles,
            respetando las restricciones del club y los instructores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Días hacia adelante */}
          <div className="space-y-2">
            <Label htmlFor="daysAhead">Días hacia adelante</Label>
            <Input
              id="daysAhead"
              type="number"
              min={1}
              max={30}
              value={daysAhead}
              onChange={(e) => setDaysAhead(parseInt(e.target.value) || 7)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Número de días para los que se generarán propuestas
            </p>
          </div>

          {/* Limpiar antiguas */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cleanOld"
              checked={cleanOld}
              onCheckedChange={(checked) => setCleanOld(checked as boolean)}
              disabled={isGenerating}
            />
            <Label
              htmlFor="cleanOld"
              className="text-sm font-normal cursor-pointer"
            >
              Limpiar propuestas antiguas (más de 30 días)
            </Label>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Restricciones respetadas:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Horarios de cierre del club</li>
                  <li>Disponibilidad de instructores</li>
                  <li>Restricciones personales de instructores</li>
                  <li>Propuestas existentes (no se duplican)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Generar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

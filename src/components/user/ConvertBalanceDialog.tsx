"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage, FormDescription as FormFieldDescription } from '@/components/ui/form';
import { Loader2, Euro, Repeat, Star, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

interface ConvertBalanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onConversionSuccess: (newCredit: number, newPoints: number) => void;
}

const POINTS_PER_EURO = 1; 

const formSchema = z.object({
  eurosToConvert: z.coerce
    .number()
    .positive("La cantidad debe ser positiva.")
    .min(1, "La cantidad mínima a convertir es 1€."),
});

type FormData = z.infer<typeof formSchema>;

const ConvertBalanceDialog: React.FC<ConvertBalanceDialogProps> = ({
  isOpen,
  onOpenChange,
  currentUser,
  onConversionSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  // Convertir céntimos a euros para mostrar correctamente
  const currentCredit = ((currentUser.credits ?? currentUser.credit ?? 0) / 100);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eurosToConvert: 10,
    },
  });

  const eurosToConvertWatched = form.watch("eurosToConvert");

  const onSubmit = (values: FormData) => {
    if (values.eurosToConvert > currentCredit) {
      form.setError("eurosToConvert", {
        type: "manual",
        message: `No puedes convertir más de tu saldo actual (${currentCredit.toFixed(2)}€).`,
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${currentUser.id}/credit/convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            euros: values.eurosToConvert, 
            pointsPerEuro: POINTS_PER_EURO 
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast({ 
            title: 'Error en la Conversión', 
            description: result.error || 'No se pudo completar la conversión', 
            variant: 'destructive' 
          });
          return;
        }

        onConversionSuccess(result.newCreditBalance, result.newLoyaltyPoints);
        onOpenChange(false);
        form.reset({ eurosToConvert: 10 });
        
        toast({
          title: '✅ Conversión Exitosa',
          description: `${values.eurosToConvert}€ convertidos a ${Math.floor(values.eurosToConvert * POINTS_PER_EURO)} puntos`,
        });
      } catch (error) {
        console.error("Error converting balance:", error);
        toast({ 
          title: 'Error Inesperado', 
          description: 'No se pudo completar la conversión.', 
          variant: 'destructive' 
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) form.reset({ eurosToConvert: 10 });
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">Añadir Puntos desde Saldo</DialogTitle>
          <DialogDescription>
            Convierte tu saldo en euros a puntos de fidelidad. Tasa: 1€ = {POINTS_PER_EURO} Punto{POINTS_PER_EURO === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 text-sm">
              <AlertTriangle className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              <strong>Atención:</strong> Esta acción es irreversible. Los puntos no podrán ser convertidos de nuevo a euros.
            </div>
            <FormField
              control={form.control}
              name="eurosToConvert"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="euros-to-convert">Euros a Convertir</Label>
                  <FormControl>
                    <div className="relative">
                        <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="euros-to-convert"
                            type="number"
                            min="1"
                            step="1"
                            className="pl-8"
                            placeholder="Ej: 10"
                            {...field}
                        />
                    </div>
                  </FormControl>
                  <FormMessage />
                   <FormFieldDescription className="text-xs">
                    Saldo actual: {currentCredit.toFixed(2)}€
                  </FormFieldDescription>
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending || eurosToConvertWatched <= 0 || eurosToConvertWatched > currentCredit}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Repeat className="mr-2 h-4 w-4" /> Añadir Puntos
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertBalanceDialog;

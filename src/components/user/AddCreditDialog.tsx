"use client";

import React, { useState, useTransition } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Euro } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddCreditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreditAdded: (newBalance: number) => void;
}

const formSchema = z.object({
  amount: z.coerce.number().positive("La cantidad debe ser positiva.").min(1, "La cantidad mínima es 1€."),
});

type FormData = z.infer<typeof formSchema>;

const AddCreditDialog: React.FC<AddCreditDialogProps> = ({
  isOpen,
  onOpenChange,
  userId,
  onCreditAdded,
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 20,
    },
  });

  const onSubmit = (values: FormData) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${userId}/credit/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: values.amount }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast({ 
            title: 'Error al Añadir Saldo', 
            description: result.error || 'No se pudo añadir el saldo', 
            variant: 'destructive' 
          });
          return;
        }

        onCreditAdded(result.newBalance);
        onOpenChange(false);
        form.reset({ amount: 20 });
        
        toast({
          title: '✅ Saldo Añadido',
          description: `Añadidos ${values.amount}€ a tu cuenta. Nuevo saldo: ${result.newBalance.toFixed(2)}€`,
        });
      } catch (error) {
        console.error("Error adding credit:", error);
        toast({ 
          title: 'Error Inesperado', 
          description: 'No se pudo añadir el saldo.', 
          variant: 'destructive' 
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) form.reset({ amount: 20 });
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">Añadir Saldo a tu Cuenta</DialogTitle>
          <DialogDescription>
            Ingresa la cantidad de euros que deseas añadir. (Simulación)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="amount-to-add">Cantidad (€)</Label>
                  <FormControl>
                    <div className="relative">
                        <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="amount-to-add"
                            type="number"
                            min="1"
                            step="1"
                            className="pl-8"
                            placeholder="Ej: 20"
                            {...field}
                        />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Saldo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditDialog;

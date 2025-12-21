"use client";

import React, { useEffect, useTransition, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserCog, Mail, BuildingIcon, Hash, ToggleLeft, ToggleRight, AlertTriangle, Euro, Clock, Trash2, PlusCircle, Calendar as CalendarIconLucide } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateInstructor, getMockClubs, getMockPadelCourts } from '@/lib/mockData';
import type { Instructor, Club, PadelCourt, DayOfWeek, InstructorRateTier, InstructorAvailability } from '@/types';
import { cn } from '@/lib/utils';
import { daysOfWeek, dayOfWeekLabels } from '@/types';

interface EditInstructorDialogProps {
  instructor: Instructor;
  isOpen: boolean;
  onClose: (updated?: boolean) => void;
}

const rateTierSchema = z.object({
  id: z.string(),
  days: z.array(z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]))
    .min(1, "Debes seleccionar al menos un día."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  rate: z.coerce.number().positive("La tarifa debe ser un número positivo."),
}).refine(data => data.startTime < data.endTime, {
  message: "La hora de fin debe ser posterior a la de inicio.",
  path: ["endTime"],
});

const availabilitySchema = z.object({
  id: z.string(),
  days: z.array(z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]))
    .min(1, "Debes seleccionar al menos un día."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  isActive: z.boolean().optional().default(true),
}).refine(data => data.startTime < data.endTime, {
  message: "La hora de fin debe ser posterior a la de inicio.",
  path: ["endTime"],
});

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(50, "El nombre no puede exceder los 50 caracteres."),
  email: z.string().email("Debe ser un correo electrónico válido."),
  isBlocked: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  assignedClubId: z.string().optional().nullable(),
  assignedCourtNumber: z.coerce.number().int().optional().nullable(),
  defaultRatePerHour: z.coerce.number().min(0, "La tarifa no puede ser negativa.").optional(),
  rateTiers: z.array(rateTierSchema).optional(),
  availability: z.array(availabilitySchema).optional(),
});


type FormData = z.infer<typeof formSchema>;

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const EditInstructorDialog: React.FC<EditInstructorDialogProps> = ({ instructor, isOpen, onClose }) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [availableCourts, setAvailableCourts] = useState<PadelCourt[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: instructor.name || "",
      email: instructor.email || "",
      isBlocked: instructor.isBlocked || false,
      isAvailable: instructor.isAvailable ?? true,
      assignedClubId: instructor.assignedClubId || null,
      assignedCourtNumber: instructor.assignedCourtNumber || null,
      defaultRatePerHour: instructor.defaultRatePerHour || 28,
      rateTiers: instructor.rateTiers || [],
      availability: instructor.availability || [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rateTiers",
  });

  const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
    control: form.control,
    name: "availability",
  });


  const watchedAssignedClubId = form.watch('assignedClubId');

  useEffect(() => {
    if (isOpen) {
      const clubs = getMockClubs();
      setAvailableClubs(clubs);
      if (instructor) {
        form.reset({
          name: instructor.name || "",
          email: instructor.email || "",
          isBlocked: instructor.isBlocked || false,
          isAvailable: instructor.isAvailable ?? true,
          assignedClubId: instructor.assignedClubId || null,
          assignedCourtNumber: instructor.assignedCourtNumber || null,
          defaultRatePerHour: instructor.defaultRatePerHour || 28,
          rateTiers: instructor.rateTiers || [],
          availability: instructor.availability || [],
        });
        if (instructor.assignedClubId) {
            const courts = getMockPadelCourts().filter(c => c.clubId === instructor.assignedClubId && c.isActive);
            setAvailableCourts(courts);
        } else {
            setAvailableCourts([]);
        }
      }
    }
  }, [instructor, form, isOpen]);

  useEffect(() => {
    if (watchedAssignedClubId) {
        const courts = getMockPadelCourts().filter(c => c.clubId === watchedAssignedClubId && c.isActive);
        setAvailableCourts(courts);
        if (!courts.find(c => c.courtNumber === form.getValues('assignedCourtNumber'))) {
           // form.setValue('assignedCourtNumber', courts.length > 0 ? courts[0].courtNumber : null); // No auto-seleccionar si no hay coincidencia
        }
    } else {
        setAvailableCourts([]);
        form.setValue('assignedCourtNumber', null);
    }
  }, [watchedAssignedClubId, form]);


  const onSubmit = (values: FormData) => {
    startTransition(async () => {
      try {
        const updatePayload: Partial<Omit<Instructor, 'id'>> = {
            name: values.name,
            email: values.email,
            isBlocked: values.isBlocked,
            isAvailable: values.isAvailable,
            assignedClubId: values.assignedClubId || undefined, // Send undefined if null
            assignedCourtNumber: values.assignedCourtNumber || undefined, // Send undefined if null
            defaultRatePerHour: values.defaultRatePerHour,
            rateTiers: values.rateTiers,
            availability: values.availability,
        };

        const result = await updateInstructor(instructor.id, updatePayload);

        if ('error' in result) {
          toast({ title: 'Error al Actualizar Instructor', description: result.error, variant: 'destructive' });
        } else {
          toast({ title: '¡Instructor Actualizado!', description: `Se han guardado los cambios para ${result.name}.`, className: 'bg-primary text-primary-foreground' });
          onClose(true);
        }
      } catch (error) {
        console.error("Error updating instructor:", error);
        toast({ title: 'Error Inesperado', description: 'Ocurrió un problema al actualizar el instructor.', variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center"><UserCog className="mr-2 h-5 w-5 text-primary" /> Editar Instructor</DialogTitle>
          <DialogDescription>Modifica los detalles, tarifas y configuración del instructor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-3 pl-1">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Javier Gómez" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Email</FormLabel><FormControl><Input type="email" placeholder="javier@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField
              control={form.control}
              name="assignedClubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><BuildingIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Club Asignado (Opcional)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"} disabled={isPending}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un club..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ningún club asignado</SelectItem>
                      {availableClubs.map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedCourtNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Hash className="mr-2 h-4 w-4 text-muted-foreground"/>Pista Asignada (en club)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                    value={field.value?.toString() || "none"}
                    disabled={!watchedAssignedClubId || availableCourts.length === 0 || isPending}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={!watchedAssignedClubId ? "Selecciona club primero" : "Selecciona una pista..."} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguna pista asignada</SelectItem>
                      {availableCourts.map(court => <SelectItem key={court.id} value={court.courtNumber.toString()}>{court.name} (Pista {court.courtNumber})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!watchedAssignedClubId && <FormDescription className="text-xs text-muted-foreground">Selecciona un club para ver sus pistas.</FormDescription>}
                  {watchedAssignedClubId && availableCourts.length === 0 && <FormDescription className="text-xs text-yellow-600">Este club no tiene pistas activas registradas.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-lg border p-3 shadow-sm bg-secondary/20">
                <FormLabel>Tarifas Especiales por Horario</FormLabel>
                {fields.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-md bg-background/50 relative space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                             <FormField
                                control={form.control}
                                name={`rateTiers.${index}.startTime`}
                                render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Desde</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                                    <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`rateTiers.${index}.endTime`}
                                render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Hasta</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                                    <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                         </div>
                         <FormField
                            control={form.control}
                            name={`rateTiers.${index}.rate`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Tarifa Especial (€/hora)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" step="1" {...field} className="h-8" onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name={`rateTiers.${index}.days`}
                            render={() => (
                                <FormItem>
                                    <FormLabel className="text-xs">Días de la Semana</FormLabel>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {(Object.keys(dayOfWeekLabels) as DayOfWeek[]).map((day) => (
                                            <FormField
                                                key={day}
                                                control={form.control}
                                                name={`rateTiers.${index}.days`}
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                                                        <FormControl>
                                                            <Switch
                                                                className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                                                                checked={field.value?.includes(day)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), day])
                                                                        : field.onChange((field.value || []).filter((value) => value !== day))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="text-xs font-normal">{dayOfWeekLabels[day].substring(0,3)}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                         />
                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `tier-${Date.now()}`, days: [], startTime: '09:00', endTime: '10:00', rate: 50 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Tarifa Especial
                </Button>
            </div>

            <div className="space-y-4 rounded-lg border p-3 shadow-sm bg-secondary/20">
                <FormLabel className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground"/>
                    Horarios de Disponibilidad
                </FormLabel>
                <FormDescription className="text-xs text-muted-foreground">
                    Define los horarios en los que el instructor está disponible para dar clases.
                </FormDescription>
                {availabilityFields.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-md bg-background/50 relative space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                             <FormField
                                control={form.control}
                                name={`availability.${index}.startTime`}
                                render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Desde</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                                    <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`availability.${index}.endTime`}
                                render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Hasta</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                                    <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                         </div>
                         <FormField
                            control={form.control}
                            name={`availability.${index}.days`}
                            render={() => (
                                <FormItem>
                                    <FormLabel className="text-xs">Días de la Semana</FormLabel>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {(Object.keys(dayOfWeekLabels) as DayOfWeek[]).map((day) => (
                                            <FormField
                                                key={day}
                                                control={form.control}
                                                name={`availability.${index}.days`}
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                                                        <FormControl>
                                                            <Switch
                                                                className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                                                                checked={field.value?.includes(day)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), day])
                                                                        : field.onChange((field.value || []).filter((value) => value !== day))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="text-xs font-normal">{dayOfWeekLabels[day].substring(0,3)}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name={`availability.${index}.isActive`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs">Activo</FormLabel>
                                        <FormDescription className="text-xs">Desmarcar para deshabilitar temporalmente este horario</FormDescription>  
                                    </div>
                                    <FormControl>
                                        <Switch 
                                            checked={field.value ?? true} 
                                            onCheckedChange={field.onChange}
                                            className="h-4 w-7"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                         />
                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeAvailability(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => appendAvailability({ id: `availability-${Date.now()}`, days: [], startTime: '09:00', endTime: '12:00', isActive: true })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Horario de Disponibilidad
                </Button>
            </div>

            <FormField control={form.control} name="isAvailable" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/20">
                    <div className="space-y-0.5">
                        <FormLabel className="flex items-center">
                            {field.value ? <ToggleRight className="mr-2 h-5 w-5 text-green-600"/> : <ToggleLeft className="mr-2 h-5 w-5 text-muted-foreground"/>}
                            Disponibilidad General
                        </FormLabel>
                        <FormDescription className="text-xs">Si está desactivado, el instructor no aparecerá como disponible para nuevas clases.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} /></FormControl>
                </FormItem>
            )} />
            <FormField control={form.control} name="isBlocked" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/20">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center">
                        {field.value ? <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> : null}
                        Bloquear Instructor
                    </FormLabel>
                    <FormDescription className="text-xs">Si está activado, el instructor no podrá acceder ni gestionar clases.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} /></FormControl>
                </FormItem>
            )} />
            <DialogFooter className="pt-3 sticky bottom-0 bg-background pb-1 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInstructorDialog;

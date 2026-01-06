// src/app/(app)/instructor/components/InstructorPanel.tsx
"use client";

import React, { useState, useCallback, memo, useEffect, useTransition } from 'react';
import type { User, TimeSlot, Match, Instructor as InstructorType, PadelCourt, Club, DayOfWeek, TimeRange, InstructorRateTier } from '@/types';
import AddClassForm from '../../add-class/components/AddClassForm';
import ManagedSlotsList from './ManagedSlotsList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarPlus, ListChecks, Wallet, Settings2, ToggleLeft, ToggleRight, Loader2, ClockIcon as ClockIconLucide, CalendarSearch, Euro, Save, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AddCreditForm from '../../add-credit/components/AddCreditForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getMockClubs, getMockPadelCourts, updateInstructor, getMockCurrentUser, setGlobalCurrentUser } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { dayOfWeekLabels } from '@/types';
import InstructorAvailabilitySettings from './InstructorAvailabilitySettings';
import InstructorLevelRanges from './InstructorLevelRanges';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import InstructorClassCards from './InstructorClassCards';
import ClubCalendarImproved from '@/components/admin/ClubCalendarImproved';

interface InstructorPanelProps {
  instructor: InstructorType;
}

const rateTierSchema = z.object({
  id: z.string(),
  days: z.array(z.string()).min(1, "Debes seleccionar al menos un día."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida."),
  rate: z.coerce.number().positive("La tarifa debe ser un número positivo."),
}).refine(data => data.startTime < data.endTime, {
  message: "La hora de fin debe ser posterior a la de inicio.",
  path: ["endTime"],
});

const preferencesFormSchema = z.object({
  assignedClubId: z.string().optional().nullable(),
  assignedCourtNumber: z.coerce.number().int().optional().nullable(),
  isAvailable: z.boolean().optional(),
  defaultRatePerHour: z.coerce.number().min(0, "La tarifa no puede ser negativa.").optional(),
  rateTiers: z.array(rateTierSchema).optional(),
});
type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const InstructorPanelComponent: React.FC<InstructorPanelProps> = ({ instructor: initialInstructor }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshMatchesKey, setRefreshMatchesKey] = useState(0);
  const [instructorData, setInstructorData] = useState<InstructorType>(initialInstructor);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [availableCourtsForSelectedClub, setAvailableCourtsForSelectedClub] = useState<PadelCourt[]>([]);
  const [isSavingSettings, startSettingsTransition] = useTransition();
  const { toast } = useToast();

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      assignedClubId: initialInstructor.assignedClubId,
      assignedCourtNumber: initialInstructor.assignedCourtNumber,
      isAvailable: initialInstructor.isAvailable ?? true,
      defaultRatePerHour: initialInstructor.defaultRatePerHour || 28,
      rateTiers: initialInstructor.rateTiers || [],
    },
  });
  
  const { fields: rateTierFields, append: appendRateTier, remove: removeRateTier } = useFieldArray({
    control: preferencesForm.control,
    name: "rateTiers",
  });

  const watchedAssignedClubId = preferencesForm.watch('assignedClubId');

  // Cargar usuario actual con JWT
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    
    loadCurrentUser();
  }, []);

  useEffect(() => {
    setInstructorData(initialInstructor);
    preferencesForm.reset({
      assignedClubId: initialInstructor.assignedClubId,
      assignedCourtNumber: initialInstructor.assignedCourtNumber,
      isAvailable: initialInstructor.isAvailable ?? true,
      defaultRatePerHour: initialInstructor.defaultRatePerHour || 28,
      rateTiers: initialInstructor.rateTiers || [],
    });
  }, [initialInstructor, preferencesForm]);

  useEffect(() => {
    const clubs = getMockClubs();
    setAvailableClubs(clubs);
  }, []);

  useEffect(() => {
    if (watchedAssignedClubId) {
      const courts = getMockPadelCourts().filter(court => court.clubId === watchedAssignedClubId && court.isActive);
      setAvailableCourtsForSelectedClub(courts);
      const currentCourt = preferencesForm.getValues('assignedCourtNumber');
      if (courts.length > 0 && !courts.some(c => c.courtNumber === currentCourt)) {
        preferencesForm.setValue('assignedCourtNumber', undefined);
      }
    } else {
      setAvailableCourtsForSelectedClub([]);
      preferencesForm.setValue('assignedCourtNumber', undefined);
    }
  }, [watchedAssignedClubId, preferencesForm]);

  const handleClassAdded = useCallback((_newSlot?: TimeSlot) => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  const handleSaveInstructorPreferences = (values: PreferencesFormData) => {
    startSettingsTransition(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          toast({ title: "Error de Autenticación", description: "No se encontró token de sesión", variant: "destructive" });
          return;
        }

        const safeRateTiers = values.rateTiers?.map(t => ({
          ...t,
          days: (t.days as unknown as DayOfWeek[]),
        }));
        
        const updatePayload = {
          isAvailable: values.isAvailable,
          defaultRatePerHour: values.defaultRatePerHour,
          rateTiers: safeRateTiers,
        };

        const response = await fetch(`/api/instructors/${instructorData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatePayload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast({ title: "Error al Guardar Preferencias", description: result.error || 'Error desconocido', variant: "destructive" });
        } else {
          setInstructorData(prev => ({ ...prev, ...result.instructor }));
          toast({ title: "Preferencias Guardadas", description: "Tus preferencias y tarifas de instructor han sido actualizadas.", className: "bg-primary text-primary-foreground" });
          preferencesForm.reset(values);
          handleClassAdded();
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        toast({ title: "Error al Guardar Preferencias", description: "Error de conexión", variant: "destructive" });
      }
    });
  };

  const handleSaveUnavailableHours = async (unavailableHours: Partial<Record<DayOfWeek, TimeRange[]>>) => {
    startSettingsTransition(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          toast({ title: "Error de Autenticación", description: "No se encontró token de sesión", variant: "destructive" });
          return;
        }

        const response = await fetch(`/api/instructors/${instructorData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ unavailableHours })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast({ title: "Error al Guardar Disponibilidad", description: result.error || 'Error desconocido', variant: "destructive"});
        } else {
          setInstructorData(prev => ({ ...prev, ...result.instructor }));
          toast({ title: "Disponibilidad Guardada", description: "Tu horario de disponibilidad ha sido actualizado.", className: "bg-primary text-primary-foreground" });
          handleClassAdded();
        }
      } catch (error) {
        console.error('Error saving availability:', error);
        toast({ title: "Error al Guardar Disponibilidad", description: "Error de conexión", variant: "destructive"});
      }
    });
  };

  const clubCalendarLink = instructorData.assignedClubId ? `/club-calendar/${instructorData.assignedClubId}` : '#';

  return (
    <div className="pl-16 md:pl-20 lg:pl-24 pr-4 md:pr-8 py-6 md:py-8 max-w-7xl">
      <Tabs defaultValue="myClasses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto">
          <TabsTrigger value="myClasses" className="text-xs sm:text-sm py-1.5 px-2">
            <ListChecks className="mr-1.5 h-4 w-4" /> Mis Clases
          </TabsTrigger>
          <TabsTrigger value="manageClasses" className="text-xs sm:text-sm py-1.5 px-2">
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Gestionar Clases
          </TabsTrigger>
          <TabsTrigger value="clubCalendar" className="text-xs sm:text-sm py-1.5 px-2">
            <CalendarSearch className="mr-1 h-4 w-4"/> Calendario Club
          </TabsTrigger>
          <TabsTrigger value="instructorPreferences" className="text-xs sm:text-sm py-1.5 px-2">
            <Settings2 className="mr-1.5 h-4 w-4" /> Preferencias
          </TabsTrigger>
        </TabsList>

      <TabsContent value="myClasses">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <ListChecks className="mr-2 h-5 w-5 text-primary" /> Mis Clases Programadas
            </CardTitle>
            <CardDescription>
              Visualiza todas tus clases con las reservas actuales. Usa el mismo formato de tarjetas que ven tus alumnos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="all">Todas las Clases</TabsTrigger>
                <TabsTrigger value="withStudents">Con Alumnos Inscritos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <InstructorClassCards instructor={instructorData} />
              </TabsContent>
              
              <TabsContent value="withStudents">
                <InstructorClassCards instructor={instructorData} onlyWithBookings={true} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="manageClasses">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg"><ListChecks className="mr-2 h-5 w-5 text-primary" /> Clases Gestionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ManagedSlotsList key={refreshKey} instructorId={instructorData.id} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="addCredits">
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center text-lg"><Wallet className="mr-2 h-5 w-5 text-primary" /> Añadir Crédito a Alumnos</CardTitle>
             <CardDescription>
               Añade saldo a tus alumnos cuando te paguen en efectivo. El crédito se reflejará inmediatamente en su cuenta 
               para que puedan reservar clases en la plataforma.
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex justify-end mb-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/add-credit">
                    <Euro className="mr-2 h-4 w-4" /> Ir al panel de recargas
                  </Link>
                </Button>
             </div>
              <AddCreditForm instructor={instructorData} />
           </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="clubCalendar">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CalendarSearch className="mr-2 h-5 w-5 text-primary" /> Calendario del Club
            </CardTitle>
            <CardDescription>
              Visualiza todas las clases, propuestas y eventos del club. Gestiona tus clases desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClubCalendarImproved 
              clubId={instructorData.assignedClubId || 'club-1'} 
              currentUser={currentUser}
              viewMode="instructor"
              instructorId={instructorData.id}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="instructorPreferences">
        <div className="space-y-6">
          {/* Rangos de Nivel de Usuarios */}
          <InstructorLevelRanges 
            instructorId={instructorData.id}
            initialRanges={(() => {
              try {
                // levelRanges ya viene parseado del API como array
                if (Array.isArray(instructorData.levelRanges)) {
                  return instructorData.levelRanges;
                }
                // Si es string (legacy), parsearlo
                if (typeof instructorData.levelRanges === 'string' && instructorData.levelRanges.trim() !== '') {
                  return JSON.parse(instructorData.levelRanges);
                }
                return [];
              } catch (e) {
                console.error('Error parsing levelRanges:', e);
                return [];
              }
            })()}
          />

          {/* Preferencias y Tarifas */}
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Preferencias y Tarifas</CardTitle>
                <CardDescription>Configura tu club de operación, disponibilidad general y tarifas por hora.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit(handleSaveInstructorPreferences)} className="space-y-6">

                  <FormField control={preferencesForm.control} name="isAvailable" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                              <FormLabel className="flex items-center">
                                  {field.value ? <ToggleRight className="mr-2 h-5 w-5 text-green-600"/> : <ToggleLeft className="mr-2 h-5 w-5 text-muted-foreground"/>}
                                  Disponibilidad General
                              </FormLabel>
                              <FormDescription className="text-xs">
                                  {field.value ? "Estás disponible para dar clases." : "No estás disponible. No se generarán clases."}
                              </FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSavingSettings} /></FormControl>
                      </FormItem>
                  )} />
                  
                  <Separator />

                    <div className="space-y-4 rounded-lg border p-3 shadow-sm">
                       <FormField
                          control={preferencesForm.control}
                          name="defaultRatePerHour"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel className="flex items-center"><Euro className="mr-2 h-4 w-4 text-muted-foreground"/>Tarifa por Hora Predeterminada</FormLabel>
                              <FormControl>
                                  <Input type="number" min="0" step="1" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormDescription>Esta tarifa se usará si la clase no cae en ninguna franja de tarifa especial.</FormDescription>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <Separator />
                      <FormLabel>Tarifas Especiales por Horario</FormLabel>
                      {rateTierFields.map((item, index) => (
                        <div key={item.id} className="p-3 border rounded-md bg-secondary/50 relative space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <FormField control={preferencesForm.control} name={`rateTiers.${index}.startTime`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Desde</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage className="text-xs" /></FormItem>)} />
                            <FormField control={preferencesForm.control} name={`rateTiers.${index}.endTime`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Hasta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage className="text-xs" /></FormItem>)} />
                          </div>
                          <FormField control={preferencesForm.control} name={`rateTiers.${index}.rate`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Tarifa Especial (€/hora)</FormLabel><FormControl><Input type="number" min="0" step="1" {...field} className="h-8" onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                          <FormField control={preferencesForm.control} name={`rateTiers.${index}.days`} render={() => (<FormItem><FormLabel className="text-xs">Días</FormLabel><div className="grid grid-cols-4 gap-1.5">{Object.keys(dayOfWeekLabels).map((day) => (<FormField key={day} control={preferencesForm.control} name={`rateTiers.${index}.days`} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-1.5 space-y-0"><FormControl><Switch className="h-4 w-7" checked={field.value?.includes(day)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), day]) : field.onChange((field.value || []).filter((value) => value !== day))}}/></FormControl><FormLabel className="text-xs font-normal">{dayOfWeekLabels[day as DayOfWeek].substring(0,3)}</FormLabel></FormItem>)}/>))}</div><FormMessage className="text-xs"/></FormItem>)} />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeRateTier(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendRateTier({ id: `tier-${Date.now()}`, days: [], startTime: '09:00', endTime: '10:00', rate: 50 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Tarifa
                      </Button>
                    </div>

                  <Button type="submit" disabled={isSavingSettings || !preferencesForm.formState.isDirty} className="w-full sm:w-auto">
                      {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Preferencias y Tarifas
                  </Button>
                </form>
              </Form>
            </CardContent>
        </Card>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
};

const InstructorPanel = memo(InstructorPanelComponent);
InstructorPanel.displayName = 'InstructorPanel';
export default InstructorPanel;

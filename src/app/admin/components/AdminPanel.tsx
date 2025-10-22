"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import type { Instructor, Club, PadelCourt, TimeSlot, Match, PointTransaction, User as StudentUser, ClubLevelRange, MatchDayEvent } from '@/types';
import AddInstructorForm from '../../add-instructor/components/AddInstructorForm';
import InstructorList from './InstructorList';
import EditInstructorDialog from './EditInstructorDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, List, Settings, CalendarDays, Shield, HardHat, Activity, BarChartHorizontal, Loader2, PlayCircle, CalendarPlus as CalendarPlusIcon, LogOut, KeyRound, Star, Network, Trophy, ArrowLeft, ClockIcon as ClockIconLucide, ClipboardList, Tag, PartyPopper, Sparkles, AlertTriangle, Palette } from 'lucide-react';
import { fetchInstructors, updateClub, fetchPadelCourtsByClub, getMockStudents, fetchPointTransactions, addInstructor, deleteInstructor, updateInstructor as updateInstructorMock } from '@/lib/mockData';
import CourtBookingManagement from './CourtBookingManagement';
import ManageCourtsPanel from './ManageCourtsPanel';
import AddClassFormForAdmin from '../../add-class/components/AddClassFormForAdmin';
import OpenMatchFormForAdmin from './OpenMatchFormForAdmin';
import EditPointSettingsForm from './EditPointSettingsForm';
import ManageLevelRangesForm from './ManageLevelRangesForm';
import ManageClubMatchAvailability from './ManageClubMatchAvailability';
import ClubActivityCalendar from './ClubActivityCalendar';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ChangeClubPasswordForm from './ChangeClubPasswordForm';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import PointTransactionsTable from './PointTransactionsTable';
import StudentPointBalancesTable from './StudentPointBalancesTable';
import ManageMatchesPanel from './ManageMatchesPanel';
import ManageCourtRatesPanel from './ManageCourtRatesPanel';
import ManageMatchDayPanel from './ManageMatchDayPanel';
import ManagePointBookingSlots from './ManagePointBookingSlots';
import ManageCancellationPenaltiesForm from './ManageCancellationPenaltiesForm';
import BookingSimulator from './BookingSimulator';
import ManageCardStylesPanel from './ManageCardStylesPanel';


interface AdminPanelProps {
  adminClub: Club;
}

interface AdminPanelOption {
    value: string;
    label: string;
    icon: React.ElementType;
    componentFactory: (props: AdminPanelContentProps) => React.ReactNode;
    contentDescription?: string;
}

interface AdminPanelContentProps {
    club: Club;
    instructors: Instructor[];
    clubPadelCourts: PadelCourt[];
    pointTransactions: PointTransaction[];
    studentPointBalances: StudentUser[];
    loading: boolean;
    onDataChanged: () => void;
    onClubSettingsUpdated: (updatedClub: Club) => void;
    onActivityAdded: (activity?: TimeSlot | Match) => void;
    onEventCreated: (event: MatchDayEvent) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ adminClub }) => {
    const [currentAdminClub, setCurrentAdminClub] = useState<Club>(adminClub);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [clubPadelCourts, setClubPadelCourts] = useState<PadelCourt[]>([]);
    const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
    const [studentPointBalances, setStudentPointBalances] = useState<StudentUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isUpdatingSettings, startSettingsTransition] = useTransition();
    const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);

    const [activePanelValue, setActivePanelValue] = useState("instructors");
    const [showPanelContent, setShowPanelContent] = useState(false);
    
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        setCurrentAdminClub(adminClub);
    }, [adminClub]);

    const loadInitialData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [fetchedInstructors, fetchedCourts, fetchedTransactions, allStudents] = await Promise.all([
                fetchInstructors(),
                fetchPadelCourtsByClub(currentAdminClub.id),
                fetchPointTransactions(currentAdminClub.id),
                getMockStudents()
            ]);

            setInstructors(fetchedInstructors.filter(inst => !inst.isBlocked));
            setClubPadelCourts(fetchedCourts.filter(court => court.isActive));
            setPointTransactions(fetchedTransactions);
            setStudentPointBalances(allStudents.sort((a,b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0) ));
        } catch (err) {
            console.error("Failed to fetch admin panel data:", err);
            toast({ title: "Error", description: "No se pudieron cargar algunos datos del panel.", variant: "destructive" });
        } finally {
            setLoadingData(false);
        }
    }, [currentAdminClub.id, toast]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData, refreshKey]);

    const handleDataChanged = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    const handleClubSettingsUpdated = useCallback((updatedClub: Club) => {
        setCurrentAdminClub(updatedClub);
        handleDataChanged(); // Trigger a full data refresh if settings that affect data are changed
    }, [handleDataChanged]);

    const handleActivityAdded = useCallback(() => {
        toast({title: "Actividad Creada", description: "La nueva clase o partida ha sido añadida."})
        handleDataChanged();
        setShowPanelContent(false);
    }, [toast, handleDataChanged]);
    
    const handleEventCreated = useCallback((event: MatchDayEvent) => {
        toast({title: "Evento Creado", description: `El evento ${event.name} ha sido programado.`});
        handleDataChanged();
    }, [toast, handleDataChanged]);

    const handleEditInstructor = (instructor: Instructor) => setEditingInstructor(instructor);
    const handleCloseEditDialog = (updated?: boolean) => {
        setEditingInstructor(null);
        if (updated) handleDataChanged();
    };

    const handleToggleActivity = (activityType: 'classes' | 'matches' | 'matchDay', enabled: boolean) => {
        startSettingsTransition(async () => {
            let updateData: Partial<Club> = {};
            let activityName = "";
             if (activityType === 'classes') {
                updateData = { showClassesTabOnFrontend: enabled };
                activityName = "Clases";
            } else if (activityType === 'matches') {
                updateData = { showMatchesTabOnFrontend: enabled };
                activityName = "Partidas";
            } else if (activityType === 'matchDay') {
                updateData = { isMatchDayEnabled: enabled };
                activityName = "Match-Day";
            }
            
            const result = await updateClub(currentAdminClub.id, updateData);
            if ('error' in result) {
                toast({ title: `Error al actualizar visibilidad de ${activityName}`, description: result.error, variant: "destructive" });
            } else {
                toast({ title: `Visibilidad de ${activityName} ${enabled ? 'Activada' : 'Desactivada'}`, description: `La funcionalidad "${activityName}" ahora está ${enabled ? 'visible' : 'oculta'} para los usuarios de ${currentAdminClub.name}.`, className: 'bg-primary text-primary-foreground' });
                handleClubSettingsUpdated(result);
            }
        });
    };

    const handleExitClubPanel = () => {
        if (typeof window !== 'undefined') localStorage.removeItem('activeAdminClubId');
        toast({ title: "Has salido del panel del club", description: `Ya no estás gestionando ${currentAdminClub.name}. Serás redirigido.` });
        router.push('/auth/login-club-admin');
    };

    const adminPanelOptions: AdminPanelOption[] = [
        { value: "instructors", label: "Instructores", icon: UserPlus, componentFactory: (props) => (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1"><Card><CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary" /> Añadir Instructor</CardTitle></CardHeader><CardContent><AddInstructorForm onInstructorAdded={props.onDataChanged} /></CardContent></Card></div>
                <div className="lg:col-span-2"><Card><CardHeader><CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" /> Instructores Registrados ({props.club.name})</CardTitle></CardHeader><CardContent><InstructorList instructors={props.instructors} loading={props.loading} error={null} onInstructorUpdated={props.onDataChanged} onEditInstructor={handleEditInstructor} /></CardContent></Card></div>
            </div>
        )},
        { value: "managePadelCourts", label: "Pistas", icon: HardHat, componentFactory: (props) => <ManageCourtsPanel clubId={props.club.id} /> },
        { value: "courtRates", label: "Tarifas de Pista", icon: Tag, componentFactory: (props) => <ManageCourtRatesPanel club={props.club} onRatesUpdated={props.onClubSettingsUpdated} />, contentDescription: "Define los precios de las pistas por franjas horarias y días de la semana." },
        { value: "createClass", label: "Crear Clase", icon: CalendarPlusIcon, contentDescription: `Configura y añade una nueva clase para ${currentAdminClub.name}.`, componentFactory: (props) => (
            props.loading ? <Skeleton className="h-[400px] w-full" /> : <AddClassFormForAdmin club={props.club} availableInstructors={props.instructors} clubPadelCourts={props.clubPadelCourts} onClassAdded={props.onActivityAdded} />
        )},
        { value: "createMatch", label: "Crear Partida", icon: PlayCircle, contentDescription: `Configura y abre una nueva partida en tu club.`, componentFactory: (props) => (
            props.loading ? <Skeleton className="h-[400px] w-full" /> : <OpenMatchFormForAdmin club={props.club} clubPadelCourts={props.clubPadelCourts} onMatchOpened={props.onActivityAdded} />
        )},
        { value: "manageMatchDay", label: "Gestionar Match-Day", icon: PartyPopper, componentFactory: (props) => <ManageMatchDayPanel club={props.club} onEventCreated={props.onEventCreated} />, contentDescription: "Configura y gestiona los eventos sociales de Match-Day." },
        { value: "manageMatches", label: "Gestionar Partidas", icon: Trophy, componentFactory: (props) => <ManageMatchesPanel clubId={props.club.id} /> },
        { value: "courtBookings", label: "Reservas Pistas", icon: CalendarDays, componentFactory: (props) => <CourtBookingManagement clubId={props.club.id} key={`courtbooking-${refreshKey}`} /> },
        { value: "activityCalendar", label: "Calendario Actividad", icon: ClipboardList, contentDescription: `Visualiza las actividades (clases/partidas con inscritos) por rangos de nivel en ${currentAdminClub.name}.`, componentFactory: (props) => <ClubActivityCalendar club={props.club} refreshKey={refreshKey} /> },
        { value: "cardStyles", label: "Estilos de Tarjetas", icon: Palette, componentFactory: (props) => <ManageCardStylesPanel club={props.club} onSettingsUpdated={props.onClubSettingsUpdated} />, contentDescription: "Personaliza el aspecto visual de las tarjetas de clases y partidas." },
        { value: "levelRanges", label: "Rangos Nivel", icon: Network, componentFactory: (props) => <ManageLevelRangesForm club={props.club} onRangesUpdated={props.onClubSettingsUpdated} /> },
        { value: "clubMatchAvailability", label: "Horario Partidas", icon: ClockIconLucide, contentDescription: `Configura las horas en las que NO se generarán tarjetas de partidas automáticamente para ${currentAdminClub.name}.`, componentFactory: (props) => <ManageClubMatchAvailability club={props.club} onSettingsUpdated={props.onClubSettingsUpdated} /> },
        { value: "loyaltyPoints", label: "Puntos Fidelidad", icon: Star, componentFactory: (props) => (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" />Registro de Puntos</CardTitle><CardDescription>Actividad reciente de puntos de fidelidad en el club.</CardDescription></CardHeader><CardContent><PointTransactionsTable transactions={props.pointTransactions} loading={props.loading} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary" />Saldos de Puntos</CardTitle><CardDescription>Puntos de fidelidad actuales de los alumnos.</CardDescription></CardHeader><CardContent><StudentPointBalancesTable students={props.studentPointBalances} loading={props.loading} /></CardContent></Card></div>
                <div className="mt-6"><EditPointSettingsForm club={props.club} onSettingsUpdated={props.onClubSettingsUpdated} /></div>
            </>
        )},
        { value: "pointBookingSlots", label: "Reserva por Puntos", icon: Star, componentFactory: (props) => <ManagePointBookingSlots club={props.club} onSettingsUpdated={props.onClubSettingsUpdated} />, contentDescription: "Configura las horas en las que los usuarios pueden reservar pistas completas usando puntos de fidelidad." },
        { value: "cancellationPenalties", label: "Penalizaciones", icon: AlertTriangle, componentFactory: (props) => <ManageCancellationPenaltiesForm club={props.club} onSettingsUpdated={props.onClubSettingsUpdated} />, contentDescription: "Configura las penalizaciones en puntos por cancelar con poca antelación." },
        { value: "bookingSimulator", label: "Simulador de Actividad", icon: Sparkles, contentDescription: "Genera inscripciones de alumnos ficticios para probar el comportamiento de la plataforma.", componentFactory: (props) => <BookingSimulator club={props.club} onSimulationRun={props.onDataChanged} /> },
        { value: "clubSettings", label: "Ajustes Club", icon: Settings, contentDescription: "Configura las actividades y la visibilidad de las pestañas para los usuarios.", componentFactory: (props) => (
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/30"><div className="space-y-0.5"><Label htmlFor="classes-visibility" className="text-base font-medium flex items-center"><Activity className="mr-2 h-5 w-5 text-blue-500" />Mostrar Pestaña de Clases</Label><p className="text-xs text-muted-foreground">Controla si la pestaña "Clases" es visible para los usuarios.</p></div><Switch id="classes-visibility" checked={props.club.showClassesTabOnFrontend ?? true} onCheckedChange={(checked) => handleToggleActivity('classes', checked)} disabled={isUpdatingSettings} aria-label="Mostrar u ocultar pestaña de clases" /></div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/30"><div className="space-y-0.5"><Label htmlFor="matches-visibility" className="text-base font-medium flex items-center"><BarChartHorizontal className="mr-2 h-5 w-5 text-purple-500" />Mostrar Pestaña de Partidas</Label><p className="text-xs text-muted-foreground">Controla si la pestaña "Partidas" es visible para los usuarios.</p></div><Switch id="matches-visibility" checked={props.club.showMatchesTabOnFrontend ?? true} onCheckedChange={(checked) => handleToggleActivity('matches', checked)} disabled={isUpdatingSettings} aria-label="Mostrar u ocultar pestaña de partidas" /></div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/30"><div className="space-y-0.5"><Label htmlFor="matchday-visibility" className="text-base font-medium flex items-center"><PartyPopper className="mr-2 h-5 w-5 text-amber-500" />Activar Funcionalidad "Match-Day"</Label><p className="text-xs text-muted-foreground">Permite crear y gestionar eventos sociales de Match-Day.</p></div><Switch id="matchday-visibility" checked={props.club.isMatchDayEnabled ?? false} onCheckedChange={(checked) => handleToggleActivity('matchDay', checked)} disabled={isUpdatingSettings} aria-label="Activar o desactivar Match-Day" /></div>
                {isUpdatingSettings && (<div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando cambios...</div>)}
            </div>
        )},
        { value: "clubSecurity", label: "Seguridad Club", icon: KeyRound, contentDescription: `Cambia la contraseña de acceso para el panel de ${currentAdminClub.name}.`, componentFactory: (props) => <ChangeClubPasswordForm clubId={props.club.id} /> },
    ];
    
    const currentPanel = adminPanelOptions.find(opt => opt.value === activePanelValue);

    return (
        <>
            <div className="mb-6 flex justify-end">
                <Button variant="outline" onClick={handleExitClubPanel} className="text-sm"><LogOut className="mr-2 h-4 w-4" />Salir del Panel de {currentAdminClub.name}</Button>
            </div>
            {!showPanelContent ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {adminPanelOptions.map(option => {
                        const Icon = option.icon;
                        return (
                            <Button
                                key={option.value}
                                variant="outline"
                                className="w-full justify-start text-left px-4 py-3 text-base h-auto flex items-center gap-3 rounded-lg shadow-sm border"
                                onClick={() => { setActivePanelValue(option.value); setShowPanelContent(true); }}
                            >
                                <Icon className="mr-1.5 h-5 w-5 text-primary" />
                                {option.label}
                            </Button>
                        );
                    })}
                </div>
            ) : currentPanel ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                                <currentPanel.icon className="mr-2 h-5 w-5 text-primary" /> {currentPanel.label}
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setShowPanelContent(false)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Menú
                            </Button>
                        </div>
                        {currentPanel.contentDescription && <CardDescription>{currentPanel.contentDescription}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        {currentPanel.componentFactory({
                            club: currentAdminClub,
                            instructors,
                            clubPadelCourts,
                            pointTransactions,
                            studentPointBalances,
                            loading: loadingData,
                            onDataChanged: handleDataChanged,
                            onClubSettingsUpdated: handleClubSettingsUpdated,
                            onActivityAdded: handleActivityAdded,
                            onEventCreated: handleEventCreated
                        })}
                    </CardContent>
                </Card>
            ) : null}
             {editingInstructor && (<EditInstructorDialog instructor={editingInstructor} isOpen={!!editingInstructor} onClose={handleCloseEditDialog} />)}
        </>
    );
};

export default AdminPanel;

    

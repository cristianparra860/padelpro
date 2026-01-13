// src/app/(app)/admin/components/ClubActivityCalendar.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addMinutes, startOfDay, setHours, setMinutes, isBefore, isSameDay, isAfter, differenceInMinutes, parseISO, addDays, isEqual, getDay, parse, areIntervalsOverlapping } from 'date-fns';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { es } from 'date-fns/locale';
import type { Club, ClubLevelRange, TimeSlot, Match, PadelCourt, PadelLevelRange, DayOfWeek, MatchPadelLevel, ClassPadelLevel, PadelCategoryForSlot, User, Instructor, MatchDayEvent } from '@/types';
import { getMockTimeSlots, fetchMatches, fetchPadelCourtsByClub, isSlotEffectivelyCompleted, getMockClubs, getMockStudents, getMockInstructors, fetchMatchDayEventsForDate, findAvailableCourt } from '@/lib/mockData';
import { daysOfWeek as dayOfWeekArray, matchPadelLevels, displayClassLevel, displayClassCategory, numericMatchPadelLevels, displayActivityStatusWithDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import DateNavigation from './DateNavigation';
import { cn } from '@/lib/utils';
import { AlertTriangle, CalendarDays, Info, Palette, CheckCircle, Users, UserCircle as UserIcon, List, Clock, Hash, Trophy, Users2, CircleCheckBig, BarChartHorizontal, Lock, ListFilter, PaletteIcon, CaseSensitive, Pilcrow, GripVertical, PartyPopper, UserCog } from 'lucide-react';
import InstructorSelectionPanel from './InstructorSelectionPanel';
import ClassInscriptionVisualizer from './ClassInscriptionVisualizer';
import MatchInscriptionVisualizer from './MatchInscriptionVisualizer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';


interface ActivityParticipant {
  id: string;
  name: string;
  level?: MatchPadelLevel;
  avatarUrl?: string;
}

interface CellActivityData {
  id: string;
  type: 'class' | 'match' | 'provisional_match' | 'match-day';
  title: string;
  startTime: Date;
  endTime: Date;
  isConfirmed: boolean;
  confirmedSize?: number | null;
  rawActivity: TimeSlot | Match | MatchDayEvent;
  levelDisplay: string;
  categoryDisplay: string;
  bookedCount: number;
  maxCapacity: number;
  participants: ActivityParticipant[];
  status?: TimeSlot['status'] | Match['status'];
  levelRangeName?: string;
  levelRangeColor?: string;
  provisionalForUserName?: string;
  provisionalExpiresAt?: Date;
  assignedCourtNumber?: number;
}

interface CellContent {
  classes: CellActivityData[];
  matches: CellActivityData[];
  matchDays: CellActivityData[];
}

type ProcessedCalendarData = Record<number, Record<string, CellContent>>;

interface ClubActivityCalendarProps {
  club: Club;
  refreshKey: number;
  activityFilter?: 'clases' | 'partidas' | 'all';
}

const timeHeaders = Array.from({ length: (22 - 8) * 2 + 1 }, (_, i) => {
  const baseDate = startOfDay(new Date());
  return addMinutes(setHours(baseDate, 8), i * 30);
});

// Define a constant for the special "unclassified" range
const UNCLASSIFIED_RANGE: ClubLevelRange = { name: "Nivel Abierto / Por Clasificar", min: "1.0", max: "1.0", color: 'hsl(var(--muted-foreground))' };

// NEW: Define two separate virtual rows
const VIRTUAL_ROW_CLASSES: PadelCourt = { id: 'virtual-classes', clubId: 'virtual', courtNumber: -1, name: 'Clases Propuestas', isActive: true, capacity: 4 };
const VIRTUAL_ROW_MATCHES: PadelCourt = { id: 'virtual-matches', clubId: 'virtual', courtNumber: -2, name: 'Partidas Propuestas', isActive: true, capacity: 4 };

const levelRangeColors = [
  'hsl(210 100% 56%)',      // blue (primary)
  'hsl(142.1 76.2% 36.3%)', // green
  'hsl(24.6 95% 53.1%)',   // orange
  'hsl(346.8 77.2% 49.8%)', // red
  'hsl(262.1 83.3% 57.8%)', // violet
  'hsl(47.9 95.8% 53.1%)',  // yellow
];

const ClubActivityCalendar: React.FC<ClubActivityCalendarProps> = ({ club, refreshKey, activityFilter = 'all' }) => {
  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [clubPadelCourts, setClubPadelCourts] = useState<PadelCourt[]>([]);
  const [processedCalendarData, setProcessedCalendarData] = useState<ProcessedCalendarData>({});
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]); // 👨‍🏫 Instructores con clases este día
  const [visibleCourtNumbers, setVisibleCourtNumbers] = useState<number[]>([]);
  const [allActiveCourtNumbers, setAllActiveCourtNumbers] = useState<number[]>([]);
  const scrollRef = useDraggableScroll<HTMLDivElement>();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 👨‍🏫 INSTRUCTOR FILTER STATE
  // Initial state is null (show selection panel) unless there are no instructors, in which case we might default to all?
  // Actually, we want to force selection, so null is correct.
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [showInstructorPanel, setShowInstructorPanel] = useState<boolean>(true);

  // Sync with URL
  useEffect(() => {
    const instructorParam = searchParams.get('instructor');
    if (instructorParam) {
      setSelectedInstructorId(instructorParam);
      setShowInstructorPanel(false);
    } else {
      // If no param, show panel (unless explicitly closed before? No, simpler to just show it)
      setSelectedInstructorId(null);
      setShowInstructorPanel(true);
    }
  }, [searchParams]);

  // Close panel if user selects something (managed by handleSelectInstructor)
  const handleSelectInstructor = (id: string | null) => {
    setSelectedInstructorId(id);

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set('instructor', id);
    } else {
      params.delete('instructor');
    }
    router.replace(`${pathname}?${params.toString()}`);

    setShowInstructorPanel(false);
  };


  useEffect(() => {
    const loadStudents = async () => {
      const students = await getMockStudents();
      setAllStudents(students);
    };
    loadStudents();
  }, []);

  const isActivityInLevelRange = useCallback((
    activityLevel: ClassPadelLevel | MatchPadelLevel,
    clubRange: ClubLevelRange
  ): boolean => {
    if (activityLevel === 'abierto') return false;

    const clubMin = parseFloat(clubRange.min);
    const clubMax = parseFloat(clubRange.max);
    if (isNaN(clubMin) || isNaN(clubMax)) return false;

    if (typeof activityLevel === 'object' && 'min' in activityLevel && 'max' in activityLevel) {
      const activityMin = parseFloat(activityLevel.min);
      const activityMax = parseFloat(activityLevel.max);
      if (isNaN(activityMin) || isNaN(activityMax)) return false;
      return activityMin >= clubMin && activityMax <= clubMax;
    } else if (typeof activityLevel === 'string' && numericMatchPadelLevels.includes(activityLevel as Exclude<MatchPadelLevel, 'abierto' | PadelLevelRange>)) {
      const activityNum = parseFloat(activityLevel);
      return !isNaN(activityNum) && activityNum >= clubMin && activityNum <= clubMax;
    }
    return false;
  }, []);


  const fetchAndProcessData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [fetchedTimeSlotsAll, fetchedMatches, fetchedCourts, fetchedInstructors, fetchedMatchDayEvents] = await Promise.all([
        getMockTimeSlots(),
        fetchMatches(club.id),
        fetchPadelCourtsByClub(club.id),
        getMockInstructors(),
        fetchMatchDayEventsForDate(currentDate, club.id),
      ]);
      const fetchedTimeSlots = (fetchedTimeSlotsAll || []).filter(s => s.clubId === club.id);
      setAllInstructors(fetchedInstructors);

      // 👨‍🏫 Filter instructors who have classes ON THIS DAY
      const validSlotsForDay = fetchedTimeSlots.filter(slot =>
        isSameDay(new Date(slot.startTime), currentDate) &&
        (slot.status === 'pre_registration' || slot.status === 'confirmed' || slot.status === 'confirmed_private' || slot.status === 'forming')
      );

      const instructorsWithClassesIds = new Set(validSlotsForDay.map(slot => slot.instructorId));

      const dayInstructors = fetchedInstructors.filter(inst => instructorsWithClassesIds.has(inst.id));

      // 👻 Handle "Ghost" Instructors (present in slots but not in instructor DB)
      instructorsWithClassesIds.forEach(id => {
        if (!dayInstructors.find(i => i.id === id)) {
          const slot = validSlotsForDay.find(s => s.instructorId === id);
          if (slot) {
            dayInstructors.push({
              id: id,
              name: slot.instructorName,
              profilePictureUrl: slot.instructorProfilePicture,
              isAvailable: true,
              assignedClubId: club.id,
              clubId: club.id, // Support generic User prop just in case
              // Add minimal required fields to satisfy type
              email: '',
              createdAt: new Date(),
            } as Instructor);
          }
        }
      });

      setAvailableInstructors(dayInstructors);

      const activeCourts = fetchedCourts.filter(c => c.isActive).sort((a, b) => a.courtNumber - b.courtNumber);
      setClubPadelCourts(activeCourts);

      const allCourtNumbersWithVirtual = [VIRTUAL_ROW_CLASSES.courtNumber, VIRTUAL_ROW_MATCHES.courtNumber, ...activeCourts.map(c => c.courtNumber)];
      setAllActiveCourtNumbers(allCourtNumbersWithVirtual);
      setVisibleCourtNumbers(prevVisible => {
        if (prevVisible.length === 0 || !allCourtNumbersWithVirtual.every(num => prevVisible.includes(num)) || !prevVisible.every(num => allCourtNumbersWithVirtual.includes(num))) {
          return [...allCourtNumbersWithVirtual];
        }
        return prevVisible;
      });

      const newProcessedData: ProcessedCalendarData = {};

      allCourtNumbersWithVirtual.forEach(courtNum => {
        newProcessedData[courtNum] = {};
        timeHeaders.forEach(th => {
          newProcessedData[courtNum][format(th, 'HH:mm')] = { classes: [], matches: [], matchDays: [] };
        });
      });

      const levelRangesWithColors = (club.levelRanges || []).map((range, index) => ({
        ...range,
        color: range.color || levelRangeColors[index % levelRangeColors.length]
      }));

      const activitiesForSelectedDate = [
        ...fetchedTimeSlots.filter(slot =>
          (slot.status === 'pre_registration' || slot.status === 'confirmed' || slot.status === 'confirmed_private' || slot.status === 'forming') &&
          isSameDay(new Date(slot.startTime), currentDate) && (activityFilter === 'all' || activityFilter === 'clases') &&
          (selectedInstructorId === null || slot.instructorId === selectedInstructorId) // 👨‍🏫 Filter by instructor
        ).map(s => ({ ...s, _activityType: 'class' } as const)),
        ...fetchedMatches.filter(match =>
          (match.status === 'confirmed' || match.status === 'confirmed_private' || match.status === 'forming' || match.isPlaceholder) &&
          isSameDay(new Date(match.startTime), currentDate) && (activityFilter === 'all' || activityFilter === 'partidas')
        ).map(m => ({ ...m, _activityType: 'match' } as const))
      ];

      // Build a quick lookup of confirmed class intervals per instructor for the selected date
      const confirmedIntervalsByInstructor = new Map<string, { start: Date, end: Date }[]>();
      fetchedTimeSlots
        .filter(s => (s.status === 'confirmed' || s.status === 'confirmed_private') && isSameDay(new Date(s.startTime), currentDate))
        .forEach(s => {
          const key = s.instructorId;
          const arr = confirmedIntervalsByInstructor.get(key) || [];
          arr.push({ start: new Date(s.startTime), end: new Date(s.endTime) });
          confirmedIntervalsByInstructor.set(key, arr);
        });

      const occupiedCourtIntervals: Record<number, { start: Date, end: Date }[]> = {};

      activitiesForSelectedDate.forEach(activity => {
        const activityStartTime = new Date(activity.startTime);
        const activityEndTime = new Date(activity.endTime);

        let assignedCourtNumber: number | undefined = activity.courtNumber;
        let isProposal = (activity.bookedPlayers || []).length === 0;

        // Hide proposals that overlap a confirmed class for the same instructor (non-inclusive)
        if (activity._activityType === 'class' && isProposal) {
          const slot = activity as TimeSlot;
          const intervals = confirmedIntervalsByInstructor.get(slot.instructorId) || [];
          const overlapsConfirmed = intervals.some(iv => areIntervalsOverlapping({ start: activityStartTime, end: activityEndTime }, iv, { inclusive: false }));
          if (overlapsConfirmed) {
            return; // Skip adding this proposal to the calendar
          }
        }

        if (isProposal) {
          assignedCourtNumber = activity._activityType === 'class' ? VIRTUAL_ROW_CLASSES.courtNumber : VIRTUAL_ROW_MATCHES.courtNumber;
        } else if (!assignedCourtNumber) {
          // Find an available court for activities with players but no assigned court yet
          const court = findAvailableCourt(club.id, activityStartTime, activityEndTime);
          if (court) {
            assignedCourtNumber = court.courtNumber;
            if (!occupiedCourtIntervals[assignedCourtNumber]) occupiedCourtIntervals[assignedCourtNumber] = [];
            occupiedCourtIntervals[assignedCourtNumber].push({ start: activityStartTime, end: activityEndTime });
          } else {
            // If no court is available, place it in the virtual row
            assignedCourtNumber = activity._activityType === 'class' ? VIRTUAL_ROW_CLASSES.courtNumber : VIRTUAL_ROW_MATCHES.courtNumber;
          }
        }

        const activityCourt = assignedCourtNumber;
        const timeKey = format(activityStartTime, 'HH:mm');

        if (!newProcessedData[activityCourt]?.[timeKey]) {
          if (!newProcessedData[activityCourt]) newProcessedData[activityCourt] = {};
          newProcessedData[activityCourt][timeKey] = { classes: [], matches: [], matchDays: [] };
        }

        let rangeName: string | undefined;
        let rangeColor: string | undefined;
        const isPlaceholderActivity = (activity._activityType === 'class' && activity.status === 'forming' && (activity.bookedPlayers || []).length === 0) || (activity._activityType === 'match' && (activity as Match).isPlaceholder);

        if (isPlaceholderActivity || activity.level === 'abierto') {
          rangeName = UNCLASSIFIED_RANGE.name;
          rangeColor = UNCLASSIFIED_RANGE.color;
        } else {
          const foundRange = levelRangesWithColors.find(range => isActivityInLevelRange(activity.level, range));
          if (foundRange) {
            rangeName = foundRange.name;
            rangeColor = foundRange.color;
          } else {
            rangeName = UNCLASSIFIED_RANGE.name;
            rangeColor = UNCLASSIFIED_RANGE.color;
          }
        }

        let cellData: Partial<CellActivityData>;
        let participants: ActivityParticipant[] = [];

        if (activity._activityType === 'class') {
          const slot = activity as TimeSlot;
          const { completed, size } = isSlotEffectivelyCompleted(slot);
          participants = (slot.bookedPlayers || []).map(p => {
            const student = allStudents.find(s => s.id === p.userId);
            return { id: p.userId, name: student?.name || p.userId.substring(0, 8), level: student?.level, avatarUrl: student?.profilePictureUrl };
          });
          cellData = {
            id: `ts-${slot.id}`, type: 'class', title: slot.instructorId,
            startTime: activityStartTime, endTime: new Date(slot.endTime),
            isConfirmed: completed, confirmedSize: size, rawActivity: slot,
            levelDisplay: displayClassLevel(slot.level), categoryDisplay: displayClassCategory(slot.category),
            bookedCount: (slot.bookedPlayers || []).length, maxCapacity: slot.maxPlayers,
            participants, status: slot.status, levelRangeName: rangeName, levelRangeColor: rangeColor,
            assignedCourtNumber: assignedCourtNumber,
          };
          newProcessedData[activityCourt][timeKey].classes.push(cellData as CellActivityData);
        } else {
          const match = activity as Match;
          const isMatchFullConfirmedOrPrivate = (match.status === 'confirmed_private') || ((match.bookedPlayers || []).length === 4 && (match.status === 'confirmed'));
          participants = (match.bookedPlayers || []).map(p => {
            const student = allStudents.find(s => s.id === p.userId);
            return { id: p.userId, name: student?.name || p.userId.substring(0, 8), level: student?.level, avatarUrl: student?.profilePictureUrl };
          });
          cellData = {
            id: `m-${match.id}`, type: 'match', title: `Partida Nivel ${match.level}`,
            startTime: activityStartTime, endTime: new Date(match.endTime),
            isConfirmed: isMatchFullConfirmedOrPrivate,
            confirmedSize: match.status === 'confirmed_private' ? 4 : (isMatchFullConfirmedOrPrivate ? 4 : null),
            rawActivity: match,
            levelDisplay: (match.level === 'abierto' ? 'Nivel Abierto' : String(match.level)), categoryDisplay: displayClassCategory(match.category),
            bookedCount: (match.bookedPlayers || []).length, maxCapacity: 4,
            participants, status: match.status, levelRangeName: rangeName, levelRangeColor: rangeColor,
            assignedCourtNumber: assignedCourtNumber,
          };
          newProcessedData[activityCourt][timeKey].matches.push(cellData as CellActivityData);
        }
      });

      // Process Match-Day Event
      if ((activityFilter === 'all' || activityFilter === 'partidas') && fetchedMatchDayEvents && fetchedMatchDayEvents.length > 0) {
        fetchedMatchDayEvents.forEach(event => {
          const eventStartTime = new Date(event.eventDate);
          const eventEndTime = event.eventEndTime ? new Date(event.eventEndTime) : addMinutes(eventStartTime, 180);
          const timeKey = format(eventStartTime, 'HH:mm');

          event.courtIds.forEach(courtId => {
            const court = fetchedCourts.find(c => c.id === courtId);
            if (court) {
              if (!newProcessedData[court.courtNumber]) {
                newProcessedData[court.courtNumber] = {};
              }
              if (!newProcessedData[court.courtNumber][timeKey]) {
                newProcessedData[court.courtNumber][timeKey] = { classes: [], matches: [], matchDays: [] };
              }
              const cellData: CellActivityData = {
                id: `md-${event.id}-${court.id}`,
                type: 'match-day',
                title: event.name,
                startTime: eventStartTime,
                endTime: eventEndTime,
                isConfirmed: true,
                rawActivity: event,
                levelDisplay: 'Evento',
                categoryDisplay: '',
                bookedCount: event.maxPlayers,
                maxCapacity: event.maxPlayers,
                participants: [],
                status: 'confirmed',
                levelRangeName: 'Evento Match-Day',
                levelRangeColor: 'hsl(30 95% 53.1%)', // Orange color for events
                assignedCourtNumber: court.courtNumber,
              };
              newProcessedData[court.courtNumber][timeKey].matchDays.push(cellData);
            }
          });
        });
      }


      setProcessedCalendarData(newProcessedData);
    } catch (error) {
      console.error("Error fetching activity calendar data:", error);
      setProcessedCalendarData({});
    } finally {
      setLoading(false);
    }
  }, [club.id, club.levelRanges, currentDate, isActivityInLevelRange, refreshKey, allStudents, activityFilter, selectedInstructorId]);

  useEffect(() => {
    if (allStudents.length > 0) {
      fetchAndProcessData();
    }
  }, [fetchAndProcessData, allStudents.length]);

  const dateStripDates = useMemo(() => {
    const todayAnchor = startOfDay(new Date());
    return Array.from({ length: 22 }, (_, i) => addDays(todayAnchor, i));
  }, []);

  const getCellSpan = (activity: CellActivityData): number => {
    if (!activity.isConfirmed && activity.type === 'class' && (activity.rawActivity as TimeSlot).bookedPlayers.length === 0) {
      return 1;
    }
    const durationMinutes = differenceInMinutes(new Date(activity.endTime), new Date(activity.startTime));
    return Math.max(1, Math.ceil(durationMinutes / 30));
  };


  const courtsToDisplay = useMemo(() => {
    const realCourts = clubPadelCourts.filter(court => visibleCourtNumbers.includes(court.courtNumber));
    const virtualRows: PadelCourt[] = [];
    if (visibleCourtNumbers.includes(VIRTUAL_ROW_CLASSES.courtNumber)) virtualRows.push(VIRTUAL_ROW_CLASSES);
    if (visibleCourtNumbers.includes(VIRTUAL_ROW_MATCHES.courtNumber)) virtualRows.push(VIRTUAL_ROW_MATCHES);

    return [...virtualRows, ...realCourts];
  }, [clubPadelCourts, visibleCourtNumbers]);

  const handleCourtSelectionChange = (courtNumber: number) => {
    setVisibleCourtNumbers(prev =>
      prev.includes(courtNumber)
        ? prev.filter(cn => cn !== courtNumber)
        : [...prev, courtNumber]
    );
  };

  const handleSelectAllCourts = (select: boolean) => {
    setVisibleCourtNumbers(select ? allActiveCourtNumbers : []);
  };

  const hasAnyActivityForSelectedDateAndCourts = useMemo(() => {
    if (loading) return true;
    for (const courtNumberStr in processedCalendarData) {
      const courtNumber = parseInt(courtNumberStr, 10);
      if (visibleCourtNumbers.includes(courtNumber)) {
        for (const timeKey in processedCalendarData[courtNumber]) {
          const cellContent = processedCalendarData[courtNumber][timeKey];
          if (cellContent.classes.length > 0 || cellContent.matches.length > 0 || cellContent.matchDays.length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, [processedCalendarData, loading, visibleCourtNumbers]);

  const renderUnassignedProposals = (activities: CellActivityData[], type: 'class' | 'match') => {
    if (activities.length === 0) return null;

    const activityTypeLabel = type === 'class' ? 'Clase' : 'Partida';
    const bgColor = type === 'class' ? 'bg-orange-100' : 'bg-teal-50';
    const hoverBgColor = type === 'class' ? 'hover:bg-orange-200' : 'hover:bg-teal-100';
    const textColor = type === 'class' ? 'text-orange-800' : 'text-teal-800';
    const iconColor = type === 'class' ? 'text-orange-600' : 'text-teal-600';
    const Icon = type === 'class' ? UserIcon : Trophy;

    return (
      <div className="h-full w-full flex flex-col items-stretch justify-start p-px gap-px overflow-hidden">
        {activities.slice(0, 4).map((activity) => {
          const instructorForActivity = type === 'class' ? allInstructors.find(inst => inst.id === activity.title) : null;
          return (
            <TooltipProvider key={activity.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex-1 rounded-sm flex items-center justify-start text-left p-0.5 min-h-[1rem] transition-colors", bgColor, hoverBgColor)}>
                    {instructorForActivity ? (
                      <Avatar className="h-3.5 w-3.5 mr-1 flex-shrink-0">
                        <AvatarImage src={instructorForActivity.profilePictureUrl} alt={instructorForActivity.name} data-ai-hint="instructor profile photo tiny" />
                        <AvatarFallback className="text-[7px]">{getInitials(instructorForActivity.name || '')}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Icon className={cn("h-3 w-3 mr-1 flex-shrink-0", iconColor)} />
                    )}
                    <p className={cn("text-[8px] font-semibold truncate", textColor)}>
                      {type === 'class' && instructorForActivity ? instructorForActivity.name.split(' ')[0] : 'Partida'}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{activityTypeLabel} Propuesta {type === 'class' && instructorForActivity ? `con ${instructorForActivity.name}` : ''}</p>
                  <p>Hora: {format(activity.startTime, 'HH:mm')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
        {activities.length > 4 && (
          <div className={cn("flex-1 rounded-sm flex items-center justify-center text-center p-0.5 min-h-[1rem]", bgColor)}>
            <p className={cn("text-[8px] font-semibold", textColor)}>+{activities.length - 4} más...</p>
          </div>
        )}
      </div>
    );
  };

  const renderActivityCell = (activity: CellActivityData | undefined) => {
    if (!activity) {
      return <div className="h-full w-full"></div>;
    }

    const activityBaseClass = "h-full rounded-sm flex flex-col items-center justify-center text-white text-wrap break-words relative shadow hover:shadow-md transition-shadow";
    let activitySpecificClass = "";
    let visualizerComponent;

    if (activity.type === 'class') {
      activitySpecificClass = activity.status === 'confirmed_private' ? "bg-purple-100 hover:bg-purple-200"
        : activity.isConfirmed ? "bg-green-100 hover:bg-green-200"
          : "bg-blue-100 hover:bg-blue-200";
      visualizerComponent = <ClassInscriptionVisualizer timeSlot={activity.rawActivity as TimeSlot} />;
    } else if (activity.type === 'provisional_match') {
      activitySpecificClass = "bg-gray-100 hover:bg-gray-200";
      visualizerComponent = <Lock className="h-5 w-5 text-gray-400" />
    } else if (activity.type === 'match-day') {
      activitySpecificClass = "bg-orange-100 hover:bg-orange-200";
      visualizerComponent = <PartyPopper className="h-5 w-5 text-orange-500" />;
    } else { // match
      const isMatchFullConfirmedOrPrivate = (activity.status === 'confirmed_private') || (activity.isConfirmed && activity.status === 'confirmed');
      activitySpecificClass = isMatchFullConfirmedOrPrivate
        ? "bg-rose-100 hover:bg-rose-200"
        : (activity.rawActivity as Match).isPlaceholder ? "bg-orange-100 hover:bg-orange-200"
          : "bg-indigo-100 hover:bg-indigo-200";
      visualizerComponent = <MatchInscriptionVisualizer match={activity.rawActivity as Match} isConfirmed={activity.isConfirmed} />;
    }

    const borderStyle = activity.levelRangeColor ? {
      borderColor: activity.levelRangeColor,
      borderWidth: '2px',
      boxShadow: `0 0 5px -1px ${activity.levelRangeColor}`
    } : {};

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(activityBaseClass, activitySpecificClass, "p-0")} style={borderStyle}>
              <div className="flex items-center justify-center h-full w-full">
                {visualizerComponent}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="p-2 max-w-xs bg-background text-foreground border shadow-lg rounded-md text-xs">
            {activity.type === 'provisional_match' ? (
              <>
                <p className="font-semibold mb-1">{activity.title}</p>
                <p>Hora: {format(activity.startTime, 'HH:mm')} - {format(activity.endTime, 'HH:mm')}</p>
                {activity.provisionalExpiresAt && <p>Expira: {format(new Date(activity.provisionalExpiresAt), 'dd/MM HH:mm')}</p>}
              </>
            ) : activity.type === 'match-day' ? (
              <>
                <p className="font-semibold mb-1">{activity.title}</p>
                <p>Hora: {format(activity.startTime, 'HH:mm')} - {format(activity.endTime, 'HH:mm')}</p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">{activity.title} ({activity.type === 'class' ? (activity.bookedCount > 0 ? 'Clase' : 'Clase Propuesta') : 'Partida'})</p>
                <p>Hora: {format(activity.startTime, 'HH:mm')} - {format(activity.endTime, 'HH:mm')}</p>
                {activity.levelRangeName && (
                  <p>Rango: <span className="font-medium" style={{ color: activity.levelRangeColor }}>{activity.levelRangeName}</span></p>
                )}
                <p>Nivel: {activity.levelDisplay}, Cat: {activity.categoryDisplay}</p>
                <p>Inscritos: {activity.bookedCount}/{activity.maxCapacity}</p>
                {activity.status && (
                  <p>Estado: {displayActivityStatusWithDetails(
                    { rawActivity: activity.rawActivity as (TimeSlot | Match), status: activity.status },
                    activity.type === 'class' ? allInstructors.find(i => i.id === (activity.rawActivity as TimeSlot).instructorId) : undefined
                  )}</p>
                )}
                {activity.participants.length > 0 && (
                  <div className="mt-1 pt-1 border-t">
                    <p className="font-medium text-[10px] mb-0.5">Participantes:</p>
                    <div className="flex flex-wrap gap-1">
                      {activity.participants.map(p => (
                        <TooltipProvider key={p.id} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-6 w-6 border-2 border-white">
                                <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="student avatar small" />
                                <AvatarFallback className="text-[8px]">{getInitials(p.name)}</AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs p-1 bg-black text-white rounded-sm">
                              <p>{p.name} (N: {p.level || '?'})</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (!club.levelRanges || club.levelRanges.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" /> Calendario de Actividad del Club</CardTitle>
          <CardDescription>Club: {club.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center bg-yellow-50 border border-yellow-300 rounded-md">
            <AlertTriangle className="h-10 w-10 mx-auto text-yellow-500 mb-3" />
            <p className="font-semibold text-yellow-700">Configuración Requerida</p>
            <p className="text-sm text-yellow-600 mt-1">
              Este club no tiene rangos de nivel definidos. Por favor, configúralos en el panel de administración para usar este calendario.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <CalendarDays className="mr-2 h-6 w-6 text-primary" />
          Calendario de Actividad del Club
        </CardTitle>
        <CardDescription>
          Visualize activities (classes and matches) by level ranges in {club.name}.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">

          {/* 👨‍🏫 Instructor Filter Button */}
          <Button
            variant={selectedInstructorId ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap gap-2"
            onClick={() => setShowInstructorPanel(true)}
          >
            <UserCog className="h-4 w-4" />
            {selectedInstructorId
              ? (allInstructors.find(i => i.id === selectedInstructorId)?.name || 'Instructor seleccionado')
              : 'Filtrar Instructor'}
          </Button>

          <DateNavigation
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            dateStripDates={dateStripDates}
            isToday={(d) => isSameDay(d, startOfDay(new Date()))}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap">
                <ListFilter className="mr-1.5 h-4 w-4" />
                Filtrar Pistas ({visibleCourtNumbers.length}/{allActiveCourtNumbers.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mostrar Pistas y Propuestas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleCourtNumbers.length === allActiveCourtNumbers.length && allActiveCourtNumbers.length > 0}
                onCheckedChange={(checked) => handleSelectAllCourts(!!checked)}
              >
                (Todas)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleCourtNumbers.length === 0}
                onCheckedChange={(checked) => handleSelectAllCourts(!checked)}
              >
                (Ninguna)
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                key={VIRTUAL_ROW_CLASSES.id}
                checked={visibleCourtNumbers.includes(VIRTUAL_ROW_CLASSES.courtNumber)}
                onCheckedChange={() => handleCourtSelectionChange(VIRTUAL_ROW_CLASSES.courtNumber)}
              >
                {VIRTUAL_ROW_CLASSES.name}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                key={VIRTUAL_ROW_MATCHES.id}
                checked={visibleCourtNumbers.includes(VIRTUAL_ROW_MATCHES.courtNumber)}
                onCheckedChange={() => handleCourtSelectionChange(VIRTUAL_ROW_MATCHES.courtNumber)}
              >
                {VIRTUAL_ROW_MATCHES.name}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Pistas Físicas</DropdownMenuLabel>
              {clubPadelCourts.map(court => (
                <DropdownMenuCheckboxItem
                  key={court.id}
                  checked={visibleCourtNumbers.includes(court.courtNumber)}
                  onCheckedChange={() => handleCourtSelectionChange(court.courtNumber)}
                >
                  {court.name} (Pista {court.courtNumber})
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[70vh] w-full" />
          </div>
        ) : (!hasAnyActivityForSelectedDateAndCourts && visibleCourtNumbers.length > 0) ? (
          <div className="py-10 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-semibold text-foreground">Sin Actividad Programada</p>
            <p className="text-muted-foreground">No hay actividades para esta fecha en las pistas seleccionadas.</p>
          </div>
        ) : visibleCourtNumbers.length === 0 ? (
          <div className="py-10 text-center">
            <ListFilter className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-semibold text-foreground">Selecciona Pistas</p>
            <p className="text-muted-foreground">Usa el filtro para mostrar pistas en el calendario.</p>
          </div>
        ) : (
          <div ref={scrollRef} className="w-full whitespace-nowrap border rounded-md shadow-sm overflow-auto no-scrollbar">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-30 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="sticky left-0 z-20 bg-muted/80 p-2 border-r text-xs font-semibold text-muted-foreground w-20 h-10">
                    Pista
                  </th>
                  {timeHeaders.map((timeHeader, index) => (
                    <th key={index} className="p-1 border-r text-[10px] font-medium text-muted-foreground w-0.5 h-10 overflow-hidden" style={{ minWidth: '0.125rem' }}>
                      <span className={cn(index % 2 === 0 ? "visible" : "invisible sm:visible")}>{format(timeHeader, 'HH:mm')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courtsToDisplay.map((court) => {
                  let skippedCells = 0;
                  return (
                    <tr key={court.id} className="border-b h-14">
                      <td className="sticky left-0 z-10 bg-background p-1.5 border-r text-xs font-medium text-center align-middle w-20 h-14">
                        <div className="flex items-center justify-center flex-col">
                          {court.courtNumber < 0 ? ( // Is a virtual row
                            <span className="font-bold text-primary">{court.name}</span>
                          ) : (
                            <span className="font-semibold">Pista {court.courtNumber}</span>
                          )}
                          {court.courtNumber > 0 && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[60px] mx-auto">{court.name}</div>
                          )}
                        </div>
                      </td>
                      {timeHeaders.map((timeHeader, idx) => {
                        if (skippedCells > 0) {
                          skippedCells--;
                          return null;
                        }
                        const timeKeyToLookup = format(timeHeader, 'HH:mm');
                        const cellContent = processedCalendarData[court.courtNumber]?.[timeKeyToLookup] || { classes: [], matches: [], matchDays: [] };

                        let cellElement: React.ReactNode;
                        let activitySpan = 1;

                        const isUnassignedClassesCell = court.courtNumber === VIRTUAL_ROW_CLASSES.courtNumber;
                        const isUnassignedMatchesCell = court.courtNumber === VIRTUAL_ROW_MATCHES.courtNumber;

                        if (isUnassignedClassesCell) {
                          cellElement = <div className="h-full w-full flex flex-col gap-px">{renderUnassignedProposals(cellContent.classes, 'class')}</div>;
                        } else if (isUnassignedMatchesCell) {
                          cellElement = <div className="h-full w-full flex flex-col gap-px">{renderUnassignedProposals(cellContent.matches, 'match')}</div>;
                        } else {
                          const allActivitiesInCell = [...cellContent.classes, ...cellContent.matches, ...cellContent.matchDays];
                          const firstActivity = allActivitiesInCell.length > 0 ? allActivitiesInCell[0] : undefined;
                          cellElement = renderActivityCell(firstActivity);
                          if (firstActivity) {
                            activitySpan = getCellSpan(firstActivity);
                          }
                        }

                        if (activitySpan > 1) {
                          skippedCells = activitySpan - 1;
                        }
                        return (
                          <td key={`${court.id}-${timeHeader.toISOString()}`}
                            className="p-0.5 border-r text-[9px] text-center align-top relative h-14"
                            colSpan={activitySpan}
                            style={{ minWidth: `${activitySpan * 0.125}rem` }}>
                            {cellElement}
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <InstructorSelectionPanel
        instructors={availableInstructors} // 👨‍🏫 Show only instructors with classes today
        selectedInstructorId={selectedInstructorId}
        onSelect={handleSelectInstructor}
        isOpen={showInstructorPanel}
        onClose={() => {
          setShowInstructorPanel(false);
        }}
      />
    </Card>
  );
};

export default ClubActivityCalendar;

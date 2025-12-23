'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EditableCell } from '@/components/admin/EditableCell';
import { ImageUpload } from '@/components/admin/ImageUpload';
import ClubCalendar from '@/components/admin/ClubCalendar2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Database, 
  Users, 
  Calendar, 
  Bookmark, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Eye,
  Download,
  HardHat,
  Trophy,
  CalendarDays,
  DollarSign,
  Settings,
  Clock,
  MapPin,
  CalendarCheck,
  CheckSquare,
  CreditCard,
  Play,
  Settings2,
  ToggleLeft,
  Euro,
  Save,
  Pencil,
  Repeat,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import AdminBookingCard from '@/components/admin/AdminBookingCard';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  clubId?: string | null;
  createdAt: string;
}

interface TimeSlot {
  id: string;
  clubId: string;
  courtId: string | null;
  instructorId: string | null;
  start: string;
  end: string;
  maxPlayers: number;
  totalPrice: number | null;
  level: string | null;
  category: string | null;
  createdAt: string;
}

interface BookingWithTimeSlot {
  id: string;
  userId: string;
  groupSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    profilePictureUrl?: string;
  };
  timeSlot: {
    id: string;
    start: string;
    end: string;
    level: string;
    category: string;
    totalPrice: number;
    maxPlayers: number;
    totalPlayers: number;
    instructor: {
      name: string;
      profilePictureUrl?: string;
    };
    court: {
      number: number;
    };
  };
}

// Legacy interface for other parts of the component
interface Booking {
  id: string;
  userId: string;
  timeSlotId: string;
  groupSize: number;
  status: string;
  createdAt: string;
  userName: string | null;
  userLevel: string | null;
  userGender: string | null;
  start: string;
  end: string;
  maxPlayers: number;
  totalPrice: number | null;
  classLevel: string | null;
  classCategory: string | null;
  instructorName: string | null;
  instructorProfilePicture: string | null;
  courtNumber: number | null;
  bookedPlayers: number;
}

interface Court {
  id: string;
  clubId: string;
  number: number;
  name: string;
  isActive: boolean;
  capacity: number;
  createdAt: string;
}

interface Match {
  id: string;
  clubId: string;
  courtId: string | null;
  date: string;
  time: string;
  level: string;
  maxPlayers: number;
  price: number;
  status: string;
  createdAt: string;
}

export default function DatabaseAdminPanel() {
  const { toast } = useToast();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsForCards, setBookingsForCards] = useState<BookingWithTimeSlot[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClubId, setSelectedClubId] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<string>('super-admin');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedClubForFilter, setSelectedClubForFilter] = useState<string>('all'); // Nuevo selector de club independiente
  const [mounted, setMounted] = useState(false);
  const [bookingsFilter, setBookingsFilter] = useState<'all' | 'confirmed' | 'pending' | 'past'>('pending');
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState<boolean>(false);
  const [showAddCreditDialog, setShowAddCreditDialog] = useState(false);
  const [showConvertBalanceDialog, setShowConvertBalanceDialog] = useState(false);
  
  // Estados para edición
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingClub, setEditingClub] = useState<any | null>(null);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [editedProfileData, setEditedProfileData] = useState<{
    name: string;
    email: string;
    level: string;
    phone: string;
    profilePictureUrl: string;
  }>({
    name: '',
    email: '',
    level: '',
    phone: '',
    profilePictureUrl: ''
  });
  
  // Usar useRef para rastrear si el componente está montado y evitar memory leaks
  const isMountedRef = useRef(true);

  // Estados para formularios
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'PLAYER',
    level: 'abierto',
    clubId: 'auto-assign'
  });

  const [newClub, setNewClub] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    adminId: ''
  });

  const [clubSettings, setClubSettings] = useState<{[key: string]: any}>({});

  // Estado para franjas horarias de precios
  const [priceSlots, setPriceSlots] = useState<{[clubId: string]: any[]}>({});
  const [newPriceSlot, setNewPriceSlot] = useState({
    clubId: '',
    name: '',
    startTime: '09:00',
    endTime: '12:00',
    price: 10,
    daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
    priority: 0
  });
  const [editingPriceSlot, setEditingPriceSlot] = useState<any>(null);
  const [isPriceSlotDialogOpen, setIsPriceSlotDialogOpen] = useState(false);

  const [newInstructor, setNewInstructor] = useState({
    userId: '',
    clubId: '',
    specialties: '',
    experience: ''
  });

  const [editingInstructor, setEditingInstructor] = useState<any>(null);
  const [isEditInstructorDialogOpen, setIsEditInstructorDialogOpen] = useState(false);

  // Estado para el usuario actual (simulado por ahora)
  const [newSuperAdmin, setNewSuperAdmin] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [newClubAdmin, setNewClubAdmin] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    clubId: '',
    phone: ''
  });

  const [newCourt, setNewCourt] = useState({
    clubId: '',
    number: 1,
    name: '',
    capacity: 4,
    isActive: true
  });

  // Estados para añadir crédito
  const [creditUserId, setCreditUserId] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditConcept, setCreditConcept] = useState<string>('Recarga de saldo');

  // Verificar permisos de acceso
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          setHasAccess(false);
          return;
        }
        
        const data = await response.json();
        const userRole = data.user?.role;
        
        // Solo SUPER_ADMIN puede acceder
        if (userRole === 'SUPER_ADMIN') {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          toast({
            title: "Acceso denegado",
            description: "Solo Super Administradores pueden acceder al panel de base de datos",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error verificando permisos:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [toast]);

  // Update newCourt clubId when profile changes
  useEffect(() => {
    const filteredData = getFilteredData();
    // Siempre actualizar el clubId cuando hay restricción de club
    if (filteredData.restrictToClub) {
      setNewCourt(prev => ({ ...prev, clubId: filteredData.restrictToClub || '' }));
    }
  }, [selectedProfile, selectedUserId, clubs]); // Añadido clubs para detectar cambios

  // Sincronizar selectedClubId con selectedClubForFilter solo cuando cambia el filtro
  useEffect(() => {
    if (selectedClubForFilter !== 'all') {
      setSelectedClubId(selectedClubForFilter);
    }
  }, [selectedClubForFilter]);

  const loadData = async (clubId: string = selectedClubId) => {
    if (!isMountedRef.current) return; // Evitar actualización si el componente está desmontado
    
    setLoading(true);
    try {
      // Determinar el club efectivo basado en el perfil y usuario seleccionado
      const filteredData = getFilteredData();
      const effectiveClubId = filteredData.restrictToClub || clubId;
      
      // Agregar parámetro clubId a las URLs si no es "all"
      const clubParam = effectiveClubId !== 'all' ? `?clubId=${effectiveClubId}` : '';
      
      console.log('🔍 LoadData - Profile:', selectedProfile, 'User:', selectedUserId, 'EffectiveClub:', effectiveClubId);
      
      // Cargar usuarios
      const usersResponse = await fetch(`/api/admin/users${clubParam}`);
      if (usersResponse.ok && isMountedRef.current) {
        const usersData = await usersResponse.json();
        if (isMountedRef.current) setUsers(usersData);
      }

      // Cargar timeslots  
      const timeSlotsResponse = await fetch(`/api/admin/timeslots${clubParam}`);
      if (timeSlotsResponse.ok && isMountedRef.current) {
        const timeSlotsData = await timeSlotsResponse.json();
        if (isMountedRef.current) setTimeSlots(timeSlotsData);
      }

      // Cargar bookings
      const bookingsResponse = await fetch(`/api/admin/bookings${clubParam}`);
      if (bookingsResponse.ok && isMountedRef.current) {
        const bookingsData = await bookingsResponse.json();
        
        if (isMountedRef.current) {
          // Para las tarjetas AdminBookingCard (estructura anidada)
          setBookingsForCards(bookingsData);
          
          // Para el resto del componente (estructura plana para compatibilidad)
          const flatBookings = bookingsData.map((booking: BookingWithTimeSlot) => ({
            id: booking.id,
            userId: booking.userId,
            timeSlotId: booking.timeSlot.id,
            groupSize: booking.groupSize,
            status: booking.status,
            createdAt: booking.createdAt,
            userName: booking.user.name,
            userLevel: 'intermedio', // Fallback
            userGender: null,
            start: booking.timeSlot.start,
            end: booking.timeSlot.end,
            maxPlayers: booking.timeSlot.maxPlayers,
            totalPrice: booking.timeSlot.totalPrice,
            classLevel: booking.timeSlot.level,
            classCategory: booking.timeSlot.category,
            instructorName: booking.timeSlot.instructor.name,
            instructorProfilePicture: booking.timeSlot.instructor.profilePictureUrl || null,
            courtNumber: booking.timeSlot.court.number,
            bookedPlayers: booking.timeSlot.totalPlayers
          }));
          
          setBookings(flatBookings);
        }
      }

      // Cargar administradores - filtrar según el club seleccionado
      const adminsResponse = await fetch(`/api/admin/admins${clubParam}`);
      if (adminsResponse.ok && isMountedRef.current) {
        const adminsData = await adminsResponse.json();
        if (isMountedRef.current) setAdmins(adminsData);
      }

      // Cargar clubes (siempre cargar todos para el selector)
      const clubsResponse = await fetch('/api/admin/clubs');
      console.log('🔍 Clubs response status:', clubsResponse.ok, clubsResponse.status);
      if (clubsResponse.ok && isMountedRef.current) {
        const clubsData = await clubsResponse.json();
        console.log('🔍 Clubs data received:', clubsData.length, clubsData);
        if (isMountedRef.current) setClubs(clubsData);
      } else {
        console.error('❌ Failed to load clubs:', clubsResponse.status);
      }

      // Cargar instructores
      const instructorsResponse = await fetch(`/api/admin/instructors${clubParam}`);
      if (instructorsResponse.ok && isMountedRef.current) {
        const instructorsData = await instructorsResponse.json();
        if (isMountedRef.current) setInstructors(instructorsData);
      }

      // Cargar pistas
      const courtsResponse = await fetch(`/api/admin/courts${clubParam}`);
      if (courtsResponse.ok && isMountedRef.current) {
        const courtsData = await courtsResponse.json();
        if (isMountedRef.current) setCourts(courtsData);
      }

      // Cargar franjas horarias de precios para cada club (usar clubsData ya cargado)
      if (clubs.length > 0 && isMountedRef.current) {
        const priceSlotsData: {[clubId: string]: any[]} = {};
        
        for (const club of clubs) {
          const priceSlotsResponse = await fetch(`/api/admin/clubs/${club.id}/price-slots`);
          if (priceSlotsResponse.ok && isMountedRef.current) {
            priceSlotsData[club.id] = await priceSlotsResponse.json();
          } else {
            priceSlotsData[club.id] = [];
          }
        }
        
        if (isMountedRef.current) setPriceSlots(priceSlotsData);
      }

      // Cargar partidas
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Error loading database data',
        variant: 'destructive'
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Marcar el componente como montado
    isMountedRef.current = true;
    setMounted(true);
    
    // Usar requestAnimationFrame para asegurar que el DOM esté listo
    const frame = requestAnimationFrame(() => {
      if (isMountedRef.current) {
        loadData();
      }
    });
    
    return () => {
      // Cleanup: marcar como desmontado y cancelar animación
      isMountedRef.current = false;
      cancelAnimationFrame(frame);
    };
  }, []); // Solo se ejecuta una vez al montar el componente

  const handleClubChange = (clubId: string) => {
    // Only allow club changes for super-admin or when no specific user is selected
    if (selectedProfile === 'super-admin' || selectedUserId === '') {
      setSelectedClubId(clubId);
      loadData(clubId);
    }
  };

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    setSelectedUserId(''); // Reset user selection when profile changes
    setActiveTab('overview'); // Reset to overview tab when profile changes
    
    // Auto-select club based on profile
    if (profile !== 'super-admin') {
      // For non-super-admin profiles, we'll auto-select the club once a user is selected
      // For now, keep the current club selection if valid
    }
  };

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    
    // Auto-seleccionar el club del usuario cuando no sea super admin
    if (selectedProfile !== 'super-admin' && userId) {
      if (selectedProfile === 'club-admin') {
        // Buscar el club del admin
        const adminClub = clubs.find(club => club.adminId === userId);
        if (adminClub) {
          setSelectedClubForFilter(adminClub.id);
        }
      } else if (selectedProfile === 'instructor') {
        // Buscar el club del instructor
        const instructor = instructors.find(inst => inst.id === userId);
        if (instructor?.clubId) {
          setSelectedClubForFilter(instructor.clubId);
        }
      } else if (selectedProfile === 'client') {
        // Buscar el club del cliente
        const user = users.find(u => u.id === userId);
        if (user?.clubId) {
          setSelectedClubForFilter(user.clubId);
        }
      }
    }
  };

  // Function to get available users based on selected profile
  const getAvailableUsers = () => {
    let usersToFilter = [];
    
    switch (selectedProfile) {
      case 'super-admin':
        // Combinar admins reales con super admins ficticios si no hay suficientes
        const realSuperAdmins = admins.filter(admin => admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN');
        const fictionalSuperAdmins = [
          { id: 'super-admin-1', name: 'Cristian Parra', email: 'cristian.parra@padelpro.com', role: 'SUPER_ADMIN' },
          { id: 'super-admin-2', name: 'Juan Martinez', email: 'juan.martinez@padelpro.com', role: 'SUPER_ADMIN' },
          { id: 'super-admin-3', name: 'Maria Rodriguez', email: 'maria.rodriguez@padelpro.com', role: 'SUPER_ADMIN' }
        ];
        
        // Si no hay suficientes super admins reales, agregar los ficticios
        const allSuperAdmins = realSuperAdmins.length > 0 ? realSuperAdmins : fictionalSuperAdmins;
        usersToFilter = [...allSuperAdmins, ...fictionalSuperAdmins.filter(f => !allSuperAdmins.find(r => r.name === f.name))];
        break;
        
      case 'club-admin':
        // Para administradores de club, mostrar administradores de TODOS los clubes disponibles
        const realClubAdmins = admins.filter(admin => admin.role === 'CLUB_ADMIN' || admin.role === 'ADMIN');
        
        // Crear administradores ficticios para TODOS los clubes
        const allClubs = clubs.length > 0 ? clubs : [
          { id: 'club-madrid', name: 'Club Padel Madrid', address: 'Madrid, España' },
          { id: 'club-barcelona', name: 'Club Padel Barcelona', address: 'Barcelona, España' }
        ];
        
        const fictionalClubAdmins = allClubs.flatMap((club, index) => {
          const adminNames = [
            ['Juan Pérez', 'María González'],
            ['Carlos Rodríguez', 'Ana Martínez'],
            ['Luis Fernández', 'Carmen López'],
            ['Diego Sánchez', 'Isabel Ruiz']
          ];
          
          const names = adminNames[index] || ['Admin Principal', 'Admin Secundario'];
          const cityName = club.name.includes('Madrid') ? 'madrid' : 
                          club.name.includes('Barcelona') ? 'barcelona' : 
                          club.name.toLowerCase().replace(/\s+/g, '').replace(/club/, '').replace(/padel/, '');
          
          return [
            { 
              id: `club-admin-${club.id}-1`, 
              name: names[0],
              email: `${names[0].toLowerCase().replace(/\s+/g, '').replace(/ñ/g, 'n')}@${cityName}.com`, 
              role: 'CLUB_ADMIN',
              clubId: club.id,
              clubName: club.name,
              position: 'Director General'
            },
            { 
              id: `club-admin-${club.id}-2`, 
              name: names[1],
              email: `${names[1].toLowerCase().replace(/\s+/g, '').replace(/ñ/g, 'n')}@${cityName}.com`, 
              role: 'CLUB_ADMIN',
              clubId: club.id,
              clubName: club.name,
              position: 'Administrador'
            }
          ];
        });
        
        usersToFilter = fictionalClubAdmins;
        break;
        
      case 'instructor':
        usersToFilter = instructors.map(inst => ({ ...inst, name: inst.name || 'Instructor sin nombre' }));
        break;
        
      case 'client':
        usersToFilter = users.filter(user => user.role === 'PLAYER');
        break;
        
      default:
        return [];
    }
    
    // Filtrar por club si se ha seleccionado uno específico
    if (selectedClubForFilter !== 'all') {
      usersToFilter = usersToFilter.filter(user => user.clubId === selectedClubForFilter);
    }
    
    return usersToFilter;
  };

  // Function to determine what data to show based on profile and user selection
  const getFilteredData = () => {
    // Si hay un club seleccionado explícitamente en el filtro, usarlo
    const explicitClubFilter = selectedClubForFilter !== 'all' ? selectedClubForFilter : null;
    
    if (selectedProfile === 'super-admin') {
      // Super admin can see everything, pero respeta el filtro de club
      return {
        showAllTabs: true,
        restrictToClub: explicitClubFilter || (selectedClubId !== 'all' ? selectedClubId : null)
      };
    } else if (selectedProfile === 'club-admin' && selectedUserId) {
      // Club admin - priorizar el club del selector, luego buscar en el usuario
      let clubId = explicitClubFilter;
      
      if (!clubId) {
        // Buscar el club del usuario seleccionado
        const selectedUser = getAvailableUsers().find(u => u.id === selectedUserId);
        
        if (selectedUser?.clubId) {
          clubId = selectedUser.clubId;
        } else {
          // Fallback: buscar por adminId
          const adminClub = clubs.find(club => club.adminId === selectedUserId);
          if (adminClub) {
            clubId = adminClub.id;
          }
        }
      }
      
      return {
        showAllTabs: true,
        restrictToClub: clubId,
        clubAdminId: selectedUserId
      };
    } else if (selectedProfile === 'instructor' && selectedUserId) {
      // Instructor can only see their classes and related data
      let clubId = explicitClubFilter;
      
      if (!clubId) {
        const selectedInstructor = instructors.find(inst => inst.id === selectedUserId);
        clubId = selectedInstructor?.clubId || null;
      }
      
      return {
        showAllTabs: false,
        restrictToClub: clubId,
        restrictToInstructor: selectedUserId
      };
    } else if (selectedProfile === 'client' && selectedUserId) {
      // Client can only see their bookings
      let clubId = explicitClubFilter;
      
      if (!clubId) {
        const selectedUser = users.find(user => user.id === selectedUserId);
        clubId = selectedUser?.clubId || null;
      }
      
      return {
        showAllTabs: false,
        restrictToClub: clubId,
        restrictToUser: selectedUserId
      };
    }
    
    return { 
      showAllTabs: true, 
      restrictToClub: explicitClubFilter 
    };
  };

  // Function to get user-specific booking count
  const getUserBookingCount = () => {
    if (!selectedUserId) return 0;
    
    if (selectedProfile === 'client' || selectedProfile === 'instructor') {
      return bookings.filter(booking => booking.userId === selectedUserId).length;
    }
    
    return bookings.length;
  };

  // Function to get filtered courts based on profile
  const getFilteredCourts = () => {
    const filteredData = getFilteredData();
    if (filteredData.restrictToClub) {
      return courts.filter(court => court.clubId === filteredData.restrictToClub);
    }
    return courts;
  };

  // Function to get future classes (upcoming)
  const getFutureTimeSlots = () => {
    const now = new Date();
    const filtered = getFilteredTimeSlots();
    return filtered.filter(slot => new Date(slot.start) >= now);
  };

  // Function to get past classes
  const getPastTimeSlots = () => {
    const now = new Date();
    const filtered = getFilteredTimeSlots();
    return filtered.filter(slot => new Date(slot.start) < now);
  };

  // Function to get available clubs for creation forms based on profile
  const getAvailableClubsForCreation = () => {
    const filteredData = getFilteredData();
    if (filteredData.restrictToClub) {
      return clubs.filter(club => club.id === filteredData.restrictToClub);
    }
    return clubs;
  };

  // Function to get filtered time slots based on profile
  const getFilteredTimeSlots = () => {
    const filteredData = getFilteredData();
    let filtered = timeSlots;
    
    if (filteredData.restrictToClub) {
      filtered = filtered.filter(slot => slot.clubId === filteredData.restrictToClub);
    }
    
    if (filteredData.restrictToInstructor) {
      filtered = filtered.filter(slot => slot.instructorId === filteredData.restrictToInstructor);
    }
    
    return filtered;
  };

  // Function to get filtered bookings based on profile
  const getFilteredBookings = () => {
    const filteredData = getFilteredData();
    let filtered = bookings;
    
    if (filteredData.restrictToUser) {
      filtered = filtered.filter(booking => booking.userId === filteredData.restrictToUser);
    } else if (filteredData.restrictToInstructor) {
      // Show bookings for classes taught by this instructor
      const instructorSlots = timeSlots.filter(slot => slot.instructorId === filteredData.restrictToInstructor);
      const instructorSlotIds = instructorSlots.map(slot => slot.id);
      filtered = filtered.filter(booking => instructorSlotIds.includes(booking.timeSlotId));
    } else if (filteredData.restrictToClub) {
      // Show bookings for classes in this club
      const clubSlots = timeSlots.filter(slot => slot.clubId === filteredData.restrictToClub);
      const clubSlotIds = clubSlots.map(slot => slot.id);
      filtered = filtered.filter(booking => clubSlotIds.includes(booking.timeSlotId));
    }
    
    return filtered;
  };

  // Function to get filtered instructors based on profile
  const getFilteredInstructors = () => {
    const filteredData = getFilteredData();
    if (filteredData.restrictToClub) {
      return instructors.filter(instructor => instructor.clubId === filteredData.restrictToClub);
    }
    return instructors;
  };

  // Function to get filtered clubs based on profile
  const getFilteredClubs = () => {
    const filteredData = getFilteredData();
    if (filteredData.restrictToClub) {
      return clubs.filter(club => club.id === filteredData.restrictToClub);
    }
    return clubs;
  };

  // Function to get filtered users based on profile and club
  const getFilteredUsers = () => {
    const filteredData = getFilteredData();
    if (filteredData.restrictToClub) {
      return users.filter(user => {
        // Filter by club if user has clubId
        if (user.clubId) {
          return user.clubId === filteredData.restrictToClub;
        }
        // If user doesn't have clubId, check if they are associated through other means
        // For now, exclude users without clubId when filtering by club
        return false;
      });
    }
    return users;
  };

  // Función para añadir crédito a un usuario
  const handleAddCredit = async () => {
    if (!creditUserId || !creditAmount) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un usuario y especifica una cantidad',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    try {
      const user = users.find(u => u.id === creditUserId);
      
      console.log('💰 Añadiendo crédito:', {
        userId: creditUserId,
        userName: user?.name,
        amount: amount
      });

      // Hacer petición a la API para actualizar el crédito
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: creditUserId,
          action: 'addCredit',
          amount: amount,
          concept: creditConcept
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al añadir crédito');
      }

      const result = await response.json();
      
      toast({
        title: '💰 ¡Crédito Añadido!',
        description: `Se han añadido ${amount.toFixed(2)}€ a ${user?.name || 'el usuario'}. Nuevo saldo: ${result.newBalance.toFixed(2)}€`,
        className: 'bg-green-600 text-white border-green-700',
      });
      
      // Limpiar formulario
      setCreditUserId('');
      setCreditAmount('');
      setCreditConcept('Recarga de saldo');
      
      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error añadiendo crédito:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Ocurrió un error al añadir el crédito',
        variant: 'destructive',
      });
    }
  };

  // Function to get available tabs based on profile
  const getAvailableTabs = () => {
    const userBookingCount = getUserBookingCount();
    
    switch (selectedProfile) {
      case 'super-admin':
        return [
          { id: 'overview', label: '📊 Dashboard', show: true },
          { id: 'admins', label: `👑 Admins (${admins.length})`, show: true },
          { id: 'clubs', label: `🏢 Clubs (${clubs.length})`, show: true },
          { id: 'courts', label: '🏟️ Pistas', show: true },
          { id: 'instructors', label: `👨‍🏫 Instructors (${getFilteredInstructors().length})`, show: true },
          { id: 'users', label: `👥 Users (${getFilteredUsers().length})`, show: true },
          { id: 'timeslots', label: `📅 Clases Futuras (${getFutureTimeSlots().length})`, show: true },
          { id: 'past-timeslots', label: `📜 Clases Pasadas (${getPastTimeSlots().length})`, show: true },
          { id: 'bookings', label: `📋 Bookings (${bookings.length})`, show: true },
          { id: 'calendar', label: '📅 Calendario', show: true },
          { id: 'settings', label: '⚙️ Config', show: true }
        ];
      case 'club-admin':
        const filteredCourts = getFilteredCourts();
        const filteredTimeSlots = getFilteredTimeSlots();
        const filteredBookings = getFilteredBookings();
        const filteredInstructors = getFilteredInstructors();
        const filteredUsersForClub = getFilteredUsers();
        
        return [
          { id: 'overview', label: '📊 Dashboard', show: true },
          { id: 'courts', label: `🏟️ Pistas (${filteredCourts.length})`, show: true },
          { id: 'instructors', label: `👨‍🏫 Instructors (${filteredInstructors.length})`, show: true },
          { id: 'users', label: `👥 Users (${filteredUsersForClub.length})`, show: true },
          { id: 'timeslots', label: `📅 Clases Futuras (${getFutureTimeSlots().length})`, show: true },
          { id: 'past-timeslots', label: `📜 Clases Pasadas (${getPastTimeSlots().length})`, show: true },
          { id: 'bookings', label: `📋 Bookings (${filteredBookings.length})`, show: true },
          { id: 'calendar', label: '📅 Calendario', show: true },
          { id: 'rates', label: '💰 Tarifas', show: true },
          { id: 'settings', label: '⚙️ Config', show: true }
        ];
      case 'instructor':
        return [
          { id: 'overview', label: '📊 Mi Panel', show: true },
          { id: 'manageClasses', label: '📚 Gestionar Clases', show: true },
          { id: 'addCredits', label: '💳 Añadir Crédito', show: true },
          { id: 'instructorPreferences', label: '⚙️ Preferencias y Tarifas', show: true },
          { id: 'timeslots', label: `📅 Mis Clases Futuras (${getFutureTimeSlots().length})`, show: true },
          { id: 'past-timeslots', label: `📜 Mis Clases Pasadas (${getPastTimeSlots().length})`, show: true },
          { id: 'user-bookings', label: `📋 Mis Reservas (${userBookingCount})`, show: true },
          { id: 'instructors', label: `👨‍🏫 Instructors (${getFilteredInstructors().length})`, show: true },
          { id: 'user-calendar', label: '📅 Mi Calendario', show: true },
          { id: 'calendar', label: '🏛️ Calendario Club', show: true }
        ];
      case 'client':
        return [
          { id: 'overview', label: '📊 Mi Panel', show: true },
          { id: 'user-bookings', label: `📋 Mis Reservas (${userBookingCount})`, show: true },
          { id: 'user-balance', label: '💰 Mi Saldo', show: true },
          { id: 'calendar', label: '🏛️ Calendario Club', show: true }
        ];
      default:
        return [];
    }
  };

  // Función para filtrar bookings según el criterio seleccionado
  const getFilteredBookingsByStatus = () => {
    const now = new Date();
    let filteredData = bookingsForCards;
    
    // Debug: log datos
    console.log('🔍 bookingsForCards:', bookingsForCards.length);
    console.log('🔍 Primera booking:', bookingsForCards[0]);
    console.log('🔍 Filtro actual:', bookingsFilter);
    
    // Filtrar por usuario si es necesario
    if ((selectedProfile === 'client' || selectedProfile === 'instructor') && selectedUserId) {
      filteredData = bookingsForCards.filter(booking => booking.userId === selectedUserId);
      console.log('🔍 Bookings filtradas por usuario:', filteredData.length);
    }
    
    // Aplicar filtros adicionales
    switch (bookingsFilter) {
      case 'all':
        // Mostrar todas las reservas
        console.log('✅ Retornando TODAS las bookings:', filteredData.length);
        return filteredData;
        
      case 'confirmed':
        // Reservas confirmadas: simplemente filtrar por estado CONFIRMED
        const confirmed = filteredData.filter(booking => booking.status === 'CONFIRMED');
        console.log('✅ Retornando bookings CONFIRMADAS:', confirmed.length);
        return confirmed;
        
      case 'pending':
        // Reservas pendientes
        const pending = filteredData.filter(booking => 
          booking.status === 'PENDING' && 
          (!booking.timeSlot?.start || new Date(booking.timeSlot.start) >= now)
        );
        console.log('✅ Retornando bookings PENDIENTES:', pending.length);
        return pending;
        
      case 'past':
        // Reservas de clases que ya pasaron
        const past = filteredData.filter(booking => {
          if (!booking.timeSlot?.start) return false;
          return new Date(booking.timeSlot.start) < now;
        }).sort((a, b) => {
          // Ordenar de más reciente a más antigua
          const dateA = a.timeSlot?.start ? new Date(a.timeSlot.start).getTime() : 0;
          const dateB = b.timeSlot?.start ? new Date(b.timeSlot.start).getTime() : 0;
          return dateB - dateA;
        });
        console.log('✅ Retornando clases PASADAS:', past.length);
        return past;
        
      default:
        console.log('✅ Retornando bookings por defecto:', filteredData.length);
        return filteredData;
    }
  };

  // Funciones memoizadas para contadores (optimización de rendimiento)
  const bookingCounters = useMemo(() => {
    if (!selectedUserId) return { all: 0, confirmed: 0, pending: 0, past: 0 };
    
    const userBookings = bookingsForCards.filter(b => b.userId === selectedUserId);
    const now = new Date();
    
    let confirmed = 0;
    let pending = 0;
    let past = 0;
    
    userBookings.forEach(b => {
      // Verificar si es pasada
      if (b.timeSlot?.start && new Date(b.timeSlot.start) < now) {
        past++;
        return;
      }
      
      // Verificar si tiene pista asignada
      const classBookings = bookingsForCards.filter(
        cb => cb.timeSlotId === b.timeSlotId && cb.status !== 'CANCELLED'
      );
      
      let hasCourtAssigned = false;
      for (const modalitySize of [1, 2, 3, 4]) {
        const modalityBookings = classBookings.filter(
          mb => mb.groupSize === modalitySize
        );
        
        if (modalityBookings.length >= modalitySize) {
          const confirmedBookings = modalityBookings.filter(mb => mb.status === 'CONFIRMED');
          if (confirmedBookings.length > 0 && modalityBookings.some(mb => mb.id === b.id)) {
            hasCourtAssigned = true;
            break;
          }
        }
      }
      
      if (hasCourtAssigned) {
        confirmed++;
      } else {
        pending++;
      }
    });
    
    return {
      all: userBookings.length,
      confirmed,
      pending,
      past
    };
  }, [bookingsForCards, selectedUserId]);

  const createUser = async () => {
    try {
      // Solo enviar los campos que existen en el esquema
      const userData = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        level: newUser.level,
        clubId: newUser.clubId === 'auto-assign' ? undefined : newUser.clubId
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User created successfully'
        });
        setNewUser({ name: '', email: '', role: 'PLAYER', level: 'abierto', clubId: 'auto-assign' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating user',
        variant: 'destructive'
      });
    }
  };

  const createSuperAdmin = async () => {
    try {
      // Validación básica
      if (!newSuperAdmin.name || !newSuperAdmin.email || !newSuperAdmin.password) {
        toast({
          title: 'Error',
          description: 'Todos los campos son obligatorios',
          variant: 'destructive'
        });
        return;
      }

      if (newSuperAdmin.password !== newSuperAdmin.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Las contraseñas no coinciden',
          variant: 'destructive'
        });
        return;
      }

      // Crear super administrador
      const superAdminData = {
        name: newSuperAdmin.name,
        email: newSuperAdmin.email,
        password: newSuperAdmin.password,
        role: 'SUPER_ADMIN'
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(superAdminData)
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: `Super Administrador ${newSuperAdmin.name} creado exitosamente`
        });
        setNewSuperAdmin({ name: '', email: '', password: '', confirmPassword: '' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creando super administrador',
        variant: 'destructive'
      });
    }
  };

  const createClubAdmin = async () => {
    try {
      // Validación básica
      if (!newClubAdmin.name || !newClubAdmin.email || !newClubAdmin.password || !newClubAdmin.clubId) {
        toast({
          title: 'Error',
          description: 'Todos los campos marcados con * son obligatorios',
          variant: 'destructive'
        });
        return;
      }

      if (newClubAdmin.password !== newClubAdmin.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Las contraseñas no coinciden',
          variant: 'destructive'
        });
        return;
      }

      // Crear administrador de club
      const clubAdminData = {
        name: newClubAdmin.name,
        email: newClubAdmin.email,
        password: newClubAdmin.password,
        phone: newClubAdmin.phone,
        role: 'CLUB_ADMIN',
        clubId: newClubAdmin.clubId
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clubAdminData)
      });

      if (response.ok) {
        const selectedClub = clubs.find(c => c.id === newClubAdmin.clubId);
        toast({
          title: 'Éxito',
          description: `Administrador ${newClubAdmin.name} creado exitosamente para ${selectedClub?.name || 'el club seleccionado'}`
        });
        setNewClubAdmin({ name: '', email: '', password: '', confirmPassword: '', clubId: '', phone: '' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creando administrador de club',
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully'
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error deleting user',
        variant: 'destructive'
      });
    }
  };

  const updateUser = async (userData: User) => {
    try {
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          level: userData.level,
          role: userData.role,
          clubId: userData.clubId
        })
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente'
        });
        setEditingUser(null);
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando usuario',
        variant: 'destructive'
      });
    }
  };

  const editUserInline = (field: string, value: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, [field]: value };
      updateUser(updatedUser);
    }
  };

  // Funciones para editar perfil de usuario
  const startEditingProfile = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      setEditedProfileData({
        name: user.name,
        email: user.email,
        level: user.level,
        phone: user.phone || '',
        profilePictureUrl: user.profilePictureUrl || ''
      });
      setEditingProfile(true);
    }
  };

  const cancelEditingProfile = () => {
    setEditingProfile(false);
    setEditedProfileData({
      name: '',
      email: '',
      level: '',
      phone: '',
      profilePictureUrl: ''
    });
  };

  const saveProfileChanges = async () => {
    try {
      const response = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedProfileData.name,
          email: editedProfileData.email,
          level: editedProfileData.level,
          phone: editedProfileData.phone,
          profilePictureUrl: editedProfileData.profilePictureUrl
        })
      });

      if (response.ok) {
        toast({
          title: '✅ Perfil Actualizado',
          description: 'Los cambios se han guardado correctamente',
          className: 'bg-green-600 text-white'
        });
        setEditingProfile(false);
        await loadData(); // Recargar datos
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando perfil',
        variant: 'destructive'
      });
    }
  };

  const createClub = async () => {
    try {
      // Validación básica
      if (!newClub.name || !newClub.address || !newClub.adminId) {
        toast({
          title: 'Error',
          description: 'Name, address, and administrator are required',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClub)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Club created successfully'
        });
        setNewClub({ name: '', address: '', phone: '', email: '', website: '', description: '', adminId: '' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating club',
        variant: 'destructive'
      });
    }
  };

  const updateClubSettings = async (clubId: string, settings: any) => {
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Configuración actualizada correctamente'
        });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando configuración',
        variant: 'destructive'
      });
    }
  };

  // Funciones para gestionar franjas horarias
  const createPriceSlot = async () => {
    try {
      const response = await fetch(`/api/admin/clubs/${newPriceSlot.clubId}/price-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPriceSlot)
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Franja horaria creada correctamente'
        });
        setNewPriceSlot({
          clubId: '',
          name: '',
          startTime: '09:00',
          endTime: '12:00',
          price: 10,
          daysOfWeek: [1, 2, 3, 4, 5],
          priority: 0
        });
        setIsPriceSlotDialogOpen(false);
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creando franja horaria',
        variant: 'destructive'
      });
    }
  };

  const updatePriceSlot = async (slotId: string, clubId: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/price-slots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Franja horaria actualizada correctamente'
        });
        setEditingPriceSlot(null);
        setIsPriceSlotDialogOpen(false);
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando franja horaria',
        variant: 'destructive'
      });
    }
  };

  const deletePriceSlot = async (slotId: string, clubId: string) => {
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/price-slots/${slotId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Franja horaria eliminada correctamente'
        });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error eliminando franja horaria',
        variant: 'destructive'
      });
    }
  };

  const createInstructor = async () => {
    try {
      const response = await fetch('/api/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstructor)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Instructor created successfully'
        });
        setNewInstructor({ userId: '', clubId: '', specialties: '', experience: '' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating instructor',
        variant: 'destructive'
      });
    }
  };

  // Función de verificación de permisos para editar instructores
  // En el panel de administración de base de datos, todos los usuarios autorizados pueden editar
  const canEditInstructor = (instructorToEdit: any): boolean => {
    return true;
  };

  const openEditInstructor = (instructor: any) => {
    // Verificar permisos antes de abrir el diálogo
    if (!canEditInstructor(instructor)) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para editar la información de este instructor',
        variant: 'destructive'
      });
      return;
    }

    console.log('🔍 Opening edit dialog for instructor:', instructor);
    setEditingInstructor({
      id: instructor.id,
      userId: instructor.userId,
      profilePictureUrl: instructor.profilePictureUrl || null,
      specialties: instructor.specialties || '',
      experience: instructor.yearsExperience ? `${instructor.yearsExperience}-${instructor.yearsExperience + 2} años` : '',
      hourlyRate: instructor.hourlyRate || 30,
      bio: instructor.bio || '',
      isActive: instructor.isActive
    });
    console.log('🔍 Setting dialog open to true with profilePictureUrl:', instructor.profilePictureUrl);
    setIsEditInstructorDialogOpen(true);
  };

  const updateInstructor = async () => {
    try {
      console.log('📤 Updating instructor with data:', {
        id: editingInstructor.id,
        userId: editingInstructor.userId,
        profilePictureUrl: editingInstructor.profilePictureUrl
      });
      
      const response = await fetch('/api/admin/instructors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingInstructor,
          userId: editingInstructor.userId,
          profilePictureUrl: editingInstructor.profilePictureUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Instructor updated successfully:', result);
        
        toast({
          title: 'Success',
          description: 'Instructor updated successfully'
        });
        setEditingInstructor(null);
        setIsEditInstructorDialogOpen(false);
        await loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error updating instructor',
        variant: 'destructive'
      });
    }
  };

  const createCourt = async () => {
    try {
      if (!newCourt.clubId || !newCourt.name) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const courtData = {
        clubId: newCourt.clubId,
        number: newCourt.number,
        name: newCourt.name,
        capacity: newCourt.capacity,
        isActive: newCourt.isActive
      };

      const response = await fetch('/api/admin/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courtData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Court created successfully'
        });
        setNewCourt({
          clubId: '',
          number: 1,
          name: '',
          capacity: 4,
          isActive: true
        });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating court',
        variant: 'destructive'
      });
    }
  };

  const generateGroupClasses = async () => {
    try {
      const today = new Date();
      const clubId = selectedClubId !== 'all' ? selectedClubId : 'club-1';
      
      const response = await fetch('/api/admin/generate-class-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          clubId: clubId
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Clases Generadas',
          description: `Se crearon ${result.slots.length} propuestas de clases grupales`,
          className: 'bg-green-500 text-white'
        });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error generando clases grupales',
        variant: 'destructive'
      });
    }
  };

  const generateWeeklyClasses = async () => {
    try {
      const clubId = selectedClubId !== 'all' ? selectedClubId : 'club-1';
      
      const response = await fetch(`/api/admin/generate-class-proposals?clubId=${clubId}&days=7`);

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Clases Semanales Generadas',
          description: `Se crearon ${result.totalSlots} propuestas de clases para 7 días`,
          className: 'bg-green-500 text-white'
        });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error generando clases semanales',
        variant: 'destructive'
      });
    }
  };

  const generateMonthlyClasses = async () => {
    try {
      // Intentar obtener el clubId más apropiado
      let clubId = selectedClubForFilter !== 'all' ? selectedClubForFilter : selectedClubId;
      
      // Si aún es 'all', intentar obtener el primer club disponible
      if (clubId === 'all' && clubs.length > 0) {
        clubId = clubs[0].id;
      }
      
      console.log('🚀 Generando clases mensuales para club:', clubId);
      
      const response = await fetch(`/api/admin/generate-class-proposals?clubId=${clubId}&days=30`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);
      
      toast({
        title: '✅ Clases Mensuales Generadas',
        description: `Se crearon ${result.totalSlots || 0} propuestas de clases para los próximos 30 días`,
        className: 'bg-green-500 text-white'
      });
      
      loadData();
    } catch (error) {
      console.error('❌ Error generando clases mensuales:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error generando clases mensuales',
        variant: 'destructive'
      });
    }
  };

  // Funciones para obtener datos específicos del usuario seleccionado
  const getSelectedUserData = () => {
    if (!selectedUserId) return null;
    return users.find(user => user.id === selectedUserId);
  };

  const getSelectedUserBookings = () => {
    if (!selectedUserId) return [];
    return bookings.filter(booking => booking.userId === selectedUserId);
  };

  const getSelectedUserStats = () => {
    const userData = getSelectedUserData();
    const userBookings = getSelectedUserBookings();
    
    if (!userData) return null;

    const confirmedBookings = userBookings.filter(b => b.status === 'CONFIRMED');
    const cancelledBookings = userBookings.filter(b => b.status === 'CANCELLED');
    const completedBookings = userBookings.filter(b => 
      b.status === 'CONFIRMED' && new Date(b.end) < new Date()
    );
    const upcomingBookings = userBookings.filter(b => 
      b.status === 'CONFIRMED' && new Date(b.start) > new Date()
    );

    return {
      user: userData,
      totalBookings: userBookings.length,
      confirmedBookings: confirmedBookings.length,
      cancelledBookings: cancelledBookings.length,
      completedBookings: completedBookings.length,
      upcomingBookings: upcomingBookings.length,
      totalSpent: confirmedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
      recentBookings: userBookings.slice(0, 5)
    };
  };

  const exportData = () => {
    const data = {
      users,
      admins,
      clubs,
      instructors,
      timeSlots,
      bookings,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padelpro-database-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando base de datos...</span>
      </div>
    );
  }

  // Mostrar mensaje de acceso denegado
  if (hasAccess === false) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder al panel de base de datos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Solo los usuarios con rol de <strong>Administrador del Club</strong> pueden acceder a esta sección.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading o sin verificar permisos todavía
  if (hasAccess === null) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-16 md:pl-20 lg:pl-24">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              Database Admin Panel
            </h1>
            <p className="text-gray-600 mt-2">
              Manage users, classes, and bookings
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="default" 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Ir a la Web
              </Button>
              <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button onClick={() => loadData()} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            
            {/* URLs de Clubes */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">🏢 URLs de Clubes:</span>
              <Button 
                onClick={() => window.location.href = '/clubs'} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                📋 Selección de Clubes (/clubs)
              </Button>
              {clubs.map((club) => (
                <Button 
                  key={club.id}
                  onClick={() => window.location.href = `/club/${club.id}`} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  🎾 {club.name} (/club/{club.id})
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Sistema de Perfiles y Acceso */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                🔐 Sistema de Acceso por Perfiles
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Selector de Perfil */}
                <div className="space-y-2">
              <Label htmlFor="profile-selector" className="text-sm font-medium">
                👤 Tipo de Perfil:
              </Label>
              <Select value={selectedProfile} onValueChange={handleProfileChange}>
                <SelectTrigger id="profile-selector">
                  <SelectValue placeholder="Selecciona un perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-admin">🌟 Super Administrador</SelectItem>
                  <SelectItem value="club-admin">👑 Administrador de Club</SelectItem>
                  <SelectItem value="instructor">👨‍🏫 Instructor</SelectItem>
                  <SelectItem value="client">🏓 Cliente/Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>

                {/* Selector de Club */}
                <div className="space-y-2">
              <Label htmlFor="club-filter-selector" className="text-sm font-medium">
                🏢 Club:
              </Label>
              <Select value={selectedClubForFilter} onValueChange={setSelectedClubForFilter}>
                <SelectTrigger id="club-filter-selector">
                  <SelectValue placeholder="Selecciona un club" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProfile === 'super-admin' && <SelectItem value="all">🌍 Todos los Clubs</SelectItem>}
                  {console.log('🔍 Clubs disponibles:', clubs.length, clubs)}
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      🏢 {club.name} - {club.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                {/* Selector de Usuario */}
                <div className="space-y-2">
              <Label htmlFor="user-selector" className="text-sm font-medium">
                👥 Usuario:
              </Label>
              <Select value={selectedUserId} onValueChange={handleUserChange}>
                <SelectTrigger id="user-selector">
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableUsers().map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.name || user.email || user.id}
                        </span>
                        {selectedProfile === 'club-admin' && user.position && (
                          <span className="text-xs text-purple-600 font-medium">💼 {user.position}</span>
                        )}
                        {user.email && user.name && (
                          <span className="text-xs text-gray-500">{user.email}</span>
                        )}
                        {selectedProfile === 'club-admin' && (
                          <span className="text-xs text-blue-600 font-medium">
                            {(() => {
                              // Priorizar clubName si existe (admins ficticios)
                              if (user.clubName) {
                                return `🏢 ${user.clubName}`;
                              }
                              
                              // Buscar club usando clubId o adminId (admins reales)
                              const userClub = clubs.find(club => 
                                (user.clubId && club.id === user.clubId) ||
                                club.adminId === user.id
                              );
                              
                              if (userClub) {
                                return `🏢 ${userClub.name}`;
                              }
                              
                              // Si no encuentra club específico, mostrar advertencia
                              return '⚠️ Club no asignado';
                            })()}
                          </span>
                        )}
                        {selectedProfile === 'instructor' && (
                          <span className="text-xs text-green-600">
                            {(() => {
                              const instructor = instructors.find(inst => inst.id === user.id);
                              return instructor?.specialties ? `🎯 ${instructor.specialties}` : '🎯 Sin especialidades';
                            })()}
                          </span>
                        )}
                        {selectedProfile === 'client' && (
                          <span className="text-xs text-purple-600">
                            {(() => {
                              return user.level ? `🏆 Nivel: ${user.level}` : '🏆 Sin nivel especificado';
                            })()}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
              </div>

              {/* Información del acceso actual */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm space-y-1">
              <div>
                <strong>Perfil de acceso:</strong> {' '}
                {selectedProfile === 'super-admin' && '🌟 Super Administrador - Acceso completo al sistema'}
                {selectedProfile === 'club-admin' && '👑 Administrador de Club - Gestión completa del club asignado'}
                {selectedProfile === 'instructor' && '👨‍🏫 Instructor - Acceso a sus clases y estudiantes'}
                {selectedProfile === 'client' && '🏓 Cliente - Acceso a sus reservas y datos personales'}
              </div>
              
              {selectedClubForFilter !== 'all' && (
                <div>
                  <strong>Club seleccionado:</strong> {' '}
                  <span className="text-blue-700 font-medium">
                    🏢 {clubs.find(c => c.id === selectedClubForFilter)?.name || 'Club seleccionado'}
                  </span>
                  {clubs.find(c => c.id === selectedClubForFilter)?.address && (
                    <span className="text-gray-600 ml-1">
                      📍 {clubs.find(c => c.id === selectedClubForFilter)?.address}
                    </span>
                  )}
                </div>
              )}

              {selectedUserId && (
                <div>
                  <strong>Usuario actual:</strong> {' '}
                  <span className="text-purple-700 font-medium">
                    👨‍💼 {getAvailableUsers().find(u => u.id === selectedUserId)?.name || 'Usuario seleccionado'}
                  </span>
                  {selectedProfile === 'club-admin' && getAvailableUsers().find(u => u.id === selectedUserId)?.position && (
                    <span className="text-orange-600 ml-1 font-medium">
                      ({getAvailableUsers().find(u => u.id === selectedUserId)?.position})
                    </span>
                  )}
                  {getAvailableUsers().find(u => u.id === selectedUserId)?.email && (
                    <span className="text-gray-600 ml-1">
                      • {getAvailableUsers().find(u => u.id === selectedUserId)?.email}
                    </span>
                  )}
                </div>
              )}

              {selectedProfile === 'instructor' && selectedUserId && (
                <div>
                  <strong>Especialidades:</strong> {' '}
                  {(() => {
                    const instructor = instructors.find(inst => inst.id === selectedUserId);
                    return instructor?.specialties ? (
                      <span className="text-green-700">{instructor.specialties}</span>
                    ) : (
                      <span className="text-gray-500">No especificadas</span>
                    );
                  })()}
                </div>
              )}

              {selectedProfile === 'client' && selectedUserId && (
                <div>
                  <strong>Nivel:</strong> {' '}
                  {(() => {
                    const user = users.find(u => u.id === selectedUserId);
                    return user?.level ? (
                      <span className="text-blue-700 font-medium">🏆 {user.level}</span>
                    ) : (
                      <span className="text-gray-500">No especificado</span>
                    );
                  })()}
                </div>
              )}
            </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 h-auto p-1 bg-gray-100 gap-1 flex-wrap">
                {getAvailableTabs().map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="text-xs sm:text-sm py-2 px-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
                
                {/* Enlace especial para Calendario Club (solo para instructores) */}
                {selectedProfile === 'instructor' && (
                  <Button
                    asChild
                    variant="ghost"
                    className="text-xs sm:text-sm py-2 px-2 h-auto text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <a href="/club-calendar/club-1" target="_blank" rel="noopener noreferrer">
                      <Calendar className="mr-1 h-4 w-4"/>
                      📅 Calendario Club
                    </a>
                  </Button>
                )}
              </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Vista de Super Admin y Club Admin - Estadísticas del sistema */}
          {(selectedProfile === 'super-admin' || selectedProfile === 'club-admin') && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">👑 Administrators</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{admins.length}</div>
                    <p className="text-xs text-muted-foreground">
                      System and club administrators
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">🏢 Clubs</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getFilteredClubs().length}</div>
                    <p className="text-xs text-muted-foreground">
                      Registered padel clubs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">🏟️ Courts</CardTitle>
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getFilteredCourts().length}</div>
                    <p className="text-xs text-muted-foreground">
                      Available padel courts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">👨‍🏫 Instructors</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getFilteredInstructors().length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active instructors
                    </p>
                  </CardContent>
                </Card>

              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getAvailableUsers().length}</div>
                    <p className="text-xs text-muted-foreground">
                      Users in this club
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Classes</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getFilteredTimeSlots().length}</div>
                    <p className="text-xs text-muted-foreground">
                      Time slots available for booking
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getFilteredBookings().length}</div>
                    <p className="text-xs text-muted-foreground">
                      All time reservations
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {bookings
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{booking.userName || booking.userId} booked class {booking.timeSlotId}</span>
                          <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Vista de Cliente - Panel personal */}
          {selectedProfile === 'client' && !selectedUserId && (
            <Card>
              <CardHeader>
                <CardTitle>👥 Selecciona un Cliente</CardTitle>
                <CardDescription>
                  Elige un cliente de la lista para ver su información personalizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Clientes disponibles en <strong>{clubs.find(c => c.id === selectedClubForFilter)?.name || 'Padel Estrella'}</strong>:
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {users
                      .filter(user => user.role === 'PLAYER')
                      .filter(user => !selectedClubForFilter || selectedClubForFilter === 'all' || user.clubId === selectedClubForFilter)
                      .map(user => (
                        <Card 
                          key={user.id} 
                          className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                          onClick={() => handleUserChange(user.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {user.profilePictureUrl ? (
                                <img 
                                  src={user.profilePictureUrl} 
                                  alt={user.name} 
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.level && (
                                  <Badge variant="outline" className="mt-1">
                                    Nivel {user.level}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  {users.filter(user => user.role === 'PLAYER').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg mb-2">No hay clientes registrados</p>
                      <p className="text-sm">Crea usuarios con el rol "PLAYER" para verlos aquí</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedProfile === 'client' && selectedUserId && (
            <>
              {(() => {
                const userStats = getSelectedUserStats();
                if (!userStats) return <div>Selecciona un usuario para ver sus datos</div>;
                
                return (
                  <>
                    {/* Información personal del usuario */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-3">
                            👤 Mi Perfil Personal
                          </span>
                          {!editingProfile ? (
                            <Button 
                              onClick={startEditingProfile}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <span>✏️</span>
                              Editar Perfil
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                onClick={saveProfileChanges}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                ✅ Guardar
                              </Button>
                              <Button 
                                onClick={cancelEditingProfile}
                                variant="outline"
                                size="sm"
                              >
                                ❌ Cancelar
                              </Button>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!editingProfile ? (
                          <>
                            {/* Modo Vista */}
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                              {/* Foto de Perfil */}
                              <div className="flex flex-col items-center">
                                {userStats.user.profilePictureUrl ? (
                                  <img 
                                    src={userStats.user.profilePictureUrl} 
                                    alt={userStats.user.name}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                                  />
                                ) : (
                                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-4xl border-4 border-blue-200 shadow-lg">
                                    {userStats.user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <p className="text-sm text-gray-500 mt-2">Foto de Perfil</p>
                              </div>
                              
                              {/* Datos del Usuario */}
                              <div className="flex-1 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Nombre Completo</Label>
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-lg font-medium">{userStats.user.name}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-lg">{userStats.user.email}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Nivel de Juego</Label>
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <Badge variant="outline" className="text-lg px-3 py-1">
                                      🏆 {userStats.user.level}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-lg">{userStats.user.phone || 'No especificado'}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Miembro desde</Label>
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <span className="text-lg">📅 {new Date(userStats.user.createdAt).toLocaleDateString('es-ES')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Modo Edición */}
                            <div className="space-y-6">
                              {/* Foto de Perfil - Editable */}
                              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg">
                                {editedProfileData.profilePictureUrl ? (
                                  <img 
                                    src={editedProfileData.profilePictureUrl} 
                                    alt="Preview"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg mb-4"
                                  />
                                ) : (
                                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-4xl border-4 border-blue-200 shadow-lg mb-4">
                                    {editedProfileData.name.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                                <Label className="text-sm font-medium mb-2">URL de la Foto de Perfil</Label>
                                <Input
                                  type="url"
                                  value={editedProfileData.profilePictureUrl}
                                  onChange={(e) => setEditedProfileData({...editedProfileData, profilePictureUrl: e.target.value})}
                                  placeholder="https://ejemplo.com/foto.jpg"
                                  className="max-w-md"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                  Puedes usar servicios como <a href="https://randomuser.me/" target="_blank" className="text-blue-600 hover:underline">RandomUser.me</a> o subir tu foto a un hosting de imágenes
                                </p>
                              </div>

                              {/* Formulario de Datos */}
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Nombre Completo *</Label>
                                  <Input
                                    type="text"
                                    value={editedProfileData.name}
                                    onChange={(e) => setEditedProfileData({...editedProfileData, name: e.target.value})}
                                    placeholder="Juan Pérez"
                                    className="text-lg"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Email *</Label>
                                  <Input
                                    type="email"
                                    value={editedProfileData.email}
                                    onChange={(e) => setEditedProfileData({...editedProfileData, email: e.target.value})}
                                    placeholder="juan@ejemplo.com"
                                    className="text-lg"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Nivel de Juego *</Label>
                                  <select
                                    value={editedProfileData.level}
                                    onChange={(e) => setEditedProfileData({...editedProfileData, level: e.target.value})}
                                    className="w-full p-3 border rounded-lg text-lg"
                                  >
                                    <option value="principiante">Principiante</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                    <option value="profesional">Profesional</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Género *</Label>
                                  <select
                                    value={editedProfileData.gender || ''}
                                    onChange={(e) => setEditedProfileData({...editedProfileData, gender: e.target.value})}
                                    className="w-full p-3 border rounded-lg text-lg"
                                  >
                                    <option value="">Selecciona tu género</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Define tu género para poder unirte a clases de chicos, chicas o mixtas
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Teléfono</Label>
                                  <Input
                                    type="tel"
                                    value={editedProfileData.phone}
                                    onChange={(e) => setEditedProfileData({...editedProfileData, phone: e.target.value})}
                                    placeholder="+34 123 456 789"
                                    className="text-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </>
          )}

          {/* Vista de Instructor - Panel de instructor */}
          {selectedProfile === 'instructor' && selectedUserId && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👨‍🏫</div>
              <div className="text-lg text-gray-600">Panel de Instructor</div>
              <p className="text-sm text-gray-500 mt-2">
                Vista específica para instructores en desarrollo
              </p>
            </div>
          )}

          {/* Mensaje cuando no hay usuario seleccionado */}
          {(selectedProfile === 'client' || selectedProfile === 'instructor') && !selectedUserId && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👤</div>
              <div className="text-xl text-gray-600 mb-2">Selecciona un usuario</div>
              <p className="text-gray-500">
                Elige un {selectedProfile === 'client' ? 'cliente' : 'instructor'} del selector superior para ver su información personalizada
              </p>
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Reservas del Usuario */}
        <TabsContent value="user-bookings" className="space-y-4">
          {selectedUserId ? (
            <Card>
              <CardHeader>
                <CardTitle>📋 Mis Reservas</CardTitle>
                <CardDescription>
                  Gestiona tus reservas de clases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sub-pestañas para filtrar bookings del usuario */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setBookingsFilter('all')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        bookingsFilter === 'all'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      📋 Todas las Reservas ({bookingCounters.all})
                    </button>
                    <button
                      onClick={() => setBookingsFilter('confirmed')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        bookingsFilter === 'confirmed'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      ✅ Reservas Confirmadas ({bookingCounters.confirmed})
                    </button>
                    <button
                      onClick={() => setBookingsFilter('pending')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        bookingsFilter === 'pending'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      ⏳ Reservas Pendientes ({bookingCounters.pending})
                    </button>
                    <button
                      onClick={() => setBookingsFilter('past')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        bookingsFilter === 'past'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      📜 Clases Pasadas ({bookingCounters.past})
                    </button>
                  </div>
                </div>

                {getFilteredBookingsByStatus().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-muted-foreground">
                      {bookingsFilter === 'all' && 'No tienes reservas'}
                      {bookingsFilter === 'confirmed' && 'No tienes reservas confirmadas'}
                      {bookingsFilter === 'pending' && 'No tienes reservas pendientes'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getFilteredBookingsByStatus().map((booking) => {
                      console.log('🎯 Renderizando booking:', booking);
                      return (
                        <AdminBookingCard key={booking.id} booking={booking} />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <div className="text-xl text-gray-600 mb-2">Selecciona un usuario</div>
              <p className="text-gray-500">
                Elige un usuario del selector superior para ver sus reservas
              </p>
            </div>
          )}
        </TabsContent>

        {/* Pestaña de Saldo del Usuario */}
        <TabsContent value="user-balance" className="space-y-4">
          {selectedUserId ? (
            <div className="space-y-4">
              {/* Cards de Saldo y Puntos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card de Saldo Actual */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Saldo Actual</div>
                          <div className="text-3xl font-bold text-green-700">
                            € {users.find(u => u.id === selectedUserId)?.credits?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={() => setShowAddCreditDialog(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir Saldo
                    </Button>
                    <Button 
                      onClick={() => setShowConvertBalanceDialog(true)}
                      variant="outline"
                      className="w-full border-green-600 text-green-700 hover:bg-green-50"
                      size="sm"
                    >
                      <Repeat className="mr-2 h-4 w-4" />
                      Convertir a Puntos
                    </Button>
                  </CardContent>
                </Card>

                {/* Card de Puntos */}
                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                          <span className="text-2xl">🎁</span>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Puntos Acumulados</div>
                          <div className="text-3xl font-bold text-purple-700">
                            {users.find(u => u.id === selectedUserId)?.points || 0} pts
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Por cancelaciones (1€ = 1 punto)
                          </div>
                        </div>
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Card de Historial de Movimientos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Historial de Movimientos
                  </CardTitle>
                  <CardDescription>
                    Todas las transacciones de saldo de este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const userBookings = bookingsForCards.filter(b => b.userId === selectedUserId);
                      
                      if (userBookings.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <div className="text-4xl mb-4">📭</div>
                            <div className="text-xl text-gray-600 mb-2">Sin movimientos</div>
                            <p className="text-gray-500">
                              Este usuario no tiene movimientos de saldo registrados
                            </p>
                          </div>
                        );
                      }

                      // Ordenar por fecha descendente
                      const sortedBookings = [...userBookings].sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      );

                      return sortedBookings.map((booking) => {
                        const pricePerPerson = (booking.timeSlot?.totalPrice || 55) / (booking.groupSize || 1);
                        const isCancelled = booking.status === 'CANCELLED';
                        
                        return (
                          <div 
                            key={booking.id} 
                            className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                              isCancelled 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-white hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              {/* Icono de transacción */}
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isCancelled 
                                  ? 'bg-green-100' 
                                  : 'bg-red-100'
                              }`}>
                                <span className="text-2xl">
                                  {isCancelled ? '↩️' : '💳'}
                                </span>
                              </div>
                              
                              {/* Información de la transacción */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {isCancelled ? 'Reembolso' : 'Reserva de clase'}
                                  </h4>
                                  <Badge 
                                    variant={isCancelled ? 'destructive' : 'default'}
                                    className={`text-xs ${
                                      isCancelled 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {isCancelled ? 'CANCELADO' : booking.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {new Date(booking.timeSlot?.start || booking.createdAt).toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {booking.timeSlot?.category} • {booking.timeSlot?.level} • {booking.groupSize} jugador{booking.groupSize > 1 ? 'es' : ''}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  ID: {booking.id.substring(0, 20)}...
                                </div>
                              </div>
                            </div>
                            
                            {/* Monto de la transacción */}
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${
                                isCancelled 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {isCancelled ? '+' : '-'}€{pricePerPerson.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(booking.createdAt).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Resumen de totales */}
                  {(() => {
                    const userBookings = bookingsForCards.filter(b => b.userId === selectedUserId);
                    
                    if (userBookings.length === 0) return null;

                    const totalGastado = userBookings
                      .filter(b => b.status !== 'CANCELLED')
                      .reduce((sum, b) => sum + ((b.timeSlot?.totalPrice || 55) / (b.groupSize || 1)), 0);
                    
                    const totalReembolsado = userBookings
                      .filter(b => b.status === 'CANCELLED')
                      .reduce((sum, b) => sum + ((b.timeSlot?.totalPrice || 55) / (b.groupSize || 1)), 0);

                    return (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="text-sm text-gray-600 mb-1">Total Gastado</div>
                                <div className="text-2xl font-bold text-red-600">-€{totalGastado.toFixed(2)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {userBookings.filter(b => b.status !== 'CANCELLED').length} reservas
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="text-sm text-gray-600 mb-1">Total Reembolsado</div>
                                <div className="text-2xl font-bold text-green-600">+€{totalReembolsado.toFixed(2)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {userBookings.filter(b => b.status === 'CANCELLED').length} cancelaciones
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="text-sm text-gray-600 mb-1">Balance Total</div>
                                <div className={`text-2xl font-bold ${
                                  (totalReembolsado - totalGastado) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {(totalReembolsado - totalGastado) >= 0 ? '+' : ''}€{(totalReembolsado - totalGastado).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {userBookings.length} movimientos totales
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💰</div>
              <div className="text-xl text-gray-600 mb-2">Selecciona un usuario</div>
              <p className="text-gray-500">
                Elige un usuario del selector superior para ver su saldo
              </p>
            </div>
          )}
        </TabsContent>

        {/* Nueva sección: Gestionar Clases */}
        <TabsContent value="manageClasses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <CalendarCheck className="mr-2 h-5 w-5 text-primary" /> 
                    Añadir Nueva Clase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="classDate">Fecha</Label>
                      <input
                        id="classDate"
                        type="date"
                        className="w-full p-2 border rounded"
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="classTime">Hora de Inicio</Label>
                      <select id="classTime" className="w-full p-2 border rounded">
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                        <option value="11:00">11:00</option>
                        <option value="12:00">12:00</option>
                        <option value="15:00">15:00</option>
                        <option value="16:00">16:00</option>
                        <option value="17:00">17:00</option>
                        <option value="18:00">18:00</option>
                        <option value="19:00">19:00</option>
                        <option value="20:00">20:00</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="classClub">Club</Label>
                      <select id="classClub" className="w-full p-2 border rounded">
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>{club.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="classCourt">Número de Pista</Label>
                      <select id="classCourt" className="w-full p-2 border rounded">
                        <option value="1">Pista 1</option>
                        <option value="2">Pista 2</option>
                        <option value="3">Pista 3</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="openClass"
                        type="checkbox"
                        defaultChecked
                        className="rounded"
                      />
                      <Label htmlFor="openClass">Nivel Abierto</Label>
                    </div>
                    <div>
                      <Label htmlFor="classCategory">Categoría de la Clase</Label>
                      <select id="classCategory" className="w-full p-2 border rounded">
                        <option value="Abierta (Mixto)">Abierta (Mixto)</option>
                        <option value="Solo Hombres">Solo Hombres</option>
                        <option value="Solo Mujeres">Solo Mujeres</option>
                        <option value="Torneo">Torneo</option>
                      </select>
                    </div>
                    <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                      Cancelar Clase
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <CheckSquare className="mr-2 h-5 w-5 text-primary" /> 
                    Clases Gestionadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Vista de calendario de clases en desarrollo...
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Nueva sección: Añadir Crédito */}
        <TabsContent value="addCredits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CreditCard className="mr-2 h-5 w-5 text-primary" /> 
                Añadir Crédito a Alumnos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="creditUser">Seleccionar Usuario</Label>
                  <select 
                    id="creditUser" 
                    className="w-full p-2 border rounded"
                    value={creditUserId}
                    onChange={(e) => setCreditUserId(e.target.value)}
                  >
                    <option value="">Seleccionar usuario...</option>
                    {users.filter(user => user.role === 'PLAYER').map((user) => (
                      <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="creditAmount">Cantidad de Crédito (€)</Label>
                  <input
                    id="creditAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full p-2 border rounded"
                    placeholder="25.00"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="creditConcept">Concepto</Label>
                  <input
                    id="creditConcept"
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Recarga de saldo"
                    value={creditConcept}
                    onChange={(e) => setCreditConcept(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={handleAddCredit}
                  disabled={!creditUserId || !creditAmount}
                >
                  <Euro className="mr-2 h-4 w-4" />
                  Añadir Crédito
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nueva sección: Preferencias y Tarifas */}
        <TabsContent value="instructorPreferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings2 className="mr-2 h-5 w-5 text-primary" />
                Preferencias y Tarifas
              </CardTitle>
              <CardDescription>
                Configura tu club de operación, disponibilidad general y tarifas por hora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <Label htmlFor="instructorClub">Club de Operación Principal</Label>
                  <select id="instructorClub" className="w-full p-2 border rounded">
                    <option value="">Selecciona tu club principal</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="assignedCourt">Pista Asignada (opcional)</Label>
                  <select id="assignedCourt" className="w-full p-2 border rounded">
                    <option value="">Ninguna (flotante)</option>
                    <option value="1">Pista 1</option>
                    <option value="2">Pista 2</option>
                    <option value="3">Pista 3</option>
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="flex items-center">
                      <ToggleLeft className="mr-2 h-5 w-5 text-green-600"/>
                      Disponibilidad General
                    </Label>
                    <div className="text-xs text-gray-500">
                      Estás disponible para dar clases.
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-4 rounded-lg border p-3 shadow-sm">
                  <div>
                    <Label htmlFor="defaultRate" className="flex items-center">
                      <Euro className="mr-2 h-4 w-4 text-gray-400"/>
                      Tarifa por Hora Predeterminada
                    </Label>
                    <input
                      id="defaultRate"
                      type="number"
                      min="0"
                      step="1"
                      className="w-full p-2 border rounded"
                      defaultValue="28"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Esta tarifa se usará si la clase no cae en ninguna franja de tarifa especial.
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Horario de Disponibilidad</Label>
                  <div className="text-xs text-gray-500 mb-2">
                    Define los bloques horarios en los que SÍ estarás disponible para dar clases.
                  </div>
                  <div className="text-center py-4 text-gray-400">
                    Configuración de disponibilidad en desarrollo...
                  </div>
                </div>

                <Button className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Preferencias y Tarifas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">👑 Administrators Management</span>
                <div className="flex gap-2">
                  {selectedProfile === 'super-admin' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          🌟 Add Super Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Super Administrator</DialogTitle>
                          <DialogDescription>
                            Create a new super administrator with full system access
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="superAdminName">Full Name *</Label>
                            <Input
                              id="superAdminName"
                              value={newSuperAdmin.name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSuperAdmin({...newSuperAdmin, name: e.target.value})}
                              placeholder="e.g., Cristian Parra"
                            />
                          </div>
                          <div>
                            <Label htmlFor="superAdminEmail">Email *</Label>
                            <Input
                              id="superAdminEmail"
                              type="email"
                              value={newSuperAdmin.email}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSuperAdmin({...newSuperAdmin, email: e.target.value})}
                              placeholder="superadmin@padelpro.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="superAdminPassword">Password *</Label>
                            <Input
                              id="superAdminPassword"
                              type="password"
                              value={newSuperAdmin.password}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSuperAdmin({...newSuperAdmin, password: e.target.value})}
                              placeholder="Enter secure password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="superAdminConfirmPassword">Confirm Password *</Label>
                            <Input
                              id="superAdminConfirmPassword"
                              type="password"
                              value={newSuperAdmin.confirmPassword}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSuperAdmin({...newSuperAdmin, confirmPassword: e.target.value})}
                              placeholder="Confirm password"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" onClick={createSuperAdmin}>
                            🌟 Create Super Admin
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {selectedProfile === 'super-admin' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          👑 Add Club Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Club Administrator</DialogTitle>
                          <DialogDescription>
                            Create a new administrator for a specific club
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="clubAdminName">Full Name *</Label>
                            <Input
                              id="clubAdminName"
                              value={newClubAdmin.name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubAdmin({...newClubAdmin, name: e.target.value})}
                              placeholder="e.g., María González"
                            />
                          </div>
                          <div>
                            <Label htmlFor="clubAdminEmail">Email *</Label>
                            <Input
                              id="clubAdminEmail"
                              type="email"
                              value={newClubAdmin.email}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubAdmin({...newClubAdmin, email: e.target.value})}
                              placeholder="maria@clubpadel.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="clubAdminClub">Assign to Club *</Label>
                            <Select value={newClubAdmin.clubId} onValueChange={(value: string) => setNewClubAdmin({...newClubAdmin, clubId: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a club" />
                              </SelectTrigger>
                              <SelectContent>
                                {clubs.map((club) => (
                                  <SelectItem key={club.id} value={club.id}>
                                    🏢 {club.name}
                                    {club.address && <span className="text-xs text-gray-500 ml-1">- {club.address}</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="clubAdminPhone">Phone</Label>
                            <Input
                              id="clubAdminPhone"
                              value={newClubAdmin.phone}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubAdmin({...newClubAdmin, phone: e.target.value})}
                              placeholder="+34 600 000 000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="clubAdminPassword">Password *</Label>
                            <Input
                              id="clubAdminPassword"
                              type="password"
                              value={newClubAdmin.password}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubAdmin({...newClubAdmin, password: e.target.value})}
                              placeholder="Enter secure password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="clubAdminConfirmPassword">Confirm Password *</Label>
                            <Input
                              id="clubAdminConfirmPassword"
                              type="password"
                              value={newClubAdmin.confirmPassword}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClubAdmin({...newClubAdmin, confirmPassword: e.target.value})}
                              placeholder="Confirm password"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" onClick={createClubAdmin}>
                            👑 Create Club Admin
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Admin
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Administrator</DialogTitle>
                      <DialogDescription>
                        Add a new administrator to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="adminName">Name *</Label>
                        <Input
                          id="adminName"
                          value={newUser.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="Administrator name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminEmail">Email *</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={newUser.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="admin@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminRole">Role</Label>
                        <select 
                          id="adminRole"
                          value={newUser.role} 
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewUser({...newUser, role: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="CLUB_ADMIN">Club Admin</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={createUser}>Create Admin</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </CardTitle>
              <CardDescription>
                View and manage system and club administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === 'SUPER_ADMIN' ? 'destructive' : 'default'}>
                          {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Club Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{admin.level}</Badge>
                      </TableCell>
                      <TableCell>{(admin as any).credits || 0}</TableCell>
                      <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clubs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  🏢 {selectedClubId === 'all' ? 'Clubs Management' : 'Club Details'}
                </span>
                {selectedClubId === 'all' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Club
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Club</DialogTitle>
                      <DialogDescription>
                        Add a new padel club to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="clubName">Name *</Label>
                        <Input
                          id="clubName"
                          value={newClub.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, name: e.target.value})}
                          placeholder="Club name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clubAddress">Address *</Label>
                        <Input
                          id="clubAddress"
                          value={newClub.address}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, address: e.target.value})}
                          placeholder="Club address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clubPhone">Phone</Label>
                        <Input
                          id="clubPhone"
                          value={newClub.phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, phone: e.target.value})}
                          placeholder="+34 123 456 789"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clubEmail">Email</Label>
                        <Input
                          id="clubEmail"
                          type="email"
                          value={newClub.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, email: e.target.value})}
                          placeholder="club@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clubWebsite">Website</Label>
                        <Input
                          id="clubWebsite"
                          value={newClub.website}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, website: e.target.value})}
                          placeholder="https://club.example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clubAdmin">Club Administrator *</Label>
                        <Select value={newClub.adminId} onValueChange={(value: string) => setNewClub({...newClub, adminId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an administrator" />
                          </SelectTrigger>
                          <SelectContent>
                            {admins.map((admin) => (
                              <SelectItem key={admin.id} value={admin.id}>
                                👤 {admin.name}
                                {admin.email && <span className="text-xs text-gray-500 ml-1">({admin.email})</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="clubDescription">Description</Label>
                        <Input
                          id="clubDescription"
                          value={newClub.description}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({...newClub, description: e.target.value})}
                          placeholder="Club description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={createClub}>Create Club</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}
              </CardTitle>
              <CardDescription>
                {selectedClubId === 'all' 
                  ? 'View and manage all padel clubs in the system'
                  : `Detailed information for ${clubs.find(c => c.id === selectedClubId)?.name || 'selected club'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs
                    .filter(club => selectedClubId === 'all' || club.id === selectedClubId)
                    .map((club) => (
                    <TableRow key={club.id}>
                      <TableCell className="font-medium">{club.name}</TableCell>
                      <TableCell>{club.address}</TableCell>
                      <TableCell>{club.phone}</TableCell>
                      <TableCell>{club.email}</TableCell>
                      <TableCell>{new Date(club.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">👨‍🏫 Instructors Management</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Instructor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Instructor</DialogTitle>
                      <DialogDescription>
                        Add a new instructor to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="instructorUserId">Usuario *</Label>
                        <select
                          id="instructorUserId"
                          value={newInstructor.userId}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewInstructor({...newInstructor, userId: e.target.value})}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccionar usuario</option>
                          {users.filter(user => user.role === 'PLAYER' || user.role === 'INSTRUCTOR').map((user) => (
                            <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="instructorClubId">Club *</Label>
                        <select
                          id="instructorClubId"
                          value={newInstructor.clubId}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewInstructor({...newInstructor, clubId: e.target.value})}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccionar club</option>
                          {clubs.map((club) => (
                            <option key={club.id} value={club.id}>{club.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="instructorSpecialties">Especialidades</Label>
                        <select
                          id="instructorSpecialties"
                          value={newInstructor.specialties}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewInstructor({...newInstructor, specialties: e.target.value})}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccionar especialidad</option>
                          <option value="Pádel Básico">Pádel Básico</option>
                          <option value="Pádel Avanzado">Pádel Avanzado</option>
                          <option value="Pádel Profesional">Pádel Profesional</option>
                          <option value="Fitness">Fitness</option>
                          <option value="Entrenamiento Personal">Entrenamiento Personal</option>
                          <option value="Pádel Infantil">Pádel Infantil</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="instructorExperience">Experiencia</Label>
                        <select
                          id="instructorExperience"
                          value={newInstructor.experience}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewInstructor({...newInstructor, experience: e.target.value})}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccionar nivel de experiencia</option>
                          <option value="1-2 años">1-2 años</option>
                          <option value="3-5 años">3-5 años</option>
                          <option value="5-10 años">5-10 años</option>
                          <option value="Más de 10 años">Más de 10 años</option>
                          <option value="Profesional certificado">Profesional certificado</option>
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={createInstructor}>Create Instructor</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Instructor Dialog */}
                <Dialog open={isEditInstructorDialogOpen} onOpenChange={setIsEditInstructorDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Instructor</DialogTitle>
                      <DialogDescription>
                        Update instructor information
                      </DialogDescription>
                    </DialogHeader>
                    {editingInstructor && (
                      <div className="space-y-4">
                        <div>
                          <ImageUpload
                            currentImage={editingInstructor.profilePictureUrl || null}
                            onImageChange={(url) => setEditingInstructor({...editingInstructor, profilePictureUrl: url})}
                            label="Foto de perfil del instructor"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-specialties">Especialidades</Label>
                          <select
                            id="edit-specialties"
                            value={editingInstructor.specialties}
                            onChange={(e) => setEditingInstructor({...editingInstructor, specialties: e.target.value})}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">Seleccionar especialidad</option>
                            <option value="Pádel Básico">Pádel Básico</option>
                            <option value="Pádel Avanzado">Pádel Avanzado</option>
                            <option value="Pádel Profesional">Pádel Profesional</option>
                            <option value="Fitness">Fitness</option>
                            <option value="Entrenamiento Personal">Entrenamiento Personal</option>
                            <option value="Pádel Infantil">Pádel Infantil</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="edit-experience">Experiencia</Label>
                          <select
                            id="edit-experience"
                            value={editingInstructor.experience}
                            onChange={(e) => setEditingInstructor({...editingInstructor, experience: e.target.value})}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">Seleccionar nivel de experiencia</option>
                            <option value="1-2 años">1-2 años</option>
                            <option value="3-5 años">3-5 años</option>
                            <option value="5-10 años">5-10 años</option>
                            <option value="Más de 10 años">Más de 10 años</option>
                            <option value="Profesional certificado">Profesional certificado</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="edit-hourlyRate">Tarifa por Hora (€)</Label>
                          <input
                            id="edit-hourlyRate"
                            type="number"
                            min="0"
                            step="0.5"
                            value={editingInstructor.hourlyRate}
                            onChange={(e) => setEditingInstructor({...editingInstructor, hourlyRate: parseFloat(e.target.value) || 0})}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-bio">Biografía</Label>
                          <textarea
                            id="edit-bio"
                            value={editingInstructor.bio}
                            onChange={(e) => setEditingInstructor({...editingInstructor, bio: e.target.value})}
                            className="w-full p-2 border rounded"
                            rows={3}
                            placeholder="Descripción del instructor..."
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            id="edit-isActive"
                            type="checkbox"
                            checked={editingInstructor.isActive}
                            onChange={(e) => setEditingInstructor({...editingInstructor, isActive: e.target.checked})}
                            className="rounded"
                          />
                          <Label htmlFor="edit-isActive">Activo</Label>
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditInstructorDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={updateInstructor}>
                        Update Instructor
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

              </CardTitle>
              <CardDescription>
                View and manage padel instructors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>ID (Debug)</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rate/Hour</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredInstructors().map((instructor) => (
                    <TableRow key={instructor.id}>
                      <TableCell>
                        {instructor.profilePictureUrl ? (
                          <img 
                            src={instructor.profilePictureUrl} 
                            alt={instructor.name} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">
                            {instructor.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{instructor.name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{instructor.email || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{instructor.clubName || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-gray-500 font-mono">{instructor.id}</TableCell>
                      <TableCell>{instructor.specialties || 'N/A'}</TableCell>
                      <TableCell>{instructor.yearsExperience || 0} años</TableCell>
                      <TableCell>
                        <Badge variant={instructor.isActive ? 'default' : 'secondary'}>
                          {instructor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canEditInstructor(instructor) ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                console.log('🖱️ Edit button clicked for:', instructor.id);
                                openEditInstructor(instructor);
                              }}
                              title="Editar información del instructor"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled
                              title="No tienes permisos para editar este instructor"
                            >
                              <Edit className="h-4 w-4 opacity-50" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" title="Ver información detallada">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Users Management
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="User name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="userClub">Club</Label>
                        <Select value={newUser.clubId} onValueChange={(value: string) => setNewUser({...newUser, clubId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a club (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto-assign">🌐 Auto-assign to first available club</SelectItem>
                            {clubs.map((club) => (
                              <SelectItem key={club.id} value={club.id}>
                                🏢 {club.name}
                                {club.address && <span className="text-xs text-gray-500 ml-1">- {club.address}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="level">Nivel (0.0 - 7.0)</Label>
                        <Select value={newUser.level} onValueChange={(value: string) => setNewUser({...newUser, level: value})}>
                          <SelectTrigger>
                            <SelectValue />
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

                    </div>
                    <DialogFooter>
                      <Button onClick={createUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredUsers().map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <EditableCell
                          value={user.name}
                          onSave={(newValue) => editUserInline('name', newValue, user.id)}
                          type="text"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={user.email}
                          onSave={(newValue) => editUserInline('email', newValue, user.id)}
                          type="email"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={user.level}
                          onSave={(newValue) => editUserInline('level', newValue, user.id)}
                          type="select"
                          options={['principiante', 'inicial-medio', 'intermedio', 'avanzado', 'abierto']}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={user.role}
                          onSave={(newValue) => editUserInline('role', newValue, user.id)}
                          type="select"
                          options={['PLAYER', 'INSTRUCTOR', 'CLUB_ADMIN', 'SUPER_ADMIN']}
                        />
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                            title="Editar usuario"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteUser(user.id)}
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dialog de edición de usuario */}
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                  Modifica la información del usuario
                </DialogDescription>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input
                      id="edit-name"
                      value={editingUser.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setEditingUser({...editingUser, name: e.target.value})
                      }
                      placeholder="Nombre del usuario"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setEditingUser({...editingUser, email: e.target.value})
                      }
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-userClub">Club</Label>
                    <Select 
                      value={editingUser.clubId || ''} 
                      onValueChange={(value: string) => 
                        setEditingUser({...editingUser, clubId: value || null})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar club (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin club asignado</SelectItem>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            🏢 {club.name}
                            {club.address && <span className="text-xs text-gray-500 ml-1">- {club.address}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-level">Nivel (0.0 - 7.0)</Label>
                    <Select 
                      value={editingUser.level || ''} 
                      onValueChange={(value: string) => 
                        setEditingUser({...editingUser, level: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <div>
                    <Label htmlFor="edit-role">Rol</Label>
                    <Select 
                      value={editingUser.role || 'CLIENT'} 
                      onValueChange={(value: string) => 
                        setEditingUser({...editingUser, role: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT">Cliente</SelectItem>
                        <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                        <SelectItem value="CLUB_ADMIN">Admin de Club</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => editingUser && updateUser(editingUser)}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="timeslots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                🕒 Gestión de Horarios
              </CardTitle>
              <CardDescription>
                Genera y administra horarios de clases grupales automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Generación automática de clases grupales */}
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">🎯 Clases Grupales Automáticas</CardTitle>
                    <CardDescription>
                      Sistema de generación automática de clases cada 30 minutos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selector de activación/desactivación */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${autoGenerateEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <div>
                          <div className="font-medium text-sm">
                            {autoGenerateEnabled ? '✅ Generación Automática Activa' : '⏸️ Generación Automática Pausada'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {autoGenerateEnabled ? 'El sistema crea clases diariamente' : 'Activa para generar clases automáticamente'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={autoGenerateEnabled ? 'destructive' : 'default'}
                        onClick={async () => {
                          try {
                            const newState = !autoGenerateEnabled;
                            
                            if (newState) {
                              // Al activar, generar clases inmediatamente
                              toast({
                                title: '⏳ Generando clases...',
                                description: 'Creando clases para los próximos 30 días',
                                className: 'bg-blue-500 text-white'
                              });
                              
                              await generateMonthlyClasses();
                              
                              // Solo activar si la generación fue exitosa
                              setAutoGenerateEnabled(newState);
                            } else {
                              // Desactivar inmediatamente
                              setAutoGenerateEnabled(newState);
                              toast({
                                title: '⏸️ Desactivado',
                                description: 'La generación automática de clases ha sido pausada',
                                className: 'bg-orange-500 text-white'
                              });
                            }
                          } catch (error) {
                            console.error('❌ Error en botón de activación:', error);
                            toast({
                              title: 'Error',
                              description: 'No se pudo activar la generación automática',
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        {autoGenerateEnabled ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>

                    {/* Botones de generación manual */}
                    <div className="space-y-2">
                      <Button 
                        onClick={generateMonthlyClasses}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        🗓️ Generar Clases (30 días)
                      </Button>
                      <Button 
                        onClick={generateWeeklyClasses}
                        variant="outline"
                        className="w-full border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Generar Clases (7 días)
                      </Button>
                      <Button 
                        onClick={generateGroupClasses}
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Generar Clases para Hoy
                      </Button>
                    </div>

                    <div className="text-xs text-gray-600 bg-white/50 p-3 rounded space-y-1">
                      <div className="font-medium">ℹ️ Información del Sistema:</div>
                      <div>• Las clases se crean como "abiertas" sin cancha asignada</div>
                      <div>• Al completarse (4 jugadores), se asigna automáticamente una cancha</div>
                      <div>• Con generación automática activa, el sistema crea clases diariamente</div>
                      <div>• Clases generadas cada 30 minutos de 09:00 a 21:00</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de horarios */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📋 Horarios Programados ({getFilteredTimeSlots().length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getFilteredTimeSlots().map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <div>
                              <div className="font-medium">
                                {new Date(slot.start).toLocaleDateString()} - {new Date(slot.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} a {new Date(slot.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                              <div className="text-sm text-gray-500">
                                {slot.category} • {slot.level} • {slot.maxPlayers} jugadores máx • €{slot.totalPrice}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{slot.category}</Badge>
                        </div>
                      ))}
                      {getFilteredTimeSlots().length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No hay horarios programados
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past-timeslots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                📜 Historial de Clases Pasadas
              </CardTitle>
              <CardDescription>
                Consulta las clases que ya se han realizado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📋 Clases Realizadas ({getPastTimeSlots().length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getPastTimeSlots()
                      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                      .map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">
                                {new Date(slot.start).toLocaleDateString()} - {new Date(slot.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} a {new Date(slot.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                              <div className="text-sm text-gray-500">
                                {slot.category} • {slot.level} • {slot.maxPlayers} jugadores máx • €{slot.totalPrice}
                                {slot.instructorName && ` • Instructor: ${slot.instructorName}`}
                              </div>
                              {slot.courtNumber && (
                                <div className="text-xs text-blue-600">
                                  Pista {slot.courtNumber}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-gray-300">
                            {slot.category}
                          </Badge>
                        </div>
                      ))}
                    {getPastTimeSlots().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay clases pasadas registradas
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings Management</CardTitle>
              <CardDescription>
                View and manage bookings with different filtering options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Sub-pestañas para filtrar bookings */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setBookingsFilter('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      bookingsFilter === 'all'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    📋 Todas las Reservas ({bookingsForCards.length})
                  </button>
                  <button
                    onClick={() => setBookingsFilter('confirmed')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      bookingsFilter === 'confirmed'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    ✅ Reservas Confirmadas ({bookingsForCards.filter(b => {
                      let actualMaxPlayers;
                      if (b.groupSize === 1 && b.timeSlot?.totalPlayers === 1) {
                        actualMaxPlayers = 1;
                      } else {
                        actualMaxPlayers = b.timeSlot?.maxPlayers || 4;
                      }
                      const currentPlayers = b.timeSlot?.totalPlayers || 0;
                      return currentPlayers >= actualMaxPlayers;
                    }).length})
                  </button>
                  <button
                    onClick={() => setBookingsFilter('pending')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      bookingsFilter === 'pending'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    ⏳ Reservas Pendientes ({bookingsForCards.filter(b => {
                      let actualMaxPlayers;
                      if (b.groupSize === 1 && b.timeSlot?.totalPlayers === 1) {
                        actualMaxPlayers = 1;
                      } else {
                        actualMaxPlayers = b.timeSlot?.maxPlayers || 4;
                      }
                      const currentPlayers = b.timeSlot?.totalPlayers || 0;
                      return currentPlayers < actualMaxPlayers;
                    }).length})
                  </button>
                </div>
              </div>

              {getFilteredBookingsByStatus().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {bookingsFilter === 'all' && 'No se encontraron reservas'}
                    {bookingsFilter === 'confirmed' && 'No hay reservas confirmadas'}
                    {bookingsFilter === 'pending' && 'No hay reservas pendientes'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {getFilteredBookingsByStatus().map((booking) => (
                    <AdminBookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardHat className="mr-2 h-5 w-5" />
                🏟️ Gestión de Pistas
              </CardTitle>
              <CardDescription>
                Administra las pistas de pádel del club
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Formulario para crear nueva pista */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">➕ Añadir Nueva Pista</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="courtClub">Club *</Label>
                          <select
                            id="courtClub"
                            value={newCourt.clubId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCourt({...newCourt, clubId: e.target.value})}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={selectedProfile !== 'super-admin'}
                          >
                            <option value="">Seleccionar club</option>
                            {getAvailableClubsForCreation().map((club) => (
                              <option key={club.id} value={club.id}>{club.name}</option>
                            ))}
                          </select>
                          {selectedProfile !== 'super-admin' && (
                            <p className="text-xs text-gray-500 mt-1">
                              ℹ️ Solo puedes crear pistas para tu club asignado
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="courtNumber">Número *</Label>
                          <Input
                            id="courtNumber"
                            type="number"
                            value={newCourt.number}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourt({...newCourt, number: parseInt(e.target.value)})}
                            placeholder="Ej: 1"
                            className="p-3"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="courtName">Nombre de la Pista *</Label>
                        <Input
                          id="courtName"
                          value={newCourt.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourt({...newCourt, name: e.target.value})}
                          placeholder="Ej: Pista Central"
                          className="p-3"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="courtCapacity">Capacidad (jugadores)</Label>
                        <Input
                          id="courtCapacity"
                          type="number"
                          value={newCourt.capacity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourt({...newCourt, capacity: parseInt(e.target.value)})}
                          placeholder="4"
                          className="p-3"
                          min="2"
                          max="8"
                        />
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <input
                          type="checkbox"
                          id="courtActive"
                          checked={newCourt.isActive}
                          onChange={(e) => setNewCourt({...newCourt, isActive: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="courtActive" className="text-sm font-medium">Pista activa</Label>
                      </div>
                      <Button 
                        onClick={createCourt}
                        className="w-full h-12 text-base font-medium"
                        size="lg"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Crear Pista
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de pistas */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>📋 Pistas Registradas</span>
                        <Badge variant="secondary" className="text-sm">{getFilteredCourts().length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {getFilteredCourts().map((court) => (
                          <div key={court.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${court.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-lg flex items-center">
                                    🏟️ {court.name}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="inline-block mr-4">📋 Número: {court.number}</span>
                                    <span className="inline-block">👥 Capacidad: {court.capacity} jugadores</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                <Badge variant={court.isActive ? "default" : "destructive"} className="text-xs">
                                  {court.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                        {getFilteredCourts().length === 0 && (
                          <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-200 rounded-lg">
                            <div className="text-4xl mb-2">🏟️</div>
                            <div className="text-lg font-medium">No hay pistas registradas</div>
                            <div className="text-sm mt-1">Crea tu primera pista usando el formulario</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <ClubCalendar clubId={selectedClubId !== 'all' ? selectedClubId : 'padel-estrella-madrid'} />
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                💰 Configuración de Tarifas
              </CardTitle>
              <CardDescription>
                Define los precios para clases y partidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Gestión de Tarifas</p>
                <p className="text-sm">Esta funcionalidad estará disponible próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                ⚙️ Configuración del Club
              </CardTitle>
              <CardDescription>
                Configuración general del club y datos de contacto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getFilteredClubs().length > 0 ? (
                <div className="space-y-6">
                  {getFilteredClubs().map((club) => {
                    // Inicializar settings si no existen
                    if (!clubSettings[club.id]) {
                      setClubSettings(prev => ({
                        ...prev,
                        [club.id]: {
                          name: club.name,
                          email: club.email || '',
                          phone: club.phone || '',
                          address: club.address || '',
                          logo: club.logo || '',
                          description: club.description || '',
                          courtRentalPrice: (club as any).courtRentalPrice || 10,
                          openingTime: '08:00',
                          closingTime: '22:00'
                        }
                      }));
                    }

                    const settings = clubSettings[club.id] || {
                      name: club.name,
                      email: club.email || '',
                      phone: club.phone || '',
                      address: club.address || '',
                      logo: club.logo || '',
                      description: club.description || '',
                      courtRentalPrice: (club as any).courtRentalPrice || 10,
                      openingTime: '08:00',
                      closingTime: '22:00'
                    };

                    return (
                      <div key={club.id} className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          🏢 {club.name}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Nombre del Club */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-name-${club.id}`}>Nombre del Club</Label>
                            <Input
                              id={`club-name-${club.id}`}
                              value={settings.name}
                              placeholder="Nombre del club"
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, name: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Email de Contacto */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-email-${club.id}`}>Email de Contacto</Label>
                            <Input
                              id={`club-email-${club.id}`}
                              type="email"
                              value={settings.email}
                              placeholder="contacto@club.com"
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, email: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Teléfono */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-phone-${club.id}`}>Teléfono</Label>
                            <Input
                              id={`club-phone-${club.id}`}
                              type="tel"
                              value={settings.phone}
                              placeholder="+34 XXX XXX XXX"
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, phone: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Dirección */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-address-${club.id}`}>Dirección</Label>
                            <Input
                              id={`club-address-${club.id}`}
                              value={settings.address}
                              placeholder="Calle, número, ciudad"
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, address: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Horario de Apertura */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-opening-${club.id}`}>Hora de Apertura</Label>
                            <Input
                              id={`club-opening-${club.id}`}
                              type="time"
                              value={settings.openingTime}
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, openingTime: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Horario de Cierre */}
                          <div className="space-y-2">
                            <Label htmlFor={`club-closing-${club.id}`}>Hora de Cierre</Label>
                            <Input
                              id={`club-closing-${club.id}`}
                              type="time"
                              value={settings.closingTime}
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, closingTime: e.target.value }
                                }));
                              }}
                            />
                          </div>

                          {/* Tarifa de Alquiler de Pista */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`club-court-price-${club.id}`}>
                              💰 Tarifa de Alquiler de Pista por Defecto (€/hora)
                            </Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                id={`club-court-price-${club.id}`}
                                type="number"
                                step="0.5"
                                min="0"
                                value={settings.courtRentalPrice}
                                placeholder="10.00"
                                onChange={(e) => {
                                  setClubSettings(prev => ({
                                    ...prev,
                                    [club.id]: { ...settings, courtRentalPrice: parseFloat(e.target.value) || 0 }
                                  }));
                                }}
                                className="max-w-32"
                              />
                              <span className="text-sm text-gray-500">
                                Este precio se usa cuando no hay franjas horarias configuradas
                              </span>
                            </div>
                          </div>

                          {/* Franjas Horarias con Precios */}
                          <div className="space-y-3 md:col-span-2">
                            <div className="flex items-center justify-between">
                              <Label>🕐 Franjas Horarias con Precios Personalizados</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setNewPriceSlot({
                                    clubId: club.id,
                                    name: '',
                                    startTime: '09:00',
                                    endTime: '12:00',
                                    price: 10,
                                    daysOfWeek: [1, 2, 3, 4, 5],
                                    priority: 0
                                  });
                                  setEditingPriceSlot(null);
                                  setIsPriceSlotDialogOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Añadir Franja
                              </Button>
                            </div>
                            
                            {priceSlots[club.id] && priceSlots[club.id].length > 0 ? (
                              <div className="space-y-2">
                                {priceSlots[club.id].map((slot: any) => {
                                  const days = JSON.parse(slot.daysOfWeek) as number[];
                                  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                  const daysText = days.map(d => dayNames[d]).join(', ');
                                  
                                  return (
                                    <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{slot.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          {slot.startTime} - {slot.endTime} • {daysText}
                                        </div>
                                        <div className="text-sm font-semibold text-green-600 mt-1">
                                          €{slot.price}/hora {slot.priority > 0 && `(Prioridad: ${slot.priority})`}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingPriceSlot({
                                              ...slot,
                                              daysOfWeek: JSON.parse(slot.daysOfWeek)
                                            });
                                            setIsPriceSlotDialogOpen(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            if (confirm('¿Eliminar esta franja horaria?')) {
                                              deletePriceSlot(slot.id, club.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                                No hay franjas horarias configuradas. Se usará el precio por defecto.
                              </div>
                            )}
                          </div>

                          {/* Logo del Club */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`club-logo-${club.id}`}>URL del Logo</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`club-logo-${club.id}`}
                                value={settings.logo}
                                placeholder="https://ejemplo.com/logo.png"
                                onChange={(e) => {
                                  setClubSettings(prev => ({
                                    ...prev,
                                    [club.id]: { ...settings, logo: e.target.value }
                                  }));
                                }}
                              />
                              {settings.logo && (
                                <div className="w-12 h-12 border rounded overflow-hidden flex-shrink-0">
                                  <img 
                                    src={settings.logo} 
                                    alt="Logo del club" 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Descripción */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`club-description-${club.id}`}>Descripción</Label>
                            <textarea
                              id={`club-description-${club.id}`}
                              className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                              value={settings.description}
                              placeholder="Descripción del club, servicios, instalaciones..."
                              onChange={(e) => {
                                setClubSettings(prev => ({
                                  ...prev,
                                  [club.id]: { ...settings, description: e.target.value }
                                }));
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t">
                          <Button 
                            className="w-full md:w-auto"
                            onClick={() => updateClubSettings(club.id, settings)}
                          >
                            💾 Guardar Cambios
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No hay club seleccionado</p>
                  <p className="text-sm">Selecciona un club para ver su configuración</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Crear/Editar Franja Horaria */}
      <Dialog open={isPriceSlotDialogOpen} onOpenChange={setIsPriceSlotDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPriceSlot ? 'Editar Franja Horaria' : 'Nueva Franja Horaria'}
            </DialogTitle>
            <DialogDescription>
              Configura el precio de alquiler de pista para una franja horaria específica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre de la franja */}
            <div className="space-y-2">
              <Label>Nombre de la Franja</Label>
              <Input
                placeholder="Ej: Horario Valle, Horario Punta, Fin de Semana"
                value={editingPriceSlot?.name || newPriceSlot.name}
                onChange={(e) => {
                  if (editingPriceSlot) {
                    setEditingPriceSlot({ ...editingPriceSlot, name: e.target.value });
                  } else {
                    setNewPriceSlot({ ...newPriceSlot, name: e.target.value });
                  }
                }}
              />
            </div>

            {/* Horario */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input
                  type="time"
                  value={editingPriceSlot?.startTime || newPriceSlot.startTime}
                  onChange={(e) => {
                    if (editingPriceSlot) {
                      setEditingPriceSlot({ ...editingPriceSlot, startTime: e.target.value });
                    } else {
                      setNewPriceSlot({ ...newPriceSlot, startTime: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input
                  type="time"
                  value={editingPriceSlot?.endTime || newPriceSlot.endTime}
                  onChange={(e) => {
                    if (editingPriceSlot) {
                      setEditingPriceSlot({ ...editingPriceSlot, endTime: e.target.value });
                    } else {
                      setNewPriceSlot({ ...newPriceSlot, endTime: e.target.value });
                    }
                  }}
                />
              </div>
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <Label>Precio por Hora (€)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="10.00"
                value={editingPriceSlot?.price || newPriceSlot.price}
                onChange={(e) => {
                  if (editingPriceSlot) {
                    setEditingPriceSlot({ ...editingPriceSlot, price: parseFloat(e.target.value) || 0 });
                  } else {
                    setNewPriceSlot({ ...newPriceSlot, price: parseFloat(e.target.value) || 0 });
                  }
                }}
              />
            </div>

            {/* Días de la semana */}
            <div className="space-y-2">
              <Label>Días de la Semana</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 1, label: 'Lun' },
                  { value: 2, label: 'Mar' },
                  { value: 3, label: 'Mié' },
                  { value: 4, label: 'Jue' },
                  { value: 5, label: 'Vie' },
                  { value: 6, label: 'Sáb' },
                  { value: 0, label: 'Dom' }
                ].map(day => {
                  const selectedDays = editingPriceSlot?.daysOfWeek || newPriceSlot.daysOfWeek;
                  const isSelected = selectedDays.includes(day.value);
                  
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentDays = editingPriceSlot?.daysOfWeek || newPriceSlot.daysOfWeek;
                        const newDays = isSelected
                          ? currentDays.filter((d: number) => d !== day.value)
                          : [...currentDays, day.value];
                        
                        if (editingPriceSlot) {
                          setEditingPriceSlot({ ...editingPriceSlot, daysOfWeek: newDays });
                        } else {
                          setNewPriceSlot({ ...newPriceSlot, daysOfWeek: newDays });
                        }
                      }}
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selecciona los días en los que aplica esta franja horaria
              </p>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label>Prioridad (opcional)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={editingPriceSlot?.priority || newPriceSlot.priority}
                onChange={(e) => {
                  if (editingPriceSlot) {
                    setEditingPriceSlot({ ...editingPriceSlot, priority: parseInt(e.target.value) || 0 });
                  } else {
                    setNewPriceSlot({ ...newPriceSlot, priority: parseInt(e.target.value) || 0 });
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Mayor prioridad se aplica primero si hay solapamiento (0 = menor prioridad)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceSlotDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingPriceSlot) {
                  updatePriceSlot(editingPriceSlot.id, editingPriceSlot.clubId, editingPriceSlot);
                } else {
                  createPriceSlot();
                }
              }}
            >
              {editingPriceSlot ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogos para Añadir Saldo y Convertir Euros */}
      {selectedUserId && (
        <>
          <AddCreditDialog
            isOpen={showAddCreditDialog}
            onOpenChange={setShowAddCreditDialog}
            userId={selectedUserId}
            onCreditAdded={(newBalance) => {
              // Actualizar el saldo del usuario en el estado local
              setUsers(prevUsers => 
                prevUsers.map(u => 
                  u.id === selectedUserId 
                    ? { ...u, credits: newBalance } 
                    : u
                )
              );
              // Recargar datos
              loadData();
            }}
          />
          
          {selectedUserId && users.find(u => u.id === selectedUserId) && (
            <ConvertBalanceDialog
              isOpen={showConvertBalanceDialog}
              onOpenChange={setShowConvertBalanceDialog}
              currentUser={users.find(u => u.id === selectedUserId) as any}
              onConversionSuccess={(newCredit, newPoints) => {
                // Actualizar el usuario en el estado local
                setUsers(prevUsers => 
                  prevUsers.map(u => 
                    u.id === selectedUserId 
                      ? { ...u, credits: newCredit, points: newPoints } 
                      : u
                  )
                );
                // Recargar datos
                loadData();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}


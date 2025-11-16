'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { TimeOfDayFilterType, ViewPreference, User } from '@/types';

interface Instructor {
  id: string;
  name: string;
  picture?: string;
}

interface UserPreferenceFiltersProps {
  currentUser: User;
  onPreferencesChange: (preferences: {
    timeSlotFilter: TimeOfDayFilterType;
    viewPreference: ViewPreference;
    playerCounts: number[];
    instructorIds: string[];
  }) => void;
}

export function UserPreferenceFilters({ currentUser, onPreferencesChange }: UserPreferenceFiltersProps) {
  // Verificar que tenemos un usuario
  if (!currentUser) {
    return null;
  }

  // Estados locales para los filtros
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeOfDayFilterType>('all');
  const [viewPreference, setViewPreference] = useState<ViewPreference>('all');
  const [playerCounts, setPlayerCounts] = useState<number[]>([1, 2, 3, 4]);
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  
  // Estados para los paneles modales
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false);
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false);
  const [showPlayerCountPanel, setShowPlayerCountPanel] = useState(false);
  const [showInstructorFilterPanel, setShowInstructorFilterPanel] = useState(false);

  // Cargar instructores disponibles
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const response = await fetch('/api/instructors');
        if (response.ok) {
          const data = await response.json();
          setAvailableInstructors(data);
        }
      } catch (error) {
        console.error('Error fetching instructors:', error);
      }
    };
    fetchInstructors();
  }, []);

  // Cargar preferencias guardadas del usuario
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(`/api/users/${currentUser.id}/preferences`);
        if (response.ok) {
          const prefs = await response.json();
          if (prefs.timeSlotFilter) setTimeSlotFilter(prefs.timeSlotFilter);
          if (prefs.viewPreference) setViewPreference(prefs.viewPreference);
          if (prefs.playerCounts) setPlayerCounts(prefs.playerCounts);
          if (prefs.instructorIds) setInstructorIds(prefs.instructorIds);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, [currentUser.id]);

  // Guardar preferencias cuando cambien
  const savePreferences = async (prefs: any) => {
    try {
      await fetch(`/api/users/${currentUser.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      onPreferencesChange(prefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleTimeFilterChange = (value: TimeOfDayFilterType) => {
    setTimeSlotFilter(value);
    savePreferences({ timeSlotFilter: value, viewPreference, playerCounts, instructorIds });
    setShowTimeFilterPanel(false);
  };

  const handleViewChange = (value: ViewPreference) => {
    setViewPreference(value);
    savePreferences({ timeSlotFilter, viewPreference: value, playerCounts, instructorIds });
    setShowViewFilterPanel(false);
  };

  const handlePlayerCountToggle = (count: number) => {
    const newCounts = playerCounts.includes(count)
      ? playerCounts.filter(c => c !== count)
      : [...playerCounts, count].sort();
    setPlayerCounts(newCounts);
    savePreferences({ timeSlotFilter, viewPreference, playerCounts: newCounts, instructorIds });
  };

  const handleInstructorToggle = (instructorId: string) => {
    const newIds = instructorIds.includes(instructorId)
      ? instructorIds.filter(id => id !== instructorId)
      : [...instructorIds, instructorId];
    setInstructorIds(newIds);
    savePreferences({ timeSlotFilter, viewPreference, playerCounts, instructorIds: newIds });
  };

  return (
    <>
      {/* FILTROS LATERALES */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center pr-1">
        {/* FILTRO DE INSTRUCTORES */}
        {availableInstructors.length > 0 && (
          <div className={`bg-white rounded-full p-1 flex flex-col gap-1 items-center transition-all duration-200 ${
            instructorIds.length > 0 && instructorIds.length < availableInstructors.length
              ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
              : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
          }`}>
            {availableInstructors.map(instructor => (
              <button
                key={instructor.id}
                onClick={() => setShowInstructorFilterPanel(true)}
                className={`
                  w-7 h-7 rounded-full transition-all duration-200 cursor-pointer overflow-hidden
                  ${instructorIds.length === 0 || instructorIds.includes(instructor.id)
                    ? 'border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]'
                    : 'border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] opacity-40 hover:opacity-70 hover:border-gray-400'
                  }
                `}
                title={`Filtrar por ${instructor.name}`}
              >
                {instructor.picture ? (
                  <img 
                    src={instructor.picture} 
                    alt={instructor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                    {instructor.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* CÍRCULO DE RELOJ */}
        <button
          onClick={() => setShowTimeFilterPanel(true)}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
            ${timeSlotFilter !== 'all'
              ? 'bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]'
              : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
            }
          `}
          title="Preferencia de horario"
        >
          <svg 
            className="w-full h-full" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="white" />
            {timeSlotFilter === 'morning' && (
              <path d="M12 12 L12 2 A10 10 0 0 1 20.66 7.34 Z" fill="#22c55e" opacity="0.7" />
            )}
            {timeSlotFilter === 'midday' && (
              <path d="M12 12 L20.66 7.34 A10 10 0 0 1 20.66 16.66 Z" fill="#22c55e" opacity="0.7" />
            )}
            {timeSlotFilter === 'evening' && (
              <path d="M12 12 L20.66 16.66 A10 10 0 0 1 12 22 Z" fill="#22c55e" opacity="0.7" />
            )}
            <circle cx="12" cy="12" r="10" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" fill="none" />
            <line x1="12" y1="12" x2="12" y2="6" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="12" x2="16" y2="12" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="1.5" fill={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} />
          </svg>
        </button>

        {/* CÍRCULO DE VISTA */}
        <button
          onClick={() => setShowViewFilterPanel(true)}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
            ${viewPreference === 'withBookings'
              ? 'bg-white border border-blue-500 shadow-[inset_0_1px_3px_rgba(59,130,246,0.2)]'
              : viewPreference === 'myConfirmed'
              ? 'bg-white border border-red-500 shadow-[inset_0_1px_3px_rgba(239,68,68,0.2)]'
              : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
            }
          `}
          title="Preferencia de visualización"
        >
          <svg 
            className="w-full h-full" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="white" />
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.5" 
              fill="none"
            />
            <circle 
              cx="9" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <circle 
              cx="15" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <path 
              d="M5 18c0-2.5 1.8-4 4-4s4 1.5 4 4M11 18c0-2.5 1.8-4 4-4s4 1.5 4 4" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* CÁPSULA DE NÚMEROS */}
        <div className={`bg-white rounded-full p-1 flex flex-col gap-1 items-center transition-all duration-200 ${
          playerCounts.length < 4
            ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
            : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
        }`}>
          {[1, 2, 3, 4].map(count => (
            <button
              key={count}
              onClick={() => setShowPlayerCountPanel(true)}
              className={`
                w-7 h-7 rounded-full font-bold text-xs transition-all duration-200 cursor-pointer bg-white
                ${playerCounts.includes(count)
                  ? 'border border-green-600 text-green-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]'
                  : 'border border-gray-300 text-gray-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400 hover:text-gray-500'
                }
              `}
              title="Preferencia de jugadores"
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* MODALES */}
      
      {/* Modal de Horario */}
      {showTimeFilterPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowTimeFilterPanel(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-center">Preferencia de Horario</h3>
            <div className="space-y-2">
              {[
                { value: 'all' as const, label: 'Todas las Franjas', icon: '🕐' },
                { value: 'morning' as const, label: 'Mañana (9:00-12:00)', icon: '🌅' },
                { value: 'midday' as const, label: 'Mediodía (12:00-17:00)', icon: '☀️' },
                { value: 'evening' as const, label: 'Tarde (17:00-22:00)', icon: '🌙' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTimeFilterChange(option.value)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center gap-3 ${
                    timeSlotFilter === option.value
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTimeFilterPanel(false)}
              className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* Modal de Vista */}
      {showViewFilterPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowViewFilterPanel(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-center">Preferencia de Visualización</h3>
            <div className="space-y-2">
              {[
                { value: 'all' as ViewPreference, label: 'Todas las Clases', color: 'gray', icon: '📋' },
                { value: 'withBookings' as ViewPreference, label: 'Con Reservas Pendientes', color: 'blue', icon: '⏳' },
                { value: 'myConfirmed' as ViewPreference, label: 'Mis Clases Confirmadas', color: 'red', icon: '✅' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleViewChange(option.value)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center gap-3 ${
                    viewPreference === option.value
                      ? option.color === 'blue'
                        ? 'bg-blue-500 text-white'
                        : option.color === 'red'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowViewFilterPanel(false)}
              className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* Modal de Jugadores */}
      {showPlayerCountPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowPlayerCountPanel(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-center">Preferencia de Jugadores</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => handlePlayerCountToggle(count)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center gap-3 ${
                    playerCounts.includes(count)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-2xl">{count === 1 ? '👤' : count === 2 ? '👥' : count === 3 ? '👥👤' : '👥👥'}</span>
                  <span>Clases de {count} {count === 1 ? 'jugador' : 'jugadores'}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPlayerCountPanel(false)}
              className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* Modal de Instructores */}
      {showInstructorFilterPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowInstructorFilterPanel(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-center">Preferencia de Instructores</h3>
            <div className="space-y-2">
              {availableInstructors.map(instructor => (
                <button
                  key={instructor.id}
                  onClick={() => handleInstructorToggle(instructor.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center gap-3 ${
                    instructorIds.length === 0 || instructorIds.includes(instructor.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {instructor.picture ? (
                    <img 
                      src={instructor.picture} 
                      alt={instructor.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                      {instructor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{instructor.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowInstructorFilterPanel(false)}
              className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </>
      )}
    </>
  );
}

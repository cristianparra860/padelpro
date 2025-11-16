import { useState, useEffect } from 'react';
import type { TimeOfDayFilterType, ViewPreference } from '@/types';

interface UserPreferences {
  timeSlotFilter: TimeOfDayFilterType;
  viewPreference: ViewPreference;
  playerCounts: number[];
  instructorIds: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  timeSlotFilter: 'all',
  viewPreference: 'all',
  playerCounts: [1, 2, 3, 4],
  instructorIds: [],
};

export function useUserPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar preferencias al montar
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // 1. Primero intentar cargar desde localStorage (instantáneo)
    const cachedKey = `userPrefs_${userId}`;
    const cached = localStorage.getItem(cachedKey);
    
    if (cached) {
      try {
        const cachedPrefs = JSON.parse(cached);
        setPreferences(cachedPrefs);
      } catch (error) {
        console.error('Error parsing cached preferences:', error);
      }
    }

    // 2. Luego sincronizar con la base de datos
    fetch(`/api/users/${userId}/preferences`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch preferences');
        return res.json();
      })
      .then(dbPrefs => {
        setPreferences(dbPrefs);
        // Actualizar localStorage con la versión de BD
        localStorage.setItem(cachedKey, JSON.stringify(dbPrefs));
      })
      .catch(error => {
        console.error('Error loading preferences from DB:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  // Función para actualizar preferencias
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!userId) return;

    const updated = { ...preferences, ...newPreferences };
    
    // 1. Actualizar estado local inmediatamente
    setPreferences(updated);
    
    // 2. Guardar en localStorage (sincrónico)
    const cachedKey = `userPrefs_${userId}`;
    localStorage.setItem(cachedKey, JSON.stringify(updated));
    
    // 3. Guardar en base de datos (asíncrono, en segundo plano)
    try {
      await fetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
    } catch (error) {
      console.error('Error saving preferences to DB:', error);
      // No mostramos error al usuario porque ya se guardó localmente
    }
  };

  return {
    preferences,
    updatePreferences,
    isLoading,
  };
}

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ClubConfig {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  theme?: Record<string, any>;
}

interface ClubContextType {
  club: ClubConfig | null;
  loading: boolean;
  error: string | null;
}

const ClubContext = createContext<ClubContextType>({
  club: null,
  loading: true,
  error: null,
});

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within ClubProvider');
  }
  return context;
};

interface ClubProviderProps {
  children: React.ReactNode;
  clubSlug: string;
}

export function ClubProvider({ children, clubSlug }: ClubProviderProps) {
  const [club, setClub] = useState<ClubConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubConfig = async () => {
      try {
        setLoading(true);
        
        // Llamar al API para obtener configuración del club
        const response = await fetch(`/api/clubs/by-slug/${clubSlug}`);
        
        if (!response.ok) {
          throw new Error(`Club "${clubSlug}" no encontrado`);
        }

        const data = await response.json();
        
        setClub({
          id: data.id,
          slug: data.slug || clubSlug,
          name: data.name,
          logo: data.logo,
          primaryColor: data.primaryColor,
          theme: data.theme,
        });
        
        setError(null);
      } catch (err: any) {
        console.error('Error loading club config:', err);
        setError(err.message);
        setClub(null);
      } finally {
        setLoading(false);
      }
    };

    if (clubSlug) {
      fetchClubConfig();
    }
  }, [clubSlug]);

  // Aplicar tema personalizado del club
  useEffect(() => {
    if (club?.primaryColor) {
      document.documentElement.style.setProperty('--club-primary', club.primaryColor);
    }
  }, [club]);

  return (
    <ClubContext.Provider value={{ club, loading, error }}>
      {children}
    </ClubContext.Provider>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Loader2 } from 'lucide-react';

interface Club {
  id: string;
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  primaryColor?: string;
}

export default function ClubSelectorPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clubes disponibles (hardcoded por ahora, luego puede venir de API)
    const availableClubs: Club[] = [
      {
        id: 'padel-estrella-madrid',
        slug: 'estrella',
        name: 'Padel Estrella Madrid',
        address: 'Madrid, España',
        phone: '+34 912345678',
        email: 'info@padelestrella.com',
        logo: '/logos/estrella.png',
        primaryColor: '#FFD700',
      },
      {
        id: 'club-1',
        slug: 'casillas',
        name: 'Club Casillas',
        address: 'Valencia, España',
        phone: '+34 963456789',
        email: 'info@clubcasillas.com',
        logo: '/logos/casillas.png',
        primaryColor: '#0066CC',
      },
      {
        id: 'demo',
        slug: 'demo',
        name: 'Club Demo',
        address: 'Barcelona, España',
        phone: '+34 934567890',
        email: 'info@demo.com',
        logo: '/logos/demo.png',
        primaryColor: '#10B981',
      },
    ];

    setClubs(availableClubs);
    setLoading(false);
  }, []);

  const handleClubSelect = (slug: string) => {
    // Redirigir al login del club seleccionado
    router.push(`/${slug}/demo`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎾 Plataforma PadelPro
          </h1>
          <p className="text-lg text-gray-600">
            Selecciona tu club para comenzar
          </p>
        </div>

        {/* Grid de Clubes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {clubs.map((club) => (
            <button
              key={club.slug}
              onClick={() => handleClubSelect(club.slug)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-500 p-6"
              style={{
                '--club-color': club.primaryColor,
              } as React.CSSProperties}
            >
              {/* Color Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: club.primaryColor }}
              />

              {/* Logo Placeholder */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: club.primaryColor }}
                >
                  {club.name.charAt(0)}
                </div>
              </div>

              {/* Nombre del Club */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                {club.name}
              </h2>

              {/* Información */}
              <div className="space-y-2 text-left">
                {club.address && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{club.address}</span>
                  </div>
                )}
                
                {club.phone && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{club.phone}</span>
                  </div>
                )}

                {club.email && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{club.email}</span>
                  </div>
                )}
              </div>

              {/* Botón */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center text-blue-600 font-semibold group-hover:text-blue-700">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span>Acceder al Club</span>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>Sistema Multi-Club • Gestión de Clases de Pádel</p>
        </div>
      </div>
    </div>
  );
}

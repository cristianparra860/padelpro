// src/app/clubs/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Users, Calendar } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
}

export default function ClubsPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Error al cargar clubes');
        const data = await response.json();
        setClubs(data.clubs || []);
      } catch (error) {
        console.error('Error cargando clubes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClubs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando clubes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Selecciona tu Club de Pádel
          </h1>
          <p className="text-gray-600 text-lg">
            Elige el club donde quieres reservar tus clases
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {clubs.map((club) => {
            // Convertir el club ID a slug (temporalmente hasta que añadamos campo slug a la BD)
            const slug = club.id.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

            return (
              <button
                key={club.id}
                onClick={() => router.push(`/${slug}/demo`)}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300 transform hover:-translate-y-2"
              >
                {/* Header con gradiente */}
                <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl truncate">
                      {club.name}
                    </h3>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {club.location && (
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{club.location}</span>
                    </div>
                  )}

                  {club.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {club.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Clases disponibles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Reserva online</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-blue-600 font-semibold text-sm group-hover:text-purple-600 transition-colors">
                      Acceder al club →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {clubs.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">No hay clubes disponibles en este momento</p>
          </div>
        )}

        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

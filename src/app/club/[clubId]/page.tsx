// src/app/club/[clubId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import Image from 'next/image';

interface Club {
  id: string;
  name: string;
  location?: string;
  description?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
}

export default function ClubPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.clubId as string;
  
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClub = async () => {
      try {
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Error al cargar clubes');
        
        const clubs = await response.json();
        // Buscar por id (UUID) directamente
        const foundClub = clubs.find((c: Club) => c.id === clubId);
        
        if (!foundClub) {
          setError('Club no encontrado');
        } else {
          setClub({
            id: foundClub.id,
            name: foundClub.name,
            location: foundClub.location,
            description: foundClub.description,
            phone: foundClub.phone,
            email: foundClub.email,
            imageUrl: foundClub.logoUrl
          });
        }
      } catch (error) {
        console.error('Error cargando club:', error);
        setError('Error al cargar la información del club');
      } finally {
        setLoading(false);
      }
    };

    if (clubId) {
      loadClub();
    }
  }, [clubId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando club...</p>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Club no encontrado'}
          </h2>
          <button
            onClick={() => router.push('/clubs')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver a la lista de clubes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/clubs')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a clubes
          </button>
          
          <div className="flex items-start gap-6">
            {club.imageUrl ? (
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                <Image 
                  src={club.imageUrl} 
                  alt={club.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-4xl font-bold">{club.name.charAt(0)}</span>
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {club.name}
              </h1>
              
              {club.location && (
                <div className="flex items-center gap-2 text-white/90 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{club.location}</span>
                </div>
              )}
              
              {club.description && (
                <p className="text-white/80 mt-3 max-w-2xl">
                  {club.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Información de contacto */}
          {(club.phone || club.email) && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Información de Contacto</h2>
              <div className="space-y-3">
                {club.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span>{club.phone}</span>
                  </div>
                )}
                {club.email && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <a href={`mailto:${club.email}`} className="hover:text-blue-600 transition-colors">
                      {club.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              ¿Qué quieres hacer?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  // Guardar el club en localStorage para que lo use la app
                  localStorage.setItem('selectedClubId', clubId);
                  router.push('/auth/login');
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">Iniciar Sesión</h3>
                  <p className="text-blue-100">
                    Accede a tu cuenta y reserva clases
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('selectedClubId', clubId);
                  router.push(`/activities?view=clases&clubId=${clubId}`);
                }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-8 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">Ver Clases</h3>
                  <p className="text-purple-100">
                    Explora las clases disponibles
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

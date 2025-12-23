'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClubProvider, useClub } from '@/contexts/ClubContext';
import { Building2, MapPin, Phone, Mail, Palette, ArrowLeft, CheckCircle2 } from 'lucide-react';

function DemoContent() {
  const { club, loading, error } = useClub();
  const router = useRouter();
  const params = useParams();
  const clubSlug = params.clubSlug as string;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración del club...</p>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Club no encontrado</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/club-selector')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver a selección de clubes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header con botón volver */}
        <button
          onClick={() => router.push('/club-selector')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a selección de clubes
        </button>

        {/* Tarjeta Principal */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header con color del club */}
          <div
            className="h-32 relative"
            style={{
              background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.primaryColor}dd 100%)`,
            }}
          >
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                {club.name}
              </h1>
              <p className="text-white/90 text-sm">
                Slug: <code className="bg-white/20 px-2 py-1 rounded">{club.slug}</code>
              </p>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8">
            {/* Estado del Sistema */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-green-800">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="font-semibold">Sistema Multi-Tenant Activo</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Estás viendo la configuración específica del club "{club.name}"
              </p>
            </div>

            {/* Información del Club */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
                <div className="space-y-3">
                  {club.address && (
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Dirección</p>
                        <p className="text-gray-900">{club.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {club.phone && (
                    <div className="flex items-start">
                      <Phone className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="text-gray-900">{club.phone}</p>
                      </div>
                    </div>
                  )}

                  {club.email && (
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-gray-900">{club.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Tema</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Palette className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Color Primario</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: club.primaryColor }}
                        ></div>
                        <code className="text-sm text-gray-900">{club.primaryColor}</code>
                      </div>
                    </div>
                  </div>

                  {club.logo && (
                    <div className="flex items-start">
                      <Building2 className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Logo</p>
                        <code className="text-sm text-gray-900">{club.logo}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datos Técnicos */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Técnicos</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Club ID:</span>
                    <p className="text-gray-900 break-all">{club.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Slug:</span>
                    <p className="text-gray-900">{club.slug}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => router.push(`/${clubSlug}/classes`)}
                className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{
                  backgroundColor: club.primaryColor,
                  color: 'white',
                }}
              >
                Ver Clases del Club
              </button>
              <button
                onClick={() => router.push('/club-selector')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cambiar de Club
              </button>
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="max-w-4xl mx-auto mt-8 text-center text-gray-600 text-sm">
          <p>
            Esta página muestra la configuración específica cargada para <strong>{club.name}</strong>
          </p>
          <p className="mt-1">
            URL actual: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.pathname}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClubDemoPage() {
  const params = useParams();
  const clubSlug = params.clubSlug as string;

  return (
    <ClubProvider clubSlug={clubSlug}>
      <DemoContent />
    </ClubProvider>
  );
}

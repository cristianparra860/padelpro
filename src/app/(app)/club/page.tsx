'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Users, Calendar, ArrowLeft, ExternalLink, GraduationCap, CalendarDays, ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ClubProfilePage() {
  const [clubData, setClubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courtCount, setCourtCount] = useState(0);
  const [instructorCount, setInstructorCount] = useState(0);

  useEffect(() => {
    fetchClubData();
  }, []);

  const fetchClubData = async () => {
    try {
      // Obtener datos del usuario autenticado para saber su clubId
      const userResponse = await fetch('/api/users/current');
      let clubId = 'padel-estrella-madrid'; // Default

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.clubId) {
          clubId = userData.clubId;
        }
      }

      // Obtener datos del club
      const clubsResponse = await fetch('/api/clubs');
      const clubs = await clubsResponse.json();

      // Buscar el club específico del usuario, o "Padel Estrella Madrid" por defecto
      let club = clubs.find((c: any) => c.id === clubId);
      if (!club) {
        // Si no encuentra el club del usuario, buscar "Padel Estrella Madrid"
        club = clubs.find((c: any) => c.id === 'padel-estrella-madrid');
      }
      if (!club && clubs.length > 0) {
        // Si tampoco existe, usar el primero
        club = clubs[0];
      }

      if (club) {
        setClubData({
          id: club.id,
          name: club.name,
          logoUrl: club.logoUrl,
          heroImage: club.heroImage || null,
          description: club.description || 'Tu club de pádel de referencia',
          address: club.location || 'Sin dirección',
          phone: club.phone || 'Sin teléfono',
          email: club.email || 'Sin email',
          websiteUrl: club.website || null,
          latitude: 41.3851,
          longitude: 2.1734
        });

        // Contar pistas del club
        const courtsResponse = await fetch(`/api/courts?clubId=${club.id}`);
        if (courtsResponse.ok) {
          const courts = await courtsResponse.json();
          setCourtCount(courts.length || 0);
        }

        // Contar instructores del club
        const instructorsResponse = await fetch(`/api/instructors?clubId=${club.id}`);
        if (instructorsResponse.ok) {
          const instructors = await instructorsResponse.json();
          setInstructorCount(instructors.length || 0);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del club:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !clubData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const mapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2993.4!2d${clubData.longitude}!3d${clubData.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDIzJzA2LjQiTiAywrAxMCcyNC4yIkU!5e0!3m2!1ses!2ses!4v1234567890123!5m2!1ses!2ses`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 pl-16 md:pl-60">
      {/* Hero Section con imagen de portada */}
      <div className="relative h-[400px] bg-gradient-to-r from-green-600 to-blue-600 overflow-hidden">
        {/* Imagen de fondo de pistas de padel */}
        <div className="absolute inset-0">
          <img
            src={clubData.heroImage || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2070&auto=format&fit=crop"}
            alt="Pistas de padel"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white z-10 px-4">
            {clubData.logoUrl && (
              <div className="w-32 h-32 mx-auto mb-6 bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-center">
                <img
                  src={clubData.logoUrl}
                  alt={clubData.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold mb-4">{clubData.name}</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {clubData.description}
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <Badge className="bg-white/20 backdrop-blur text-white px-4 py-2 text-base">
                <Users className="w-4 h-4 mr-2" />
                {courtCount} Pistas
              </Badge>
              <Badge className="bg-white/20 backdrop-blur text-white px-4 py-2 text-base">
                <Calendar className="w-4 h-4 mr-2" />
                {instructorCount} Instructores
              </Badge>
            </div>
          </div>
        </div>

        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }}></div>
        </div>
      </div>

      {/* Navegación de regreso */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button
          variant="outline"
          className="gap-2 hover:bg-gray-100"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>

      {/* Botones de Acción Principal - DESTACADOS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">¿Qué quieres hacer?</h2>
          <p className="text-lg text-gray-600">Accede rápidamente a las funciones principales</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Botón Clases */}
          <a
            href="/clases"
            className="group relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition-colors">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-1">Clases</h3>
              <p className="text-white/90 text-center text-xs">Reserva tu clase</p>
            </div>
          </a>

          {/* Botón Calendario */}
          <a
            href="/club-calendar"
            className="group relative bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition-colors">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-1">Calendario</h3>
              <p className="text-white/90 text-center text-xs">Ver horarios</p>
            </div>
          </a>

          {/* Botón Reservas */}
          <a
            href="/agenda"
            className="group relative bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition-colors">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-1">Mis Reservas</h3>
              <p className="text-white/90 text-center text-xs">Gestiona reservas</p>
            </div>
          </a>

          {/* Botón Inscripciones */}
          <a
            href="/agenda"
            className="group relative bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <div className="bg-white/20 rounded-full p-3 mb-3 group-hover:bg-white/30 transition-colors">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-1">Inscripciones</h3>
              <p className="text-white/90 text-center text-xs">Inscríbete</p>
            </div>
          </a>
        </div>
      </div>

      {/* Mapa de Ubicación y Contacto - LADO A LADO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda - Mapa (2/3) */}
          <div className="lg:col-span-2">
            <Card className="shadow-2xl border-2 border-gray-200 h-full">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-center justify-center gap-3">
                  <MapPin className="w-8 h-8 text-red-600" />
                  Nuestra Ubicación
                </h2>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                    <p className="text-xl font-bold text-gray-900 mb-2">{clubData.address}</p>
                    <p className="text-lg text-gray-700">{clubData.postalCode} {clubData.city}, {clubData.state}</p>
                    <p className="text-lg text-gray-700">{clubData.country}</p>
                  </div>

                  {/* Google Maps Embed */}
                  <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden shadow-xl border-4 border-white">
                    <iframe
                      title="Ubicación del club en Google Maps"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={mapUrl}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${clubData.latitude},${clubData.longitude}`, '_blank')}
                  >
                    <ExternalLink className="w-5 h-5" />
                    Abrir en Google Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha - Contacto (1/3) */}
          <div className="space-y-6">
            {/* Contacto */}
            <Card className="shadow-lg h-full">
              <CardContent className="p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Contacto</h2>

                {/* Teléfono */}
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Teléfono</p>
                    <a
                      href={`tel:${clubData.phone}`}
                      className="font-semibold text-gray-900 hover:text-green-600 transition-colors"
                    >
                      {clubData.phone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <a
                      href={`mailto:${clubData.email}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors break-all"
                    >
                      {clubData.email}
                    </a>
                  </div>
                </div>

                {/* Horario */}
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Horario</p>
                    <p className="font-semibold text-gray-900">
                      {clubData.openingTime} - {clubData.closingTime}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Todos los días</p>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dirección</p>
                    <p className="font-semibold text-gray-900">{clubData.address}</p>
                    <p className="text-sm text-gray-600">{clubData.city}</p>
                  </div>
                </div>

                {/* Botón de contacto */}
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                  <Phone className="w-4 h-4" />
                  Llamar Ahora
                </Button>
              </CardContent>
            </Card>

            {/* Servicios */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Servicios</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Clases particulares y grupales</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Alquiler de material</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Torneos y competiciones</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Eventos corporativos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Parking gratuito</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">WiFi en todas las instalaciones</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Columna Izquierda - Información Principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* Descripción */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Sobre Nosotros</h2>
                <p className="text-gray-700 leading-relaxed">
                  {clubData.description}
                </p>
              </CardContent>
            </Card>

            {/* Galería de imágenes */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestras Instalaciones</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200 rounded-lg overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Users className="w-12 h-12 mx-auto text-green-600 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">Pistas Profesionales</p>
                        <p className="text-xs text-gray-600 mt-1">Césped sintético de última generación</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-green-600/0 group-hover:bg-green-600/10 transition-colors"></div>
                  </div>

                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Clock className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">Vestuarios Premium</p>
                        <p className="text-xs text-gray-600 mt-1">Duchas y taquillas modernas</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors"></div>
                  </div>

                  <div className="relative h-48 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Calendar className="w-12 h-12 mx-auto text-purple-600 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">Zona Social</p>
                        <p className="text-xs text-gray-600 mt-1">Cafetería y zona de descanso</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors"></div>
                  </div>

                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Users className="w-12 h-12 mx-auto text-orange-600 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">Tienda Pro Shop</p>
                        <p className="text-xs text-gray-600 mt-1">Material y equipamiento deportivo</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-orange-600/0 group-hover:bg-orange-600/10 transition-colors"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

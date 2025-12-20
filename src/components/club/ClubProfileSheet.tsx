'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Clock, Users, Calendar } from 'lucide-react';
import type { Club } from '@/types';

// Extended club type for additional information
interface ExtendedClub extends Club {
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  openingTime?: string;
  closingTime?: string;
  courtCount?: number;
  instructorCount?: number;
}

interface ClubProfileSheetProps {
  club: ExtendedClub | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClubProfileSheet({ club, isOpen, onOpenChange }: ClubProfileSheetProps) {
  if (!club) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-4 mb-4">
            {club.logoUrl && (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-md">
                <img 
                  src={club.logoUrl} 
                  alt={club.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <SheetTitle className="text-2xl">{club.name}</SheetTitle>
              <SheetDescription>
                Perfil del Club
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Información General */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Información General
            </h3>
            
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              {club.description && (
                <div>
                  <p className="text-sm text-gray-600">{club.description}</p>
                </div>
              )}
              
              {club.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{club.phone}</span>
                </div>
              )}
              
              {club.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <a href={`mailto:${club.email}`} className="text-blue-600 hover:underline">
                    {club.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Ubicación
            </h3>
            
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              {club.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700 font-medium">{club.address}</p>
                    {club.city && club.postalCode && (
                      <p className="text-gray-600">{club.postalCode} {club.city}</p>
                    )}
                  </div>
                </div>
              )}
              
              {club.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.address + ', ' + club.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                >
                  <MapPin className="w-4 h-4" />
                  Ver en Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Horarios */}
          {club.openingHours && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Horario
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{club.openingHours}</p>
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Información del Club
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {club.courtCount || 0}
                </div>
                <div className="text-xs text-gray-600 mt-1">Pistas</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {club.instructorCount || 0}
                </div>
                <div className="text-xs text-gray-600 mt-1">Instructores</div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { User as UserType } from '@/types';

interface UserProfileAvatarProps {
  user: UserType | null;
  profilePicUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUploadClick: () => void;
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  user,
  profilePicUrl,
  fileInputRef,
  onPhotoUploadClick,
  onPhotoChange,
}) => {
  if (!user) {
    console.log('⚠️ UserProfileAvatar: user es NULL');
    return null;
  }

  // Usar DIRECTAMENTE user.profilePictureUrl sin estados intermedios
  const photoUrl = user.profilePictureUrl || profilePicUrl;
  const hasPhoto = photoUrl && photoUrl.startsWith('data:image');
  const displayInitials = getInitials(user.name || '');

  // LOGGING ULTRA VISIBLE
  const logStyle = 'background: #000; color: #0f0; font-size: 14px; padding: 10px; font-weight: bold';
  console.log('%c═══════════════════════════════════════════════════════════', logStyle);
  console.log('%c🖼️ UserProfileAvatar RENDERIZANDO', logStyle);
  console.log('%c═══════════════════════════════════════════════════════════', logStyle);
  console.log('%c👤 user.name: ' + user.name, 'color: cyan; font-weight: bold');
  console.log('%c📸 user.profilePictureUrl: ' + (user.profilePictureUrl || 'UNDEFINED/NULL'), 'color: ' + (user.profilePictureUrl ? 'lime' : 'red') + '; font-weight: bold');
  console.log('%c📸 profilePicUrl prop: ' + (profilePicUrl || 'UNDEFINED/NULL'), 'color: ' + (profilePicUrl ? 'lime' : 'orange') + '; font-weight: bold');
  console.log('%c🎨 photoUrl (final): ' + (photoUrl || 'UNDEFINED/NULL'), 'color: ' + (photoUrl ? 'lime' : 'red') + '; font-weight: bold; font-size: 16px');
  console.log('%c✅ hasPhoto: ' + hasPhoto, 'color: ' + (hasPhoto ? 'lime' : 'red') + '; font-weight: bold; font-size: 18px');
  console.log('%c🎯 RENDERIZANDO: ' + (hasPhoto ? '📸 IMAGEN' : '🔤 INICIALES (' + displayInitials + ')'), 'background: ' + (hasPhoto ? 'green' : 'red') + '; color: white; font-size: 16px; padding: 5px; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════════════', logStyle);
  
  // Si hay foto, mostrarla directamente en consola como prueba
  if (hasPhoto && photoUrl) {
    console.log('%cFOTO DISPONIBLE - Mostrando preview:', 'color: lime; font-weight: bold');
    console.log('data:image... (primeros 100 chars):', photoUrl.substring(0, 100));
  }

  return (
    <div className="flex flex-col items-center space-y-2 mb-4">
      <div className="relative">
        {hasPhoto ? (
          <div className="h-24 w-24 border-4 border-white shadow-lg rounded-full overflow-hidden">
            <img
              src={photoUrl!}
              alt={`Foto de perfil de ${user.name}`}
              className="w-full h-full object-cover"
              onLoad={() => console.log('✅ ¡¡FOTO CARGADA!!')}
              onError={(e) => {
                console.error('❌ Error cargando foto');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="h-24 w-24 border-4 border-white shadow-lg rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <div className="text-3xl text-white font-bold">
              {displayInitials}
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-white text-blue-500 hover:bg-gray-50 shadow-md border-gray-300"
          onClick={onPhotoUploadClick}
        >
          <Camera className="h-4 w-4" />
          <span className="sr-only">Cambiar foto de perfil</span>
        </Button>
        <Input
          id="photoInput"
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={onPhotoChange}
        />
      </div>
    </div>
  );
};

export default UserProfileAvatar;

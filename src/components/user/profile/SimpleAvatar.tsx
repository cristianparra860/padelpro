"use client";

import { useEffect, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SimpleAvatarProps {
  userId: string;
  userName: string;
  onPhotoChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function SimpleAvatar({ userId, userName, fileInputRef }: SimpleAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPhoto = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/current', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SimpleAvatar - Foto cargada:', {
          hasPhoto: !!data.profilePictureUrl,
          length: data.profilePictureUrl?.length
        });
        setPhotoUrl(data.profilePictureUrl || null);
      }
    } catch (error) {
      console.error('Error cargando foto:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhoto();
  }, [loadPhoto]);

  const handlePhotoChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('%c📸 SimpleAvatar handlePhotoChange INICIADO', 'background: blue; color: white; font-size: 16px; padding: 5px');
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('❌ No hay archivo seleccionado');
      return;
    }
    
    console.log('✅ Archivo seleccionado:', file.name, file.type, Math.round(file.size / 1024), 'KB');
    
    if (!file.type.startsWith('image/')) {
      console.log('❌ No es una imagen');
      toast({ title: "Error", description: "Por favor, selecciona un archivo de imagen.", variant: "destructive" });
      return;
    }
    
    console.log('📖 Leyendo archivo...');
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        console.log('✅ Archivo leído, tamaño:', (reader.result as string).length, 'chars');
        const originalDataUrl = reader.result as string;
        
        console.log('🖼️ Creando imagen para comprimir...');
        const img = new Image();
        
        img.onload = async () => {
          console.log('✅ Imagen cargada:', img.width, 'x', img.height);
          console.log('🗜️ Iniciando compresión...');
          
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const maxSize = 400;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          console.log('📐 Dimensiones finales:', Math.round(width), 'x', Math.round(height));
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          console.log('✅ Compresión completada:', Math.round(compressedDataUrl.length / 1024), 'KB');
          console.log('📊 Preview:', compressedDataUrl.substring(0, 80));
          
          // Guardar en BD
          console.log('%c📤 ENVIANDO AL SERVIDOR...', 'background: orange; color: white; font-size: 14px; padding: 5px');
          const token = localStorage.getItem('auth_token');
          console.log('🔑 Token presente:', !!token);
          console.log('👤 UserId:', userId);
          
          const apiUrl = `/api/users/${userId}/profile-picture`;
          console.log('🌐 URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ profilePictureUrl: compressedDataUrl })
          });

          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('%c✅ FOTO GUARDADA EXITOSAMENTE', 'background: green; color: white; font-size: 16px; padding: 5px; font-weight: bold');
            console.log('👤 Usuario actualizado:', data.user?.name);
            
            // Actualizar la foto en el estado inmediatamente
            console.log('🔄 Actualizando estado local...');
            setPhotoUrl(compressedDataUrl);
            console.log('✅ Estado actualizado - la foto debería aparecer AHORA');
            
            toast({ 
              title: "✅ Foto Actualizada", 
              description: "Tu foto de perfil ha sido actualizada." 
            });
          } else {
            const errorText = await response.text();
            console.error('%c❌ ERROR DEL SERVIDOR', 'background: red; color: white; font-size: 16px; padding: 5px');
            console.error('Status:', response.status);
            console.error('Response:', errorText);
            
            let errorMsg = 'Error desconocido';
            try {
              const errorData = JSON.parse(errorText);
              errorMsg = errorData.error || errorData.details || errorText;
            } catch (e) {
              errorMsg = errorText;
            }
            
            toast({ 
              title: "Error", 
              description: `No se pudo guardar: ${errorMsg}`, 
              variant: "destructive" 
            });
          }
        };
        
        img.onerror = (e) => {
          console.error('❌ Error cargando imagen en memoria:', e);
          toast({ title: "Error", description: "No se pudo cargar la imagen.", variant: "destructive" });
        };
        
        console.log('🎨 Estableciendo src de imagen...');
        img.src = originalDataUrl;
        
      } catch (error) {
        console.error('%c❌ ERROR EN PROCESAMIENTO', 'background: red; color: white; font-size: 16px; padding: 5px');
        console.error('Error:', error);
        console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
        toast({ 
          title: "Error", 
          description: "Error al procesar la imagen.", 
          variant: "destructive" 
        });
      }
    };
    
    reader.onerror = (e) => {
      console.error('❌ Error leyendo archivo:', e);
      toast({ title: "Error", description: "Error al leer el archivo.", variant: "destructive" });
    };
    
    console.log('📂 Iniciando lectura como Data URL...');
    reader.readAsDataURL(file);
  }, [userId, toast]);

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const hasValidPhoto = photoUrl && photoUrl.startsWith('data:image');

  return (
    <div className="flex flex-col items-center space-y-2 mb-4">
      <div className="relative">
        <div className="h-24 w-24 border-4 border-white shadow-lg rounded-full overflow-hidden">
          {hasValidPhoto ? (
            <img
              key={photoUrl.substring(0, 50)}
              src={photoUrl}
              alt={`Foto de ${userName}`}
              className="w-full h-full object-cover"
              onLoad={() => console.log('✅ Imagen renderizada!')}
              onError={() => {
                console.error('❌ Error renderizando');
                setPhotoUrl(null);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-3xl text-white font-bold">{initials}</span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-white"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handlePhotoChange}
        />
      </div>
    </div>
  );
}

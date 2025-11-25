// src/hooks/useUserProfile.ts
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getMockCurrentUser, updateUserLevel, setGlobalCurrentUser, updateUserGenderCategory } from '@/lib/mockData';
import type { User as UserType, MatchPadelLevel, UserGenderCategory } from '@/types';

export function useUserProfile(initialUser: UserType | null) {
  const [user, setUser] = useState<UserType | null>(initialUser);
  const [name, setName] = useState(initialUser?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [email, setEmail] = useState(initialUser?.email || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<MatchPadelLevel | undefined>(initialUser?.level);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [selectedGenderCategory, setSelectedGenderCategory] = useState<UserGenderCategory | undefined>(initialUser?.genderCategory);
  const [isEditingGenderCategory, setIsEditingGenderCategory] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(initialUser?.profilePictureUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 useUserProfile useEffect ejecutado:', {
      hasInitialUser: !!initialUser,
      userName: initialUser?.name,
      hasProfilePictureUrl: !!initialUser?.profilePictureUrl,
      profilePictureUrlLength: initialUser?.profilePictureUrl?.length,
      profilePictureUrlPreview: initialUser?.profilePictureUrl?.substring(0, 60)
    });
    
    if (initialUser) {
      setUser(initialUser);
      setName(initialUser.name || '');
      setEmail(initialUser.email || '');
      setSelectedLevel(initialUser.level);
      setSelectedGenderCategory(initialUser.genderCategory);
      setProfilePicUrl(initialUser.profilePictureUrl || null);
      
      console.log('✅ Estados actualizados en useUserProfile:', {
        profilePicUrl: !!initialUser.profilePictureUrl,
        userProfilePictureUrl: !!initialUser.profilePictureUrl
      });
    }
  }, [initialUser, initialUser?.profilePictureUrl]); // Escuchar cambios en profilePictureUrl también

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSaveName = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
        return;
      }

      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.user;
        
        setIsEditingName(false);
        setUser(updatedUser);
        setGlobalCurrentUser(updatedUser);
        
        // Disparar evento personalizado para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
        
        toast({ title: "Nombre Actualizado", description: `Tu nombre se ha cambiado a ${name}.` });
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo actualizar el nombre", variant: "destructive" });
        setName(user.name || ''); // Revertir cambio
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast({ title: "Error", description: "Error al actualizar el nombre", variant: "destructive" });
      setName(user.name || ''); // Revertir cambio
    }
  }, [user, name, toast]);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleSaveEmail = useCallback(async () => {
    if (!user) return;
    if (!email.includes('@')) {
      toast({ title: "Error", description: "Por favor, introduce un email válido.", variant: "destructive" });
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
        return;
      }

      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.user;
        
        setIsEditingEmail(false);
        setUser(updatedUser);
        setGlobalCurrentUser(updatedUser);
        
        // Disparar evento personalizado para actualizar otros componentes
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
        
        toast({ title: "Email Actualizado", description: `Tu email se ha cambiado a ${email}.` });
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo actualizar el email", variant: "destructive" });
        setEmail(user.email || ''); // Revertir cambio
      }
    } catch (error) {
      console.error('Error updating email:', error);
      toast({ title: "Error", description: "Error al actualizar el email", variant: "destructive" });
      setEmail(user.email || ''); // Revertir cambio
    }
  }, [user, email, toast]);

  const handleLevelChange = (value: MatchPadelLevel) => {
    setSelectedLevel(value);
  };

  const handleSaveLevel = useCallback(async () => {
    if (!user || !selectedLevel) return;
    setIsEditingLevel(false);
    const oldLevel = user.level;
    
    setUser(prev => prev ? { ...prev, level: selectedLevel } : null);
    const currentGlobalUser = getMockCurrentUser();
    if (currentGlobalUser && currentGlobalUser.id === user.id) {
        setGlobalCurrentUser({ ...currentGlobalUser, level: selectedLevel });
    }

    const result = await updateUserLevel(user.id, selectedLevel);
    if ('error' in result) {
      toast({ title: "Error al Actualizar Nivel", description: result.error, variant: "destructive" });
      setUser(prev => prev ? { ...prev, level: oldLevel } : null); // Revert optimistic update
      const currentGlobalUserForRevert = getMockCurrentUser();
      if (currentGlobalUserForRevert && currentGlobalUserForRevert.id === user.id) {
        setGlobalCurrentUser({ ...currentGlobalUserForRevert, level: oldLevel });
      }
      setSelectedLevel(oldLevel);
    } else {
      toast({ title: "Nivel Actualizado", description: `Tu nivel de juego se ha establecido a ${selectedLevel}.` });
    }
  }, [user, selectedLevel, toast]);

  const handleGenderCategoryChange = (value: UserGenderCategory) => {
    setSelectedGenderCategory(value);
  };

  const handleSaveGenderCategory = useCallback(async () => {
    if (!user || !selectedGenderCategory) return;
    setIsEditingGenderCategory(false);
    const oldGenderCategory = user.genderCategory;

    setUser(prev => prev ? { ...prev, genderCategory: selectedGenderCategory } : null);
    const currentGlobalUser = getMockCurrentUser();
    if (currentGlobalUser && currentGlobalUser.id === user.id) {
        setGlobalCurrentUser({ ...currentGlobalUser, genderCategory: selectedGenderCategory });
    }
    
    const result = await updateUserGenderCategory(user.id, selectedGenderCategory);
    if ('error' in result) {
        toast({ title: "Error al Actualizar Categoría", description: result.error, variant: "destructive" });
        setUser(prev => prev ? { ...prev, genderCategory: oldGenderCategory } : null);
        const currentGlobalUserForRevert = getMockCurrentUser();
        if (currentGlobalUserForRevert && currentGlobalUserForRevert.id === user.id) {
            setGlobalCurrentUser({ ...currentGlobalUserForRevert, genderCategory: oldGenderCategory });
        }
        setSelectedGenderCategory(oldGenderCategory);
    } else {
        toast({ title: "Categoría Actualizada", description: `Tu categoría de género se ha establecido a ${selectedGenderCategory}.` });
    }
  }, [user, selectedGenderCategory, toast]);


  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📸 handlePhotoChange llamado');
    const file = event.target.files?.[0];
    console.log('📁 Archivo seleccionado:', file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'ninguno');
    
    if (file && user) {
      console.log('👤 Usuario actual:', user.id, user.name);
      
      if (!file.type.startsWith('image/')) {
        console.log('❌ No es una imagen:', file.type);
        toast({ title: "Error", description: "Por favor, selecciona un archivo de imagen.", variant: "destructive" });
        return;
      }
      
      console.log('✅ Archivo válido, iniciando lectura...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          console.log('📖 Archivo leído correctamente');
          const originalDataUrl = reader.result as string;
          
          // Comprimir la imagen
          const img = new Image();
          img.onload = async () => {
            console.log('🖼️ Imagen cargada en memoria, iniciando compresión...');
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Redimensionar si es muy grande (máximo 400x400)
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
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convertir a base64 con calidad reducida
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            console.log('📊 Compresión completada:');
            console.log('   Original:', Math.round(originalDataUrl.length / 1024), 'KB');
            console.log('   Comprimido:', Math.round(compressedDataUrl.length / 1024), 'KB');
            console.log('   Reducción:', Math.round((1 - compressedDataUrl.length / originalDataUrl.length) * 100), '%');
            
            // Guardar en la base de datos
            const token = localStorage.getItem('auth_token');
            console.log('🔑 Token:', token ? 'Presente' : 'FALTA');
            console.log('📤 Enviando a API...');
            
            const response = await fetch(`/api/users/${user.id}/profile-picture`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ profilePictureUrl: compressedDataUrl })
            });

            if (response.ok) {
              const responseData = await response.json();
              const updatedUser = responseData.user;
              
              console.log('✅ Respuesta exitosa del servidor');
              console.log('👤 Usuario actualizado:', {
                id: updatedUser.id,
                name: updatedUser.name,
                hasProfilePic: !!updatedUser.profilePictureUrl,
                picSize: updatedUser.profilePictureUrl ? Math.round(updatedUser.profilePictureUrl.length / 1024) + ' KB' : 'N/A',
                isBase64: updatedUser.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO'
              });
              
              console.log('🔄 Actualizando estado local...');
              // Actualizar estado local inmediatamente con la imagen comprimida
              setProfilePicUrl(compressedDataUrl);
              console.log('   profilePicUrl actualizado');
              
              setUser(prev => prev ? { ...prev, profilePictureUrl: compressedDataUrl } : null);
              console.log('   user actualizado');
              
              // Actualizar también en estado global
              if (updatedUser) {
                setGlobalCurrentUser(updatedUser);
                console.log('   globalCurrentUser actualizado');
              }
              
              console.log('✅ FOTO DE PERFIL ACTUALIZADA COMPLETAMENTE');
              
              toast({ 
                title: "✅ Foto Actualizada", 
                description: "Tu foto de perfil ha sido actualizada correctamente." 
              });
            } else {
              console.log('❌ Error en respuesta del servidor:', response.status);
              const errorData = await response.json();
              console.error('📋 Detalles del error:', errorData);
              toast({ 
                title: "Error", 
                description: `No se pudo guardar: ${errorData.details || errorData.error}`, 
                variant: "destructive" 
              });
            }
          };
          
          img.onerror = () => {
            toast({ title: "Error", description: "No se pudo cargar la imagen.", variant: "destructive" });
          };
          
          img.src = originalDataUrl;
          
        } catch (error) {
          console.error('Error processing image:', error);
          toast({ 
            title: "Error", 
            description: "Error al procesar la imagen.", 
            variant: "destructive" 
          });
        }
      };
      
      reader.onerror = () => {
        toast({ title: "Error", description: "Error al leer el archivo.", variant: "destructive" });
      };
      
      reader.readAsDataURL(file);
    }
  }, [user, toast]);

  const handleLogout = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setGlobalCurrentUser(null); 
    setUser(null); 
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión (simulado)." });
  }, [toast]);

  return {
    user,
    name, setName, isEditingName, setIsEditingName, handleNameChange, handleSaveName,
    email, setEmail, isEditingEmail, setIsEditingEmail, handleEmailChange, handleSaveEmail,
    selectedLevel, setSelectedLevel, isEditingLevel, setIsEditingLevel, handleLevelChange, handleSaveLevel,
    selectedGenderCategory, setSelectedGenderCategory, isEditingGenderCategory, setIsEditingGenderCategory, handleGenderCategoryChange, handleSaveGenderCategory,
    profilePicUrl, fileInputRef, handlePhotoUploadClick, handlePhotoChange,
    handleLogout
  };
}

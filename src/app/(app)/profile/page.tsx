"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { getMockCurrentUser, setGlobalCurrentUser, updateUserLevel, updateUserGenderCategory } from '@/lib/mockData';
import type { User, MatchPadelLevel, UserGenderCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Settings, Edit, User as UserIcon, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserProfileSheet from '@/components/user/profile/UserProfileSheet';
import { matchPadelLevels } from '@/types';
import EditableInfoRow from '@/components/user/profile/EditableInfoRow';
import { Badge } from '@/components/ui/badge';
import SimpleAvatar from '@/components/user/profile/SimpleAvatar';
import ChangePasswordDialog from '@/components/user/profile/ChangePasswordDialog';
import { useUserProfile } from '@/hooks/useUserProfile';


function ProfilePageContent() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [userStats, setUserStats] = useState({
        totalBookings: 0,
        confirmedBookings: 0,
        credits: 0
    });
    const router = useRouter();

    // Cargar usuario con JWT
    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    router.push('/');
                    return;
                }

                const response = await fetch('/api/users/current', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    cache: 'no-store' // No cachear para obtener siempre datos frescos
                });

                if (response.ok) {
                    const data = await response.json();
                    const userData = data.user || data;
                    console.log('👤 Usuario cargado en página:', {
                        name: userData.name,
                        email: userData.email,
                        hasProfilePictureUrl: !!userData.profilePictureUrl,
                        profilePictureUrlPreview: userData.profilePictureUrl?.substring(0, 50)
                    });
                    setCurrentUser(userData);
                    
                    // Cargar estadísticas del usuario
                    setUserStats({
                        totalBookings: 0, // Aquí podrías hacer otra llamada al API
                        confirmedBookings: 0,
                        credits: userData.credits || 0
                    });
                } else {
                    router.push('/');
                }
            } catch (error) {
                console.error('Error loading user:', error);
                router.push('/');
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUser();
    }, [router]);

    const {
        user,
        name, setName, isEditingName, setIsEditingName, handleNameChange, handleSaveName,
        email, setEmail, isEditingEmail, setIsEditingEmail, handleEmailChange, handleSaveEmail,
        selectedLevel, setSelectedLevel, isEditingLevel, setIsEditingLevel, handleLevelChange, handleSaveLevel,
        selectedGenderCategory, setSelectedGenderCategory, isEditingGenderCategory, setIsEditingGenderCategory, handleGenderCategoryChange, handleSaveGenderCategory,
        profilePicUrl, fileInputRef, handlePhotoUploadClick, handlePhotoChange,
        handleLogout
    } = useUserProfile(currentUser);
    
    // Actualizar currentUser cuando cambie el user del hook (después de subir foto)
    useEffect(() => {
        if (user && user.profilePictureUrl) {
            console.log('🔄 Actualizando currentUser con nueva foto:', user.profilePictureUrl.substring(0, 50));
            setCurrentUser(prev => prev ? { ...prev, profilePictureUrl: user.profilePictureUrl } : user);
        }
    }, [user?.profilePictureUrl]); // Solo cuando cambie la foto 
    
    const [isClient, setIsClient] = useState(false);
    const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || isLoadingUser) {
        return <PageSkeleton />;
    }

    if (!user) {
        return <PageSkeleton />;
    }

    const genderCategoryOptions = [
        { value: 'femenino', label: 'Femenino' },
        { value: 'masculino', label: 'Masculino' },
        { value: 'otro', label: 'Otro' },
        { value: 'no_especificado', label: 'No Especificado' },
    ];
    
    const levelOptions = matchPadelLevels.map(level => ({
        value: level,
        label: (level as unknown as MatchPadelLevel) === 'abierto' ? 'Nivel Abierto' : `Nivel ${level}`
    }));


    return (
        <div className="container mx-auto max-w-2xl py-8">
            {/* Barra de encabezado estilo admin */}
            <header className="mb-6 rounded-xl overflow-hidden shadow-lg" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                            <UserIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                Tus Datos
                            </h1>
                            <p className="text-white/80 text-sm">{currentUser?.name || 'Usuario'}</p>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="space-y-6">
                <SimpleAvatar
                    userId={currentUser?.id || ''}
                    userName={currentUser?.name || ''}
                    fileInputRef={fileInputRef}
                />

                <div className="rounded-lg shadow-xl overflow-hidden bg-white">
                     <EditableInfoRow
                        id="profile-name"
                        label="Nombre"
                        value={name}
                        isEditing={isEditingName}
                        onEditClick={() => setIsEditingName(true)}
                        onSaveClick={handleSaveName}
                        onCancelClick={() => { setIsEditingName(false); setName(user.name || ''); }}
                        onChange={(e) => handleNameChange(e as React.ChangeEvent<HTMLInputElement>)}
                        isFirst
                        showSeparator={!isEditingName}
                    />
                    <EditableInfoRow
                        id="profile-email"
                        label="Email"
                        value={email}
                        isEditing={isEditingEmail}
                        onEditClick={() => setIsEditingEmail(true)}
                        onSaveClick={handleSaveEmail}
                        onCancelClick={() => { setIsEditingEmail(false); setEmail(user.email || ''); }}
                        onChange={(e) => handleEmailChange(e as React.ChangeEvent<HTMLInputElement>)}
                        inputType="email"
                        showSeparator={!isEditingEmail}
                    />
                     <EditableInfoRow
                        id="profile-level"
                        label="Nivel de Juego"
                        value={selectedLevel}
                        isEditing={isEditingLevel}
                        onEditClick={() => setIsEditingLevel(true)}
                        onSaveClick={handleSaveLevel}
                        onCancelClick={() => { setIsEditingLevel(false); setSelectedLevel(user.level); }}
                        onChange={(val) => handleLevelChange(val as MatchPadelLevel)}
                        inputType="select"
                        selectOptions={levelOptions}
                        selectPlaceholder="Selecciona tu nivel"
                        showSeparator={!isEditingLevel}
                    />
                    <EditableInfoRow
                        id="profile-gender"
                        label="Categoría (Género)"
                        value={selectedGenderCategory}
                        isEditing={isEditingGenderCategory}
                        onEditClick={() => setIsEditingGenderCategory(true)}
                        onSaveClick={handleSaveGenderCategory}
                        onCancelClick={() => { setIsEditingGenderCategory(false); setSelectedGenderCategory(user.genderCategory); }}
                        onChange={(val) => handleGenderCategoryChange(val as UserGenderCategory)}
                        inputType="select"
                        selectOptions={genderCategoryOptions}
                        selectPlaceholder="Selecciona tu categoría"
                        isLast
                        showSeparator={false}
                    />
                </div>

                <div className="rounded-lg shadow-xl overflow-hidden">
                    <button onClick={() => setIsChangePasswordDialogOpen(true)} className="flex items-center justify-between p-3 bg-white w-full text-left rounded-t-lg border-b border-gray-200">
                        <span className="text-sm">Contraseña</span>
                        <span className="text-sm text-gray-500">••••••••</span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center justify-between p-3 bg-white w-full text-left rounded-b-lg text-red-500">
                        <span className="text-sm">Cerrar Sesión</span>
                    </button>
                </div>
            </main>
             <ChangePasswordDialog
                isOpen={isChangePasswordDialogOpen}
                onOpenChange={setIsChangePasswordDialogOpen}
                userId={user.id}
            />
        </div>
    );
}


export default function ProfilePage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <ProfilePageContent />
        </Suspense>
    );
}
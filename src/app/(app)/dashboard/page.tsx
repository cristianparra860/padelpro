// src/app/(app)/dashboard/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { getMockCurrentUser, setGlobalCurrentUser, updateUserLevel, updateUserGenderCategory } from '@/lib/mockData';
import type { User, MatchPadelLevel, UserGenderCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Settings, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import UserProfileSheet from '@/components/user/profile/UserProfileSheet';
import { matchPadelLevels } from '@/types';
import EditableInfoRow from '@/components/user/profile/EditableInfoRow';
import { Badge } from '@/components/ui/badge';
import UserProfileAvatar from '@/components/user/profile/UserProfileAvatar';
import ChangePasswordDialog from '@/components/user/profile/ChangePasswordDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import PersonalSchedule from '@/components/schedule/PersonalSchedule';
import PersonalMatches from '@/components/schedule/PersonalMatches';
import PersonalMatchDay from '@/components/schedule/PersonalMatchDay';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet, Star, History, Repeat, PlusCircle, PiggyBank, Lock, Sparkles } from 'lucide-react';
import CreditMovementsDialog from '@/components/user/CreditMovementsDialog';
import PointMovementsDialog from '@/components/user/PointMovementsDialog';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';
import EditLevelDialog from '@/components/user/EditLevelDialog';


function DashboardPageContent() {
    // Feature flag to show/hide Euro balance related UI
    const SHOW_EURO_BALANCE = true;
    const {
        user,
        name, setName, isEditingName, setIsEditingName, handleNameChange, handleSaveName,
        email, setEmail, isEditingEmail, setIsEditingEmail, handleEmailChange, handleSaveEmail,
        selectedLevel, setSelectedLevel, isEditingLevel, setIsEditingLevel, handleLevelChange, handleSaveLevel,
        selectedGenderCategory, setSelectedGenderCategory, isEditingGenderCategory, setIsEditingGenderCategory, handleGenderCategoryChange, handleSaveGenderCategory,
        profilePicUrl, fileInputRef, handlePhotoUploadClick, handlePhotoChange,
        handleLogout
    } = useUserProfile(getMockCurrentUser());
    
    const [isClient, setIsClient] = useState(false);
    const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
    const [isCreditMovementsDialogOpen, setIsCreditMovementsDialogOpen] = useState(false);
    const [isPointMovementsDialogOpen, setIsPointMovementsDialogOpen] = useState(false);
    const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
    const [isConvertBalanceDialogOpen, setIsConvertBalanceDialogOpen] = useState(false);
    const [isEditLevelDialogOpen, setIsEditLevelDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        setIsClient(true);
        const checkUser = async () => {
            const user = await getMockCurrentUser();
            if (!user) {
                router.push('/');
            }
        };
        checkUser();
    }, [router]);

    // Optionally auto-open Add Credit when coming from store link
    useEffect(() => {
        if (!isClient) return;
        const openAdd = searchParams?.get('openAddCredit');
        if (openAdd && !isAddCreditDialogOpen) {
            setIsAddCreditDialogOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient, searchParams]);
    
    const handleDataChange = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    const handleCreditAdded = (newBalance: number) => {
        handleDataChange();
        toast({
            title: "¡Saldo Añadido!",
            description: `Tu nuevo saldo es ${newBalance.toFixed(2)}€.`,
            className: "bg-primary text-primary-foreground",
        });
    };

    const handleConversionSuccess = (newCredit: number, newPoints: number) => {
        handleDataChange();
        toast({
            title: "¡Conversión Exitosa!",
            description: `Saldo restante: ${newCredit.toFixed(2)}€. Nuevos puntos: ${newPoints}.`,
            className: "bg-primary text-primary-foreground",
        });
    };

    if (!isClient || !user) {
        return <PageSkeleton />;
    }
    
    const availableCredit = (user.credit ?? 0) - (user.blockedCredit ?? 0);
    const availablePoints = (user.loyaltyPoints ?? 0) - (user.blockedLoyaltyPoints ?? 0);
    const hasPendingPoints = (user.pendingBonusPoints ?? 0) > 0;

    return (
        <div className="flex-1 space-y-4 sm:space-y-6 lg:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8">
            <header className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                    Tu Agenda, {user.name}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Aquí tienes un resumen de tu actividad y saldo.</p>
            </header>
            
            <main className="space-y-4 sm:space-y-6 lg:space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {SHOW_EURO_BALANCE && (
                        <Card className="shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base sm:text-lg flex items-center text-green-700">
                                    <Wallet className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5" />
                                    Tu Saldo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-3xl sm:text-4xl font-bold" style={{ color: '#2563eb' }} data-ui="balance-blue">
                                    {availableCredit.toFixed(2)}€
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                                    <div className="flex-1 p-1.5 sm:p-2 bg-muted rounded-md text-center">
                                        <p className="flex items-center justify-center gap-1"><PiggyBank className="h-3 w-3"/> Total</p>
                                        <p className="font-semibold text-foreground text-xs sm:text-sm">{(user.credit ?? 0).toFixed(2)}€</p>
                                    </div>
                                    <div className="flex-1 p-1.5 sm:p-2 bg-muted rounded-md text-center">
                                        <p className="flex items-center justify-center gap-1"><Lock className="h-3 w-3"/> Bloqueado</p>
                                        <p className="font-semibold text-foreground text-xs sm:text-sm">{(user.blockedCredit ?? 0).toFixed(2)}€</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <Button variant="default" size="sm" onClick={() => setIsAddCreditDialogOpen(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                                        <PlusCircle className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden xs:inline">Añadir</span>
                                        <span className="xs:hidden">+</span>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsCreditMovementsDialogOpen(true)} className="flex-1 text-xs sm:text-sm">
                                        <History className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
                                        <span className="hidden xs:inline">Movimientos</span>
                                        <span className="xs:hidden">Hist</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card className="shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center text-amber-600">
                                <Star className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5" />
                                Tus Puntos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="text-3xl sm:text-4xl font-bold text-foreground">{availablePoints.toFixed(0)}</div>
                             <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                                 <div className="flex-1 p-1.5 sm:p-2 bg-muted rounded-md text-center">
                                     <p className="flex items-center justify-center gap-1"><PiggyBank className="h-3 w-3"/> Total</p>
                                     <p className="font-semibold text-foreground text-xs sm:text-sm">{(user.loyaltyPoints ?? 0).toFixed(0)}</p>
                                 </div>
                                 <div className="flex-1 p-1.5 sm:p-2 bg-muted rounded-md text-center">
                                     <p className="flex items-center justify-center gap-1"><Lock className="h-3 w-3"/> Bloqueados</p>
                                     <p className="font-semibold text-foreground text-xs sm:text-sm">{(user.blockedLoyaltyPoints ?? 0).toFixed(0)}</p>
                                 </div>
                                  <div className="flex-1 p-1.5 sm:p-2 bg-muted rounded-md text-center">
                                     <p className="flex items-center justify-center gap-1"><Sparkles className="h-3 w-3"/> Pendientes</p>
                                     <p className="font-semibold text-foreground text-xs sm:text-sm">{(user.pendingBonusPoints ?? 0).toFixed(0)}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 pt-2">
                                {SHOW_EURO_BALANCE && (
                                    <Button variant="default" size="sm" onClick={() => setIsConvertBalanceDialogOpen(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-xs sm:text-sm">
                                        <Repeat className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden xs:inline">Convertir</span>
                                        <span className="xs:hidden">Conv</span>
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setIsPointMovementsDialogOpen(true)} className="flex-1 text-xs sm:text-sm">
                                    <History className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
                                    <span className="hidden xs:inline">Movimientos</span>
                                    <span className="xs:hidden">Hist</span>
                                </Button>
                             </div>
                         </CardContent>
                    </Card>
                </div>

                <PersonalMatches 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                />
                <PersonalSchedule 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                    refreshKey={refreshKey}
                />
                <PersonalMatchDay 
                    currentUser={user} 
                    onBookingActionSuccess={handleDataChange} 
                />
            </main>
            {SHOW_EURO_BALANCE && (
                <CreditMovementsDialog
                    isOpen={isCreditMovementsDialogOpen}
                    onOpenChange={setIsCreditMovementsDialogOpen}
                    currentUser={user}
                />
            )}
            <PointMovementsDialog
                isOpen={isPointMovementsDialogOpen}
                onOpenChange={setIsPointMovementsDialogOpen}
                currentUser={user}
            />
            {SHOW_EURO_BALANCE && (
                <AddCreditDialog
                    isOpen={isAddCreditDialogOpen}
                    onOpenChange={setIsAddCreditDialogOpen}
                    userId={user.id}
                    onCreditAdded={handleCreditAdded}
                />
            )}
            {SHOW_EURO_BALANCE && (
                <ConvertBalanceDialog
                    isOpen={isConvertBalanceDialogOpen}
                    onOpenChange={setIsConvertBalanceDialogOpen}
                    currentUser={user}
                    onConversionSuccess={handleConversionSuccess}
                />
            )}
        </div>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando…</div>}>
            <DashboardPageContent />
        </Suspense>
    );
}

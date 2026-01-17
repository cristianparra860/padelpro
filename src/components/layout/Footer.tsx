"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserCog, Building, ShieldCheck, User as UserIcon, UserPlus, Info, BookCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getMockCurrentUser, getMockClubs, simulateInviteFriend } from '@/lib/mockData';
import InviteFriendDialog from '@/components/user/InviteFriendDialog';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInviteFriendDialogOpen, setIsInviteFriendDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const fetchUser = async () => {
      const user = await getMockCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Render nothing on the server and until mounted to avoid hydration mismatches
  if (!isClient) {
    return null;
  }

  const handleInviteSent = async (friendEmail: string) => {
    if (!currentUser) {
      toast({ title: "Error", description: "Debes iniciar sesión para invitar a un amigo.", variant: "destructive" });
      return;
    }
    const clubInfo = (await getMockClubs())[0];
    if (!clubInfo) {
      toast({ title: "Error", description: "No se pudo obtener la información del club.", variant: "destructive" });
      return;
    }
    const result = await simulateInviteFriend(currentUser.id, clubInfo.id);
    if ('error' in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({
        title: "Invitación Enviada",
        description: `Se ha enviado una invitación a ${friendEmail}. Has ganado ${result.pointsAwarded} puntos!`,
        className: "bg-primary text-primary-foreground",
      });
    }
    setIsInviteFriendDialogOpen(false);
  };

  return (
    <>
      <footer className={cn("bg-card text-card-foreground py-8 mt-16 border-t border-border", className)}>
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">


            <div className="flex justify-center lg:justify-end">
              {currentUser && (
                <Button variant="link" onClick={() => setIsInviteFriendDialogOpen(true)} className="text-sm text-primary hover:underline flex items-center">
                  <UserPlus className="mr-1.5 h-4 w-4" /> Invita a un Amigo y Gana Puntos
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} PadelPro. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      {currentUser && (
        <InviteFriendDialog
          isOpen={isInviteFriendDialogOpen}
          onOpenChange={setIsInviteFriendDialogOpen}
          currentUser={currentUser}
          onInviteSent={handleInviteSent}
        />
      )}
    </>
  );
};

export default Footer;

// src/components/admin/LoginAsDialog.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, User } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';

interface LoginAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  superAdminId: string;
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function LoginAsDialog({
  open,
  onOpenChange,
  superAdminId,
  targetUser
}: LoginAsDialogProps) {
  const [reason, setReason] = useState('');
  const { startImpersonation, isLoading } = useImpersonation();

  const handleConfirm = async () => {
    console.log('🎯 LoginAsDialog - handleConfirm:', {
      superAdminId,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      reason: reason || 'Soporte técnico / resolución de problemas'
    });

    if (!superAdminId) {
      console.error('❌ superAdminId está vacío');
      return;
    }

    const success = await startImpersonation(
      superAdminId,
      targetUser.id,
      reason || 'Soporte técnico / resolución de problemas'
    );

    if (success) {
      onOpenChange(false);
      setReason('');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Confirmar Impersonation
          </DialogTitle>
          <DialogDescription>
            Estás a punto de suplantar la identidad de otro usuario. Esta acción quedará registrada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del usuario target */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{targetUser.name}</p>
                <p className="text-sm text-muted-foreground">{targetUser.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rol: <span className="font-medium">{targetUser.role}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Advertencias */}
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Verás exactamente lo que ve este usuario
            </p>
            <p className="text-muted-foreground pl-6">
              • Podrás realizar acciones como este usuario
            </p>
            <p className="text-muted-foreground pl-6">
              • Esta sesión quedará registrada en el log de auditoría
            </p>
            <p className="text-muted-foreground pl-6">
              • Aparecerá un banner amarillo indicando el modo impersonation
            </p>
          </div>

          {/* Razón (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del acceso (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Ayudar con problema de reservas, configuración de perfil, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Esta razón quedará registrada en el log de auditoría
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Iniciando...
              </>
            ) : (
              'Confirmar Impersonation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

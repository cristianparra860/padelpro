"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Gift, UserCircle as UserIconPlaceholder, XCircle, Info, CheckCircle } from 'lucide-react';
import type { TimeSlot } from '@/types';
import { getInitials, getPlaceholderUserName, calculatePricePerPerson } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { isSlotEffectivelyCompleted } from '@/lib/mockData';

interface InstructorBookingOptionProps {
  slot: TimeSlot;
  optionSize: 1 | 2 | 3 | 4;
  playersInThisOption: { userId: string; groupSize: 1 | 2 | 3 | 4 }[];
  isSlotCompletedOverall: boolean;
  isProcessingAction: boolean;
  processingActionKey?: string | null;
  onOpenStudentSelect: (slot: TimeSlot, optionSize: 1 | 2 | 3 | 4, spotIndexVisual: number) => void;
  onToggleGratis: (slotId: string, optionSize: 1 | 2 | 3 | 4, spotIndexVisual: number) => void;
  onRemoveBooking: (slotId: string, userId: string, groupSize: 1 | 2 | 3 | 4) => void;
  isCancellingClass: boolean;
}

const InstructorBookingOption: React.FC<InstructorBookingOptionProps> = ({
  slot,
  optionSize,
  playersInThisOption,
  isSlotCompletedOverall,
  isProcessingAction,
  processingActionKey,
  onOpenStudentSelect,
  onToggleGratis,
  onRemoveBooking,
  isCancellingClass,
}) => {
  const { toast } = useToast();

  const renderSpots = () => {
    return Array.from({ length: optionSize }).map((_, spotIndex) => {
      const playerInThisSpot = playersInThisOption[spotIndex];
      // Logic for gratis placeholder check (assuming it relies on extra prop logic or simplified check)
      // Since specific prop for designatedGratisSpotPlaceholderIndexForOption might be missing in types, we adapt.
      // But preserving existing variable usage if possible.
      const isThisSpotDesignatedGratisPlaceholder = (slot as any).designatedGratisSpotPlaceholderIndexForOption?.[optionSize] === spotIndex;
      const isSpotEmptyAndDesignatedGratis = !playerInThisSpot && isThisSpotDesignatedGratisPlaceholder;

      const spotSpecificActionKeySuffix = `${optionSize}-${spotIndex}`;
      const gratisToggleActionKey = `gratis-${slot.id}-${spotSpecificActionKeySuffix}`;
      const removeActionKey = playerInThisSpot ? `remove-${slot.id}-${playerInThisSpot.userId}-${playerInThisSpot.groupSize}` : '';

      const isThisSpotActionProcessing =
        processingActionKey === gratisToggleActionKey ||
        (playerInThisSpot && processingActionKey === removeActionKey);

      if (playerInThisSpot) {
        // Use a safe name getter
        const playerName = getPlaceholderUserName(playerInThisSpot.userId, undefined, undefined);
        return (
          <div key={`player-${optionSize}-${spotIndex}`} className="flex flex-col items-center text-center relative group/avatar">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-7 w-7 border-2 border-white shadow-sm cursor-default">
                      <AvatarImage src={`https://picsum.photos/seed/${playerInThisSpot.userId}/40/40`} alt={playerName} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                        {getInitials(playerName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Overlay Remove Button */}
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive" size="icon"
                            className="h-3.5 w-3.5 rounded-full p-0 shadow-sm flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isProcessingAction || isCancellingClass || isThisSpotActionProcessing}
                          >
                            {isThisSpotActionProcessing && processingActionKey === removeActionKey ? (
                              <Loader2 className="h-2 w-2 animate-spin text-white" />
                            ) : (
                              <div className="h-0.5 w-1.5 bg-white rounded-full" />
                            )}
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
                            <AlertDialogDescription>Eliminar inscripción de <span className="font-semibold">{playerName}</span>?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRemoveBooking(slot.id, playerInThisSpot.userId, playerInThisSpot.groupSize)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{playerName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      } else if (isSpotEmptyAndDesignatedGratis) {
        return (
          <div key={`gratis-${optionSize}-${spotIndex}`} className="flex flex-col items-center space-y-0.5">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline" size="icon"
                    className="h-7 w-7 rounded-full bg-yellow-100 border-2 border-yellow-400 p-0 hover:bg-yellow-200 transition-colors flex items-center justify-center"
                    onClick={() => onToggleGratis(slot.id, optionSize, spotIndex)}
                    disabled={isProcessingAction || isCancellingClass || isThisSpotActionProcessing || isSlotCompletedOverall}
                  >
                    {isThisSpotActionProcessing && processingActionKey === gratisToggleActionKey ? <Loader2 className="h-3 w-3 animate-spin text-yellow-700" /> : <Gift className="h-3.5 w-3.5 text-yellow-700" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Plaza ofrecida gratis (Click para cancelar)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      } else {
        return (
          <div key={`empty-${optionSize}-${spotIndex}`} className="flex flex-col items-center space-y-0.5 relative group/avatar">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline" size="icon"
                    className={cn(
                      "h-7 w-7 rounded-full p-0 flex items-center justify-center border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors",
                      (isProcessingAction || isCancellingClass || isThisSpotActionProcessing || isSlotCompletedOverall || playersInThisOption.length >= optionSize) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => onOpenStudentSelect(slot, optionSize, spotIndex)}
                    disabled={isProcessingAction || isCancellingClass || isThisSpotActionProcessing || isSlotCompletedOverall || playersInThisOption.length >= optionSize}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="sr-only">Añadir Alumno</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Añadir alumno</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botón flotante para ofrecer gratis en hover */}
            <div className="absolute -top-1 -right-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-10">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary" size="icon"
                      className="h-3.5 w-3.5 rounded-full p-0 shadow-sm flex items-center justify-center bg-yellow-50 hover:bg-yellow-100 border border-yellow-200"
                      onClick={(e) => { e.stopPropagation(); onToggleGratis(slot.id, optionSize, spotIndex); }}
                      disabled={isProcessingAction || isCancellingClass || isSlotCompletedOverall}
                    >
                      {isThisSpotActionProcessing && processingActionKey === gratisToggleActionKey ? (
                        <Loader2 className="h-2 w-2 animate-spin text-yellow-600" />
                      ) : (
                        <Gift className="h-2 w-2 text-yellow-600" />
                      )}
                      <span className="sr-only">Ofrecer Gratis</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Ofrecer Gratis</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        );
      }
    });
  };

  const pricePerPersonForOption = calculatePricePerPerson(slot.totalPrice, optionSize);
  const { completed: isOptionNowCompleted, size: completedSize } = isSlotEffectivelyCompleted(slot);
  const isThisTheCompletedOption = isOptionNowCompleted && completedSize === optionSize;

  return (
    <div className={cn("flex items-center justify-between py-1.5 px-2 rounded-md bg-background/60 group/option hover:bg-background transition-colors", isThisTheCompletedOption && "bg-green-100/50 border border-green-200")}>
      <div className="flex items-center gap-1.5 flex-grow-0 shrink-0 basis-auto justify-start">
        {renderSpots()}
      </div>
      <div className="flex flex-col items-end text-right pl-1 basis-auto">
        <span className="text-xs font-bold text-gray-700">
          {pricePerPersonForOption.toFixed(2)}€
        </span>
        <div className="flex items-center">
          {isThisTheCompletedOption && (
            <div className="mt-0.5"><CheckCircle className="h-3.5 w-3.5 text-green-600" /></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(InstructorBookingOption);

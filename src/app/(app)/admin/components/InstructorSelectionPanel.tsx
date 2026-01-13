import React from 'react';
import { Instructor } from '@/types';
import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface InstructorSelectionPanelProps {
    instructors: Instructor[];
    selectedInstructorId: string | null;
    onSelect: (instructorId: string | null) => void;
    onClose?: () => void;
    isOpen: boolean;
}

export default function InstructorSelectionPanel({
    instructors,
    selectedInstructorId,
    onSelect,
    onClose,
    isOpen
}: InstructorSelectionPanelProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel Central */}
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4 pl-0 md:pl-0">
                <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300 max-w-lg w-full border border-gray-100">
                    <div className="text-center mb-6 md:mb-8">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                            ¿Con quién quieres reservar?
                        </h3>
                        <p className="text-sm md:text-base text-slate-500">
                            Selecciona un instructor para ver su disponibilidad
                        </p>
                    </div>

                    <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto px-2">
                        {/* Botón Ver Todos */}
                        <button
                            onClick={() => onSelect(null)}
                            className={cn(
                                "w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-200 flex items-center gap-4 group",
                                selectedInstructorId === null
                                    ? "bg-white border-2 border-slate-900 text-slate-900 shadow-xl scale-[1.02]"
                                    : "bg-slate-50 border-2 border-transparent text-slate-600 hover:bg-slate-100 hover:scale-[1.01]"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                                selectedInstructorId === null ? "bg-slate-900 text-white" : "bg-white text-slate-400 group-hover:text-slate-600 shadow-sm"
                            )}>
                                <Users className="w-6 h-6" />
                            </div>

                            <div className="flex-1 text-left">
                                <span className="block text-lg font-bold">Ver Todos</span>
                                <span className="text-xs font-normal opacity-80">Mostrar calendario completo</span>
                            </div>

                            {selectedInstructorId === null && (
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </button>

                        {/* Lista Instructores */}
                        {instructors.map(instructor => {
                            const isSelected = selectedInstructorId === instructor.id;

                            return (
                                <button
                                    key={instructor.id}
                                    onClick={() => onSelect(instructor.id)}
                                    className={cn(
                                        "w-full py-3 px-5 rounded-2xl font-semibold transition-all duration-200 flex items-center gap-4 group",
                                        isSelected
                                            ? "bg-white border-2 border-green-500 text-slate-900 shadow-xl scale-[1.02]"
                                            : "bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-200 hover:shadow-md hover:scale-[1.01]"
                                    )}
                                >
                                    <Avatar className={cn(
                                        "w-12 h-12 border-2",
                                        isSelected ? "border-green-500" : "border-slate-100"
                                    )}>
                                        <AvatarImage src={instructor.profilePictureUrl || undefined} alt={instructor.name} />
                                        <AvatarFallback>{getInitials(instructor.name)}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 text-left">
                                        <span className="block text-base font-bold text-slate-800">{instructor.name}</span>
                                        <span className="text-xs text-slate-400">Instructor</span>
                                    </div>

                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                        isSelected ? "bg-green-500 text-white" : "bg-slate-100 text-transparent"
                                    )}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-slate-400">
                            Mostrando {instructors.length} instructores disponibles
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

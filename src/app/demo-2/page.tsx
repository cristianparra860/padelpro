"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, CheckCircle2, Lock, SkipForward, RefreshCw, Wallet, Clock, Share2, ArrowDown, Users, Hourglass, X, ChevronRight, ChevronLeft } from 'lucide-react';

// --- TIPOS ---
type SpotStatus = 'empty' | 'occupied' | 'reserved_by_user' | 'paid_by_user' | 'cancelled_by_system';

interface MockClass {
    id: string;
    day: 'Lunes' | 'Martes';
    time: string;
    price: number;
    title: string;
    level: number;
    category: string;
    court: string;
    spots: { id: number, status: SpotStatus, avatarUrl?: string }[];
    isVisible: boolean;
}

// --- CONFIGURACI├ôN DE PASOS ---
const FLOW_STEPS = [
    { id: 'STEP_1_WALLET_INTRO', label: '1. Cartera' },
    { id: 'STEP_2_ADD_FUNDS', label: '2. Recarga' },
    { id: 'STEP_3_AVAILABILITY', label: '3. Dispon.' },   // WAS STEP 4
    { id: 'STEP_4_SHOW_CLASSES', label: '4. Clases' },    // WAS STEP 3
    { id: 'STEP_5_EXPLAIN_MULTI', label: '5. Multi' },
    { id: 'STEP_6_BOOK_1', label: '6. Res. 1' },
    { id: 'STEP_7_BOOK_2', label: '7. Res. 2' },
    { id: 'STEP_8_BOOK_3', label: '8. Res. 3' },
    { id: 'STEP_9_BOOK_4', label: '9. Res. 4' },
    { id: 'STEP_10_TIME_PASSES', label: '10. Tiempo' },
    { id: 'STEP_11_RIVALS_JOIN', label: '11. Rivales' },
    { id: 'STEP_12_CONFIRMATION', label: '12. Confirm' },
    { id: 'STEP_13_SHOW_CANCELLED', label: '13. Cancel' },
    { id: 'STEP_14_CLEANUP', label: '14. Limpieza' },
    { id: 'STEP_15_END', label: '15. Fin' },
] as const;

type StoryStep = typeof FLOW_STEPS[number]['id'];

// --- DATOS INICIALES ---
const INITIAL_CLASSES: MockClass[] = [
    {
        id: '1', day: 'Lunes', time: '16:00', price: 15, title: 'Nivel 4.0', level: 4.0, category: 'Mixto', court: 'Pista 2',
        spots: [{ id: 1, status: 'empty' }, { id: 2, status: 'empty' }, { id: 3, status: 'empty' }, { id: 4, status: 'empty' }],
        isVisible: false
    },
    {
        id: '2', day: 'Lunes', time: '16:30', price: 15, title: 'Nivel 3.5', level: 3.5, category: 'Femenino', court: 'Pista 4',
        spots: [{ id: 1, status: 'empty' }, { id: 2, status: 'empty' }, { id: 3, status: 'occupied', avatarUrl: 'https://i.pravatar.cc/150?u=10' }, { id: 4, status: 'empty' }],
        isVisible: false
    },
    {
        id: '3', day: 'Lunes', time: '17:00', price: 15, title: 'Nivel 4.5', level: 4.5, category: 'Masculino', court: 'Pista 1',
        spots: [{ id: 1, status: 'occupied', avatarUrl: 'https://i.pravatar.cc/150?u=20' }, { id: 2, status: 'empty' }, { id: 3, status: 'empty' }, { id: 4, status: 'empty' }],
        isVisible: false
    },
    {
        id: '4', day: 'Lunes', time: '17:30', price: 15, title: 'Nivel 5.0', level: 5.0, category: 'Pro', court: 'Central',
        spots: [{ id: 1, status: 'empty' }, { id: 2, status: 'empty' }, { id: 3, status: 'empty' }, { id: 4, status: 'empty' }],
        isVisible: false
    },
];

export default function DemoStoryPage() {
    const [step, setStep] = useState<StoryStep>('STEP_1_WALLET_INTRO');
    const [classes, setClasses] = useState<MockClass[]>(JSON.parse(JSON.stringify(INITIAL_CLASSES)));
    const [balance, setBalance] = useState(0);
    const [timeProgress, setTimeProgress] = useState(0);

    const currentStepIndex = FLOW_STEPS.findIndex(s => s.id === step);

    const goToStep = (targetStep: StoryStep) => {
        setStep(targetStep);
    };

    const nextStep = () => {
        if (currentStepIndex < FLOW_STEPS.length - 1) {
            setStep(FLOW_STEPS[currentStepIndex + 1].id);
        } else {
            setStep('STEP_1_WALLET_INTRO');
        }
    };

    useEffect(() => {
        const idx = FLOW_STEPS.findIndex(s => s.id === step);

        let newClasses = JSON.parse(JSON.stringify(INITIAL_CLASSES)) as MockClass[];
        let newBalance = 0;
        let newTimeProgress = 0;

        const setVisible = (viz: boolean) => newClasses.forEach(c => c.isVisible = viz);
        const book = (cId: string, sIdx: number) => {
            const cls = newClasses.find(c => c.id === cId);
            if (cls) cls.spots[sIdx] = { ...cls.spots[sIdx], status: 'reserved_by_user' };
        }
        const occupy = (cId: string, sIdx: number, avatar: string) => {
            const cls = newClasses.find(c => c.id === cId);
            if (cls) cls.spots[sIdx] = { ...cls.spots[sIdx], status: 'occupied', avatarUrl: avatar };
        }

        // --- LOGIC GATES ---
        if (idx >= 0) { setVisible(false); }
        if (idx >= 1) { newBalance = 20; }

        // Step 3 (idx 2): AVAILABILITY -> No visibility change, classes hidden or just consistent with previous

        // Step 4 (idx 3): SHOW CLASSES -> Make them visible
        if (idx >= 3) { setVisible(true); }

        if (idx >= 5) { book('1', 0); }
        if (idx >= 6) { book('2', 0); }
        if (idx >= 7) { book('3', 1); }
        if (idx >= 8) { book('4', 0); }
        if (idx >= 9) {
            if (step === 'STEP_10_TIME_PASSES') {
                // Interval driven
            } else {
                newTimeProgress = 100;
            }
        }
        if (idx >= 10) {
            occupy('1', 1, 'https://i.pravatar.cc/150?u=30');
            occupy('4', 1, 'https://i.pravatar.cc/150?u=41');
            occupy('2', 1, 'https://i.pravatar.cc/150?u=52');
        }
        if (idx >= 11) {
            occupy('2', 3, 'https://i.pravatar.cc/150?u=99');
            const cls2 = newClasses.find(c => c.id === '2');
            if (cls2) {
                cls2.spots = cls2.spots.map(s => s.status === 'reserved_by_user' ? { ...s, status: 'paid_by_user' } : s);
            }
            newBalance = 5;
        }
        if (idx >= 12) {
            newClasses = newClasses.map(c => {
                if (c.id === '2') return c;
                return {
                    ...c,
                    spots: c.spots.map(s => s.status === 'reserved_by_user' ? { ...s, status: 'cancelled_by_system' as SpotStatus } : s)
                };
            });
        }
        if (idx >= 13) {
            newClasses = newClasses.map(c => {
                if (c.id === '2') return c;
                return {
                    ...c,
                    spots: c.spots.map(s => s.status === 'cancelled_by_system' ? { ...s, status: 'empty' as SpotStatus } : s)
                };
            });
        }

        setClasses(newClasses);
        setBalance(newBalance);
        setTimeProgress(newTimeProgress);

        if (step === 'STEP_10_TIME_PASSES') {
            setTimeProgress(0);
            let p = 0;
            const interval = setInterval(() => {
                p += 5;
                if (p >= 100) { clearInterval(interval); setTimeProgress(100); }
                else setTimeProgress(p);
            }, 50);
            return () => clearInterval(interval);
        }

    }, [step]);

    const activeReservations = classes.filter(c => c.spots.some(s => s.status === 'reserved_by_user'));
    const isPaid = classes.some(c => c.spots.some(s => s.status === 'paid_by_user'));
    const maxBlockedPrice = (activeReservations.length > 0 && !isPaid) ? 15 : 0;

    // Textos de historia - FORZADOS A DOS LINEAS CON \n
    const getStoryText = () => {
        switch (step) {
            case 'STEP_1_WALLET_INTRO': return "Tienes tu cartera\nvacía (0€)";
            case 'STEP_2_ADD_FUNDS': return "Recarga 5, 10 o 15€\npara reservar.";

            case 'STEP_3_AVAILABILITY': return "Si tu disponibilidad\nes de 16:00 a 18:00h.";
            case 'STEP_4_SHOW_CLASSES': return "Filtra las clases que\ncoincidan con tu horario";

            case 'STEP_5_EXPLAIN_MULTI': return "Te puedes inscribir en\nTODAS las clases de 16 a 18h.";
            case 'STEP_6_BOOK_1': return "Te apuntas a las 16:00h.\nBloqueo: 15€.";
            case 'STEP_7_BOOK_2': return "Si te apuntas a las 16:00 y a las 16:30h\nEl bloqueo NO sube.";
            case 'STEP_8_BOOK_3': return "Si te apuntas a la tercera clase (17:00h)\n¡Sigues con solo 15€ retenidos!";
            case 'STEP_9_BOOK_4': return "Si te apuntas a una cuarta clase,\nverás que el sistema solo bloquea el valor más alto de tus inscripciones";
            case 'STEP_10_TIME_PASSES': return "Pasa el tiempo...\nEsperando jugadores...";
            case 'STEP_11_RIVALS_JOIN': return "¡Otros jugadores\nse van apuntando!";
            case 'STEP_12_CONFIRMATION': return "¡La clase de 16:30 se COMPLETA!\nConfirmamos tu plaza y cobramos 15€.";
            case 'STEP_13_SHOW_CANCELLED': return "El sistema CANCELA tus otras\nreservas automáticamente.";
            case 'STEP_14_CLEANUP': return "Y libera tus plazas\nque no vas a utilizar";
            case 'STEP_15_END': return "El sistema asigna pista y\nsolo quedará que acudas a tu clase";
            default: return "";
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header Sticky */}
            <style jsx global>{`
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .animate-heartbeat {
                    animation: heartbeat 1.5s ease-in-out infinite;
                }
            `}</style>
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex justify-center items-center shadow-sm">
                <span className="text-3xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600">Cómo funcionan las clases</span>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-6">

                {/* 1. NARRATIVA (Apple Style & Two Lines) */}
                <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 min-h-[160px] flex flex-col items-center justify-center text-center relative overflow-hidden transition-all">
                    <h2
                        className="text-3xl md:text-5xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 relative z-10 leading-normal w-full max-w-5xl mx-auto tracking-tighter px-4 pb-2 break-words whitespace-pre-line"
                    >
                        <TypewriterText text={getStoryText()} key={step} speed={50} />
                    </h2>

                    {step === 'STEP_10_TIME_PASSES' && (
                        <div className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-all duration-75" style={{ width: `${timeProgress}%` }}></div>
                    )}
                </div>

                {/* 2. TARJETAS */}
                <div className="relative">
                    {!classes[0].isVisible ? (
                        <div className="h-64 flex items-center justify-center text-slate-400 italic bg-slate-100/50 rounded-2xl border-dashed border-2 border-slate-200">
                            Las clases aparecer├ín aqu├¡...
                        </div>
                    ) : (
                        <div className="flex gap-2 overflow-x-auto pb-8 pt-6 snap-x px-4 justify-start md:justify-center no-scrollbar">
                            {classes.map((cls, idx) => (
                                <div key={cls.id} className="min-w-[220px] max-w-[220px] snap-center">
                                    <ClassCard
                                        data={cls}
                                        isVisible={cls.isVisible}
                                        index={idx}
                                        step={step}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. INFO CARTERA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-6">
                    {/* Saldo */}
                    <Card className="p-5 border-0 shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Disponible</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className={cn("text-4xl font-black tracking-tight transition-all duration-300", balance > 0 ? "text-slate-800" : "text-slate-300")}>
                                        {balance}€
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-100 p-2 rounded-full">
                                <Wallet className="w-5 h-5 text-slate-500" />
                            </div>
                        </div>
                        {balance === 20 && step !== 'STEP_12_CONFIRMATION' && step !== 'STEP_14_CLEANUP' && step !== 'STEP_15_END' && (
                            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold self-start animate-in fade-in slide-in-from-bottom-2">
                                +20.00€ Añadidos
                            </div>
                        )}
                        {step === 'STEP_12_CONFIRMATION' && (
                            <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold self-start animate-in fade-in slide-in-from-bottom-2">
                                -15.00€ Cobrado
                            </div>
                        )}
                    </Card>

                    {/* Retenci├│n */}
                    <Card className={cn("p-5 border-0 shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative overflow-hidden h-32 transition-all duration-500 hover:scale-[1.01]",
                        maxBlockedPrice > 0 ? "bg-amber-50 ring-1 ring-amber-200" : isPaid ? "bg-green-50 ring-1 ring-green-200" : "bg-white")}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Garantía de pago (Retención activa)</h3>
                                <div className="flex items-baseline gap-2">
                                    {isPaid ? (
                                        <span className="text-2xl font-black text-green-600 tracking-tight animate-in zoom-in">LIBERADA</span>
                                    ) : (
                                        <span className={cn("text-4xl font-black tracking-tight transition-all duration-300", maxBlockedPrice > 0 ? "text-amber-600" : "text-slate-300")}>
                                            {maxBlockedPrice}€
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={cn("p-2 rounded-full transition-colors",
                                isPaid ? "bg-green-100" : maxBlockedPrice > 0 ? "bg-amber-100" : "bg-slate-100")}>
                                {isPaid ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Lock className={cn("w-5 h-5", maxBlockedPrice > 0 ? "text-amber-600" : "text-slate-500")} />}
                            </div>
                        </div>

                        {!isPaid && (
                            <div className="flex items-end gap-1.5 h-6 mt-4 opacity-40">
                                {classes.map(cls => {
                                    const isReserved = cls.spots.some(s => s.status === 'reserved_by_user');
                                    return (
                                        <div key={cls.id} className="flex-1 flex flex-col justify-end h-full">
                                            <div className={cn("w-full rounded-sm transition-all duration-500",
                                                isReserved ? "bg-amber-600 h-full" : "bg-slate-300 h-1")}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* 4. CONTROL Y NAVEGACI├ôN VERTICAL */}
                <div className="flex flex-col gap-4 items-center mt-6 max-w-2xl mx-auto">
                    {/* Bot├│n Principal ARRIBA */}
                    <Button
                        onClick={nextStep}
                        className="w-full text-lg py-8 px-8 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 shadow-xl rounded-2xl transition-all active:scale-95 group flex flex-col gap-1 items-center justify-center"
                    >
                        <span className="font-bold flex items-center gap-2 text-xl">
                            {step === 'STEP_15_END' ? "Volver a empezar" : "Ver Siguiente Paso"}
                            {step === 'STEP_15_END' ? <RefreshCw className="w-6 h-6" /> : <SkipForward className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">
                            {step === 'STEP_15_END' ? "Reinicia la demostraci├│n" : "Haz clic para continuar la historia"}
                        </span>
                    </Button>

                    {/* Grid de Pasos ABAJO */}
                    <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                            {FLOW_STEPS.map((s, idx) => {
                                const isActive = s.id === step;
                                const isPast = idx < currentStepIndex;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => goToStep(s.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-1.5 rounded-md border min-h-[40px] transition-all hover:bg-white",
                                            isActive ? "bg-white border-amber-300 shadow-md scale-105 z-10" :
                                                isPast ? "bg-white border-slate-200 opacity-80" : "bg-transparent border-transparent opacity-40 hover:opacity-100"
                                        )}
                                    >
                                        <span className={cn("text-[8px] font-black uppercase leading-none", isActive ? "text-amber-600" : "text-slate-400")}>{idx + 1}</span>
                                        <span className={cn("text-[7px] font-bold whitespace-nowrap leading-none mt-0.5", isActive ? "text-slate-800" : "text-slate-400")}>{s.label.split('. ')[1]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- TYPEWRITER ---
function TypewriterText({ text, speed = 50 }: { text: string, speed?: number }) {
    const [displayedLength, setDisplayedLength] = useState(0);

    useEffect(() => {
        setDisplayedLength(0);
        const interval = setInterval(() => {
            setDisplayedLength(prev => {
                if (prev < text.length) {
                    return prev + 1;
                }
                clearInterval(interval);
                return prev;
            });
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return <span>{text.slice(0, displayedLength)}<span className="animate-pulse">|</span></span>;
}

// --- COMPONENTS ---

function ClassCard({ data, isVisible, index, step }: { data: MockClass, isVisible: boolean, index: number, step: string }) {
    const isReservedByMe = data.spots.some(s => s.status === 'reserved_by_user');
    const isPaidByMe = data.spots.some(s => s.status === 'paid_by_user');
    const isCancelledByMe = data.spots.some(s => s.status === 'cancelled_by_system');

    const delay = index * 100;
    const isJustConfirmed = isPaidByMe && step === 'STEP_12_CONFIRMATION';
    const isFinalState = step === 'STEP_15_END' && isPaidByMe;

    return (
        <div
            style={{ animationDelay: `${delay}ms` }}
            className={cn(
                "bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden w-full relative transition-all duration-500 animate-in slide-in-from-right-4 fade-in fill-mode-forwards",
                isVisible ? "opacity-100" : "opacity-0",
                !isVisible && "translate-y-4",
                isReservedByMe && !isPaidByMe && !isCancelledByMe ? "ring-2 ring-amber-400 scale-105 z-10" : "",
                isPaidByMe ? "ring-4 ring-green-500 scale-110 z-20" : "",
                isCancelledByMe ? "opacity-70 grayscale-[0.5] scale-95" : ""
            )}
        >
            {isJustConfirmed && (
                <div className="absolute inset-0 bg-green-500/10 z-30 animate-in fade-in duration-300 flex items-center justify-center">
                    <div className="bg-white rounded-full p-2 shadow-xl animate-in zoom-in bounce-in">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 flex items-center justify-center">
                <div className="text-white text-sm font-black uppercase">CLASES (60 MIN)</div>
            </div>

            <div className="px-3 pt-2 pb-3 relative flex flex-col gap-2">
                {/* Instructor Info */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={`https://i.pravatar.cc/150?u=${data.id}`} alt="Instructor" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-xs leading-tight">María</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <svg key={star} className="w-1.5 h-1.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                        </svg>
                                    ))}
                                </div>
                                <span className="text-[10px] text-gray-600 ml-1">(4.5)</span>
                            </div>
                        </div>
                    </div>

                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg flex items-center gap-1.5">
                        <Plus className="w-3 h-3" />
                        <div className="flex flex-col items-start leading-tight">
                            <span>Reserva</span>
                            <span>privada</span>
                        </div>
                    </button>
                </div>

                {/* Pills */}
                <div className="grid grid-cols-3 gap-1 text-center text-sm text-gray-600 border-b border-gray-100 pb-0.5">
                    <div>
                        <div className="font-medium text-gray-900 text-[10px]">Nivel</div>
                        <div className="capitalize px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] bg-blue-100 text-blue-800">
                            4-5.5
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 text-[10px]">Cat.</div>
                        <div className="capitalize px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] bg-blue-100 text-blue-800">
                            Chicos
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 text-[10px]">Pista</div>
                        <div className={cn(
                            "px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]",
                            isFinalState ? "bg-blue-100 text-blue-700 animate-heartbeat ring-2 ring-amber-400" : "text-gray-600"
                        )}>
                            {isFinalState ? "Pista 1" : "Pista"}
                        </div>
                    </div>
                </div>

                {/* Date & Time */}
                <div className="py-0.5">
                    <div className="bg-gray-50 rounded-xl p-1 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="text-[1.25rem] font-black text-gray-900 leading-none min-w-[2rem] text-center">14</div>
                                <div className="flex flex-col justify-center gap-0.5">
                                    <div className="text-xs font-bold text-gray-900 uppercase tracking-tight leading-none">MIÉRCOLES</div>
                                    <div className="text-xs font-normal text-gray-500 capitalize leading-none">Enero</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xl font-bold text-gray-900 leading-none">{data.time}</div>
                                    <div className="text-[10px] text-gray-500 flex items-center justify-end gap-0.5 mt-0.5">
                                        <Clock className="w-2 h-2" />
                                        <span>60 min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="space-y-1">
                    <PricingRow count={1} price={30} />
                    <PricingRow count={2} price={15} />
                    <PricingRow count={3} price={10} />
                    <div className="flex items-center justify-between pt-0.5">
                        <div className="flex gap-1">
                            {data.spots.map((spot, i) => (
                                <PricingCircle
                                    key={i}
                                    label="Libre"
                                    isPlus={!spot.status.includes('occupied') && !spot.status.includes('reserved') && !spot.status.includes('paid') && !spot.status.includes('cancelled')}
                                    isActive={spot.status === 'reserved_by_user'}
                                    isPaid={spot.status === 'paid_by_user'}
                                    isCancelled={spot.status === 'cancelled_by_system'}
                                    imageUrl={spot.avatarUrl}
                                />
                            ))}
                        </div>
                        <span className="text-base font-black text-gray-900">€ 7.50</span>
                    </div>
                </div>

                {/* Court Availability */}
                <div className="pt-2 border-t border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 font-bold mb-1 block uppercase tracking-wide">Disponibilidad de pistas</span>
                    <div className="flex justify-center gap-2">
                        {isFinalState ? (
                            <TrackIcon status="free" label="1" isBlinking={true} />
                        ) : (
                            <>
                                <TrackIcon status="free" label="LIBRE" />
                                <TrackIcon status="free" label="LIBRE" />
                                <TrackIcon status="free" label="LIBRE" />
                                <TrackIcon status="free" label="LIBRE" />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


function Pill({ label, value, isBlinking }: { label: string, value: string, isBlinking?: boolean }) {
    return (
        <div className={cn("bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.04)] rounded-full flex-1 py-1 flex flex-col items-center justify-center min-w-0 transition-all", isBlinking && "animate-heartbeat ring-2 ring-amber-400")}>
            <span className="text-[6px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">{label}</span>
            <span className="text-[8px] font-black text-slate-700 truncate w-full text-center px-1">{value}</span>
        </div>
    );
}

function PricingRow({ count, price }: { count: number, price: number }) {
    return (
        <div className="flex items-center justify-between opacity-40 grayscale hover:opacity-100 transition-all cursor-pointer group">
            <div className="flex gap-1">
                {Array.from({ length: count }).map((_, i) => (
                    <PricingCircle key={i} label="Libre" isPlus={true} isSmall />
                ))}
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:scale-105 transition-transform">{price.toFixed(2)} €</span>
        </div>
    );
}

function PricingCircle({ label, isPlus, isActive, isPaid, isCancelled, imageUrl, isSmall }: { label: string, isPlus?: boolean, isActive?: boolean, isPaid?: boolean, isCancelled?: boolean, imageUrl?: string, isSmall?: boolean }) {
    const sizeClass = isSmall ? "w-5 h-5" : "w-7 h-7";

    if (isPaid) {
        return (
            <div className="flex flex-col items-center gap-0">
                <div className={`${sizeClass} rounded-full bg-green-100 border-2 border-green-500 text-green-700 flex items-center justify-center shadow-md ring-1 ring-green-200 scale-110 font-bold text-[7px] z-10 box-content`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                {!isSmall && <span className="text-[5px] text-green-600 font-bold scale-90 mt-0.5">CONFIRMADO</span>}
            </div>
        );
    }

    if (isCancelled) {
        return (
            <div className="flex flex-col items-center gap-0">
                <div className={`${sizeClass} rounded-full bg-red-100 border-2 border-red-500 text-red-700 flex items-center justify-center shadow-md ring-1 ring-red-200 scale-110 font-bold text-[7px] z-10 box-content relative`}>
                    <span className="text-[8px] font-black z-0 opacity-50 absolute">YO</span>
                    <X className="w-5 h-5 absolute z-10 text-red-600/90" strokeWidth={4} />
                </div>
                {!isSmall && <span className="text-[5px] text-red-600 font-bold scale-90 mt-0.5">CANCELADO</span>}
            </div>
        );
    }

    if (isActive) {
        return (
            <div className="flex flex-col items-center gap-0">
                <div className={`${sizeClass} rounded-full bg-amber-100 border-2 border-amber-500 text-amber-700 flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.3)] ring-2 ring-amber-50 scale-110 font-black text-[8px] z-10 box-content`}>
                    YO
                </div>
                {!isSmall && <span className="text-[5px] text-slate-400 font-bold scale-90 mt-0.5">{label}</span>}
            </div>
        );
    }
    if (imageUrl) {
        return (
            <div className="flex flex-col items-center gap-0">
                <div className={`${sizeClass} rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm animate-in zoom-in duration-300 box-content`}>
                    <img src={imageUrl} className="w-full h-full object-cover" />
                </div>
                {!isSmall && <span className="text-[5px] text-slate-400 font-medium scale-90 mt-0.5">Ocupado</span>}
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-0">
            <div className={`${sizeClass} rounded-full bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm transition-transform hover:scale-105 box-content`}>
                {isPlus && <Plus className="w-2.5 h-2.5" />}
            </div>
            {!isSmall && <span className="text-[5px] text-slate-400 font-medium scale-90 mt-0.5">{label}</span>}
        </div>
    );
}

function TrackIcon({ status, label, isBlinking }: { status: 'free' | 'busy', label: string, isBlinking?: boolean }) {
    return (
        <div className={cn("flex flex-col items-center", isBlinking && "animate-heartbeat")}>
            <div className="w-4 h-6 bg-[#10b981] rounded-[2px] border border-[#059669] relative mb-0.5 shadow-sm overflow-hidden">
                <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-white/40"></div>
                <div className="absolute top-0 left-1/2 h-full w-[0.5px] bg-white/40"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            </div>
            <span className="text-[5px] font-black text-[#10b981] tracking-tighter">{label}</span>
        </div>
    );
}

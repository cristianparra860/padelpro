'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy, ArrowLeft, List, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DateSelector from '@/components/admin/DateSelector';

export default function CreateMatchGamePage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inicializar fecha desde URL o usar hoy
  const initialDate = searchParams.get('date')
    ? new Date(searchParams.get('date')!)
    : new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [showAllOpen, setShowAllOpen] = useState(true);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generar horarios cada 30 minutos desde las 06:00 hasta las 23:30
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 23 && minute === 30) continue; // No incluir 23:30
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const toggleTimeSlot = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTimes.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un horario",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const promises = selectedTimes.map(async (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const startDate = new Date(selectedDate);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 90); // 90 minutos de duración

        const response = await fetch('/api/admin/matchgames/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clubId: 'club-1',
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            duration: 90,
            pricePerPlayer: 8.00,
            isOpen: true, // Siempre abierto
            level: null, // Sin nivel hasta que se inscriba el primer jugador
            genderCategory: null // Sin categoría hasta que se inscriba el primer jugador
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al crear partida');
        }

        return response.json();
      });

      await Promise.all(promises);

      toast({
        title: "Éxito",
        description: `${selectedTimes.length} partida${selectedTimes.length > 1 ? 's' : ''} creada${selectedTimes.length > 1 ? 's' : ''} correctamente`
      });

      router.push('/admin');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron crear las partidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 ml-20 pr-4 overflow-x-hidden max-w-[calc(100vw-100px)]">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6 text-blue-600" />
            Clases Gestionadas
          </h1>
        </div>

        {/* Selector de Fecha */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Selecciona el Día</h2>
            <DateSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              daysToShow={20}
            />
          </CardContent>
        </Card>

        {/* Selector de Horarios */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Selecciona Horarios</h2>
              <div className="flex gap-2">
                <Button
                  variant={showAllOpen ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowAllOpen(!showAllOpen);
                    if (!showAllOpen) {
                      setSelectedTimes(timeSlots);
                    }
                  }}
                >
                  Todo Abierto
                </Button>
                <Button
                  variant={showAllClosed ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowAllClosed(!showAllClosed);
                    if (!showAllClosed) {
                      setSelectedTimes([]);
                    }
                  }}
                >
                  Todo Cerrado
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {timeSlots.map((time) => {
                const isSelected = selectedTimes.includes(time);
                return (
                  <button
                    key={time}
                    onClick={() => toggleTimeSlot(time)}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {time}
                    </span>
                    <div className={`w-2 h-2 rounded-full mt-1 ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Botón de agregar */}
        <Button
          onClick={handleSubmit}
          disabled={loading || selectedTimes.length === 0}
          size="lg"
          className="w-full bg-blue-400 hover:bg-blue-500 text-white text-lg py-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          {loading
            ? 'Añadiendo...'
            : `Añadir ${selectedTimes.length || 0} Propuesta${selectedTimes.length !== 1 ? 's' : ''}`
          }
        </Button>

        {/* Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Todas las partidas se crean con <strong>Nivel Abierto</strong> y <strong>Categoría Abierta</strong>.
            El nivel y categoría se definirán automáticamente cuando se inscriba el primer jugador.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            • Duración: 90 minutos<br />
            • Precio: €8.00 por jugador<br />
            • Máximo: 4 jugadores
          </p>
        </div>
      </div>
    </div>
  );
}

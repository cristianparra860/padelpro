'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function CreateMatchGamePage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: 90,
    pricePerPlayer: 15,
    isOpen: true,
    level: '',
    genderCategory: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construir fecha/hora
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + formData.duration);

      const response = await fetch('/api/admin/matchgames/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: 'club-1',
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration: formData.duration,
          pricePerPlayer: formData.pricePerPlayer,
          isOpen: formData.isOpen,
          level: formData.isOpen ? null : formData.level,
          genderCategory: formData.genderCategory || null
        })
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Partida creada correctamente"
        });
        router.push('/admin/matchgames');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear partida');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la partida",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button
        onClick={() => router.back()}
        variant="ghost"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-500" />
            Crear Nueva Partida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Duración y Precio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duración (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="60"
                  max="120"
                  step="30"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Precio por Jugador (€)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.pricePerPlayer}
                  onChange={(e) => setFormData({ ...formData, pricePerPlayer: parseFloat(e.target.value) })}
                  min="5"
                  max="50"
                  step="0.5"
                  required
                />
              </div>
            </div>

            {/* Tipo de Partida */}
            <div>
              <Label>Tipo de Partida</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isOpen}
                    onChange={() => setFormData({ ...formData, isOpen: true, level: '' })}
                    className="w-4 h-4"
                  />
                  <span>Abierta (0.0 - 7.0)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isOpen}
                    onChange={() => setFormData({ ...formData, isOpen: false })}
                    className="w-4 h-4"
                  />
                  <span>Clasificada por Nivel</span>
                </label>
              </div>
            </div>

            {/* Nivel (solo si es clasificada) */}
            {!formData.isOpen && (
              <div>
                <Label htmlFor="level">Nivel de la Partida</Label>
                <Input
                  id="level"
                  type="text"
                  placeholder="Ej: 2.5, 4.0, 5.5"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  required={!formData.isOpen}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Nivel numérico de 0.0 a 7.0
                </p>
              </div>
            )}

            {/* Categoría de Género */}
            <div>
              <Label htmlFor="gender">Categoría de Género (Opcional)</Label>
              <select
                id="gender"
                value={formData.genderCategory}
                onChange={(e) => setFormData({ ...formData, genderCategory: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Mixto / Por definir</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="mixto">Mixto</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Si no se especifica, se define con el primer jugador inscrito
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creando...' : 'Crear Partida'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

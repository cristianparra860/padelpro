"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';

interface LevelRange {
  minLevel: number;
  maxLevel: number;
}

interface InstructorLevelRangesProps {
  instructorId: string;
  initialRanges?: LevelRange[];
}

export default function InstructorLevelRanges({ 
  instructorId, 
  initialRanges = [] 
}: InstructorLevelRangesProps) {
  // Normalizar los rangos para asegurar que tengan valores numéricos válidos
  const normalizedRanges = initialRanges.length > 0 
    ? initialRanges.map(r => ({
        minLevel: typeof r.minLevel === 'number' ? r.minLevel : 0,
        maxLevel: typeof r.maxLevel === 'number' ? r.maxLevel : 0
      }))
    : [
        { minLevel: 0.0, maxLevel: 1.0 },
        { minLevel: 1.5, maxLevel: 2.5 },
        { minLevel: 3.0, maxLevel: 4.5 },
        { minLevel: 5.0, maxLevel: 7.0 }
      ];
      
  const [ranges, setRanges] = useState<LevelRange[]>(normalizedRanges);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAddRange = () => {
    const lastRange = ranges[ranges.length - 1];
    const newMinLevel = lastRange ? lastRange.maxLevel + 0.5 : 0.0;
    
    setRanges([
      ...ranges,
      { minLevel: newMinLevel, maxLevel: Math.min(newMinLevel + 1.0, 7.0) }
    ]);
    setEditingIndex(ranges.length);
  };

  const handleRemoveRange = (index: number) => {
    if (ranges.length <= 1) {
      toast({
        title: "Error",
        description: "Debe haber al menos un rango de nivel",
        variant: "destructive"
      });
      return;
    }
    setRanges(ranges.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleUpdateRange = (index: number, field: keyof LevelRange, value: string | number) => {
    const updatedRanges = [...ranges];
    const numValue = parseFloat(value as string) || 0;
    updatedRanges[index] = {
      ...updatedRanges[index],
      [field]: Math.max(0, Math.min(7.0, numValue)) // Limitar entre 0.0 y 7.0
    };
    setRanges(updatedRanges);
  };

  const validateRanges = (): boolean => {
    // Verificar que los rangos sean válidos
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      
      // Verificar límites válidos
      if (range.minLevel < 0 || range.minLevel > 7.0) {
        toast({
          title: "Error",
          description: "Los niveles deben estar entre 0.0 y 7.0",
          variant: "destructive"
        });
        return false;
      }
      
      if (range.maxLevel < 0 || range.maxLevel > 7.0) {
        toast({
          title: "Error",
          description: "Los niveles deben estar entre 0.0 y 7.0",
          variant: "destructive"
        });
        return false;
      }
      
      // Verificar que min < max
      if (range.minLevel >= range.maxLevel) {
        toast({
          title: "Error",
          description: `El nivel mínimo debe ser menor que el máximo en el rango ${i + 1}`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateRanges()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Error",
          description: "No estás autenticado",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/instructors/${instructorId}/level-ranges`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ levelRanges: ranges })
      });

      if (response.ok) {
        toast({
          title: "✅ Rangos Guardados",
          description: "Los rangos de nivel se han actualizado correctamente"
        });
        setEditingIndex(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }
    } catch (error: any) {
      console.error('Error saving level ranges:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los rangos",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Rangos de Nivel de Usuarios</h3>
            <p className="text-sm text-gray-500">
              Define los rangos de nivel para clasificar a tus alumnos (0.0 - 7.0)
            </p>
          </div>
          <Button onClick={handleAddRange} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Rango
          </Button>
        </div>

        <div className="space-y-3">
          {ranges.map((range, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {editingIndex === index ? (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-gray-700">Nivel:</span>
                    <Input
                      type="number"
                      value={range.minLevel}
                      onChange={(e) => handleUpdateRange(index, 'minLevel', e.target.value)}
                      placeholder="0.0"
                      className="w-20"
                      step="0.5"
                      min={0}
                      max={7.0}
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      type="number"
                      value={range.maxLevel}
                      onChange={(e) => handleUpdateRange(index, 'maxLevel', e.target.value)}
                      placeholder="7.0"
                      className="w-20"
                      step="0.5"
                      min={range.minLevel}
                      max={7.0}
                    />
                  </div>
                  <Button
                    onClick={() => setEditingIndex(null)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium text-lg">
                      {(range.minLevel ?? 0).toFixed(1)} - {(range.maxLevel ?? 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Rango #{index + 1}
                    </div>
                  </div>
                  <Button
                    onClick={() => setEditingIndex(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRemoveRange(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Rangos'}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <div className="text-blue-600 font-semibold">💡</div>
            <div className="text-sm text-blue-800">
              <strong>¿Cómo funciona?</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Define rangos basados en el nivel de habilidad (0.0 a 7.0)</li>
                <li>Ejemplo: Un usuario con nivel 3.0 entraría en el rango "3.0 - 4.5"</li>
                <li>Los rangos te ayudan a clasificar tus clases por nivel</li>
                <li>Puedes crear tantos rangos como necesites</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Users, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Instructor {
  id: string;
  name: string;
  specialties?: string | null;
}

interface InstructorFilterProps {
  selectedInstructorIds: string[];
  onInstructorChange: (instructorIds: string[]) => void;
}

export function InstructorFilter({ selectedInstructorIds, onInstructorChange }: InstructorFilterProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      // Llamada directa a la base de datos sin filtros
      const response = await fetch('/api/instructors', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Instructores cargados:', data.length, data.map((i: Instructor) => i.name));
        setInstructors(data);
        
        // Si no hay instructores seleccionados, seleccionar todos por defecto
        if (selectedInstructorIds.length === 0 && data.length > 0) {
          onInstructorChange(data.map((i: Instructor) => i.id));
        }
      } else {
        console.error('❌ Error al cargar instructores:', response.status);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInstructor = (instructorId: string) => {
    const newSelected = selectedInstructorIds.includes(instructorId)
      ? selectedInstructorIds.filter(id => id !== instructorId)
      : [...selectedInstructorIds, instructorId];
    
    onInstructorChange(newSelected);
  };

  const handleSelectAll = () => {
    onInstructorChange(instructors.map(i => i.id));
  };

  const handleClearAll = () => {
    onInstructorChange([]);
  };

  const selectedCount = selectedInstructorIds.length;
  const totalCount = instructors.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled={loading}
        >
          <Users className="h-4 w-4" />
          <span>Instructores</span>
          {selectedCount > 0 && selectedCount < totalCount && (
            <Badge variant="secondary" className="ml-1">
              {selectedCount}
            </Badge>
          )}
          {selectedCount === totalCount && totalCount > 0 && (
            <Badge variant="default" className="ml-1">
              Todos
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        side="bottom"
        className="w-[420px] max-h-[600px]"
        sideOffset={5}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="text-base font-semibold">Filtrar por Instructor</span>
          {!loading && (
            <span className="text-sm font-normal text-muted-foreground">
              {selectedCount} de {totalCount}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Cargando instructores...
          </div>
        ) : instructors.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay instructores disponibles
          </div>
        ) : (
          <>
            <div className="px-3 py-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectAll();
                }}
                className="flex-1 h-9 text-sm"
              >
                ✓ Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleClearAll();
                }}
                className="flex-1 h-9 text-sm"
              >
                ✗ Ninguno
              </Button>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-[450px] overflow-y-auto px-2">
              {instructors.map((instructor) => (
                <DropdownMenuItem
                  key={instructor.id}
                  className="cursor-pointer py-3 px-3"
                  onSelect={(e) => {
                    e.preventDefault(); // Evitar que se cierre el dropdown
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleInstructor(instructor.id);
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Checkbox
                      checked={selectedInstructorIds.includes(instructor.id)}
                      onCheckedChange={() => handleToggleInstructor(instructor.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5"
                    />
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="font-medium text-base">{instructor.name}</span>
                      {instructor.specialties && (
                        <span className="text-sm text-muted-foreground">
                          {instructor.specialties}
                        </span>
                      )}
                    </div>
                    {selectedInstructorIds.includes(instructor.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

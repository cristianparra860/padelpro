"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Student {
    id: string;
    name: string;
    email: string;
    padelLevel?: string;
    profilePictureUrl?: string;
}

interface StudentSearchDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectStudent: (student: Student) => void;
}

const StudentSearchDialog: React.FC<StudentSearchDialogProps> = ({
    isOpen,
    onOpenChange,
    onSelectStudent,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setStudents([]);
            setSelectedStudent(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const searchStudents = async () => {
            if (searchQuery.trim().length < 2) {
                setStudents([]);
                return;
            }

            setLoading(true);
            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                if (response.ok) {
                    const data = await response.json();
                    setStudents(data.users || []);
                } else {
                    console.error('Failed to search students');
                    setStudents([]);
                }
            } catch (error) {
                console.error('Error searching students:', error);
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(searchStudents, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleConfirm = () => {
        if (selectedStudent) {
            onSelectStudent(selectedStudent);
            onOpenChange(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Añadir Alumno</DialogTitle>
                    <DialogDescription>
                        Busca y selecciona un alumno para añadir a esta clase
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!loading && searchQuery.trim().length < 2 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Escribe al menos 2 caracteres para buscar
                            </div>
                        )}

                        {!loading && searchQuery.trim().length >= 2 && students.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No se encontraron alumnos
                            </div>
                        )}

                        {!loading && students.map((student) => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudent?.id === student.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={student.profilePictureUrl} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                        {getInitials(student.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{student.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                                </div>
                                {student.padelLevel && (
                                    <Badge variant="outline" className="text-xs">
                                        {student.padelLevel}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedStudent}>
                        Añadir Alumno
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StudentSearchDialog;

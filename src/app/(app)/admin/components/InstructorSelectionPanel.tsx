import React from 'react';
import { Instructor } from '@/types';

interface InstructorSelectionPanelProps {
    instructors: Instructor[];
    selectedInstructorId: string | null;
    onSelectInstructor: (id: string | null) => void;
    className?: string;
}

const InstructorSelectionPanel: React.FC<InstructorSelectionPanelProps> = ({
    instructors,
    selectedInstructorId,
    onSelectInstructor,
    className
}) => {
    return (
        <div className={className}>
            <select
                value={selectedInstructorId || ''}
                onChange={(e) => onSelectInstructor(e.target.value || null)}
                className="border rounded p-2"
            >
                <option value="">Todos los instructores</option>
                {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>
                        {inst.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default InstructorSelectionPanel;

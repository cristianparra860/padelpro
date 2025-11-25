"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Assuming Label exists in ui
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MatchPadelLevel } from '@/types'; // Import MatchPadelLevel
import { matchPadelLevels } from '@/types'; // Import matchPadelLevels

interface EditableInfoRowProps {
  id: string;
  label: string;
  value: string | undefined;
  isEditing: boolean;
  onEditClick: () => void;
  onSaveClick: () => void;
  onCancelClick: () => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement> | string) => void; // Allow string for Select
  icon?: React.ElementType;
  isFirst?: boolean;
  isLast?: boolean;
  showSeparator?: boolean;
  inputType?: 'text' | 'email' | 'select';
  selectOptions?: { value: string; label: string }[]; // For select input type
  selectPlaceholder?: string;
  extraDisplay?: React.ReactNode;
  editable?: boolean;
}

const EditableInfoRow: React.FC<EditableInfoRowProps> = ({
  id,
  label,
  value,
  isEditing,
  onEditClick,
  onSaveClick,
  onCancelClick,
  onChange,
  icon: Icon,
  isFirst,
  isLast,
  showSeparator = true,
  inputType = 'text',
  selectOptions,
  selectPlaceholder,
  extraDisplay,
  editable = true,
}) => {
  return (
    <>
      <div className={cn(
        "flex items-center justify-between p-3 bg-white min-h-[44px]",
        isFirst && "rounded-t-lg",
        isLast && !isEditing && "rounded-b-lg", // Only round bottom if not editing and is last
        !isLast && showSeparator && !isEditing && "border-b border-gray-200"
      )}>
        <div className="flex items-center">
          {Icon && <Icon className="mr-3 h-5 w-5 text-gray-500" />}
          <Label htmlFor={!isEditing ? undefined : id} className="text-sm text-gray-700">{label}</Label>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900 truncate max-w-[150px]">{value || 'No especificado'}</span>
            {extraDisplay}
            {editable && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditClick}>
                <Edit className="h-4 w-4 text-blue-500" />
              </Button>
            )}
          </div>
        )}
      </div>
      {isEditing && (
        <div className={cn(
            "flex items-center space-x-2 p-3 bg-white",
            isLast ? "rounded-b-lg" : "border-b border-gray-200"
        )}>
          {inputType === 'select' && selectOptions ? (
            <Select 
              value={value && value !== '' ? value : selectOptions[0]?.value} 
              onValueChange={(val) => onChange(val as MatchPadelLevel)}
            >
              <SelectTrigger id={id} className="flex-grow h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={selectPlaceholder || "Selecciona..."} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.filter(opt => opt.value && opt.value !== '').map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={id}
              type={inputType === 'email' ? 'email' : 'text'}
              value={value || ''}
              onChange={onChange as (event: React.ChangeEvent<HTMLInputElement>) => void}
              className="flex-grow h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          )}
          <Button size="sm" onClick={onSaveClick} className="h-9 text-xs px-3 bg-blue-500 hover:bg-blue-600 text-white">Guardar</Button>
          <Button size="sm" variant="ghost" onClick={onCancelClick} className="h-9 text-xs px-3 text-gray-600 hover:bg-gray-100">Cancelar</Button>
        </div>
      )}
    </>
  );
};

export default EditableInfoRow;

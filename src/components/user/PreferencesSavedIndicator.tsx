'use client';

import React from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Check } from 'lucide-react';

interface PreferencesSavedIndicatorProps {
  userId: string | undefined;
}

export function PreferencesSavedIndicator({ userId }: PreferencesSavedIndicatorProps) {
  const { isLoading } = useUserPreferences(userId);

  if (!userId || isLoading) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm">
        <Check className="w-4 h-4" />
        <span>Preferencias cargadas</span>
      </div>
    </div>
  );
}

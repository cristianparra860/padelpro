// src/app/(app)/instructor/credits-manager/page.tsx
"use client";

import { useEffect, useState } from 'react';
import InstructorCreditsManager from '@/components/class/InstructorCreditsManager';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function InstructorCreditsManagerPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Debes iniciar sesión como instructor</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pl-16 md:pl-20 lg:pl-24">
      <InstructorCreditsManager instructorId={user.id} />
    </div>
  );
}

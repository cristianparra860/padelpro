// src/app/auth/login/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLoginPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Redirigir a la página principal de login con JWT
        console.log('⚠️ Redirigiendo desde /auth/login (mock) a / (JWT)');
        router.replace('/');
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4">Redirigiendo al login...</p>
            </div>
        </div>
    );
}


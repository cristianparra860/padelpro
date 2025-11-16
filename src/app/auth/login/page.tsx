// src/app/auth/login/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PadelRacketIcon } from '@/components/PadelRacketIcon';
import { getMockUserDatabase, setGlobalCurrentUser, performInitialization } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

export default function StudentLoginPage() {
    performInitialization(); // Ensure data is loaded
    const router = useRouter();
    const { toast } = useToast();
    
    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
        const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

        const studentUser = getMockUserDatabase().find(u => u.email === email);

        if (studentUser && studentUser.hashedPassword === `hashed_${password}`) {
            setGlobalCurrentUser(studentUser);
            toast({
                title: `¡Bienvenido, ${studentUser.name}!`,
                description: "Has iniciado sesión correctamente.",
            });
            router.push('/dashboard');
        } else {
            toast({
                title: "Error de Autenticación",
                description: "El correo electrónico o la contraseña son incorrectos.",
                variant: "destructive"
            });
        }
    };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center gap-2">
              <PadelRacketIcon className="h-8 w-8 text-primary" />
              <h1 className="font-headline text-3xl font-bold text-primary">
                PadelPro
              </h1>
            </div>
            <CardTitle className="font-headline text-2xl">
              Acceso Alumno
            </CardTitle>
            <CardDescription>
              Introduce tus datos para acceder a tu agenda.
            </CardDescription>
          </CardHeader>
           <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="student@example.com" defaultValue="alex@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" defaultValue="password123"/>
                </div>
                <div className="text-right text-sm">
                   <Link
                        href="#"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        ¿Has olvidado tu contraseña?
                    </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" type="submit">
                  Acceder
                </Button>
                 <div className="text-center text-sm text-muted-foreground">
                    ¿No tienes cuenta?{' '}
                    <Link
                        href="/register"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Regístrate
                    </Link>
                </div>
              </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}

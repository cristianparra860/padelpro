// src/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PadelRacketIcon } from '@/components/PadelRacketIcon';
import ProfessionalAccessDialog from '@/components/layout/ProfessionalAccessDialog';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isProfessionalAccessOpen, setIsProfessionalAccessOpen] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log('🔐 Iniciando login con:', email);
        
        if (!email || !password) {
            toast({
                title: "Error",
                description: "Por favor, completa todos los campos",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            console.log('📡 Enviando petición a /api/auth/login...');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('📥 Respuesta recibida:', response.status);
            
            const data = await response.json();
            console.log('📦 Datos:', data);

            if (!response.ok) {
                console.error('❌ Error en login:', data.error);
                toast({
                    title: "Error de autenticación",
                    description: data.error || "Email o contraseña incorrectos",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            // Guardar token en localStorage (opcional, ya está en cookie)
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                console.log('💾 Token guardado');
            }

            toast({
                title: "¡Bienvenido!",
                description: `Hola ${data.user.name}`,
            });

            console.log('✅ Login exitoso, redirigiendo...');
            console.log('👤 Usuario:', data.user.name, '| Role:', data.user.role);

            // Redirigir según el rol
            let redirectPath = '/dashboard';
            
            if (data.user.role === 'CLUB_ADMIN' || data.user.role === 'SUPER_ADMIN') {
                redirectPath = '/admin';
            } else if (data.user.role === 'INSTRUCTOR') {
                redirectPath = '/simple-instructor';
            }
            
            console.log('🔀 Redirigiendo a:', redirectPath);
            
            // Pequeño delay para que se vea el toast
            setTimeout(() => {
                router.push(redirectPath);
            }, 500);
            
        } catch (error) {
            console.error('💥 Error en login:', error);
            toast({
                title: "Error",
                description: "Error al conectar con el servidor. Verifica la consola para más detalles.",
                variant: "destructive"
            });
            setLoading(false);
        }
    };

  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-950 p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <Card className="shadow-2xl border-border/20 bg-card/80 backdrop-blur-sm text-card-foreground">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <div className="mx-auto mb-3 sm:mb-4 flex items-center justify-center gap-2">
              <PadelRacketIcon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-primary">
                PadelPro
              </h1>
            </div>
            <CardTitle className="font-headline text-xl sm:text-2xl">
              ¡Hola de Nuevo!
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Introduce tus datos para acceder a tu agenda.
            </CardDescription>
          </CardHeader>
           <form onSubmit={handleLogin}>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="tu-email@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="h-10 sm:h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm">Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-10 sm:h-11 text-base"
                  />
                </div>
                <div className="text-right text-xs sm:text-sm pt-1">
                   <Link
                        href="#"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        ¿Has olvidado tu contraseña?
                    </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:gap-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <Button 
                  className="w-full h-10 sm:h-11 text-base font-medium" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Accediendo...' : 'Acceder'}
                </Button>
                 <div className="text-center text-xs sm:text-sm text-muted-foreground">
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
        
        {/* Información de usuarios de prueba (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              👥 Usuarios de prueba disponibles:
            </p>
            <div className="space-y-1 text-blue-800 dark:text-blue-200">
              <p><strong>Jugador 1:</strong> jugador1@padelpro.com / Pass123!</p>
              <p><strong>Jugador 2:</strong> jugador2@padelpro.com / Pass123!</p>
              <p><strong>Instructor:</strong> instructor@padelpro.com / Pass123!</p>
              <p><strong>Admin:</strong> admin@padelpro.com / AdminPass123!</p>
            </div>
          </div>
        )}
        
        <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-2 sm:gap-3">
            <Button asChild className="w-full h-10 sm:h-11 text-base font-medium">
              <Link href="/activities?view=partidas">Ver la web</Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsProfessionalAccessOpen(true)} 
              className="bg-background/80 backdrop-blur-sm w-full h-10 sm:h-11 text-base font-medium"
            >
                Acceso Profesional
            </Button>
        </div>
      </div>
    </main>
    <ProfessionalAccessDialog isOpen={isProfessionalAccessOpen} onOpenChange={setIsProfessionalAccessOpen} />
    </>
  );
}

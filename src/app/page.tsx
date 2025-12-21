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
                redirectPath = '/instructor';
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
        
        {/* Acceso rápido - Auto-rellenador (solo en desarrollo) */}
        <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg shadow-sm">
          <p className="font-bold text-blue-900 dark:text-blue-100 mb-3 text-sm">
            ⚡ Auto-Rellenador de Login
          </p>
          
          {/* Super Admin */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">🟣 SUPER ADMINISTRADOR</p>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@padelpro.com');
                setPassword('Pass123!');
              }}
              className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 text-xs transition-colors"
            >
              <span className="font-medium text-purple-900 dark:text-purple-100">Super Admin</span>
              <br />
              <span className="text-purple-600 dark:text-purple-400">admin@padelpro.com</span>
            </button>
          </div>

          {/* Club Admins */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">🔴 ADMINISTRADORES DE CLUB</p>
            <button
              type="button"
              onClick={() => {
                setEmail('clubadmin@padelpro.com');
                setPassword('Pass123!');
              }}
              className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-xs transition-colors"
            >
              <span className="font-medium text-red-900 dark:text-red-100">Admin Club Madrid</span>
              <br />
              <span className="text-red-600 dark:text-red-400">clubadmin@padelpro.com</span>
            </button>
          </div>

          {/* Instructores */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">🟡 INSTRUCTORES</p>
            <div className="space-y-2">
              {[
                { name: 'Carlos Ruiz', email: 'instructor@padelpro.com', password: 'Pass123!' },
                { name: 'Ana Lopez', email: 'ana@padelclub.com', password: 'Pass123!' },
                { name: 'Carlos Martinez', email: 'carlos@padelclub.com', password: 'Pass123!' }
              ].map((user, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword(user.password);
                  }}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800 text-xs transition-colors"
                >
                  <span className="font-medium text-amber-900 dark:text-amber-100">{user.name}</span>
                  <br />
                  <span className="text-amber-600 dark:text-amber-400">{user.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Jugadores */}
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">🟢 JUGADORES</p>
            <div className="space-y-2">
              {[
                { name: 'Alex García', email: 'alex@example.com', password: 'Pass123!' },
                { name: 'Ana Nueva', email: 'ana.nueva@padelpro.com', password: 'Pass123!' }
              ].map((user, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword(user.password);
                  }}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-xs transition-colors"
                >
                  <span className="font-medium text-green-900 dark:text-green-100">{user.name}</span>
                  <br />
                  <span className="text-green-600 dark:text-green-400">{user.email}</span>
                </button>
              ))}
            </div>
          </div>
          
          <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-3 italic">
            💡 Haz clic en un usuario para rellenar automáticamente el formulario, luego presiona "Acceder"
          </p>
        </div>
        
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

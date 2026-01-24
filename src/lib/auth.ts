// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Clave secreta para JWT (en producción debe estar en variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 días

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  clubId: string;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('❌ Error verificando token:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Extrae el token del header Authorization o de las cookies
 */
export function extractToken(request: NextRequest): string | null {
  // Intentar obtener del header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Intentar obtener de las cookies
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Obtiene el usuario actual desde el token en la request
 */
export async function getCurrentUser(request: NextRequest) {
  const token = extractToken(request);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  // Verificar que el usuario todavía existe en la base de datos
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        Club: true
      }
    });

    if (!user) {
      return null;
    }

    // No incluir el password en el retorno
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return null;
  }
}

/**
 * Middleware para rutas protegidas - valida que existe un usuario autenticado
 */
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      error: 'Unauthorized',
      status: 401
    };
  }

  return { user };
}

/**
 * Middleware para verificar roles específicos
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const authResult = await requireAuth(request);

  if ('error' in authResult) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      error: 'Forbidden - Insufficient permissions',
      status: 403
    };
  }

  return { user: authResult.user };
}

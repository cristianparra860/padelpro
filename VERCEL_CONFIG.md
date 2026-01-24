# Configuración de Vercel - Pasos Manuales

## Variable de Entorno DATABASE_URL

Para que tu aplicación funcione en Vercel con Supabase, necesitas agregar la variable `DATABASE_URL` manualmente en el dashboard de Vercel.

### Pasos:

1. **Ir al Dashboard de Vercel**
   - Abre: https://vercel.com/dashboard
   - Busca tu proyecto: `padelpro-prod`

2. **Ir a Settings → Environment Variables**
   - Click en el proyecto
   - Click en "Settings" en el menú superior
   - Click en "Environment Variables" en el menú lateral

3. **Agregar DATABASE_URL**
   - Click en "Add New"
   - **Name**: `DATABASE_URL`
   - **Value**: 
     ```
     postgresql://postgres.zssourqimzraqcflifou:jFxmrx6i%3F6Ey%2BR%3F@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - **Environments**: Seleccionar **Production**, **Preview**, y **Development**
   - Click en "Save"

4. **Redeploy**
   - Ir a "Deployments"
   - Click en el último deployment
   - Click en "..." (tres puntos)
   - Click en "Redeploy"
   - Confirmar

### URL de Supabase Explicada

- **Puerto 6543**: Usa PgBouncer para mejor manejo de conexiones en producción
- **?pgbouncer=true**: Parámetro necesario para que Prisma funcione correctamente con PgBouncer

### Verificación

Después del redeploy, verifica:
- [ ] Login funciona
- [ ] Admin panel carga datos
- [ ] No hay errores de base de datos en los logs

---

**Nota**: Si prefieres usar conexión directa (sin PgBouncer), usa puerto **5432** y quita el parámetro `?pgbouncer=true`:
```
postgresql://postgres.zssourqimzraqcflifou:jFxmrx6i%3F6Ey%2BR%3F@aws-1-eu-central-2.pooler.supabase.com:5432/postgres
```

# Sistema de Generación Automática de Clases

## 📅 Funcionamiento

El sistema genera automáticamente propuestas de clases para mantener siempre un **calendario de 30 días** disponible para reservas.

### ⏰ Ejecución Diaria

- **Cuándo**: Todos los días a las **00:00 UTC** (medianoche)
- **Qué hace**: Genera todas las propuestas de clases para el **día 30** desde hoy
- **Ejemplo**: 
  - Hoy: 18 de noviembre de 2025
  - El cron genera: 18 de diciembre de 2025 (30 días adelante)

### 🔄 Ventana Móvil

```
Hoy (día 1)                                    Día 30
|----------------------------------------------|
    [Clases ya creadas]    [Nueva clase creada hoy]

Mañana (día 1)                                 Día 30
|----------------------------------------------|
        [Clases ya creadas]    [Nueva clase creada mañana]
```

Cada día, el sistema mueve la "ventana" un día adelante, generando nuevas clases para mantener siempre 30 días visibles.

## 🎯 Ventajas

1. **Sin mantenimiento manual**: El club no tiene que crear clases manualmente
2. **Calendario siempre lleno**: Siempre hay 30 días disponibles
3. **Eficiente**: Solo genera 1 día por ejecución (no regenera días existentes)
4. **Escalable**: Si el club crece, el sistema se adapta automáticamente

## 🛠️ Configuración

### Vercel Cron Job

Configurado en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-cards?targetDay=30",
      "schedule": "0 0 * * *",
      "description": "Genera automáticamente las clases del día 30 cada día a las 00:00 UTC"
    }
  ]
}
```

- **Schedule**: `0 0 * * *` (formato cron: minuto hora día mes día_semana)
  - `0 0` = A las 00:00
  - `* * *` = Todos los días, todos los meses, todos los días de la semana

### Endpoint API

**URL**: `/api/cron/generate-cards`

**Parámetros**:
- `targetDay` (opcional): Número de días hacia adelante (default: 30)

**Ejemplo**:
```bash
curl https://padelpro.vercel.app/api/cron/generate-cards?targetDay=30
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Cards generated successfully for 2025-12-18 (+30 days)",
  "created": 168,
  "skipped": 12,
  "targetDate": "2025-12-18",
  "daysAhead": 30
}
```

## 🔍 Verificación de Disponibilidad

Antes de crear cada propuesta, el sistema verifica:

1. **Pistas disponibles**: Al menos 1 pista libre en ese horario
2. **Instructores disponibles**: Al menos 1 instructor libre
3. **No duplicados**: No existe ya una propuesta idéntica
4. **No conflictos**: El instructor no tiene clase confirmada en ese horario

## 📊 Horarios Generados

- **Rango**: 08:00 - 22:00
- **Intervalo**: Cada 30 minutos
- **Duración**: 60 minutos cada clase
- **Total por día**: ~28 slots × número de instructores

Ejemplo de horarios:
- 08:00 - 09:00
- 08:30 - 09:30
- 09:00 - 10:00
- 09:30 - 10:30
- ...
- 21:00 - 22:00
- 21:30 - 22:30

## 🎓 Configuración de Clases

Todas las propuestas se crean con:
- **Nivel**: ABIERTO
- **Categoría**: ABIERTO
- **Jugadores**: 4 máximo
- **Precio**: Instructor (€15) + Pista (según franja horaria)

## 🧪 Pruebas

### Prueba Manual

Ejecutar el generador manualmente:

```bash
node test-cron-day30.js
```

### Generar Día Específico

Cambiar el parámetro `targetDay`:

```bash
# Generar día 7
curl http://localhost:9002/api/cron/generate-cards?targetDay=7

# Generar día 60 (2 meses)
curl http://localhost:9002/api/cron/generate-cards?targetDay=60
```

## 🚨 Solución de Problemas

### El cron no se ejecuta

1. Verificar que el proyecto está desplegado en Vercel
2. Revisar logs en Vercel Dashboard > Cron Jobs
3. Verificar que la función no excede los límites de tiempo (30s en plan gratuito)

### Se crean duplicados

El sistema verifica antes de crear, pero si hay problemas:
1. Revisar tabla `TimeSlot` en la base de datos
2. Ejecutar script de limpieza de duplicados

### No se generan clases

Posibles causas:
1. No hay instructores activos (`isActive = 1`)
2. Todas las pistas están ocupadas en todos los horarios
3. Ya existen propuestas para ese día

## 📈 Monitoreo

Revisar periódicamente:
- Número de propuestas creadas diariamente (esperado: ~168 por día con 6 instructores)
- Clases confirmadas vs propuestas
- Errores en logs de Vercel

## 🔧 Mantenimiento

### Cambiar ventana de días

Editar `vercel.json`:

```json
{
  "path": "/api/cron/generate-cards?targetDay=45", // 45 días en vez de 30
  "schedule": "0 0 * * *"
}
```

### Cambiar horario de ejecución

```json
{
  "schedule": "0 2 * * *" // A las 02:00 en vez de 00:00
}
```

### Deshabilitar generación automática

Comentar o eliminar la sección `crons` en `vercel.json`.

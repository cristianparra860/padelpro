# Sistema de Reservas de Pista para Instructores

## 📋 Descripción General

Nueva funcionalidad que permite a los instructores reservar pistas directamente desde su panel, en el calendario del club. Pueden crear bloques de tiempo personalizados con etiquetas descriptivas para organizar sus clases especiales, entrenamientos, etc.

## 🎯 Características Principales

### 1. Reserva Desde el Calendario
- **Acceso**: Panel del Instructor → Pestaña "Calendario del Club"
- **Interacción**: Click en cualquier celda vacía del calendario
- **Disponibilidad**: Solo en horarios futuros (pasados están bloqueados)

### 2. Opciones de Duración
Los instructores pueden seleccionar entre 4 duraciones:
- **30 minutos**: Clases cortas o entrenamientos específicos
- **60 minutos**: Clases estándar
- **90 minutos**: Clases extendidas
- **120 minutos**: Sesiones especiales o torneos

### 3. Etiquetas Personalizables
Cada reserva puede tener una etiqueta descriptiva:
- Ejemplos: "Clase Junior", "Clase Senior", "Entrenamiento Personal", "Torneo Interno"
- Máximo 50 caracteres
- Editable en cualquier momento

### 4. Gestión Completa
- **Crear**: Click en celda vacía
- **Editar**: Click en reserva existente
- **Eliminar**: Botón "Eliminar" en el dialog de edición

## 🏗️ Arquitectura Técnica

### Componentes Creados

#### 1. `InstructorCourtReservationDialog.tsx`
```typescript
// Ubicación: src/components/instructor/InstructorCourtReservationDialog.tsx

Props:
- open: boolean
- onOpenChange: (open: boolean) => void
- instructorId: string
- courtId: string
- courtNumber: number
- timeSlot: string
- date: Date
- existingReservation?: { id, duration, label }
- onSuccess: () => void
```

**Características**:
- Selector de duración con botones grandes
- Input de etiqueta con placeholder descriptivo
- Cálculo automático de hora de fin
- Validaciones en tiempo real
- Confirmación antes de eliminar

#### 2. API Endpoint: `/api/instructor/court-reservations`
```typescript
// Ubicación: src/app/api/instructor/court-reservations/route.ts

Métodos:
- POST: Crear nueva reserva
- PUT: Actualizar reserva existente
- DELETE: Eliminar reserva
- GET: Obtener reservas del instructor
```

**Validaciones implementadas**:
- ✅ Verificar que el usuario sea el instructor
- ✅ Validar disponibilidad de la pista
- ✅ Verificar disponibilidad del instructor
- ✅ Prevenir solapamientos de horarios
- ✅ Validar campos requeridos

### Modificaciones en Componentes Existentes

#### `ClubCalendarImproved.tsx`
**Cambios**:
1. **Estado nuevo**:
   ```typescript
   const [instructorReservations, setInstructorReservations] = useState<any[]>([]);
   const [showReservationDialog, setShowReservationDialog] = useState(false);
   const [selectedReservationSlot, setSelectedReservationSlot] = useState<...>(null);
   ```

2. **Carga de reservas**:
   - Llamada a API cuando `instructorId` está presente
   - Recarga automática después de crear/editar/eliminar

3. **Renderizado de celdas**:
   - Reservas del instructor se muestran en naranja/ámbar
   - Celdas vacías son clickeables (borde punteado naranja)
   - Hover effect en celdas disponibles
   - Texto "+ Reservar" en celdas vacías

4. **Funciones helper**:
   ```typescript
   getInstructorReservationInSlot()
   isInstructorReservationStart()
   calculateInstructorReservationRowSpan()
   handleReservationClick()
   handleReservationSuccess()
   ```

## 💾 Base de Datos

### Tablas Utilizadas

#### `CourtSchedule`
Almacena las reservas de pista:
```sql
reason: 'instructor_reservation:{instructorId}:{label}'
```

**Ejemplo**:
```
reason: 'instructor_reservation:cmjn2528h0001tgysr5c6j7pd:Clase Junior'
```

#### `InstructorSchedule`
Bloquea el horario del instructor:
```sql
reason: 'court_reservation:{courtScheduleId}:{label}'
```

**Ejemplo**:
```
reason: 'court_reservation:clx123abc456:Clase Junior'
```

### Formato de Reason
El campo `reason` usa formato especial para:
1. Identificar tipo de reserva
2. Asociar instructor
3. Almacenar etiqueta personalizada

**Parseo**:
```javascript
const [type, instructorId, label] = reason.split(':');
// type: 'instructor_reservation'
// instructorId: 'cmjn2528h...'
// label: 'Clase Junior'
```

## 🎨 Diseño Visual

### Colores
- **Reservas del instructor**: Gradiente naranja/ámbar (`from-orange-500 to-amber-500`)
- **Borde**: Naranja (`border-orange-400`)
- **Celdas vacías clickeables**: Borde punteado naranja (`border-dashed border-orange-300`)
- **Hover**: Fondo naranja claro (`hover:bg-orange-50`)

### Iconos
- 📅 Reservado
- + Reservar (en celdas vacías)

### Layout de Reserva
```
┌─────────────────────────┐
│   📅 RESERVADO         │
│                         │
│     10:00              │
│                         │
│  ┌─────────────────┐   │
│  │ Clase Junior    │   │
│  └─────────────────┘   │
│                         │
│     90 min             │
└─────────────────────────┘
```

## 🔒 Seguridad

### Autenticación
- JWT requerido en todas las peticiones
- Validación de token en cada endpoint

### Autorización
- Solo el instructor dueño puede crear/editar/eliminar sus reservas
- Verificación de `userId` contra `instructor.userId`

### Validaciones
1. **Disponibilidad de pista**: No permite solapamientos
2. **Disponibilidad de instructor**: No permite doble reserva
3. **Campos requeridos**: instructorId, courtId, startTime, duration, label
4. **Formato de fecha**: Validación de timestamps
5. **Permisos**: Solo instructor autenticado

## 📊 Flujo de Uso

### Crear Reserva
```
1. Instructor accede a su panel
2. Va a pestaña "Calendario del Club"
3. Ve su calendario filtrado (solo sus clases)
4. Click en celda vacía (horario futuro)
5. Se abre dialog con opciones
6. Selecciona duración (30/60/90/120 min)
7. Escribe etiqueta descriptiva
8. Click "Reservar"
9. Sistema valida disponibilidad
10. Crea registros en BD
11. Actualiza calendario inmediatamente
```

### Editar Reserva
```
1. Click en reserva existente
2. Dialog se abre con datos actuales
3. Modifica duración y/o etiqueta
4. Click "Actualizar"
5. Sistema valida nueva configuración
6. Actualiza registros en BD
7. Refresca calendario
```

### Eliminar Reserva
```
1. Click en reserva existente
2. Click botón "Eliminar"
3. Confirma en popup
4. Elimina registros de BD
5. Refresca calendario
```

## 🧪 Testing

### Script de Prueba
```bash
node test-instructor-reservations.js
```

**Pruebas incluidas**:
1. ✅ Crear reserva
2. ✅ Recuperar reservas
3. ✅ Actualizar reserva
4. ✅ Detectar conflictos
5. ✅ Eliminar reserva
6. ✅ Parsear etiquetas
7. ✅ Calcular duraciones

### Casos de Prueba Manual
1. **Reserva exitosa**: Crear reserva en horario libre
2. **Conflicto de pista**: Intentar reservar pista ocupada
3. **Conflicto de instructor**: Instructor con otra clase
4. **Edición**: Cambiar duración y etiqueta
5. **Eliminación**: Borrar reserva existente
6. **Horario pasado**: Intentar reservar en el pasado (debe estar bloqueado)
7. **Carga de página**: Verificar que reservas persisten después de recargar

## 🚀 Próximas Mejoras (Futuro)

### Posibles Extensiones
1. **Notificaciones**: Alertar cuando se acerca una reserva
2. **Colores personalizados**: Permitir elegir color por tipo de clase
3. **Recurrencia**: Crear reservas repetitivas (ej: todos los lunes)
4. **Reportes**: Estadísticas de uso de pistas por instructor
5. **Compartir**: Permitir compartir disponibilidad con otros instructores
6. **Plantillas**: Guardar configuraciones frecuentes

### Optimizaciones Técnicas
1. **Caché**: Cachear reservas del día actual
2. **Websockets**: Actualización en tiempo real
3. **Bulk operations**: Crear múltiples reservas a la vez
4. **Exportar**: Descargar calendario en PDF/ICS

## 📝 Notas de Implementación

### Decisiones de Diseño
1. **Usar CourtSchedule**: Reutilizamos tabla existente con formato especial en `reason`
2. **Dual-write**: Crear en CourtSchedule E InstructorSchedule para doble validación
3. **Formato reason**: Permite parsear fácilmente y mantener compatibilidad
4. **Solo en modo instructor**: La funcionalidad solo está activa cuando `instructorId` está presente

### Limitaciones Actuales
1. No permite reservas recurrentes
2. No hay límite de reservas por instructor
3. No hay sistema de aprobación (es inmediato)
4. No se pueden reservar múltiples pistas a la vez

### Compatibilidad
- ✅ Compatible con sistema de clases existente
- ✅ Compatible con sistema de partidas
- ✅ No afecta calendario de admin
- ✅ No afecta calendario de usuarios
- ✅ Respeta bloqueos existentes

## 🆘 Troubleshooting

### Problema: No aparece "+ Reservar"
**Solución**: Verificar que `instructorId` se está pasando correctamente a `ClubCalendarImproved`

### Problema: Error al crear reserva
**Causas posibles**:
1. Pista ya ocupada → Verificar `CourtSchedule`
2. Instructor ocupado → Verificar `InstructorSchedule`
3. Token inválido → Verificar autenticación
4. Campos faltantes → Verificar payload

### Problema: Reserva no aparece después de crear
**Solución**: Verificar que `handleReservationSuccess()` está recargando correctamente

### Problema: No se puede editar
**Solución**: Verificar permisos del instructor y formato del `reason` en BD

## 📚 Referencias

### Archivos Clave
- `src/components/instructor/InstructorCourtReservationDialog.tsx`
- `src/app/api/instructor/court-reservations/route.ts`
- `src/components/admin/ClubCalendarImproved.tsx`
- `src/app/(app)/instructor/components/InstructorPanel.tsx`
- `prisma/schema.prisma` (CourtSchedule, InstructorSchedule)

### Documentación Relacionada
- `docs/blueprint.md`: Diseño original del sistema
- `IMPLEMENTATION-SUMMARY.md`: Resumen de implementaciones
- `.github/copilot-instructions.md`: Instrucciones para desarrollo

---

**Versión**: 1.0  
**Fecha**: Enero 2026  
**Autor**: Sistema de Desarrollo PadelPro

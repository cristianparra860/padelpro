# 📅 Calendario del Club - Documentación Completa

## Descripción General

El **Calendario del Club** es una vista unificada que muestra todas las actividades del club: clases, partidos, reservas, horarios de instructores y disponibilidad de pistas para los próximos 30 días.

## 🎯 Características

### 1. **Vistas Múltiples**
- **Vista Mensual**: Vista general del mes completo
- **Vista Semanal**: Detalle de 7 días con timeline horaria (08:00 - 22:00)
- **Vista Diaria**: Enfoque en un solo día con todos los eventos

### 2. **Tipos de Eventos**

| Color | Tipo | Descripción |
|-------|------|-------------|
| 🟠 Naranja | Clase Propuesta | Clases disponibles sin pista asignada |
| 🟢 Verde | Clase Confirmada | Clases con pista asignada y jugadores inscritos |
| 🔵 Azul | Partido | Reservas de pistas para partidos |
| 🔴 Rojo | Bloqueado | Horarios no disponibles (instructores/pistas) |

### 3. **Filtros Avanzados**

#### Filtro por Tipo
- **Todos los eventos**: Muestra todo
- **Clases**: Solo clases (propuestas y confirmadas)
- **Partidos**: Solo reservas de pistas para partidos
- **Instructores**: Eventos relacionados con instructores
- **Pistas**: Eventos relacionados con pistas

#### Filtro por Recurso
- Seleccionar instructor específico
- Seleccionar pista específica
- Ver horarios y disponibilidad individual

### 4. **Información Detallada**

Al hacer clic en cualquier evento, se muestra:
- 📅 Fecha y hora exacta
- 👨‍🏫 Instructor asignado (con foto)
- 🎾 Pista asignada
- 👥 Número de jugadores (para clases)
- 🏆 Nivel y categoría
- 💰 Precio
- 📝 Estado y motivo (para bloqueados)

### 5. **Acciones Disponibles**
- **Editar**: Modificar detalles de clases y eventos
- **Cancelar**: Cancelar clases, partidos o bloqueoss
- **Ver detalles**: Información completa del evento

## 📂 Estructura de Archivos

```
src/
├── app/
│   ├── admin/
│   │   └── calendar/
│   │       └── page.tsx              # Página principal del calendario
│   └── api/
│       └── admin/
│           └── calendar/
│               └── route.ts          # API para obtener datos del calendario
└── components/
    └── admin/
        ├── ClubCalendar.tsx          # Componente principal del calendario
        └── CalendarEventDetails.tsx  # Diálogo de detalles de eventos
```

## 🔌 API Endpoints

### GET /api/admin/calendar

Obtiene todos los datos del calendario para un rango de fechas.

**Query Parameters:**
- `clubId` (opcional): ID del club
- `startDate` (opcional): Fecha de inicio (ISO 8601, default: hoy)
- `endDate` (opcional): Fecha de fin (ISO 8601, default: +30 días)

**Respuesta:**
```typescript
{
  courts: Array<{
    id: string;
    number: number;
    name: string;
    clubName: string;
  }>;
  
  instructors: Array<{
    id: string;
    name: string;
    email: string;
    photo: string | null;
    hourlyRate: number;
    specialties: string;
  }>;
  
  events: Array<{
    id: string;
    type: 'class-proposal' | 'class-confirmed' | 'match' | 'instructor-blocked' | 'court-blocked';
    title: string;
    start: string;  // ISO 8601
    end: string;    // ISO 8601
    color: string;  // Hex color
    // Campos opcionales según el tipo:
    instructorId?: string;
    instructorName?: string;
    instructorPhoto?: string;
    courtId?: string;
    courtNumber?: number;
    playersCount?: number;
    maxPlayers?: number;
    level?: string;
    category?: string;
    price?: number;
    status?: string;
    reason?: string;
  }>;
  
  summary: {
    totalCourts: number;
    totalInstructors: number;
    totalClasses: number;
    confirmedClasses: number;
    proposedClasses: number;
    totalMatches: number;
    totalBookings: number;
  };
}
```

## 🗄️ Fuentes de Datos

El calendario obtiene información de:

1. **Court**: Pistas del club
2. **Instructor**: Instructores activos
3. **TimeSlot**: Clases programadas
4. **Booking**: Inscripciones a clases
5. **Match**: Partidos programados
6. **InstructorSchedule**: Horarios bloqueados de instructores
7. **CourtSchedule**: Horarios bloqueados de pistas

## 🎨 Componentes

### ClubCalendar
Componente principal que renderiza el calendario completo.

**Props:**
```typescript
{
  clubId: string;  // ID del club a mostrar
}
```

**Estados:**
- `view`: 'month' | 'week' | 'day'
- `filterType`: 'all' | 'classes' | 'matches' | 'instructors' | 'courts'
- `selectedResource`: string (formato: 'instructor-{id}' o 'court-{number}')
- `currentDate`: Date
- `calendarData`: CalendarData | null
- `selectedEvent`: CalendarEvent | null
- `showEventDetails`: boolean

### CalendarEventDetails
Diálogo modal para mostrar detalles completos de un evento.

**Props:**
```typescript
{
  event: CalendarEvent;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onCancel?: (event: CalendarEvent) => void;
}
```

## 🚀 Uso

### Acceder al Calendario

1. **Desde la navegación del admin:**
   - Click en "Calendario Club" en el sidebar

2. **URL directa:**
   ```
   http://localhost:9002/admin/calendar
   ```

### Navegación

- **Botones de navegación**: Anterior / Hoy / Siguiente
- **Cambiar vista**: Día / Semana / Mes
- **Aplicar filtros**: Desplegables en el header
- **Ver detalles**: Click en cualquier evento

### Interpretación de Colores

- 🟠 **Naranja**: Clase aún sin confirmar, disponible para inscripción
- 🟢 **Verde**: Clase confirmada con pista asignada
- 🔵 **Azul**: Partido o reserva de pista
- 🔴 **Rojo**: Horario no disponible

## 📊 Estadísticas Rápidas

En la parte superior se muestran:
- **Clases Propuestas**: Total de clases sin pista asignada
- **Clases Confirmadas**: Total de clases con pista asignada
- **Partidos**: Total de reservas de pistas
- **Pistas Activas**: Número de pistas disponibles en el club

## 🔮 Futuras Mejoras

1. **Drag & Drop**: Mover eventos arrastrándolos
2. **Crear Eventos**: Botón para agregar nuevo evento directamente desde el calendario
3. **Exportar**: Exportar calendario a ICS, PDF, Excel
4. **Notificaciones**: Alertas de conflictos de horarios
5. **Vista por Recurso**: Vista tipo Gantt por instructor o pista
6. **Recurrencia**: Eventos recurrentes semanales/mensuales
7. **Colores personalizados**: Por instructor, tipo de clase, etc.
8. **Sincronización**: Sync con Google Calendar, Outlook
9. **Impresión**: Vista optimizada para imprimir
10. **Multi-club**: Selector de club para adminisradores de múltiples clubes

## 🐛 Troubleshooting

### El calendario no carga datos
1. Verificar que el servidor esté corriendo: `npm run dev`
2. Verificar en la consola del navegador si hay errores de red
3. Verificar que hay datos en la base de datos: `node test-calendar-data.js`

### Los eventos no se muestran en el horario correcto
- Verificar la zona horaria de la base de datos
- Verificar que las fechas están en formato ISO 8601

### Los filtros no funcionan
- Verificar que los IDs de recursos son correctos
- Recargar la página (Ctrl+Shift+R)

## 💡 Tips de Uso

1. **Vista Semanal es la más útil** para gestión diaria
2. **Usa filtros** para enfocarte en un instructor o pista específica
3. **Vista Mensual** es ideal para planificación a largo plazo
4. **Click en eventos** para ver detalles completos sin saturar la vista

## 🎯 Casos de Uso Principales

### 1. Revisar Disponibilidad de Instructores
```
1. Seleccionar filtro "Instructores"
2. Elegir instructor específico en el desplegable
3. Ver todos sus horarios ocupados en rojo
4. Identificar espacios libres para asignar nuevas clases
```

### 2. Verificar Ocupación de Pistas
```
1. Seleccionar filtro "Pistas"
2. Elegir pista específica
3. Ver todas las reservas (clases verde, partidos azul)
4. Identificar huecos disponibles
```

### 3. Gestionar Clases del Día
```
1. Cambiar a vista "Día"
2. Ver todas las clases propuestas (naranja)
3. Ver clases confirmadas (verde)
4. Click para ver detalles y gestionar inscripciones
```

### 4. Planificar Próxima Semana
```
1. Vista "Semana"
2. Navegar a próxima semana
3. Ver distribución de clases e instructores
4. Identificar necesidades de más clases
```

---

**Creado**: Octubre 2025  
**Versión**: 1.0.0  
**Mantenedor**: PadelPro Development Team

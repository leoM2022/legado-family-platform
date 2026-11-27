
# Legado — Guía para Codex

## 1. Contexto

Legado es una plataforma privada para una familia,
con perfiles, comunidad, fotografías, cumpleaños,
nominaciones, votaciones y premiaciones anuales.

Stack:
- Next.js 16 con App Router.
- React 19.
- TypeScript.
- Supabase PostgreSQL, Auth y Storage.
- Tailwind CSS.

La rama de integración es `develop`.
Usar ramas feature y Pull Requests.

## 2. Objetivo del rediseño

Crear una experiencia visual premium de gala familiar.

Estética:
- Negro profundo: #09090c.
- Dorado principal: #d4af37.
- Dorado suave: #e6c785.
- Marfil: #f7f3e8.
- Luces teatrales, profundidad y elegancia.
- Tipografía expresiva para títulos.
- Componentes accesibles y responsivos.

Evitar:
- Formularios gigantes.
- Menús que ocupen múltiples filas innecesarias.
- Animaciones excesivas.
- Interfaces genéricas.
- Exposición accidental de datos privados.

## 3. Ceremonia presencial

La familia se reúne físicamente en una casa.

Existe un solo presentador, que controla la gala
desde su computadora.

NO es una ceremonia que cada familiar deba seguir
desde su teléfono.

Dos interfaces:

### /admin/ceremonia
Consola privada del presentador.

Debe incluir:
- Lista de ternas.
- Estado actual de la gala.
- Controles grandes y claramente diferenciados.
- Presentar terna.
- Abrir sobre / revelar ganador.
- Reproducir video.
- Pausar por emergencia.
- Reanudar.
- Finalizar.
- Indicador de conexión.

### /ceremonia
Pantalla teatral para televisor o proyector.

Debe incluir:
- Pantalla inicial.
- Animación de nominados.
- Revelación del ganador.
- Celebración visual.
- Reproducción de video.
- Pantalla de pausa.
- Pantalla final.
- Modo ensayo.

No debe mostrar controles administrativos ni
resultados todavía ocultos.

## 4. Presentador con IA

La primera versión utilizará guiones preparados.

El presentador humano controla siempre el ritmo.

La IA podrá colaborar después con:
- Redacción de introducciones.
- Anuncios de nominados.
- Narraciones de ganadores.
- Humor familiar previamente aprobado.
- Generación de audio antes del evento.

No incorporar una IA que anuncie ganadores
por su cuenta.

No poner claves de servicios de IA en
componentes cliente.

El audio deberá tener:
- Controles manuales.
- Alternativa cuando falle la reproducción.
- Manejo de bloqueo de autoplay.
- Posibilidad de usar archivos preparados.

## 5. Reglas críticas de seguridad

NO modificar sin revisión:
- SQL de Supabase.
- Políticas RLS.
- Funciones SECURITY DEFINER.
- Reglas de autorización.
- Restricción de un voto por terna.
- Recuento de votos.
- Desempates.
- Lógica de revelación.
- Buckets privados y permisos.

NO consultar directamente desde el cliente
las tablas privadas de resultados o votos.

Usar las RPC y Server Actions existentes.

Nunca revelar un ganador antes de que
el backend lo autorice.

Los usuarios pendientes no pueden acceder
al contenido familiar.

Nunca utilizar una service_role key en el navegador.

## 6. Páginas existentes

- / — Inicio.
- /premios — Catálogo de demostración.
- /mi-espacio — Espacio privado.
- /familia — Directorio.
- /cumpleanos — Cumpleaños.
- /comunidad — Publicaciones familiares.
- /votar — Votaciones privadas.
- /ganadores — Historial de premiaciones.
- /admin/premios — Gestión de ternas.
- /admin/votaciones — Control de votaciones.
- /admin/ceremonia — Consola de gala.
- /ceremonia — Escenario.

Importante: las ternas públicas de demostración
no son las ternas familiares privadas.

## 7. Prioridades del frontend

1. Diseñar un Navbar compacto y adaptable.
2. Unificar la experiencia visual de Legado.
3. Rediseñar la comunidad y sus publicaciones.
4. Mejorar perfiles y páginas familiares.
5. Rediseñar nominaciones y votaciones.
6. Crear consola profesional del presentador.
7. Crear escenario de gala cinematográfico.
8. Integrar videos y narración preparada.
9. Optimizar accesibilidad y rendimiento.

## 8. Forma de trabajar

Antes de cambiar código:
- Leer los archivos existentes.
- Respetar las rutas y contratos de datos.
- Presentar un plan de los cambios.
- No reemplazar lógica funcional por mocks.
- Evitar agregar dependencias innecesarias.

Después de cambiar código:
- Ejecutar npm run lint.
- Ejecutar npx tsc --noEmit.
- Ejecutar npm run build.
- Comprobar el control de acceso.
- Verificar que no se filtren ganadores.
- Probar la consola y el escenario.
- Probar en escritorio y celular.
- Informar qué se modificó.

La estética debe mejorar la aplicación
sin comprometer las funcionalidades existentes.

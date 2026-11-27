# Legado

Legado es una plataforma privada para compartir historias, fotografías y cumpleaños familiares, y celebrar una premiación propia. Las cuentas aprobadas entran a **Nuestra familia** desde la portada. Los visitantes ven una presentación pública, acceso a la cuenta y una muestra de los premios.

El proyecto usa Next.js 16, React, TypeScript, Tailwind CSS y Supabase.

## Desarrollo local

Instalá las dependencias y configurá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`.

```bash
npm ci
npm run dev
```

Abrí [Legado en tu navegador](http://localhost:3000). Si querés mostrar una cuenta regresiva para la próxima gala, configurá la variable opcional `GOYA_CEREMONY_DATE` con una fecha ISO 8601 que incluya hora y zona horaria.

## Verificación

```bash
npm run lint
npx tsc --noEmit
npm run build
```

El nombre público **Legado** es independiente de los títulos de las ediciones ya guardadas y del nombre del repositorio. La sección pública de premios incluye contenido de demostración.

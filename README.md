# minimum · Club de postres

Programa de fidelización con QR para minimum. Cada postre lleva un QR único: el cliente lo escanea, escribe su celular y suma un sello. Con 5 compras, el sexto postre es gratis. El cupón se envía por WhatsApp y la dueña lo gestiona desde un panel.

## Tecnología

- React 18 + Vite
- Supabase (PostgreSQL, autenticación y funciones seguras)
- `qrcode` para generar las hojas de stickers
- Despliegue sugerido: Vercel

## Estructura

```
src/
  pages/
    Inicio.jsx            Página para quien entra sin QR
    Canje.jsx             Página del QR: celular → confirmar/registrar → sellos o premio
    admin/
      Admin.jsx           Inicio de sesión y menú del panel
      Resumen.jsx         Cifras y postres por día
      Clientes.jsx        Lista, detalle, editar datos y anular compras
      Premios.jsx         Cupones por entregar y entregados
      Codigos.jsx         Crear lotes de QR
      ImprimirLote.jsx    Hoja de 20 stickers por página (carta)
      Ajustes.jsx         Meta de compras y revisar/habilitar un QR
  components/             Fondo, marca, hero, pie, botón de Instagram, confeti
  lib/                    Cliente de Supabase, configuración y utilidades
  styles/                 Estilos del cliente, del panel y de impresión
supabase/esquema.sql      Tablas, seguridad y funciones
```

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor → New query**, pega todo `supabase/esquema.sql` y dale **Run**.
3. Ve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**. Así nadie más puede crear cuentas.
4. Ve a **Authentication → Users → Add user** y crea el usuario de la dueña con su correo y una contraseña.
5. Vuelve al SQL Editor y ejecuta (con el correo real):

   ```sql
   insert into public.administradores (user_id)
   select id from auth.users where email = 'correo-de-ella@ejemplo.com';
   ```

### 2. Configurar el proyecto local

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
```

Llena `.env` con los datos de **Project Settings → API** de Supabase:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_WSP_USUARIO=tina.s_11
VITE_IG_USUARIO=minimum.v
VITE_SITE_URL=            # se llena cuando tengas el dominio final
```

```bash
npm run dev
```

- Página del cliente: `http://localhost:5173/`
- Panel: `http://localhost:5173/admin`

### 3. Publicar en Vercel

1. Sube la carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project**, elige el repositorio. Vercel detecta Vite solo.
3. En **Environment Variables** pon las mismas variables del `.env`, con `VITE_SITE_URL` igual al dominio final (por ejemplo `https://minimum.vercel.app`).
4. Deploy. El archivo `vercel.json` ya hace que las rutas `/q/...` y `/admin` funcionen.

> Importante: genera e imprime los QR **después** de tener el dominio final. Cada QR guarda la dirección completa (`https://tu-dominio/q/CODIGO`); si cambias de dominio, los stickers ya impresos dejarían de funcionar.

## Cómo se usa

1. En el panel, **Códigos QR → Crear lote** (por ejemplo 100 códigos, "Noviembre 2026").
2. **Imprimir** abre la hoja de stickers lista (20 por hoja carta). Imprime en papel adhesivo y pega uno debajo de cada postre.
3. El cliente escanea, escribe su celular y suma el sello. El código queda usado y no sirve otra vez.
4. Al completar la tarjeta, el cliente ve su cupón y lo envía por WhatsApp a @tina.s_11.
5. Cuando lo reclame, en **Premios** se busca el código y se marca **Entregado**.

## Seguridad

- El público no puede leer ninguna tabla. Solo usa tres funciones: revisar un código, buscar su celular (únicamente con un QR válido sin usar) y canjear.
- El canje bloquea la fila del QR, así que dos personas no pueden usar el mismo código a la vez.
- Los códigos son aleatorios de 8 caracteres (más de un billón de combinaciones), sin letras confusas como O/0 o I/1.
- Solo las cuentas registradas en `administradores` ven el panel.

## Pendientes y notas

- El botón de WhatsApp usa el usuario `@tina.s_11`. Los usuarios de WhatsApp son nuevos: pruébalo desde varios celulares antes de imprimir. Si falla en alguno, cambia `enlaceWhatsApp` en `src/lib/config.js` para usar `https://wa.me/57NUMERO?text=...`.
- La meta (5 compras) se cambia en **Ajustes** sin tocar código.
# minimun

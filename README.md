# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Despliegue en Plesk (recomendado: estático + PHP)

Este proyecto usa Nuxt en frontend y un endpoint `mail.php` para el envío de emails. En Plesk es más simple desplegar el frontend como **estático** y dejar `mail.php` como script PHP.

### 1) Build estático

```bash
npm install
npm run generate
```

El build estático se genera en:

```
.output/public
```

### 2) Subir archivos a Plesk

En tu dominio en Plesk:

1. Abre **Files** → carpeta **httpdocs**.
2. Sube el contenido de `.output/public` **dentro** de `httpdocs`.
3. Copia también `mail.php` a `httpdocs/mail.php`.

### 3) Configurar el destinatario

`mail.php` usa la variable de entorno `MAIL_TO` para el destinatario.

En Plesk:
1. **Domains** → tu dominio → **PHP Settings**.
2. Añade una variable de entorno:

```
MAIL_TO=tu-email@dominio.com
```

### 4) Email saliente

El script usa `mail()` de PHP, así que el servidor debe tener **MTA configurado** (Postfix/Sendmail) o el hosting debe permitir envío.

Si tu hosting requiere SMTP autenticado, dímelo y cambiamos `mail.php` para usar SMTP.

### 5) Probar

Abre la web, usa el botón **Enviar** y comprueba que llega el email.

---

## Alternativa: Node SSR en Plesk

Si quieres servir con Node (SSR), necesitas Plesk con soporte de Node.js:

1. Subir el proyecto completo al servidor.
2. En **Node.js** del dominio, configurar:
   - Application root: carpeta del proyecto
   - Startup file: `.output/server/index.mjs`
3. Ejecutar:

```bash
npm install
npm run build
```

4. Configurar el proxy de Plesk para apuntar al puerto de Node.

En este modo, `mail.php` seguiría necesitando PHP si lo quieres usar igual, o se puede mover a un endpoint API en Nuxt.

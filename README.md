## Condiciones de imágenes de configuración

Estas son las reglas actuales para seleccionar la imagen en `app/components/ConfigurationImage.vue`:

- `AE 2m.webp` (default)
- `Curva naranja.webp`:
  - `type_of_line === "Línea curva"` AND `work_environment === "Interior"`
- `Curva gris.webp`:
  - `type_of_line === "Línea curva"` AND `work_environment === "Exterior"`
- `recta-interior-extremo.webp`:
  - `type_of_line === "Línea recta"` AND `feeding_point_position === "extreme"` AND `work_environment === "Interior"`
- `AI 2m.webp`:
  - `type_of_line === "Línea recta"` AND `feeding_point_position === "central"` AND `work_environment === "Interior"` AND (`environmental_condition === "humidity"` OR `environmental_condition === "normal"`)
- `AE-E 1,333m.webp`:
  - `type_of_line === "Línea recta"` AND `work_environment === "Exterior"` AND `feeding_point_position === "central"` AND `environmental_condition === "normal"`
  - O bien (fallback): cualquiera de estas condiciones activa AE‑E:
    - `work_environment === "Exterior"`
    - `feeding_point_position === "extreme"`
    - `feeding_point_position === "distance"`
    - `environmental_condition === "humidity"` AND `feeding_point_position === "extreme"`
    - `min_temperature === -20` AND `max_temperature === 60` AND `feeding_point_position === "extreme"`
- `AI-E 1,333m.webp`:
  - `work_environment === "Interior"` AND `feeding_point_position === "distance"` AND `environmental_condition === "normal"`
  - O bien (fallback): cualquiera de estas condiciones activa AI‑E:
    - `environmental_condition === "humidity"` AND `feeding_point_position === "central"`
    - `min_temperature === -20` AND `max_temperature === 60` AND `feeding_point_position === "central"`

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

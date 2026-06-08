#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Verificar dependencias
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm no está instalado"
  exit 1
fi

# 1. Limpiar TODO
echo "🧹 Limpiando caché y builds anteriores..."
rm -rf .nuxt .output node_modules/.cache deploy

# Build id para cache busting de assets públicos y HTML
BUILD_ID="$(date '+%Y%m%d%H%M%S')-$(git rev-parse --short HEAD 2>/dev/null || echo no-git)"
export NUXT_PUBLIC_BUILD_ID="$BUILD_ID"
echo "🏷️ Build ID: $BUILD_ID"

# 2. Build Nuxt con forzado
echo "📦 Generando Nuxt (build completo)..."
NODE_ENV=production npm run generate

# 3. Crear carpeta deploy y copiar
echo "📁 Copiando archivos compilados..."
mkdir -p deploy

if [ -d ".output/public" ]; then
  cp -r .output/public/* deploy/
  echo "  ✓ Archivos copiados: $(ls -1 deploy/ | wc -l) items"
else
  echo "❌ Error: .output/public no existe"
  exit 1
fi

# Añadir comentario con fecha de build en index.html
if [ -f "deploy/index.html" ]; then
  BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  sed -i "1i<!-- Build: $BUILD_DATE | Build ID: $BUILD_ID -->" deploy/index.html
  echo "  ✓ Fecha de build añadida: $BUILD_DATE"
fi

# 4. Crear .htaccess
echo "🧩 Creando .htaccess..."
cat << 'EOF' > deploy/.htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "^(index\.html|200\.html|404\.html|_payload\.json)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  <FilesMatch "^mail\.php$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>

  <FilesMatch "\.(js|css|png|ico|webp|jpg|jpeg|svg|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
EOF

# 5. Copiar archivos PHP del backend
echo "✉️ Copiando archivos PHP..."
mkdir -p deploy/api

if [ -f "mail.php" ]; then
  cp mail.php deploy/
  cp mail.php deploy/api/
  echo "  ✓ mail.php copiado"
fi

# 6. Git
echo "📤 Agregando archivos a Git..."
git add -A deploy

# Verificar si hay cambios staged
if git diff --cached --quiet; then
  echo "ℹ️ No hay cambios en deploy/"
else
  echo "💾 Haciendo commit..."
  git commit -m "deploy $(date '+%Y-%m-%d %H:%M:%S')"
  echo "🚀 Haciendo push..."
  git push
  echo "✅ Deploy completado - Commit enviado a Git"
  echo ""
  echo "⚠️  Si no ves los cambios en el servidor:"
  echo "   1. Verifica que Plesk haya hecho pull del último commit"
  echo "   2. Limpia la caché del navegador (Ctrl+Shift+R)"
  echo "   3. En Plesk, revisa el último commit desplegado"
fi

#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# 1. Build Nuxt (SSG)
echo "📦 Generando Nuxt..."
npm run generate

# 2. Limpiar carpeta deploy
echo "🧹 Limpiando carpeta deploy..."
rm -rf deploy
mkdir deploy

# 3. Copiar salida generada
echo "📁 Copiando archivos compilados..."
cp -r .output/public/* deploy/

# 4. Copiar backend PHP (ajusta si cambia el nombre)
if [ -f "mail.php" ]; then
  echo "✉️ Copiando mail.php..."
  mkdir -p deploy/api
  cp mail.php deploy/api/
fi

# 5. Crear .htaccess si no existe
if [ ! -f "deploy/.htaccess" ]; then
  echo "🧩 Creando .htaccess..."
  cat << 'EOF' > deploy/.htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
EOF
fi

# 6. Git
echo "📤 Preparando commit..."
git add deploy
git commit -m "deploy $(date '+%Y-%m-%d %H:%M:%S')" || echo "ℹ️ Nada que commitear"

echo "✅ Deploy preparado. Ahora haz:"
echo "   git push"

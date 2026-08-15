#!/bin/sh
set -e
echo "Aplicando migrations..."
./node_modules/prisma/build/index.js migrate deploy
echo "Iniciando Finanfi..."
exec node server.js

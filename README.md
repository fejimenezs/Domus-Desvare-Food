
# Domus-Desvare-Food - Full project (updated)

Este paquete contiene backend con funciones de compra y notificaciones, y frontend con botones Buy Now y aceptar pujas.

## Pasos rápidos (Windows)
1. Crear DB y tablas base:
   psql -U postgres -d bidbite -f server/sql/create_db.sql
2. Aplicar migración para notificaciones y campos adicionales:
   psql -U postgres -d bidbite -f server/sql/migration_update.sql
3. Backend:
   cd server
   copy .env.example .env
   # editar server/.env y poner DATABASE_URL
   npm install
   npm run dev
4. Frontend:
   cd frontend
   npx serve .
   # o integra en tu Vite app

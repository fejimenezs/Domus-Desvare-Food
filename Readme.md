# 🍲 CaseritosApp API

## 📖 Descripción
CaseritosApp es una API RESTful que conecta a mujeres que venden comida casera con personas interesadas en comprarla.  
Permite **crear, listar, comprar y pujar** por ofertas, además de manejar **notificaciones** y contar con un **panel de administración**.

---

## ⚡ Tecnologías usadas
- **Node.js + Express** → Backend
- **PostgreSQL** → Base de datos
- **JWT (JSON Web Tokens)** → Autenticación
- **Bcrypt** → Hash de contraseñas
- **CORS + dotenv** → Configuración y seguridad
- **Frontend** → HTML, CSS, JavaScript Vanilla (SPA)

---

## ⚡ Base URL por defecto
```
http://localhost:4000/api
```

---

## 🔑 Autenticación
- El sistema usa **JWT**.  
- Para acceder a rutas protegidas, primero realiza `POST /auth/login`.  
- Copia el token recibido y añádelo en el header de cada request:  

```
Authorization: Bearer TU_TOKEN
```

---

## 📂 Endpoints principales

### 🔑 Auth
- `POST /auth/register` → Registrar nuevo usuario  
- `POST /auth/login` → Login y obtener token  

### 🍲 Offers
- `GET /offers` → Listar ofertas (público)  
- `GET /offers/:id` → Detalle de oferta con pujas  
- `POST /offers` → Crear oferta (requiere token)  
- `PUT /offers/:id` → Editar oferta (dueño)  
- `DELETE /offers/:id` → Eliminar oferta (dueño o admin)  

### 💰 Bids & Buy
- `POST /offers/:id/bids` → Hacer una puja (requiere token)  
- `POST /offers/:id/bids/:bidId/accept` → Aceptar una puja (vendedor)  
- `POST /offers/:id/buy` → Comprar directo  

### 🔔 Notifications
- `GET /notifications` → Listar notificaciones del usuario logueado  
- `PATCH /notifications/:id/read` → Marcar notificación como leída  

### 👤 Users
- `GET /users/me` → Perfil del usuario logueado  
- `GET /users/me/history` → Historial de pujas y compras  

### 🛠️ Admin
- `GET /admin/users` → Listar todos los usuarios (solo admin)  
- `PUT /admin/users/:id` → Editar usuario (admin)  
- `DELETE /admin/users/:id` → Eliminar usuario (admin)  
- `GET /admin/offers` → Listar todas las ofertas (admin)  
- `DELETE /admin/offers/:id` → Eliminar oferta (admin)  

---

# 🚀 Despliegue y ejecución

A continuación tienes **tres formas** de poner el proyecto a correr: **local**, **Docker** y **nube (Render/Railway)**. Además, cómo desplegar el **frontend** en **GitHub Pages** apuntando al backend en la nube.

## 0) Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- (Opcional) Docker 24+ y Docker Compose
- Postman (para probar la API)

## 1) Configuración local (recomendada para desarrollo)

### 1.1. Variables de entorno
Crea un archivo `.env` en `server/` (o en la raíz, según tu estructura) con el siguiente contenido de ejemplo:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:P@ssw0rd1234@localhost:5432/caseritosdb
JWT_SECRET=una_clave_secreta_larga_y_segura
BCRYPT_SALT_ROUNDS=10
ADMIN_EMAIL=admin@caseritosapp.com
ADMIN_PASSWORD=123456
ADMIN_NAME=Administrador General
ADMIN_PHONE=3000000000
```

### 1.2. Crear base de datos y tablas
```bash
# crea la base (ajusta usuario/puerto si aplica)
createdb caseritosdb

# crea las tablas
psql -d caseritosdb -f server/sql/create_db.sql



### 1.3. Instalar dependencias y arrancar backend
```bash
npm install
# si tienes script dev con nodemon
npm run dev
# o sin nodemon
node server/index.js
```
Verás: `Server running on http://localhost:4000`

> El servidor ejecuta `ensureAdmin()` al arrancar y creará/actualizará el usuario admin definido en tu `.env`.

### 1.4. Arrancar el frontend (estático)
El frontend es una SPA estática (HTML/CSS/JS). 


**Servidor simple con Node**
```bash
# instala un servidor estático (opcional)
npm i -g http-server
# sirve la carpeta del frontend (ajusta ruta si es necesario)
http-server ./frontend -p 5173
```

#### API_URL del frontend
El frontend usa `frontend/js/config.js` (o similar) con:
```js
export const API_URL = (window.__API_URL__ || 'http://localhost:4000') + '/api';
```
- En local no toques nada.  
- En producción, **inyecta** `window.__API_URL__ = 'https://TU-BACKEND-EN-LA-NUBE'` antes de cargar `app.js`, o cambia la constante a mano.

---

## 2) Ejecución con Docker (backend + base de datos)

Crea un archivo `docker-compose.yml` en la raíz del repo:

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    container_name: caseritos_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: P@ssw0rd1234
      POSTGRES_DB: caseritosdb
    ports:
      - "5432:5432"
    volumes:
      - dbdata:/var/lib/postgresql/data
  api:
    build: .
    container_name: caseritos_api
    env_file:
      - server/.env
    environment:
      DATABASE_URL: postgresql://postgres:P@ssw0rd1234@db:5432/caseritosdb
    depends_on:
      - db
    ports:
      - "4000:4000"
    command: ["node", "server/index.js"]
volumes:
  dbdata:
```

Añade un `Dockerfile` sencillo (si aún no existe):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
EXPOSE 4000
CMD ["node","server/index.js"]
```

Levanta todo:
```bash
docker compose up -d --build
```

Aplica el esquema una vez (desde tu host con psql o exec al contenedor):
```bash
psql -h localhost -U postgres -d caseritosdb -f server/sql/create_db.sql
# (opcional) tabla notifications si no está en create_db.sql
psql -h localhost -U postgres -d caseritosdb -c "CREATE TABLE IF NOT EXISTS notifications (...);"
```

---

## 3) Despliegue en la nube (Render / Railway)

### 3.1. Backend (API)
1. **Crea un servicio Web** desde tu repo.  
2. Configura **Build Command**: `npm install`  
   **Start Command**: `node server/index.js` (o `npm run start` si lo tienes)  
3. Variables de entorno (ENV):  
   - `PORT=4000` (algunas plataformas te entregan su propio `PORT`; usa el que te suministren con `process.env.PORT`)  
   - `DATABASE_URL=postgresql://USER:PASS@HOST:PORT/DBNAME` (provisiónala en la misma plataforma)  
   - `JWT_SECRET`, `BCRYPT_SALT_ROUNDS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_PHONE`  
4. Provisiona **PostgreSQL** en la plataforma y copia su `DATABASE_URL`.  
5. Despliega. Cuando el servicio esté “Live”, visita `/` para ver `{"message":"CaseritosApp API running"}`.

> **Migraciones**: ejecuta el SQL de `server/sql/create_db.sql` contra tu DB gestionada (muchas plataformas permiten consola psql o “Run command”).

### 3.2. Frontend (GitHub Pages / Netlify / Vercel)
El frontend es **estático**:
- **GitHub Pages**: publica la carpeta del frontend (o raíz) en `gh-pages`.  
- **Netlify/Vercel**: arrastra el repo y apunta el directorio de publicación a la carpeta donde está `index.html`.

**Muy importante:** el frontend debe apuntar al backend en la nube. Opciones:
1. Edita `frontend/js/config.js` y cambia:
   ```js
   export const API_URL = 'https://TU-BACKEND-EN-LA-NUBE/api';
   ```
2. O inyecta en `index.html` antes del `<script type="module" src="/js/app.js">`:
   ```html
   <script>
     window.__API_URL__ = 'https://TU-BACKEND-EN-LA-NUBE';
   </script>
   ```

> Si el backend está en otro dominio, asegúrate de habilitar **CORS** (tu server ya usa `app.use(cors())`).

---

# 🧪 Probar con Postman
- Importa `CaseritosApp.postman_collection.json`.  
- En la variable `{{token}}` pega el token obtenido en `/auth/login`.  
- Orden sugerido: register → login → offers → create offer → bid → accept/buy → notifications → history.

---

# 🩺 Troubleshooting
- **ECONNREFUSED 127.0.0.1:4000** → El servidor no está corriendo o el puerto es distinto. Arranca `node server/index.js` y verifica el `PORT`.  
- **Unauthorized / Invalid token** → Falta header `Authorization: Bearer <token>`, token vencido o `JWT_SECRET` cambiado. Haz login de nuevo.  
- **“no existe la relación users/offers/…”** → Faltan migraciones: ejecuta `create_db.sql`.  
- **FK en datos de ejemplo** → `datos_oferta.sql` requiere un `seller_id` existente (por ejemplo el admin con id=1).  
- **CORS desde frontend** → El backend ya expone CORS. Si limitas orígenes, agrega tu dominio del frontend.  

---

## ✨ Autores
Proyecto académico desarrollado el equipo DOMUNS durante un curso de desarrollo web en Riwi Barranquilla llamado proyecto integrador.  
Incluye frontend (SPA) y backend con PostgreSQL.
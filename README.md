# 🍲 Domus Desvare Food

## 📖 Description
Domus Desvare Food is a full-stack web application that connects people who sell homemade food with those who want to buy it.  
The platform provides a **RESTful API** built with Node.js + Express and a **frontend SPA** (Single Page Application) using vanilla JavaScript, HTML, and CSS.  

Users can:  
- Register and log in (with authentication & roles: admin or user).  
- Publish, edit, and delete food offers.  
- Browse, bid, or directly buy offers.  
- Receive notifications about bids, purchases, and activity.  
- Admins can manage users and offers through an admin panel.  

---

## ⚡ Technologies Used
- **Backend**  
  - Node.js + Express → REST API  
  - PostgreSQL → Database  
  - JWT (JSON Web Tokens) → Authentication  
  - Bcrypt → Password hashing  
  - CORS + dotenv → Security and environment configuration  

- **Frontend**  
  - HTML5, CSS3, JavaScript (Vanilla ES6+)  
  - Router for SPA navigation  
  - Fetch API → Connects frontend with backend  

---

## ⚡ Default Base URL
```
http://localhost:4000/api
```

---

## 🔑 Authentication
The system uses **JWT**.  

1. Perform `POST /auth/login`.  
2. Copy the token returned by the backend.  
3. Add it in the headers of every protected request:  

```
Authorization: Bearer YOUR_TOKEN
```

---

## 📂 Project Structure
```
Domus-Desvare-Food-main/
│── frontend/                   # Client side (SPA)
│   ├── index.html               # Base page
│   ├── css/                     # Global styles
│   ├── js/                      # Main logic
│   │   ├── app.js
│   │   ├── router.js
│   │   ├── auth.js
│   │   ├── api.js
│   │   └── config.js
│   ├── pages/                   # Dynamic views
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── home.html
│   │   ├── offers.html
│   │   ├── create-offer.html
│   │   └── admin.html
│   └── assets/                  # Images & resources
│
│── server/                     # Server side (REST API)
│   ├── index.js                 # Server entry point
│   ├── routes/                  # API routes (auth, offers, users, notifications, admin)
│   ├── db/                      # Database connection
│   ├── middleware/              # Middlewares (auth, validations)
│   ├── sql/                     # SQL scripts for DB creation
│   ├── .env                     # Environment variables
│   └── package.json
│
│── CaseritosApp API.postman_collection.json # Postman collection
│── Readme.md
```

---

## 📂 Main Endpoints

### 🔑 Auth
- `POST /auth/register` → Register new user  
- `POST /auth/login` → Login and get token  

### 🍲 Offers
- `GET /offers` → List all offers (public)  
- `GET /offers/:id` → Get offer details with bids  
- `POST /offers` → Create offer (requires token)  
- `PUT /offers/:id` → Edit offer (owner only)  
- `DELETE /offers/:id` → Delete offer (owner or admin)  

### 💰 Bids & Buy
- `POST /offers/:id/bids` → Place a bid (requires token)  
- `POST /offers/:id/bids/:bidId/accept` → Accept a bid (seller)  
- `POST /offers/:id/buy` → Buy directly  

### 🔔 Notifications
- `GET /notifications` → List notifications of logged user  
- `PATCH /notifications/:id/read` → Mark as read  

### 👤 Users
- `GET /users/me` → Profile of logged user  
- `GET /users/me/history` → User’s bids and purchases history  

### 🛠️ Admin
- `GET /admin/users` → List all users  
- `PUT /admin/users/:id` → Edit user  
- `DELETE /admin/users/:id` → Delete user  
- `GET /admin/offers` → List all offers  
- `DELETE /admin/offers/:id` → Delete offer  

---

## 🚀 Deployment & Execution

### 0) Prerequisites
- Node.js 18+  
- PostgreSQL 14+  
- Postman (for API testing)  

---

### 1) Local Development

#### 1.1. Environment Variables  
Create a `.env` file inside `server/` with:  

```env
PORT=4000
DATABASE_URL=postgresql://postgres:P@ssw0rd1234@localhost:5432/domusdb
JWT_SECRET=your_super_secret_key
BCRYPT_SALT_ROUNDS=10
ADMIN_EMAIL=admin@domus.com
ADMIN_PASSWORD=123456
ADMIN_NAME=Main Admin
ADMIN_PHONE=3000000000
```

#### 1.2. Create Database & Tables
```bash
createdb domusdb
psql -d domusdb -f server/sql/create_db.sql
```

#### 1.3. Install Dependencies & Run Backend
```bash
cd server
npm install
npm run dev   # or node index.js
```

The server will run on:
```
http://localhost:4000
```

#### 1.4. Run Frontend
The frontend is a static SPA:

```bash
cd frontend
npx http-server -p 5173
```

Default frontend URL:
```
http://localhost:5173
```

By default, it points to:
```
http://localhost:4000/api
```

---

## 🧪 Testing with Postman
1. Register a new user.  
2. Login and copy token.  
3. Test offers endpoints.  
4. Place bids or buy directly.  
5. Check notifications.  

---

## 🩺 Troubleshooting
- `ECONNREFUSED 127.0.0.1:4000` → Backend not running.  
- `Unauthorized / Invalid token` → Missing or expired token.  
- `"relation users does not exist"` → Run `create_db.sql`.  
- CORS error → Backend already supports CORS. Ensure your frontend URL is allowed.  

---

## ✨ Authors
This project was developed by **Team DOMUNS** during a web development bootcamp at **Riwi Barranquilla** as an **integrator project**.  

It includes both **frontend SPA** and **backend API** with PostgreSQL.  

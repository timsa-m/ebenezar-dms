# Ebenezer Car Bazaar & Hire

> A full-stack web platform for a Kenyan automotive dealership — enabling vehicle sales browsing, car hire bookings, trade-in requests, and a full-featured admin dashboard.

**Live Site:** [ebenezarenterprises.com](https://carbazaar.ebenezarenterprises.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running in Development](#running-in-development)
  - [Building for Production](#building-for-production)
- [API Reference](#api-reference)
- [Pages & Routes](#pages--routes)
- [Admin Dashboard](#admin-dashboard)
- [Storage](#storage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Ebenezar Car Bazaar & Hire is based in Kisumu, Kenya, at **38 Ondiek Highway**. This platform is the digital storefront for the dealership, allowing customers to:

- Browse the full inventory of used vehicles for sale and hire
- View detailed vehicle specs, images, and pricing
- Submit car hire booking requests
- Submit trade-in applications
- Send direct contact messages to the team

The platform is backed by a secure Node.js/Express REST API with MongoDB for data persistence and Cloudflare R2 (S3-compatible) for image storage.

---

## Features

### Customer-Facing
- **Vehicle Inventory** — Filterable, searchable listing of all vehicles for sale
- **Vehicle Detail Pages** — Full specs, image gallery, color options, and pricing
- **Car Hire** — Browse hire vehicles with per-day and per-week rates
- **Trade-In Requests** — Submit a vehicle trade-in application with details
- **Contact Form** — Direct contact form routed to the dealership
- **Fully Responsive** — Optimized for mobile, tablet, and desktop
- **Route-Level Code Splitting** — Each page loads only when visited for fast performance
- **Vercel Speed Insights** — Real-time performance monitoring

### Admin
- **JWT-Authenticated Admin Panel** — Secure login required
- **Vehicle CRUD** — Add, edit, and delete vehicles with image uploads
- **Lead Management** — View and manage contact messages, hire requests, and trade-in submissions
- **Sitemap Generation** — Dynamic `sitemap.xml` for SEO

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Tailwind CSS v4 | Styling |
| Vite (rolldown-vite) | Build tool & dev server |
| Lucide React | Icon library |
| `@vercel/speed-insights` | Performance analytics |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database & ODM |
| JSON Web Tokens (JWT) | Admin authentication |
| bcryptjs | Password hashing |
| Multer | File/image upload handling |
| Helmet | HTTP security headers |
| express-rate-limit | API rate limiting |
| Morgan | HTTP request logging |
| CORS | Cross-origin resource sharing |

### Infrastructure
| Service | Purpose |
|---|---|
| Cloudflare Pages / Workers | Frontend hosting & deployment |
| Cloudflare R2 (S3-compatible) | Vehicle image storage |
| MongoDB Atlas | Cloud-hosted database |

---

## Project Structure

```
EbenezarCar-Bazaar/
├── public/                   # Static public assets
├── src/                      # Frontend source
│   ├── assets/               # Images and static assets
│   ├── components/
│   │   ├── layout/           # Navbar, Footer
│   │   ├── ui/               # Reusable UI components (ScrollToTop, etc.)
│   │   └── vehicle/          # VehicleCard and related components
│   ├── data/                 # Static/fallback data files
│   ├── pages/
│   │   ├── Home.jsx          # Landing page
│   │   ├── Inventory.jsx     # Vehicle listings page
│   │   ├── VehicleDetails.jsx        # Sale vehicle detail page
│   │   ├── VehicleDetailsHire.jsx    # Hire vehicle detail page
│   │   ├── CarHire.jsx       # Car hire listings
│   │   ├── TradeIn.jsx       # Trade-in submission form
│   │   ├── Contact.jsx       # Contact page
│   │   └── Admin.jsx         # Admin dashboard (protected)
│   ├── services/             # API client modules
│   │   ├── apiClient.js      # Axios base client with interceptors
│   │   ├── publicApi.js      # Public vehicle endpoints
│   │   ├── vehicleApi.js     # Vehicle CRUD API calls
│   │   ├── adminApi.js       # Admin-specific API calls
│   │   └── vehicleCache.js   # Client-side vehicle cache
│   ├── utils/                # Utility helpers (colors, images, etc.)
│   ├── App.jsx               # Root app with routing
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles
├── server/                   # Backend API
│   └── src/
│       ├── config/           # Environment config loader
│       ├── controllers/      # Route handler logic
│       ├── middleware/       # Auth, error handling middleware
│       ├── models/           # Mongoose schemas
│       │   ├── Vehicle.js
│       │   ├── Admin.js
│       │   ├── ContactMessage.js
│       │   ├── HireRequest.js
│       │   └── TradeInRequest.js
│       ├── routes/           # Express route definitions
│       │   ├── vehicles.js
│       │   ├── admin.js
│       │   ├── contacts.js
│       │   ├── hireRequests.js
│       │   ├── tradeIns.js
│       │   └── health.js
│       ├── scripts/          # Seeding and utility scripts
│       ├── services/         # Business logic (storage service, etc.)
│       ├── utils/            # Server-side utility helpers
│       ├── app.js            # Express app setup & middleware
│       └── server.js         # Server entry point (listens on PORT)
├── api/                      # Cloudflare/Vercel serverless API entry
│   └── index.js
├── index.html                # HTML entry point
├── vite.config.js            # Vite configuration
├── wrangler.toml             # Cloudflare Workers/Pages config
├── vercel.json               # Vercel rewrite rules
├── tailwind.config.js        # Tailwind CSS configuration
├── eslint.config.js          # ESLint configuration
└── package.json              # Root package (npm workspace root)
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** `v18+` (v22 recommended)
- **npm** `v10+`
- A running **MongoDB** instance (local or [MongoDB Atlas](https://cloud.mongodb.com))
- _(Optional)_ A **Cloudflare R2** bucket for image uploads (or use local storage)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/btslilac/EbenezarCar-Bazaar.git
   cd EbenezarCar-Bazaar
   ```

2. **Install all dependencies** (root + server workspace):
   ```bash
   npm install
   ```

### Environment Variables

The backend requires a `.env` file. Copy the example and fill in your values:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Port the API server listens on | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JWTs | `a-long-random-string` |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `ADMIN_REGISTRATION_KEY` | One-time key for creating the first admin account | `super-secret-key` |
| `CORS_ORIGIN` | Allowed frontend origin(s) | `http://localhost:5173` |
| `STORAGE_DRIVER` | Storage backend for uploads | `s3` or `local` |
| `S3_REGION` | R2/S3 region | `auto` |
| `S3_BUCKET` | Bucket name | `ebenezer-vehicles` |
| `S3_ACCESS_KEY_ID` | S3/R2 access key ID | |
| `S3_SECRET_ACCESS_KEY` | S3/R2 secret access key | |
| `S3_ENDPOINT` | S3/R2 endpoint URL | |
| `S3_PUBLIC_BASE_URL` | Public URL for serving uploaded files | |
| `S3_FORCE_PATH_STYLE` | Required for R2 compatibility | `true` |
| `LOCAL_UPLOAD_DIR` | Local folder for uploads (if `STORAGE_DRIVER=local`) | `uploads` |
| `LOCAL_PUBLIC_BASE_URL` | Public path for local uploads | `/uploads` |

### Running in Development

You need two terminals — one for the frontend and one for the backend API.

**Terminal 1 — Frontend (Vite dev server):**
```bash
npm run dev
```
Runs at: `http://localhost:5173`

**Terminal 2 — Backend API server:**
```bash
npm run dev:server
```
Runs at: `http://localhost:5000`

**Optional — Seed the database with sample vehicles:**
```bash
npm run seed
```

### Building for Production

```bash
npm run build
```

Output is written to the `dist/` folder, ready for static hosting.

---

## API Reference

All routes are prefixed with `/api`. The API runs at `PORT` (default `5000`).

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |

### Vehicles
| Method | Endpoint | Auth | Description |
|---|---|---|---| 
| `GET` | `/api/vehicles` |  List all vehicles (supports filters) |
| `GET` | `/api/vehicles/:id` |  Get a single vehicle by ID |
| `POST` | `/api/vehicles` | Admin | Add a new vehicle |
| `PUT` | `/api/vehicles/:id` | Admin | Update a vehicle |
| `DELETE` | `/api/vehicles/:id` | Admin | Delete a vehicle |

### Contact Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/contacts` | Submit a contact message |
| `GET` | `/api/contacts` | Admin | List all contact submissions |

### Hire Requests
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/hire-requests` | Submit a car hire request |
| `GET` | `/api/hire-requests` | Admin | List all hire requests |

### Trade-In Requests
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/trade-ins` | Submit a trade-in request |
| `GET` | `/api/trade-ins` | Admin | List all trade-in requests |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/register` | Register first admin (requires `ADMIN_REGISTRATION_KEY`) |
| `POST` | `/api/admin/login` | Login and receive a JWT |

### Sitemap
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sitemap.xml` | Dynamically generated XML sitemap for SEO |

> **Auth:** Protected routes require a `Authorization: Bearer <token>` header with a valid JWT obtained from `/api/admin/login`.

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | `Home.jsx` | Landing page with hero, featured vehicles, and CTAs |
| `/inventory` | `Inventory.jsx` | Full filterable vehicle listings |
| `/vehicle/:id` | `VehicleDetails.jsx` | Individual sale vehicle details & enquiry |
| `/car-hire` | `CarHire.jsx` | Available vehicles for hire |
| `/vehicle/hire/:id` | `VehicleDetailsHire.jsx` | Individual hire vehicle details & booking |
| `/trade-in` | `TradeIn.jsx` | Trade-in submission form |
| `/contact` | `Contact.jsx` | Contact information & message form |
| `/admin` | `Admin.jsx` | Protected admin dashboard |

---

## Admin Dashboard

The admin panel (`/admin`) is a protected interface accessible only after logging in with valid credentials.

**Capabilities:**
-  **Manage Vehicles** — Add new vehicles with images, edit details, update availability, delete listings
-  **View Leads** — Review contact messages, hire booking requests, and trade-in submissions
-  **Image Uploads** — Images are uploaded directly to Cloudflare R2 (or local storage in dev mode)

**Creating the first admin account:**
```bash
# POST /api/admin/register
{
  "username": "admin",
  "password": "your-password",
  "registrationKey": "value-from-ADMIN_REGISTRATION_KEY-env-var"
}
```

---

## Storage

The server supports two storage drivers, configured via the `STORAGE_DRIVER` environment variable:

| Driver | Value | Notes |
|---|---|---|
| **Cloudflare R2 / AWS S3** | `s3` | Recommended for production. Requires S3 credentials. |
| **Local filesystem** | `local` | Stores files in `server/uploads/`. Good for development. |

---

## Deployment

### Frontend — Cloudflare Pages

The frontend builds to `dist/` via `npm run build` and is deployed using Wrangler.

The `wrangler.toml` at the root configures the deployment:
```toml
name = "ebenezer-motors"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

**Deploy command:**
```bash
npx wrangler deploy
```

Or configure Cloudflare Pages to auto-deploy on git push with:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Deploy command:** `npx wrangler deploy`

### Backend — Node.js Server

The backend (`/server`) is a standard Express application that can be deployed to any Node.js hosting provider (Railway, Render, Fly.io, VPS, etc.):

```bash
cd server
npm start
```

Ensure all environment variables from `server/.env.example` are set in your hosting environment.

---

## Contributing

This is a private business project. If you have access to this repository and wish to contribute:

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit: `git commit -m "feat: describe your change"`
3. Push and open a pull request for review

Please follow the existing code style and ensure the build passes before submitting.

---

## License

This project is licensed under the terms of the [MIT License](./LICENSE).

© 2026 Ebenezer Enterprises, Kisumu, Kenya. All rights reserved.

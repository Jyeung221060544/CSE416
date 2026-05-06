# CSE416 — Redistricting Analysis Tool

Analyzes congressional district plans for Alabama and Oregon using ensemble methods, demographic data, and racial polarization metrics.

This application guides us through 6 steps: 
1. State Overview
2. Demographic Data
3. Racial Polarization
4. Ensemble Analysis
5. Effectiveness Analysis
6. Representtaion Gap

in order to answer the queston: What is the impact on minority political representation if the VRA was gutted?

---

## Project Structure

```
CSE416/
├── frontend/          # React + Vite client
│   └── src/
│       ├── components/    # UI sections, charts, maps, filters, tables
│       ├── pages/         # Route-level pages (StatePage, etc.)
│       ├── store/         # Zustand global state (useAppStore.js)
│       ├── hooks/         # Data loading hooks
│       ├── api.jsx        # All API calls (single source of truth)
│       └── lib/           # Shared utilities and constants
│
├── backend/           # Spring Boot server
│   └── src/main/java/edu/stonybrook/cse416/backend/
│       ├── controller/    # REST endpoints
│       ├── service/       # Business logic + Caffeine caching
│       ├── repository/    # Spring Data MongoDB queries
│       ├── model/         # MongoDB document models
│       ├── config/        # CORS, cache configuration
│       └── loader/        # DataLoader — seeds DB from JSON on startup
│
├── analytics/         # Python preprocessing scripts
│   ├── export_*       # Build JSON data files for each analysis type
│   ├── compute_*      # Compute statistics (box-whisker, etc.)
│   └── generate_*     # Generate GeoJSON plans and seat-vote curves
│
├── AL-real-data/      # Processed JSON outputs for Alabama (loaded into DB)
├── OR-real-data/      # Processed JSON outputs for Oregon (loaded into DB)
├── AL_data/           # Raw Alabama precinct/ensemble data
└── OR_data/           # Raw Oregon precinct/ensemble data
```

---

## Running the Backend

### 1. Set environment variables (PowerShell)
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:MONGODB_URI = "mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cse416?appName=CSE416Cubs"
```
Falls back to `mongodb://localhost:27017/cse416` if `MONGODB_URI` is not set.

### 2. Run
```powershell
cd backend
./mvnw spring-boot:run
```
Runs on `http://localhost:8080`.

### 3. Seed the database (first time only)
In `backend/src/main/resources/application.properties`, set:
```
app.load-data=true
```
Then run normally. After seeding, flip it back to `false`.

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`. Proxies API calls to the backend on port 8080.

---

## Analytics Scripts

Python scripts in `analytics/` generate the data files consumed by the backend. Run from the project root:

```bash
python analytics/<script_name>.py
```

Scripts require `geopandas`, `numpy`, `scipy`. Install with:
```bash
pip install geopandas numpy scipy
```

Typical pipeline order: `export_*_real_data.py` scripts first, then `generate_*` scripts if regenerating GeoJSON plans.

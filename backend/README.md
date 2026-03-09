# Backend Run Guide

## 1) Configure MongoDB URI

This backend reads Mongo URI from `MONGODB_URI`.

Example:

```bash
export MONGODB_URI='mongodb+srv://vivian:cse416@cse416cubs.hs1tfym.mongodb.net/cse416?appName=CSE416Cubs'
```

If `MONGODB_URI` is not set, backend falls back to local MongoDB:

`mongodb://localhost:27017/cse416`

## 2) Run backend

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

## 3) Seed data (dangerous)

`app.load-data=true` runs `DataLoader`, which first clears collections and then reseeds.

Use only when intentional:

```bash
java -jar target/backend-0.0.1-SNAPSHOT.jar --app.load-data=true
```

After seeding once, run normally with `app.load-data=false`.

## 4) Atlas access checklist for teammates

- Add teammate IPs in Atlas Network Access.
- Create scoped DB users (avoid sharing one master account).
- Ensure each teammate exports their own `MONGODB_URI`.

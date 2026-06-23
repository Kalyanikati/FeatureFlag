# End-to-End Integration Testing Guide

## Pre-Flight Checklist

### System Requirements
- [ ] Docker Desktop installed and running
- [ ] Docker Compose version 3.8+
- [ ] At least 4GB RAM available
- [ ] Port 3000, 5432, 6379, 8000, 8001 available
- [ ] 2GB disk space for Docker images

### Project Structure
```
FeatureFlag/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── flags.py       ✓ CRUD with versioning
│   │   │   ├── rollback.py    ✓ Rollback endpoints
│   │   │   └── sdk.py         ✓ SDK evaluation
│   │   ├── services/
│   │   │   ├── cache.py       ✓ Redis caching
│   │   │   └── versioning.py  ✓ Version snapshots
│   │   ├── models/
│   │   │   └── flag.py        ✓ 4 ORM models
│   │   ├── schemas/
│   │   │   └── flag.py        ✓ Pydantic validation
│   │   ├── engine/
│   │   │   └── evaluator.py   ✓ MurmurHash3 evaluation
│   │   ├── db/
│   │   │   └── base.py        ✓ Circular import fix
│   │   ├── config.py          ✓ Pydantic settings
│   │   └── main.py            ✓ FastAPI app
│   ├── alembic/               ✓ Database migrations
│   ├── Dockerfile             ✓ Container image
│   ├── requirements.txt        ✓ All dependencies
│   └── .env                   ✓ Configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlagManager.jsx ✓ CRUD UI
│   │   │   ├── VersionHistory.jsx ✓ Versions & rollback
│   │   │   └── EcommerceIntegration.jsx ✓ Integration monitor
│   │   ├── api.js             ✓ API client
│   │   ├── App.jsx            ✓ Main component
│   │   └── index.css          ✓ Styling
│   ├── Dockerfile             ✓ Multi-stage build
│   ├── nginx.conf             ✓ Web server config
│   ├── vite.config.js         ✓ Build config
│   ├── package.json           ✓ Dependencies
│   └── index.html             ✓ Entry point
│
├── ecommerce_mock/
│   └── backend/
│       ├── main.py            ✓ Mock microservice
│       ├── Dockerfile         ✓ Container image
│       └── requirements.txt    ✓ Dependencies
│
├── infra/
│   └── docker-compose.yml     ✓ Full stack orchestration
│
├── start.sh                   ✓ Startup script
├── start.bat                  ✓ Windows startup
├── README.md                  ✓ Comprehensive guide
├── DEPLOYMENT.md              ✓ Production guide
└── .gitignore                 ✓ Git ignore rules
```

## Step 1: Verify Local Environment

```bash
# Check Docker
docker --version
docker-compose --version

# Expected output:
# Docker version 20.10.0 or higher
# Docker Compose version 2.0.0 or higher

# Check available ports
# macOS/Linux:
lsof -i :3000 :5432 :6379 :8000 :8001

# Windows:
netstat -ano | findstr :3000

# If ports are in use, stop those processes or use different ports
```

## Step 2: Build and Start Full Stack

### Option A: Automated Script (Recommended)

**macOS/Linux:**
```bash
cd /Users/KalyaniKarun/FeatureFlag
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
cd C:\Users\KalyaniKarun\FeatureFlag
start.bat
```

### Option B: Manual Docker Compose

```bash
cd infra
docker-compose up -d

# Monitor startup
docker-compose logs -f

# Expected output after ~20 seconds:
# ff_postgres: PostgreSQL is ready
# ff_redis: ready to accept connections
# ff_api: Application startup complete
# ff_ecommerce_client: Running on 0.0.0.0:8001
# ff_dashboard: nginx running
```

## Step 3: Verify Services Are Running

### Check Containers
```bash
docker ps

# Expected output:
# CONTAINER_ID  IMAGE                    STATUS
# xxx           feature-flag-frontend    Up 30 seconds
# xxx           feature-flag-api         Up 35 seconds
# xxx           ecommerce:latest         Up 40 seconds
# xxx           redis:7-alpine           Up 45 seconds
# xxx           postgres:15-alpine       Up 50 seconds
```

### Health Checks
```bash
# API Health
curl -s http://localhost:8000/api/v1/flags | head -c 50
# Expected: [] (empty flag list)

# Frontend
curl -s http://localhost:3000 | grep -o "<title>.*</title>"
# Expected: <title>Feature Flag Dashboard</title>

# E-commerce Service
curl -s http://localhost:8001/__flags
# Expected: [] (empty flags, will populate after creating flags)

# Database
docker exec ff_postgres psql -U ff_admin -d feature_flags_db -c "\dt"
# Expected: Shows tables: feature_flags, feature_flag_versions, etc.

# Redis
docker exec ff_redis redis-cli PING
# Expected: PONG
```

## Step 4: Test Core Functionality

### 4a. Dashboard Access
1. Open http://localhost:3000 in browser
2. Should see: "Feature Flag Dashboard" title
3. Three tabs: "Flags", "Versions & Rollback", "E-commerce Integration"

### 4b. Create First Flag via Dashboard

1. Click "+ Create New Flag"
2. Fill in form:
   - Key: `test_checkout`
   - Name: `Test Checkout Flow`
   - Description: `Testing the system`
   - Status: Enabled
   - Rollout: 25%
3. Click "Create Flag"
4. Should see success message and flag in table

### 4c. Create Flag via API (Verification)

```bash
curl -X POST http://localhost:8000/api/v1/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "feature_api_test",
    "name": "API Test Flag",
    "description": "Testing via API",
    "is_enabled": true,
    "rollout_percentage": 50
  }'

# Expected response (JSON):
# {
#   "id": 1,
#   "key": "feature_api_test",
#   "name": "API Test Flag",
#   "is_enabled": true,
#   "rollout_percentage": 50,
#   "created_at": "...",
#   "updated_at": "..."
# }
```

### 4d. Verify Cache Sync

```bash
# Check Redis for cached flag
docker exec ff_redis redis-cli GET "flag:feature_api_test:current"

# Expected: JSON string with flag data
# {"key": "feature_api_test", "name": "API Test Flag", ...}
```

## Step 5: Test Versioning & Rollback

### 5a. Create Version History

1. In dashboard, find test flag
2. Click "Edit"
3. Change rollout to 75%
4. Click "Update Flag"
5. Repeat 3-4 times with different rollouts (10%, 100%, 50%)

### 5b. View Version History

1. Go to "Versions & Rollback" tab
2. Select flag from dropdown
3. Should see 4+ versions listed with:
   - Version number
   - Created date/time
   - Changed by (admin)
   - State snapshot (JSON)

### 5c. Test Rollback

1. In version list, note current version
2. Click "Rollback to V1"
3. Confirm with reason
4. Should see success message
5. Verify rollout is back to original

```bash
# Verify via API
curl http://localhost:8000/api/v1/flags/test_checkout | jq '.rollout_percentage'
# Expected: 25 (original value)
```

## Step 6: Test E-commerce Integration

### 6a. Real-time Flag Sync

1. Go to "E-commerce Integration" tab
2. Should see:
   - Feature Flag API: ✓ Online
   - E-commerce Service: ✓ Online
   - Redis Cache: ✓ Online
   - Total Flags: (count of created flags)

### 6b. Test Flag Evaluation

1. Enter a user ID: `user_123`
2. For each flag, click "Test"
3. See results in "Evaluation Results" table
4. Verify:
   - User ID is correct
   - Rollout percentage matches flag config
   - Enabled field matches is_enabled flag

### 6c. Verify Real-time Pub/Sub

1. In one terminal, watch Redis pub/sub:
```bash
docker exec ff_redis redis-cli SUBSCRIBE flag_updates
# Should see: 1) "subscribe"
```

2. In dashboard, update a flag's rollout
3. In terminal, should see:
```bash
1) "message"
2) "flag_updates"
3) "{\"key\": \"test_checkout\", \"action\": \"updated\"}"
```

4. In e-commerce flags endpoint:
```bash
curl http://localhost:8001/__flags | jq '.[].rollout_percentage'
# Should show updated value <1 second later
```

## Step 7: Test System Under Load

### 7a. Flag Evaluation Performance

```bash
# Run 100 evaluations
for i in {1..100}; do
  curl -s "http://localhost:8000/sdk/evaluate?flag_key=test_checkout&user_id=user_$i" > /dev/null
done

# Check API logs for latency
docker logs ff_api | tail -20
```

### 7b. Concurrent Flag Updates

```bash
# Terminal 1: Continuously update flag
while true; do
  curl -X PUT http://localhost:8000/api/v1/flags/test_checkout \
    -H "Content-Type: application/json" \
    -d "{\"rollout_percentage\": $((RANDOM % 100))}" > /dev/null
  sleep 1
done

# Terminal 2: Monitor Redis updates
docker exec ff_redis redis-cli SUBSCRIBE flag_updates

# Terminal 3: Verify e-commerce sees updates
while true; do
  curl -s http://localhost:8001/__flags | jq '.[0].rollout_percentage'
  sleep 2
done
```

## Step 8: Database Verification

### 8a. Check Feature Flags Table

```bash
docker exec ff_postgres psql -U ff_admin -d feature_flags_db -c "
  SELECT id, key, name, is_enabled, rollout_percentage 
  FROM feature_flags 
  ORDER BY created_at DESC;"

# Expected: Your created flags
```

### 8b. Check Version History

```bash
docker exec ff_postgres psql -U ff_admin -d feature_flags_db -c "
  SELECT id, version, flag_id, changed_by, change_reason 
  FROM feature_flag_versions 
  ORDER BY created_at DESC LIMIT 10;"

# Expected: Your version history
```

### 8c. Check Audit Logs

```bash
docker exec ff_postgres psql -U ff_admin -d feature_flags_db -c "
  SELECT id, flag_key, action, changed_by_username, timestamp 
  FROM audit_logs 
  ORDER BY timestamp DESC LIMIT 10;"

# Expected: CREATE, UPDATE, ROLLBACK actions
```

## Step 9: Error Scenarios

### 9a. Delete and Recreate

1. In dashboard, delete a flag
2. Try to recreate with same key
3. Should succeed (hard delete)

### 9b. Rollback Non-existent Version

1. Try to rollback with invalid version ID
2. Should see error message

### 9c. Stop Redis, Then Update

1. `docker-compose pause ff_redis`
2. Try to update flag
3. Should fail with connection error
4. `docker-compose unpause ff_redis`
5. Update should work again

## Step 10: Cleanup & Documentation

### Generate System Report

```bash
# Get system info
docker system df

# Get image sizes
docker images | grep feature-flag

# Get volumes
docker volume ls

# Get network info
docker network inspect ff_network
```

### Useful Debugging Commands

```bash
# View API logs
docker logs ff_api -f

# View frontend logs
docker logs ff_dashboard -f

# View e-commerce logs
docker logs ff_ecommerce_client -f

# Execute SQL directly
docker exec ff_postgres psql -U ff_admin -d feature_flags_db

# Check Redis keys
docker exec ff_redis redis-cli KEYS "flag:*"

# Monitor Redis in real-time
docker exec -it ff_redis redis-cli MONITOR
```

## Performance Baseline

Record these metrics for your system:

| Operation | Target | Actual |
|-----------|--------|--------|
| Create Flag | <500ms | ____ |
| Get All Flags | <200ms | ____ |
| Update Rollout | <300ms | ____ |
| Rollback | <400ms | ____ |
| Evaluate Flag | <1ms | ____ |
| Version Query | <300ms | ____ |

## Final Verification Checklist

- [ ] All 5 containers running
- [ ] Dashboard accessible at :3000
- [ ] Can create flag via dashboard
- [ ] Flag appears in API
- [ ] Flag cached in Redis
- [ ] E-commerce service sees flag
- [ ] Version history works
- [ ] Rollback works
- [ ] Real-time sync works (<100ms)
- [ ] Database has complete audit trail
- [ ] No errors in logs
- [ ] Performance meets targets

## Troubleshooting

### "Connection refused" to API
```bash
# Check if API is running
docker ps | grep ff_api

# Check logs
docker logs ff_api

# Restart if needed
docker-compose restart flag_platform_api
```

### "Cannot evaluate flag"
```bash
# Check database connection
docker exec ff_api psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
docker exec ff_api redis-cli -u $REDIS_URL PING
```

### "Frontend blank page"
```bash
# Check build was successful
docker logs ff_dashboard | grep "nginx"

# Check nginx config
docker exec ff_dashboard cat /etc/nginx/conf.d/default.conf
```

### "Rollback failed"
```bash
# Check database has versions
docker exec ff_postgres psql -U ff_admin -d feature_flags_db \
  -c "SELECT COUNT(*) FROM feature_flag_versions"

# Check version exists
docker exec ff_postgres psql -U ff_admin -d feature_flags_db \
  -c "SELECT * FROM feature_flag_versions WHERE id = <version_id>"
```

## Next Steps

1. ✅ System is ready for portfolio
2. 📝 Document your learnings in SYSTEM_DESIGN.md
3. 🚀 Deploy to AWS/GCP/Heroku (see DEPLOYMENT.md)
4. 📊 Add monitoring (Prometheus + Grafana)
5. 🧪 Write integration tests
6. 📚 Create architecture documentation
7. 🎤 Prepare interview explanations

---

**Congratulations!** Your feature flag platform is now fully operational and ready for technical interviews. 🎉

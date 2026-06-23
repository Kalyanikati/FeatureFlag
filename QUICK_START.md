# Quick Start Guide

## 60-Second Start

```bash
# 1. Navigate to project
cd /Users/KalyaniKarun/FeatureFlag

# 2. Start everything
docker-compose -f infra/docker-compose.yml up -d

# 3. Wait 20 seconds
sleep 20

# 4. Open dashboard
open http://localhost:3000
# Or: firefox http://localhost:3000
# Or: chrome http://localhost:3000
```

## What You'll See

### Dashboard (http://localhost:3000)
- Empty flag list initially
- Tab 1: Create and manage flags
- Tab 2: View versions and rollback
- Tab 3: Test flag evaluation in real-time

### Create Your First Flag

In dashboard:
1. Click "+ Create New Flag"
2. Fill in:
   - **Key**: `test_flag` (unique identifier)
   - **Name**: `My Test Flag` (display name)
   - **Description**: `Testing the system` (optional)
   - **Status**: Enabled
   - **Rollout**: 25%
3. Click "Create Flag"

## Test Real-Time Sync

1. Go to "E-commerce Integration" tab
2. See flag appears in dashboard
3. Update rollout to 50% in Flags tab
4. Watch it update in E-commerce tab (<100ms)

## Test Rollback

1. Update flag rollout a few times (10%, 75%, 25%)
2. Go to "Versions & Rollback" tab
3. Select flag from dropdown
4. Click "Rollback to V1"
5. Confirm
6. Watch rollout revert to original

## API Testing

```bash
# Create flag via API
curl -X POST http://localhost:8000/api/v1/flags \
  -H "Content-Type: application/json" \
  -d '{"key":"api_test","name":"API Test","is_enabled":true,"rollout_percentage":50}'

# List all flags
curl http://localhost:8000/api/v1/flags

# Update flag
curl -X PUT http://localhost:8000/api/v1/flags/api_test \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage":75}'

# Get versions
curl http://localhost:8000/api/v1/flags/api_test/versions

# Evaluate flag for user
curl "http://localhost:8000/sdk/evaluate?flag_key=api_test&user_id=user_123"
```

## Stop Everything

```bash
# Stop containers
docker-compose -f infra/docker-compose.yml down

# Stop and clean (WARNING: deletes data)
docker-compose -f infra/docker-compose.yml down -v
```

## View Logs

```bash
# API logs
docker logs -f ff_api

# Frontend logs
docker logs -f ff_dashboard

# E-commerce logs
docker logs -f ff_ecommerce_client

# All logs
docker-compose -f infra/docker-compose.yml logs -f
```

## Useful Commands

```bash
# List containers
docker ps

# Get shell access to API
docker exec -it ff_api bash

# Check database
docker exec -it ff_postgres psql -U ff_admin -d feature_flags_db

# Check Redis
docker exec -it ff_redis redis-cli

# Monitor real-time updates
docker exec -it ff_redis redis-cli SUBSCRIBE flag_updates
```

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Container won't start
```bash
# Check logs
docker logs <container_name>

# Rebuild
docker-compose -f infra/docker-compose.yml build --no-cache

# Restart
docker-compose -f infra/docker-compose.yml up -d
```

### Database issues
```bash
# Reset database
docker-compose -f infra/docker-compose.yml down -v
docker-compose -f infra/docker-compose.yml up -d
```

## Next Steps

📚 Read these files:
1. **README.md** - Full system documentation
2. **SYSTEM_DESIGN.md** - Architecture and design decisions
3. **INTEGRATION_TESTING.md** - End-to-end testing guide
4. **DEPLOYMENT.md** - Production deployment strategies

🚀 Interview preparation:
- Understand the circular import fix
- Know the MurmurHash3 algorithm
- Explain the rollback transaction flow
- Discuss trade-offs in caching strategy

💡 Extend the system:
- Add authentication (API keys)
- Add rate limiting
- Add metrics (Prometheus)
- Add distributed tracing (Jaeger)
- Add targeting rules evaluation

## Quick Reference

| Component | Port | URL |
|-----------|------|-----|
| React Dashboard | 3000 | http://localhost:3000 |
| FastAPI Backend | 8000 | http://localhost:8000 |
| E-commerce Mock | 8001 | http://localhost:8001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

| File | Purpose |
|------|---------|
| README.md | Comprehensive guide |
| SYSTEM_DESIGN.md | Architecture & patterns |
| DEPLOYMENT.md | Production guide |
| INTEGRATION_TESTING.md | Testing guide |
| docker-compose.yml | Container orchestration |

## System Health Check

```bash
# All services up?
docker ps | grep -c "Up"  # Should be 5

# API responding?
curl -s http://localhost:8000/api/v1/flags | head -c 5  # []

# Frontend loading?
curl -s http://localhost:3000 | grep -c "Feature Flag"  # 1

# Database ready?
docker exec ff_postgres psql -U ff_admin -d feature_flags_db -c "\dt"

# Redis working?
docker exec ff_redis redis-cli PING  # PONG
```

## Interview Demo Script

```
1. Open dashboard
   "This is the feature flag management system built with React"

2. Create a flag
   "I can instantly create feature flags with configurable rollout"

3. Show versioning
   "Every update is versioned automatically for audit and recovery"

4. Do a rollback
   "One-click rollback with ACID transaction guarantees"

5. Show e-commerce integration
   "Real-time sync to consuming services via Redis Pub/Sub"

6. Run evaluation test
   "Deterministic MurmurHash3 ensures consistent user experience"

7. Check database
   "All changes audited and queryable for compliance"

Key talking points:
- Handles 10,000+ evaluations/sec (cached, O(1))
- Scales to 100+ API instances
- Deterministic hashing for cross-device consistency
- ACID transactions for safety
- Real-time sync <100ms latency
```

## Common Interview Questions & Answers

**Q: How do you handle stale cache?**
A: Write-through caching ensures cache always matches DB. No stale reads possible.

**Q: What if Redis goes down?**
A: Evaluation still works (falls back to DB). Cache is nice-to-have, not critical.

**Q: How do you scale this?**
A: Stateless API instances behind load balancer. Shared DB/Redis becomes bottleneck.

**Q: Why MurmurHash3?**
A: Deterministic (same user always same bucket), fast O(1), cross-device consistent.

**Q: What about consistency?**
A: Eventual consistency model. DB is source of truth. Cache eventually consistent via Pub/Sub.

**Q: How do transactions work?**
A: PostgreSQL ACID guarantees. All-or-nothing: if any operation fails, entire transaction rolls back.

---

**Ready to impress in interviews!** 🚀

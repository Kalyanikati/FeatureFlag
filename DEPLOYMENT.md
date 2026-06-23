# Deployment Guide

## Production Deployment Strategies

### 1. AWS ECS + RDS + ElastiCache

#### Architecture
```
ALB (Application Load Balancer)
 ├─ ECS Service: Frontend (Fargate)
 ├─ ECS Service: FastAPI Backend (Fargate)
 ├─ ECS Service: E-commerce Mock (Fargate)
 └─ CloudFront CDN (for static assets)
     ├─ RDS PostgreSQL (Multi-AZ)
     └─ ElastiCache Redis (Multi-AZ)
```

#### Setup Steps
```bash
# 1. Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier feature-flags-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username ff_admin \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --publicly-accessible false

# 2. Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id feature-flags-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# 3. Create ECR repositories
aws ecr create-repository --repository-name feature-flag-api
aws ecr create-repository --repository-name feature-flag-frontend
aws ecr create-repository --repository-name ecommerce-service

# 4. Build and push Docker images
docker build -t feature-flag-api backend/
docker tag feature-flag-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/feature-flag-api:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/feature-flag-api:latest

# 5. Create ECS cluster
aws ecs create-cluster --cluster-name feature-flags

# 6. Register task definitions and create services
# (See task-definition.json templates below)
```

#### Environment Variables for ECS
```
DATABASE_URL=postgresql+asyncpg://ff_admin:password@rds-endpoint:5432/feature_flags_db
REDIS_URL=redis://elasticache-endpoint:6379/0
ENVIRONMENT=production
LOG_LEVEL=info
```

### 2. Kubernetes Deployment (GKE/EKS/AKS)

#### Helm Chart Structure
```
feature-flag-helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment-api.yaml
│   ├── deployment-frontend.yaml
│   ├── deployment-ecommerce.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── statefulset-db.yaml
```

#### Deploy with Helm
```bash
# 1. Create namespace
kubectl create namespace feature-flags

# 2. Create secrets
kubectl create secret generic db-credentials \
  --from-literal=password=<strong-password> \
  -n feature-flags

# 3. Deploy via Helm
helm install feature-flags ./feature-flag-helm \
  --namespace feature-flags \
  --values values-prod.yaml

# 4. Expose via ingress
kubectl apply -f ingress.yaml -n feature-flags
```

#### Sample Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-flag-api
  namespace: feature-flags
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feature-flag-api
  template:
    metadata:
      labels:
        app: feature-flag-api
    spec:
      containers:
      - name: api
        image: gcr.io/project/feature-flag-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis_url
        livenessProbe:
          httpGet:
            path: /api/v1/flags
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/flags
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 3. Heroku Deployment

```bash
# 1. Create Heroku apps
heroku create feature-flag-api
heroku create feature-flag-frontend

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev -a feature-flag-api

# 3. Add Redis addon
heroku addons:create heroku-redis:premium-0 -a feature-flag-api

# 4. Deploy backend
git push heroku main -a feature-flag-api

# 5. Deploy frontend
git push heroku main -a feature-flag-frontend

# 6. Run migrations
heroku run "alembic upgrade head" -a feature-flag-api

# 7. Set environment variables
heroku config:set ENVIRONMENT=production -a feature-flag-api
```

### 4. Fly.io Deployment

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Authenticate
flyctl auth login

# 3. Create app
flyctl apps create feature-flags-api

# 4. Deploy
flyctl deploy -i feature-flag-api:latest

# 5. Attach volumes for persistent data
flyctl volumes create pg_data --size 10 --app feature-flags-api
flyctl volumes create redis_data --size 5 --app feature-flags-api

# 6. Configure secrets
flyctl secrets set DATABASE_URL=postgresql://... REDIS_URL=redis://...
```

### 5. DigitalOcean App Platform

#### app.yaml Configuration
```yaml
name: feature-flags
services:
- name: api
  github:
    repo: user/feature-flags
    branch: main
  build_command: pip install -r requirements.txt && alembic upgrade head
  run_command: uvicorn app.main:app --host 0.0.0.0
  envs:
  - key: ENVIRONMENT
    value: production
  - key: DATABASE_URL
    scope: RUN_TIME
    value: ${db.connection_string}
  http_port: 8000
  
- name: frontend
  github:
    repo: user/feature-flags
    branch: main
    source_dir: frontend
  build_command: npm install && npm run build
  run_command: npm run start
  http_port: 3000

databases:
- name: db
  engine: PG
  version: "15"
  production: true
  
- name: cache
  engine: REDIS
  version: "7"
  production: true
```

## Production Considerations

### 1. Database
- **Backup Strategy**: Daily automated backups with point-in-time recovery
- **Replication**: Multi-region replication for disaster recovery
- **Connection Pooling**: Use PgBouncer for connection management
- **Monitoring**: Enable slow query logs and performance insights

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create indexes
CREATE INDEX idx_flag_key ON feature_flags(key);
CREATE INDEX idx_audit_flag_key ON audit_logs(flag_key);
CREATE INDEX idx_versions_flag_id ON feature_flag_versions(flag_id);
```

### 2. Caching
- **Redis Persistence**: Enable AOF for durability
- **Replication**: Redis Sentinel or Cluster for HA
- **Monitoring**: Set up memory alerts and eviction policies

```redis
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

### 3. API Security
- **Authentication**: API Key or OAuth2
- **Rate Limiting**: Per-user and global limits
- **CORS**: Restrict to known origins
- **HTTPS**: Enforce TLS 1.3

```python
# Add to app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/flags")
@limiter.limit("100/minute")
async def get_flags():
    # ...
```

### 4. Monitoring & Logging
- **Application Metrics**: Prometheus with `prometheus-client`
- **Structured Logging**: JSON logs with context
- **Tracing**: Jaeger for distributed tracing
- **Alerting**: PagerDuty for critical issues

```python
from prometheus_client import Counter, Histogram
import json
import logging

# Metrics
flag_evaluations = Counter('flag_evaluations_total', 'Total flag evaluations')
flag_update_duration = Histogram('flag_update_seconds', 'Flag update duration')

# Structured logging
logger = logging.getLogger(__name__)
logger.info(json.dumps({
    'event': 'flag_created',
    'flag_key': flag.key,
    'rollout_percentage': flag.rollout_percentage,
    'timestamp': datetime.utcnow().isoformat()
}))
```

### 5. CI/CD Pipeline

#### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: cd backend && pytest
        
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push Docker image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/feature-flag-api:${{ github.sha }} backend/
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/feature-flag-api:${{ github.sha }}
      - name: Deploy to GKE
        run: |
          kubectl set image deployment/feature-flag-api \
            api=gcr.io/${{ secrets.GCP_PROJECT }}/feature-flag-api:${{ github.sha }}
```

### 6. Performance Tuning

#### FastAPI Optimization
```python
from fastapi_cache2 import FastAPICache2
from fastapi_cache2.backends.redis import RedisBackend
from redis import asyncio as aioredis

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache2.init(RedisBackend(redis), prefix="fastapi-cache")

from fastapi_cache2.decorators import cache

@app.get("/api/v1/flags")
@cache(expire=300)  # Cache for 5 minutes
async def get_flags():
    # Expensive query results cached
    pass
```

#### Database Query Optimization
```python
# Use select with joinedload for efficient queries
from sqlalchemy.orm import selectinload

query = select(FeatureFlag).options(
    selectinload(FeatureFlag.versions),
    selectinload(FeatureFlag.rules)
)
result = await session.execute(query)
```

### 7. Disaster Recovery

#### Backup Strategy
```bash
# Daily PostgreSQL backup
0 2 * * * pg_dump -Fc feature_flags_db > /backups/ff_$(date +\%Y\%m\%d).dump

# S3 upload
aws s3 cp /backups/ff_$(date +\%Y\%m\%d).dump s3://backups/ff/

# Restore from backup
pg_restore -d feature_flags_db /backups/ff_20240101.dump
```

#### Blue-Green Deployment
```bash
# Deploy to "green" environment
docker-compose -f docker-compose.green.yml up -d

# Run smoke tests
curl http://green-api:8000/api/v1/flags

# Switch traffic (via load balancer)
aws elbv2 modify-rule \
  --rule-arn arn:aws:elasticloadbalancing:... \
  --conditions Type=path-pattern,Values="/api/*" \
  --target-group-arn arn:aws:elasticloadbalancing:...

# Keep "blue" as rollback
```

## Monitoring Dashboard

### Prometheus Queries
```
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# API response time
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Flag evaluation latency
histogram_quantile(0.99, flag_evaluation_duration_seconds_bucket)
```

### Grafana Dashboards
- System Health (CPU, Memory, Disk)
- API Performance (Requests, Latency, Errors)
- Database Metrics (Connections, Slow Queries)
- Flag Metrics (Updates, Rollbacks, Evaluations)

## Scaling Strategies

### Horizontal Scaling
```yaml
# Kubernetes HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: feature-flag-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: feature-flag-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Scaling
- **Read Replicas**: For evaluation queries (read-only)
- **Connection Pooling**: PgBouncer/pgpool for connection management
- **Sharding**: By flag_key if needed (unlikely for typical use)

### Redis Scaling
- **Cluster Mode**: For high throughput
- **Sentinel**: For failover
- **Keyspace Notifications**: For real-time updates

## Cost Optimization

### AWS Estimate (Monthly)
- RDS PostgreSQL (t3.micro): ~$15
- ElastiCache Redis (cache.t3.micro): ~$15
- ECS Fargate (3 tasks, 512MB each): ~$50
- ALB: ~$20
- Data Transfer: ~$10
- **Total**: ~$110/month

### Optimization Tips
1. Use spot instances for non-critical workloads (-70% cost)
2. Reserved instances for baseline capacity (-30% cost)
3. Scheduled scaling (scale down during off-hours)
4. CloudFront caching (reduce API calls)
5. Compression (gzip all responses)

## Compliance & Security

### Data Protection
- Encryption at rest (AWS KMS)
- Encryption in transit (TLS 1.3)
- Database backup encryption
- Regular security audits

### Compliance
- SOC2 Type II readiness
- GDPR compliance (right to deletion)
- HIPAA considerations (if needed)
- PCI DSS compliance (if handling payments)

### Incident Response
1. Monitor errors in real-time (Sentry)
2. Alert on threshold breaches (PagerDuty)
3. Runbooks for common issues
4. Post-incident reviews

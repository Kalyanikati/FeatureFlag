# Feature Flag Dashboard

A React-based dashboard for managing feature flags in real-time. Built with modern frontend practices and zero-dependency CSS styling.

## Features

### 📋 Flag Management Tab
- **Create Flags**: Define new feature flags with key, name, description, and initial rollout
- **Edit Flags**: Update flag configuration (name, description, status, rollout %)
- **Delete Flags**: Remove flags (with confirmation)
- **Status Badges**: Visual indicators for enabled/disabled status
- **Rollout Slider**: Smooth percentage control for canary deployments

### 📜 Versions & Rollback Tab
- **Version History**: View all snapshots of flag state changes
- **Metadata**: See who made changes, when, and why
- **State Snapshots**: JSON representation of each version
- **Instant Rollback**: Restore any flag to any previous state with reason tracking
- **Audit Trail**: Complete history preserved in database

### 🛒 E-commerce Integration Tab
- **System Status**: Real-time health check of all services
- **Flag Sync Monitor**: See active flags in e-commerce service
- **Test Evaluation**: Simulate flag evaluation for specific users
- **Evaluation Results**: View history of test evaluations
- **Architecture Diagram**: Understand how components connect

## UI Components

### Modals
- **Create Flag Modal**: Form to create new flags with validation
- **Edit Flag Modal**: In-place editing with rollout slider
- **Rollback Modal**: Preview state before confirming rollback

### Real-time Updates
- Flags auto-refresh every 5 seconds
- System status checks every 3 seconds
- Alert notifications for all operations

### Responsive Design
- Works on desktop (optimized)
- Mobile-friendly layouts
- Touch-friendly buttons and controls

## Usage

### Starting the Dashboard

**With Docker:**
```bash
docker-compose up
# Dashboard at http://localhost:3000
```

**Local Development:**
```bash
npm install
npm run dev
# Dashboard at http://localhost:5173 (Vite default)
```

### Workflow Example

1. **Create a New Flag**
   - Click "Create New Flag"
   - Enter key: `checkout_v2`
   - Enter name: `New Checkout Flow`
   - Set initial rollout: 5%
   - Click "Create Flag"

2. **Monitor Canary Deployment**
   - Flag appears in Flags tab
   - Update rollout to 10%, 25%, 50%, 100% as you monitor metrics
   - Each update creates a new version

3. **Check E-commerce Integration**
   - Switch to "E-commerce Integration" tab
   - Enter user ID in test field
   - Click "Test" for each flag
   - See real-time evaluation results

4. **Handle Issues - Rollback**
   - Switch to "Versions & Rollback" tab
   - Select flag from dropdown
   - See version history
   - Click "Rollback to V1" if issues detected
   - Confirm with reason: `High error rate detected`

## API Integration

The dashboard communicates with three services:

### Feature Flag Platform API (`/api/v1/flags`)
```javascript
// Create
POST /api/v1/flags
{ key, name, description, is_enabled, rollout_percentage }

// Read
GET /api/v1/flags
GET /api/v1/flags/{key}

// Update
PUT /api/v1/flags/{key}
{ name?, description?, is_enabled?, rollout_percentage? }

// Delete
DELETE /api/v1/flags/{key}

// Version History
GET /api/v1/flags/{key}/versions

// Rollback
POST /api/v1/flags/{key}/rollback
{ version_id, reason? }
```

### SDK Endpoints (`/sdk`)
```javascript
// Get all enabled flags
GET /sdk/flags

// Evaluate flag for user
GET /sdk/evaluate?flag_key=X&user_id=Y
```

### E-commerce Service (`http://localhost:8001`)
```javascript
// Get current flags state
GET /__flags
```

## Architecture

```
React App (Vite)
    ├── App.jsx (main container, tab routing)
    ├── FlagManager.jsx (CRUD operations)
    ├── VersionHistory.jsx (versions & rollback)
    ├── EcommerceIntegration.jsx (integration monitor)
    └── api.js (axios client)
         ├── flagAPI (CRUD + versioning)
         ├── sdkAPI (evaluation)
         └── ecommerceAPI (status)
```

## Development

### Adding Features

1. **Create new component** in `src/components/`
2. **Add tab button** in `App.jsx`
3. **Add API methods** to `api.js` if needed
4. **Import and use** in component

### Styling

- All styling in `src/index.css`
- No external CSS libraries
- CSS variables for colors and spacing
- Responsive flexbox layouts

### Testing Locally

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Start e-commerce mock
cd ecommerce_mock/backend
python main.py

# Terminal 3: Start frontend dev server
cd frontend
npm run dev
```

## Troubleshooting

### "Cannot connect to API"
- Ensure backend is running on port 8000
- Check network tab in browser DevTools
- Verify CORS is enabled in backend

### "Flags not updating"
- Check auto-refresh is working (5s interval)
- Click "Flags" tab to reload
- Check browser console for errors

### "E-commerce service offline"
- Ensure mock service is running on port 8001
- Check Redis connection in mock service logs
- Restart containers: `docker-compose restart`

## Performance

- **Initial load**: ~500ms (flag list)
- **Flag update**: ~100ms (UI + cache sync)
- **Version query**: ~200ms (full history load)
- **Auto-refresh**: 5 second intervals (configurable)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome)

## Future Enhancements

- [ ] WebSocket real-time updates (instead of polling)
- [ ] Targeting rules UI builder
- [ ] Scheduled flag releases
- [ ] A/B test integration
- [ ] Metrics dashboard
- [ ] User segmentation
- [ ] Role-based access control
- [ ] Dark mode toggle

# Migration Notes - localStorage to MySQL Backend

## Overview

The ARMS system has been migrated from localStorage-based data storage to a MySQL database backend with a Node.js/Express API.

## What Has Been Completed

### Backend Infrastructure
✅ MySQL database schema created (`server/database/schema.sql`)
✅ Express backend server (`server/server.js`)
✅ Database connection configuration (`server/config/database.js`)
✅ API endpoints for all entities:
- Authentication (login, logout, current user)
- Users management
- Tickets
- QR History
- Ticket Records
- Ticket Classifications
- Maintenance Records
- Incident Reports
- Spare Parts
- Supplies
- Merchandise
- Ride Scans

### Frontend Services
✅ API service layer (`src/services/api.js`)
✅ Authentication updated to use JWT tokens
✅ Login component migrated
✅ PrivateRoute component updated
✅ AdminTicketing component migrated
✅ UserManagement component migrated

## What Still Needs Migration

The following components still use localStorage and need to be updated:

### Critical Components (High Priority)
1. **PersonnelRideTicketing.js** - Ticket validation and scanning
2. **AdminDashboardOverview.js** - Dashboard statistics
3. **AdminMaintenanceReports.js** - Maintenance data display
4. **AdminIncidentReports.js** - Incident reports
5. **AdminPartsInventory.js** - Parts inventory
6. **EncoderQRCode.js** - QR code generation
7. **RideClassificationsEditor.js** - Classifications management
8. **MerchandiseMonitoring.js** - Merchandise operations
9. **PartsInventory.js** - Parts operations
10. **All dashboard overview components** - Statistics and summaries

### Migration Pattern

For each component, follow this pattern:

1. **Import API services:**
```javascript
import { ticketsAPI, qrHistoryAPI, /* other APIs */ } from '../../services/api';
```

2. **Replace localStorage.getItem():**
```javascript
// OLD:
const data = JSON.parse(localStorage.getItem('key') || '[]');

// NEW:
const data = await ticketsAPI.getAll();
```

3. **Replace localStorage.setItem():**
```javascript
// OLD:
localStorage.setItem('key', JSON.stringify(data));

// NEW:
await ticketsAPI.create(newItem);
// or
await ticketsAPI.update(id, updatedItem);
```

4. **Replace localStorage.removeItem():**
```javascript
// OLD:
localStorage.removeItem('key');

// NEW:
await ticketsAPI.delete(id);
```

5. **Update useEffect hooks:**
```javascript
// OLD:
useEffect(() => {
  const data = JSON.parse(localStorage.getItem('key') || '[]');
  setData(data);
}, []);

// NEW:
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await ticketsAPI.getAll();
      setData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  loadData();
}, []);
```

## Authentication Changes

### Before:
- User data stored in `localStorage.getItem('currentUser')`
- Password stored in plain text
- No token-based authentication

### After:
- JWT token stored in `localStorage.getItem('authToken')`
- User data stored in `localStorage.getItem('currentUser')` (for quick access)
- Password hashing with bcrypt
- Token-based authentication for all API calls

### Migration Path:
1. Users with existing accounts need to log in again
2. Passwords can be plain text initially (for migration)
3. System can auto-hash plain text passwords on login
4. New passwords are always hashed

## Data Migration Script (Optional)

If you have existing localStorage data, you can create a migration script:

```javascript
// migrate-data.js
// Run this once to migrate existing localStorage data to database

const migrateLocalStorageToDB = async () => {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  // Migrate users
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  for (const user of users) {
    await usersAPI.create(user);
  }
  
  // Migrate tickets
  const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
  for (const ticket of tickets) {
    await ticketsAPI.create(ticket);
  }
  
  // ... continue for other entities
};
```

## Environment Variables

### Backend (.env in server/):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=arms_system
PORT=5000
JWT_SECRET=your_secret_key_here
```

### Frontend (.env in root/):
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Testing Checklist

After migration, test:
- [ ] User login/logout
- [ ] User management (create, update, delete, approve)
- [ ] Ticket creation and management
- [ ] QR code generation and scanning
- [ ] Ticket validation
- [ ] Maintenance records
- [ ] Incident reports
- [ ] Parts inventory operations
- [ ] Merchandise operations
- [ ] Dashboard statistics
- [ ] All role-based access controls

## Known Issues

1. **Password Hashing**: Default admin password is plain text. Change it after first login.
2. **Date Formats**: Database uses DATE/DATETIME, ensure frontend formats match.
3. **ID Fields**: Database uses auto-increment IDs, not timestamps. May need ID mapping.
4. **Relationships**: Foreign keys are set up, but ensure referenced data exists.

## Rollback Plan

If migration fails:
1. Keep localStorage code commented out (don't delete)
2. Can switch back by changing API calls to localStorage
3. Database can be cleared and recreated if needed

## Next Steps

1. Complete migration of remaining components (follow priority list above)
2. Test all functionality thoroughly
3. Add error handling and loading states
4. Add data validation on both frontend and backend
5. Set up proper password hashing for all users
6. Add database backups
7. Set up production environment variables
8. Configure CORS properly for production

## Support

Refer to `SETUP.md` for installation and configuration instructions.


# ARMS - Amusement Ride Management System

ARMS is a comprehensive management system designed for amusement parks to handle ride operations, maintenance, ticketing, and incident reporting. The system provides role-based access control and features tailored to different user types.

## Features

### User Roles

1. **IT Admin**
   - User Management (create/edit/delete user accounts)
   - Access Control (assign roles and permissions)
   - System Configuration
   - Audit Logs
   - Complete Dashboard Overview
   - Reports Generation

2. **IT Encoder**
   - QR Code Generation
   - Ticket Issuance and Restrictions
   - Ticket Monitoring
   - QR Entry/Exit Records
   - Inventory Management

3. **Operations Manager**
   - Dashboard Overview
   - Incident Reports Review
   - Maintenance Reports
   - Performance Analytics
   - Inventory Monitoring

4. **Amusement Park Personnel**
   - QR Code Scanning
   - Ticket Validation
   - Incident Logging
   - Maintenance Request Submission

### Key Features

- Real-time ticket monitoring and validation
- QR code-based access control
- Comprehensive incident reporting system
- Maintenance tracking and scheduling
- Inventory management for parts and merchandise
- Role-based access control
- Secure authentication system

## Getting Started

### Prerequisites

- **XAMPP** (for MySQL database) - Download from https://www.apachefriends.org/
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/arms-system.git
   cd arms-system
   ```

2. **Start XAMPP** and ensure MySQL service is running

3. **Create Database**:
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Execute the SQL script from `server/database/schema.sql`
   - This creates the database and all required tables

4. **Setup Backend**:
   ```bash
   cd server
   npm install
   npm start
   ```
   The backend will run on http://localhost:5000

5. **Setup Frontend**:
   ```bash
   # In the root directory
   npm install
   ```

6. **Configure Environment**:
   - Create `.env` file in root: `REACT_APP_API_URL=http://localhost:5000/api`
   - Create `.env` file in `server/` (optional, uses defaults):
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=arms_system
     PORT=5000
     ```

7. Start the React development server:
   ```bash
   npm start
   ```

8. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

**For detailed setup instructions, see [SETUP.md](SETUP.md)**

### Initial Setup

1. Default admin account is created automatically:
   - **Username:** `admin`
   - **Password:** `Admin@123`
   - **⚠️ IMPORTANT:** Change this password after first login!

2. Use the IT Admin account to create other user accounts
3. Configure system settings and access permissions

## User Account Limits

- IT Admin: Maximum 3 accounts
- IT Encoder: Maximum 5 accounts
- Operations Manager: Maximum 1 account
- Amusement Park Personnel: Maximum 10 accounts

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Security question for password recovery
- Role-based access control
- Admin approval required for new accounts
- Session management
- Secure API endpoints with authentication middleware

## Data Storage

The system uses **MySQL database** (via XAMPP) for data persistence with a Node.js/Express backend API. All data operations are performed through RESTful API endpoints.

### Database Structure
- MySQL database: `arms_system`
- Backend API: Node.js/Express running on port 5000
- Authentication: JWT token-based
- All CRUD operations go through the backend API

See [MIGRATION_NOTES.md](MIGRATION_NOTES.md) for migration details.

## Development

### Project Structure

```
arms-system/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.js
│   │   │   ├── SignUp.js
│   │   │   └── ForgotPassword.js
│   │   ├── dashboards/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── EncoderDashboard.js
│   │   │   ├── ManagerDashboard.js
│   │   │   └── PersonnelDashboard.js
│   │   └── layout/
│   │       └── DashboardLayout.js
│   ├── assets/
│   │   └── logo.png
│   ├── App.js
│   └── index.js
├── public/
├── package.json
└── README.md
```

### Built With

**Frontend:**
- React.js
- Material-UI
- React Router
- QRCode.react
- Axios (for API calls)

**Backend:**
- Node.js
- Express.js
- MySQL2
- JWT (JSON Web Tokens)
- bcryptjs (password hashing)

## Architecture

- **Frontend:** React.js SPA communicating with REST API
- **Backend:** Node.js/Express REST API
- **Database:** MySQL (via XAMPP)
- **Authentication:** JWT tokens
- **Data Flow:** Frontend → API → MySQL Database

## Future Enhancements

1. Additional Features
   - Real-time updates using WebSocket
   - Advanced reporting and analytics
   - Mobile app for personnel
   - Integration with payment systems
   - Real-time ride status monitoring
   - Automated maintenance scheduling
   - Email notifications
   - Audit logging system

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or raise an issue in the repository. 
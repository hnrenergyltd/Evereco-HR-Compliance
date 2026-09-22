# Evereco Energy HR System

A simple, secure, web-based HR and Sponsor Licence Compliance system for UK companies.

## Quick Start

See STAGE1_SETUP_GUIDE.md for detailed setup instructions.

### Requirements
- Node.js v16+
- PostgreSQL 12+ (or SQLite for development)
- npm or yarn

### Installation

1. Create folder structure:
   ```bash
   ./setup.bat  # Windows
   ```

2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Configure environment:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Start development:
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev
   ```

5. Login:
   - Email: `admin@evereco.com`
   - Password: `Change123!`

## Architecture

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Authentication:** JWT + Bcrypt
- **Deployment:** Railway

## Features (Stage 1)

✅ Secure login
✅ Employee list and profiles
✅ Dashboard with stats
✅ Role-based access control
✅ Responsive design
✅ Audit logging

## Build Stages

1. Stage 1: Foundation (Current)
2. Stage 2: Employment & Personal info
3. Stage 3: Attendance & Clock In/Out
4. Stage 4: Absence management
5. Stage 5: Sponsorship & Right to Work
6. Stage 6: Compliance monitoring
7. Stage 7: Production deployment

## Documentation

- `PRD.html` - Product Requirements Document
- `TRD.html` - Technical Requirements Document
- `UI-UX-DESIGN.html` - Design System
- `BACKEND_SCHEMA.html` - Database Schema
- `STAGE1_SETUP_GUIDE.md` - Setup Instructions

## Support

For questions or issues, contact the development team.

## License

Proprietary - Evereco Energy Ltd

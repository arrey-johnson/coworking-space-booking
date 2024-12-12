# Coworking Space Management System

A full-stack application for managing a coworking space, built with React, Node.js, and MySQL.

## Features
- User authentication and authorization
- Workspace booking system
- Member management
- Resource reservation
- Billing and invoicing
- Real-time availability tracking

## Tech Stack
- Frontend: React.js
- Backend: Node.js with Express
- Database: MySQL
- Authentication: JWT

## Setup Instructions
1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```
3. Configure the database:
   - Create a MySQL database named 'coworking_db'
   - Update database credentials in backend/.env

4. Start the application:
   ```bash
   # Start backend server
   cd backend
   npm start

   # Start frontend development server
   cd ../frontend
   npm start
   ```

## Database Schema
- Users
- Workspaces
- Bookings
- Resources
- Payments
- Members

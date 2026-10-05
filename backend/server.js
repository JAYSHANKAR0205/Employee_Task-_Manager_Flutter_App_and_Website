/**
 * @file server.js
 * @description Primary Express Backend Application Entry Point & Server Initializer.
 */

// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import Swagger UI and specification config
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import authentication, task, and leave routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const adminLeaveRoutes = require('./routes/adminLeaveRoutes');

const LeaveType = require('./models/LeaveType');

// Initialize the Express application
const app = express();

// Define the port the server will run on (default: 5000)
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());

// Disable browser caching for all API responses to prevent back-button cache exposure
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

/**
 * Swagger API Documentation Setup
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Authentication & Leave Management API Documentation",
  customCss: ".swagger-ui .topbar { display: none }",
}));

/**
 * Route Configuration
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminLeaveRoutes);

/**
 * Seed initial leave types
 */
const seedLeaveTypes = async () => {
  try {
    const defaultTypes = [
      { name: 'Casual Leave', description: 'Paid casual leave allocation', defaultAllocation: 12, isActive: true },
      { name: 'Paid Leave', description: 'Earned paid leave allocation', defaultAllocation: 20, isActive: true },
      { name: 'Emergency Leave', description: 'Emergency & sick leave allocation', defaultAllocation: 5, isActive: true }
    ];

    for (const typeData of defaultTypes) {
      const existing = await LeaveType.findOne({ name: typeData.name });
      if (!existing) {
        await LeaveType.create(typeData);
      }
    }
    console.log('Default Leave Types initialized.');
  } catch (err) {
    console.error('Error seeding Leave Types:', err);
  }
};

/**
 * Database Connection
 */
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_db')
  .then(async () => {
    console.log('Connected to MongoDB successfully!');
    try {
      const User = require('./models/User');
      await User.syncIndexes();
      console.log('User model indexes synced successfully.');
      await seedLeaveTypes();
    } catch (indexErr) {
      console.error('Error syncing User indexes or seeding leave types:', indexErr);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

/**
 * Server Initialization
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger Documentation available at http://localhost:${PORT}/api-docs`);
});

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url'; // To handle __dirname in ES Modules
import mongoose from 'mongoose';
import multer from 'multer'; // Import Multer to check for MulterError instance in error handler

// Import Routes
import authRoutes from './routes/auth.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import purchaseOrderRoutes from './routes/purchaseOrder.routes.js';
import stockRegisterRoutes from './routes/stockRegister.routes.js';

// Import Error Handler Middleware (assuming it's in middlewares/error.middleware.js)
import { notFound, errorHandler } from './middlewares/error.middleware.js';

// --- Load Environment Variables ---
// Make sure you have a .env file in the root of the backend folder
dotenv.config();

// --- Database Connection ---
const connectDB = async () => {
    try {
        // Check if MONGO_URI is loaded
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI not found in environment variables. Make sure .env file is configured.");
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Options to prevent deprecation warnings (adjust based on Mongoose version)
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
            // useCreateIndex: true, // No longer needed/supported
            // useFindAndModify: false // No longer needed/supported
            // Mongoose 6+ uses these by default. If using older Mongoose, uncomment relevant options.
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Exit process with failure code if database connection fails
        process.exit(1);
    }
};
// Connect to the database when the server starts
connectDB();

// --- Initialize Express App ---
const app = express();

// --- Core Middlewares ---
// Enable Cross-Origin Resource Sharing for all origins (adjust in production if needed)
app.use(cors());

// Parse JSON request bodies (Content-Type: application/json)
app.use(express.json());

// Parse URL-encoded request bodies (Content-Type: application/x-www-form-urlencoded)
// Handles data submitted from standard HTML forms
app.use(express.urlencoded({ extended: true }));

// --- ES Module __dirname Equivalent ---
// Needed for resolving paths, especially for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Static Folder for Uploads ---
// Makes files inside the 'uploads' directory accessible via URL
// e.g., http://localhost:5000/uploads/invoices/invoice-123.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
// Simple route to check if the API is running
app.get('/api', (req, res) => {
    res.json({ message: 'API is running successfully!' });
});

// Mount the different route handlers under specific base paths
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/stock-register', stockRegisterRoutes);


// --- Error Handling Middlewares ---
// These MUST be placed AFTER all your API routes

// 1. 404 Not Found Handler: Catches requests that didn't match any routes above
app.use(notFound);

// 2. General Error Handler: Catches errors passed via `next(error)` from routes/controllers or the `notFound` handler
app.use(errorHandler);


// --- Start Server ---
// Get port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// Start listening for connections
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
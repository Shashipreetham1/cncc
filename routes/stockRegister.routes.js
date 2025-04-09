import express from 'express';
import {
    createStockEntry,
    getStockEntries,
    getStockEntryById,
    updateStockEntry,
    deleteStockEntry
} from '../controllers/stockRegister.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadStockPhoto } from '../middlewares/upload.middleware.js'; // Specific upload middleware

const router = express.Router();

router.use(protect); // Protect all Stock Register routes

// POST /api/stock-register - Create new entry (handles file upload with field name 'stockPhoto')
router.post('/', uploadStockPhoto.single('stockPhoto'), createStockEntry);

// GET /api/stock-register - Get all user's entries
router.get('/', getStockEntries);

// GET /api/stock-register/:id - Get single entry
router.get('/:id', getStockEntryById);

// PUT /api/stock-register/:id - Update entry (handles file upload with field name 'stockPhoto')
router.put('/:id', uploadStockPhoto.single('stockPhoto'), updateStockEntry);

// DELETE /api/stock-register/:id - Delete entry
router.delete('/:id', deleteStockEntry);


export default router;
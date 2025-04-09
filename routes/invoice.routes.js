import express from 'express';
import {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice
} from '../controllers/invoice.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadInvoice } from '../middlewares/upload.middleware.js'; // Specific upload middleware

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

// POST /api/invoices - Create new invoice (handles file upload with field name 'invoiceFile')
router.post('/', uploadInvoice.single('invoiceFile'), createInvoice); // Use multer middleware before controller

// GET /api/invoices - Get all user's invoices
router.get('/', getInvoices);

// GET /api/invoices/:id - Get single invoice
router.get('/:id', getInvoiceById);

// PUT /api/invoices/:id - Update invoice (handles file upload with field name 'invoiceFile')
router.put('/:id', uploadInvoice.single('invoiceFile'), updateInvoice);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', deleteInvoice);


export default router;
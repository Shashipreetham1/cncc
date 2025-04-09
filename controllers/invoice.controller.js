import Invoice from '../models/invoice.model.js'; // Corrected import path assuming model file is Invoice.model.js
import mongoose from 'mongoose';
import fs from 'fs'; // Used for file system operations (deleting files)
import path from 'path'; // Used for constructing file paths
import { fileURLToPath } from 'url'; // Used to get __dirname in ES modules

// --- ES Module equivalent of __dirname (needed for absolute path construction) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Assuming controllers folder is directly inside the backend root
const projectRoot = path.join(__dirname, '..');


// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (Requires authentication via 'protect' middleware)
const createInvoice = async (req, res, next) => {
    try {
        const invoiceData = { ...req.body };

        // Attempt to parse 'products' if it's sent as a JSON string
        // Common when sending FormData from the frontend along with a file
        if (typeof invoiceData.products === 'string') {
            try {
                invoiceData.products = JSON.parse(invoiceData.products);
            } catch (parseError) {
                res.status(400); // Bad Request
                return next(new Error('Invalid format for products data. Expected a valid JSON array string.'));
            }
        }

        // Add the invoice file URL if a file was uploaded
        if (req.file) {
            // Store the relative path, accessible via the static route defined in server.js
            invoiceData.invoiceFileUrl = `/uploads/invoices/${req.file.filename}`;
        }

        // Add the user ID from the authenticated user (attached by 'protect' middleware)
        invoiceData.createdBy = req.user._id;

        // Create the invoice document in the database
        const invoice = await Invoice.create(invoiceData);
        res.status(201).json(invoice); // Respond with the created invoice and 201 status

    } catch (error) {
        // Check for Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            res.status(400); // Bad Request status for validation failures
        }
        // Pass any other errors to the central error handler
        next(error);
    }
};

// @desc    Get all invoices for the logged-in user
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
    try {
        // Find all invoices created by the currently logged-in user
        const invoices = await Invoice.find({ createdBy: req.user._id })
                                    .sort({ purchaseDate: -1 }); // Sort by purchase date, newest first
        res.json(invoices); // Respond with the array of invoices
    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res, next) => {
    try {
        // Validate if the provided ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400); // Bad Request
             return next(new Error('Invalid Invoice ID format'));
        }

        // Find the invoice by its ID
        const invoice = await Invoice.findById(req.params.id);

        // If invoice is not found, send 404
        if (!invoice) {
            res.status(404); // Not Found
            return next(new Error('Invoice not found'));
        }

        // Authorization check: Ensure the invoice belongs to the requesting user
        if (invoice.createdBy.toString() !== req.user._id.toString()) {
            res.status(403); // Forbidden
            return next(new Error('Not authorized to view this invoice'));
        }

        res.json(invoice); // Respond with the found invoice

    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};


// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
     try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid Invoice ID format'));
        }

        // --- Find the existing invoice FIRST to get old file path ---
        const invoice = await Invoice.findById(req.params.id);

        // Check if invoice exists
        if (!invoice) {
            res.status(404);
            return next(new Error('Invoice not found'));
        }

        // Authorization check
        if (invoice.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to update this invoice'));
        }

        // Prepare the update data from the request body
        const updateData = { ...req.body };

        // Handle potential product data format (if sent as string)
        if (typeof updateData.products === 'string') {
            try {
                updateData.products = JSON.parse(updateData.products);
            } catch (parseError) {
                res.status(400);
                return next(new Error('Invalid format for products data. Expected a valid JSON array string.'));
            }
        } else if (updateData.products === undefined) {
            // If 'products' is not included in the update request, remove it from updateData
            // to avoid overwriting existing products with null/undefined.
            delete updateData.products;
        }


        // --- File Handling Logic ---
        if (req.file) {
            // If a new file is uploaded in this request:
            const newFilePath = `/uploads/invoices/${req.file.filename}`;
            updateData.invoiceFileUrl = newFilePath; // Set the new path in the data to be updated

            // Attempt to delete the old file, if it existed
            if (invoice.invoiceFileUrl) {
                const oldFilePath = path.join(projectRoot, invoice.invoiceFileUrl);
                 // Use fs.unlink (non-blocking) for deletion
                fs.unlink(oldFilePath, (err) => {
                    if (err && err.code !== 'ENOENT') { // Ignore 'file not found' errors
                        console.error(`Error deleting old invoice file (${oldFilePath}):`, err);
                    } else if (!err) {
                        console.log(`Successfully deleted old invoice file: ${oldFilePath}`);
                    }
                });
            }
        }
        // --- End File Handling Logic ---


        // Perform the update in the database
        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
            new: true, // Return the modified document rather than the original
            runValidators: true, // Ensure schema validations are run on the update
            context: 'query' // Context needed for some validators with findByIdAndUpdate
        });

         // Check if the update was successful
         if (!updatedInvoice) {
             res.status(404); // Should ideally not happen if found above, but good practice
             return next(new Error('Invoice not found during update process.'));
         }

        res.json(updatedInvoice); // Respond with the updated invoice

    } catch (error) {
         // Handle validation errors
         if (error.name === 'ValidationError') {
            res.status(400);
        }
        next(error); // Pass other errors to the central handler
    }
};


// @desc    Delete an invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res, next) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid Invoice ID format'));
        }

        // Find the invoice to be deleted
        const invoice = await Invoice.findById(req.params.id);

        // Check if invoice exists
        if (!invoice) {
            res.status(404);
            return next(new Error('Invoice not found'));
        }

        // Authorization check
        if (invoice.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to delete this invoice'));
        }

        // --- Optional: Delete associated file before deleting the document ---
        if (invoice.invoiceFileUrl) {
           const filePath = path.join(projectRoot, invoice.invoiceFileUrl);
           // Attempt file deletion
           fs.unlink(filePath, (err) => {
               if (err && err.code !== 'ENOENT') { // Ignore 'file not found'
                    console.error(`Error deleting associated invoice file (${filePath}):`, err);
                } else if (!err) {
                    console.log(`Successfully deleted associated invoice file: ${filePath}`);
                }
           });
        }
        // --- End Optional File Deletion ---

        // Delete the invoice document from the database
        await invoice.deleteOne(); // Use deleteOne on the mongoose document

        res.json({ message: 'Invoice removed successfully' }); // Respond with success message

    } catch (error) {
        next(error); // Pass errors to central handler
    }
};

// Export all controller functions to be used in the routes file
export {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice
};
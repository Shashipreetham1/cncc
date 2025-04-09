import PurchaseOrder from '../models/purchaseOrder.model.js';
import mongoose from 'mongoose';
import fs from 'fs'; // Used for file system operations (deleting files)
import path from 'path'; // Used for constructing file paths
import { fileURLToPath } from 'url'; // Used to get __dirname in ES modules

// --- ES Module equivalent of __dirname (needed for absolute path construction) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Assuming controllers folder is directly inside the backend root
const projectRoot = path.join(__dirname, '..');


// @desc    Create a new Purchase Order
// @route   POST /api/purchase-orders
// @access  Private (Requires authentication via 'protect' middleware)
const createPurchaseOrder = async (req, res, next) => {
    try {
        const poData = { ...req.body };

        // Attempt to parse 'items' if it's sent as a JSON string
        // Common when sending FormData from the frontend
        if (typeof poData.items === 'string') {
            try {
                poData.items = JSON.parse(poData.items);
            } catch (parseError) {
                res.status(400); // Bad Request
                // Provide a clear error message if parsing fails
                return next(new Error('Invalid format for items data. Expected a valid JSON array string.'));
            }
        }

        // Add the purchase order file URL if a file was uploaded
        if (req.file) {
             // Store the relative path, accessible via the static route
            poData.purchaseOrderFileUrl = `/uploads/purchaseOrders/${req.file.filename}`;
        }

        // Add the user ID from the authenticated user (attached by 'protect' middleware)
        poData.createdBy = req.user._id;

        // Create the purchase order document in the database
        const purchaseOrder = await PurchaseOrder.create(poData);
        res.status(201).json(purchaseOrder); // Respond with the created PO and 201 status

    } catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            res.status(400);
        }
        // Handle potential duplicate key error for purchaseOrderNumber if unique index is enabled
        if (error.code === 11000) {
            res.status(400);
            // Customize this message based on which field is unique
            return next(new Error('Purchase Order Number already exists. Please use a unique number.'));
        }
        // Pass any other errors to the central error handler
        next(error);
    }
};

// @desc    Get all Purchase Orders for the logged-in user
// @route   GET /api/purchase-orders
// @access  Private
const getPurchaseOrders = async (req, res, next) => {
    try {
        // Find all purchase orders created by the currently logged-in user
        const purchaseOrders = await PurchaseOrder.find({ createdBy: req.user._id })
                                                .sort({ orderDate: -1 }); // Sort by order date, newest first
        res.json(purchaseOrders); // Respond with the array of POs
    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};

// @desc    Get single Purchase Order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
const getPurchaseOrderById = async (req, res, next) => {
    try {
         // Validate if the provided ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400); // Bad Request
             return next(new Error('Invalid Purchase Order ID format'));
        }

        // Find the purchase order by its ID
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        // If PO is not found, send 404
        if (!purchaseOrder) {
            res.status(404); // Not Found
            return next(new Error('Purchase Order not found'));
        }

        // Authorization check: Ensure the PO belongs to the requesting user
        if (purchaseOrder.createdBy.toString() !== req.user._id.toString()) {
            res.status(403); // Forbidden
            return next(new Error('Not authorized to view this Purchase Order'));
        }

        res.json(purchaseOrder); // Respond with the found PO

    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};


// @desc    Update a Purchase Order
// @route   PUT /api/purchase-orders/:id
// @access  Private
const updatePurchaseOrder = async (req, res, next) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid PO ID format'));
        }

        // --- Find the existing PO FIRST to get old file path ---
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        // Check if PO exists
        if (!purchaseOrder) {
            res.status(404);
            return next(new Error('Purchase Order not found'));
        }

        // Authorization check
        if (purchaseOrder.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to update this Purchase Order'));
        }

        // Prepare update data from request body
        const updateData = { ...req.body };

        // Parse 'items' if sent as string
        if (typeof updateData.items === 'string') {
             try {
                updateData.items = JSON.parse(updateData.items);
            } catch (parseError) {
                res.status(400);
                return next(new Error('Invalid format for items data. Expected a valid JSON array string.'));
            }
        } else if (updateData.items === undefined) {
             // If 'items' is not included in the update request, remove it from updateData
             // so it doesn't overwrite existing items with null/undefined.
             // If you WANT to allow clearing items, remove this `else if`.
             delete updateData.items;
        }


        // --- File Handling Logic ---
        if (req.file) {
            // If a new file is uploaded:
            const newFilePath = `/uploads/purchaseOrders/${req.file.filename}`;
            updateData.purchaseOrderFileUrl = newFilePath; // Set new path for update

            // Attempt to delete the old file if it existed
            if (purchaseOrder.purchaseOrderFileUrl) {
                const oldFilePath = path.join(projectRoot, purchaseOrder.purchaseOrderFileUrl);
                 // Use fs.unlink (non-blocking)
                fs.unlink(oldFilePath, (err) => {
                    if (err && err.code !== 'ENOENT') { // Ignore 'file not found'
                        console.error(`Error deleting old PO file (${oldFilePath}):`, err);
                    } else if (!err) {
                        console.log(`Successfully deleted old PO file: ${oldFilePath}`);
                    }
                });
            }
        }
        // --- End File Handling Logic ---

        // Perform the update in the database
        const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(req.params.id, updateData, {
            new: true, // Return the updated document
            runValidators: true, // Run schema validators on update
            context: 'query' // Provide context for validators
        });

         // Check if update was successful
         if (!updatedPurchaseOrder) {
            res.status(404); // Should not happen often if found above, but handle edge case
            return next(new Error('Purchase Order not found after update attempt'));
        }

        res.json(updatedPurchaseOrder); // Respond with the updated PO

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            res.status(400);
        }
        // Handle duplicate key errors (e.g., unique PO number)
         if (error.code === 11000) {
            res.status(400);
            return next(new Error('Purchase Order Number already exists. Please use a unique number.'));
        }
        next(error); // Pass other errors to central handler
    }
};


// @desc    Delete a Purchase Order
// @route   DELETE /api/purchase-orders/:id
// @access  Private
const deletePurchaseOrder = async (req, res, next) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid PO ID format'));
        }

        // Find the PO to be deleted
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        // Check if PO exists
        if (!purchaseOrder) {
            res.status(404);
            return next(new Error('Purchase Order not found'));
        }

        // Authorization check
        if (purchaseOrder.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to delete this Purchase Order'));
        }

        // --- Optional: Delete associated file before deleting the document ---
        if (purchaseOrder.purchaseOrderFileUrl) {
           const filePath = path.join(projectRoot, purchaseOrder.purchaseOrderFileUrl);
            // Attempt file deletion
           fs.unlink(filePath, (err) => {
               if (err && err.code !== 'ENOENT') { // Ignore 'file not found'
                    console.error(`Error deleting associated PO file (${filePath}):`, err);
                } else if (!err) {
                    console.log(`Successfully deleted associated PO file: ${filePath}`);
                }
           });
        }
        // --- End Optional File Deletion ---

        // Delete the PO document from the database
        await purchaseOrder.deleteOne(); // Use deleteOne on the mongoose document

        res.json({ message: 'Purchase Order removed successfully' }); // Respond with success message

    } catch (error) {
        next(error); // Pass errors to central handler
    }
};

// Export all controller functions
export {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder
};
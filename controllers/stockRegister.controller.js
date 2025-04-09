import StockRegister from '../models/stockRegister.model.js';
import mongoose from 'mongoose';
import fs from 'fs'; // Used for file system operations (deleting files)
import path from 'path'; // Used for constructing file paths
import { fileURLToPath } from 'url'; // Used to get __dirname in ES modules

// --- ES Module equivalent of __dirname (needed for absolute path construction) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Assuming controllers folder is directly inside the backend root
const projectRoot = path.join(__dirname, '..');

// @desc    Create a new Stock Register entry
// @route   POST /api/stock-register
// @access  Private (Requires authentication via 'protect' middleware)
const createStockEntry = async (req, res, next) => {
    try {
        const entryData = { ...req.body };

        // Mongoose handles nested objects like 'rate' and 'particulars' directly from req.body
        // if they are sent correctly structured (e.g., rate[cost]=100, rate[cgst]=5)
        // Or if sent as a JSON object in the body.

        // Add the photo URL if a file was uploaded
        if (req.file) {
            // Store the relative path, accessible via the static route defined in server.js
            entryData.photoUrl = `/uploads/stockPhotos/${req.file.filename}`;
        }

        // Add the user ID from the authenticated user (attached by 'protect' middleware)
        entryData.createdBy = req.user._id;

        // Note: The 'totalRate' will be automatically calculated by the pre-validate hook
        // defined in the StockRegister.model.js file before saving.

        const stockEntry = await StockRegister.create(entryData);
        res.status(201).json(stockEntry); // Respond with the created entry and 201 status

    } catch (error) {
        // Check for Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            res.status(400); // Bad Request status for validation failures
        }
        // Pass any other errors to the central error handler
        next(error);
    }
};

// @desc    Get all Stock Register entries for the logged-in user
// @route   GET /api/stock-register
// @access  Private
const getStockEntries = async (req, res, next) => {
    try {
        // Find all entries created by the currently logged-in user
        const entries = await StockRegister.find({ createdBy: req.user._id })
                                         .sort({ entryDate: -1 }); // Sort by entry date, newest first
        res.json(entries); // Respond with the array of entries
    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};

// @desc    Get single Stock Register entry by ID
// @route   GET /api/stock-register/:id
// @access  Private
const getStockEntryById = async (req, res, next) => {
    try {
        // Validate if the provided ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400); // Bad Request
             return next(new Error('Invalid Stock Entry ID format'));
        }

        // Find the entry by its ID
        const entry = await StockRegister.findById(req.params.id);

        // If entry is not found, send 404
        if (!entry) {
            res.status(404); // Not Found
            return next(new Error('Stock entry not found'));
        }

        // Authorization check: Ensure the entry belongs to the requesting user
        if (entry.createdBy.toString() !== req.user._id.toString()) {
            res.status(403); // Forbidden
            return next(new Error('Not authorized to view this stock entry'));
        }

        res.json(entry); // Respond with the found entry

    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
};

// @desc    Update a Stock Register entry
// @route   PUT /api/stock-register/:id
// @access  Private
const updateStockEntry = async (req, res, next) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid Stock Entry ID format'));
        }

        // --- Find the existing entry FIRST to get old file path ---
        const entry = await StockRegister.findById(req.params.id);

        // Check if entry exists
        if (!entry) {
            res.status(404);
            return next(new Error('Stock entry not found'));
        }

        // Authorization check
        if (entry.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to update this stock entry'));
        }

        // Prepare the update data object from the request body
        const updateData = { ...req.body };

        // Rate and particulars are objects, Mongoose handles their update if sent correctly

        // --- File Handling Logic ---
        if (req.file) {
            // If a new file is uploaded in this request:
            const newFilePath = `/uploads/stockPhotos/${req.file.filename}`;
            updateData.photoUrl = newFilePath; // Set the new path in the data to be updated

            // Attempt to delete the old file, if it existed
            if (entry.photoUrl) {
                const oldFilePath = path.join(projectRoot, entry.photoUrl);
                // Use fs.unlink for deletion (non-blocking). Log errors but don't necessarily stop the update.
                fs.unlink(oldFilePath, (err) => {
                     if (err && err.code !== 'ENOENT') { // Ignore 'file not found' errors
                        console.error(`Error deleting old stock photo (${oldFilePath}):`, err);
                    } else if (!err) {
                        console.log(`Successfully deleted old stock photo: ${oldFilePath}`);
                    }
                });
            }
        }
        // --- End File Handling Logic ---

        // Perform the update in the database
        // The pre-validate hook will handle totalRate calculation if rate components change
        const updatedEntry = await StockRegister.findByIdAndUpdate(req.params.id, updateData, {
            new: true, // Return the modified document rather than the original
            runValidators: true, // Ensure schema validations are run on the update
            context: 'query' // Context needed for some validators with findByIdAndUpdate
        });

        // Check if the update was successful (findByIdAndUpdate returns null if not found)
        if (!updatedEntry) {
            res.status(404); // Should ideally not happen if found above, but good practice
            return next(new Error('Stock entry not found during update process.'));
        }

        res.json(updatedEntry); // Respond with the updated entry

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            res.status(400);
        }
        next(error); // Pass other errors to the central handler
    }
};

// @desc    Delete a Stock Register entry
// @route   DELETE /api/stock-register/:id
// @access  Private
const deleteStockEntry = async (req, res, next) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             res.status(400);
             return next(new Error('Invalid Stock Entry ID format'));
        }

        // Find the entry to be deleted
        const entry = await StockRegister.findById(req.params.id);

        // Check if entry exists
        if (!entry) {
            res.status(404);
            return next(new Error('Stock entry not found'));
        }

        // Authorization check
        if (entry.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('Not authorized to delete this stock entry'));
        }

        // --- Optional: Delete associated file before deleting the document ---
        if (entry.photoUrl) {
           const filePath = path.join(projectRoot, entry.photoUrl);
           // Attempt to delete the file
           fs.unlink(filePath, (err) => {
               if (err && err.code !== 'ENOENT') { // Ignore 'file not found'
                    console.error(`Error deleting associated stock photo (${filePath}):`, err);
                } else if (!err) {
                    console.log(`Successfully deleted associated stock photo: ${filePath}`);
                }
           });
        }
        // --- End Optional File Deletion ---

        // Delete the entry from the database
        await entry.deleteOne(); // Use deleteOne on the mongoose document

        res.json({ message: 'Stock entry removed successfully' }); // Respond with success message

    } catch (error) {
        next(error); // Pass errors to the central handler
    }
};

// Export all controller functions to be used in the routes file
export {
    createStockEntry,
    getStockEntries,
    getStockEntryById,
    updateStockEntry,
    deleteStockEntry
};
import multer from 'multer';

// Middleware to handle requests for routes that don't exist (404 Not Found)
const notFound = (req, res, next) => {
    // Create a new Error object with a specific message indicating the requested URL
    const error = new Error(`Not Found - ${req.originalUrl}`);
    // Set the response status code to 404
    res.status(404);
    // Pass the error object to the next middleware in the chain (which should be the errorHandler)
    next(error);
};
  
  
// General error handling middleware (must have 4 arguments: err, req, res, next)
const errorHandler = (err, req, res, next) => {
    // Determine the status code:
    // If the response status code is already set and is not the default 200, use it.
    // Otherwise, default to 500 (Internal Server Error).
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    // Start with the error message provided by the error object.
    let message = err.message;
  
    // --- Specific Error Handling ---
  
    // Mongoose Bad ObjectId Error (CastError)
    // Happens when an invalid ID format is passed in req.params
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404; // Treat as Not Found, as the specific resource ID is invalid
        message = 'Resource not found (Invalid ID format)';
        console.error(`CastError for ObjectId: Path=${err.path}, Value=${err.value}`); // Log details
    }
  
    // Mongoose Validation Error
    // Triggered by schema validation failures (e.g., required fields missing, min/max constraints)
    if (err.name === 'ValidationError') {
        statusCode = 400; // Bad Request, as the input data is invalid
        // You can provide a more detailed message by joining individual error messages
        const validationErrors = Object.values(err.errors).map(el => el.message);
        message = `Invalid input data: ${validationErrors.join('. ')}`;
        console.error(`ValidationError:`, err.errors); // Log details
    }
  
    // Mongoose Duplicate Key Error (code 11000)
    // Happens when trying to insert/update data violating a unique index (e.g., unique username)
    if (err.code === 11000) {
        statusCode = 400; // Bad Request
        const field = Object.keys(err.keyValue)[0]; // Get the field that caused the error
        const value = err.keyValue[field];
        message = `Duplicate field value entered. The value '${value}' already exists for field '${field}'.`;
        console.error(`Duplicate Key Error (11000): Field=${field}, Value=${value}`); // Log details
    }
  
    // --- JWT Authentication Errors (Example) ---
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401; // Unauthorized
        message = 'Not authorized, token failed (invalid signature or structure)';
        console.error(`JsonWebTokenError: ${err.message}`);
    }
  
    if (err.name === 'TokenExpiredError') {
        statusCode = 401; // Unauthorized
        message = 'Not authorized, token expired';
        console.error(`TokenExpiredError: Expired at ${new Date(err.expiredAt)}`);
    }
  
    // --- Multer Errors (Example) ---
    if (err instanceof multer.MulterError) {
        statusCode = 400; // Bad Request
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = `File too large. Maximum size is ${err.field ? err.field.sizeLimit : 'not specified'}.`; // Adjust message as needed
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = `Unexpected file field: ${err.field}. Check the 'name' attribute in your form input.`;
        } else {
            message = `File upload error: ${err.message}`;
        }
        console.error(`MulterError (${err.code}): ${err.message}`);
    } else if (err.message.startsWith('Error: File upload only supports') || err.message.startsWith('Error: Image upload only supports')) {
        // Catch the custom file filter errors from upload.middleware.js
        statusCode = 400; // Bad Request
        message = err.message; // Use the message defined in the file filter
        console.error(`File Filter Error: ${err.message}`);
    }
  
  
    // Send the final JSON error response
    res.status(statusCode).json({
        message: message, // The determined error message
        // Include the stack trace only when not in production for debugging purposes
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack, // Use '🥞' or null in prod
    });
};
  
// Export the middleware functions
export { notFound, errorHandler };
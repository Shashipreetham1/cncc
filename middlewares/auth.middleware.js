import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; // Adjust path as needed

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token payload (excluding the password)
      // Attach user object to the request
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
         res.status(401);
         throw new Error('Not authorized, user not found');
      }

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error('Authentication Error:', error.message);
      res.status(401); // Unauthorized
      // Provide a clearer error message based on the type of error
      if (error.name === 'JsonWebTokenError') {
          next(new Error('Not authorized, token failed (invalid)'));
      } else if (error.name === 'TokenExpiredError') {
          next(new Error('Not authorized, token expired'));
      } else {
          next(new Error('Not authorized, token failed'));
      }
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

// Optional: Middleware to check if user is an admin (if needed later)
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) { // Assuming you add an isAdmin field to User model
    next();
  } else {
    res.status(403); // Forbidden
    throw new Error('Not authorized as an admin');
  }
};

export { protect, admin }; // Export protect and admin middleware
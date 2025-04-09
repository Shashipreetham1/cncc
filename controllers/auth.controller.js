import User from '../models/user.model.js';
import generateToken from '../utils/generateToken.js'; // Adjust path

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signupUser = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400); // Bad Request
    return next(new Error('Please provide username and password'));
  }

  try {
    const userExists = await User.findOne({ username: username.toLowerCase() });

    if (userExists) {
      res.status(400); // Bad Request
      return next(new Error('Username already exists'));
    }

    const user = await User.create({
      username: username.toLowerCase(),
      password, // Password will be hashed by the pre-save hook in the model
    });

    if (user) {
      res.status(201).json({ // 201 Created
        _id: user._id,
        username: user.username,
        token: generateToken(user._id), // Generate JWT token
        createdAt: user.createdAt,
      });
    } else {
      res.status(400);
      next(new Error('Invalid user data'));
    }
  } catch (error) {
     // Handle potential validation errors from Mongoose
     if (error.name === 'ValidationError') {
        res.status(400);
     }
     next(error); // Pass error to the global error handler
  }
};

// @desc    Authenticate user & get token (Sign In)
// @route   POST /api/auth/signin
// @access  Public
const signinUser = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    return next(new Error('Please provide username and password'));
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
        createdAt: user.createdAt,
      });
    } else {
      res.status(401); // Unauthorized
      next(new Error('Invalid username or password'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile (Example of a protected route)
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
    // req.user is attached by the 'protect' middleware
    try {
        const user = await User.findById(req.user._id).select('-password'); // Exclude password

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } else {
            res.status(404);
            next(new Error('User not found'));
        }
    } catch (error) {
        next(error);
    }
};


export { signupUser, signinUser, getUserProfile };
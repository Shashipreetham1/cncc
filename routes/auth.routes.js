import express from 'express';
import { signupUser, signinUser, getUserProfile } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js'; // Import protect middleware

const router = express.Router();

router.post('/signup', signupUser);
router.post('/signin', signinUser);
router.get('/profile', protect, getUserProfile); // Protect the profile route

export default router;
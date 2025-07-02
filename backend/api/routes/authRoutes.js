import express from 'express';
import { 
  signup,
  verifyEmail,
  login,
  checkVerification,
  reset,
  verifyReset,
  checkResetVerification
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.get('/verify', verifyEmail);
router.post('/login', login);
router.get('/verify-status', checkVerification);
router.post('/reset', reset);
router.get('/verifyReset', verifyReset);

// Use this route for reset polling:
router.get('/check-reset-verification', checkResetVerification);

export default router;

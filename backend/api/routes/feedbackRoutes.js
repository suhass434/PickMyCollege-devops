import express from 'express';
import { handleFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

// POST /handleFeedback
router.post('/', handleFeedback);

export default router;
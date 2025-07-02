import express from 'express';
import { handleRecommendation } from '../controllers/collegeController.js';

const router = express.Router();

// POST /collegeList
router.post('/', handleRecommendation);

export default router;

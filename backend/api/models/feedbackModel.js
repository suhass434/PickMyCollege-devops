import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const feedbackDB = mongoose.connection.useDb('feedback');

const statsSchema = new mongoose.Schema({
  anonymous_user_id: {
    type: mongoose.Schema.Types.UUID,
    default: () => randomUUID()
  },
  user_rating: {
    type: Number,
    required: true,
    default: 0
  },
  user_feedback: {
    type: String,
    required: true,
    default: '0'
  },
  timestamp: {
    type: Date,
    default: () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(now.getTime() + istOffset);
    }
  }
});

const Feedback = feedbackDB.model('feedback', statsSchema); 

export default Feedback;
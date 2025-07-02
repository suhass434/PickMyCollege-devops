import Feedback from '../models/feedbackModel.js';

export const handleFeedback = async (req, res) => {
  const { ratings, message } = req.body;

  try {
    const new_feedback = new Feedback({
      user_rating: parseInt(ratings, 10),
      user_feedback: message.toString()
    });

    await new_feedback.save();
    console.log('Feedback saved successfully');
    res.status(201).json({ message: 'Feedback saved successfully' });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
};

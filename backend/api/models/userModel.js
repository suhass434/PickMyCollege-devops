import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: false
  },
  email: {
    type: String,
    required: true,
    unique: true  
  },
  password: {
    type: String,
    required: true  
  },
  isVerified: {
    type: Boolean,
    default: false  
  },
  tokenVersion: {
    type: Number,
    default: 0  
  }
});

export default mongoose.model('User', userSchema);

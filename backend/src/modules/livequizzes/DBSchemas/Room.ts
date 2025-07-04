import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  answerIndex: { type: Number, required: true },
  answeredAt: { type: Date, default: Date.now }
});

const PollSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  correctOptionIndex: { type: Number, default: -1 },
  timer: { type: Number, default: 30 },
  createdAt: { type: Date, default: Date.now },
  answers: [AnswerSchema]
});

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  teacherId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  polls: [PollSchema]
});

export const Room = mongoose.model('Room', RoomSchema);

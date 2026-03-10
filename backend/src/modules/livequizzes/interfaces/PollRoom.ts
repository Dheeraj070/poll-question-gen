import { JwtPayload } from "jsonwebtoken";

export interface PollAnswer {
  userId: string;
  answerIndex: number;
  answeredAt: Date;
  points?: number;
}

export interface Poll {
  _id: string; // uuid string
  question: string;
  options: string[];
  correctOptionIndex: number;
  timer: number;
  maxPoints?: number;
  createdAt: Date;
  answers: PollAnswer[];
}

export interface Room {
  roomCode: string;
  name: string;
  teacherId: string;
  teacherName?: string;
  createdAt: Date;
  status: 'active' | 'ended';
  polls: Poll[];
  controls?: {
    micBlocked: boolean;
    pollRestricted: boolean;
  };
}

export interface CohostJwtPayload extends JwtPayload {
  roomId: string;
  jti: string;
}

export interface GetCohostRoom {
  rooms: Room[];
  count: number;
}

export interface ActiveCohost {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  addedAt: Date;
}


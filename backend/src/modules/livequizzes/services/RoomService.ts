import { injectable } from 'inversify';
import { Room } from '../../../shared/database/models/Room.js';
import type { Room as RoomType, Poll, PollAnswer } from '../interfaces/PollRoom.js';
import { UserModel } from '../../../shared/database/models/User.js';
import {ObjectId} from 'mongodb'
import { NotFoundError } from 'routing-controllers';

@injectable()
export class RoomService {
  private userModel = UserModel;
  private roomModel = Room;
  async createRoom(name: string, teacherId: string): Promise<RoomType> {
    try {
      if (!name || !teacherId) {
        throw new Error('Room name and teacher ID are required');
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const teachername = await this.userModel.findOne({ firebaseUID: teacherId }).lean();
      const newRoom = await new Room({
        roomCode: code,
        name,
        teacherId,
        teacherName: `${teachername?.firstName} ${teachername?.lastName}`.trim(),
        createdAt: new Date(),
        status: 'active',
        polls: []
      }).save();

      return newRoom.toObject();  // return plain object
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create room');
    }
  }

  async getRoomByCode(code: string): Promise<RoomType | null> {
    try {
      if (!code) {
        throw new Error('Room code is required');
      }

      return await Room.findOne({ roomCode: code }).populate('students','firstName email').lean();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get room by code');
    }
  }

  async getRoomsByTeacher(teacherId: string, status?: 'active' | 'ended'): Promise<RoomType[]> {
    try {
      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }

      const query: any = { teacherId };
      if (status) {
        query.status = status;
      }
      return await Room.find(query).sort({ createdAt: -1 }).lean();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get rooms by teacher');
    }
  }

  async getUsersByIds(userIds: string[]) {
    return await this.userModel.find(
      { uid: { $in: userIds } },
      'uid name'
    ).lean();
  }
  
  async getPollAnalysis(roomCode: string) {
    try {
      if (!roomCode) {
        throw new Error('Room code is required');
      }

      // 1️⃣ Find the room by code
      const room = await this.roomModel.findOne({ roomCode }).lean();
      if (!room) throw new NotFoundError('Room not found');

      const participantsMap = new Map<string, {
        userId: string;
        correct: number;
        wrong: number;
        score: number;
        timeTaken: number;
      }>();

    // 2️⃣ Process each poll and answers
    for (const poll of room.polls) {
      for (const answer of poll.answers) {
        if (!participantsMap.has(answer.userId)) {
          participantsMap.set(answer.userId, {
            userId: answer.userId,
            correct: 0,
            wrong: 0,
            score: 0,
            timeTaken: 0,
          });
        }
        const participant = participantsMap.get(answer.userId)!;

        if (answer.answerIndex === poll.correctOptionIndex) {
          participant.correct += 1;
          participant.score += 5; // example scoring
        } else {
          participant.wrong += 1;
          participant.score -= 2;
        }

        // Calculate time taken for this answer (in seconds)
        const answerTime = (answer.answeredAt.getTime() - poll.createdAt.getTime()) / 1000;
        participant.timeTaken += answerTime;
      }
    }

    // 3️⃣ Fetch user names (THIS IS WHERE to add)
    const userIds = Array.from(participantsMap.keys());
    const users = await this.userModel.find({ firebaseUID: { $in: userIds } }, 'firebaseUID firstName').lean();

    // 4️⃣ Convert map to array and merge names
    const participants = Array.from(participantsMap.values()).map((p) => {
      const user = users.find(u => u.firebaseUID === p.userId);
      
      // Format time taken - convert seconds to minutes and seconds
      let timeDisplay = "N/A";
      if (p.timeTaken > 0) {
        const totalSeconds = Math.round(p.timeTaken);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        if (minutes > 0) {
          timeDisplay = `${minutes}m ${seconds}s`;
        } else {
          timeDisplay = `${seconds}s`;
        }
      }
      
      return {
        name: user?.firstName ?? 'Anonymous',
        score: p.score,
        correct: p.correct,
        wrong: p.wrong,
        timeTaken: timeDisplay
      };
    });

    // Sort descending by score
    participants.sort((a, b) => b.score - a.score);

    // 5️⃣ Build question-level stats
    const questions = room.polls.map((poll) => ({
      text: poll.question,
      correctCount: poll.answers.filter(
        a => a.answerIndex === poll.correctOptionIndex
      ).length
    }));

    return {
      id: room._id,
      name: room.name,
      createdAt: room.createdAt,
      duration: room.endedAt && room.createdAt
        ? Math.ceil((room.endedAt.getTime() - room.createdAt.getTime()) / 60000) + ' mins'
        : 'N/A',
      participants,
      questions,
    };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to get poll analysis');
    }
  }
  
  async getRoomsByTeacherAndStatus(teacherId: string, status: 'active' | 'ended'): Promise<RoomType[]> {
    try {
      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }
      if (!status) {
        throw new Error('Status is required');
      }

      return await Room.find({ teacherId, status }).lean();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get rooms by teacher and status');
    }
  }

  async isRoomValid(code: string): Promise<boolean> {
    try {
      if (!code) {
        throw new Error('Room code is required');
      }

      const room = await Room.findOne({ roomCode: code }).lean();
      return !!room && room.status.toLowerCase() === 'active';
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to check if room is valid');
    }
  }

  async isRoomEnded(code: string): Promise<boolean> {
    try {
      if (!code) {
        throw new Error('Room code is required');
      }

      const room = await Room.findOne({ roomCode: code }).lean();
      return room ? room.status === 'ended' : false;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to check if room is ended');
    }
  }

  async endRoom(code: string): Promise<boolean> {
    try {
      if (!code) {
        throw new Error('Room code is required');
      }

      const updated = await Room.findOneAndUpdate({ roomCode: code }, { status: 'ended' }, { new: true }).lean();
      return !!updated;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to end room');
    }
  }

  async canJoinRoom(code: string): Promise<boolean> {
    try {
      if (!code) {
        throw new Error('Room code is required');
      }

      const room = await Room.findOne({ roomCode: code }).lean();
      return !!room && room.status === 'active';
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to check if can join room');
    }
  }

  async getAllRooms(): Promise<RoomType[]> {
    return await Room.find().lean();
  }

  async getActiveRooms(): Promise<RoomType[]> {
    return await Room.find({ status: 'active' }).lean();
  }

  async getEndedRooms(): Promise<RoomType[]> {
    return await Room.find({ status: 'ended' }).lean();
  }
  /**
   * Map Mongoose Room Document to plain RoomType matching interface
   */
  private mapRoom(roomDoc: any): RoomType {
    return {
      roomCode: roomDoc.roomCode,
      name: roomDoc.name,
      teacherId: roomDoc.teacherId,
      createdAt: roomDoc.createdAt,
      status: roomDoc.status,
      polls: (roomDoc.polls || []).map((p: any): Poll => ({
        _id: p._id.toString(),  // convert ObjectId to string if needed
        question: p.question,
        options: p.options,
        correctOptionIndex: p.correctOptionIndex,
        timer: p.timer,
        createdAt: p.createdAt,
        answers: (p.answers || []).map((a: any): PollAnswer => ({
          userId: a.userId,
          answerIndex: a.answerIndex,
          answeredAt: a.answeredAt
        }))
      }))
    };
  }


  async enrollStudent(userId:string,roomCode:string){
    try {
      if (!userId || !roomCode) {
        throw new Error('User ID and room code are required');
      }

      const room = await Room.findOne({roomCode})
      if(!room){
        throw new NotFoundError("Room is not found")
      }
      const userObjectId=new ObjectId(userId)
      const isAlreadyEnrolled = room.students.some((id) => id.equals(userObjectId))
      if(isAlreadyEnrolled){
        console.log("User Already enrolled in the course")
        return room
      }
      const updatedRoom = await Room.findOneAndUpdate({roomCode},{$addToSet:{students:userObjectId}},{new:true})
      return updatedRoom
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to enroll student');
    }
  }

  async unEnrollStudent(userId:string,roomCode:string){
    try {
      if (!userId || !roomCode) {
        throw new Error('User ID and room code are required');
      }

      const room = await Room.findOne({roomCode})
      if(!room){
        throw new NotFoundError("Room is not found")
      }
      const userObjectId=new ObjectId(userId)
      const isAlreadyEnrolled = room.students.some((id) => id.equals(userObjectId))
      if(!isAlreadyEnrolled){
        console.log("User Not enrolled in the course")
        return room
      }
      const updatedRoom = await Room.findOneAndUpdate({roomCode},{$pull:{students:userObjectId}},{new:true})
      return updatedRoom
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to unenroll student');
    }
  }
}

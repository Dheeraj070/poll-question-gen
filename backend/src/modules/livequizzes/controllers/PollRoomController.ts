import {
  JsonController,
  Post,
  Get,
  Body,
  Param,
  Authorized,
  HttpCode,
  Req,
  Res,
  NotFoundError,
  Delete,
  BadRequestError,
} from 'routing-controllers';
import { Request, Response } from 'express';
import multer from 'multer';
import { pollSocket } from '../utils/PollSocket.js';
import { inject, injectable } from 'inversify';
import { RoomService } from '../services/RoomService.js';
import { PollService } from '../services/PollService.js';
import { LIVE_QUIZ_TYPES } from '../types.js';
//import { TranscriptionService } from '#root/modules/genai/services/TranscriptionService.js';
import { AIContentService } from '#root/modules/genai/services/AIContentService.js';
import { VideoService } from '#root/modules/genai/services/VideoService.js';
import { AudioService } from '#root/modules/genai/services/AudioService.js';
import { CleanupService } from '#root/modules/genai/services/CleanupService.js';
import type { QuestionSpec } from '#root/modules/genai/services/AIContentService.js';
// import type { File as MulterFile } from 'multer';
import { OpenAPI } from 'routing-controllers-openapi';
import dotenv from 'dotenv';
import mime from 'mime-types';
import * as fsp from 'fs/promises';
import { CreateInMemoryPollDto, InMemoryPollResponse, InMemoryPollResult, SubmitInMemoryAnswerDto } from '../validators/LivepollValidator.js';
import { validate } from 'class-validator';

dotenv.config();
const appOrigins = process.env.APP_ORIGINS;

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}
const upload = multer({ dest: 'uploads/' });

@injectable()
@OpenAPI({tags: ['Rooms'],})
@JsonController('/livequizzes/rooms')
export class PollRoomController {
  constructor(
    @inject(LIVE_QUIZ_TYPES.VideoService) private videoService: VideoService,
    @inject(LIVE_QUIZ_TYPES.AudioService) private audioService: AudioService,
    //@inject(LIVE_QUIZ_TYPES.TranscriptionService) private transcriptionService: TranscriptionService,
    @inject(LIVE_QUIZ_TYPES.AIContentService) private aiContentService: AIContentService,
    @inject(LIVE_QUIZ_TYPES.CleanupService) private cleanupService: CleanupService,
    @inject(LIVE_QUIZ_TYPES.RoomService) private roomService: RoomService,
    @inject(LIVE_QUIZ_TYPES.PollService) private pollService: PollService,
  ) { }

  //@Authorized(['teacher'])
  @Post('/')
  async createRoom(@Body() body: { name: string; teacherId: string }, @Res() res: Response): Promise<any> {
    try {
      if (!body.name || !body.teacherId) {
        return res.status(400).json({
          success: false,
          message: 'Room name and teacher ID are required',
          data: null,
        });
      }

      const room = await this.roomService.createRoom(body.name, body.teacherId);
      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: {
          ...room,
          inviteLink: `${appOrigins}/student/pollroom/${room.roomCode}`,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  //@Authorized()
  @Get('/:code')
  async getRoom(@Param('code') code: string, @Res() res: Response): Promise<any> {
    try {
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Room code is required',
          data: null,
        });
      }

      const room = await this.roomService.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: null,
        });
      }
      if (room.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Room is ended',
          data: null,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Room retrieved successfully',
        data: room,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }  

  // 🔹 Create Poll in Room
  //@Authorized(['teacher','admin'])
  @Post('/:code/polls')
  async createPollInRoom(
    @Param('code') roomCode: string,
    @Body() body: { question: string; options: string[]; correctOptionIndex: number; creatorId: string; timer?: number },
    @Res() res: Response
  ): Promise<any> {
    try {
      if (!roomCode || !body.question || !body.options || body.correctOptionIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Room code, question, options, and correct option index are required',
          data: null,
        });
      }

      const room = await this.roomService.getRoomByCode(roomCode);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Invalid room',
          data: null,
        });
      }

      const poll = await this.pollService.createPoll(
        roomCode,
        {
          question: body.question,
          options: body.options,
          correctOptionIndex: body.correctOptionIndex,
          timer: body.timer
        }
      );

      return res.status(201).json({
        success: true,
        message: 'Poll created successfully',
        data: poll,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  //@Authorized(['teacher'])
  @Get('/teacher/:teacherId')
  async getAllRoomsByTeacher(@Param('teacherId') teacherId: string, @Res() res: Response): Promise<any> {
    try {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID is required',
          data: null,
        });
      }

      const rooms = await this.roomService.getRoomsByTeacher(teacherId);
      return res.status(200).json({
        success: true,
        message: 'Rooms retrieved successfully',
        data: rooms,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }
  //@Authorized(['teacher'])
  @Get('/teacher/:teacherId/active')
  async getActiveRoomsByTeacher(@Param('teacherId') teacherId: string, @Res() res: Response): Promise<any> {
    try {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID is required',
          data: null,
        });
      }

      const rooms = await this.roomService.getRoomsByTeacherAndStatus(teacherId, 'active');
      return res.status(200).json({
        success: true,
        message: 'Active rooms retrieved successfully',
        data: rooms,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }
  //@Authorized(['teacher'])
  @Get('/teacher/:teacherId/ended')
  async getEndedRoomsByTeacher(@Param('teacherId') teacherId: string, @Res() res: Response): Promise<any> {
    try {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID is required',
          data: null,
        });
      }

      const rooms = await this.roomService.getRoomsByTeacherAndStatus(teacherId, 'ended');
      return res.status(200).json({
        success: true,
        message: 'Ended rooms retrieved successfully',
        data: rooms,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  //@Authorized(['teacher'])
  @Get('/:roomId/analysis')
  async getPollAnalysis(@Param('roomId') roomId: string, @Res() res: Response): Promise<any> {
    try {
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required',
          data: null,
        });
      }

      const analysis = await this.roomService.getPollAnalysis(roomId);
      return res.status(200).json({
        success: true,
        message: 'Poll analysis retrieved successfully',
        data: analysis,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  //@Authorized()
  @Post('/:code/polls/answer')
  async submitPollAnswer(
    @Param('code') roomCode: string,
    @Body() body: { pollId: string; userId: string; answerIndex: number },
    @Res() res: Response
  ): Promise<any> {
    try {
      if (!roomCode || !body.pollId || !body.userId || body.answerIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Room code, poll ID, user ID, and answer index are required',
          data: null,
        });
      }

      await this.pollService.submitAnswer(roomCode, body.pollId, body.userId, body.answerIndex);
      const updatedResults = await this.pollService.getPollResults(roomCode);
      pollSocket.emitToRoom(roomCode,'poll-results-updated', updatedResults);
      return res.status(200).json({
        success: true,
        message: 'Answer submitted successfully',
        data: null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  // Fetch Results for All Polls in Room
  //@Authorized()
  @Get('/:code/polls/results')
  async getResultsForRoom(@Param('code') code: string, @Res() res: Response): Promise<any> {
    try {
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Room code is required',
          data: null,
        });
      }

      const results = await this.pollService.getPollResults(code);
      return res.status(200).json({
        success: true,
        message: 'Poll results retrieved successfully',
        data: results,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  //@Authorized(['teacher'])
  @Post('/:code/end')
  async endRoom(@Param('code') code: string, @Res() res: Response): Promise<any> {
    try {
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Room code is required',
          data: null,
        });
      }

      const success = await this.roomService.endRoom(code);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: null,
        });
      }

      // Emit to all clients in the room
      pollSocket.emitToRoom(code, 'room-ended', {});
      return res.status(200).json({
        success: true,
        message: 'Room ended successfully',
        data: null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

@Get('/youtube-audio')
@HttpCode(200)
async getYoutubeAudio(@Req() req: Request, @Res() res: Response) {
  const youtubeUrl = req.query.url as string;
  const tempPaths: string[] = [];
  try {
    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Missing YouTube URL.' });
    }
    console.log('Received YouTube URL:', youtubeUrl);
    // 1. Download the YouTube video (MP4 or similar)
    const videoPath = await this.videoService.downloadVideo(youtubeUrl);
    tempPaths.push(videoPath);

    // 2. Extract audio from video (MP3 or WAV)
    const audioPath = await this.audioService.extractAudio(videoPath);
    tempPaths.push(audioPath);

    // 3. Stream audio file to the client
    const mimeType = mime.lookup(audioPath) || 'audio/mpeg';
    const audioBuffer = await fsp.readFile(audioPath); 

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Content-Disposition', 'inline');

    console.log("🧪 Audio path:", audioPath);
    console.log("📦 Audio buffer size:", audioBuffer.length); // << This will likely be 44
    return res.send(audioBuffer);
  } catch (error: any) {
    console.error('Error in /youtube-audio:', error);
    await this.cleanupService.cleanup(tempPaths);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}

  // 🔹 AI Question Generation from transcript or YouTube
  //@Authorized(['teacher'])
  @Post('/:code/generate-questions')
  @HttpCode(200)
  async generateQuestionsFromTranscript(
    @Req() req: Request,
    @Res() res: Response
  ) {
    const tempPaths: string[] = [];

    await new Promise<void>((resolve, reject) => {
      upload.single('file')(req, res, (err) => (err ? reject(err) : resolve()));
    });

    try {
      const { transcript, questionSpec, model, questionCount } = req.body;

      const SEGMENTATION_THRESHOLD = parseInt(process.env.TRANSCRIPT_SEGMENTATION_THRESHOLD || '6000', 10);
      const defaultModel = 'gemma3';
      const selectedModel = model?.trim() || defaultModel;

      // Parse questionCount with default value
      const numQuestions = questionCount ? parseInt(questionCount, 10) : 2;

      let segments: Record<string, string>;
      if (transcript.length <= SEGMENTATION_THRESHOLD) {
        console.log('[generateQuestions] Small transcript detected. Using full transcript without segmentation.');
        console.log('Transcript:', transcript);
        segments = { full: transcript };
      } else {
        console.log('[generateQuestions] Transcript is long; running segmentation...');
        segments = await this.aiContentService.segmentTranscript(transcript, selectedModel);
      }

      // ✅ Safe default questionSpec with custom count
      let safeSpec: QuestionSpec[] = [{ SOL: numQuestions }];
      if (questionSpec && typeof questionSpec === 'object' && !Array.isArray(questionSpec)) {
        safeSpec = [questionSpec];
      } else if (Array.isArray(questionSpec) && typeof questionSpec[0] === 'object') {
        safeSpec = questionSpec;
      } else {
        console.warn(`Invalid questionSpec provided; using default [{ SOL: ${numQuestions} }]`);
      }
      console.log('Using questionSpec:', safeSpec);
      console.log('[generateQuestions] Transcript length:', transcript.length);
      console.log('[generateQuestions] Transcript preview:', segments);
     
      console.log('[generateQuestions] Number of questions to generate:', numQuestions);
      const generatedQuestions = await this.aiContentService.generateQuestions({
        segments,
        globalQuestionSpecification: safeSpec,
        model: selectedModel,
      });

      return res.json({
        message: 'Questions generated successfully from transcript.',
        transcriptPreview: transcript.substring(0, 200) + '...',
        segmentsCount: Object.keys(segments).length,
        totalQuestions: generatedQuestions.length,
        requestedQuestions: numQuestions,
        questions: generatedQuestions,
      });
    } catch (err: any) {
      console.error('Error generating questions:', err);
      return res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
    } finally {
      await this.cleanupService.cleanup(tempPaths);
    }
  }
  
}
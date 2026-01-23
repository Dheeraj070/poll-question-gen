import { User } from '#auth/classes/transformers/User.js';
import { UserService } from '#users/services/UserService.js';
import { USERS_TYPES } from '#users/types.js';
import { injectable, inject } from 'inversify';
import {
  JsonController,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  Param,
  Params,
  NotFoundError,
  Patch,
  BadRequestError,
  Res,
} from 'routing-controllers';
import { Response } from 'express';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import {
  UserByFirebaseUIDParams,
  UserByFirebaseUIDResponse,
  UserNotFoundErrorResponse,
  UpdateUserProfileBody,
  CreateUserProfileBody,
  UserProfileResponse,
} from '../classes/validators/UserValidators.js';
import { UserModel } from '#root/shared/database/models/User.js';

@OpenAPI({ tags: ['Users'] })
@JsonController('/users', { transformResponse: true })
@injectable()
export class UserController {
  constructor(
    @inject(USERS_TYPES.UserService)
    private readonly userService: UserService,
  ) { }

  /**
   * Get full user object by Firebase UID (transformed)
   */
  @OpenAPI({
    summary: 'Get user by Firebase UID',
    description: 'Retrieves a full user object using their Firebase UID.',
  })
  @Get('/firebase/:firebaseUID')
  @HttpCode(200)
  @ResponseSchema(UserByFirebaseUIDResponse)
  @ResponseSchema(UserNotFoundErrorResponse, { statusCode: 404 })
  async getUserByFirebaseUID(
    @Params() params: UserByFirebaseUIDParams,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const user = await this.userService.findByFirebaseUID(params.firebaseUID);
      return res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: new User(user),
      });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  /**
   *  Find or create user by Firebase UID
   */
  @OpenAPI({
    summary: 'Find or create user by Firebase UID',
    description: 'If user does not exist with the given UID, creates one.',
  })
  @Post('/firebase/:firebaseUID/profile')
  @HttpCode(201)
  @ResponseSchema(UserProfileResponse)
  async findOrCreateProfileByFirebaseUID(
    @Param('firebaseUID') firebaseUID: string,
    @Body() body: CreateUserProfileBody,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const user = await this.userService.findOrCreateByFirebaseUID(firebaseUID, body);
      return res.status(201).json({
        success: true,
        message: 'User profile created or retrieved successfully',
        data: {
          id: user._id?.toString() || '',
          firebaseUID: user.firebaseUID,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar || null,
          role: user.role || null,
          dateOfBirth: user.dateOfBirth || null,
          address: user.address || null,
          emergencyContact: user.emergencyContact || null,
          phoneNumber: user.phoneNumber || null,
          institution: user.institution || null,
          designation: user.designation || null,
          bio: user.bio || null,
          isVerified: user.isVerified || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
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

  /**
   *  Get user profile by internal ID
   */
  @OpenAPI({
    summary: 'Get user profile by internal user ID',
  })
  @Get('/:id/profile')
  @HttpCode(200)
  @ResponseSchema(UserProfileResponse)
  async getProfile(@Param('id') id: string, @Res() res: Response): Promise<any> {
    try {
      const user = await this.userService.getProfile(id);
      return res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  /**
   *  Update profile by internal ID
   */
  @OpenAPI({
    summary: 'Update user profile by internal user ID',
  })
  @Put('/:id/profile')
  @HttpCode(200)
  @ResponseSchema(UserProfileResponse)
  async updateProfile(
    @Param('id') id: string,
    @Body() body: UpdateUserProfileBody,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const updated = await this.userService.updateProfile(id, body);
      return res.status(200).json({
        success: true,
        message: 'User profile updated successfully',
        data: updated,
      });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  /**
   *  Get simple profile by Firebase UID (raw JSON)
   */
  @OpenAPI({
    summary: 'Get user profile by Firebase UID (plain JSON)',
  })
  @Get('/firebase/:firebaseUID/profile')
  @HttpCode(200)
  @ResponseSchema(UserProfileResponse)
  async getProfileByFirebaseUID(
    @Param('firebaseUID') firebaseUID: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const user = await this.userService.findByFirebaseUID(firebaseUID);
      return res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          id: user._id?.toString() || '',
          firebaseUID: user.firebaseUID,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar || null,
          role: user.role || null,
          dateOfBirth: user.dateOfBirth || null,
          address: user.address || null,
          emergencyContact: user.emergencyContact || null,
          phoneNumber: user.phoneNumber || null,
          institution: user.institution || null,
          designation: user.designation || null,
          bio: user.bio || null,
          isVerified: user.isVerified || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }

  /**
   * Update a user's role by Firebase UID
   */
  @OpenAPI({
    summary: 'Update user role by Firebase UID',
    description: 'Updates the role of a user identified by Firebase UID.',
  })
  @Patch('/firebase/:firebaseUID/role')
  @HttpCode(200)
  async updateRole(
    @Param('firebaseUID') firebaseUID: string,
    @Body() body: { role: string },
    @Res() res: Response,
  ): Promise<any> {
    try {
      const { role } = body;
      if (!role || typeof role !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Role must be a non-empty string',
          data: null,
        });
      }

      const updatedUser = await this.userService.updateRoleByFirebaseUID(firebaseUID, role);
      return res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: {
          id: updatedUser._id?.toString() || '',
          firebaseUID: updatedUser.firebaseUID,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      });
    }
  }
}
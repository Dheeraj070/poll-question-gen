import { JsonController, Get, Param, Authorized, Res } from 'routing-controllers';
import { Response } from 'express';
import { inject, injectable } from 'inversify';
import { DashboardService } from '../services/DashboardService.js';
import { OpenAPI } from 'routing-controllers-openapi';

@injectable()
@JsonController()
@OpenAPI({ tags: ['Dashboards'], })
// @Authorized(['admin', 'teacher']) // only teachers/admins can fetch other students
export class DashboardController {
    constructor(
        @inject(DashboardService) private dashboardService: DashboardService
    ) { }

    // Student Dashboard
    //@Authorized(['student'])
    @Get('/students/dashboard/:studentId')
    async getStudentDashboard(@Param('studentId') studentId: string, @Res() res: Response): Promise<any> {
        try {
            const data = await this.dashboardService.getStudentDashboardData(studentId);
            return res.status(200).json({
                success: true,
                message: 'Student dashboard data retrieved successfully',
                data,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Internal Server Error',
                data: null,
            });
        }
    }

    // Teacher Dashboard
    //@Authorized(['teacher'])
    @Get('/teachers/dashboard/:teacherId')
    async getTeacherDashboard(@Param('teacherId') teacherId: string, @Res() res: Response): Promise<any> {
        try {
            const data = await this.dashboardService.getTeacherDashboardData(teacherId);
            return res.status(200).json({
                success: true,
                message: 'Teacher dashboard data retrieved successfully',
                data,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Internal Server Error',
                data: null,
            });
        }
    }
}

import { Router } from 'express';
import { appAccountRouterV1 } from '../../../routes/agent/accounts/account.route';
import { appUserAuthRouterV1 } from '../../../routes/agent/auth/auth.route';
import { appDashboardRouterV1 } from '../../../routes/admin/dashboard.route';
import { appUserDetailsRouterV1 } from '../../../routes/admin/user_details.route';
import { appVisiPlanRouterV1 } from '../../../routes/admin/visit_plan.route';
import { appLeaveRouterV1 } from '../../../routes/admin/leave_management.route';
import { appExpenseRouterV1 } from '../../../routes/admin/expense.route';
import { appAttendenceRouterV1 } from '../../../routes/application/attendence.route';
import { appAdminAttendenceRouterV1 } from '../../../routes/admin/attendence.route';
import { appAuthRouterV1 } from '../../../routes/application/auth.route';
import { appClaimRouterV1 } from '../../../routes/application/expense.route';
import { appUserRouterV1 } from '../../../routes/application/user.route';
import { appDashboardApplicationRouterV1 } from '../../../routes/application/dashboard.route';
import { appLeaveApplicationRouterV1 } from '../../../routes/application/leave.route';
import { appVisitApplicationRouterV1 } from '../../../routes/application/visit.route';
import { appFileRouterV1 } from '../../../routes/application/file.route';
import { appAdminFileRouterV1 } from '../../../routes/admin/file.route';

const v1 = Router();

// Admin Endpoint Api's
v1.use('/agent/account', appAccountRouterV1);
v1.use('/agent/auth', appUserAuthRouterV1);
v1.use('/admin/dashboard', appDashboardRouterV1);
v1.use('/admin/user_details', appUserDetailsRouterV1);
v1.use('/admin/visit_plan', appVisiPlanRouterV1);
v1.use('/admin/leave_management', appLeaveRouterV1);
v1.use('/admin/expense', appExpenseRouterV1);
v1.use('/admin/attendence', appAdminAttendenceRouterV1);
v1.use('/admin/file', appAdminFileRouterV1);

// Application Endpoints Api's
v1.use('/application/attendence', appAttendenceRouterV1);
v1.use('/application/auth', appAuthRouterV1);
v1.use('/application/expense', appClaimRouterV1);
v1.use('/application/user', appUserRouterV1);
v1.use('/application/dashboard', appDashboardApplicationRouterV1);
v1.use('/application/leave', appLeaveApplicationRouterV1);
v1.use('/application/visit', appVisitApplicationRouterV1);
v1.use('/application/file', appFileRouterV1);

export { v1 };

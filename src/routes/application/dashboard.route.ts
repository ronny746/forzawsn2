import { Router } from 'express';
import * as appAttendenceController from '../../controllers/application/dashboard.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appDashboardApplicationRouterV1 = Router();

appDashboardApplicationRouterV1.get('/get-menu', jwtModule.verifyApplicationAccessToken, appAttendenceController.getMenu);
appDashboardApplicationRouterV1.get('/app-info', jwtModule.verifyApplicationAccessToken, appAttendenceController.getAppInfo);

export { appDashboardApplicationRouterV1 };

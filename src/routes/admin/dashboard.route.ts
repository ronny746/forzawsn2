import { Router } from 'express';
import * as appDashboardController from '../../controllers/admin/dashboard.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appDashboardRouterV1 = Router();

appDashboardRouterV1.get('/get-user-details', jwtModule.verifyAccessToken, appDashboardController.appUserDetail);
appDashboardRouterV1.get('/get-dashboard', jwtModule.verifyAccessToken, appDashboardController.getDashboardDetail);
appDashboardRouterV1.get('/get-expense-analytic-data', jwtModule.verifyAccessToken, appDashboardController.getExpenseAnalyticData);
appDashboardRouterV1.get('/get-today-log-data', jwtModule.verifyAccessToken, appDashboardController.getTodayLogData);

export { appDashboardRouterV1 };

import { Router } from 'express';
import * as appLeaveController from '../../controllers/admin/leave_management.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appLeaveRouterV1 = Router();

appLeaveRouterV1.get('/get-leave-type', jwtModule.verifyAccessToken, appLeaveController.getAllLeaveType);
appLeaveRouterV1.get('/get-all-leave', jwtModule.verifyAccessToken, appLeaveController.getAllLeave);
appLeaveRouterV1.post('/apply-leave', jwtModule.verifyAccessToken, appLeaveController.applyLeave);
appLeaveRouterV1.post('/approve-disapprove-leave', jwtModule.verifyAccessToken, appLeaveController.approveDisapproveLeave);

export { appLeaveRouterV1 };

import { Router } from 'express';
import * as appAttendenceController from '../../controllers/application/leave.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appLeaveApplicationRouterV1 = Router();

appLeaveApplicationRouterV1.get('/mst-leave', jwtModule.verifyApplicationAccessToken, appAttendenceController.mstLeave);
appLeaveApplicationRouterV1.post('/apply-leave', jwtModule.verifyApplicationAccessToken, appAttendenceController.applyLeave);
appLeaveApplicationRouterV1.get('/get-leave', jwtModule.verifyApplicationAccessToken, appAttendenceController.getLeave);

export { appLeaveApplicationRouterV1 };

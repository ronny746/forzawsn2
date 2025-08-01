import { Router } from 'express';
import * as appVisitController from '../../controllers/admin/visit_plan.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appVisiPlanRouterV1 = Router();

appVisiPlanRouterV1.get('/get-user', jwtModule.verifyAccessToken, appVisitController.getAllUser);
appVisiPlanRouterV1.get('/get-user-by-id', jwtModule.verifyAccessToken, appVisitController.getUserDetailById);
appVisiPlanRouterV1.post('/create-visit', jwtModule.verifyAccessToken, appVisitController.createVisit);
appVisiPlanRouterV1.get('/get-visit', jwtModule.verifyAccessToken, appVisitController.getVisitDetail);
appVisiPlanRouterV1.get('/get-visit-summary', jwtModule.verifyAccessToken, appVisitController.getVisitSummary);
appVisiPlanRouterV1.post('/approve-disapprove-visit', jwtModule.verifyAccessToken, appVisitController.approveDisapproveVisit);

export { appVisiPlanRouterV1 };

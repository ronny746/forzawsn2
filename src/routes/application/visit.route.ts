import { Router } from 'express';
import * as appVisitController from '../../controllers/application/visit.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appVisitApplicationRouterV1 = Router();

appVisitApplicationRouterV1.get('/get-visit-detail', jwtModule.verifyApplicationAccessToken, appVisitController.getVisitDetail);
appVisitApplicationRouterV1.get('/get-next-visit-detail', jwtModule.verifyApplicationAccessToken, appVisitController.getNextVisitDetail);
appVisitApplicationRouterV1.get('/update-visit-feedback', jwtModule.verifyApplicationAccessToken, appVisitController.updateVisitFeedback);

export { appVisitApplicationRouterV1 };

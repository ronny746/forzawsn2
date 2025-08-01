import { Router } from 'express';
import * as appExpenseController from '../../controllers/application/user.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';

const appUserRouterV1 = Router();

appUserRouterV1.get('/getuser', jwtModule.verifyApplicationAccessToken, appExpenseController.getUser);
appUserRouterV1.post('/updateEmi', appExpenseController.updateEmi);
appUserRouterV1.post('/updateAbout', appExpenseController.updateAbout);

export { appUserRouterV1 };

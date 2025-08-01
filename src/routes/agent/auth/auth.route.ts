import { Router } from 'express';
import * as appUserAuthController from '../../../controllers/agent/auth/auth.controller';
import * as jwtModule from '../../../middlewares/jwt/jwt.middleware';

const appUserAuthRouterV1 = Router();

appUserAuthRouterV1.post('/login', appUserAuthController.appUserLogin);
appUserAuthRouterV1.post('/logout', jwtModule.verifyAccessToken, appUserAuthController.appUserLogout);
appUserAuthRouterV1.get('/getAgentByToken', jwtModule.verifyAccessToken, appUserAuthController.getUserByToken);

export { appUserAuthRouterV1 };

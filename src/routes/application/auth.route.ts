import { Router } from 'express';
import * as appAuthController from '../../controllers/application/auth.controller';

const appAuthRouterV1 = Router();

// appAuthRouterV1.get('/login', appAuthController.login);
appAuthRouterV1.post('/token', appAuthController.login);
appAuthRouterV1.post('/activate-user', appAuthController.activateUser);

export { appAuthRouterV1 };

import { Router } from 'express';
import * as appUserDetailsController from '../../controllers/admin/user_details.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import multer from 'multer';

const appUserDetailsRouterV1 = Router();

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

appUserDetailsRouterV1.post('/add-user', jwtModule.verifyAccessToken, appUserDetailsController.appAddUser);
appUserDetailsRouterV1.get('/get-all-user', jwtModule.verifyAccessToken, appUserDetailsController.getAllUser);
appUserDetailsRouterV1.post('/add-service-area', jwtModule.verifyAccessToken, appUserDetailsController.addServiceArea);
appUserDetailsRouterV1.post('/add-designation', jwtModule.verifyAccessToken, appUserDetailsController.addDesignation);
appUserDetailsRouterV1.post('/activate-designation', jwtModule.verifyAccessToken, appUserDetailsController.activateDesignation);
appUserDetailsRouterV1.post('/delete-designation', jwtModule.verifyAccessToken, appUserDetailsController.deleteDesignation);
appUserDetailsRouterV1.post('/update-user', jwtModule.verifyAccessToken, appUserDetailsController.appUpdateUser);
appUserDetailsRouterV1.get('/get-dropdown-data', jwtModule.verifyAccessToken, appUserDetailsController.getAppDropDownData);
appUserDetailsRouterV1.get('/get-state', jwtModule.verifyAccessToken, appUserDetailsController.getState);
appUserDetailsRouterV1.get('/download-user-template', jwtModule.verifyAccessToken, appUserDetailsController.downloadTemplate);
appUserDetailsRouterV1.get('/get_user-by-id', jwtModule.verifyAccessToken, appUserDetailsController.getUserDetailById);
appUserDetailsRouterV1.post('/upload-employee-data', upload.single('file'), appUserDetailsController.uploadEmplyeeData);

export { appUserDetailsRouterV1 };

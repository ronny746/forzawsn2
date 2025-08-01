import { Router } from 'express';
import * as appAttendenceController from '../../controllers/admin/attendence.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import multer from 'multer';
import upload0 from '../../middlewares/files/upload_file.middleware';
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const appAdminAttendenceRouterV1 = Router();

appAdminAttendenceRouterV1.get('/get-visit-for-attendence', jwtModule.verifyAccessToken, appAttendenceController.getVisitForAttendence);
appAdminAttendenceRouterV1.get('/get-attendence', jwtModule.verifyAccessToken, appAttendenceController.getAttendence);
appAdminAttendenceRouterV1.get('/get-attendence-status', jwtModule.verifyAccessToken, appAttendenceController.getAttendenceStatus);
appAdminAttendenceRouterV1.post('/mark-attendence', jwtModule.verifyAccessToken, appAttendenceController.markAttendence);
appAdminAttendenceRouterV1.get('/get-report', jwtModule.verifyAccessToken, appAttendenceController.getReport);
appAdminAttendenceRouterV1.get('/get-expense-report', jwtModule.verifyAccessToken, appAttendenceController.getExpenseReport);
appAdminAttendenceRouterV1.get('/get-export-report', jwtModule.verifyAccessToken, appAttendenceController.getExportReport);
appAdminAttendenceRouterV1.post('/upload-attendence-image', jwtModule.verifyAccessToken, upload.single('file'), appAttendenceController.uploadAttendenceImage);
appAdminAttendenceRouterV1.post('/upload-attendence-image-local', jwtModule.verifyAccessToken, upload0.single('file'), appAttendenceController.uploadAttendenceImageLocal);

export { appAdminAttendenceRouterV1 };

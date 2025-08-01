import { Router } from 'express';
import * as appAttendenceController from '../../controllers/application/attendence.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import multer from 'multer';
// import upload0 from '../../middlewares/files/upload_file.middleware';
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const appAttendenceRouterV1 = Router();

appAttendenceRouterV1.get('/get-visit-for-attendence', jwtModule.verifyApplicationAccessToken, appAttendenceController.getVisitForAttendence);
appAttendenceRouterV1.post('/mark-attendence', jwtModule.verifyApplicationAccessToken, appAttendenceController.markAttendence);
appAttendenceRouterV1.get('/attendance-logs', jwtModule.verifyApplicationAccessToken, appAttendenceController.attendanceLogs);
appAttendenceRouterV1.get('/my-attendance', jwtModule.verifyApplicationAccessToken, appAttendenceController.myAttendence);
appAttendenceRouterV1.get('/get-monthly-attendence', jwtModule.verifyApplicationAccessToken, appAttendenceController.getMonthlyAttendence);
appAttendenceRouterV1.get('/get-attendance', jwtModule.verifyApplicationAccessToken, appAttendenceController.getAttendenceStatus);
appAttendenceRouterV1.post('/get-report', jwtModule.verifyApplicationAccessToken, appAttendenceController.getReport);
appAttendenceRouterV1.get('/get-last-check-in', jwtModule.verifyApplicationAccessToken, appAttendenceController.getLastCheckIn);
appAttendenceRouterV1.post('/update-attendence', appAttendenceController.updateAttendence);
appAttendenceRouterV1.post('/upload-attendence-image', jwtModule.verifyApplicationAccessToken, upload.single('file'), appAttendenceController.uploadAttendenceImage);

export { appAttendenceRouterV1 };

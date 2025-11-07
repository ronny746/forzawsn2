import { Router } from 'express';
import * as appExpenseController from '../../controllers/admin/expense.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import upload0 from '../../middlewares/files/upload_file.middleware';

const appExpenseRouterV1 = Router();

appExpenseRouterV1.post('/create-expense', jwtModule.verifyAccessToken, appExpenseController.createExpense);
appExpenseRouterV1.get('/get-expense', jwtModule.verifyAccessToken, appExpenseController.getAllExpense);
appExpenseRouterV1.get('/exp-mst-mode', jwtModule.verifyAccessToken, appExpenseController.expMstMode);
appExpenseRouterV1.get('/mst-con-mode', jwtModule.verifyAccessToken, appExpenseController.mstConMode);
appExpenseRouterV1.get('/get-export-expense', jwtModule.verifyAccessToken, appExpenseController.getExportExpense);
appExpenseRouterV1.get('/get-expense-by-id', jwtModule.verifyAccessToken, appExpenseController.getExpenseById);
appExpenseRouterV1.post('/approve-disapprove-claim', jwtModule.verifyAccessToken, appExpenseController.approveDisapproveClaim);
appExpenseRouterV1.post('/upload-expense-doc', jwtModule.verifyAccessToken, upload0.single('file'), appExpenseController.uploadExpenseDoc);



export { appExpenseRouterV1 };

import { Router } from 'express';
import * as appExpenseController from '../../controllers/application/expense.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import upload0 from '../../middlewares/files/upload_file.middleware';

const appClaimRouterV1 = Router();

appClaimRouterV1.post('/create-expense', jwtModule.verifyApplicationAccessToken, appExpenseController.createExpense);
appClaimRouterV1.get('/exp-mst-mode', jwtModule.verifyApplicationAccessToken, appExpenseController.expMstMode);
appClaimRouterV1.get('/mst-con-mode', jwtModule.verifyApplicationAccessToken, appExpenseController.mstConMode);
appClaimRouterV1.post('/mst-con-mode/update', appExpenseController.updateConvModeRate);
appClaimRouterV1.post('/exp-mode/add', appExpenseController.expMstModeAdd);
appClaimRouterV1.post('/exp-mode/update-by-desc', appExpenseController.expMstModeUpdateByDesc);
appClaimRouterV1.get('/get-expense-amount', appExpenseController.getExpenseAmount);



appClaimRouterV1.get('/get-expense', jwtModule.verifyApplicationAccessToken, appExpenseController.getAllExpense);
appClaimRouterV1.get('/get-expense-list', jwtModule.verifyApplicationAccessToken, appExpenseController.getAllExpenseList);
appClaimRouterV1.post('/upload-expense-doc', jwtModule.verifyAccessToken, upload0.single('file'), appExpenseController.uploadExpenseDoc);
router.put('/update-expense', jwtModule.verifyApplicationAccessToken, appExpenseController.updateExpense);

export { appClaimRouterV1 };

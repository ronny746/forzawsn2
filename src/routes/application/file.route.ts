/* eslint-disable */
import { Router } from 'express';
import * as appFileController from '../../controllers/application/file.controller';
import * as jwtModule from '../../middlewares/jwt/jwt.middleware';
import { RequestType } from '../../helpers/shared/shared.type';
import multer from "multer";
import path from "path"

var storageImage = multer.diskStorage({
  destination: function (req: RequestType, file: any, cb: any) {
    console.log(req, file)
    cb(null, path.join(__dirname, '../../../../wsn3.workgateway.in/public/application_img'), function (error: any, success: any) {
      console.log(success, "success")
      if (error) {
        console.log(error);
      }
    })
  },
  filename: function (req: RequestType, file: any, cb: any) {
    console.log(req, file)
    cb(null, Date.now() + '_' + file.originalname, function (error: any, success: any) {
      console.log(success, "success")
      if (error) {
        console.log(error);
      }
    })
  }
})

let upload0 = multer({ storage: storageImage })

const appFileRouterV1 = Router();

appFileRouterV1.post('/upload-attendence-image-local', jwtModule.verifyApplicationAccessToken, upload0.single('file'), appFileController.uploadAttendenceImageLocal);

export { appFileRouterV1 };

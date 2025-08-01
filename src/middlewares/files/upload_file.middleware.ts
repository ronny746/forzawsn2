/* eslint-disable */
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
import multer from "multer";
import path from "path"

var storageImage = multer.diskStorage({
  destination: function (req: RequestType, file: any, cb: any) {
    console.log(req, file)
    cb(null, path.join(__dirname, '../../../../wsn-frontend-mssql/public/application_img'), function (error: any, success: any) {
      console.log(success, "success")
      if (error) {
        console.log(error);
      }
    })
  },
  filename: function (req: RequestType, file: any, cb: any) {
    console.log(req.body)
    cb(null, Date.now() + '_' + file.originalname, function (error: any, success: any) {
      console.log(success, "success")
      if (error) {
        console.log(error);
      }
    })
  }
})

let upload0 = multer({ storage: storageImage })

export default upload0;
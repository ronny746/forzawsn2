/* eslint-disable */
import { Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
// import {
//     AddAppUserType,
//     joiAddUser
// } from '../../helpers/joi/admin/user_details/index'

// Controller Methods

const uploadAttendenceImageLocal = async (req: RequestType, res: Response): Promise<void> => {
    try {
        if (req.file) {
            const fileName = req.file.filename;
            if (res.headersSent === false) {
                res.status(200).send({
                    error: false,
                    data: {
                        file_name: fileName,
                        message: `File '${fileName}' uploaded successfully.`
                    }
                });
            }
        } else {
            if (res.headersSent === false) {
                res.status(200).send({
                    error: true,
                    data: {
                        message: `No file uploaded.`
                    }
                });
            }
        }
    } catch (error: any) {
        console.log(error)
        res.status(422).send({
            error: true,
            data: {
                message: 'Internal Server Error'
            }
        });
    }
};

// Export Methods
export {
    uploadAttendenceImageLocal,
};

/* eslint-disable */
import { Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
// import {
//     AddAppUserType,
//     joiAddUser
// } from '../../helpers/joi/admin/user_details/index'
import sequelize from '../../helpers/common/init_mysql';
// import moment from 'moment';
// const {
//     v4: uuidv4,
// } = require('uuid');
const { QueryTypes } = require("sequelize");

// Controller Methods
const getMenu = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const EmpCode = req.params.EmpCode;
        // const decoded = req.payload;
        // console.log(decoded)

        const selectQuery = 'SELECT TOP 6 * FROM dbo.mstmenu';

        const rows: any = await sequelize.query(selectQuery, {
            replacements: { EmpCode: EmpCode },
            type: QueryTypes.SELECT,
        });
        // If no menu items found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).send('No menu names found');
            return;
        }
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": rows.length,
            "Data": {
                "Menu": rows.map((row: any) => ({
                    "Id": row.Id,
                    "Name": row.Name,
                }))
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };
        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error.message, "error in get menu");
        res.status(401).json({ error: error });
    }
};

const getAppInfo = async (req: RequestType, res: Response): Promise<void> => {
    try {
        console.log(req.body, "req.body");
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": 1,
            "Data": {
                "Info": [
                    {
                        "ClientName": "Forzamedi",
                        "ProductName": "Sales Narrator",
                        "CopyrightName": "WorkMate",
                        "AppName": "ForzaMedi",
                        "ProductIcon": "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"
                    }

                ]
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error.message, "error in get app info");
        res.status(401).json({ error: error });
    }
};

// Export Methods
export {
    getMenu,
    getAppInfo
};

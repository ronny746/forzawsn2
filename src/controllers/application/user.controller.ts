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
const getUser = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;

        // console.log(decoded)
        // Verify the access token
        const EMPCode = decoded.EMPCode;
        const selectQuery = 'SELECT CONCAT(\'Hi \', FirstName) as Name, FirstName as UserName, EmpCode as EmpCode, CAST(MobileNo AS CHAR) as MobileNo FROM dbo.employeedetails WHERE EMPCode= :EMPCode';
        const results: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        // Check if user exists
        if (results.length === 0) {
            res.status(400).json({ error: 'Invalid username or password' });
            return;
        }
        else {
        const aboutQuery = 'SELECT version FROM dbo.about';
        const results1: any = await sequelize.query(aboutQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": 1,
            "Data": results[0],
            "about": results1[0],
            "ResponseCode": "OK",
            "confirmationbox": false
        };
        res.status(200).json(responseData);
    }
    } catch (error: any) {
        console.log(error.message, "error in get user");
        res.status(500).json({ error: error });
    }
};

const updateEmi = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const {MobileNo, EmiNo} = req.body;

        // Verify the access token
        const selectQuery = 'SELECT * FROM dbo.employeedetails WHERE MobileNo= :MobileNo';
        const results: any = await sequelize.query(selectQuery, {
            replacements: { MobileNo: MobileNo },
            type: QueryTypes.SELECT,
        });

        // console.log(results, "results updateEmi");

        // Check if user exists
        if (results.length === 0) {
            res.status(500).json({ error: 'Contact number not exist' });
            return;
        }

        await sequelize.query(
            'UPDATE dbo.employeedetails SET CellEMIENo = :EmiNo WHERE MobileNo = :MobileNo',
            {
              replacements: { EmiNo: EmiNo, MobileNo: MobileNo },
              type: QueryTypes.UPDATE
            }
          )
        const responseData = {
            "ResponseMessage": "Success",
        };
        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error });
    }
};

const updateAbout = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const {version} = req.body;

        await sequelize.query(
            'UPDATE dbo.about SET version = :version WHERE id = :id',
            {
              replacements: { version: version, id: 1 },
              type: QueryTypes.UPDATE
            }
          )
        const responseData = {
            "ResponseMessage": "Success",
        };
        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error });
    }
};

// Export Methods
export {
    getUser,
    updateEmi,
    updateAbout
};

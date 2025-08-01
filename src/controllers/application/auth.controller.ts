/* eslint-disable */
import { Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
// import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
// import {
//     AddAppUserType,
//     joiAddUser
// } from '../../helpers/joi/admin/user_details/index'
import sequelize from '../../helpers/common/init_mysql';
import { RequestType } from 'helpers/shared/shared.type';
// import moment from 'moment';
// const {
//     v4: uuidv4,
// } = require('uuid');
const jwt = require('jsonwebtoken');
const { QueryTypes } = require("sequelize");

// Controller Methods

// const login = async (req: RequestType, res: Response): Promise<void> => {
//     try {
//         const { username, password } = req.body;

//         // Retrieve user from the database based on the username

//         const selectQuery = 'SELECT * FROM dbo.employeedetails WHERE MobileNo = :MobileNo AND CellEMIENo= :CellEMIENo';
//         const results: any = await sequelize.query(selectQuery, {
//             replacements: { MobileNo: username, CellEMIENo: password },
//             type: QueryTypes.SELECT,
//         });

//         // Check if user exists
//         if (results.length === 0) {
//             res.status(500).json({ error: 'Invalid username or password' });
//         }

//         const user = results[0];
//         const accessToken = jwt.sign({ username: user.CellEMIENo }, 'rana', { expiresIn: '24h' });

//         // Return the access token
//         res.json({
//             access_token: accessToken,
//             token_type: 'bearer',
//             expires_in: 86399
//         });

//     } catch (error: any) {
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

const login = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        // Retrieve user from the database based on the username

        const selectQuery0 = 'SELECT * FROM dbo.employeedetails WHERE MobileNo = :username AND isActive = 1';
        const results0: any = await sequelize.query(selectQuery0, {
            replacements: { username: username },
            type: QueryTypes.SELECT,
        });

        // Check if user exists
        if (results0.length === 0) {
            res.status(500).json({ error: 'User not found' });
            return;
        }

        if (!results0[0].CellEMIENo) {
            res.status(500).json({ error_uri: '001' });
            return;
        }

        if (results0[0].CellEMIENo !== password) {
            res.status(500).json({ error: 'Invalid username or password' });
            return;
        }

        // const selectQuery = 'SELECT * FROM dbo.employeedetails WHERE MobileNo = :username AND CellEMIENo=:password';
        // const results: any = await sequelize.query(selectQuery, {
        //     replacements: { username: username, password: password },
        //     type: QueryTypes.SELECT,
        // });


        // Check if user exists
        // if (results.length === 0) {
        //     res.status(500).json({ error: 'Invalid username or password' });
        //     return;
        // }

        const user = results0[0];
        const accessToken = jwt.sign({ username: user.CellEMIENo, EMPCode: user.EMPCode }, 'rana');
        // const accessToken = jwt.sign({ username: user.CellEMIENo, EMPCode: user.EMPCode }, 'rana', { expiresIn: '24h' });

        // Return the access token
        res.json({
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: 86399
        });

    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const activateUser = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { UserName, Password } = req.body;
        // Check if the username is provided
        if (!UserName || !Password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }

        // Check if the user exists based on mobile number
        const selectQuery = 'SELECT * FROM dbo.employeedetails WHERE MobileNo = :UserName AND isActive = 1';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: { UserName: UserName },
            type: QueryTypes.SELECT,
        });

        if (rows.length === 0) {
            // User does not exist
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // User exists, check if EMEI number is empty
        const user = rows[0];
        if (!user.CellEMIENo) {
            // Update EMEI number for the user
            const updateQuery = 'UPDATE dbo.employeedetails SET CellEMIENo = :Password WHERE MobileNo = :UserName';
            await sequelize.query(updateQuery, {
                replacements: { Password: Password, UserName: UserName },
                type: QueryTypes.UPDATE,
            });

            const responseData = {
                "ResponseMessage": "Success",
                "Status": true,
                "DataCount": 1,
                "Data": {
                    "ResponseCode": "000",
                    "ResponseMessage": "User activated successfully"
                },
                "ResponseCode": "OK",
                "confirmationbox": false
            };

            res.status(200).json({ message: 'User activated successfully', responseData });
            return;
        } else {
            // User already activated
            const responseData = {
                "ResponseMessage": "Failed",
                "Status": false,
                "DataCount": 0,
                "Data": {
                    "ResponseCode": "001",
                    "ResponseMessage": "User already activated"
                },
                "ResponseCode": "OK",
                "confirmationbox": true
            };

            res.status(200).json({ message: 'User already activated', responseData });
            return;
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

// Export Methods
export {
    login,
    activateUser
};

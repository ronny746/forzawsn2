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
const {
    v4: uuidv4,
} = require('uuid');
const { QueryTypes } = require("sequelize");

// Controller Methods

const mstLeave = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded = req.payload;
        console.log(decoded)
        // Define SQL query to select all columns from the MstExpMode table
        const selectQuery = 'SELECT * FROM dbo.mstleavetype';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });

        // If no data found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).send('No data found in MstLeaveType table');
            return;
        }

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": rows.length,
            "Data": rows,
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};

const getLeave = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded = req.payload;
        console.log(decoded)
        // Define SQL query to select all columns from the MstExpMode table
        // const EmpData: any = await sequelize.query('SELECT * FROM dbo.mstleavetype', {
        //     replacements: {},
        //     type: QueryTypes.SELECT,
        // });

        const selectQuery = 'SELECT * FROM dbo.mstleavetype';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });

        // If no data found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).send('No data found in MstLeaveType table');
            return;
        }

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": 1,
            "Data": {
                "Leave": [
                    {
                        "EmployeeID": 7,
                        "EMPCode": "IT002",
                        "Total_Leave": 30,
                        "Total_Approved": 0,
                        "Total_Balance": 30,
                        "Total_CL": 10,
                        "Total_SL": 10,
                        "Total_EL": 10,
                        "Approved_CL": 0,
                        "Approved_SL": 0,
                        "Approved_EL": 0,
                        "Balance_CL": 10,
                        "Balance_SL": 10,
                        "Balance_EL": 10,
                        "Pending": 0,
                        "Approved": 6,
                        "Rejected": 0
                    }
                ]
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        }

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};

const applyLeave = async (req: RequestType, res: Response): Promise<void> => {
    try {
        // const decoded = req.payload;

        const { LeaveTypeId, StartDate, EndDate, Reason } = req.body;

        // console.log(req?.payload?.EMPCode, "req?.payload?.EMPCode", "Reason")
        const uuid = uuidv4();
        // const selectQuery = 'SELECT * FROM dbo.employeedetails WHERE EMPCode = :EMPCode';

        const selectQuery = 'SELECT EmployeeID, EMPCode FROM dbo.employeedetails where EMPCode=:EMPCode';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: req?.payload?.EMPCode },
            type: QueryTypes.SELECT,
        });

        // const rows: any = await sequelize.query(selectQuery, {
        //     replacements: { EMPCode: EMPCode },
        //     type: QueryTypes.SELECT,
        // });

        if (rows.length === 0) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }

        const start = new Date(StartDate).getTime();
        const end = new Date(EndDate).getTime();

        // Check if endDate is greater than startDate
        if (end < start) {
            res.status(404).json({ message: 'Entered dates are invalid.' });
            return;
        }

        // Calculate the difference in milliseconds
        const difference = end - start;

        // Convert the difference to days
        const days = Math.ceil(difference / (1000 * 3600 * 24));
        // const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const currentTimestamp = new Date();
        currentTimestamp.setUTCHours(currentTimestamp.getUTCHours() + 5); // Adjust for India timezone (UTC +5)
        currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 30); // Adjust for India timezone (UTC +5:30)

        const insertQuery = 'INSERT INTO dbo.markleave (Id, EmployeeID, EMPCode, LeaveTypeId, FromDate, ToDate, LeaveCount, Remarks, LeavestatusId, SubmitedOn, Modifiedby, ApprovedOn, Reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await sequelize.query(insertQuery, {
            replacements: [uuid, rows[0].EmployeeID, req?.payload?.EMPCode, LeaveTypeId, StartDate, EndDate, days, '', 1, currentTimestamp.toISOString().slice(0, 19).replace('T', ' '), '0', currentTimestamp.toISOString().slice(0, 19).replace('T', ' '), Reason],
            type: QueryTypes.INSERT,
        });
        res.status(200).json({ message: 'Leave application submitted successfully' });
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};

// Export Methods
export {
    mstLeave,
    applyLeave,
    getLeave
};

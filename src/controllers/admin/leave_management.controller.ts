/* eslint-disable */
import { NextFunction, Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
import {
    AddAppLeaveType,
    joiAddLeave
} from '../../helpers/joi/admin/leave_management/index'
const {
    v4: uuidv4,
} = require('uuid');
const moment = require('moment-timezone');
import sequelize from '../../helpers/common/init_mysql';
const { QueryTypes } = require("sequelize");

// Controller Methods

const getAllLeaveType = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.query);
        const leaveQuery = 'SELECT * FROM dbo.mstleavetype where isActive = 1';
        const leaveData: any = await sequelize.query(leaveQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });
        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        leaveData: leaveData
                    },
                    message: 'User created successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}
const getAllLeave = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const DesigId = req?.payload?.DesigId;
        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let result: any = { count: 0, rows: [] };

        let query: string;

        if (DesigId === '4') {
            query = `
        SELECT 
            ml.*, 
            mlt.LeaveType, 
            ms.Description, 
            emp.FirstName, 
            emp.LastName, 
            (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ml.ApprovedById) as AdminName, 
            emp.DesigId, 
            4 as adminId 
        FROM 
            dbo.markleave ml 
            INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ml.EMPCode 
            LEFT JOIN dbo.mstleavetype mlt ON mlt.LeaveTypeId = ml.LeaveTypeId 
            INNER JOIN dbo.mststatus ms ON ms.LeavestatusId = ml.LeavestatusId 
        WHERE 
            (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey) 
            AND emp.EMPCode = :MgrEmployeeID 
        ORDER BY 
            SubmitedOn DESC
    `;
        } else {
            query = `
        SELECT 
            ml.*, 
            mlt.LeaveType, 
            ms.Description, 
            emp.FirstName, 
            emp.LastName, 
            (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ml.ApprovedById) as AdminName, 
            emp.DesigId, 
            3 as adminId 
        FROM 
            dbo.markleave ml 
            INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ml.EMPCode 
            LEFT JOIN dbo.mstleavetype mlt ON mlt.LeaveTypeId = ml.LeaveTypeId 
            INNER JOIN dbo.mststatus ms ON ms.LeavestatusId = ml.LeavestatusId 
        WHERE 
            (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey) 
            AND (emp.MgrEmployeeID = :MgrEmployeeID OR emp.EMPCode = :MgrEmployeeID) 
        ORDER BY 
            SubmitedOn DESC
    `;
        }

        // Calculate row count if pageIndex is 0
        if (pageIndex !== undefined && pageSize) {
            if (pageIndex == 0) {
                const rowsCount = await sequelize.query(query, {
                    replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
                    type: QueryTypes.SELECT,
                });
                result.count = rowsCount.length;
            }

            // Calculate offset and limit for pagination
            const offset = pageSize * pageIndex;
            query = query + `\n OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
        }

        console.log('query', query);

        // Execute the query
        result.rows = await sequelize.query(query, {
            replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: result,
                    message: 'Leave fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const applyLeave = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const appLeaveDetails: AddAppLeaveType = await joiAddLeave.addAppLeaveSchema.validateAsync(req.body);
        console.log(appLeaveDetails, "appLeaveDetails");

        const uuid = uuidv4();
        const selectQuery = 'SELECT EmployeeID, EMPCode FROM dbo.employeedetails where EMPCode=:EMPCode';
        const empData: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: req?.payload?.appUserId },
            type: QueryTypes.SELECT,
        });

        const currentTimeInKolkata = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

        // save
        const firstQuery = 'INSERT INTO dbo.markleave ';
        const insertQuery = firstQuery + `(
            Id,
            EmployeeID,
            EMPCode,
            FromDate,
            ToDate,
            LeaveTypeId,
            LeavestatusId,
            SubmitedOn,
            Reason
          ) VALUES (
            '${uuid}',
            '${empData[0].EmployeeID}',
            '${empData[0].EMPCode}',
            '${appLeaveDetails.FromDate}',
            '${appLeaveDetails.ToDate}',
            '${appLeaveDetails.LeaveTypeId}',
            ${1},
            '${currentTimeInKolkata}',
            '${appLeaveDetails.Reason}'
          );`

        const storeAppUserDetails: any = await sequelize.query(insertQuery, {
            replacements: {},
            type: QueryTypes.INSERT,
        });


        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    appUser: {
                        appUserId: storeAppUserDetails
                    },
                    message: 'Apply leave successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const approveDisapproveLeave = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { leaveRequestId, isApprove, rejectReason } = req.body;
        console.log(req.body, "req.body");
        const selectQuery = 'UPDATE dbo.markleave SET LeavestatusId=:LeavestatusId, ApprovedById=:ApprovedById, reject_reason=:reject_reason where Id=:leaveRequestId'
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                ApprovedById: req?.payload?.appUserId,
                LeavestatusId: isApprove ? "2" : "3",
                leaveRequestId: leaveRequestId,
                reject_reason: rejectReason
            },
            type: QueryTypes.UPDATE,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    leaveRequestId: leaveRequestId,
                    message: 'Apply leave successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error, "error");
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

// Export Methods
export { getAllLeaveType, getAllLeave, applyLeave, approveDisapproveLeave };

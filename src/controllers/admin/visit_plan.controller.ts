/* eslint-disable */
import { NextFunction, Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
// import {
//     AddAppUserType,
//     joiAddUser
// } from '../../helpers/joi/admin/user_details/index'
import sequelize from '../../helpers/common/init_mysql';
import moment from 'moment';
import { sentApproveRejectVisitMail } from '../../helpers/service/email';
const {
    v4: uuidv4,
} = require('uuid');
const { QueryTypes } = require("sequelize");

// Controller Methods

const getAllUser = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.query);
        const userQuery = 'SELECT EmployeeID, EMPCode, FirstName, LastName FROM dbo.employeedetails where EMPCode=:MgrEmployeeID OR MgrEmployeeID=:MgrEmployeeID AND isActive = 1';
        const userData: any = await sequelize.query(userQuery, {
            replacements: { MgrEmployeeID: req?.payload?.appUserId },
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        userData: userData
                    },
                    message: 'User fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const getUserDetailById = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.query);
        const EMPCode = req?.query?.EMPCode;
        const userQuery = 'SELECT ddest.Designatation, dept.Department FROM dbo.employeedetails as demp INNER JOIN dbo.mstdesignatation ddest on ddest.DesigId=demp.DesigId INNER JOIN dbo.mstdepartment dept on dept.DeptId=demp.DeptId where EmpCode = :EMPCode AND demp.isActive = 1';
        const userData: any = await sequelize.query(userQuery, {
            replacements: {
                EMPCode: EMPCode
            },
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        userData: userData
                    },
                    message: 'User fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const createVisit = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        // console.log(req.body);
        const { EmpCode, FromDate, ToDate } = req.body.values;
        const { excelData } = req.body;

        if (excelData?.length === 0 || !excelData) {
            res.status(401).send({ message: "please upload visit data" });
            return;
        }
        const uuid = uuidv4();

        // Define the first query for insertion into visitdetails
        const firstQuery = 'INSERT INTO dbo.visitdetails ';

        // Format dates using moment.js
        const formattedFromDate = moment(FromDate).format('YYYY-MM-DD');
        const formattedToDate = moment(ToDate).format('YYYY-MM-DD');

        // Construct the insert query for visitdetails
        const insertQuery = `${firstQuery} (
            VisitId,
            EmpCode,
            FromDate,
            ToDate,
            CheckedById,
            ApprovedBy,
            isPlanned
        ) VALUES (
            '${uuid}',
            '${EmpCode}',
            '${formattedFromDate}',
            '${formattedToDate}',
            '${req.payload?.appUserId}',
            '${req.payload?.appUserId}',
            '${1}'
        )`;

        // Execute the insertion query for visitdetails
        const userData: any = await sequelize.query(insertQuery, {
            replacements: {},
            type: QueryTypes.INSERT,
        });

        // Define the first query for insertion into visitsummary
        const firstQuerySummary = 'INSERT INTO dbo.visitsummary ';

        // Iterate over the excelData array
        for (const row of excelData) {
            // Generate a UUID for VisitSummaryId
            const uuid1 = uuidv4();

            // Format the visit date using moment.js
            const visitDate = moment(row.VisitDate, 'DD/MM/YYYY').format('YYYY-MM-DD');

            // Construct the insert query for visitsummary
            const insertQuerySummary = `${firstQuerySummary} (
                VisitSummaryId,
                VisitId,
                VisitDate,
                FromDate,
                ToDate,
                VisitFrom,
                VisitTo,
                VisitPurpose,
                approvedStatus
            ) VALUES (
                '${uuid1}',
                '${uuid}',
                '${visitDate}',
                '${formattedFromDate}',
                '${formattedToDate}',
                '${row.VisitFrom}',
                '${row.VisitTo}',
                '${row.VisitPurpose}',
                '${"Pending"}'
            )`;

            // Execute the insertion query for visitsummary
            await sequelize.query(insertQuerySummary, {
                replacements: {},
                type: QueryTypes.INSERT,
            });
        }

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        userData: userData
                    },
                    message: 'Visit data inserted successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const getVisitDetail = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        let { startDate, endDate } = req.query;

        const DesigId = req?.payload?.DesigId;
        // console.log(DesigId, "DesigId")
        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;
        let planned: any = req.query.planned || 1;
        let searchEMPCode: any = req.query.searchEMPCode || req?.payload?.appUserId;
        if(req.query.planned === "all") {
            planned = ``;
        }
        if(req.query.searchEMPCode === "all") {
            searchEMPCode = ``;
        }

        let plannedQuery = ``;

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";
        if (planned !== '') {
            plannedQuery = `AND vst.isPlanned = ${Number(planned)}`
        }

        // if (startDate && endDate) {
        //     plannedQuery += `AND CAST(ma.PresentTimeIn AS DATE) BETWEEN :startDate AND :endDate`;
        // }
        if (searchEMPCode) {
            plannedQuery += ` AND demp.EMPCode=:searchEMPCode`;
        }

        let result: any = { count: 0, rows: [] };

        let query: string;
        if (DesigId === '4') {
            query = `
            SELECT 
                vst.VisitId, 
                vst.EMPCode, 
                vst.createdAt, 
                ddest.Designatation, 
                dpart.Department, 
                vst.FromDate, 
                vst.ToDate,
                vst.isPlanned,
                demp.DesigId,
                demp.MgrEmployeeID, 
                CASE 
                WHEN demp.MgrEmployeeID = :EMPCode THEN 1 
                ELSE 0 
                END AS isManager, -- New column to indicate if the user is the manager
                4 as adminId,
                CONCAT(demp.FirstName, ' ', demp.LastName) as EmployeeName, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = vst.CheckedById) as CheckedBy, 
                (SELECT COUNT(VisitSummaryId) FROM dbo.visitsummary vs WHERE vs.VisitId = vst.VisitId) as total_visit, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = vst.ApprovedBy) as ApprovedBy 
            FROM 
                dbo.visitdetails AS vst 
                INNER JOIN dbo.employeedetails demp ON demp.EMPCode = vst.EmpCode 
                INNER JOIN dbo.mstdepartment dpart ON dpart.DeptId = demp.DeptId 
                INNER JOIN dbo.mstdesignatation ddest ON ddest.DesigId = demp.DesigId 
            WHERE 
                (demp.FirstName LIKE :searchKey OR demp.LastName LIKE :searchKey) 
                AND vst.EmpCode = :EMPCode 
                AND vst.isActive = 1
                ${plannedQuery}
                AND ddest.isActive = 1 
                AND MONTH(vst.FromDate) = MONTH(GETDATE())
                ORDER BY 
                vst.createdAt DESC
                `;
        }
        else {
            query = `
            SELECT 
                vst.VisitId, 
                vst.EMPCode, 
                vst.createdAt, 
                ddest.Designatation, 
                dpart.Department, 
                vst.FromDate, 
                vst.ToDate, 
                vst.isPlanned,
                demp.DesigId,
                demp.MgrEmployeeID,
                CASE 
                WHEN demp.MgrEmployeeID = :EMPCode THEN 1 
                ELSE 0 
                END AS isManager, -- New column to indicate if the user is the manager 
                3 as adminId,
                CONCAT(demp.FirstName, ' ', demp.LastName) as EmployeeName, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = vst.CheckedById) as CheckedBy, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = vst.ApprovedBy) as ApprovedBy 
            FROM 
                dbo.visitdetails AS vst 
                INNER JOIN dbo.employeedetails demp ON demp.EMPCode = vst.EmpCode 
                INNER JOIN dbo.mstdepartment dpart ON dpart.DeptId = demp.DeptId 
                INNER JOIN dbo.mstdesignatation ddest ON ddest.DesigId = demp.DesigId 
            WHERE 
                (demp.FirstName LIKE :searchKey OR demp.LastName LIKE :searchKey) 
                AND (demp.MgrEmployeeID = :EMPCode OR vst.EmpCode = :EMPCode)
                ${plannedQuery}
                AND MONTH(vst.FromDate) = MONTH(GETDATE()) 
                ORDER BY 
                vst.createdAt DESC
                `;
        }

        // Calculate row count if pageIndex is 0
        if (pageIndex !== undefined && pageSize) {
            if (pageIndex == 0) {
                const rowsCount = await sequelize.query(query, {
                    replacements: {
                        searchKey: searchKey,
                        EMPCode: req?.payload?.appUserId,
                        planned: planned,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        searchEMPCode: searchEMPCode
                    },
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
            replacements: {
                searchKey: searchKey,
                EMPCode: req?.payload?.appUserId,
                planned: planned,
                startDate: startDate || null,
                endDate: endDate || null,
                searchEMPCode: searchEMPCode
            },
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        userData: result
                    },
                    message: 'Visit fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error, "error");
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};
const getVisitSummary = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;
        const VisitId: any = req.query.VisitId;

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let result: any = { count: 0, rows: [] };

        let query = `
    SELECT VisitSummaryId, 
           VisitDate, 
           VisitFrom, 
           VisitTo, 
           VisitPurpose,
           approvedStatus,
           approvedBy
    FROM dbo.visitsummary 
    WHERE (VisitFrom LIKE :searchKey OR VisitTo LIKE :searchKey) 
          AND VisitId = :VisitId 
          AND isActive = 1
          order by VisitDate asc`;
        // console.log(pageIndex, typeof pageIndex, "fasd");

        if (pageIndex !== undefined && pageSize) {
            if (Number(pageIndex) === 0) {
                const rowsCount = await sequelize.query(query, {
                    replacements: { searchKey: searchKey, VisitId: VisitId },
                    type: QueryTypes.SELECT,
                });
                result.count = rowsCount.length;
            }
            const offset = pageSize * pageIndex;
            query = `${query}\n OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
        }
        result.rows = await sequelize.query(query, {
            replacements: { searchKey: searchKey, VisitId: VisitId },
            type: QueryTypes.SELECT,
        });
        res.status(200).send({
            data: result
        });
    } catch (error: any) {
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const approveDisapproveVisit = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { visitRequestId, isApprove, rejectReason } = req.body;
        let visits: any = [];

        // Query manager details
        const managerQuery = 'SELECT FirstName, LastName FROM dbo.employeedetails where EMPCode=:ApprovedById';
        let managerResults: any = await sequelize.query(managerQuery, {
            replacements: {
                ApprovedById: req?.payload?.appUserId,
            },
            type: QueryTypes.SELECT,
        });

        // Process each `visitRequestId` with `Promise.all`
        await Promise.all(
            visitRequestId.map(async (item: any) => {
                // Update query
                const updateQuery =
                    'UPDATE dbo.visitsummary SET approvedStatus=:approvedStatus, approvedBy=:ApprovedById, reject_reason=:reject_reason where VisitSummaryId=:visitRequestId';
                await sequelize.query(updateQuery, {
                    replacements: {
                        ApprovedById: req?.payload?.appUserId,
                        approvedStatus: isApprove ? 'Approved' : 'Rejected',
                        visitRequestId: item,
                        reject_reason: rejectReason,
                    },
                    type: QueryTypes.UPDATE,
                });

                // Select query
                const selectQuery =
                    'SELECT vs.VisitFrom, vs.VisitTo, emp.Email, emp.FirstName, emp.LastName FROM dbo.visitsummary vs INNER JOIN dbo.visitdetails vd on vd.VisitId=vs.VisitId INNER JOIN dbo.employeedetails emp on emp.EMPCode=vd.EmpCode where VisitSummaryId=:visitRequestId';
                let executiveResults: any = await sequelize.query(selectQuery, {
                    replacements: {
                        visitRequestId: item,
                    },
                    type: QueryTypes.SELECT,
                });

                // Extract first result and push to visits
                executiveResults = executiveResults[0];
                visits.push({
                    Email: executiveResults.Email,
                    FirstName: executiveResults.FirstName,
                    LastName: executiveResults.LastName,
                    VisitFrom: executiveResults.VisitFrom,
                    VisitTo: executiveResults.VisitTo,
                });
            })
        );

        // console.log(visits, 'Visits Array');
        // console.log(visits, "visits");

        sentApproveRejectVisitMail(visits, managerResults[0].FirstName + ' ' + managerResults[0].LastName, isApprove);

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    visitRequestId: visitRequestId,
                    message: `Visit ${isApprove ? 'Approve' : 'Reject'} successfully successfully.`
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
export {
    getAllUser,
    getUserDetailById,
    createVisit,
    getVisitDetail,
    getVisitSummary,
    approveDisapproveVisit
};

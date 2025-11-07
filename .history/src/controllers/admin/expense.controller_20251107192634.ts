/* eslint-disable */
import { NextFunction, Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
// import { RequestType } from '../../helpers/shared/shared.type';
// import httpErrors from 'http-errors';
// import {
//     AddAppUserType,
//     joiAddUser
// } from '../../helpers/joi/admin/user_details/index'
import sequelize from '../../helpers/common/init_mysql';
import { RequestType } from '../../helpers/shared/shared.type';
// import { convertToExcel, sentCreatedExpenseMail } from '../../helpers/service/email';
import { sentRejectExpenseMail } from '../../helpers/service/email';
// import moment from 'moment';
const {
    v4: uuidv4,
} = require('uuid');
const { QueryTypes } = require("sequelize");

// Controller Methods

const createExpense = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const {
            ConvModeId,
            Amount,
            ExpModeId,
            VisitSummaryId,
            Remarks,
            Data,
            Rate,
            Reason,
            Distance
        } = req.body;

        console.log(req.body, Data, "create expense body===============");

        const uuid = uuidv4();

        if (!VisitSummaryId) {
            res.status(401).json({
                error: true,
                message: "Visit is not present"
            });
            return;
        }
        if (!Data[0].file && Number(ExpModeId) !== 7) {
            res.status(401).json({
                error: true,
                message: "Image is required for this expense"
            });
            return;
        }

        // check if same visit present for same employee on same expense mod and same convense mod
        const checkAlreadyVisitExpenseModeQuery = `SELECT * from dbo.visitexpense where EmpCode = :EMPCode AND VisitId=:VisitSummaryId AND expensemodeid=:ExpModeId`;
        const checkAlreadyVisitExpenseMode: any = await sequelize.query(checkAlreadyVisitExpenseModeQuery, {
            replacements: {
                EMPCode: req?.payload?.appUserId,
                VisitSummaryId: VisitSummaryId,
                ExpModeId,
            },
            type: QueryTypes.SELECT,
        });
        console.log(checkAlreadyVisitExpenseMode, "checkAlreadyVisitExpenseMode")
        if (checkAlreadyVisitExpenseMode.length !== 0) {
            res.status(401).json({
                error: true,
                message: "Expense is already created for same expense mod"
            });
            return;
        }

        const emailGetQuery = `SELECT (SELECT Email from dbo.employeedetails as iemp where iemp.EMPCode = emp.MgrEmployeeID) as managerEmail, (SELECT CONCAT(FirstName, ' ', LastName) AS Name from dbo.employeedetails as iemp where iemp.EMPCode = emp.MgrEmployeeID) as managerName FROM dbo.employeedetails as emp where emp.EMPCode = :EMPCode`;
        const emailGetDate: any = await sequelize.query(emailGetQuery, {
            replacements: { EMPCode: req?.payload?.appUserId },
            type: QueryTypes.INSERT,
        });
        console.log(emailGetDate, "emailGetDate")

        const firstQuery = 'INSERT INTO dbo.visitexpense ';
        const insertQuery = `${firstQuery} (
            ExpenseReqId,
            EmpCode,
            ConvModeId,
            amount,
            expensemodeid,
            VisitId,
            VisitSummaryId,
            VisitRemarks,
            Expense_document,
            Rate,
            Reason,
            Distance
        ) VALUES (
            '${uuid}',
            '${req?.payload?.appUserId}',
            '${ConvModeId}',
            '${Amount ? Amount : 0}',
            '${ExpModeId ? ExpModeId : 6}',
            '${VisitSummaryId}',
            '${VisitSummaryId}',
            '${Remarks}',
            '${JSON.stringify(Data)}',
            '${Rate}',
            '${Reason}',
            '${Distance}'
        )`;

        await sequelize.query(insertQuery, {
            replacements: {},
            type: QueryTypes.INSERT,
        });

        for (let i = 0; i < Data.length; i++) {
            if (Data[i].file) {
                const uuid1 = uuidv4();
                const firstQuery = 'INSERT INTO dbo.expensedocs';
                const insertQuery1 = `${firstQuery} (
                ExpenseDocId,
                ExpenseReqId,
                Amount,
                imageName,
                isVerified,
                isActive
            ) VALUES (
                '${uuid1}',
                '${uuid}',
                '${Data[i].amount ? Data[i].amount : 0}',
                '${Data[i].file}',
                '${"InProgress"}',
                '${1}'
            )`;

                await sequelize.query(insertQuery1, {
                    replacements: {},
                    type: QueryTypes.INSERT,
                });
            }
        }

        const getExpenseQuery = `SELECT emp.EMPCode as EmpId, CONCAT(emp.FirstName, ' -', emp.LastName) AS Name, mem.ExpModeDesc as ExpenseType, ve.amount as Cost, FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS Date, vs.VisitFrom, vs.VisitTo, vs.VisitPurpose as Purpose FROM dbo.visitexpense ve INNER JOIN dbo.employeedetails emp on emp.EMPCode = ve.EmpCode INNER JOIN dbo.visitsummary vs on vs.VisitSummaryId = ve.VisitSummaryId INNER JOIN dbo.mstexpmode mem on mem.ExpModeId = ve.expensemodeid where ve.ExpenseReqId =:ExpenseReqId`;

        const getExpenseDetail = await sequelize.query(getExpenseQuery, {
            replacements: { ExpenseReqId: uuid },
            type: QueryTypes.INSERT,
        });

        console.log(getExpenseDetail[0], "expenseDetail");

        let newAttachment: any = getExpenseDetail[0];
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "Total Amount", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: Amount });

        // const attachment = await convertToExcel(newAttachment)


        // if (emailGetDate[0][0]?.managerEmail) {
        //     sentCreatedExpenseMail(attachment, getExpenseDetail[0], emailGetDate[0][0]?.managerEmail, Amount, emailGetDate[0][0]?.managerName);
        // }

        res.status(200).json({ message: "Claim create successfully" });
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};

const getAllExpense = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const DesigId = req?.payload?.DesigId;
        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;
        const startDate: any = req.query.startDate;
        const endDate: any = req.query.endDate;
        let searchEMPCode: any = req.query.EMPCode || req?.payload?.appUserId;
        if (req.query.EMPCode === "all") {
            searchEMPCode = '';
        }
        console.log(searchEMPCode, startDate, endDate, "date==============>");

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let filter_query = ``;

        // Add date filtering if provided
        if (startDate && endDate) {
            filter_query = `AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate`
        }
        if (searchEMPCode) {
            filter_query += ` AND emp.EMPCode=:searchEMPCode`
        }

        let result: any = { count: 0, rows: [] };

        let query: string;
        if (DesigId === '4') {
            query = `
            SELECT 
                ve.*, 
                vs.VisitFrom, 
                vs.VisitTo, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName, 
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType) as TotalApproveAmount, 
                emp.FirstName, 
                emp.LastName,
                emp.EMPCode, 
                vs.VisitPurpose, 
                em.ExpModeDesc, 
                sts.Description as ExpenseStatus 
            FROM 
                dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
            WHERE 
                (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey OR emp.EMPCode LIKE :searchKey) 
                AND ve.EmpCode = :EMPCode
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;
        }
        else {
            query = `
            SELECT 
                ve.*, 
                vs.VisitFrom, 
                vs.VisitTo, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName, 
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType) as TotalApproveAmount,
                emp.FirstName, 
                emp.LastName,
                emp.EMPCode, 
                vs.VisitPurpose, 
                em.ExpModeDesc,  
                sts.Description as ExpenseStatus
            FROM 
                dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid 
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
            WHERE 
                (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey)
                AND (emp.MgrEmployeeID = :EMPCode OR ve.EmpCode = :EMPCode) 
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;
        }

        // Calculate row count if pageIndex is 0
        if (pageIndex !== undefined && pageSize) {
            if (pageIndex == 0) {
                const rowsCount = await sequelize.query(query, {
                    replacements: {
                        searchKey: searchKey,
                        EMPCode: req?.payload?.appUserId,
                        searchEMPCode: searchEMPCode,
                        startDate: startDate,
                        endDate: endDate,
                        verifyType: "Approved"
                    },
                    type: QueryTypes.SELECT,
                });
                result.count = rowsCount.length;
            }

            // Calculate offset and limit for pagination
            const offset = pageSize * pageIndex;
            query = query + `\n OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
        }

        // console.log('query', query);

        // Execute the query
        result.rows = await sequelize.query(query, {
            replacements: {
                searchKey: searchKey,
                EMPCode: req?.payload?.appUserId,
                searchEMPCode: searchEMPCode,
                startDate: startDate,
                endDate: endDate,
                verifyType: "Approved"
            },
            type: QueryTypes.SELECT,
        });
        // Transform the array
        let transformedData = { count: 0, rows: [] };
        transformedData.count = result.count;
        console.log(result.rows, "dffd");
        transformedData.rows = result.rows?.map((item: any) => {
            // Parse the expenseDocs JSON string
            const parsedExpenseDocs = JSON.parse(item.Expense_document);

            // Return a new object with the parsed data
            return {
                ...item, // Spread all existing keys from the original item
                Expense_document: parsedExpenseDocs // Overwrite expenseDocs with the parsed array
            };
        });

        res.status(200).send({ data: transformedData });
    } catch (error: any) {
        console.log(error);
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const getExportExpense = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const DesigId = req?.payload?.DesigId;
        let searchKey = req.query.searchKey;
        const startDate: any = req.query.startDate;
        const endDate: any = req.query.endDate;

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let filter_query = ``;

        if (startDate && endDate) {
            filter_query = `AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate`
        }

        let result: any = { count: 0, rows: [] };

        let query: string;

        // ✅ COMMON SELECT FIELDS (BOTH QUERIES USE SAME FIELDS)
        const selectFields = `
    emp.EMPCode as EmployeeId,
    CONCAT(emp.FirstName, ' ', emp.LastName) as Name,
    em.ExpModeDesc as ExpenseType,
    ve.amount as Cost,
    FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS ExpenseDate,
    vs.VisitFrom,
    FORMAT(vs.VisitDate AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS VisitDate,
    vs.VisitTo,
    vs.VisitPurpose as Purpose,

    -- ✅ NEW FIELDS
    ve.ApprovedById AS ApprovalID,
    ve.approve_amount AS ApprovedAmount
`;


        if (DesigId === '4') {
            query = `
                SELECT ${selectFields}
                FROM dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
                WHERE 
                    (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey OR emp.EMPCode LIKE :searchKey)
                    AND ve.EmpCode = :EMPCode
                    AND ve.isActive = 1
                    ${filter_query}
                ORDER BY ve.createdAt DESC
            `;
        } else {
            query = `
                SELECT ${selectFields}
                FROM dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid 
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
                WHERE 
                    (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey OR emp.EMPCode LIKE :searchKey)
                    AND (emp.MgrEmployeeID = :EMPCode OR ve.EmpCode = :EMPCode)
                    AND ve.isActive = 1
                    ${filter_query}
                ORDER BY ve.createdAt DESC
            `;
        }

        result.rows = await sequelize.query(query, {
            replacements: {
                searchKey: searchKey,
                EMPCode: req?.payload?.appUserId,
                startDate: startDate,
                endDate: endDate
            },
            type: QueryTypes.SELECT,
        });

        res.status(200).send({ data: result });

    } catch (error: any) {
        console.log(error);
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};


const getExpenseById = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const ExpenseReqId = req.query.ExpenseReqId;
        // console.log(req.query.ExpenseReqId, "req.query.ExpenseReqId");
        const selectQuery = `
        SELECT 
        vte.*,
        (SELECT demp.MgrEmployeeID FROM dbo.employeedetails demp WHERE demp.EMPCode = emp.EMPCode) as EmployeeMgrEmployeeID,
        emp.FirstName, 
        '${req?.payload?.appUserId}' as loginId, 
        em.ExpModeDesc, 
        emp.LastName, 
        vts.VisitDate, 
        vts.VisitFrom, 
        vts.VisitTo, 
        vts.VisitPurpose, 
        mst.Description as expense_status from dbo.visitexpense AS vte 
        INNER JOIN dbo.employeedetails emp on emp.EMPCode=vte.EmpCode 
        INNER JOIN dbo.mststatus mst on mst.StatusId=vte.ExpenseStatusId 
        INNER JOIN dbo.visitsummary vts on vts.VisitSummaryId=vte.VisitId 
        LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = vte.expensemodeid 
        WHERE 
        ExpenseReqId=:ExpenseReqId`
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                ExpenseReqId: ExpenseReqId,
            },
            type: QueryTypes.SELECT,
        });

        const docsQuery = `SELECT * from dbo.expensedocs where ExpenseReqId=:ExpenseReqId`
        const docsResult: any = await sequelize.query(docsQuery, {
            replacements: {
                ExpenseReqId: ExpenseReqId,
            },
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    docsResult: docsResult,
                    ExpenseReqId: ExpenseReqId,
                    message: 'Expense by id fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error);
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const approveDisapproveClaim = async (req: RequestType, res: Response, next: NextFunction) => {
    try {
        const { ExpenseReqId, isApprove, rejectReason, ExpenseDocId } = req.body;

        const updateMain = `
            UPDATE dbo.visitexpense
            SET ExpenseStatusId = :statusId,
                ApprovedById = :ApprovedById,
                reject_reason = :rejectReason
            WHERE ExpenseReqId = :ExpenseReqId
        `;

        await sequelize.query(updateMain, {
            replacements: {
                statusId: isApprove ? "2" : "3",
                ApprovedById: req?.payload?.appUserId,
                rejectReason,
                ExpenseReqId
            },
            type: QueryTypes.UPDATE
        });

        const updateDoc = `
            UPDATE dbo.expensedocs
            SET isVerified = :isVerified,
                ApprovedById = :ApprovedById,
                reject_reason = :rejectReason
            WHERE ExpenseDocId = :ExpenseDocId
        `;

        await sequelize.query(updateDoc, {
            replacements: {
                isVerified: isApprove ? "Approved" : "Rejected",
                ApprovedById: req?.payload?.appUserId,
                rejectReason,
                ExpenseDocId
            },
            type: QueryTypes.UPDATE
        });

        const docData = await sequelize.query(`
            SELECT ed.*, emp.*, vs.* 
            FROM dbo.expensedocs ed
            INNER JOIN dbo.visitexpense ve ON ve.ExpenseReqId = ed.ExpenseReqId
            INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode
            INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitSummaryId
            WHERE ed.ExpenseDocId = :ExpenseDocId
        `, {
            replacements: { ExpenseDocId },
            type: QueryTypes.SELECT
        });

        // const d = docData[0];

        // sentRejectExpenseMail(d.Email, d.Amount, d.FirstName + ' ' + d.LastName, d.VisitFrom, d.VisitTo, isApprove);

        res.status(200).json({
            message: "Expense status updated successfully",
            doc:docData
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};


const expMstMode = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded = req.payload;
        console.log(decoded)
        // Define SQL query to select all columns from the MstExpMode table
        const selectQuery = 'SELECT * FROM dbo.mstexpmode WHERE IsActive = 1';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });

        // If no data found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).json({
                "ResponseMessage": "No data found",
                "Status": false,
                "DataCount": 0,
                "Data": [],
                "ResponseCode": "NOT_FOUND",
                "confirmationbox": false
            });
            return;
        }

        // If data found, format the response as per the provided structure
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": rows.length,
            "Data": {
                "MstExpMode": rows.map((row: any) => ({
                    "ddlId": row.ExpModeId,
                    "ddlDesc": row.ExpModeDesc
                }))
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};



const updateConvModeRate = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { ConvModeId, Rate } = req.body;

        if (!ConvModeId || Rate === undefined) {
            res.status(400).json({
                ResponseMessage: "ConvModeId and Rate are required",
                Status: false,
                ResponseCode: "BAD_REQUEST"
            });
            return;
        }

        const updateQuery = `
            UPDATE dbo.mstconvmode
            SET Rate = :Rate
            WHERE ConvModeId = :ConvModeId
        `;

        const result: any = await sequelize.query(updateQuery, {
            replacements: { ConvModeId, Rate },
            type: QueryTypes.UPDATE
        });

        // If nothing was updated
        if (result[1] === 0) {
            res.status(404).json({
                ResponseMessage: "No record found for the given ConvModeId",
                Status: false,
                ResponseCode: "NOT_FOUND"
            });
            return;
        }

        // Fetch updated data
        const selectQuery = `SELECT * FROM dbo.mstconvmode WHERE IsActive = 1`;
        const rows: any = await sequelize.query(selectQuery, {
            type: QueryTypes.SELECT
        });

        res.status(200).json({
            ResponseMessage: "Rate updated successfully",
            Status: true,
            DataCount: rows.length,
            Data: rows,
            ResponseCode: "OK",
            confirmationbox: false
        });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({
            ResponseMessage: "Internal Server Error",
            Status: false,
            ResponseCode: "ERROR",
            error: error.message
        });
    }
};


const mstConMode = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded = req.payload;
        console.log(decoded)
        // Define SQL query to select all columns from the MstExpMode table
        const selectQuery = 'SELECT * FROM dbo.mstconvmode';
        const rows: any = await sequelize.query(selectQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });

        // If no data found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).send('No data found in MstConMode table');
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

const uploadExpenseDoc = async (req: RequestType, res: Response): Promise<void> => {
    try {
        console.log(req.body, "req.file")
        // File uploaded successfully
        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    message: 'File uploaded successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        res.status(401).json({ error: error });
    }
};

// Export Methods
export {
    getAllExpense,
    getExportExpense,
    approveDisapproveClaim,
    getExpenseById,
    expMstMode,
    mstConMode,
    createExpense,
    uploadExpenseDoc,
    updateConvModeRate,

};

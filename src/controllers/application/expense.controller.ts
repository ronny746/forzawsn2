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
import { convertToExcel, sentCreatedExpenseMail } from '../../helpers/service/email';
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
            Reason
        } = req.body;

        // console.log(req.body, "create expense body===============");

        const decoded: any = req?.payload
        const uuid = uuidv4();

        if (!VisitSummaryId) {
            res.status(422).json({ message: "Visit is not present" });
        }

        // const checkQuery = `
        // SELECT 
        // CASE 
        //     WHEN CONVERT(date, VisitDate) = CONVERT(date, GETDATE()) THEN 'true'
        //     ELSE 'false'
        // END AS IsCurrentDate
        // FROM dbo.visitsummary
        // WHERE VisitSummaryId = :VisitSummaryId`
        // const checkBool: any = await sequelize.query(checkQuery, {
        //     replacements: {
        //         VisitSummaryId: VisitSummaryId
        //     },
        //     type: QueryTypes.SELECT,
        // });

        // console.log(checkBool[0]?.IsCurrentDate, typeof(checkBool[0]?.IsCurrentDate), "checkBool");
        // if(checkBool[0]?.IsCurrentDate === "false")
        //     {
        //         const yesterdayCheckQuery = `
        //         SELECT 
        //         CASE 
        //             WHEN EXISTS (
        //                 SELECT 1
        //                 FROM dbo.[mstholiday]
        //                 WHERE CONVERT(date, HolidayDate) = DATEADD(day, -1, CONVERT(date, GETDATE()))
        //             )
        //             THEN 'true'
        //             ELSE 'false'
        //         END AS IsYesterdayPresent`;
        //         const yesterdayCheckBool: any = await sequelize.query(yesterdayCheckQuery, {
        //             replacements: {},
        //             type: QueryTypes.SELECT,
        //         });
        //         // console.log(yesterdayCheckBool[0]?.IsYesterdayPresent, "yesterdayCheckBool");
        //         if(yesterdayCheckBool === "true")
        //         {
        //             const checkBeforeYesterdayQuery = `
        //             SELECT 
        //             CASE 
        //                 WHEN CONVERT(date, VisitDate) = DATEADD(day, -2, CONVERT(date, GETDATE())) THEN 'true'
        //                 ELSE 'false'
        //             END AS IsBeforeYesterDayDate
        //             FROM dbo.visitsummary
        //             WHERE VisitSummaryId = :VisitSummaryId`
        //             const checkBeforeYesterdayBool: any = await sequelize.query(checkBeforeYesterdayQuery, {
        //                 replacements: {
        //                     VisitSummaryId: VisitSummaryId
        //                 },
        //                 type: QueryTypes.SELECT,
        //             });
        //             // console.log(checkBeforeYesterdayBool, "checkBeforeYesterdayBool");
        //             if(checkBeforeYesterdayBool[0]?.IsBeforeYesterDayDate === "false")
        //                 {
        //                     res.status(500).json({ message: "Previous expense can not be claim" });
        //                     return;
        //                 }
        //         }
        //         else
        //         {
        //             res.status(500).json({ message: "Previous expense can not be claim" });
        //             return;
        //         }
        //     }

        const emailGetQuery = `SELECT (SELECT Email from dbo.employeedetails as iemp where iemp.EMPCode = emp.MgrEmployeeID) as managerEmail, (SELECT CONCAT(FirstName, ' ', LastName) AS Name from dbo.employeedetails as iemp where iemp.EMPCode = emp.MgrEmployeeID) as managerName FROM dbo.employeedetails as emp where emp.EMPCode = :EMPCode`;
        const emailGetDate: any = await sequelize.query(emailGetQuery, {
            replacements: { EMPCode: decoded.EMPCode },
            type: QueryTypes.INSERT,
        });
        // console.log(emailGetDate, "emailGetDate")

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
            Reason
        ) VALUES (
            '${uuid}',
            '${decoded.EMPCode}',
            '${ConvModeId}',
            '${Amount ? Amount : 0}',
            '${ExpModeId ? ExpModeId : 6}',
            '${VisitSummaryId}',
            '${VisitSummaryId}',
            '${Remarks}',
            '${JSON.stringify(Data)}',
            '${Rate}',
            '${Reason}'
        )`;

        await sequelize.query(insertQuery, {
            replacements: {},
            type: QueryTypes.INSERT,
        });

        for (let i = 0; i < Data.length; i++) {
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
                '${Data[i].image}',
                '${"InProgress"}',
                '${1}'
            )`;

            await sequelize.query(insertQuery1, {
                replacements: {},
                type: QueryTypes.INSERT,
            });
        }

        const getExpenseQuery = `SELECT emp.EMPCode as EmpId, CONCAT(emp.FirstName, ' -', emp.LastName) AS Name, mem.ExpModeDesc as ExpenseType, ve.amount as Cost, FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS Date, vs.VisitFrom, vs.VisitTo, vs.VisitPurpose as Purpose FROM dbo.visitexpense ve INNER JOIN dbo.employeedetails emp on emp.EMPCode = ve.EmpCode INNER JOIN dbo.visitsummary vs on vs.VisitSummaryId = ve.VisitSummaryId INNER JOIN dbo.mstexpmode mem on mem.ExpModeId = ve.expensemodeid where ve.ExpenseReqId =:ExpenseReqId`;

        const getExpenseDetail = await sequelize.query(getExpenseQuery, {
            replacements: { ExpenseReqId: uuid },
            type: QueryTypes.INSERT,
        });

        // console.log(getExpenseDetail[0], "expenseDetail");

        let newAttachment: any = getExpenseDetail[0];
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: "" });
        newAttachment.push({ EmpId: "Total Amount", Name: "", Expense: "", Cost: "", Date: "", VisitFrom: "", VisitTo: "", Purpose: Amount });

        const attachment = await convertToExcel(newAttachment)


        if (emailGetDate[0][0]?.managerEmail) {
            sentCreatedExpenseMail(attachment, getExpenseDetail[0], emailGetDate[0][0]?.managerEmail, Amount, emailGetDate[0][0]?.managerName);
        }

        res.status(200).json({ message: "Claim create successfully" });
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error });
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
        res.status(500).json({ error: error });
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
        res.status(500).json({ error: error });
    }
};

const getAllExpense = async (req: RequestType, res: Response): Promise<void> => {
    try {

        const VisitSummaryId = req.query.VisitSummaryId;

        if (!VisitSummaryId) {
            res.status(422).json({ message: "Visit is not present" });
        }

        // console.log(VisitSummaryId, "VisitSummaryId")

        let query = `
    SELECT ve.ExpenseReqId,
           ve.expense_doc, 
           ve.amount AS Amount, 
           (
           SELECT STRING_AGG(
               CONCAT(ed.ExpenseDocId, '|', ed.imageName, '|', ed.Amount, '|', ed.isVerified), '; '
           ) 
           FROM dbo.expensedocs ed
           WHERE ed.ExpenseReqId = ve.ExpenseReqId
           ) AS ExpenseDocs,
           ve.createdAt, 
           em.ExpModeDesc, 
           ve.Rate, 
           ve.updatedAt, 
           vs.VisitFrom, 
           vs.VisitTo, 
           vs.VisitPurpose, 
           cm.ConvModeDesc, 
           sts.Description, 
           (SELECT CONCAT(emp.FirstName, ' ', emp.LastName)
            FROM dbo.employeedetails emp 
            WHERE emp.EMPCode = ve.ApprovedById) AS ApprovedBy,
           (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) 
            FROM dbo.employeedetails emp 
            WHERE emp.EMPCode = ve.CheckedById) AS CheckedBy, 
           ve.createdAt 
    FROM dbo.visitexpense AS ve 
    INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
    INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
    LEFT JOIN dbo.mstconvmode cm ON cm.ConvModeId = ve.ConvModeId 
    LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid 
    INNER JOIN dbo.mststatus sts ON sts.ExpancestatusId = ve.ExpenseStatusId 
    WHERE ve.VisitId = :VisitSummaryId 
          AND ve.isActive = 1`;

        const result: any = await sequelize.query(query, {
            replacements: { VisitSummaryId: VisitSummaryId },
            type: QueryTypes.SELECT,
        });

        let query1 = `
            SELECT
            ve.ExpenseReqId,
            ed.ExpenseDocId, 
            ed.imageName, 
            ed.Amount,
            ed.isVerified
            FROM dbo.expensedocs ed
            INNER JOIN dbo.visitexpense ve ON ed.ExpenseReqId = ve.ExpenseReqId
            WHERE ve.VisitId = :VisitSummaryId 
            AND ve.isActive = 1`;

        const result1: any = await sequelize.query(query1, {
            replacements: { VisitSummaryId: VisitSummaryId },
            type: QueryTypes.SELECT,
        });

        // console.log(result, "result-----------")

        if (result?.length === 0) {
            let query0 = 'SELECT vs.VisitFrom, vs.VisitTo, vs.VisitPurpose FROM dbo.visitsummary vs WHERE vs.VisitSummaryId=:VisitSummaryId';

            const result0: any = await sequelize.query(query0, {
                replacements: { VisitSummaryId: VisitSummaryId },
                type: QueryTypes.SELECT,
            });
            // console.log(result0, "result0");
            const responseData = {
                "ResponseMessage": "Success",
                "Status": true,
                "DataCount": 1,
                "Data": {
                    "ClaimDetails": [
                        {
                            "ExpenseReqId": null,
                            "Amount": null,
                            "ExpModeDesc": null,
                            "Rate": null,
                            "updatedAt": null,
                            "VisitFrom": result0[0]?.VisitFrom,
                            "VisitTo": result0[0]?.VisitTo,
                            "VisitPurpose": result0[0]?.VisitPurpose,
                            "ConvModeDesc": null,
                            "Description": null,
                            "ApprovedBy": null,
                            "CheckedBy": null,
                            "createdAt": null,
                        }
                    ]
                },
                claimData: result1,
                "ResponseCode": "OK",
                "confirmationbox": false
            }

            res.status(200).send(responseData);
            return;
        }
        else {
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": result.length,
            "Data": {
                "ClaimDetails": result
            },
            claimData: result1,
            "ResponseCode": "OK",
            "confirmationbox": false
        }

        res.status(200).send(responseData);
    }
    } catch (error: any) {
        console.log(error.message, "error in get all expense");
        res.status(500).send({ error: error });
    }
};

const getAllExpenseList = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const decoded: any = req.payload;
        const EMPCode = decoded.EMPCode;
        // console.log(EMPCode, decoded)

        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;
        const startDate: any = req.query.startDate;
        const endDate: any = req.query.endDate;

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let filter_query = ``;

        // Add date filtering if provided
        if (startDate && endDate) {
            filter_query = `AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate`
        }

        let result: any = { count: 0, rows: [] };

        let query = `
            SELECT 
                ve.*, 
                vs.VisitFrom, 
                vs.VisitTo, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName, 
                (SELECT ed.ExpenseDocId, ed.imageName, ed.Amount, ed.isVerified
                    FROM dbo.expensedocs ed 
                    WHERE ed.ExpenseReqId = ve.ExpenseReqId 
                    FOR JSON PATH) AS expenseDocs,
                emp.FirstName, 
                emp.LastName, 
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
                AND ve.EmpCode = :EMPCode
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;

        // Calculate row count if pageIndex is 0
        if (pageIndex !== undefined && pageSize) {
            if (pageIndex == 0) {
                const rowsCount = await sequelize.query(query, {
                    replacements: {
                        searchKey: searchKey,
                        EMPCode: EMPCode,
                        startDate: startDate,
                        endDate: endDate
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
                EMPCode: EMPCode,
                startDate: startDate,
                endDate: endDate
            },
            type: QueryTypes.SELECT,
        });

        // Transform the array
        const transformedData = result.rows?.map((item: any) => {
            // Parse the expenseDocs JSON string
            const parsedExpenseDocs = JSON.parse(item.expenseDocs);

            // Return a new object with the parsed data
            return {
                ...item, // Spread all existing keys from the original item
                expenseDocs: parsedExpenseDocs // Overwrite expenseDocs with the parsed array
            };
        });

        res.status(200).send({ data: transformedData });
    } catch (error: any) {
        console.log(error);
        if (error?.isJoi === true) error.status = 422;
        next(error);
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
        res.status(500).json({ error: error });
    }
};

// Export Methods
export {
    createExpense,
    expMstMode,
    mstConMode,
    getAllExpense,
    getAllExpenseList,
    uploadExpenseDoc
};

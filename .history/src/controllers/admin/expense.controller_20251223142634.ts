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





import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

import { RequestType } from '../../helpers/shared/shared.type';
// import { convertToExcel, sentCreatedExpenseMail } from '../../helpers/service/email';
import { sentRejectExpenseMail, sentRejectExpenseMailByFinance, sentRejectExpenseMailByHr } from '../../helpers/service/email';
// import moment from 'moment';
const {
    v4: uuidv4,
} = require('uuid');
const { QueryTypes } = require("sequelize");

// Controller Methods
interface WatermarkData {
    createdDate: string;
    expenseType: string;
    conveyanceMode: string;
    visitFrom: string;
    visitTo: string;
    empCode: string;
    amount: string;
}

// Function to add watermark to image buffer
const addWatermarkToImage = async (
    imageBuffer: Buffer,
    watermarkData: WatermarkData
): Promise<Buffer> => {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 1000;
        const height = metadata.height || 800;

        // Create SVG watermark
        const svgWatermark = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="shadow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                    </filter>
                </defs>
                <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.1)" />
                <text 
                    x="${width / 2}" 
                    y="${height / 2 - 40}" 
                    font-size="16" 
                    fill="white" 
                    text-anchor="middle" 
                    font-family="Arial" 
                    font-weight="bold"
                    filter="url(#shadow)"
                >Created: ${watermarkData.createdDate}</text>
                <text 
                    x="${width / 2}" 
                    y="${height / 2}" 
                    font-size="16" 
                    fill="white" 
                    text-anchor="middle" 
                    font-family="Arial" 
                    font-weight="bold"
                    filter="url(#shadow)"
                >Type: ${watermarkData.expenseType} | Mode: ${watermarkData.conveyanceMode}</text>
                <text 
                    x="${width / 2}" 
                    y="${height / 2 + 40}" 
                    font-size="14" 
                    fill="white" 
                    text-anchor="middle" 
                    font-family="Arial"
                    filter="url(#shadow)"
                >${watermarkData.visitFrom} → ${watermarkData.visitTo}</text>
            </svg>
        `;

        const watermarkedImage = await sharp(imageBuffer)
            .composite([{ input: Buffer.from(svgWatermark), blend: 'overlay' }])
            .toBuffer();

        return watermarkedImage;
    } catch (error) {
        console.error('Error adding watermark:', error);
        throw error;
    }
};

// Function to download image from URL and add watermark
const processImageWithWatermark = async (
    imageUrl: string,
    watermarkData: WatermarkData
): Promise<Buffer> => {
    try {
        let imageBuffer: Buffer;

        // Check if it's a URL or local file path
        if (imageUrl.startsWith('http')) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
        } else {
            imageBuffer = fs.readFileSync(imageUrl);
        }

        return await addWatermarkToImage(imageBuffer, watermarkData);
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
};

// Main API function to generate PDF
const generateExpensePdfWithWatermark = async (
    req: RequestType,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { empCode, startDate, endDate } = req.query;

        if (!empCode) {
            res.status(400).json({
                error: true,
                message: "Employee code is required"
            });
            return;
        }

        // Fetch expense data
        const expenseQuery = `
            SELECT 
                ve.ExpenseReqId,
                ve.EmpCode,
                emp.FirstName,
                emp.LastName,
                ve.amount,
                FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy HH:mm') AS CreatedDate,
                em.ExpModeDesc as ExpenseType,
                cm.ConvModeDesc as ConveyanceMode,
                vs.VisitFrom,
                vs.VisitTo,
                vs.VisitPurpose,
                ve.Expense_document,
                vs.VisitDate
            FROM dbo.visitexpense ve
            INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode
            LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid
            LEFT JOIN dbo.mstconvmode cm ON cm.ConvModeId = ve.ConvModeId
            INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitSummaryId
            WHERE ve.EmpCode = :empCode 
            AND ve.isActive = 1
            ${startDate && endDate ? 'AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate' : ''}
            ORDER BY ve.createdAt DESC
        `;

        const expenses: any = await sequelize.query(expenseQuery, {
            replacements: {
                empCode: empCode,
                startDate: startDate,
                endDate: endDate
            },
            type: QueryTypes.SELECT,
        });

        if (expenses.length === 0) {
            res.status(404).json({
                error: true,
                message: "No expenses found for this employee"
            });
            return;
        }

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 20
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Expense_${empCode}_${new Date().getTime()}.pdf"`
        );

        doc.pipe(res);

        // Add title
        doc.fontSize(20).font('Helvetica-Bold').text('Expense Report', { align: 'center' });
        doc.moveDown();

        // Add employee info
        const employee = expenses[0];
        doc.fontSize(12).font('Helvetica')
            .text(`Employee: ${employee.FirstName} ${employee.LastName}`, { align: 'left' })
            .text(`Employee Code: ${employee.EmpCode}`)
            .text(`Total Expenses: ${expenses.length}`);
        doc.moveDown();

        // Add table header
        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold')
            .text('Expense ID', 50, tableTop, { width: 80 })
            .text('Type', 140, tableTop, { width: 80 })
            .text('Mode', 240, tableTop, { width: 80 })
            .text('From-To', 340, tableTop, { width: 100 })
            .text('Amount', 450, tableTop, { width: 80 })
            .text('Date', 530, tableTop, { width: 80 });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.moveDown(2);

        // Add expense rows
        expenses.forEach((expense: any, index: number) => {
            const y = doc.y;
            doc.fontSize(9).font('Helvetica')
                .text(expense.ExpenseReqId.substring(0, 8), 50, y, { width: 80 })
                .text(expense.ExpenseType || 'N/A', 140, y, { width: 80 })
                .text(expense.ConveyanceMode || 'N/A', 240, y, { width: 80 })
                .text(`${expense.VisitFrom}-${expense.VisitTo}`, 340, y, { width: 100 })
                .text(expense.amount.toString(), 450, y, { width: 80 })
                .text(expense.CreatedDate, 530, y, { width: 80 });

            doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
            doc.moveDown(1.5);

            // Add images with watermark if available
            if (expense.Expense_document) {
                try {
                    const docs = JSON.parse(expense.Expense_document);
                    if (Array.isArray(docs) && docs.length > 0) {
                        doc.moveDown();
                        doc.fontSize(10).font('Helvetica-Bold').text('Attached Images:', { underline: true });
                        doc.moveDown();

                        docs.forEach(async (doc_item: any, docIndex: number) => {
                            if (doc_item.file) {
                                try {
                                    const watermarkData: WatermarkData = {
                                        createdDate: expense.CreatedDate,
                                        expenseType: expense.ExpenseType || 'N/A',
                                        conveyanceMode: expense.ConveyanceMode || 'N/A',
                                        visitFrom: expense.VisitFrom,
                                        visitTo: expense.VisitTo,
                                        empCode: expense.EmpCode,
                                        amount: expense.amount.toString()
                                    };

                                    const watermarkedImageBuffer = await processImageWithWatermark(
                                        doc_item.file,
                                        watermarkData
                                    );

                                    // Add image to PDF (resize if needed)
                                    if (doc.y > 450) {
                                        doc.addPage();
                                    }

                                    doc.image(watermarkedImageBuffer, 50, doc.y, { width: 300 });
                                    doc.moveDown(2);

                                    if (docIndex < docs.length - 1) {
                                        doc.moveDown();
                                    }
                                } catch (imgError) {
                                    console.error('Error processing image:', imgError);
                                    doc.fontSize(9).text(`[Image Error: ${doc_item.file}]`);
                                }
                            }
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing expense documents:', parseError);
                }
            }

            if (index < expenses.length - 1) {
                doc.addPage();
            }
        });

        doc.end();
    } catch (error: any) {
        console.error('Error generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: true,
                message: 'Error generating PDF',
                details: error.message
            });
        }
        next(error);
    }
};

const shortExpenseId = (id: any) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0; // convert to 32-bit int
    }
    return `${"FORZA"}-${Math.abs(hash).toString(36).toUpperCase()}`; // base36 = short
}

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
        if (!Data[0].file && Number(ExpModeId) !== 9 && Number(ExpModeId) !== 7) {
            res.status(401).json({
                error: true,
                message: "Image is required for this expense"
            });
            return;
        }

        let sum = 0;
        for (let i = 0; i < Data.length; i++) {
            sum += Number(Data[i].amount ? Data[i].amount : 0);
        }

        if (Data[0].file && (Number(sum) !== Number(Amount))) {
            res.status(401).json({
                error: true,
                message: "Each amount of doc must be equal to Total expense"
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
        await sequelize.query(emailGetQuery, {
            replacements: { EMPCode: req?.payload?.appUserId },
            type: QueryTypes.INSERT,
        });

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
            Distance,
            deviceType,
            ExpenseId
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
            '${Distance}',
            'web',
            '${shortExpenseId(uuid)}'
        )`;

        await sequelize.query(insertQuery, {
            replacements: {},
            type: QueryTypes.INSERT,
        });

        const promises = Data.map(async (item: any) => {
            if (!item.file) return; // skip if no file

            const id = uuidv4();

            const insertQuery = `
                INSERT INTO dbo.expensedocs 
                (ExpenseDocId, ExpenseReqId, Amount, imageName, isVerified, isActive, deviceType)
                VALUES (:ExpenseDocId, :ExpenseReqId, :Amount, :imageName, :isVerified, :isActive, :deviceType)
            `;

            const params = {
                ExpenseDocId: id,
                ExpenseReqId: uuid,
                Amount: item.amount || 0,
                imageName: item.file,
                isVerified: "InProgress",
                isActive: 1,
                deviceType: 'web'
            };

            return sequelize.query(insertQuery, {
                replacements: params,
                type: QueryTypes.INSERT,
            });
        });

        // Execute all queries in parallel
        await Promise.all(promises);

        if (!Data[0].file && Number(ExpModeId) === 9 && Number(ExpModeId) === 7) {
            const uuid1 = uuidv4();
            const firstQuery = 'INSERT INTO dbo.expensedocs';
            const insertQuery1 = `${firstQuery} (
                ExpenseDocId,
                ExpenseReqId,
                Amount,
                imageName,
                isVerified,
                isActive,
                deviceType
            ) VALUES (
                '${uuid1}',
                '${uuid}',
                '${Amount ? Amount : 0}',
                'temp',
                '${"InProgress"}',
                '${1}',
                'web'
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

const getAllExpenseForHr = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        // const DesigId = req?.payload?.DesigId;
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
        query = `SELECT 
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

        // Add date filtering if provided
        if (startDate && endDate) {
            filter_query = `AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate`
        }

        let result: any = { count: 0, rows: [] };

        let query: string;
        if (DesigId === '4') {
            query = `
            SELECT
                emp.EMPCode as EmployeeId,
                ve.ExpenseId as ExpenseId,
                CONCAT(emp.FirstName, ' ', emp.LastName) as Name,
                em.ExpModeDesc as ExpenseType,
                ve.amount as Cost,
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType AND verificationStatusByHr = :verificationStatusByHr AND verificationStatusByFinance = :verificationStatusByFinance) as TotalApproveAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType1 AND verificationStatusByHr = :verificationStatusByHr1 AND verificationStatusByFinance = :verificationStatusByFinance1) as TotalRejectAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType2 AND verificationStatusByHr = :verificationStatusByHr2 AND verificationStatusByFinance = :verificationStatusByFinance2) as TotalPendingAmount,
                (
                SELECT 
                    ed.ApprovedById AS StatusUpdateByManagerId,
                    ed.isVerified AS StatusUpdateByManager,
                    ed.StatusUpdatedByHrId AS StatusUpdateByHrId,
                    ed.verificationStatusByHr AS StatusUpdateByHr,
                    ed.ApprovedByFinanceId AS StatusUpdateByFinanceId,
                    ed.verificationStatusByFinance AS StatusUpdateByFinance,
                    ed.Amount
                    FROM dbo.expensedocs ed
                    WHERE ed.ExpenseReqId = ve.ExpenseReqId 
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                ) AS StatusUpdateData,
                ve.ApprovedById,
                FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS ExpenseDate, 
                vs.VisitFrom,
                FORMAT(vs.VisitDate AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS VisitDate, 
                vs.VisitTo,
                vs.VisitPurpose as Purpose  
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
                emp.EMPCode as EmployeeId,
                ve.ExpenseId as ExpenseId,
                CONCAT(emp.FirstName, ' ', emp.LastName) as Name,
                em.ExpModeDesc as ExpenseType,
                ve.amount as TotalAmount,
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType AND verificationStatusByHr = :verificationStatusByHr AND verificationStatusByFinance = :verificationStatusByFinance) as TotalApproveAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType1 AND verificationStatusByHr = :verificationStatusByHr1 AND verificationStatusByFinance = :verificationStatusByFinance1) as TotalRejectAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType2 AND verificationStatusByHr = :verificationStatusByHr2 AND verificationStatusByFinance = :verificationStatusByFinance2) as TotalPendingAmount,
                (
                SELECT 
                    ed.ApprovedById AS StatusUpdateByManagerId,
                    ed.isVerified AS StatusUpdateByManager,
                    ed.StatusUpdatedByHrId AS StatusUpdateByHrId,
                    ed.verificationStatusByHr AS StatusUpdateByHr,
                    ed.ApprovedByFinanceId AS StatusUpdateByFinanceId,
                    ed.verificationStatusByFinance AS StatusUpdateByFinance,
                    ed.Amount
                    FROM dbo.expensedocs ed
                    WHERE ed.ExpenseReqId = ve.ExpenseReqId
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                ) AS StatusUpdateData,
                ve.ApprovedById,
                FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS ExpenseDate, 
                vs.VisitFrom,
                FORMAT(vs.VisitDate AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS VisitDate,
                vs.VisitTo,
                vs.VisitPurpose as Purpose
            FROM 
                dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid 
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
            WHERE 
                (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey OR emp.EMPCode LIKE :searchKey)
                AND (emp.MgrEmployeeID = :EMPCode OR ve.EmpCode = :EMPCode) 
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;
        }

        result.rows = await sequelize.query(query, {
            replacements: {
                searchKey: searchKey,
                EMPCode: req?.payload?.appUserId,
                startDate: startDate,
                endDate: endDate,
                verifyType: "Approved",
                verificationStatusByHr: "Approved",
                verificationStatusByFinance: "Approved",
                verifyType1: "Rejected",
                verificationStatusByHr1: "Rejected",
                verificationStatusByFinance1: "Rejected",
                verifyType2: "InProgress",
                verificationStatusByHr2: "InProgress",
                verificationStatusByFinance2: "InProgress"
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

const getExportExpenseHr = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const DesigId = req?.payload?.DesigId;
        let searchKey = req.query.searchKey || '';
        const startDate: any = req.query.startDate;
        const endDate: any = req.query.endDate;

        if (searchKey === "all") {
            searchKey = '';
        }

        let filter_query = ``;

        // Add date filtering if provided
        if (startDate && endDate) {
            filter_query = `AND CAST(ve.createdAt AS DATE) BETWEEN :startDate AND :endDate`
        }

        if (searchKey) {
            filter_query += ` AND emp.EMPCode=:searchKey`
        }

        let result: any = { count: 0, rows: [] };

        let query: string;
        if (DesigId === '4') {
            query = `
            SELECT
                emp.EMPCode as EmployeeId,
                ve.ExpenseId as ExpenseId,
                CONCAT(emp.FirstName, ' ', emp.LastName) as Name,
                em.ExpModeDesc as ExpenseType,
                ve.amount as Cost,
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType AND verificationStatusByHr = :verificationStatusByHr AND verificationStatusByFinance = :verificationStatusByFinance) as TotalApproveAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType1 AND verificationStatusByHr = :verificationStatusByHr1 AND verificationStatusByFinance = :verificationStatusByFinance1) as TotalRejectAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType2 AND verificationStatusByHr = :verificationStatusByHr2 AND verificationStatusByFinance = :verificationStatusByFinance2) as TotalPendingAmount,
                (
                SELECT 
                    ed.ApprovedById AS StatusUpdateByManagerId,
                    ed.isVerified AS StatusUpdateByManager,
                    ed.StatusUpdatedByHrId AS StatusUpdateByHrId,
                    ed.verificationStatusByHr AS StatusUpdateByHr,
                    ed.ApprovedByFinanceId AS StatusUpdateByFinanceId,
                    ed.verificationStatusByFinance AS StatusUpdateByFinance,
                    ed.Amount
                    FROM dbo.expensedocs ed
                    WHERE ed.ExpenseReqId = ve.ExpenseReqId 
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                ) AS StatusUpdateData,
                ve.ApprovedById,
                FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS ExpenseDate, 
                vs.VisitFrom,
                FORMAT(vs.VisitDate AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS VisitDate, 
                vs.VisitTo,
                vs.VisitPurpose as Purpose  
            FROM 
                dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
            WHERE 
                ve.EmpCode = :EMPCode
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;
        }
        else {
            query = `
            SELECT 
                emp.EMPCode as EmployeeId,
                ve.ExpenseId as ExpenseId,
                CONCAT(emp.FirstName, ' ', emp.LastName) as Name,
                em.ExpModeDesc as ExpenseType,
                ve.amount as TotalAmount,
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = ve.ApprovedById) as ApprovedByName,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType AND verificationStatusByHr = :verificationStatusByHr AND verificationStatusByFinance = :verificationStatusByFinance) as TotalApproveAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType1 AND verificationStatusByHr = :verificationStatusByHr1 AND verificationStatusByFinance = :verificationStatusByFinance1) as TotalRejectAmount,
                (SELECT SUM(CAST(ed.Amount AS INT)) FROM dbo.expensedocs ed WHERE ed.ExpenseReqId = ve.ExpenseReqId AND ed.isVerified = :verifyType2 AND verificationStatusByHr = :verificationStatusByHr2 AND verificationStatusByFinance = :verificationStatusByFinance2) as TotalPendingAmount,
                (
                SELECT 
                    ed.ApprovedById AS StatusUpdateByManagerId,
                    ed.isVerified AS StatusUpdateByManager,
                    ed.StatusUpdatedByHrId AS StatusUpdateByHrId,
                    ed.verificationStatusByHr AS StatusUpdateByHr,
                    ed.ApprovedByFinanceId AS StatusUpdateByFinanceId,
                    ed.verificationStatusByFinance AS StatusUpdateByFinance,
                    ed.Amount
                    FROM dbo.expensedocs ed
                    WHERE ed.ExpenseReqId = ve.ExpenseReqId
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                ) AS StatusUpdateData,
                ve.ApprovedById,
                FORMAT(ve.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS ExpenseDate, 
                vs.VisitFrom,
                FORMAT(vs.VisitDate AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time', 'dd-MM-yyyy') AS VisitDate,
                vs.VisitTo,
                vs.VisitPurpose as Purpose
            FROM 
                dbo.visitexpense AS ve 
                INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ve.VisitId 
                INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ve.EmpCode 
                LEFT JOIN dbo.mstexpmode em ON em.ExpModeId = ve.expensemodeid 
                INNER JOIN dbo.mststatus sts ON sts.StatusId = ve.ExpenseStatusId 
            WHERE
                (emp.MgrEmployeeID = :EMPCode OR ve.EmpCode = :EMPCode) 
                AND ve.isActive = 1
                ${filter_query}
                order by ve.createdAt desc
        `;
        }

        result.rows = await sequelize.query(query, {
            replacements: {
                searchKey: searchKey,
                EMPCode: req?.payload?.appUserId,
                startDate: startDate,
                endDate: endDate,
                verifyType: "Approved",
                verificationStatusByHr: "Approved",
                verificationStatusByFinance: "Approved",
                verifyType1: "Rejected",
                verificationStatusByHr1: "Rejected",
                verificationStatusByFinance1: "Rejected",
                verifyType2: "InProgress",
                verificationStatusByHr2: "InProgress",
                verificationStatusByFinance2: "InProgress"
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

const getExpenseAmount = async (req: RequestType, res: Response): Promise<void> => {
    try {

        const DesigId = req?.payload?.DesigId;

        let data = {};

        if (Number(DesigId) === 4) {  // executive
            data = {
                metro: 1800,
                no_metro: 1500,
                self_stay: 750,
            }
        }
        else if (Number(DesigId) === 3) {  // manager
            data = {
                metro: 4000,
                no_metro: 3000,
                self_stay: 1000
            }
        }
        else {  // other
            data = {
                metro: 6000,
                no_metro: 5000,
                self_stay: 1250
            }
        }

        // ✅ Success response
        res.status(200).json({
            ResponseMessage: "Expense Amount Get Successfully",
            Status: true,
            data: data,
            ResponseCode: "OK",
            confirmationbox: true
        });

    } catch (error: any) {
        console.log("Error in expense amount", error);
        res.status(500).json({
            ResponseMessage: "Internal Server Error",
            Status: false,
            ResponseCode: "SERVER_ERROR",
            confirmationbox: false
        });
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

const approveDisapproveClaim = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ExpenseReqId, isApprove, rejectReason, ExpenseDocId } = req.body;
        // console.log(req.body, "req.body");
        const selectQuery = 'UPDATE dbo.visitexpense SET ExpenseStatusId=:ExpenseStatusId, ApprovedById=:ApprovedById, reject_reason=:reject_reason where ExpenseReqId=:ExpenseReqId'
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                ApprovedById: req?.payload?.appUserId,
                ExpenseStatusId: isApprove ? "2" : "3",
                ExpenseReqId: ExpenseReqId,
                reject_reason: rejectReason
            },
            type: QueryTypes.UPDATE,
        });

        const updateQuery = 'UPDATE dbo.expensedocs SET isVerified=:isVerified, ApprovedById=:ApprovedById, reject_reason=:reject_reason where ExpenseDocId=:ExpenseDocId'
        await sequelize.query(updateQuery, {
            replacements: {
                ApprovedById: req?.payload?.appUserId,
                isVerified: isApprove ? "Approved" : "Rejected",
                ExpenseDocId: ExpenseDocId,
                reject_reason: rejectReason
            },
            type: QueryTypes.UPDATE,
        });

        // const docQuery = 'SELECT ed.*, (select ve.* from dbo.visitexpense ve where ve.ExpenseReqId=ed.ExpenseReqId) FROM dbo.expensedocs ed INNER JOIN dbo.visitexpense ve on ve.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode where ed.ExpenseDocId = :ExpenseDocId';
        const docQuery = 'SELECT ed.*, emp.*, vs.* FROM dbo.visitexpense ve INNER JOIN dbo.expensedocs ed on ed.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode INNER JOIN dbo.visitsummary vs on vs.VisitSummaryId=ve.VisitSummaryId where ed.ExpenseDocId = :ExpenseDocId';
        const docData: any = await sequelize.query(docQuery, {
            replacements: {
                ExpenseDocId: ExpenseDocId,
            },
            type: QueryTypes.SELECT,
        });

        // console.log(docData, "docDAta");
        const docData1 = docData[0];


        // if (!isApprove) {
        sentRejectExpenseMail(docData1?.Email, docData1?.Amount, docData1?.FirstName + ' ' + docData1?.LastName, docData1.VisitFrom, docData1?.VisitTo, isApprove, ExpenseReqId);
        // }

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    ExpenseReqId: ExpenseReqId,
                    message: 'Expense accept or reject successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error, "Approve or Reject Error")
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const approveDisapproveClaimByHr = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ExpenseReqId, isHold, holdReason, ExpenseDocId } = req.body;
        // console.log(req.body, "req.body");
        const expenseUpdateQuery = 'UPDATE dbo.visitexpense SET ExpenseStatusChangeByHr=:ExpenseStatusChangeByHr where ExpenseReqId=:ExpenseReqId'
        const results: any = await sequelize.query(expenseUpdateQuery, {
            replacements: {
                ExpenseStatusChangeByHr: 1,
                ExpenseReqId: ExpenseReqId,
            },
            type: QueryTypes.UPDATE,
        });

        const updateQuery = 'UPDATE dbo.expensedocs SET verificationStatusByHr=:verificationStatusByHr, StatusUpdatedByHrId=:StatusUpdatedByHrId, hold_reason_by_hr=:hold_reason_by_hr where ExpenseDocId=:ExpenseDocId'
        await sequelize.query(updateQuery, {
            replacements: {
                StatusUpdatedByHrId: req?.payload?.appUserId,
                verificationStatusByHr: isHold ? "Hold" : "Release",
                ExpenseDocId: ExpenseDocId,
                hold_reason_by_hr: holdReason
            },
            type: QueryTypes.UPDATE,
        });

        // const docQuery = 'SELECT ed.*, (select ve.* from dbo.visitexpense ve where ve.ExpenseReqId=ed.ExpenseReqId) FROM dbo.expensedocs ed INNER JOIN dbo.visitexpense ve on ve.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode where ed.ExpenseDocId = :ExpenseDocId';
        const docQuery = 'SELECT ed.*, emp.*, vs.* FROM dbo.visitexpense ve INNER JOIN dbo.expensedocs ed on ed.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode INNER JOIN dbo.visitsummary vs on vs.VisitSummaryId=ve.VisitSummaryId where ed.ExpenseDocId = :ExpenseDocId';
        const docData: any = await sequelize.query(docQuery, {
            replacements: {
                ExpenseDocId: ExpenseDocId,
            },
            type: QueryTypes.SELECT,
        });

        // console.log(docData, "docDAta");
        const docData1 = docData[0];


        // if (!isApprove) {
        sentRejectExpenseMailByHr(docData1?.Email, docData1?.Amount, docData1?.FirstName + ' ' + docData1?.LastName, docData1.VisitFrom, docData1?.VisitTo, isHold, ExpenseReqId);
        // }

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    ExpenseReqId: ExpenseReqId,
                    message: `Expense ${isHold ? 'holded' : 'release'} successfully.`
                }
            });
        }
    } catch (error: any) {
        console.log(error, "Approve or Reject Error")
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const approveDisapproveClaimByFinance = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ExpenseReqId, isHold, holdReason, ExpenseDocId } = req.body;

        const selectQuery = 'UPDATE dbo.visitexpense SET ExpenseStatusChangeByFinance=:ExpenseStatusChangeByFinance where ExpenseReqId=:ExpenseReqId'
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                ExpenseStatusChangeByFinance: 1,
                ExpenseReqId: ExpenseReqId
            },
            type: QueryTypes.UPDATE,
        });

        const updateQuery = 'UPDATE dbo.expensedocs SET verificationStatusByFinance=:verificationStatusByFinance, ApprovedByFinanceId=:ApprovedByFinanceId, hold_reason_by_finance=:hold_reason_by_finance where ExpenseDocId=:ExpenseDocId'
        await sequelize.query(updateQuery, {
            replacements: {
                ApprovedByFinanceId: req?.payload?.appUserId,
                verificationStatusByFinance: isHold ? "Hold" : "Release",
                ExpenseDocId: ExpenseDocId,
                hold_reason_by_finance: holdReason
            },
            type: QueryTypes.UPDATE,
        });

        // const docQuery = 'SELECT ed.*, (select ve.* from dbo.visitexpense ve where ve.ExpenseReqId=ed.ExpenseReqId) FROM dbo.expensedocs ed INNER JOIN dbo.visitexpense ve on ve.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode where ed.ExpenseDocId = :ExpenseDocId';
        const docQuery = 'SELECT ed.*, emp.*, vs.* FROM dbo.visitexpense ve INNER JOIN dbo.expensedocs ed on ed.ExpenseReqId=ve.ExpenseReqId INNER JOIN dbo.employeedetails emp on emp.EMPCode=ve.EmpCode INNER JOIN dbo.visitsummary vs on vs.VisitSummaryId=ve.VisitSummaryId where ed.ExpenseDocId = :ExpenseDocId';
        const docData: any = await sequelize.query(docQuery, {
            replacements: {
                ExpenseDocId: ExpenseDocId,
            },
            type: QueryTypes.SELECT,
        });

        console.log(docData, "docDAta");
        const docData1 = docData[0];


        // if (!isApprove) {
        sentRejectExpenseMailByFinance(docData1?.Email, docData1?.Amount, docData1?.FirstName + ' ' + docData1?.LastName, docData1.VisitFrom, docData1?.VisitTo, isHold, ExpenseReqId);
        // }

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    ExpenseReqId: ExpenseReqId,
                    message: `Expense ${isHold ? 'holded' : 'release'} successfully.`
                }
            });
        }
    } catch (error: any) {
        console.log(error, "Approve or Reject Error")
        if (error?.isJoi === true) error.status = 422;
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
    getAllExpenseForHr,
    getExportExpense,
    getExportExpenseHr,
    getExpenseAmount,
    approveDisapproveClaim,
    getExpenseById,
    expMstMode,
    mstConMode,
    createExpense,
    uploadExpenseDoc,
    updateConvModeRate,
    approveDisapproveClaimByHr,
    approveDisapproveClaimByFinance,
    generateExpensePdfWithWatermark
};

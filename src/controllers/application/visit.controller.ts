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

const getVisitDetail = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;

        console.log(decoded)
        // Verify the access token
        const EMPCode = decoded.EMPCode;
        const selectQuery = `
    SELECT vs.VisitSummaryId, 
           CONCAT(vs.VisitFrom, ' -', vs.VisitTo) AS VisitLocation, 
           vs.VisitFrom, 
           vs.VisitTo, 
           vs.VisitDate, 
           vs.VisitPurpose, 
           vs.VisitRemarks, 
           vs.FillRemarks 
    FROM dbo.visitsummary vs 
    INNER JOIN dbo.visitdetails vd ON vd.VisitId = vs.VisitId 
    INNER JOIN dbo.employeedetails emp ON emp.EMPCode = vd.EmpCode 
    LEFT JOIN dbo.markattendance mka ON mka.VisitId = vs.VisitSummaryId 
    WHERE emp.EMPCode = :EMPCode 
          AND CAST(vs.VisitDate AS DATE) = CAST(GETDATE() AS DATE)`;

        let results: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": results?.length,
            "Data": {
                "VisitPlan": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        }

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error: error });
    }
};

const getNextVisitDetail = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;

        console.log(decoded)
        // Verify the access token
        const EMPCode = decoded.EMPCode;
        const selectQuery = `
    SELECT vs.VisitSummaryId, 
           CONCAT(vs.VisitFrom, ' -', vs.VisitTo) AS VisitLocation, 
           vs.VisitFrom, 
           vs.VisitTo, 
           vs.VisitDate,
           vs.VisitPurpose,
           vs.approvedStatus,
           (SELECT CONCAT(demp.FirstName, ' ', demp.LastName) FROM dbo.employeedetails demp WHERE demp.EMPCode = vs.approvedBy) AS ManagerFullName,
           emp.FirstName,
           emp.LastName
    FROM dbo.visitsummary vs 
    INNER JOIN dbo.visitdetails vd ON vd.VisitId = vs.VisitId 
    INNER JOIN dbo.employeedetails emp ON emp.EMPCode = vd.EmpCode
    WHERE emp.EMPCode = :EMPCode
    AND vs.VisitDate >= CAST(GETDATE() AS DATE)
    ORDER BY vs.VisitDate DESC`
    ;

    console.log("results in next visit detail 1")

        let results: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });
        console.log(results, "results in next visit detail 2")

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": results?.length,
            "Data": results,
            "ResponseCode": "OK",
            "confirmationbox": false
        }

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error, "error in next visit detail");
        res.status(500).json({ error: error });
    }
};

const updateVisitFeedback = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { id, visitRemarks } = req.query;
        // console.log(id, visitRemarks, "ldf;sfd")

        const updateQuery = 'UPDATE dbo.visitsummary SET VisitRemarks = :visitRemarks WHERE VisitSummaryId = :id';
        let result: any = await sequelize.query(updateQuery, {
            replacements: { visitRemarks: visitRemarks, id: id },
            type: QueryTypes.UPDATE,
        });

        // console.log(result, "result")
        // Check if the record was successfully updated
        if (result[1] === 0) {
            res.status(404).json({ message: 'Expense record not found' });
            return;
        }

        // Return success message
        res.status(200).json({ message: 'Visit remarks updated successfully' });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error: error });
    }
};

// Export Methods
export {
    getVisitDetail,
    updateVisitFeedback,
    getNextVisitDetail
};

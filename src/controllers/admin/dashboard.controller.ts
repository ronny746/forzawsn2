/* eslint-disable */
import { Response } from 'express';
import { RequestType } from '../../helpers/shared/shared.type';
// import database from '../../helpers/common/init_mysql';
import sequelize from '../../helpers/common/init_mysql';
// import storage from '../../helpers/common/init_firebase'
// const { ref, getDownloadURL } = require('firebase/storage');
const { QueryTypes } = require("sequelize");

// Controller Methods
const appUserDetail = async (req: RequestType, res: Response): Promise<void> => {
    try {

        const DesigId: any = req?.payload?.DesigId;
        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;

        if (!searchKey) searchKey = "";
        searchKey = '%' + searchKey + '%';
        // console.log(req?.payload?.appUserId, "req?.payload?.appUserId", typeof (DesigId));

        let result: any = { count: 0, rows: [] };

        let endQuery = ``;

        if (DesigId !== '5') {
            endQuery = `AND demp.MgrEmployeeID = :MgrEmployeeID`
        }

        let query = `
            SELECT 
                demp.EMPCode, 
                demp.FirstName, 
                demp.LastName, 
                demp.CL, 
                demp.SL, 
                demp.EL, 
                demp.CellEMIENo, 
                dmst.ServiceArea, 
                demp.Email, 
                demp.IsActive,
                ddest.Designatation, 
                (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails emp WHERE emp.EMPCode = demp.MgrEmployeeID) as ManagerName, 
                (SELECT emp.EmpCode FROM dbo.employeedetails emp WHERE emp.EMPCode = demp.MgrEmployeeID) as ManagerEmpCode 
            FROM 
                dbo.employeedetails AS demp 
            INNER JOIN 
                dbo.mstdesignatation ddest on ddest.DesigId = demp.DesigId 
            LEFT JOIN 
                dbo.mstservicearea dmst on dmst.SAId = demp.SAId 
            WHERE 
                (demp.FirstName LIKE :searchKey OR demp.LastName LIKE :searchKey)
                 ${endQuery}
                AND ddest.isActive = 1`;

        const rowsCount = await sequelize.query(query, {
            replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
            type: QueryTypes.SELECT
        });

        result.count = rowsCount.length;

        if (pageIndex !== undefined && pageSize) {
            const offset = pageSize * pageIndex;
            query += ` ORDER BY createdAt OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
        }

        const rows = await sequelize.query(query, {
            replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
            type: QueryTypes.SELECT
        });

        result.rows = rows;

        // console.log('Result:', result);
        res.status(200).send({ data: result });
    } catch (error: any) {
        console.log(error, "get user error")
        res.status(500).send({ message: error.message || "Internal server error" });
    }
};

const getDashboardDetail = async (req: RequestType, res: Response): Promise<void> => {
    try {

        console.log(req?.payload?.appUserId, "req?.payload?.appUserId");

        let query = `
            SELECT 
                COUNT(*) AS total_visits, -- Count all visits
                SUM(CASE WHEN isPlanned = 1 THEN 1 ELSE 0 END) AS planned_visits, -- Count visits where isPlanned = 1
                SUM(CASE WHEN isPlanned = 0 THEN 1 ELSE 0 END) AS unplanned_visits -- Count visits where isPlanned = 0
            FROM 
                dbo.visitsummary;
        `;

        const result: any = await sequelize.query(query, {
            replacements: {},
            type: QueryTypes.SELECT
        });

        const query1 = `
        SELECT
        MONTH([VisitDate]) AS MonthNumber,
        COUNT(*) AS VisitCount
    FROM
        visitsummary
    WHERE
        YEAR([VisitDate]) = YEAR(GETDATE()) -- Filters for the current year
    GROUP BY
        MONTH([VisitDate])
    ORDER BY
        MonthNumber;`
        const result1: any = await sequelize.query(query1, {
            type: QueryTypes.SELECT
        });

        let visitCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < result1.length; i++) {
            visitCounts[(result1[i]?.MonthNumber) - 1] = result1[i]?.VisitCount;
        }

        res.status(200).send({
            total_visits: result[0].total_visits,
            planned_visits: result[0].planned_visits,
            unplanned_visits: result[0].unplanned_visits,
            visitCounts: visitCounts
        });
    } catch (error: any) {
        console.log(error, "get user error")
        res.status(401).send({ message: "Internal server error" });
    }
};

// Export Methods
export {
    appUserDetail,
    getDashboardDetail
};

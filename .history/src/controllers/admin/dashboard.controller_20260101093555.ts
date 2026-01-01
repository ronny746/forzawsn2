/* eslint-disable */
import { Response } from 'express';
import { RequestType } from '../../helpers/shared/shared.type';
// import database from '../../helpers/common/init_mysql';
import sequelize from '../../helpers/common/init_mysql';
// import storage from '../../helpers/common/init_firebase'
// const { ref, getDownloadURL } = require('firebase/storage');
const { QueryTypes } = require('sequelize');

// Controller Methods
const appUserDetail = async (req: RequestType, res: Response): Promise<void> => {
  try {
    const DesigId: any = req?.payload?.DesigId;
    let searchKey = req.query.searchKey;
    const pageIndex: any = req.query.pageIndex || 0;
    const pageSize: any = req.query.pageSize || 10;

    if (!searchKey) searchKey = '';
    searchKey = '%' + searchKey + '%';
    // console.log(req?.payload?.appUserId, "req?.payload?.appUserId", typeof (DesigId));

    let result: any = { count: 0, rows: [] };

    let endQuery = ``;

    if (DesigId !== '5') {
      endQuery = `AND demp.MgrEmployeeID = :MgrEmployeeID`;
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
    console.log(error, 'get user error');
    res.status(500).send({ message: error.message || 'Internal server error' });
  }
};

const getDashboardDetail = async (req: RequestType, res: Response): Promise<void> => {
  try {
    const userId = req?.payload?.appUserId;

    // ========== DESIGNATION HANDLING SAFE ==========
    let designationData: any = req?.payload?.DesigId;

    if (!designationData) {
      designationData = [];
    } 
    else if (typeof designationData === "string") {
      try {
        designationData = JSON.parse(designationData);
      } catch {
        designationData = [];
      }
    } 
    else if (!Array.isArray(designationData)) {
      designationData = [designationData];
    }

    const restrictedRoles = [3, 4]; // Manager + Executive

    const isRestrictedUser = designationData.some(
      (d: any) => restrictedRoles.includes(Number(d?.DesigId))
    );

    // Dynamic WHERE
    const empFilter = isRestrictedUser ? "WHERE ve.EmpCode = :userId" : "";

    // ========= Overall Counts =========
    const query = `
      SELECT 
          COUNT(*) AS total_visits,
          SUM(CASE WHEN vs.isPlanned = 1 THEN 1 ELSE 0 END) AS planned_visits,
          SUM(CASE WHEN vs.isPlanned = 0 THEN 1 ELSE 0 END) AS unplanned_visits
      FROM visitsummary vs
      INNER JOIN visitdetails ve ON vs.VisitId = ve.VisitId
      ${empFilter}
    `;

    const result: any = await sequelize.query(query, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });

    // ========= Month Wise Count =========
    const query1 = `
      SELECT
          MONTH(vs.VisitDate) AS MonthNumber,
          COUNT(*) AS VisitCount
      FROM visitsummary vs
      INNER JOIN visitdetails ve ON vs.VisitId = ve.VisitId
      ${
        isRestrictedUser
          ? `WHERE ve.EmpCode = :userId AND YEAR(vs.VisitDate) = YEAR(GETDATE())`
          : `WHERE YEAR(vs.VisitDate) = YEAR(GETDATE())`
      }
      GROUP BY MONTH(vs.VisitDate)
      ORDER BY MonthNumber
    `;

    const result1: any = await sequelize.query(query1, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });

    let visitCounts = Array(12).fill(0);
    result1.forEach((row: any) => {
      visitCounts[row.MonthNumber - 1] = row.VisitCount;
    });

    res.status(200).send({
      total_visits: result[0]?.total_visits || 0,
      planned_visits: result[0]?.planned_visits || 0,
      unplanned_visits: result[0]?.unplanned_visits || 0,
      visitCounts
    });

  } catch (error) {
    console.log(error, 'getDashboardDetail error');
    res.status(500).send({ message: 'Internal server error' });
  }
};


const getExpenseAnalyticData = async (req: RequestType, res: Response): Promise<void> => {
  try {
    console.log(req?.payload?.appUserId, 'req?.payload?.appUserId');

    let queryTotal = `
      SELECT SUM(ISNULL(TRY_CAST(ed.Amount AS DECIMAL(18,2)), 0)) AS TotalAmount
      FROM dbo.expensedocs ed
    `;

    let queryApprove = `
      SELECT SUM(ISNULL(TRY_CAST(ed.Amount AS DECIMAL(18,2)), 0)) AS TotalApproveAmount
      FROM dbo.expensedocs ed
      WHERE ed.isVerified = :verifyType
      AND verificationStatusByHr = :verificationStatusByHr
      AND verificationStatusByFinance = :verificationStatusByFinance
    `;

    let queryReject = `
      SELECT SUM(ISNULL(TRY_CAST(ed.Amount AS DECIMAL(18,2)), 0)) AS TotalRejectAmount
      FROM dbo.expensedocs ed
      WHERE ed.isVerified = :verifyType1
      AND verificationStatusByHr = :verificationStatusByHr1
      AND verificationStatusByFinance = :verificationStatusByFinance1
    `;

    let queryProgress = `
      SELECT SUM(ISNULL(TRY_CAST(ed.Amount AS DECIMAL(18,2)), 0)) AS TotalPendingAmount
      FROM dbo.expensedocs ed
      WHERE ed.isVerified = :verifyType2
      AND verificationStatusByHr = :verificationStatusByHr2
      AND verificationStatusByFinance = :verificationStatusByFinance2
    `;

    const resultTotal: any = await sequelize.query(queryTotal, {
      type: QueryTypes.SELECT
    });

    const resultProgress: any = await sequelize.query(queryProgress, {
      replacements: {
        verifyType2: 'InProgress',
        verificationStatusByHr2: 'InProgress',
        verificationStatusByFinance2: 'InProgress'
      },
      type: QueryTypes.SELECT
    });

    const resultApprove: any = await sequelize.query(queryApprove, {
      replacements: {
        verifyType: 'Approved',
        verificationStatusByHr: 'Approved',
        verificationStatusByFinance: 'Approved'
      },
      type: QueryTypes.SELECT
    });

    const resultReject: any = await sequelize.query(queryReject, {
      replacements: {
        verifyType1: 'Rejected',
        verificationStatusByHr1: 'Rejected',
        verificationStatusByFinance1: 'Rejected'
      },
      type: QueryTypes.SELECT
    });

    res.status(200).send({
      success: true,
      message: 'Expense analytic data fetched successfully',
      totalData: resultTotal[0]?.TotalAmount || 0,
      progressData: resultProgress[0]?.TotalPendingAmount || 0,
      approveData: resultApprove[0]?.TotalApproveAmount || 0,
      rejectData: resultReject[0]?.TotalRejectAmount || 0
    });
  } catch (error: any) {
    console.log(error, 'get user error');
    res.status(500).send({ message: 'Internal server error' });
  }
};

const getTodayLogData = async (req: RequestType, res: Response): Promise<void> => {
  try {
    console.log(req?.payload?.appUserId, 'req?.payload?.appUserId');

    let queryVisit = `
       SELECT COUNT(VisitSummaryId) AS TotalVisits
       FROM dbo.visitsummary
       WHERE CAST(VisitDate AS DATE) = CAST(GETDATE() AS DATE)
    `;

    let queryExpense = `
      SELECT COUNT(ve.ExpenseReqId) AS TotalExpenses
      FROM dbo.visitexpense ve
      WHERE CAST(ve.createdAt AS DATE) = CAST(GETDATE() AS DATE)
    `;

    let queryAttendence = `
      SELECT COUNT(atd.id) AS TotalAttendenceLogs
        FROM dbo.markattendance atd
        WHERE CAST(atd.createdAt AS DATE) = CAST(GETDATE() AS DATE) AND atd.CheckIn = 1
    `;

    const resultVisit: any = await sequelize.query(queryVisit, {
      replacements: {},
      type: QueryTypes.SELECT
    });

    const resultExpense: any = await sequelize.query(queryExpense, {
      replacements: {},
      type: QueryTypes.SELECT
    });

    const resultAttendence: any = await sequelize.query(queryAttendence, {
      replacements: {},
      type: QueryTypes.SELECT
    });

    res.status(200).send({
      success: true,
      message: 'Today log data fetched successfully',
      totalVisits: resultVisit[0]?.TotalVisits || 0,
      totalExpenses: resultExpense[0]?.TotalExpenses || 0,
      totalAttendenceLogs: resultAttendence[0]?.TotalAttendenceLogs || 0
    });
  } catch (error: any) {
    console.log(error, 'get user error');
    res.status(500).send({ message: 'Internal server error' });
  }
};

// Export Methods
export { appUserDetail, getDashboardDetail, getExpenseAnalyticData, getTodayLogData };

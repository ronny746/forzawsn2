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
const {
    v4: uuidv4,
} = require('uuid');
const { QueryTypes } = require("sequelize");
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBDi8Cd6_vM5XYUwY-BRVslpyXDMrfLrkg",
    authDomain: "wsn-project-5384e.firebaseapp.com",
    projectId: "wsn-project-5384e",
    storageBucket: "wsn-project-5384e.appspot.com",
    messagingSenderId: "442572026644",
    appId: "1:442572026644:web:7a35bac92602af7d8dc801",
    measurementId: "G-0PT1JGDDCW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the storage service, which is used to create references in your storage bucket
const storage = getStorage(app);

// Controller Methods

const getVisitForAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const selectQuery = `
        SELECT 
            vs.VisitSummaryId, 
            mka.AttendanceType, 
            vd.VisitId, 
            vs.VisitDate, 
            vs.VisitPurpose, 
            vd.EmpCode, 
            vs.VisitFrom, 
            vs.VisitTo 
        FROM 
            dbo.visitsummary vs 
            LEFT JOIN dbo.visitdetails vd ON vd.VisitId = vs.VisitId 
            INNER JOIN dbo.employeedetails emp ON emp.EMPCode = vd.EmpCode 
            LEFT JOIN dbo.markattendance mka ON mka.VisitId = vs.VisitSummaryId 
        WHERE 
            emp.EMPCode = :EMPCode
            AND vs.approvedStatus =  :approvedStatus
            AND CONVERT(DATE, vs.VisitDate) = CONVERT(DATE, GETDATE())
            ORDER BY
            mka.PresentTimeIn DESC
        `;

        const replacements = {
            EMPCode: req?.payload?.appUserId,
            approvedStatus: "Approved",
        };

        const results: any = await sequelize.query(selectQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
        });
        console.log(results, "results");
        res.status(200).json({ data: results });
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error });
    }
};

const getAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const DesigId = req?.payload?.DesigId;
        let searchKey = req.query.searchKey;
        const pageIndex: any = req.query.pageIndex || 0;
        const pageSize: any = req.query.pageSize || 10;

        console.log(pageIndex, typeof (pageIndex), "pageIndex");

        if (!searchKey) searchKey = "";
        searchKey = "%" + searchKey + "%";

        let result: any = { count: 0, rows: [] }
        if (DesigId === '4') {
            let query = `
            SELECT 
                   ma.Id,
                   emp.EMPCode, 
                   ma.PresentTimeIn, 
                   vs.VisitFrom, 
                   vs.VisitTo, 
                   vs.isPlanned,
                   ma.PresentTimeOut, 
                   emp.Email, 
                   ma.CheckInAddressImage,
                   ma.CheckOutAddressImage,
                   ddest.Designatation, 
                   CONCAT(emp.FirstName, ' ', emp.LastName) AS EmployeeName 
            FROM dbo.markattendance AS ma 
            INNER JOIN dbo.visitsummary AS vs ON vs.VisitSummaryId = ma.VisitId 
            INNER JOIN dbo.employeedetails AS emp ON emp.EMPCode = ma.EMPCode 
            INNER JOIN dbo.mstdesignatation AS ddest ON ddest.DesigId = emp.DesigId 
            WHERE (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey) 
                  AND CAST(ma.AttendanceDate AS DATE) = CAST(GETDATE() AS DATE) 
                  AND emp.EMPCode = :MgrEmployeeID 
            ORDER BY ma.createdAt DESC`;

            if (pageIndex !== undefined && pageSize) {
                if (pageIndex == 0) {
                    const rowsCount: any = await sequelize.query(query, {
                        replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
                        type: QueryTypes.SELECT,
                    });
                    result.count = rowsCount.length;
                }
                const offset = pageSize * pageIndex;
                const mssqlQuery = `${query}\n OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
                result.rows = await sequelize.query(mssqlQuery, {
                    replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
                    type: QueryTypes.SELECT,
                });
            }
        }
        else {
            let query = `
            SELECT 
                   ma.Id,
                   emp.EMPCode, 
                   ma.PresentTimeIn, 
                   vs.VisitFrom, 
                   vs.VisitTo, 
                   ma.PresentTimeOut, 
                   emp.Email,
                   ma.CheckInAddressImage,
                   ma.CheckOutAddressImage, 
                   ddest.Designatation, 
                   CONCAT(emp.FirstName, ' ', emp.LastName) AS EmployeeName 
            FROM dbo.markattendance AS ma 
            INNER JOIN dbo.visitsummary AS vs ON vs.VisitSummaryId = ma.VisitId 
            INNER JOIN dbo.employeedetails AS emp ON emp.EMPCode = ma.EMPCode 
            INNER JOIN dbo.mstdesignatation AS ddest ON ddest.DesigId = emp.DesigId 
            WHERE (emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey) 
                  AND CAST(ma.AttendanceDate AS DATE) = CAST(GETDATE() AS DATE) 
                  AND (emp.EMPCode = :MgrEmployeeID OR emp.MgrEmployeeID = :MgrEmployeeID) 
            ORDER BY ma.createdAt DESC`;

            if (pageIndex !== undefined && pageSize) {
                if (pageIndex == 0) {
                    // const rowsCount: any = await sequelize.query(`SELECT COUNT(*) AS count FROM (${query}) AS RowCountQuery`, {
                    const rowsCount: any = await sequelize.query(query, {
                        replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
                        type: QueryTypes.SELECT,
                    });
                    result.count = rowsCount.length;
                }
                const offset = pageSize * pageIndex;
                const mssqlQuery = `${query}\n OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
                result.rows = await sequelize.query(mssqlQuery, {
                    replacements: { searchKey: searchKey, MgrEmployeeID: req?.payload?.appUserId },
                    type: QueryTypes.SELECT,
                });
            }
        }

        res.status(200).send({ data: result });
    } catch (error: any) {
        console.log(error, "error")
        res.status(500).json({ error: error });
    }
};

const getAttendenceStatus = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const VisitId = req.query.VisitId;
        const selectQuery = 'SELECT * FROM dbo.markattendance where VisitId=:VisitId'
        const results: any = await sequelize.query(selectQuery, {
            replacements: { VisitId: VisitId },
            type: QueryTypes.SELECT,
        });
        res.status(200).json({ data: results });
    } catch (error: any) {
        res.status(500).json({ error: error });
    }
};

const createVisit = async (EMPCode: string, VisitFrom: string, VisitTo: string, visit_purpose: string, callback: Function) => {
    try {
        const uuid = uuidv4();
        // const today_date = (new Date()).toISOString().slice(0, 19).replace('T', ' ');
        const today_date = new Date();

        const firstQuery = 'INSERT INTO dbo.visitdetails ';
        const insertQuery = `${firstQuery} (
            VisitId,
            EmpCode,
            FromDate,
            ToDate,
            isPlanned
        ) VALUES (
            :uuid,
            :EMPCode,
            :today_date,
            :today_date,
            :isPlanned
        );`;

        const visitData: any = await sequelize.query(insertQuery, {
            replacements: {
                uuid: uuid,
                EMPCode: EMPCode,
                today_date: today_date,
                isPlanned: 0
            },
            type: QueryTypes.INSERT,
        });
        console.log(visitData, "visitData");

        const uuid1 = uuidv4();
        const visitsummaryQuery = 'INSERT INTO dbo.visitsummary ';
        const insertvisitsummaryQuery = `${visitsummaryQuery} (
        VisitSummaryId,
        VisitId,
        VisitDate,
        FromDate,
        ToDate,
        VisitFrom,
        VisitTo,
        isPlanned,
        VisitPurpose,
        approvedStatus
    ) VALUES (
        :uuid1,
        :uuid,
        :today_date,
        :today_date,
        :today_date,
        :VisitFrom,
        :VisitTo,
        :isPlanned,
        :visit_purpose,
        :approvedStatus
    );`;

        const visitSummaryData: any = await sequelize.query(insertvisitsummaryQuery, {
            replacements: {
                uuid1: uuid1,
                uuid: uuid,
                today_date: today_date,
                VisitFrom: VisitFrom,
                VisitTo: VisitTo,
                isPlanned: 0,
                visit_purpose: visit_purpose,
                approvedStatus: "Approved"
            },
            type: QueryTypes.INSERT,
        });

        console.log(visitSummaryData, "visitSummaryData");
        callback(uuid1);
    } catch (error: any) {
        console.log(error)
        callback(null, error);
    }
}

const haversineDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {

    if (!lat1 || !lon1 || !lat2 || !lon2) {
        return 0;
    }

    const R = 6371; // Radius of Earth in kilometers
    const toRadians = (degree: any) => (degree * Math.PI) / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const markAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        // console.log(req.body, "req.body1")
        const {
            Latitude,
            Longitude,
            visit_address,
            // place_image,
            isPlanned,
            VisitFrom,
            VisitTo,
            visit_purpose
        } = req.body;
        const place_image = "temp.jpg"

        // if (place_image === "" && visit_address === "") {
        // if (visit_address === "") {
        //     res.status(500).send({
        //         error: true,
        //         data: {
        //             message: 'Please enter visit place for check in or checkout.'
        //         }
        //     });
        //     return;
        // }

        const date = new Date();
        date.setUTCHours(date.getUTCHours() + 5); // Adjust for India timezone (UTC +5)
        date.setUTCMinutes(date.getUTCMinutes() + 30); // Adjust for India timezone (UTC +5:30)

        // console.log(req.body, place_image, isPlanned, "req.body")

        var { VisitSummaryId } = req.body;

        const checkAttendeceQuery = 'SELECT * From dbo.markattendance where VisitId=:VisitId';
        const checkAttendeceExist: any = await sequelize.query(checkAttendeceQuery, {
            replacements: { VisitId: VisitSummaryId },
            type: QueryTypes.SELECT,
        });
        // console.log(checkAttendeceExist, "checkAttendeceExist")
        if (checkAttendeceExist.length === 0) {
            const findQuery = 'Select EMPCode, EmployeeID from dbo.employeedetails where EMPCode=:EMPCode';
            const EmpCodeData: any = await sequelize.query(findQuery, {
                replacements: { EMPCode: req?.payload?.appUserId },
                type: QueryTypes.SELECT,
            });

            const checkInExistQuery = 'SELECT * FROM dbo.markattendance WHERE EMPCode = :EMPCode AND CheckIn = 1 AND CheckOut = 0 AND CAST(PresentTimeIn AS DATE) = CAST(GETDATE() AS DATE);';
            const checkInExistData: any = await sequelize.query(checkInExistQuery, {
                replacements: { EMPCode: req?.payload?.appUserId },
                type: QueryTypes.SELECT,
            });
            if(checkInExistData.length !== 0) {
                res.status(500).send({
                    error: true,
                    data: {
                        message: 'Already check in visit exist! please checkout to check in next visit'
                    }
                });
                return;
            }
            // console.log(EmpCodeData, "EmpCodeData")
            if (!isPlanned) {
                if (VisitFrom === "" || VisitTo === "" || visit_purpose === "") {
                    res.status(500).send({
                        error: true,
                        data: {
                            message: 'Please input From Visit and To Visit and Purpose'
                        }
                    });
                    return;
                }
                createVisit(EmpCodeData[0].EMPCode, VisitFrom, VisitTo, visit_purpose, async (result: any, error: any) => {
                    if (error) {
                        console.error('Error occurred:', error);
                        res.status(500).send({
                            error: true,
                            data: {
                                message: 'Attendence creation falid.'
                            }
                        });
                    }
                    // console.log('Visit created successfully. VisitSummaryId:', result);
                    VisitSummaryId = result;
                    const attendence_id = uuidv4();
                    const firstQuery = 'INSERT INTO dbo.markattendance ';
                    const insertQuery = firstQuery + `(
                                        Id,
                                        EmployeeID,
                                        EMPCode,
                                        Lat,
                                        [Long],
                                        CheckInAddress,
                                        AttendanceType,
                                        PresentTimeIn,
                                        AttendanceDate,
                                        CheckInAddressImage,
                                        CheckIn,
                                        VisitId
                                    ) VALUES (
                                        :attendence_id,
                                        :EmployeeID,
                                        :appUserId,
                                        :Latitude,
                                        :Longitude,
                                        :visit_address,
                                        'IN',
                                        :attendanceTime,
                                        :attendanceDate,
                                        :place_image,
                                        1,
                                        :VisitSummaryId
                                    );`;

                    const results: any = await sequelize.query(insertQuery, {
                        replacements: {
                            attendence_id: attendence_id,
                            EmployeeID: EmpCodeData[0].EmployeeID,
                            appUserId: req?.payload?.appUserId,
                            Latitude: Latitude,
                            Longitude: Longitude,
                            visit_address: visit_address,
                            attendanceTime: date.toISOString().slice(0, 19).replace('T', ' '),
                            attendanceDate: date.toISOString().slice(0, 19).replace('T', ' '),
                            place_image: place_image,
                            VisitSummaryId: VisitSummaryId
                        },
                        type: QueryTypes.INSERT,
                    });

                    if (!res.headersSent) {
                        res.status(200).send({
                            error: false,
                            data: {
                                data: results,
                                VisitSummaryId: VisitSummaryId,
                                message: 'Visit created and checked in successfully.'
                            }
                        });
                    }
                })
                // VisitSummaryId = createVisit(EmpCodeData[0].EMPCode, VisitFrom, VisitTo);
            }
            else {
                const attendanceId = uuidv4();
                const firstQuery = 'INSERT INTO dbo.markattendance ';
                const insertQuery = `${firstQuery} (
                Id,
                EmployeeID,
                EMPCode,
                Lat,
                [Long],
                CheckInAddress,
                AttendanceType,
                PresentTimeIn,
                AttendanceDate,
                CheckInAddressImage,
                CheckIn,
                VisitId
            ) VALUES (
                '${attendanceId}',
                '${EmpCodeData[0].EmployeeID}',
                '${req?.payload?.appUserId}',
                '${Latitude}',
                '${Longitude}',
                '${visit_address}',
                'IN',
                '${date.toISOString().slice(0, 19).replace('T', ' ')}',
                '${date.toISOString().slice(0, 19).replace('T', ' ')}',
                '${place_image}',
                1,
                '${VisitSummaryId}'
            )`;

                const results: any = await sequelize.query(insertQuery, {
                    replacements: {},
                    type: QueryTypes.INSERT,
                });
                if (res.headersSent === false) {
                    res.status(200).send({
                        error: false,
                        data: {
                            data: results,
                            message: 'Check in successfully.'
                        }
                    });
                }
            }

        }
        else {

            const distance = haversineDistance(checkAttendeceExist[0].Lat, checkAttendeceExist[0].Long, Latitude, Longitude) || 0;
            // console.log(distance, "distance");
            
            const updateQuery = 'UPDATE dbo.markattendance SET AttendanceType = :AttendanceType, PresentTimeOut=:PresentTimeOut, CheckOut=:CheckOut, CheckOutAddress=:CheckOutAddress, CheckOutAddressImage=:CheckOutAddressImage, CheckOutLat=:CheckOutLat, CheckOutLong=:CheckOutLong, Distance=:distance WHERE VisitId = :VisitSummaryId';
            const results: any = await sequelize.query(updateQuery, {
                replacements: { 
                    VisitSummaryId: VisitSummaryId, 
                    PresentTimeOut: date.toISOString().slice(0, 19).replace('T', ' '), 
                    CheckOut: 1, AttendanceType: "Out", 
                    CheckOutAddress: visit_address, 
                    CheckOutAddressImage: place_image,
                    CheckOutLat: Latitude,
                    CheckOutLong: Longitude,
                    distance: distance
                },
                type: QueryTypes.UPDATE,
            });
            if (res.headersSent === false) {
                res.status(200).send({
                    error: false,
                    data: {
                        data: results,
                        attendenceData: checkAttendeceExist,
                        message: 'Check out successfully.'
                    }
                });
            }
        }
    } catch (error: any) {
        console.log(error)
        res.status(500).send({
            error: true,
            data: {
                message: 'Internal Server Error'
            }
        });
    }
};

const getReport = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, pageIndex = 0, pageSize = 5, searchKey = '' } = req.query;
        let searchEMPCode = req.query.searchEMPCode || req?.payload?.appUserId;
        if(req.query.searchEMPCode === "all") {
            searchEMPCode = '';
        }

        const EMPCode = req?.payload?.appUserId;

        // Base select query
        let selectQuery = `
        SELECT ma.EMPCode, 
            ma.VisitId as VisitSummaryId, 
            ma.AttendanceDate, 
            ma.CheckIn, 
            ma.CheckOut, 
            ma.PresentTimeIn, 
            ma.PresentTimeOut, 
            ma.CheckInAddress, 
            ma.CheckInAddressImage, 
            ma.CheckOutAddress, 
            ma.CheckOutAddressImage,
            ma.createdAt,
            emp.FirstName,
            emp.LastName,
            vs.VisitFrom,
            vs.VisitTo,
            vs.VisitPurpose,
            (SELECT CONCAT(emp.FirstName, ' ', emp.LastName) FROM dbo.employeedetails demp WHERE demp.EMPCode = emp.MgrEmployeeID) as ManagerName
        FROM dbo.markattendance ma
        INNER JOIN visitsummary vs on vs.VisitSummaryId = ma.VisitId
        INNER JOIN employeedetails emp on emp.EMPCode = ma.EMPCode
        WHERE 
        (vs.VisitFrom LIKE :searchKey OR vs.VisitTo LIKE :searchKey OR emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey)
        AND (ma.EMPCode = :EMPCode OR emp.MgrEmployeeID = :EMPCode)`;
        // AND ma.EMPCode = :EMPCode`;

        // Add date filtering if provided
        if (startDate && endDate) {
            selectQuery += ` AND CAST(ma.PresentTimeIn AS DATE) BETWEEN :startDate AND :endDate`;
        }
        if (searchEMPCode) {
            selectQuery += ` AND emp.EMPCode=:searchEMPCode`;
        }

        // Apply pagination: OFFSET and FETCH NEXT
        selectQuery += ` ORDER BY ma.PresentTimeIn DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;

        // Count total records only if pageIndex is 0
        let totalRecords = 0;
        if (Number(pageIndex) === 0) {
            let countQuery = `
            SELECT COUNT(*) as totalCount
            FROM dbo.markattendance ma
            INNER JOIN visitsummary vs on vs.VisitSummaryId = ma.VisitId
            INNER JOIN employeedetails emp on emp.EMPCode = ma.EMPCode
            WHERE 
            (vs.VisitFrom LIKE :searchKey OR vs.VisitTo LIKE :searchKey OR emp.FirstName LIKE :searchKey OR emp.LastName LIKE :searchKey)
            AND (ma.EMPCode = :EMPCode OR emp.MgrEmployeeID = :EMPCode)`;

            // Add date filtering if provided for the count query as well
            if (startDate && endDate) {
                countQuery += ` AND CAST(ma.PresentTimeIn AS DATE) BETWEEN :startDate AND :endDate`;
            }

            if (searchEMPCode) {
                countQuery += ` AND emp.EMPCode=:searchEMPCode`;
            }

            // Get total count of records
            const countResults: any = await sequelize.query(countQuery, {
                replacements: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                    EMPCode: EMPCode,
                    searchEMPCode: searchEMPCode,
                    searchKey: `%${searchKey}%`
                },
                type: QueryTypes.SELECT,
            });
            totalRecords = countResults[0]?.totalCount || 0;
        }

        // Calculate offset and limit
        const limit: any = Number(pageSize);
        const offset: any = Number(pageIndex) * Number(pageSize);

        // Execute the main query
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                startDate: startDate || null,
                endDate: endDate || null,
                EMPCode: EMPCode,
                searchEMPCode: searchEMPCode,
                searchKey: `%${searchKey}%`,
                limit,
                offset
            },
            type: QueryTypes.SELECT,
        });

        // console.log(pageIndex, totalRecords, "totalRecords")

        const responseData = {
            "message": "Success",
            "Status": true,
            "DataCount": Number(pageIndex) === 0 ? totalRecords : undefined, // Only include DataCount if pageIndex is 0
            "data": {
                "reportData": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

const getExpenseReport = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const EMPCode = req?.payload?.appUserId;

        // Base select query
        let selectQuery = `
        SELECT ma.EMPCode, 
            ma.VisitId as VisitSummaryId, 
            ma.AttendanceDate, 
            ma.CheckIn, 
            ma.CheckOut, 
            ma.PresentTimeIn, 
            ma.PresentTimeOut,
            vs.VisitFrom,
            vs.VisitTo,
            vs.VisitPurpose,
            ma.createdAt
        FROM dbo.markattendance ma
        INNER JOIN visitsummary vs on vs.VisitSummaryId = ma.VisitId
        INNER JOIN employeedetails emp on emp.EMPCode = ma.EMPCode
        WHERE
        (ma.EMPCode = :EMPCode)
        AND ma.CheckIn=1 AND ma.CheckOut=1`;

        // Execute the main query
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                EMPCode: EMPCode,
            },
            type: QueryTypes.SELECT,
        });

        console.log(results, "results")

        const responseData = {
            "message": "Success",
            "Status": true,
            "data": {
                "reportData": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

const getExportReport = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, searchKey = '' } = req.query;
        // console.log(startDate, endDate, "date");

        const EMPCode = req?.payload?.appUserId;
        // console.log(EMPCode, "EMPCode");

        // Base select query
        let selectQuery = `
        SELECT ma.EMPCode, 
            ma.VisitId as VisitSummaryId, 
            ma.AttendanceDate, 
            ma.CheckIn, 
            ma.CheckOut, 
            ma.PresentTimeIn, 
            ma.PresentTimeOut, 
            ma.CheckInAddress, 
            ma.CheckInAddressImage, 
            ma.CheckOutAddress, 
            ma.CheckOutAddressImage,
            ma.Lat as CheckInLatitude,
            ma.Long as CheckInLongitude,
            ma.CheckOutLat as CheckOutLatitude,
            ma.CheckOutLong as CheckOutLongitude,
            ma.Distance as Distance,
            ma.createdAt,
            emp.FirstName,
            emp.LastName,
            vs.VisitFrom,
            vs.VisitTo,
            vs.isPlanned,
            vs.VisitPurpose,
            (SELECT CONCAT(demp.FirstName, ' ', demp.LastName) FROM dbo.employeedetails demp WHERE demp.EMPCode = emp.MgrEmployeeID) as ManagerName
        FROM dbo.markattendance ma
        INNER JOIN visitsummary vs on vs.VisitSummaryId = ma.VisitId
        INNER JOIN employeedetails emp on emp.EMPCode = ma.EMPCode
        WHERE 
        (emp.EMPCode LIKE :searchKey)
        AND (ma.EMPCode = :EMPCode OR emp.MgrEmployeeID = :EMPCode)`;
        // AND ma.EMPCode = :EMPCode`;

        // Add date filtering if provided
        if (startDate && endDate) {
            selectQuery += ` AND CAST(ma.PresentTimeIn AS DATE) BETWEEN :startDate AND :endDate`;
        }

        // Apply pagination: OFFSET and FETCH NEXT
        selectQuery += ` ORDER BY ma.PresentTimeIn DESC`;

        // Execute the main query
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                startDate: startDate || null,
                endDate: endDate || null,
                EMPCode: EMPCode,
                searchKey: `%${searchKey}%`
            },
            type: QueryTypes.SELECT,
        });

        const responseData = {
            "message": results.length !== 0 ? "Date exported successfully" : "No data found for export",
            "Status": true,
            "DataCount": results.length, // Only include DataCount if pageIndex is 0
            "reportData": results,
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};



const uploadAttendenceImage = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const file: any = req.file;
        if (!file) {
            res.status(500).send({
                error: true,
                data: {
                    message: 'Please choose file'
                }
            });
            return;
        }
        console.log(file, "df");
        const file_name = Date.now() + '_' + file.originalname;
        // File uploaded successfully
        const storageRef = ref(storage, 'claim_docs/' + file_name);

        // Upload file to Firebase Storage
        await uploadBytes(storageRef, file);
        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    file_name: file_name,
                    message: 'File uploaded successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        res.status(422).send({
            error: true,
            data: {
                message: 'Internal Server Error'
            }
        });
    }
};

// Function to fetch data from MySQL database
const fetchData = async (EMPCode: any) => {

    console.log(EMPCode, "EMPCode")
    // Execute your SQL query to fetch data
    const selectQuery = `
    SELECT
    emp.EMPCode,
    (emp.FirstName + ' ' + emp.LastName) AS EmployeeName,
    ddest.Designatation,
    dpart.Department,
    (
        SELECT
            (demp.FirstName + ' ' + demp.LastName)
        FROM
            dbo.employeedetails demp
        WHERE
            demp.EMPCode = emp.MgrEmployeeID
    ) AS ReportingManager,
    MIN(CASE WHEN ma.PresentTimeIn IS NOT NULL THEN ma.PresentTimeIn ELSE 'N/A' END) AS FirstCheckInTime,
    MAX(CASE WHEN ma.PresentTimeOut IS NOT NULL THEN ma.PresentTimeOut ELSE 'N/A' END) AS LastCheckOutTime
FROM
    dbo.employeedetails emp
LEFT JOIN dbo.markattendance ma ON emp.EMPCode = ma.EMPCode AND CAST(ma.AttendanceDate AS DATE) = CAST(GETDATE() AS DATE)
LEFT JOIN dbo.mstdesignatation ddest ON ddest.DesigId = emp.DesigId
LEFT JOIN dbo.mstdepartment dpart ON dpart.DeptId = emp.DeptId
WHERE 
emp.CL <> 20
AND emp.isActive = 1
GROUP BY
    emp.EMPCode,
    emp.FirstName,
    emp.LastName,
    emp.Email,
    ddest.Designatation,
    dpart.Department,
    emp.MgrEmployeeID
ORDER BY
    FirstCheckInTime ASC;
            `;
    const results: any = await sequelize.query(selectQuery, {
        replacements: {},
        type: QueryTypes.SELECT,
    });
    console.log(results, "cron job result")
    // const selectQuery = 'SELECT emp.EMPCode, CONCAT(emp.FirstName, \' \', emp.LastName) as EmployeeName, emp.Email, vts.FromDate, vts.ToDate, ddest.Designatation, dpart.Department, (select CONCAT(demp.FirstName, \' \', demp.LastName) from dbo.employeedetails demp where demp.EMPCode=emp.MgrEmployeeID) as ReportingManager, ma.PresentTimeIn as CheckInTime, ma.PresentTimeOut as CheckOutTime FROM dbo.markattendance ma INNER JOIN dbo.employeedetails emp on emp.EMPCode=ma.EMPCode INNER JOIN dbo.visitsummary vts on vts.VisitSummaryId=ma.VisitId INNER JOIN dbo.mstdesignatation ddest on ddest.DesigId=emp.DesigId INNER JOIN dbo.mstdepartment dpart on dpart.DeptId=emp.DeptId where ma.EMPCode=:EMPCode AND DATE(ma.AttendanceDate) = CURDATE() order by ma.createdAt desc';
    // const results: any = await sequelize.query(selectQuery, {
    //     replacements: { EMPCode: EMPCode },
    //     type: QueryTypes.SELECT,
    // });
    // console.log(results, "cron job result")

    return results;
}
// const fetchData = async (EMPCode: any) => {

//     console.log(EMPCode, "EMPCode")
//     // Execute your SQL query to fetch data
//     const selectQuery = `
//             SELECT
//                 emp.EMPCode,
//                 (emp.FirstName + ' ' + emp.LastName) as EmployeeName,
//                 emp.Email,
//                 vts.FromDate,
//                 vts.ToDate,
//                 ddest.Designatation,
//                 dpart.Department,
//                 (
//                     SELECT
//                         (demp.FirstName + ' ' + demp.LastName)
//                     FROM
//                         dbo.employeedetails demp
//                     WHERE
//                         demp.EMPCode = emp.MgrEmployeeID
//                 ) as ReportingManager,
//                 ma.PresentTimeIn as CheckInTime,
//                 ma.PresentTimeOut as CheckOutTime
//             FROM
//                 dbo.markattendance ma
//             INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ma.EMPCode
//             INNER JOIN dbo.visitsummary vts ON vts.VisitSummaryId = ma.VisitId
//             LEFT JOIN dbo.mstdesignatation ddest ON ddest.DesigId = emp.DesigId
//             LEFT JOIN dbo.mstdepartment dpart ON dpart.DeptId = emp.DeptId
//             WHERE
//                 CAST(ma.AttendanceDate AS DATE) = CAST(GETDATE() AS DATE)
//             ORDER BY
//                 ma.createdAt DESC;
//             `;
//     const results: any = await sequelize.query(selectQuery, {
//         replacements: {  },
//         type: QueryTypes.SELECT,
//     });
//     console.log(results, "cron job result")
//     // const selectQuery = 'SELECT emp.EMPCode, CONCAT(emp.FirstName, \' \', emp.LastName) as EmployeeName, emp.Email, vts.FromDate, vts.ToDate, ddest.Designatation, dpart.Department, (select CONCAT(demp.FirstName, \' \', demp.LastName) from dbo.employeedetails demp where demp.EMPCode=emp.MgrEmployeeID) as ReportingManager, ma.PresentTimeIn as CheckInTime, ma.PresentTimeOut as CheckOutTime FROM dbo.markattendance ma INNER JOIN dbo.employeedetails emp on emp.EMPCode=ma.EMPCode INNER JOIN dbo.visitsummary vts on vts.VisitSummaryId=ma.VisitId INNER JOIN dbo.mstdesignatation ddest on ddest.DesigId=emp.DesigId INNER JOIN dbo.mstdepartment dpart on dpart.DeptId=emp.DeptId where ma.EMPCode=:EMPCode AND DATE(ma.AttendanceDate) = CURDATE() order by ma.createdAt desc';
//     // const results: any = await sequelize.query(selectQuery, {
//     //     replacements: { EMPCode: EMPCode },
//     //     type: QueryTypes.SELECT,
//     // });
//     // console.log(results, "cron job result")

//     return results;
// }
// const fetchData = async (EMPCode: any) => {

//     // Execute your SQL query to fetch data
//     const selectQuery = `
//             SELECT
//                 emp.EMPCode,
//                 (emp.FirstName + ' ' + emp.LastName) as EmployeeName,
//                 emp.Email,
//                 vts.FromDate,
//                 vts.ToDate,
//                 ddest.Designatation,
//                 dpart.Department,
//                 (
//                     SELECT
//                         (demp.FirstName + ' ' + demp.LastName)
//                     FROM
//                         dbo.employeedetails demp
//                     WHERE
//                         demp.EMPCode = emp.MgrEmployeeID
//                 ) as ReportingManager,
//                 ma.PresentTimeIn as CheckInTime,
//                 ma.PresentTimeOut as CheckOutTime
//             FROM
//                 dbo.markattendance ma
//             INNER JOIN dbo.employeedetails emp ON emp.EMPCode = ma.EMPCode
//             INNER JOIN dbo.visitsummary vts ON vts.VisitSummaryId = ma.VisitId
//             LEFT JOIN dbo.mstdesignatation ddest ON ddest.DesigId = emp.DesigId
//             LEFT JOIN dbo.mstdepartment dpart ON dpart.DeptId = emp.DeptId
//             WHERE
//                 ma.EMPCode = :EMPCode
//                 AND CAST(ma.AttendanceDate AS DATE) = CAST(GETDATE() AS DATE)
//             ORDER BY
//                 ma.createdAt DESC;
//             `;
//     const results: any = await sequelize.query(selectQuery, {
//         replacements: { EMPCode: EMPCode },
//         type: QueryTypes.SELECT,
//     });
//     console.log(results, "cron job result")
//     // const selectQuery = 'SELECT emp.EMPCode, CONCAT(emp.FirstName, \' \', emp.LastName) as EmployeeName, emp.Email, vts.FromDate, vts.ToDate, ddest.Designatation, dpart.Department, (select CONCAT(demp.FirstName, \' \', demp.LastName) from dbo.employeedetails demp where demp.EMPCode=emp.MgrEmployeeID) as ReportingManager, ma.PresentTimeIn as CheckInTime, ma.PresentTimeOut as CheckOutTime FROM dbo.markattendance ma INNER JOIN dbo.employeedetails emp on emp.EMPCode=ma.EMPCode INNER JOIN dbo.visitsummary vts on vts.VisitSummaryId=ma.VisitId INNER JOIN dbo.mstdesignatation ddest on ddest.DesigId=emp.DesigId INNER JOIN dbo.mstdepartment dpart on dpart.DeptId=emp.DeptId where ma.EMPCode=:EMPCode AND DATE(ma.AttendanceDate) = CURDATE() order by ma.createdAt desc';
//     // const results: any = await sequelize.query(selectQuery, {
//     //     replacements: { EMPCode: EMPCode },
//     //     type: QueryTypes.SELECT,
//     // });
//     // console.log(results, "cron job result")

//     return results;
// }

const uploadAttendenceImageLocal = async (req: RequestType, res: Response): Promise<void> => {
    try {
        if (req.file) {
            const fileName = req.file.filename;
            if (res.headersSent === false) {
                res.status(200).send({
                    error: false,
                    data: {
                        file_name: fileName,
                        message: `File '${fileName}' uploaded successfully.`
                    }
                });
            }
        } else {
            if (res.headersSent === false) {
                res.status(200).send({
                    error: true,
                    data: {
                        message: `No file uploaded.`
                    }
                });
            }
        }
    } catch (error: any) {
        console.log(error)
        res.status(422).send({
            error: true,
            data: {
                message: 'Internal Server Error'
            }
        });
    }
};

// Export Methods
export {
    getVisitForAttendence,
    getAttendenceStatus,
    markAttendence,
    getReport,
    getExportReport,
    uploadAttendenceImage,
    getAttendence,
    fetchData,
    uploadAttendenceImageLocal,
    getExpenseReport
};

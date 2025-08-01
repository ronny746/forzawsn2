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
import moment from 'moment';
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

// Function

// function daysLeftInCurrentMonthExcludingSundays() {
//     const today = new Date(); // Get the current date
//     const currentYear = today.getFullYear(); // Current year
//     const currentMonth = today.getMonth(); // Current month (0-11)
//     const currentDay = today.getDate(); // Current day of the month (1-31)

//     // Get the total days in the current month
//     const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

//     // Initialize the count of non-Sunday days left
//     let nonSundayDaysLeft = 0;

//     // Loop through each day from today until the end of the month
//     for (let day = currentDay; day <= totalDaysInMonth; day++) {
//         const date = new Date(currentYear, currentMonth, day);
//         const dayOfWeek = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
//         if (dayOfWeek !== 0) { // If it's not Sunday
//             nonSundayDaysLeft++;
//         }
//     }

//     return nonSundayDaysLeft;
// }

// function countSundaysTillToday() {
//     const today = new Date(); // Get the current date
//     const currentYear = today.getFullYear(); // Current year
//     const currentMonth = today.getMonth(); // Current month (0-11)
//     const currentDay = today.getDate(); // Current day of the month (1-31)

//     let sundayCount = 0;

//     // Loop through each day from the start of the month until today
//     for (let day = 1; day <= currentDay; day++) {
//         const date = new Date(currentYear, currentMonth, day);
//         const dayOfWeek = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
//         if (dayOfWeek === 0) { // If it's Sunday
//             sundayCount++;
//         }
//     }

//     return sundayCount;
// }

function countSundaysInCurrentMonth() {
    const today = new Date(); // Get the current date
    const currentYear = today.getFullYear(); // Get the current year
    const currentMonth = today.getMonth(); // Get the current month (0-11)

    // Get the first day of the current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Get the last day of the current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let sundayCount = 0;

    // Loop through each day of the current month
    for (let day = firstDayOfMonth; day <= lastDayOfMonth; day.setDate(day.getDate() + 1)) {
        if (day.getDay() === 0) { // 0 represents Sunday
            sundayCount++;
        }
    }

    return sundayCount;
}

function getTotalDaysTillTodayExcludingSundays() {
    // Define Indian Time Zone (IST)
    const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    // Get the first day of the current month in IST
    const firstDayOfMonthIST = new Date(todayIST.getFullYear(), todayIST.getMonth(), 1);

    let count = 0;

    // Loop from the 1st day of the month to today, excluding Sundays
    for (let d = new Date(firstDayOfMonthIST); d <= todayIST; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) { // getDay() returns 0 for Sunday
            count++;
            // console.log(count, "Day:", d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        }
    }

    return count;
}

// Controller Methods

const getVisitForAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const EMPCode = req?.payload?.EMPCode;
        // console.log(req.payload, "req.payload.attendence");
        const selectQuery = `
        SELECT vs.VisitSummaryId, 
            CONCAT(vs.VisitFrom, ' -', vs.VisitTo) AS VisitLocation, 
            vs.VisitDate 
        FROM dbo.visitsummary vs 
        INNER JOIN dbo.visitdetails vd ON vd.VisitId = vs.VisitId 
        INNER JOIN dbo.employeedetails emp ON emp.EMPCode = vd.EmpCode 
        LEFT JOIN dbo.markattendance mka ON mka.VisitId = vs.VisitSummaryId 
        WHERE 
            emp.EMPCode = :EMPCode
            AND vs.approvedStatus =  :approvedStatus 
            AND CAST(vs.VisitDate AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY
            mka.PresentTimeIn DESC`;

        let results: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode, approvedStatus: "Approved" },
            type: QueryTypes.SELECT,
        });

        // Get the current date in the local timezone
        // const currentDate = moment();

        // // Calculate the offset for Indian timezone (UTC+5:30)
        // const offsetHours = 5;
        // const offsetMinutes = 30;
        results.unshift({
            "VisitSummaryId": "0",
            "VisitLocation": "Un-planned",
            "VisitDate": new Date(),
        })

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

const createVisit = async (EMPCode: string, VisitFrom: string, VisitTo: string, visit_purpose: string, callback: Function) => {
    try {
        const uuid = uuidv4();
        const today_date = (new Date()).toISOString().slice(0, 19).replace('T', ' ');

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

        await sequelize.query(insertQuery, {
            replacements: {
                uuid: uuid,
                EMPCode: EMPCode,
                today_date: today_date,
                isPlanned: 0
            },
            type: QueryTypes.INSERT,
        });

        // console.log(visitData, "visitData");

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

        await sequelize.query(insertvisitsummaryQuery, {
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

        // console.log(visitSummaryData, "visitSummaryData");
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

        const decoded: any = req.payload;

        // console.log(decoded)
        // Verify the access token
        const EMPCode = decoded.EMPCode;
        const {
            Latitude,
            Longitude,
            visit_address,
            isPlanned,
            VisitFrom,
            VisitTo,
            visit_purpose
        } = req.body;
        const place_image = "temp.jpg";

        // if (place_image === "" && visit_address === "") {
        if (visit_address === "") {
            res.status(500).send({
                error: true,
                data: {
                    message: 'Please enter visit address for check in.'
                }
            });
            return;
        }

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
            const findQuery = 'Select EMPCode, EmployeeID from dbo.employeedetails where EMPCode=:EMPCode'
            const EmpCodeData: any = await sequelize.query(findQuery, {
                replacements: { EMPCode: EMPCode },
                type: QueryTypes.SELECT,
            });
            const checkInExistQuery = 'SELECT * FROM dbo.markattendance WHERE EMPCode = :EMPCode AND CheckIn = 1 AND CheckOut = 0 AND CAST(PresentTimeIn AS DATE) = CAST(GETDATE() AS DATE);';
            const checkInExistData: any = await sequelize.query(checkInExistQuery, {
                replacements: { EMPCode: EMPCode },
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
                            message: 'Please input From Visit and To Visit'
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
                                        :EMPCode,
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
                            EMPCode: EmpCodeData[0].EMPCode,
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
                    res.status(200).send({
                        error: false,
                        data: {
                            data: results,
                            VisitSummaryId: VisitSummaryId,
                            message: 'Visit create and check in successfully.'
                        }
                    });
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
                '${EmpCodeData[0].EMPCode}',
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
                res.status(200).send({
                    error: false,
                    data: {
                        data: results,
                        message: 'Check in successfully.'
                    }
                });
            }

        }
        else {
            const distance = haversineDistance(checkAttendeceExist[0].Lat, checkAttendeceExist[0].Long, Latitude, Longitude) || 0;

            const updateQuery = 'UPDATE dbo.markattendance SET AttendanceType = :AttendanceType, PresentTimeOut=:PresentTimeOut, CheckOut=:CheckOut, CheckOutAddress=:CheckOutAddress, CheckOutAddressImage=:CheckOutAddressImage, CheckOutLat=:CheckOutLat, CheckOutLong=:CheckOutLong, Distance=:distance WHERE VisitId = :VisitSummaryId';
            const results: any = await sequelize.query(updateQuery, {
                replacements: { 
                    VisitSummaryId: VisitSummaryId, 
                    PresentTimeOut: date.toISOString().slice(0, 19).replace('T', ' '), 
                    CheckOut: 1, 
                    AttendanceType: "Out", 
                    CheckOutAddress: visit_address, 
                    CheckOutAddressImage: place_image,
                    CheckOutLat: Latitude,
                    CheckOutLong: Longitude,
                    distance: distance
                },
                type: QueryTypes.UPDATE,
            });
            res.status(200).send({
                error: false,
                data: {
                    data: results,
                    message: 'Check out successfully.'
                }
            });
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

const attendanceLogs = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;
        const EMPCode: any = decoded.EMPCode;
        // console.log(EMPCode)
        // Define SQL query to select all columns from the MstExpMode table
        const selectQuery = `
        SELECT TOP 7 ma.EMPCode, 
            CONCAT(vs.VisitFrom, ' -', vs.VisitTo) AS VisitLoc, 
            ma.VisitId, 
            ma.Lat, 
            ma.Long, 
            ma.CheckInAddress, 
            ma.PresentTimeIn, 
            ma.PresentTimeOut, 
            ma.CheckIn, 
            ma.CheckOut 
        FROM dbo.markattendance ma 
        INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ma.VisitId 
        WHERE EMPCode = :EMPCode 
        ORDER BY MarkedAt DESC`;

        const rows: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        // If no data found, return 404 Not Found
        if (rows.length === 0) {
            res.status(404).send('No attendance logs found for the specified EMPCode');
            return;
        }

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": rows.length,
            "Data":
            {
                Attendancelog: rows
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error, "attendence log application error")
        res.status(500).json({ error: error });
    }
};

const myAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;
        const EMPCode = decoded.EMPCode;
        // console.log(EMPCode, decoded)

        const today = moment();
        const daysInMonth = today.daysInMonth();

        const selectQuery = `
            SELECT COUNT(*) AS total_attendance 
            FROM (
                SELECT DISTINCT CAST(PresentTimeIn AS DATE) AS attendance_day 
                FROM dbo.markattendance 
                WHERE MONTH(PresentTimeIn) = MONTH(GETDATE()) 
                      AND YEAR(PresentTimeIn) = YEAR(GETDATE()) 
                      AND checkIn = 1
                      AND EMPCode = :EMPCode
            ) AS distinct_attendance_days`;

        const rows: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        // console.log(rows, "attendance count");

        // If no data found, return 404 Not Found
        // if (rows.length === 0) {
        //     res.status(404).send('No attendance logs found for the specified EMPCode');
        //     return;
        // }

        // const leaveQuery = `
        //     SELECT COUNT(*) 
        //     FROM dbo.markleave 
        //     WHERE EMPCode = :EMPCode
        //     AND MONTH(PresentTimeIn) = MONTH(GETDATE()) 
        //     AND YEAR(PresentTimeIn) = YEAR(GETDATE())`;

        const leaveQuery = `
            SELECT 
    SUM(
        CASE
            -- Leave starts before or in the current month and ends in the current month or later
            WHEN FromDate < DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND ToDate >= EOMONTH(GETDATE(), 0) THEN DATEDIFF(DAY, DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0), EOMONTH(GETDATE()))
            -- Leave starts before or in the current month and ends within the current month
            WHEN FromDate < DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND ToDate < EOMONTH(GETDATE(), 0) THEN DATEDIFF(DAY, DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0), ToDate)
            -- Leave starts within the current month and ends in the current month
            WHEN FromDate >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND ToDate <= EOMONTH(GETDATE(), 0) THEN DATEDIFF(DAY, FromDate, ToDate)
            -- Leave starts within the current month and ends after the current month
            WHEN FromDate >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND ToDate > EOMONTH(GETDATE(), 0) THEN DATEDIFF(DAY, FromDate, EOMONTH(GETDATE(), 0))
            ELSE 0
        END
    ) AS TotalLeaveDaysThisMonth
FROM dbo.markleave
WHERE
    EMPCode = :EMPCode
    AND (FromDate <= EOMONTH(GETDATE()) AND ToDate >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0));
`;

        const leaveCount: any = await sequelize.query(leaveQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });

        const holidayQuery = `
        SELECT COUNT(*) AS total_holiday
        FROM dbo.mstholiday 
        WHERE
        MONTH(HolidayDate) = MONTH(GETDATE()) 
        AND YEAR(HolidayDate) = YEAR(GETDATE())`;
        // AND DAY(HolidayDate) <= DAY(GETDATE())`; // This ensures holidays are only up to today

        const holidayCount: any = await sequelize.query(holidayQuery, {
            type: QueryTypes.SELECT,
        });

        const holidayTillTodayQuery = `
        SELECT COUNT(*) AS total_holiday
        FROM dbo.mstholiday 
        WHERE
        MONTH(HolidayDate) = MONTH(GETDATE()) 
        AND YEAR(HolidayDate) = YEAR(GETDATE())
        AND DAY(HolidayDate) <= DAY(GETDATE())`; // This ensures holidays are only up to today

        const holidayTillTodayCount: any = await sequelize.query(holidayTillTodayQuery, {
            type: QueryTypes.SELECT,
        });

        // console.log(leaveCount, "leaveCount")

        // const totalAbsentDay = getTotalDaysTillTodayExcludingSundays() - holidayCount[0].total_holiday;

        const responseData =
        {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": 1,
            "Data": {
                "MyAttendance": [
                    {
                        "TotalDays": daysInMonth,
                        "WorkingDays": daysInMonth - countSundaysInCurrentMonth() - holidayCount[0].total_holiday,
                        "Present": rows[0].total_attendance,
                        "Absent": getTotalDaysTillTodayExcludingSundays() - rows[0].total_attendance + holidayTillTodayCount[0].total_holiday,
                        "Leave": leaveCount[0].TotalLeaveDaysThisMonth ? leaveCount[0].TotalLeaveDaysThisMonth : 0,
                        "HolidayCount": holidayCount[0].total_holiday,
                    }
                ]
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        }

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error });
    }
};

const getAttendenceStatus = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const VisitId = req.query.VisitId;
        if(Number(VisitId) === 1) {
            const responseData1 = {
                "ResponseMessage": "Success",
                "Status": true,
                "DataCount": 0,
                "Data": {
                    "VisitAttendance": []
                },
                "ResponseCode": "OK",
                "confirmationbox": false
            }
            res.status(200).json(responseData1);
            return;
        }
        // console.log(req.query, "req.payload.attendence");
        const selectQuery = `
    SELECT ma.EMPCode, 
           ma.VisitId, 
           ma.AttendanceDate, 
           ma.CheckIn, 
           ma.CheckOut, 
           ma.PresentTimeIn, 
           ma.PresentTimeOut, 
           ma.CheckInAddress, 
           ma.CheckInAddressImage, 
           ma.CheckOutAddress, 
           -- Calculate time difference in dd hh:mm:ss format
    CONCAT(
        DATEDIFF(DAY, ma.PresentTimeIn, 
            CASE 
                WHEN ma.CheckOut = 1 THEN ma.PresentTimeOut
                ELSE GETDATE()
            END
        ), ' days, ',
        RIGHT('0' + CAST(DATEDIFF(HOUR, ma.PresentTimeIn, 
            CASE 
                WHEN ma.CheckOut = 1 THEN ma.PresentTimeOut
                ELSE GETDATE()
            END) % 24 AS VARCHAR), 2), ':',
        RIGHT('0' + CAST(DATEDIFF(MINUTE, ma.PresentTimeIn, 
            CASE 
                WHEN ma.CheckOut = 1 THEN ma.PresentTimeOut
                ELSE GETDATE()
            END) % 60 AS VARCHAR), 2), ':',
        RIGHT('0' + CAST(DATEDIFF(SECOND, ma.PresentTimeIn, 
            CASE 
                WHEN ma.CheckOut = 1 THEN ma.PresentTimeOut
                ELSE GETDATE()
            END) % 60 AS VARCHAR), 2)
    ) AS TimeDifference,
           ma.CheckOutAddressImage 
    FROM dbo.markattendance ma 
    WHERE ma.VisitId = :VisitId`;

        const results: any = await sequelize.query(selectQuery, {
            replacements: { VisitId: VisitId },
            type: QueryTypes.SELECT,
        });
        // console.log(results, "visit status");
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": results.length,
            "Data": {
                "VisitAttendance": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        }
        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error, "error")
        res.status(500).json({ error: error });
    }
};

const getReport = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;

        const decoded: any = req.payload;
        const EMPCode = decoded.EMPCode;
        // console.log(EMPCode, decoded)

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
            vs.VisitFrom,
            vs.VisitTo,
            vs.VisitPurpose 
        FROM dbo.markattendance ma
        INNER JOIN visitsummary vs on vs.VisitSummaryId = ma.VisitId
        where ma.EMPCode = :EMPCode`;

        // Check if fromDate and toDate are provided and append the filtering condition
        if (startDate && endDate) {
            selectQuery += ` AND CAST(ma.PresentTimeIn AS DATE) BETWEEN :startDate AND :endDate`;
        }

        // Execute the query with replacements for VisitId, fromDate, and toDate
        const results: any = await sequelize.query(selectQuery, {
            replacements: {
                startDate: startDate || null, // Use null if fromDate is not provided
                endDate: endDate || null, // Use null if toDate is not provided,
                EMPCode: EMPCode
            },
            type: QueryTypes.SELECT,
        });

        // console.log(results, "visit status");

        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": results.length,
            "Data": {
                "reportData": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        };

        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error, "error in get report");
        res.status(500).json({ error: error.message });
    }
};


const getLastCheckIn = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const decoded: any = req.payload;
        const EMPCode: any = decoded.EMPCode;
        // console.log(EMPCode, decoded)
        const selectQuery = `
        SELECT vs.VisitDate, 
               vs.FromDate, 
               vs.ToDate, 
               vs.VisitPurpose, 
               vs.VisitFrom, 
               vs.VisitTo, 
               ma.EMPCode, 
               ma.VisitId, 
               ma.AttendanceDate, 
               ma.CheckIn, 
               ma.CheckOut, 
               ma.PresentTimeIn, 
               ma.PresentTimeOut, 
               ma.CheckInAddress, 
               ma.CheckInAddressImage, 
               ma.CheckOutAddress, 
               ma.CheckOutAddressImage 
        FROM dbo.markattendance ma 
        INNER JOIN dbo.visitsummary vs ON vs.VisitSummaryId = ma.VisitId 
        WHERE ma.EMPCode = :EMPCode 
              AND ma.CheckIn = 1 
              AND ma.CheckOut = 0 
              AND CAST(ma.PresentTimeIn AS DATE) = CAST(GETDATE() AS DATE)`;

        const results: any = await sequelize.query(selectQuery, {
            replacements: { EMPCode: EMPCode },
            type: QueryTypes.SELECT,
        });
        // console.log(results, "visit status");
        const responseData = {
            "ResponseMessage": "Success",
            "Status": true,
            "DataCount": results.length,
            "Data": {
                "LastVisitAttendance": results
            },
            "ResponseCode": "OK",
            "confirmationbox": false
        }
        res.status(200).json(responseData);
    } catch (error: any) {
        console.log(error, "error in get last check in")
        res.status(500).json({ error: error });
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
        // console.log(file, "df");
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
        console.log(error, "upload attendence image")
        res.status(422).send({
            error: true,
            data: {
                message: 'Internal Server Error'
            }
        });
    }
};

// const getLeaveDates = (startDate: any, days: any) => {
//     const leaveDates = [];
//     const currentDate = new Date(startDate);
//     for (let i = 0; i < days; i++) {
//         leaveDates.push(currentDate.toISOString().split('T')[0]);
//         currentDate.setDate(currentDate.getDate() + 1);
//     }
//     return leaveDates;
// }

const formatDate = (date: any) => {
    const year = date.getFullYear();
    let month = (date.getMonth() + 1).toString();
    let day = date.getDate().toString();
    month = month.length === 1 ? '0' + month : month;
    day = day.length === 1 ? '0' + day : day;
    return `${year}-${month}-${day}`;
}

const findAbsentRows = (presentRows: any, dates: any) => {

    // Get today's date
    const today = moment(); // Example: '2024-09-25'

    // Get the current month and year
    const currentMonth = today.month() + 1; // September is 9
    const currentYear = today.year(); // Example: 2024

    // Helper function to check if a date is in a given array
    const isDateInArray = (dateString: string, array: any) => array.some((item: any) => item.date === dateString);

    // Generate absent dates
    const absentRows = [];
    for (let day = 1; day <= today.date(); day++) {
        const currentDate = moment(`${currentYear}-${currentMonth}-${day}`, 'YYYY-MM-DD').format('YYYY-MM-DD');

        // If the current date is not present in presentRows and dates (holidays), mark it as absent
        if (!isDateInArray(currentDate, presentRows) && !isDateInArray(currentDate, dates)) {
            absentRows.push({ date: currentDate, type: 'absent' });
        }
    }

    return absentRows;

}

const getMonthlyAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        // --------------- rohit code --------------------
        const decoded: any = req.payload;
        const empCode = decoded.EMPCode;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Query to retrieve leave information
        const leaveQuery = `
        SELECT *, DATEDIFF(day, FromDate, ToDate) + 1 AS LeaveDays, FromDate 
        FROM dbo.markleave 
        WHERE ApprovedOn IS NOT NULL
            AND EMPCode = :EMPCode 
            AND MONTH(FromDate) = :currentMonth 
            AND YEAR(FromDate) = :currentYear`;

        // Query to retrieve holiday information
        const holidayQuery = `
        SELECT *, HolidayDate AS HolidayOccasion 
        FROM dbo.mstholiday 
        WHERE MONTH(HolidayDate) = :currentMonth 
            AND YEAR(HolidayDate) = :currentYear
            `;

        // Query to retrieve present information
        const presentQuery = `
        SELECT 
            CAST(PresentTimeIn AS DATE) AS date, 
            'present' AS type 
        FROM 
            dbo.markattendance 
        WHERE 
            CheckIn = 1
            AND EMPCode = :EMPCode 
            AND MONTH(PresentTimeIn) = :currentMonth 
            AND YEAR(PresentTimeIn) = :currentYear
        GROUP BY 
            CAST(PresentTimeIn AS DATE)
        HAVING 
            COUNT(CASE WHEN CheckIn = 1 THEN 1 END) > 0
        `;
        // Query to retrieve present information
        const absentQuery = `
        SELECT 
            CAST(PresentTimeIn AS DATE) AS date, 
            'present' AS type 
        FROM 
            dbo.markattendance 
        WHERE 
            CheckIn = 0
            AND EMPCode = :EMPCode 
            AND MONTH(PresentTimeIn) = :currentMonth 
            AND YEAR(PresentTimeIn) = :currentYear
        GROUP BY 
            CAST(PresentTimeIn AS DATE)
        HAVING 
            COUNT(CASE WHEN CheckIn = 0 THEN 1 END) > 0
        `;

        Promise.all([
            sequelize.query(leaveQuery, {
                replacements: { currentMonth: currentMonth, currentYear: currentYear, EMPCode: empCode },
                type: QueryTypes.SELECT,
            }),
            sequelize.query(holidayQuery, {
                replacements: { currentMonth: currentMonth, currentYear: currentYear },
                type: QueryTypes.SELECT,
            }),
            sequelize.query(presentQuery, {
                replacements: { currentMonth: currentMonth, currentYear: currentYear, EMPCode: empCode },
                type: QueryTypes.SELECT,
            }),
            sequelize.query(absentQuery, {
                replacements: { currentMonth: currentMonth, currentYear: currentYear, EMPCode: empCode },
                type: QueryTypes.SELECT,
            })
        ])
            .then((values: [unknown, unknown, unknown, unknown]) => {
                // const leaveRows = values[0] as any[];
                const holidayRows = values[1] as any[];
                const presentRows = values[2] as any[];
                // const absentRows = values[3] as any[];
                // The resolved values are leaveRows and holidayRows
                // Here you can process them as needed

                // Prepare the leave dates
                // const leaveDates = leaveRows.reduce((accumulator: any[], row: any) => {
                //     const dates: any = getLeaveDates(row.FromDate, row.LeaveDays);
                //     return accumulator.concat(dates.map((date: any) => ({ date, type: 'leave' })));
                // }, []);

                // console.log(leaveDates);

                // Identify all Sundays in the current month
                const sundays: any[] = [];
                const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
                const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
                for (let date = firstDayOfMonth; date <= lastDayOfMonth; date.setDate(date.getDate() + 1)) {
                    if (date.getDay() === 0) { // Sunday
                        sundays.push({ date: formatDate(date), type: 'holiday' });
                    }
                }

                // Prepare the holiday dates
                const holidayDates = holidayRows.map((row: any) => ({ date: row.HolidayDate, type: 'holiday' }));

                // Combine leave dates, holiday dates, and Sundays into a single array
                // const allDates = leaveDates.concat(holidayDates).concat(sundays);
                const allDates = holidayDates.concat(sundays);

                // Sort the combined array by date
                allDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const absentRowsTillToday = findAbsentRows(presentRows, allDates);

                // console.log(absentRows);

                // Construct the response
                const responseData = {
                    ResponseMessage: 'Success',
                    Status: true,
                    DateCount: allDates.length,
                    presentRows: presentRows,
                    absentRows: absentRowsTillToday,
                    Dates: allDates,
                    ResponseCode: 'OK',
                    confirmationbox: false
                };

                // Return the response
                res.status(200).json(responseData);
            })
            .catch((err: any) => {
                // Handle database error
                console.error('Error retrieving leave and holidays:', err);
                res.status(500).json({ ResponseMessage: 'Error', Status: false });
            });
        // });
        // --------------- rohit code --------------------
        // const decoded: any = req.payload;
        // console.log(decoded)
        // const EMPCode = decoded.EMPCode;
        // const selectQuery = 'select PresentTimeIn, PresentTimeOut from `dbo.markattendance` WHERE EMPCode=:EMPCode AND MONTH(PresentTimeIn) = MONTH(CURRENT_DATE()) AND YEAR(PresentTimeIn) = YEAR(CURRENT_DATE())';
        // const results: any = await sequelize.query(selectQuery, {
        //     replacements: { EMPCode: EMPCode },
        //     type: QueryTypes.SELECT,
        // });
        // res.status(200).json({ data: results });
    } catch (error: any) {
        console.log(error, "error get monthly attendence");
        res.status(500).json({ error: error });
    }
};

const updateAttendence = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const {
            attendenceId,
            FirstCheckInTime,
            LastCheckOutTime,
            VisitDate,
            distance,
            createdAt
        } = req.body;

        if (!attendenceId && !FirstCheckInTime && !LastCheckOutTime && !VisitDate && !distance && !createdAt) {
            res.status(500).send({
                error: true,
                data: {
                    message: 'Please enter all field.'
                }
            });
            return;
        }

        const checkAttendeceQuery = 'SELECT VisitId From dbo.markattendance where Id=:attendenceId';
        const checkAttendeceExist: any = await sequelize.query(checkAttendeceQuery, {
            replacements: { 
                attendenceId: attendenceId,
            },
            type: QueryTypes.SELECT,
        });
        if (checkAttendeceExist.length === 0) {
            res.status(405).send({
                error: true,
                data: {
                    message: 'No attendence found on this attendence id'
                }
            });
        }
        // console.log(checkAttendeceExist, 'checkAttendeceExist');

        const checkVisitQuery = 'SELECT VisitId From dbo.visitsummary where VisitSummaryId=:VisitSummaryId';
        const visitDetail: any = await sequelize.query(checkVisitQuery, {
            replacements: { 
                VisitSummaryId: checkAttendeceExist[0].VisitId,
            },
            type: QueryTypes.SELECT,
        });
        // console.log(visitDetail, 'visitDetail');
        if (visitDetail.length === 0) {
            res.status(405).send({
                error: true,
                data: {
                    message: 'No visit found on this attendence id'
                }
            });
        }

        const updateQuery = `UPDATE 
                            dbo.markattendance 
                            SET
                            PresentTimeIn=:PresentTimeIn, 
                            PresentTimeOut=:PresentTimeOut,
                            AttendanceDate=:createdAt,
                            Distance=:distance,
                            createdAt=:createdAt
                            WHERE 
                            Id = :attendenceId`;
        const results: any = await sequelize.query(updateQuery, {
            replacements: { 
                attendenceId: attendenceId,
                PresentTimeIn: FirstCheckInTime,
                PresentTimeOut: LastCheckOutTime,
                createdAt: createdAt, 
                distance: distance
            },
            type: QueryTypes.UPDATE,
        });

        const updateVisitSummaryQuery = `UPDATE 
                                        dbo.visitsummary 
                                        SET 
                                        VisitDate = :VisitDate, 
                                        createdAt=:createdAt 
                                        WHERE 
                                        VisitSummaryId = :VisitSummaryId`;
        await sequelize.query(updateVisitSummaryQuery, {
            replacements: { 
                VisitSummaryId: checkAttendeceExist[0].VisitId,
                VisitDate: VisitDate,
                createdAt: createdAt,
            },
            type: QueryTypes.UPDATE,
        });

        const updateVisitQuery = `UPDATE 
                                dbo.visitdetails 
                                SET
                                FromDate = :VisitDate, 
                                ToDate = :VisitDate, 
                                createdAt=:createdAt 
                                WHERE 
                                VisitId = :VisitId`;
        await sequelize.query(updateVisitQuery, {
            replacements: { 
                VisitId: visitDetail[0].VisitId,
                VisitDate: VisitDate,
                createdAt: createdAt,
            },
            type: QueryTypes.UPDATE,
        });
        res.status(200).send({
            error: false,
            data: {
                data: results,
                VisitSummaryId: checkAttendeceExist[0].VisitId,
                VisitId: visitDetail[0].VisitId,
                message: 'Attendence updated successfully.'
            }
        });
    } catch (error: any) {
        console.log(error, "Error in update attendence");
        res.status(501).send({
            error: true,
            data: {
                message: error.message || 'Internal Server Error'
            }
        });
    }
};

// Export Methods
export {
    getVisitForAttendence,
    markAttendence,
    attendanceLogs,
    myAttendence,
    getAttendenceStatus,
    getReport,
    getLastCheckIn,
    uploadAttendenceImage,
    getMonthlyAttendence,
    updateAttendence
};

/* eslint-disable */
import { NextFunction, Response } from 'express';
// import { logBackendError } from '../../helpers/common/backend.functions';
import { RequestType } from '../../helpers/shared/shared.type';
import httpErrors from 'http-errors';
import XLSX from 'xlsx'
import {
    AddAppUserType,
    joiAddUser
} from '../../helpers/joi/admin/user_details/index'
import sequelize from '../../helpers/common/init_mysql';
// import path from 'path';
const { QueryTypes } = require("sequelize");

// Controller Methods
const appAddUser = async (req: RequestType, res: Response): Promise<void> => {
    try {
        const appUserDetails: AddAppUserType = await joiAddUser.addAppUserSchema.validateAsync(req.body);
        console.log(appUserDetails, "appUserDetails");

        //check if user exist in collection
        const query = 'SELECT * FROM dbo.employeedetails where MobileNo = :MobileNo and isActive = 1';
        console.log('query', query);
        const doesAppUserExist: any = await sequelize.query(query, {
            replacements: {
                MobileNo: appUserDetails.mobile_no,
            },
            type: QueryTypes.SELECT,
        });
        // console.log('doesAppUserExist', doesAppUserExist);
        if (doesAppUserExist.length !== 0) {
            res.status(401).send({
                error: true,
                data: {
                    message: `User with Mobile Number: [${appUserDetails.mobile_no}] already exists.`
                }
            });
        } else {
            // Insert query
            const queryInsert = `
                INSERT INTO dbo.employeedetails (
                    FirstName,
                    LastName,
                    GenId,
                    DOB,
                    DesigId,
                    CAId,
                    Address1,
                    Address2,
                    State,
                    City,
                    Postcode,
                    SAId,
                    MgrEmployeeID,
                    Email,
                    MobileNo,
                    EMPCode,
                    Password,
                    DeptId,
                    CL,
                    SL,
                    EL
                ) VALUES (
                    :first_name,
                    :last_name,
                    :gender,
                    :dob,
                    :designation,
                    :city_allowance,
                    :address1,
                    :address2,
                    :state,
                    :city,
                    :postcode,
                    :service_area,
                    :manager_empcode,
                    :email,
                    :mobile_no,
                    :emp_code,
                    :password,
                    :department,
                    :cl_leave,
                    :sl_leave,
                    :el_leave
                );`;

            const storeAppUserDetails: any = await sequelize.query(queryInsert, {
                replacements: {
                    first_name: appUserDetails.first_name,
                    last_name: appUserDetails.last_name,
                    gender: appUserDetails.gender,
                    dob: "",
                    designation: appUserDetails.designation,
                    city_allowance: "",
                    address1: "",
                    address2: "",
                    state: "",
                    city: "",
                    postcode: "",
                    service_area: appUserDetails.service_area,
                    manager_empcode: appUserDetails.manager_empcode,
                    email: appUserDetails.email,
                    mobile_no: appUserDetails.mobile_no,
                    emp_code: appUserDetails.emp_code,
                    password: appUserDetails.password,
                    department: appUserDetails.department,
                    cl_leave: 0,
                    sl_leave: 0,
                    el_leave: 0
                },
                type: QueryTypes.INSERT,
            });

            if (res.headersSent === false) {
                res.status(200).send({
                    error: false,
                    data: {
                        appUser: {
                            appUserId: storeAppUserDetails[0]
                        },
                        message: 'User created successfully.'
                    }
                });
            }
        }
    } catch (error: any) {
        console.error('Error in appAddUser:', error);
        const errorMessage = error.details?.[0]?.message || 'An unexpected error occurred.';
        res.status(400).send({
            error: true,
            data: {
                message: errorMessage,
            },
        });
    }
};

const getAllUser = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        const userQuery = 'SELECT EmployeeID, EMPCode, FirstName, LastName FROM dbo.employeedetails where isActive = 1';
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

const addServiceArea = async (req: RequestType, res: Response): Promise<void> => {
    try {

        const { ServiceArea } = req.body;
        //check if user exist in collection
        const query = 'SELECT * FROM dbo.mstservicearea where ServiceArea = :ServiceArea and isActive = 1';
        console.log('query', query);
        const doesAppUserExist: any = await sequelize.query(query, {
            replacements: {
                ServiceArea: ServiceArea,
            },
            type: QueryTypes.SELECT,
        });
        console.log('doesAppUserExist', doesAppUserExist);
        if (doesAppUserExist.length !== 0) {
            res.status(401).send({
                error: true,
                data: {
                    message: `Service area with: [${ServiceArea}] already exist.`
                }
            });
            return;
        }
        // if (doesAppUserExist.length !== 0) throw httpErrors.Conflict(`User with Mobile Number: [${appUserDetails.mobile_no}] already exist.`);

        // save
        const firstQuery = 'INSERT INTO dbo.mstservicearea ';
        const insertQuery = firstQuery + `(
            ServiceArea
          ) VALUES (
            :ServiceArea
          );`

        await sequelize.query(insertQuery, {
            replacements: { ServiceArea: ServiceArea },
            type: QueryTypes.INSERT,
        });


        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    message: 'Service area created successfully.'
                }
            });
        }
    } catch (error: any) {
        // logBackendError(__filename, error?.message, req?.originalUrl, req?.ip, null, error?.stack);
        console.log(error);
        res.status(401).send({
            error: true,
            data: {
                message: "Internal server error"
            }
        });
    }
};

const addDesignation = async (req: RequestType, res: Response): Promise<void> => {
    try {

        const { Designation } = req.body;
        //check if user exist in collection
        const query = 'SELECT * FROM dbo.mstdesignatation where Designatation = :Designation and isActive = 1';
        // console.log('query', query);
        const doesDesignationExist: any = await sequelize.query(query, {
            replacements: {
                Designation: Designation,
            },
            type: QueryTypes.SELECT,
        });
        // console.log('doesDesignationExist', doesDesignationExist);
        if (doesDesignationExist.length !== 0) {
            res.status(401).send({
                error: true,
                data: {
                    message: `Designation name: [${Designation}] already exist.`
                }
            });
            return;
        }

        const [result]: any = await sequelize.query(
            'SELECT MAX(DesigId) AS maxId FROM dbo.mstdesignatation;',
            { type: QueryTypes.SELECT }
        );

        // Step 2: Increment the desigId by 1
        const newDesigId = (result.maxId || 0) + 1;

        const firstQuery = 'INSERT INTO dbo.mstdesignatation ';
        const insertQuery = firstQuery + `(
            DesigId,
            Designatation,
            Isactive
          ) VALUES (
            :newDesigId,
            :Designation,
            1
          );`

        await sequelize.query(insertQuery, {
            replacements: { Designation: Designation, newDesigId: newDesigId },
            type: QueryTypes.INSERT,
        });


        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    message: 'Designation created successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error, "Error in add Designation");
        res.status(401).send({
            error: true,
            data: {
                message: "Internal server error"
            }
        });
    }
};

const appUpdateUser = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {
        const appUserDetails: AddAppUserType = await req.body
        console.log(appUserDetails, "appUserDetails");

        //check if user exist in collection
        const query = 'SELECT * FROM dbo.employeedetails where MobileNo = :MobileNo';
        console.log('query', query);
        const doesAppUserExist: any = await sequelize.query(query, {
            replacements: {
                MobileNo: appUserDetails.mobile_no,
            },
            type: QueryTypes.SELECT,
        });
        console.log('doesAppUserExist', doesAppUserExist);
        if (doesAppUserExist.length === 0) throw httpErrors.Conflict(`User with Mobile Number: [${appUserDetails.mobile_no}] does not exist.`);

        // save
        const firstQuery = 'UPDATE dbo.employeedetails SET ';
        const updateQuery = firstQuery + `
            FirstName='${appUserDetails.first_name}',
            LastName='${appUserDetails.last_name}',
            GenId='${String(appUserDetails.gender)}',
            DOB='',
            DesigId='${String(appUserDetails.designation)}',
            CAId='',
            Address1='',
            Address2='',
            State='',
            City='',
            Postcode='',
            SAId='${String(appUserDetails.service_area)}',
            MgrEmployeeID='${appUserDetails.manager_empcode}',
            Email='${appUserDetails.email}',
            MobileNo='${appUserDetails.mobile_no}',
            EMPCode='${appUserDetails.emp_code}',
            Password='${appUserDetails.password}',
            DeptId='${String(appUserDetails.department)}',
            IsActive='${String(appUserDetails.isActive ? 1 : 0)}',
            CL='',
            SL='',
            EL=''
            where EMPCode=:EMPCode`

        const storeAppUserDetails: any = await sequelize.query(updateQuery, {
            replacements: { EMPCode: appUserDetails.emp_code },
            type: QueryTypes.UPDATE,
        });


        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    appUser: {
                        appUserId: storeAppUserDetails
                    },
                    message: 'User updated successfully.'
                }
            });
        }
    } catch (error: any) {
        // logBackendError(__filename, error?.message, req?.originalUrl, req?.ip, null, error?.stack);
        console.log(error);
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
};

const getAppDropDownData = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.query);
        const genderQuery = 'SELECT GenId, Gender FROM dbo.mstgender where isActive = 1';
        const genderData: any = await sequelize.query(genderQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });
        const designationQuery = 'SELECT DesigId, Designatation FROM dbo.mstdesignatation where isActive = 1';
        const designationData: any = await sequelize.query(designationQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });
        // const cityallowanceQuery = 'SELECT * FROM dbo.mstcityallowance where isActive = 1';
        // const cityallowanceData: any = await sequelize.query(cityallowanceQuery, {
        //     replacements: {},
        //     type: QueryTypes.SELECT,
        // });
        const departmentQuery = 'SELECT DeptId, Department FROM dbo.mstdepartment where isActive = 1';
        const departmentData: any = await sequelize.query(departmentQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });
        const serviceareaQuery = 'SELECT SAId, ServiceArea FROM dbo.mstservicearea where isActive = 1';
        const serviceareaData: any = await sequelize.query(serviceareaQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });
        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        genderData: genderData,
                        designationData: designationData,
                        // cityallowanceData: cityallowanceData,
                        departmentData: departmentData,
                        serviceareaData: serviceareaData
                    },
                    message: 'drop down data fetched successfully.'
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
        const userQuery = 'SELECT * FROM dbo.employeedetails AS demp where EmpCode = :EmpCode';
        const userData: any = await sequelize.query(userQuery, {
            replacements: {
                EmpCode: EMPCode
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

const getState = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.query);
        const userQuery = 'SELECT iso2 as stateCode, name FROM new_state';
        const stateData: any = await sequelize.query(userQuery, {
            replacements: {},
            type: QueryTypes.SELECT,
        });

        if (res.headersSent === false) {
            res.status(200).send({
                error: false,
                data: {
                    data: {
                        stateData: stateData
                    },
                    message: 'State fetch successfully.'
                }
            });
        }
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const uploadEmplyeeData = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req.files, "req.files")
        if (!req.files || Object.keys(req.files).length === 0) {
            res.status(400).send('No files were uploaded.');
        }

        const file: any = req?.files?.file instanceof Array ? req?.files?.file[0] : req?.files?.file;

        file.mv(`./uploads/${file.name}`, (err: any) => {
            if (err) {
                res.status(500).send(err);
            }

            const workbook = XLSX.readFile(`./uploads/${file.name}`);
            const sheet_name_list = workbook.SheetNames;
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
            console.log(data, 'Array form data form excel')
            if (res.headersSent === false) {
                res.status(200).send({
                    error: false,
                    data: {
                        data: data,
                        message: 'Employee data uploaded successfully.'
                    }
                });
            }
        })
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

const downloadTemplate = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
    try {

        console.log(req?.payload);
        const fileName: any = 'UserTemplate.xlsx'; // Replace 'your_excel_file.xlsx' with your actual file name
        console.log(__dirname, "__dirname");
        // const filePath: any = path.join(__dirname, '../../public', fileName);
        // const filePath: any = path.join(__dirname, '..', '..', 'public', fileName);
        const filePath: any = '/Users/hp/Documents/temp/wsn-backend/src/public/UserTemplate.xlsx';

        // Send the file as an attachment
        res.download(filePath, fileName, (err) => {
            if (err) {
                // Handle error
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } catch (error: any) {
        console.log(error)
        if (error?.isJoi === true) error.status = 422;
        next(error);
    }
}

// Export Methods
export {
    appAddUser,
    getAllUser,
    addServiceArea,
    addDesignation,
    getAppDropDownData,
    uploadEmplyeeData,
    downloadTemplate,
    getUserDetailById,
    appUpdateUser,
    getState
};

/* eslint-disable */
import { NextFunction, Response } from 'express';
import moment from 'moment';
import httpErrors from 'http-errors';
// import JWT from 'jsonwebtoken';
import { objectIdToString, logBackendError, isValidPassword } from '../../../helpers/common/backend.functions';
// import { RequestType } from '../../../helpers/shared/shared.type';
import * as jwtModule from '../../../middlewares/jwt/jwt.middleware';
import {
  // AppAgentDetailsType,
  AppUserLoginType,
  // AppUserType,
  joiUser
} from '../../../helpers/joi/agent/index';
import sequelize from '../../../helpers/common/init_mysql';
import { RequestType } from 'helpers/shared/shared.type';
const { QueryTypes } = require("sequelize");

// Controller Methods
const appUserLogin = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
  try {

    // Validate Joi Schema
    const userLoginDetails: AppUserLoginType = await joiUser.appUserLoginSchema.validateAsync(req.body);

    const query = 'SELECT * FROM dbo.employeedetails where MobileNo = :MobileNo and isActive = 1';
    console.log('query', query);
    const getUser: any = await sequelize.query(query, {
      replacements: {
        MobileNo: userLoginDetails.MobileNo,
      },
      type: QueryTypes.SELECT,
    });

    const getFinUser: any = getUser[0];

    console.log(getFinUser, "getUser");

    if (!getFinUser) throw httpErrors.Forbidden(`Invalid Email or Password. Please try again.`);

    // Check if password matches to the User details
    const doesPassMatch = await isValidPassword(userLoginDetails.password, getFinUser.Password);

    if (!doesPassMatch) throw httpErrors.Forbidden(`Invalid Email or Password. Please try again.`);

    const jwtToken = await jwtModule
      .signAccessToken({
        requestIP: req.ip??'',
        appUserId: objectIdToString(getFinUser.EMPCode),
        DesigId: objectIdToString(getFinUser.DesigId)
      })
      .catch((error: any) => {
        throw httpErrors.InternalServerError(`JWT Access Token error : ${error.message}`);
      });

    const jwtRefreshToken = await jwtModule
      .signRefreshToken({
        requestIP: req.ip??'',
        appUserId: objectIdToString(getFinUser.EMPCode),
        DesigId: objectIdToString(getFinUser.DesigId)
      })
      .catch((error: any) => {
        throw httpErrors.InternalServerError(`JWT Refresh Token error : ${error.message}`);
      });

    const JWT_REFRESH_TOKEN_HEADER = process.env.JWT_REFRESH_TOKEN_HEADER;

    if (!JWT_REFRESH_TOKEN_HEADER)
      throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_REFRESH_TOKEN_HEADER]`);

    console.log(req.ip, 'req-----------------------');
    if (res.headersSent === false) {
      res
        .cookie(JWT_REFRESH_TOKEN_HEADER, jwtRefreshToken, {
          secure: process.env.NODE_ENV == 'production',
          signed: true,
          httpOnly: true,
          sameSite: true,
          expires: new Date(moment().endOf('day').toDate())
        })
        .send({
          error: false,
          data: {
            appUserAccDetails: {
              appUserId: getUser.EMPCode,
              MobileNo: getUser.MobileNo,
              username: getUser.FirstName && getUser.LastName ? getUser.FirstName + ' ' + getUser.LastName : ''
            },
            jwtToken: jwtToken
          },
          message: 'User Logged in successfully.'
        });
    }
  } catch (error: any) {
    logBackendError(__filename, error?.message, req?.originalUrl, req?.ip, null, error?.stack);
    if (error?.isJoi === true) error.status = 422;
    next(error);
  }
};

const appUserLogout = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if Payload contains appUserId
    if (!req?.payload?.appUserId) {
      throw httpErrors.UnprocessableEntity(`JWT Refresh Token error : Missing Payload Data`);
    }
    console.log(req.payload, 'payload');
    // const getUser: IUser | null = await appUserModel.findOne({
    //   _id: req.payload.appUserId,
    //   isDeleted: false,
    // });

    // Delete Refresh Token from Redis DB
    // await jwtModule
    //   .removeToken({
    //     appUserId: req.payload.appUserId,
    //     requestIP: ''
    //   })
    //   .catch((error: any) => {
    //     throw httpErrors.InternalServerError(`JWT Refresh Token error : ${error.message}`);
    //   });

    // await new appUserTimeLogModel({
    //   appUserId: getUser._id,
    //   type: 'LOGGED_OUT',
    // }).save({});

    const JWT_REFRESH_TOKEN_HEADER = process.env.JWT_REFRESH_TOKEN_HEADER;

    if (!JWT_REFRESH_TOKEN_HEADER)
      throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_REFRESH_TOKEN_HEADER]`);

    // Delete cookies & send response
    res
      .clearCookie(JWT_REFRESH_TOKEN_HEADER, {
        secure: process.env.NODE_ENV == 'production',
        signed: true,
        httpOnly: true,
        sameSite: true
      })
      .send({
        error: false,
        data: {
          message: 'User logged out successfully.'
        }
      });
  } catch (error: any) {
    logBackendError(__filename, error?.message, req?.originalUrl, req?.ip, null, error?.stack);
    next(error);
  }
};

const getUserByToken = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = `SELECT
                  emp.* ,
                  md.Department,
                  mdt.Designatation,
                  (SELECT CONCAT(demp.FirstName, ' ', demp.LastName) FROM dbo.employeedetails demp WHERE demp.EMPCode = emp.MgrEmployeeID) as ManagerName
                  FROM
                  dbo.employeedetails as emp
                  INNER JOIN mstdepartment as md on emp.DeptId = md.DeptId
                  INNER JOIN mstdesignatation as mdt on emp.DesigId = mdt.DesigId
                  where EMPCode = :id and emp.isActive = 1`;
    console.log('query', query);
    const getUser: any = await sequelize.query(query, {
      replacements: {
        id: req?.payload?.appUserId,
      },
      type: QueryTypes.SELECT,
    });

    const getFinUser: any = getUser[0];

    // console.log(getFinUser, "getUser");
    res.status(200).json({
      User: {
        appUserId: getFinUser?.EMPCode,
        email: getFinUser?.Email,
        username: getFinUser.FirstName && getFinUser.LastName ? getFinUser.FirstName + ' ' + getFinUser.LastName : '',
        DesigId: getFinUser?.DesigId,
        Department: getFinUser?.Department,
        Designatation: getFinUser?.Designatation,
        ManagerName: getFinUser?.ManagerName,
        joiningDate: getFinUser?.createdAt,
        MgrEmployeeID: getFinUser?.MgrEmployeeID
      }
    });
  } catch (error: any) {
    console.log(error);
    logBackendError(__filename, error?.message, req?.originalUrl, req?.ip, null, error?.stack);
    next(error);
  }
};

// Export Methods
export { appUserLogin, appUserLogout, getUserByToken };

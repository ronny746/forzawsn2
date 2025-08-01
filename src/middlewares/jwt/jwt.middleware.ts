import JWT from 'jsonwebtoken';
import moment from 'moment';
import httpErrors from 'http-errors';
import { NextFunction, Response } from 'express';
import { RequestType } from '../../helpers/shared/shared.type';
// import { redisClient } from '../../helpers/common/init_redis';
import { logBackendError, getTokenExpTime } from '../../helpers/common/backend.functions';
const notAuthorized = 'Request not Authorized';

type PayloadDataType = {
  requestIP: string;
  appUserId: string;
  DesigId: string;
};

const verifyApplicationAccessToken = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader: any = req.headers['authorization'];

    let accessToken;
    if (authHeader) {
      accessToken = authHeader.split(' ')[1];
    }
    console.log('Received JWT:', accessToken);  // Add this line for debugging
    const decode: any = JWT.verify(accessToken, 'rana');
    console.log(decode, 'decode')
    req.payload = decode;
    next();
  } catch (error) {
    console.log(error, 'attendence log application error jwt')
    res.status(401).json({ error: error });
  }
};

const verifyAccessToken = async (req: RequestType, res: Response, next: NextFunction): Promise<void> => {
  try {
    const JWT_ACCESS_TOKEN_HEADER = process.env.JWT_ACCESS_TOKEN_HEADER;

    if (!JWT_ACCESS_TOKEN_HEADER)
      throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ACCESS_TOKEN_HEADER]`);

    const refreshTokenHeader = JWT_ACCESS_TOKEN_HEADER;
    if (!req.headers?.[refreshTokenHeader]) throw httpErrors.Unauthorized(notAuthorized);
    const authHeader = req.headers?.[refreshTokenHeader];
    let bearerToken: string[] = [];
    if (typeof authHeader === 'string') {
      bearerToken = authHeader.split(' ');
    }
    const accessToken = bearerToken[1] != undefined ? bearerToken[1] : false;

    if (!accessToken) throw httpErrors.Unauthorized(notAuthorized);

    const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET

    if (!JWT_ACCESS_TOKEN_SECRET)
      throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ACCESS_TOKEN_SECRET]`);

    JWT.verify(accessToken, JWT_ACCESS_TOKEN_SECRET, (error: any, payload: any) => {
      console.log(payload, payload?.payloadData?.requestIP, req.ip, 'accessToken');
      if (error || payload?.payloadData?.requestIP != req.ip) {
        throw httpErrors.Unauthorized(error);
      }
      req.payload = payload.payloadData;
      next();
    });
  } catch (error) {
    __sendJWTError(error, req, res);
  }
};

const __sendJWTError = async (error: any, req: RequestType, res: Response): Promise<void> => {
  const responseStatus = error.status || 500;
  const responseMessage = error.message || `Cannot resolve request [${req.method}] ${req.url}`;
  if (res.headersSent === false) {
    res.status(responseStatus);
    res.send({
      error: {
        status: responseStatus,
        message: responseMessage
      }
    });
  }
};

const signAccessToken = (payloadData: PayloadDataType): Promise<string> => {
  return new Promise((resolve, reject) => {
    (async (): Promise<void> => {
      try {
        const jwtPayload = { payloadData };
        const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET;

        if (!JWT_ACCESS_TOKEN_SECRET)
          throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ACCESS_TOKEN_SECRET]`);
        const JWT_ISSUER = process.env.JWT_ISSUER;

        if (!JWT_ISSUER) throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ISSUER]`);

        const jwtSecretKey = JWT_ACCESS_TOKEN_SECRET;
        const jwtConfigOptions = {
          expiresIn: `${await getTokenExpTime()}m`,
          issuer: JWT_ISSUER
        };

        JWT.sign(jwtPayload, jwtSecretKey, jwtConfigOptions, (error, jwtToken: any) => {
          return error ? reject(error) : resolve(jwtToken);
        });
      } catch (error: any) {
        logBackendError(__filename, error?.message, null, null, null, error?.stack);
        if (error?.isJoi === true) error.status = 422;
        return reject(error);
      }
    })();
  });
};

const signRefreshToken = (payloadData: PayloadDataType): Promise<string> => {
  return new Promise((resolve, reject) => {
    (async (): Promise<void> => {
      try {
        const jwtPayload = { payloadData };
        const JWT_REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET;

        if (!JWT_REFRESH_TOKEN_SECRET)
          throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_REFRESH_TOKEN_SECRET]`);
        const JWT_ISSUER = process.env.JWT_ISSUER;

        if (!JWT_ISSUER) throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ISSUER]`);
        const jwtSecretKey = JWT_REFRESH_TOKEN_SECRET;
        const jwtConfigOptions = {
          expiresIn: parseInt(moment.duration(moment().endOf('day').diff(moment())).asSeconds().toString()),
          issuer: JWT_ISSUER
        };
        JWT.sign(jwtPayload, jwtSecretKey, jwtConfigOptions, async (error, jwtRefreshToken: any) => {
          if (error) {
            return reject(error);
          }
          resolve(jwtRefreshToken);
          // await redisClient
          //   .SET(payloadData.appUserId, jwtRefreshToken, {
          //     EX: parseInt(moment.duration(moment().endOf('day').diff(moment())).asSeconds().toString())
          //   })
          //   .then(() => {
          //     resolve(jwtRefreshToken);
          //   })
          //   .catch(error => {
          //     logBackendError(__filename, error?.message, null, null, null, error?.stack);
          //     return reject(httpErrors.InternalServerError());
          //   });
        });
      } catch (error: any) {
        logBackendError(__filename, error?.message, null, null, null, error?.stack);
        if (error?.isJoi === true) error.status = 422;
        return reject(error);
      }
    })();
  });
};

// const removeToken = async (payloadData: PayloadDataType): Promise<void> => {
//   try {
//     await redisClient
//       .DEL(payloadData.appUserId.toString())
//       .catch(error => {
//         throw httpErrors.InternalServerError(error);
//       })
//       .then(() => {
//         return;
//       });
//   } catch (error: any) {
//     logBackendError(__filename, error?.message, null, null, null, error?.stack);
//     if (error?.isJoi === true) error.status = 422;
//     throw httpErrors.InternalServerError(`${error?.message}`);
//   }
// };

export { verifyAccessToken, signAccessToken, signRefreshToken, verifyApplicationAccessToken };

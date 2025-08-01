// Common function definitions for the project
import httpErrors from 'http-errors';
// import * as bcrypt from 'bcrypt';
import moment from 'moment'
import mongoose from 'mongoose';
import _ from 'lodash';
import { LOGGER } from './init_winston';
import { appBackendErrorModel } from '../../models/app_logs/app_logs.model';

function sanitizeUrl(url: string): string {
  // Remove Parameters [:id,etc] => i.e (Gives raw route without any Parameters or Query String)
  return (url.split(':')[0].endsWith('/') ? url.split(':')[0] : url).toString().replace(/\/{2,}/g, '/');
}


async function logBackendError(
  scriptPath: string,
  errorMessage: string | null,
  routePath: string | null = null,
  clientAddress: string | null = null,
  miscellaneous: string | null = null,
  level?: string
): Promise<boolean> {
  try {
    if (mongoose.connection.readyState === 1) {
      const errorDetails = new appBackendErrorModel({
        level: level ? level : 'error',
        details: {
          clientAddress,
          errorMessage,
          miscellaneous,
          routePath,
          scriptPath,
        },
      });
      await errorDetails.save().catch((error) => {
        throw error;
      });
      return true;
    } else {
      LOGGER.info({
        level: level ? level : 'error',
        details: {
          clientAddress,
          errorMessage,
          miscellaneous,
          routePath,
          scriptPath
        }
      });
      return false;
    }
  } catch (error: any) {
    console.log(`Error while creating a log : ${error?.message}`);
    return false;
  }
}

const objectIdToString = (rawData: any): string => {
  try {
    // const executionType = typeof rawData;
    // rawData = Array.isArray(rawData) ? rawData : [rawData];
    // const typecastedData = _.map(rawData, data => data.toString());
    // return typecastedData[0];
    return rawData.toString();
  } catch (error: any) {
    throw httpErrors.UnprocessableEntity(`Unable to process request. Error : ${error?.message}`);

  }
};

async function getTokenExpTime(): Promise<number> {
  // const dayRemainingTime = parseInt(moment.duration(moment().endOf('day')).asMinutes().toString());
  try {
    const endOfDay: moment.Moment = moment().endOf('day');
    const dayRemainingTime: any = parseInt(moment.duration(endOfDay.diff(moment())).asMinutes().toString());

    const JWT_ACCESS_TOKEN_EXP_MINS = process.env.JWT_ACCESS_TOKEN_EXP_MINS;

    if (!JWT_ACCESS_TOKEN_EXP_MINS)
      throw httpErrors.UnprocessableEntity(`Unable to process Constant [JWT_ACCESS_TOKEN_EXP_MINS]`);

    // console.log(JWT_ACCESS_TOKEN_EXP_MINS, dayRemainingTime);
    return JWT_ACCESS_TOKEN_EXP_MINS < dayRemainingTime ? JWT_ACCESS_TOKEN_EXP_MINS : dayRemainingTime;

  } catch (error: any) {
    throw httpErrors.UnprocessableEntity(`Unable to process request. Error : ${error?.message}`);
  }

}

const isValidPassword = async (inputPassword: string, savedPassword: string): Promise<boolean> => {
  // return await bcrypt.compare(inputPassword, savedPassword);
  return inputPassword === savedPassword
}

export {
  sanitizeUrl,
  logBackendError,
  objectIdToString,
  getTokenExpTime,
  isValidPassword
};

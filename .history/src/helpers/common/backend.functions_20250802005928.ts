// Common function definitions for the project
import httpErrors from 'http-errors';
import moment from 'moment';
import mongoose from 'mongoose';
import _ from 'lodash';
import { LOGGER } from './init_winston';
import { appBackendErrorModel } from '../../models/app_logs/app_logs.model';

/**
 * Removes route params from a URL (e.g., ":id", query strings).
 */
function sanitizeUrl(url: string): string {
  return (url.split(':')[0].endsWith('/') ? url.split(':')[0] : url).toString().replace(/\/{2,}/g, '/');
}

/**
 * Logs backend errors to DB or fallback to Winston if DB is not connected.
 */
async function logBackendError(
  scriptPath: string,
  errorMessage: string | null,
  routePath: string | null = null,
  clientAddress: string | null = null,
  miscellaneous: string | null = null,
  level: string = 'error'
): Promise<boolean> {
  try {
    if (mongoose.connection.readyState === 1) {
      const errorDetails = new appBackendErrorModel({
        level,
        details: { scriptPath, routePath, clientAddress, errorMessage, miscellaneous },
      });
      await errorDetails.save();
      return true;
    } else {
      LOGGER.info({
        level,
        details: { scriptPath, routePath, clientAddress, errorMessage, miscellaneous },
      });
      return false;
    }
  } catch (error: any) {
    console.error(`Error while creating a log: ${error?.message}`);
    return false;
  }
}

/**
 * Converts a Mongoose ObjectId to string.
 */
const objectIdToString = (rawData: any): string => {
  try {
    return rawData.toString();
  } catch (error: any) {
    throw httpErrors.UnprocessableEntity(`Unable to process request. Error: ${error?.message}`);
  }
};

/**
 * Returns token expiration time (in minutes), limited to end of day.
 */
async function getTokenExpTime(): Promise<number> {
  try {
    const endOfDay = moment().endOf('day');
    const dayRemainingTime = parseInt(moment.duration(endOfDay.diff(moment())).asMinutes().toString());

    const JWT_ACCESS_TOKEN_EXP_MINS = parseInt(process.env.JWT_ACCESS_TOKEN_EXP_MINS || '');

    if (isNaN(JWT_ACCESS_TOKEN_EXP_MINS)) {
      throw httpErrors.UnprocessableEntity('Invalid or missing JWT_ACCESS_TOKEN_EXP_MINS env value');
    }

    return JWT_ACCESS_TOKEN_EXP_MINS < dayRemainingTime ? JWT_ACCESS_TOKEN_EXP_MINS : dayRemainingTime;
  } catch (error: any) {
    throw httpErrors.UnprocessableEntity(`Unable to process request. Error: ${error?.message}`);
  }
}

/**
 * Validates a password. Replace with bcrypt in production.
 */
const isValidPassword = async (inputPassword: string, savedPassword: string): Promise<boolean> => {
  // TODO: Replace with bcrypt.compare in production
  return inputPassword === savedPassword;
};

export {
  sanitizeUrl,
  logBackendError,
  objectIdToString,
  getTokenExpTime,
  isValidPassword,
};

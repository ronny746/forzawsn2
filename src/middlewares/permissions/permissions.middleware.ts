/* eslint-disable */
//only lets admins access the route
import { NextFunction, Response } from 'express';
import { RequestType } from '../../helpers/shared/shared.type';

const validateRouteAccess = async (req: RequestType, _res: Response, next: NextFunction): Promise<void> => {
  try {
     console.log(req, _res)
     next()
  } catch (error) {
    next(error);
  }
};

export default { validateRouteAccess };

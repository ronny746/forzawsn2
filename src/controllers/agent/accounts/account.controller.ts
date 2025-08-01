import { NextFunction, Request, Response } from 'express';
import { appUserModel } from '../../../models/agent/agent.model';
import httpErrors from 'http-errors';
import { joiUserAccount, CreateAppUserType } from '../../../helpers/joi/agent/account/index';

const createUserAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    //validate joi schema
    const appUserDetails: CreateAppUserType = await joiUserAccount.createAppUserSchema.validateAsync(req.body);

    //check if user exist in collection
    const doesAppUserExist = await appUserModel.findOne({
      email: appUserDetails.email,
      isDeleted: false
    });

    if (doesAppUserExist) throw httpErrors.Conflict(`User with email: [${appUserDetails.email}] already exist.`);

    //user basic details
    const app_Users = new appUserModel({
      //basic details of user
      username: appUserDetails.username,
      email: appUserDetails.email,
      password: appUserDetails.password
    });

    // save
    const storeAppUserBasicDetails = (
      await app_Users.save({}).catch((error: any) => {
        throw httpErrors.InternalServerError(error.message);
      })
    ).toObject();

    if (res.headersSent === false) {
      res.status(200).send({
        error: false,
        data: {
          appUser: {
            appUserId: storeAppUserBasicDetails._id,
            email: storeAppUserBasicDetails.email,
            password: storeAppUserBasicDetails.password
          },
          message: 'User created successfully.'
        }
      });
    }
  } catch (error: any) {
    next(error);
  }
};
export { createUserAccount };

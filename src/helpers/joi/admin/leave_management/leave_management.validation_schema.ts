import joi from 'joi';
//import moment from 'moment';
// import joiObjectId from 'joi-objectid';
// const objectId = joiObjectId(joi);

const addAppLeaveSchema = joi.object({
  FromDate: joi.string().trim().required(),
  ToDate: joi.string().trim().required(),
  LeaveTypeId: joi.string().trim().required(),
  Reason: joi.string().trim().required()
});

export {
  addAppLeaveSchema
};

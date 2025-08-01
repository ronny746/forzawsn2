import joi from 'joi';
//import moment from 'moment';
// import { joiPasswordExtendCore } from 'joi-password';
// import joiObjectId from 'joi-objectid';
// const objectId = joiObjectId(joi);

// const joiPassword = joi.extend(joiPasswordExtendCore);
const addAppUserSchema = joi.object({
  first_name: joi.string().trim().required(),
  last_name: joi.string().trim().allow(''),
  gender: joi.string().trim().required(),
  // dob: joi.string().trim().required(),
  designation: joi.string().trim().required(),
  // city_allowance: joi.string().trim().allow(''),
  // address1: joi.string().trim().required(),
  // address2: joi.string().trim().allow(''),
  // state: joi.string().trim().required(),
  // city: joi.string().trim().required(),
  // postcode: joi.string().trim().required(),
  service_area: joi.string().trim().required(),
  manager_empcode: joi.string().trim().required(),
  email: joi.string().trim().email().lowercase().required(),
  mobile_no: joi.string().trim().required(),
  emp_code: joi.string().trim().required(),
  // password: joiPassword
  //   .string()
  //   .trim()
  //   .min(8)
  //   .max(16)
  //   .minOfSpecialCharacters(1)
  //   .minOfLowercase(1)
  //   .minOfUppercase(1)
  //   .minOfNumeric(1)
  //   .noWhiteSpaces()
  //   .required(),
  password: joi.string().trim().required(),
  confirm_password: joi.string().trim().required(),
  department: joi.string().trim().required()
  // cl_leave: joi.string().trim().required(),
  // sl_leave: joi.string().trim().required(),
  // el_leave: joi.string().trim().required()
});

export {
  addAppUserSchema
};

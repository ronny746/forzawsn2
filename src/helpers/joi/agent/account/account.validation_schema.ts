import joi from 'joi';
//import moment from 'moment';
import { joiPasswordExtendCore } from 'joi-password';
import joiObjectId from 'joi-objectid';
const objectId = joiObjectId(joi);

const joiPassword = joi.extend(joiPasswordExtendCore);
const createAppUserSchema = joi.object({
  // directory: joi.string().trim(),
  username: joi.string().trim().required(),
  email: joi.string().trim().email().lowercase().required(),
  password: joiPassword
    .string()
    .trim()
    .min(8)
    .max(16)
    .minOfSpecialCharacters(1)
    .minOfLowercase(1)
    .minOfUppercase(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .required()
});

const getAppUserSchema = joi.object({
  appUserId: objectId().allow(null).default(null),
  appAccessGroupId: objectId().allow(null).default(null),
  isAdministrator: joi.boolean().default(false),
  search: joi.string().trim().allow(null).default(null),
  metaData: joi.object().keys({
    sortBy: joi.string().trim().allow(null).default(null),
    sortOn: joi.string().trim().allow(null).default(null),
    limit: joi.number().allow(null).default(null),
    offset: joi.number().allow(null).default(null),
    fields: joi.array().unique().allow(null).default(null)
  }),
  isDeleted: joi.boolean().default(false)
});

const getAllDetailSchema = joi.object({
  appUserId: joi.string().hex().length(24).required()
});

const updateAppUserSchema = joi.object({
  appUserId: objectId().required(),
  first_name: joi.string().trim(),
  last_name: joi.string().trim(),
  email: joi.string().trim().email().lowercase(),
  appAccessGroupId: objectId(),
  appReportingManagerId: objectId().allow(null).default(null),
  appDepartmentId: objectId(),
  appDesignationId: objectId(),
  employee_type: joi.string().trim(),
  //user company
  primary_email: joi.string().trim().email().lowercase(),
  company_email: joi.string().trim().email().lowercase().allow(null).default(null),
  gender: joi.string().trim(),
  contact_number: joi.number(),
  date_of_birth: joi.date(),
  date_of_joining: joi.date(),
  working_hours: joi.string().trim(),
  salary: joi.number(),
  marital_status: joi.string().trim(),

  //leave details
  total_leave: joi.number().required(),
  saturday_leave: joi
    .string()
    .trim()
    .allow(null)
    .valid('All Saturday Off', 'All Saturday Half Day', 'Any Two Saturday Half Day', 'Any Two Saturday Off')
    .default(null)
    .required(),

  //bank details
  bank_name: joi.string().trim(),
  account_number: joi.number(),
  ifsc_code: joi.string().trim(),
  name_as_per_bank: joi.string().trim(),
  //address
  address: joi.string().trim(),
  city: objectId().required(),
  state: objectId().required(),
  country: objectId().required(),
  pincode: joi.number(),
  landmark: joi.string().trim(),
  //contact
  number: joi.number(),
  relation: joi.string().trim(),
  isDeleted: joi.boolean().default(false)
});

const filterUserSchema = joi.object({
  appDesignationId: objectId().allow(null).default(null),
  appDepartmentId: objectId().allow(null).default(null),
  search: joi.string().trim().allow(null).default(null),
  metaData: joi.object().keys({
    sortBy: joi.string().trim().allow(null).default(null),
    sortOn: joi.string().trim().allow(null).default(null),
    limit: joi.number().allow(null).default(null),
    offset: joi.number().allow(null).default(null),
    fields: joi.array().unique().allow(null).default(null)
  })
});

const deleteAppUserSchema = joi.object({
  appUserId: objectId().required()
});
export {
  createAppUserSchema,
  filterUserSchema,
  deleteAppUserSchema,
  getAllDetailSchema,
  getAppUserSchema,
  updateAppUserSchema
};

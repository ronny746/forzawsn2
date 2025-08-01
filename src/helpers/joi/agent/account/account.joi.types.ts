import { MetaDataResponse } from '../../../../helpers/shared/shared.type';
import mongoose from 'mongoose';

export interface CreateAppUserType {
  //user basic details
  username: string;
  email: string;
  password: string;
}
export interface GetAppUserType {
  appUserId: mongoose.Types.ObjectId | null;
  appAccessGroupId: mongoose.Types.ObjectId | null;
  isAdministrator: boolean | null;
  search: string | null;
  metaData: MetaDataResponse;
}

export interface DeleteAppUserType {
  appUserId: mongoose.Types.ObjectId;
}

export interface FilterUserType {
  appDepartmentId: mongoose.Types.ObjectId;
  appDesignationId: mongoose.Types.ObjectId;
  metaData: MetaDataResponse;
  search: string | null;
}

export interface UpdateAppUserType {
  appUserId: mongoose.Types.ObjectId;
  //user basic details
  first_name: string;
  last_name: string;
  email: string;
  appAccessGroupId: mongoose.Types.ObjectId;
  appReportingManagerId: mongoose.Types.ObjectId;
  appDepartmentId: mongoose.Types.ObjectId;
  appDesignationId: mongoose.Types.ObjectId;
  employee_type: string;

  //user company details
  primary_email: string;
  company_email: string | null;
  gender: string;
  contact_number: string;
  date_of_birth: Date;
  date_of_joining: Date;
  working_hours: string;
  salary: number;
  marital_status: string;

  //user leave details
  total_leave: number,
  saturday_leave: string;

  //user bank details
  name_as_per_bank: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;

  //user address details
  address: string;
  city: mongoose.Types.ObjectId;
  state: mongoose.Types.ObjectId;
  country: mongoose.Types.ObjectId;
  pincode: string;
  landmark: string;

  //user contact details
  number: string;
  relation: string;

  isDeleted: boolean;
}

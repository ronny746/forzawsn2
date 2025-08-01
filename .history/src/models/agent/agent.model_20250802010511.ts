import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
// import { required } from 'joi';
import { AppUserType } from '../../helpers/joi/agent/index';
import { appConstantsModel } from '../../models/constants/constants.model';

const agentSchema = new mongoose.Schema(
  {
    //Basic Information of Employee
    username: {
      type: String,
      required: [true, 'must provide a first_name'],
      trim: true,
      maxLength: [30, 'username cannot be more than 30 characters']
    },
    email: {
      type: String,
      required: [true, 'must provide an email'],
      trim: true,
      lowercase: true,
      // eslint-disable-next-line no-useless-escape
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'please fill a valid email address']
    },
    password: {
      type: String,
      required: [true, 'must provide a password'],
      maxlength: [15, 'password cannot be more than 15 characters'],
      minlength: [3, 'password cannot be less then 3 characters']
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

agentSchema.pre<AppUserType>('save', async function (next) {
  try {
    // this.appAccessGroupId = this.appAccessGroupId;
    this.first_name = this.first_name?.replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase());
    this.last_name = this.last_name?.replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase());
    this.password = await bcrypt.hash(this.password ?? '', 10);
    next();
  } catch (error: any) {
    next(error);
  }
});

agentSchema.pre<AppUserType>('updateOne', async function (next) {
  try {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

agentSchema.methods.isValidPassword = async function (this: any, plainPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, this.password);
};

agentSchema.methods.getSignedJWTToken = async function (): Promise<string> {
  const mySecret: any = await appConstantsModel.findOne({
    name: 'JWT_SECRET_KEY',
    isDeleted: false
  });

  return jwt.sign(
    {
      id: this._id
    },
    mySecret,
    {
      
    }
  );
};

const appUserModel = mongoose.model('app_agents', agentSchema);

export { appUserModel };

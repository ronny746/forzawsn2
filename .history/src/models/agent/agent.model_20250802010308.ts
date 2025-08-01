import mongoose, { Schema, Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AppUserType } from '../../helpers/joi/agent';
import { appConstantsModel } from '../../models/constants/constants.model';

// Extend AppUserType if needed
export interface AgentDoc extends AppUserType, Document {
  isValidPassword(plainPassword: string): Promise<boolean>;
  getSignedJWTToken(): Promise<string>;
}

const agentSchema = new Schema<AgentDoc>(
  {
    username: {
      type: String,
      required: [true, 'must provide a first_name'],
      trim: true,
      maxlength: [30, 'username cannot be more than 30 characters']
    },
    email: {
      type: String,
      required: [true, 'must provide an email'],
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'must provide a password'],
      maxlength: [15, 'password cannot be more than 15 characters'],
      minlength: [3, 'password cannot be less than 3 characters']
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

// 🔐 Pre-save hook
agentSchema.pre<AgentDoc>('save', async function (next) {
  try {
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password ?? '', 10);
    }
    if (this.first_name)
      this.first_name = this.first_name.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    if (this.last_name)
      this.last_name = this.last_name.replace(/(^\w|\s\w)/g, m => m.toUpperCase());

    next();
  } catch (error: any) {
    next(error);
  }
});

// ✅ Instance method - compare password
agentSchema.methods.isValidPassword = async function (
  this: AgentDoc,
  plainPassword: string
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, this.password);
};

// 🔑 Instance method - get signed token
agentSchema.methods.getSignedJWTToken = async function (
  this: AgentDoc
): Promise<string> {
  const secretEntry = await appConstantsModel.findOne({
    name: 'JWT_SECRET_KEY',
    isDeleted: false
  });

  if (!secretEntry?.value) throw new Error('JWT_SECRET_KEY not found in constants');

  return jwt.sign(
    { id: this._id },
    secretEntry.value,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const appUserModel = mongoose.model<AgentDoc>('app_agents', agentSchema);

export { appUserModel };

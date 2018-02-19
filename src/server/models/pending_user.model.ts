import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import {AuthResponse, getToken} from '../sc2';
import Session from './session.model';

const pendingUserSchema = new mongoose.Schema({
  social_name: { type: String, required: true },
  last_digits_password: { type: String }, // last 4 digits of the last passwords for recovery reasons
  social_id: String,
  social_verified: { type: Boolean, default: false },
  social_email: String,
  social_provider: String,
  email: String,
  phone_number: String,
  has_created_account: { type: Boolean, default: false },
  steem_account: { type: String, default: '' },
  sms_verified: { type: Boolean, default: false },
  sms_verif_tries: { type: Number, default: 0 },
  email_verified: { type: Boolean, default: false },
  salt: { type: String },
  privacy: { type: Object, default: { accepted: false, date: '01.01.1800', ip: '127.0.0.1' } },
  tos: { type: Object, default: { accepted: false, date: '01.01.1800', ip: '127.0.0.1' } }
})


export interface UserSchemaDoc extends mongoose.Document {
}
  
export interface UserSchemaModel extends mongoose.Model<UserSchemaDoc> {
    get(id: any): any
}
  
pendingUserSchema.statics = {
  get(social_id) {
    return this.findOne({social_id})
      .exec()
      .then(user => { return user })
  }
};


export default mongoose.model<UserSchemaDoc, UserSchemaModel>('Pending_User', pendingUserSchema);
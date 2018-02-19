import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Moderator Schema
 */
const ModeratorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true
  },
  banned: Boolean,
  reviewed: Boolean,
  supermoderator: {
    type: Boolean,
    required: false
  },
  referrer: {
    type: String,
    required: false
  },
  apprentice: {
    type: Boolean,
    required: false
  },
  opted_out: {
    type: Boolean,
    required: false
  },
  total_paid_rewards_steem: Number,
  total_moderated: Number,
  percentage_total_rewards_moderators: Number,
});

export interface ModeratorSchemaDoc extends mongoose.Document {
  isBanned(): boolean;
  isReviewed(): boolean;
}

export interface ModeratorSchemaModel extends mongoose.Model<ModeratorSchemaDoc> {
  get(account: any): any;
  list(): any;
  top(): any;
  listAll(): any;
  listBeneficiaries(exclude?: any[]): any;
}

ModeratorSchema.methods = {
  isBanned() {
    return this.banned;
  },
  isReviewed() {
    return !this.banned && this.reviewed === true;
  }
}

ModeratorSchema.statics = {
  get(account) {
    return this.findOne({ account })
      .exec()
      .then((moderator) => {
        if (moderator) {
          return moderator;
        }
        return null;
      });
  },
  list() {
    return this.find({
      banned: {
        '$ne': true,
      },
      reviewed: {
        '$eq': true,
      },
    })
      .sort({ total_moderated: -1 })
      .exec();
  },
  top() {

    return this.find({
      banned: {
        '$ne': true,
      },
      reviewed: {
        '$eq': true,
      },
    })
      .sort({ "total_paid_rewards_steem": -1 })
      .exec();
  },
  listAll() {
    return this.find()
      .exec();
  },
  listBeneficiaries(exclude?: any[]) {
    let query: any = {
      total_moderated: {
        $gt: 0
      },
      banned: {
        $ne: true,
      },
      reviewed: {
        '$eq': true,
      },
    };

    if (exclude && exclude.length) {
      query = {
        ...query,
        account: {
          $nin: exclude
        }
      }
    }

    return this.find(query)
      .sort({ total_moderated: -1 })
      .exec();
  }
};

export default mongoose.model<ModeratorSchemaDoc, ModeratorSchemaModel>('Moderator', ModeratorSchema);

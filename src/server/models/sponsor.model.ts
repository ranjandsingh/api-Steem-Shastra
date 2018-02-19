import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Sponsor Schema
 */
const SponsorSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true,
  },
  json_metadata: {
    required: false,
  },
  total_paid_rewards: Number,
  total_paid_rewards_steem: Number,
  should_receive_rewards: Number,
  percentage_total_vesting_shares: Number,
  vesting_shares: {
    type: Number,
    required: true,
  },
  opted_out: Boolean,
  is_witness: Boolean,
  projects: {
    type: Array,
    required: false,
  },
});

export interface SponsorSchemaDoc extends mongoose.Document {
}

export interface SponsorSchemaModel extends mongoose.Model<SponsorSchemaDoc> {
  get(account: any): any;
  list(): any;
  listAll(): any;
  listBeneficiaries(exclude?: any[]): any;
}

SponsorSchema.statics = {
  get(account) {
    return this.findOne({ account })
      .exec()
      .then((sponsor) => {
        if (sponsor) {
          return sponsor;
        }
        return null;
      });
  },
  list() {
    return this.find({
      vesting_shares: {
        $gt: 0
      },
      account: {
        $ne: 'utopian-io'
      },
    })
      .sort({ vesting_shares: -1 })
      .exec();
  },
  listAll() {
    return this.find()
      .exec();
  },
  listBeneficiaries(exclude?: any[]) {
    let query: any = {
      vesting_shares: {
        $gt: 0
      },
      account: {
        $ne: 'utopian-io'
      },
      opted_out: {
        $ne: true
      }
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
      .sort({ vesting_shares: -1 })
      .exec();
  }
};

export default mongoose.model<SponsorSchemaDoc, SponsorSchemaModel>('Sponsor', SponsorSchema);

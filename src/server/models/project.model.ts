import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Sponsor Schema
 */

const SteemAccount = {
  account: {
    type: String,
    required: true,
    unique: true,
  },
  refresh_token: {
    type: String,
    required: false,
  }
};
const RejectStatus = {
  status: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    required: false,
  }
};
const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  external_id: {
    type: Number,
    required: true,
  },
  sponsorship: {
    enabled: Boolean,
    rejected: RejectStatus,
  },
  steem_account: SteemAccount,
  sponsors: []
});

export interface ProjectSchemaDoc extends mongoose.Document {
}

export interface ProjectSchemaModel extends mongoose.Model<ProjectSchemaDoc> {
  get(platform: any, external_id: any): any;
  list(): any;
}

ProjectSchema.statics = {
  get(platform, external_id) {
    return this.findOne({ platform, external_id })
      .exec()
      .then((project) => {
        if (project) {
          return project;
        }
        if (!project) {
          const err = new APIError('No project exists!', httpStatus.NOT_FOUND);
          return Promise.reject(err);
        }
      });
  },
  list() {
    return this.find({})
      .exec();
  },
};

export default mongoose.model<ProjectSchemaDoc, ProjectSchemaModel>('Project', ProjectSchema);

import * as mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: 'User'
  },
  expiry: {
    type: Date,
    required: true
  }
});

export interface SessionSchemaDoc extends mongoose.Document {
}

export interface SessionSchemaModel extends mongoose.Model<SessionSchemaDoc> {
  get(session: string): any;
}

SessionSchema.statics = {
  async get(session: string) {
    const ses = await this.findOne({ session }).populate('user').exec();
    if (!ses) {
      return null;
    }
    if (ses.expiry.getTime() < Date.now()) {
      await ses.remove();
      return null;
    }

    return ses.user;
  }
};

export default mongoose.model<SessionSchemaDoc, SessionSchemaModel>('Session', SessionSchema);

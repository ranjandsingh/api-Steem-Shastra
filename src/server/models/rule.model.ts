import * as mongoose from 'mongoose';

/**
 * Rule Schema
 */


const RuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true,
  },
  category_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
  },
  parent_category: {
    type: String,
    required: false
  }
});

export interface RuleSchemaDoc extends mongoose.Document {
}

export interface RuleSchemaModel extends mongoose.Model<RuleSchemaDoc> {
  list(category: any, parent_category: any): any;
}

RuleSchema.statics = {
  list(category, parent_category) {
    if (category) {
      return this.find({category: category})
        .exec();
    }
    if (parent_category) {
      return this.find({parent_category:parent_category})
        .exec();
    }
    return this.find({})
      .exec();
  },
};

export default mongoose.model<RuleSchemaDoc, RuleSchemaModel>('Rule', RuleSchema);

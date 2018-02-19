import * as mongoose from 'mongoose';

/**
 * FAQ Schema
 */


const FaqSchema = new mongoose.Schema({
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

export interface FaqSchemaDoc extends mongoose.Document {
}

export interface FaqSchemaModel extends mongoose.Model<FaqSchemaDoc> {
  list(category: any, parent_category: any): any;
}

FaqSchema.statics = {
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

export default mongoose.model<FaqSchemaDoc, FaqSchemaModel>('Faq', FaqSchema);

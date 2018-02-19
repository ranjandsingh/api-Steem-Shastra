import * as mongoose from 'mongoose';
import * as httpStatus from 'http-status';
import APIError from '../helpers/APIError';

/**
 * Stats Schema
 */

const categoriesStats = {
  total_posts: Number,
  total_likes: Number,
  average_likes_per_post: Number,
  total_paid: Number,
  total_paid_authors: Number,
  average_paid_authors: Number,
  total_paid_curators: Number,
  average_paid_curators: Number,
  total_posts_length: Number,
  average_posts_length: Number,
  total_images: Number,
  average_images_per_post: Number,
  total_links: Number,
  average_links_per_post: Number,
  total_tags: Number,
  average_tags_per_post: Number,
};

const StatsSchema = new mongoose.Schema({
  total_paid_rewards: Number,
  total_pending_rewards: Number,
  total_paid_authors: Number,
  total_paid_curators: Number,
  stats_total_moderated: Number,
  stats_paid_moderators_last_check: String,
  stats_paid_sponsors_last_check: String,
  stats_total_paid_last_post_date: String,
  stats_total_pending_last_post_date: String,
  stats_moderator_shares_last_check: String,
  stats_sponsors_shares_last_check: String,
  stats_total_paid_last_check: String,
  stats_total_pending_last_check: String,
  stats_last_updated_posts: String,
  stats_categories_last_check: String,
  last_limit_comment_benefactor: Number,
  bot_is_voting: Boolean,
  categories: {
    ideas: categoriesStats,
    'sub-projects': categoriesStats,
    development: categoriesStats,
    'bug-hunting': categoriesStats,
    translations: categoriesStats,
    graphics: categoriesStats,
    documentation: categoriesStats,
    copywriting: categoriesStats,
    'video-tutorials': categoriesStats,
    tutorials: categoriesStats,
    analysis: categoriesStats,
    social: categoriesStats,
    'task-ideas': categoriesStats,
    'task-development': categoriesStats,
    'task-bug-hunting': categoriesStats,
    'task-translations': categoriesStats,
    'task-graphics': categoriesStats,
    'task-documentation': categoriesStats,
    'task-analysis': categoriesStats,
    'task-social': categoriesStats,
    blog: categoriesStats,
  },
});

export interface StatsSchemaDoc extends mongoose.Document {
}

export interface StatsSchemaModel extends mongoose.Model<StatsSchemaDoc> {
  get(): any;
}

StatsSchema.statics = {
  get() {
    return this.findOne()
      .exec()
      .then((stats) => {
        if (stats) {
          return stats;
        }
        const err = new APIError('Cannot retrieve stats', httpStatus.NOT_FOUND);
        return Promise.reject(err);
      });
  },
};

export default mongoose.model<StatsSchemaDoc, StatsSchemaModel>('Stats', StatsSchema);

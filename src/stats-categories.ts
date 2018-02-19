import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import { calculatePayout } from './server/steemitHelpers';
import config from './config/config';
import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get()
    .then(stats => {
      // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
      const lastCheck = stats.stats_categories_last_check;
      const now = new Date().toISOString();
      const query = {
        'json_metadata.moderator.reviewed': true,
      };

      Post
        .countAll({ query })
        .then(count => {
          Post
            .list({ skip: 0, limit: count, query })
            .then(posts => {
              if(posts.length > 0) {
                const categories = {};

                posts.forEach((post, index) => {
                  const categoryType = post.json_metadata.type;

                  if (!categories[categoryType]) {
                    categories[categoryType] = {
                      total_posts: 0,
                      total_likes: 0,
                      average_likes_per_post: 0,
                      total_paid: 0,
                      total_paid_authors: 0,
                      average_paid_authors: 0,
                      total_paid_curators: 0,
                      average_paid_curators: 0,
                      total_posts_length: 0,
                      average_posts_length: 0,
                      total_images: 0,
                      average_images_per_post: 0,
                      total_links: 0,
                      average_links_per_post: 0,
                      total_tags: 0,
                      average_tags_per_post: 0,
                    }
                  }

                  const categoryObj = categories[categoryType];
                  const isCashedout = post.cashout_time === '1969-12-31T23:59:59';
                  const payoutDetails = isCashedout ? calculatePayout(post) : null;
                  const authorPayouts = isCashedout ? (payoutDetails.authorPayouts || 0) : 0;
                  const curatorPayouts = isCashedout ? (payoutDetails.curatorPayouts || 0) : 0;
                  const images = post.json_metadata.image ? post.json_metadata.image.length : 0;
                  const links = post.json_metadata.links ? post.json_metadata.links.length : 0;
                  const tags = post.json_metadata.tags.length;

                  categoryObj.total_posts = categoryObj.total_posts + 1;
                  categoryObj.total_likes = categoryObj.total_likes + post.active_votes.length;
                  categoryObj.average_likes_per_post = categoryObj.total_likes / categoryObj.total_posts;
                  categoryObj.total_paid = categoryObj.total_paid + authorPayouts + curatorPayouts;
                  categoryObj.total_paid_authors = categoryObj.total_paid_authors + authorPayouts;
                  // not counting this post in the average if not yet cashed out.
                  categoryObj.average_paid_authors = categoryObj.total_paid_authors / (isCashedout ? categoryObj.total_posts : categoryObj.total_posts - 1 || 1);
                  categoryObj.total_paid_curators = categoryObj.total_paid_curators + curatorPayouts;
                  // not counting this post in the average if not yet cashed out.
                  categoryObj.average_paid_curators = categoryObj.total_paid_curators / (isCashedout ? categoryObj.total_posts : categoryObj.total_posts - 1 || 1);
                  categoryObj.total_posts_length = categoryObj.total_posts_length + post.body.length;
                  categoryObj.average_posts_length = categoryObj.total_posts_length / categoryObj.total_posts;
                  categoryObj.total_images = categoryObj.total_images + images;
                  categoryObj.average_images_per_post = categoryObj.total_images / categoryObj.total_posts;
                  categoryObj.total_links = categoryObj.total_links + links;
                  categoryObj.average_links_per_post = categoryObj.total_links / categoryObj.total_posts;
                  categoryObj.total_tags = categoryObj.total_tags + tags;
                  categoryObj.average_tags_per_post = categoryObj.total_tags / categoryObj.total_posts;
                });

                stats.categories = categories;
                stats.stats_categories_last_check = now;

                stats.save().then(savedStats => {
                  process.exit(0);
                  conn.close();
                }).catch(e => {
                  console.log("ERROR");
                  console.log(e);
                })
              }
            });
        });
    }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});

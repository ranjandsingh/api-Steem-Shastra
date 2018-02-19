import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import { calculatePayout } from './server/steemitHelpers';
import config from './config/config';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get().then(stats => {
    const lastPostDate = stats.stats_total_paid_last_post_date;
    const paidRewardsDate = '1969-12-31T23:59:59';
    const limit = 500;
    const query = {
      cashout_time:
          {
            $eq: paidRewardsDate
          },
      created: {
        $gt: lastPostDate
      }
    };
    const sort = { created: 1};

    Post
        .list({ skip: 0, limit, query, sort })
        .then(posts => {
          if(posts.length > 0) {
            let total_paid_rewards = stats.total_paid_rewards;
            let total_paid_authors = stats.total_paid_authors;
            let total_paid_curators = stats.total_paid_curators;
            let stats_total_paid_last_post_date = null;

            posts.forEach(post => {
              const payoutDetails = calculatePayout(post);
              const authorPayouts = payoutDetails.authorPayouts || 0;
              const curatorPayouts = payoutDetails.curatorPayouts || 0;
              const sumPayouts = authorPayouts + curatorPayouts;

              total_paid_rewards = total_paid_rewards + sumPayouts;
              total_paid_authors = total_paid_authors + authorPayouts;
              total_paid_curators = total_paid_curators + curatorPayouts;

              stats_total_paid_last_post_date = post.created;
            });

            stats.total_paid_rewards = total_paid_rewards;
            stats.total_paid_authors = total_paid_authors;
            stats.total_paid_curators = total_paid_curators;
            stats.stats_total_paid_last_check = new Date().toISOString();
            stats.stats_total_paid_last_post_date = stats_total_paid_last_post_date;

            stats.save().then(savedStats => {
              conn.close();
              process.exit(0);
            })
          } else {
            console.log("NO POSTS");
            conn.close();
            process.exit(0);
          }
        });
  }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});

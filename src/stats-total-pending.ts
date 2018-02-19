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
    const lastPostDate = stats.stats_total_pending_last_post_date;
    const paidRewardsDate = '1969-12-31T23:59:59';
    const query = {
      cashout_time:
        {
          $gt: paidRewardsDate
        },
      created: {
        $gt: lastPostDate
      }
    };
    const limit = 500;
    const sort = { created: 1};

    Post
        .list({ skip: 0, limit, query, sort })
        .then(posts => {
          if(posts.length > 0) {
            let total_pending_rewards = stats.total_pending_rewards;
            let stats_total_pending_last_post_date = null;

            posts.forEach(post => {
              const payoutDetails = calculatePayout(post);
              const potentialPayout = payoutDetails.potentialPayout || 0;
              total_pending_rewards = total_pending_rewards + potentialPayout;

              stats_total_pending_last_post_date = post.created;
            });

            stats.total_pending_rewards = total_pending_rewards;
            stats.stats_total_pending_last_check = new Date().toISOString();
            stats.stats_total_pending_last_post_date = stats_total_pending_last_post_date;

            stats.save().then(savedStats => {
              conn.close();
              process.exit(0);
            });
          } else {
            console.log("NO POSTS");
            conn.close();
            process.exit(0);
          }
        })
  }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});

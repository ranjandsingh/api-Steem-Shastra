import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as R from 'ramda';
import Post from './server/models/post.model';
import Moderator from './server/models/moderator.model';
import Sponsor from './server/models/sponsor.model';
import Stats from './server/models/stats.model';
import { calculatePayout } from './server/steemitHelpers';
import config from './config/config';

// TODO to be removed once the new beneficiary system is in place and no posts are pending payout having the old beneficiary system

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  Stats.get()
    .then(stats => {
      // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
      const lastCheck = stats.stats_paid_moderators_last_check;
      const now = new Date().toISOString();
      const paidRewardsDate = '1969-12-31T23:59:59';

      Moderator.list()
        .then(moderators => {
          if (moderators.length > 0) {
            moderators.forEach((moderator, moderatorsIndex) => {

              setTimeout(function() {

                let total_paid_rewards = 0;

                const query = {
                  beneficiaries: {
                    $elemMatch: {
                      account: moderator.account
                    }
                  },
                  cashout_time:
                    {
                      $eq: paidRewardsDate
                    },
                };
                Post
                  .countAll({ query })
                  .then(count => {

                    Post
                      .list({ skip: 0, limit: count, query })
                      .then(posts => {

                        if(posts.length > 0) {
                          posts.forEach((post, postsIndex) => {
                            const beneficiary = R.find(R.propEq('account', moderator.account))(post.beneficiaries);
                            const payoutDetails = calculatePayout(post);
                            const authorPayouts = payoutDetails.authorPayouts || 0;
                            const payoutModerator = (authorPayouts * (beneficiary.weight / 100)) / 100;

                            total_paid_rewards = total_paid_rewards + payoutModerator;
                          });
                        }

                        Sponsor
                          .get(moderator.account)
                          .then(sponsor => {
                            if (sponsor) {
                              moderator.total_paid_rewards = sponsor.total_paid_rewards > total_paid_rewards ? sponsor.total_paid_rewards : total_paid_rewards;
                            } else {
                              moderator.total_paid_rewards = total_paid_rewards;
                            }
                            moderator.save().then(savedModerator => {
                              if ((moderatorsIndex + 1) === moderators.length) {
                                stats.stats_paid_moderators_last_check = now;
                                stats.save().then(() => {
                                  conn.close();
                                  process.exit(0);
                                });
                              }
                            });
                          });

                      })
                  });
              }, moderatorsIndex * 30000);
            });
          }
        });
    }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});

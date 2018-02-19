import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Moderator from './server/models/moderator.model';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function () {
  Stats.get()
    .then(stats => {
      // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
      const lastCheck = stats.stats_moderator_shares_last_check;
      const now = new Date().toISOString();
      const dedicatedPercentageModerators = 5;

      const query = {
        moderator: {
          $exists: true
        }
      };

      Post
        .countAll({query})
        .then(countPosts => {
          Moderator.list()
            .then(moderators => {
              if (moderators.length > 0) {
                moderators.forEach((moderator, moderatorsIndex) => {
                  setTimeout(function(){
                    const queryTotalModerated = {
                      moderator: moderator.account,
                    };

                    Post
                      .countAll({query: queryTotalModerated})
                      .then(currentModerated => {
                        const percentageTotalShares = (currentModerated / countPosts) * 100;
                        const total_paid_authors = stats.total_paid_authors;
                        const totalDedicatedModerators = (total_paid_authors * dedicatedPercentageModerators) / 100;
                        const shouldHaveReceivedRewards = (percentageTotalShares * totalDedicatedModerators) / 100;
                        //const shouldHaveReceivedRewards = moderator.should_receive_rewards;
                        const total_paid_rewards = moderator.total_paid_rewards;

                        if (shouldHaveReceivedRewards >= total_paid_rewards) {
                          const mustReceiveRewards = shouldHaveReceivedRewards - total_paid_rewards;
                          moderator.should_receive_rewards = mustReceiveRewards;
                        }

                        if (shouldHaveReceivedRewards <= total_paid_rewards) {
                          const waitForNextRewards = 0;
                          moderator.should_receive_rewards = waitForNextRewards;
                        }

                        moderator.total_moderated = currentModerated;
                        moderator.percentage_total_rewards_moderators = percentageTotalShares;

                        moderator.save(savedModerator => {
                          if ((moderatorsIndex + 1) === moderators.length) {
                            stats.stats_moderator_shares_last_check = now;
                            stats.save().then(() => {
                              conn.close();
                              process.exit(0);
                            });
                          }
                        });
                      });
                  }, moderatorsIndex * 3000)
                });
              }
            });
        });
    }).catch(e => {
    console.log("ERROR STATS", e);
    conn.close();
    process.exit(0);
  });
});

import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Moderator from './server/models/moderator.model';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';
import * as R from 'ramda';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function () {
    Stats.get()
        .then(stats => {
            let stats_total_moderated = 0;

            const calcShare = () => {
                Moderator.listBeneficiaries().then(moderators => {
                    moderators.forEach((moderator, indexMods) => {
                        moderator.percentage_total_rewards_moderators = (moderator.total_moderated / stats_total_moderated) * 100;

                        moderator.save().then(() => {
                            if (indexMods + 1 === moderators.length) {
                                stats.stats_total_moderated = stats_total_moderated;
                                stats.stats_moderator_shares_last_check = new Date().toISOString();
                                stats.save().then(() => {
                                    console.log("DONE");
                                    conn.close();
                                    process.exit(0);
                                });
                            }
                        });
                    });
                });
            };

            Moderator.listAll().then(moderators => {
                moderators.forEach((moderator, indexMods) => {
                    const query = {
                        'json_metadata.moderator.account': moderator.account,
                    };

                    Post.count(query).then(currentModerated => {
                        console.log(currentModerated);
                        console.log(moderator.account);
                        stats_total_moderated = stats_total_moderated + currentModerated;
                        moderator.total_moderated = currentModerated;

                        moderator.save().then(() => {
                            if (indexMods + 1 === moderators.length) {
                                calcShare();
                            }
                        });
                    });
                });
            });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});

import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as R from 'ramda';
import Post from './server/models/post.model';
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
            const lastCheck = stats.stats_paid_sponsors_last_check;
            const now = new Date().toISOString();
            const paidRewardsDate = '1969-12-31T23:59:59';
            const sponsorsDedicatedWeight = 2000;

            Sponsor.list()
                .then(sponsors => {
                    if (sponsors.length > 0) {
                        sponsors.forEach((sponsor, sponsorsIndex) => {
                            setTimeout(function() {

                                const query = {
                                    beneficiaries: {
                                        $elemMatch: {
                                            account: sponsor.account,
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
                                                let total_paid_rewards = 0;

                                                if(posts.length > 0) {
                                                    posts.forEach(post => {
                                                        //let beneficiary = {weight: 0};
                                                        const payoutDetails = calculatePayout(post);
                                                        const authorPayouts = payoutDetails.authorPayouts || 0;
                                                        let payoutSponsor = 0;
                                                        if(sponsor.opted_out) {
                                                            const beneficiary = R.find(R.propEq('account', 'utopian-io'))(post.beneficiaries) || {weight: 0};
                                                            const beneficiaryWeight = parseInt(beneficiary.weight);
                                                            const assignedUtopianWeight = Math.round((sponsorsDedicatedWeight * sponsor.percentage_total_vesting_shares ) / 100);
                                                            const calcWeight = assignedUtopianWeight >= beneficiaryWeight ? beneficiaryWeight : assignedUtopianWeight;
                                                            //const percentageUtopianAssignedWeight = assignedUtopianWeight / beneficiaryWeight * 100;
                                                            payoutSponsor = (authorPayouts * (calcWeight / 100)) / 100;
                                                        } else {
                                                            const beneficiary = R.find(R.propEq('account', sponsor.account))(post.beneficiaries) || {weight: 0};
                                                            payoutSponsor = (authorPayouts * (parseInt(beneficiary.weight) / 100)) / 100;
                                                        }

                                                        total_paid_rewards = total_paid_rewards + payoutSponsor;
                                                    });
                                                }

                                                sponsor.total_paid_rewards = total_paid_rewards;

                                                sponsor.save().then(savedSponsor => {
                                                    if ((sponsorsIndex + 1) === sponsors.length) {
                                                        stats.stats_paid_sponsors_last_check = now;
                                                        stats.save().then(() => {
                                                            conn.close();
                                                            process.exit(0);
                                                        });
                                                    }
                                                });
                                            })
                                    });
                            }, sponsorsIndex * 30000);
                        });
                    }
                });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});

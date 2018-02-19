import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as R from 'ramda';
import Sponsor from './server/models/sponsor.model';
import Stats from './server/models/stats.model';
import config from './config/config';
import steemApi from './server/steemAPI';
import { calculatePayout } from './server/steemitHelpers';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
    Stats.get()
        .then(stats => {
            // @TODO should be used to increment the stats based on last check, instead then rechecking from the start
            const lastCheck = stats.stats_sponsors_shares_last_check;
            const paidRewardsDate = '1969-12-31T23:59:59';
            const now = new Date().toISOString();
            const dedicatedPercentageSponsors = 20;

            Sponsor.listAll()
                .then(sponsors => {
                    if (sponsors.length > 0) {
                        let total_vesting_shares = 0;

                        sponsors.forEach(sponsor => total_vesting_shares = total_vesting_shares + sponsor.vesting_shares);

                        sponsors.forEach((sponsor, sponsorsIndex) => {
                            setTimeout(function(){
                                steemApi.getVestingDelegations(sponsor.account, -1, 1000, function(err, delegations) {
                                    const isDelegating = R.find(R.propEq('delegatee', 'utopian-io'))(delegations);
                                    let currentVestingShares = isDelegating ? parseInt(isDelegating.vesting_shares) : 0;
                                    let delegationDate = isDelegating ? isDelegating.min_delegation_time : new Date().toISOString();

                                    if(sponsor.projects && sponsor.projects.length) {
                                        sponsor.projects.forEach(project => {
                                            const delegatingToProject = R.find(R.propEq('delegatee', project.steem_account))(delegations);
                                            if(delegatingToProject) {
                                                currentVestingShares = currentVestingShares + parseInt(delegatingToProject.vesting_shares);
                                                if (delegationDate > delegatingToProject.min_delegation_time) {
                                                    delegationDate = delegatingToProject.min_delegation_time;
                                                }
                                            }
                                        });
                                    }

                                    steemApi.getWitnessByAccount(sponsor.account, function(witnessErr, witnessRes) {
                                        const isWitness = witnessRes && witnessRes.owner ? true : false;
                                        const percentageTotalShares = (currentVestingShares / total_vesting_shares) * 100;

                                        if (currentVestingShares > 0) {
                                            //const delegationDate = isDelegating.min_delegation_time;
                                            const query = {
                                                created:
                                                    {
                                                        $gte: delegationDate
                                                    },
                                                cashout_time:
                                                    {
                                                        $eq: paidRewardsDate
                                                    }
                                            };
                                            sponsor.vesting_shares = currentVestingShares;
                                            sponsor.percentage_total_vesting_shares = percentageTotalShares;
                                            sponsor.is_witness = isWitness;

                                            sponsor.save(savedSponsor => {
                                                if ((sponsorsIndex + 1) === sponsors.length) {
                                                    stats.stats_sponsors_shares_last_check = now;
                                                    stats.save().then(() => {
                                                        conn.close();
                                                        process.exit(0);
                                                    });
                                                }
                                            });
                                        } else {
                                            sponsor.vesting_shares = 0;
                                            sponsor.percentage_total_vesting_shares = 0;
                                            sponsor.is_witness = isWitness;

                                            sponsor.save(savedSponsor => {
                                                if ((sponsorsIndex + 1) === sponsors.length) {
                                                    stats.stats_sponsors_shares_last_check = now;
                                                    stats.save().then(() => {
                                                        conn.close();
                                                        process.exit(0);
                                                    });
                                                }
                                            });
                                        }
                                    });
                                });
                            }, sponsorsIndex * 3000);
                        })
                    }
                });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});

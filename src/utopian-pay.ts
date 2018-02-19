import steemAPI, { formatter, broadcast } from './server/steemAPI';
import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import Sponsor from './server/models/sponsor.model';
import Moderator from './server/models/moderator.model';
import Post from './server/models/post.model';
import Stats from './server/models/stats.model';
import config from './config/config';
import * as R from 'ramda';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
    Stats.get()
        .then(stats => {
            const payAccount = 'utopian.pay';
            const TEST = process.env.TEST === 'false' ? false : true;
            const WIF = process.env.WIF;
            const percentSponsors = 80;
            const percentModerators = 20;
            const fromStats = stats.last_limit_comment_benefactor;
            const limit = 100;
            const categoriesPoints = {
                ideas: 1.5,
                development: 3,
                'bug-hunting': 2,
                translations: 3.5,
                graphics: 2,
                documentation: 2,
                copywriting: 2,
                'video-tutorials': 3,
                tutorials: 3,
                analysis: 2,
                social: 1,
                'task-ideas': 1,
                'task-development': 1,
                'task-bug-hunting': 1,
                'task-translations': 1,
                'task-graphics': 1,
                'task-documentation': 1,
                'task-analysis': 1,
                'task-social': 1,
                blog: 2,
            };

            let totalVests = 0;

            const getHistory = (from, callback) => {
                steemAPI.getAccountHistory(payAccount, from, limit, function(err, result) {
                    if (err) {
                        console.log("FAILED TO RETRIEVE COMMENT BENEFACTOR REWARDS");
                        conn.close();
                        process.exit();
                    }
                    callback(result);
                });
            };
            const parseOperations = (from, done) => {
                const newLimit = from + limit;
                let lastParsedOperation = from;

                getHistory(newLimit, (results) => {
                    if (results.length && results[results.length - 1][0] > lastParsedOperation) {
                        results.forEach((result) => {
                            if (result[1] && result[1].op && result[1].op[0] === 'comment_benefactor_reward' && result[0] > from) {
                                const commentBenefactor = result[1].op[1];
                                const benefactorVests = parseFloat(commentBenefactor.reward.replace(' VESTS', ''));
                                console.log("NOW PARSING COMMENT BENEFACTOR", result[0]);

                                totalVests = totalVests + benefactorVests;
                            }
                            lastParsedOperation = result[0];
                        });
                        return parseOperations(lastParsedOperation, done);
                    }
                    return done(lastParsedOperation);
                });
            };

            console.log("STARTING BY LAST OPERATION PARSED", fromStats);

            parseOperations(fromStats, (lastParsedOperation) => {
                // saving the last parsed operation
                stats.last_limit_comment_benefactor = !TEST ? lastParsedOperation : fromStats;

                stats.save().then(() => {
                    console.log("SAVED LAST OPERATION PARSED", lastParsedOperation);
                    console.log("TOTAL VESTS CALCULATED", totalVests);

                    if (totalVests === 0) {
                        console.log("NOTHING TO PAY");
                        conn.close();
                        process.exit();
                    }

                    steemAPI.getDynamicGlobalProperties(function(err, props) {
                        if (err) {
                            console.log("FAILED TO RETRIEVE STEEM VALUE");
                            conn.close();
                            process.exit();
                        }

                        const totalSteem = formatter.vestToSteem(totalVests, props.total_vesting_shares, props.total_vesting_fund_steem);
                        let totalPaidSponsors = 0;
                        let totalPaidModerators = 0;
                        let supervisors = Array();

                        console.log("TOTAL STEEM CALCULATED FROM VESTS", totalSteem);

                        const paySponsors = (done) => {
                            Sponsor.listBeneficiaries()
                                .then(sponsors => {
                                    sponsors.forEach((sponsor, sponsorIndex) => {
                                        const sponsorShares = sponsor.percentage_total_vesting_shares;
                                        const sponsorPercent = sponsorShares * percentSponsors / 100;
                                        const sponsorPayout = (sponsorPercent * totalSteem / 100) > 0.001 ? (sponsorPercent * totalSteem / 100) : 0.001;

                                        const finalSponsorPayout = `${sponsorPayout.toFixed(3)} STEEM`;
                                        const memoSponsor = `Hello ${sponsor.account}, here is your weekly payout as a Sponsor.`;

                                        totalPaidSponsors = totalPaidSponsors + sponsorPayout;

                                        console.log(`> $$ PAYOUT SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                        if (!TEST) {
                                            setTimeout(function() {
                                                broadcast.transfer(WIF, payAccount, sponsor.account, finalSponsorPayout, memoSponsor, function(err, result) {
                                                    if (err) {
                                                        console.log("!----------COULD NOT PAY SPONSOR----------!", sponsor.account);
                                                        console.log(err);
                                                        return;
                                                    }

                                                    console.log(`>-- $$ PAID SPONSOR ${sponsor.account}: ${finalSponsorPayout}`);

                                                    sponsor.total_paid_rewards_steem = (sponsor.total_paid_rewards_steem || 0) + sponsorPayout;
                                                    sponsor.save().then(() => {
                                                        if (sponsorIndex + 1 === sponsors.length) {
                                                            console.log("-------------------------------------");
                                                            console.log("SPONSORS PAID SUCCESSFULLY: ", totalPaidSponsors);
                                                            console.log("-------------------------------------");

                                                            done();
                                                        }
                                                    });
                                                });
                                            }, 30000 * sponsorIndex);
                                        }

                                        if (TEST && sponsorIndex + 1 === sponsors.length) {
                                            console.log("-------------------------------------");
                                            console.log("SPONSORS PAID SUCCESSFULLY: ", totalPaidSponsors);
                                            console.log("-------------------------------------");

                                            done();
                                        }
                                    });
                                }).catch(e => {
                                console.log("FAILED TO RETRIEVE SPONSORS", e);
                                conn.close();
                                process.exit();
                            });
                        };
                        const payModerators = (done) => {
                            const proceedPayMods = (moderators, totalPoints) => {
                                moderators.forEach((moderator, moderatorIndex) => {
                                    const moderatorShares = (moderator.points / totalPoints) * 100;
                                    const moderatorPercent = moderatorShares * percentModerators / 100;
                                    const moderatorPayout = (moderatorPercent * totalSteem / 100) >= 0.001 ? (moderatorPercent * totalSteem / 100) : 0.001;

                                    const finalModeratorPayout = `${moderatorPayout.toFixed(3)} STEEM`;
                                    const memoModerator = `Hello ${moderator.account}, here is your weekly payout as a Moderator.`;

                                    totalPaidModerators = totalPaidModerators + moderatorPayout;

                                    console.log(`> $$ PAYOUT MODERATOR ${moderator.account}: ${finalModeratorPayout}`);

                                    // every moderator has a supervisor
                                    // supervisors get 20% of the shares of their own moderators
                                    // these shares are not removed by the moderator but paid by the system
                                    if (moderator.referrer) {
                                        const sup = R.find(R.propEq('account', moderator.referrer))(supervisors);

                                        if (sup) {
                                            supervisors = [
                                                ...supervisors.filter(supervisor => supervisor.account !== sup.account),
                                                {
                                                    account: sup.account,
                                                    supervisor_moderators_shares: sup.supervisor_moderators_shares + moderatorShares
                                                }
                                            ]
                                        } else {
                                            supervisors.push({
                                                account: moderator.referrer,
                                                supervisor_moderators_shares: moderatorShares,
                                            })
                                        }
                                    }

                                    if (!TEST) {
                                        setTimeout(function() {
                                            broadcast.transfer(WIF, payAccount, moderator.account, finalModeratorPayout, memoModerator, function(err, result) {
                                                if (err) {
                                                    console.log("!----------COULD NOT PAY MODERATOR----------!", moderator.account);
                                                    console.log(err);
                                                    return;
                                                }

                                                console.log(`>-- $$ PAID MODERATOR ${moderator.account}: ${finalModeratorPayout}`);

                                                Moderator.get(moderator.account).then(mod => {
                                                    mod.total_paid_rewards_steem = (mod.total_paid_rewards_steem || 0) + moderatorPayout;
                                                    mod.save().then(() => {
                                                        if (moderatorIndex + 1 === moderators.length) {
                                                            console.log("-------------------------------------");
                                                            console.log("MODERATORS PAID SUCCESSFULLY: ", totalPaidModerators);
                                                            console.log("-------------------------------------");

                                                            done();
                                                        }
                                                    });
                                                });
                                            });
                                        }, 30000 * moderatorIndex);
                                    }

                                    if (TEST && moderatorIndex + 1 === moderators.length) {
                                        console.log("-------------------------------------");
                                        console.log("MODERATORS PAID SUCCESSFULLY: ", totalPaidModerators);
                                        console.log("-------------------------------------");

                                        done();
                                    }
                                });
                            };

                            Moderator.listBeneficiaries()
                                .then(moderators => {
                                    const moderatedSince = new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000)));
                                    const moderatorsPoints = Array();
                                    let totalPoints = 0;
                                    let modsIndex = 0;

                                    console.log(moderatedSince.toISOString())

                                    moderators.forEach(moderator => {
                                        let totalModPoints = 0;
                                        const query = {
                                            'json_metadata.moderator.account': moderator.account,
                                            'json_metadata.moderator.time': {
                                                $gte: moderatedSince.toISOString()
                                            },
                                        };
                                        Post
                                            .count(query)
                                            .then(postsCount => {
                                                if (postsCount === 0) {

                                                    if (modsIndex + 1 === moderators.length) {
                                                        proceedPayMods(moderatorsPoints, totalPoints);
                                                        return;
                                                    }
                                                    modsIndex++;

                                                }

                                                Post.list({ skip: 0, limit: postsCount, query})
                                                    .then(moderatedPosts => {
                                                        moderatedPosts.forEach((moderatedPost, indexModPost) => {
                                                            const points = categoriesPoints[moderatedPost.json_metadata.type] || 0;
                                                            totalModPoints = totalModPoints + points;

                                                            if (indexModPost + 1 === postsCount) {
                                                                totalPoints = totalPoints + totalModPoints;

                                                                moderatorsPoints.push({
                                                                    account: moderator.account,
                                                                    referrer: moderator.referrer,
                                                                    points : totalModPoints,
                                                                });
                                                            }
                                                        });

                                                        if (modsIndex + 1 === moderators.length) {
                                                            proceedPayMods(moderatorsPoints, totalPoints);
                                                        }
                                                        modsIndex++;

                                                    });
                                            });
                                    });
                                }).catch(e => {
                                console.log("FAILED TO RETRIEVE MODERATORS", e);
                                conn.close();
                                process.exit();
                            });
                        };
                        const paySupervisors = () => {
                            let totalPaidSupervisors = 0;

                            supervisors.forEach((supervisor, supervisorsIndex) => {
                                const modsShares = supervisor.supervisor_moderators_shares;
                                const supervisorShares = 20 * modsShares / 100;
                                const supervisorPercent = supervisorShares * percentModerators / 100;
                                const supervisorPayout = (supervisorPercent * totalSteem / 100) >= 0.001 ? (supervisorPercent * totalSteem / 100) : 0.001;
                                const finalSupervisorPayout = `${supervisorPayout.toFixed(3)} STEEM`;
                                const memoSupervisor = `Hello ${supervisor.account}, here is your weekly payout as a Supervisor.`;

                                totalPaidSupervisors = totalPaidSupervisors + supervisorPayout;

                                console.log(`> $$ PAYOUT SUPERVISOR ${supervisor.account}: ${finalSupervisorPayout}`);

                                if (!TEST) {
                                    setTimeout(function() {
                                        broadcast.transfer(WIF, payAccount, supervisor.account, finalSupervisorPayout, memoSupervisor, function(err, result) {
                                            if (err) {
                                                console.log("!----------COULD NOT PAY SUPERVISOR----------!", supervisor.account);
                                                console.log(err);
                                                return;
                                            }

                                            console.log(`>-- $$ PAID SUPERVISOR ${supervisor.account}: ${finalSupervisorPayout}`);

                                            Moderator.get(supervisor.account).then((sup) => {
                                                sup.total_paid_rewards_steem = (sup.total_paid_rewards_steem || 0) + supervisorPayout;

                                                sup.save().then(() => {
                                                    if (supervisorsIndex + 1 === supervisors.length) {
                                                        console.log("-------------------------------------");
                                                        console.log("SUPERVISORS PAID SUCCESSFULLY: ", totalPaidSupervisors);
                                                        console.log("-------------------------------------");

                                                        console.log("EVERYONE HAS BEEN PAID FOR THIS WEEK. SEE YOU NEXT WEEK!");
                                                        conn.close();
                                                        process.exit();
                                                    }
                                                });
                                            });
                                        });
                                    }, 30000 * supervisorsIndex);
                                }

                                if (TEST && supervisorsIndex + 1 === supervisors.length) {
                                    console.log("-------------------------------------");
                                    console.log("SUPERVISORS PAID SUCCESSFULLY: ", totalPaidSupervisors);
                                    console.log("-------------------------------------");

                                    console.log("EVERYONE HAS BEEN PAID FOR THIS WEEK. SEE YOU NEXT WEEK!");
                                    conn.close();
                                    process.exit();
                                }
                            });

                        };

                        paySponsors(() => console.log("SPONSORS PAID"));
                    });
                }).catch(e => {
                    console.log("FAILED TO SAVE LAST PARSED OPERATION", e);
                    conn.close();
                    process.exit();
                });
            });
        }).catch(e => {
        console.log("ERROR STATS", e);
        conn.close();
        process.exit(0);
    });
});

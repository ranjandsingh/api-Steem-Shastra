import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import steemAPI, { formatter } from './server/steemAPI';
import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as request from 'superagent';
import * as SteemConnect from 'sc2-sdk';
import config from './config/config';

import { createCommentPermlink } from './server/steemitHelpers';

(mongoose as any).Promise = Promise;
mongoose.connect(config.mongo);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const paidRewardsDate = '1969-12-31T23:59:59';
  const botAccount = process.env.BOT;
  const refreshToken = process.env.REFRESH_TOKEN;
  const secret = process.env.CLIENT_SECRET;
  const forced = process.env.FORCED === 'true' || false;
  const now = new Date();
  const MAX_VOTE_EVER = 30;
  const MAX_USABLE_POOL = 1000;
  const DIFFICULTY_MULTIPLIER=3;
  var post_index=0;

  const query = {
    'json_metadata.moderator.reviewed': true,
    author: { $ne: botAccount },
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 6*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };

  const bots = [
    'animus',
    'appreciator',
    'arama',
    'ausbitbot',
    'bago',
    'bambam808',
    'banjo',
    'barrie',
    'bellyrub',
    'besttocome215',
    'bierkaart',
    'biskopakon',
    'blackwidow7',
    'blimbossem',
    'boomerang',
    'booster',
    'boostupvote',
    'bowlofbitcoin',
    'bp423',
    'brandybb',
    'brensker',
    'btcvenom',
    'buildawhale',
    'burdok213',
    'businessbot',
    'centerlink',
    'cleverbot',
    'cnbuddy',
    'counterbot',
    'crypto-hangouts',
    'cryptobooty',
    'cryptoholic',
    'cryptoowl',
    'cub1',
    'curationrus',
    'dahrma',
    'davidding',
    'decibel',
    'deutschbot',
    'dirty.hera',
    'discordia',
    'done',
    'drakkald',
    'drotto',
    'earthboundgiygas',
    'edrivegom',
    'emilhoch',
    'eoscrusher',
    'famunger',
    'feedyourminnows',
    'followforupvotes',
    'frontrunner',
    'fuzzyvest',
    'gamerpool',
    'gamerveda',
    'gaming-hangouts',
    'gindor',
    'givemedatsteem',
    'givemesteem1',
    'glitterbooster',
    'gonewhaling',
    'gotvotes',
    'gpgiveaways',
    'gsgaming',
    'guarddog',
    'heelpopulair',
    'helpfulcrypto',
    'idioticbot',
    'ikwindje',
    'ilvacca',
    'inchonbitcoin',
    'ipuffyou',
    'lovejuice',
    'mahabrahma',
    'make-a-whale',
    'makindatsteem',
    'maradaratar',
    'minnowbooster',
    'minnowhelper',
    'minnowpond',
    'minnowpondblue',
    'minnowpondred',
    'misterwister',
    'moonbot',
    'morwhale',
    'moses153',
    'moyeses',
    'msp-lovebot',
    'msp-shanehug',
    'msp-venezuela',
    'msp-music',
    'msp-mods',
    'msp-africa',
    'msp-canada',
    'muxxybot',
    'myday',
    'ninja-whale',
    'ninjawhale',
    'officialfuzzy',
    'perennial',
    'pimpoesala',
    'polsza',
    'portoriko',
    'prambarbara',
    'proctologic',
    'pumpingbitcoin',
    'pushup',
    'qurator',
    'qwasert',
    'raidrunner',
    'ramta',
    'randovote',
    'randowhale',
    'randowhale0',
    'randowhale1',
    'randowhaletrail',
    'randowhaling',
    'reblogger',
    'resteem.bot',
    'resteemable',
    'resteembot',
    'russiann',
    'scamnotifier',
    'scharmebran',
    'siliwilly',
    'sneaky-ninja',
    'sniffo35',
    'soonmusic',
    'spinbot',
    'stackin',
    'steemedia',
    'steemholder',
    'steemit-gamble',
    'steemit-hangouts',
    'steemitgottalent',
    'steemmaker',
    'steemmemes',
    'steemminers',
    'steemode',
    'steemprentice',
    'steemsquad',
    'steemthat',
    'steemvoter',
    'stephen.king989',
    'tabea',
    'tarmaland',
    'timbalabuch',
    'trail1',
    'trail2',
    'trail3',
    'trail4',
    'trail5',
    'trail6',
    'trail7',
    'viraltrend',
    'votey',
    'waardanook',
    'wahyurahadiann',
    'wannabeme',
    'weareone1',
    'whatamidoing',
    'whatupgg',
    'wildoekwind',
    'wiseguyhuh',
    'wistoepon',
    'zdashmash',
    'zdemonz',
    'zhusatriani'
  ];

  console.log("-----BOT-------", botAccount);
  console.log("-----TOKEN-------", refreshToken);
  console.log("-----SECRET-------", secret);


  const checkStatus = (callback) => {
    const limitPower = 10000;
    steemAPI.getAccounts([botAccount], function(err, accounts) {
      if (!err) {
        const botStatus = accounts[0];

        const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
        const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

        if (votingPower < limitPower && !forced) {
          console.log("UPS I AM SO TIRED TODAY. VOTED TOO MUCH", votingPower);
          conn.close();
          process.exit(0);
          return;
        }

        callback(votingPower);
        return;
      }
      console.log("VOTING PW ERROR", err);
      conn.close();
      process.exit(0);
    });
  }

  function calculateFinalVote(post,categories_pool)
  {
    const finalScore = post.finalScore;
    const category = post.category;
    const assignedWeight = (finalScore / categories_pool[category].total_vote_weight * 100) * categories_pool[category].assigned_pool / 100;
    const calculatedVote = Math.round(assignedWeight / categories_pool[category].assigned_pool * 100);
    let finalVote = calculatedVote;

    if (calculatedVote >= categories_pool[category].max_vote) {
      finalVote = categories_pool[category].max_vote;
    }

    if (calculatedVote <= categories_pool[category].min_vote) {
      finalVote = categories_pool[category].min_vote;
    }
    return finalVote;
  }

  const proceedVoting = (scoredPosts, categories_pool, stats) => {
    console.log("SCORED POSTS", scoredPosts.length);

    stats.bot_is_voting = true;
    var total_vote=0,total_after_correction=0;
    new Promise( (resolve, reject) => {
      for(let post of scoredPosts)
      {
        total_vote+=calculateFinalVote(post,categories_pool);
        resolve('Success!');
      }
    }).then(value=>{
      console.log(total_vote);
      stats.save().then((savedStats) => {
        scoredPosts.forEach((post, index) => {
          setTimeout(function(){
            let finalVote=calculateFinalVote(post,categories_pool);

            const achievements = post.achievements;
            const jsonMetadata = { tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0` };
            let commentBody = '';

            commentBody = `### Hey @${post.author} I am @${botAccount}. I have just upvoted you!\n`;

            if (achievements.length > 0) {
              commentBody += '#### Achievements\n';
              achievements.forEach(achievement => commentBody += `- ${achievement}\n`);
            }

            if (finalVote <= 7) {
              commentBody += '#### Suggestions\n';
              commentBody += `- Contribute more often to get higher and higher rewards. I wish to see you often!\n`
              commentBody += `- Work on your followers to increase the votes/rewards. I follow what humans do and my vote is mainly based on that. Good luck!\n`
              commentBody += '#### Get Noticed!\n';
              commentBody += `- Did you know project owners can manually vote with their own voting power or by voting power delegated to their projects? Ask the project owner to review your contributions!\n`
            }

            commentBody += '#### Community-Driven Witness!\n';

            commentBody += `I am the first and only Steem Community-Driven Witness. <a href="https://discord.gg/zTrEMqB">Participate on Discord</a>. Lets GROW TOGETHER!\n`
            commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-vote?witness=utopian-io&approve=1">Vote for my Witness With SteemConnect</a>\n`
            commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-proxy?proxy=utopian-io&approve=1">Proxy vote to Utopian Witness with SteemConnect</a>\n`
            commentBody += `- Or vote/proxy on <a href="https://steemit.com/~witnesses">Steemit Witnesses</a>\n`
            commentBody += `\n[![mooncryption-utopian-witness-gif](https://steemitimages.com/DQmYPUuQRptAqNBCQRwQjKWAqWU3zJkL3RXVUtEKVury8up/mooncryption-s-utopian-io-witness-gif.gif)](https://steemit.com/~witnesses)\n`
            commentBody += '\n**Up-vote this comment to grow my power and help Open Source contributions like this one. Want to chat? Join me on Discord https://discord.gg/Pc8HG9x**';

            finalVote=finalVote*MAX_USABLE_POOL/(total_vote);
            finalVote=Math.round(finalVote*100)/100;
            total_after_correction+=finalVote;
            console.log('--------------------------------------\n');
            console.log('https://utopian.io/utopian-io/@'+post.author+'/'+post.permlink);
            console.log('VOTE:' + finalVote + '(total:'+Math.round(total_after_correction)+')');
            console.log('CATEGORY', post.category,'\n');
            console.log(commentBody);
            console.log('--------------------------------------\n');

            let i = 0;
            const comment = () => {
              SteemConnect.comment(
                  post.author,
                  post.permlink,
                  botAccount,
                  createCommentPermlink(post.author, post.permlink),
                  '',
                  commentBody,
                  jsonMetadata,
              ).then(() => {
                if (index + 1 === scoredPosts.length) {

                  savedStats.bot_is_voting = false;

                  savedStats.save().then(() => {
                    conn.close();
                    process.exit();
                  });
                }
              }).catch(e => {
                if (e.error_description == undefined) {
                  console.log("COMMENT SUBMITTED");
                  if (index + 1 === scoredPosts.length) {

                    savedStats.bot_is_voting = false;

                    savedStats.save().then(() => {
                      conn.close();
                      process.exit();
                    });
                  }
                } else {
                  console.log("COMMENT ERROR", e);
                }
              });
            };

            SteemConnect.vote(botAccount, post.author, post.permlink, finalVote * 100)
                .then(() => {
                  comment();
                }).catch(e => {
              // I think there is a problem with sdk. Always gets in the catch
              if (e.error_description == undefined) {
                console.log("VOTED");
                comment();
              }
            });

          }, index * 30000);
        })
      });
    });
  };

  Stats.get()
      .then(stats => {
        if (stats.bot_is_voting === true) {
          console.log("I AM ALREADY VOTING. DON'T GET ME STRESSED!");
          conn.close();
          process.exit();
        }
        const scBase = config.steemconnectHost;
        request
            .get(`${scBase}/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
            .end((err, res) => {
              if (!res.body.access_token) {
                console.log("COULD NOT GET ACCESS TOKEN", res);
                conn.close();
                process.exit(0);
                return;
              }
              if (res.body.access_token) {
                SteemConnect.setAccessToken(res.body.access_token);
              }
              checkStatus(function(){
                const {categories} = stats;
                Post
                    .countAll({query})
                    .then(limit => {
                      Post
                          .list({skip: 0, limit: limit, query, sort: {net_votes: -1}})
                          .then(posts => {
                            const scoredPosts: any[] = [];

                            if (!posts.length) {
                              console.log("NO POSTS");
                              conn.close();
                              process.exit(0);
                              return;
                            }

                            console.log("FOUND POSTS TO VOTE: ", posts.length);

                            var categories_pool = {
                              "ideas": {
                                "difficulty" : 0.8*DIFFICULTY_MULTIPLIER,
                                "total_vote_weight": 0,
                                "max_vote": 4,
                                "min_vote": 1.5,
                              },
                              "sub-projects": {
                                "total_vote_weight": 0,
                                "max_vote": MAX_VOTE_EVER,
                                "min_vote": 8,
                                "difficulty" : 2*DIFFICULTY_MULTIPLIER
                              },
                              "development": {
                                "total_vote_weight": 0,
                                "max_vote": MAX_VOTE_EVER,
                                "min_vote": 30,
                                "difficulty" : 2.5*DIFFICULTY_MULTIPLIER
                              },
                              "bug-hunting": {
                                "total_vote_weight": 0,
                                "max_vote": 5,
                                "min_vote": 2,
                                "difficulty" : 1*DIFFICULTY_MULTIPLIER
                              },
                              "translations": {
                                "total_vote_weight": 0,
                                "max_vote": 12,
                                "min_vote": 7,
                                "difficulty" : 1.4*DIFFICULTY_MULTIPLIER
                              },
                              "graphics": {
                                "total_vote_weight": 0,
                                "max_vote": MAX_VOTE_EVER,
                                "min_vote": 7.5,
                                "difficulty" : 1.7*DIFFICULTY_MULTIPLIER
                              },
                              "analysis": {
                                "total_vote_weight": 0,
                                "max_vote": 20,
                                "min_vote": 8,
                                "difficulty" : 1.6*DIFFICULTY_MULTIPLIER
                              },
                              "social": {
                                "total_vote_weight": 0,
                                "max_vote": 20,
                                "min_vote": 5,
                                "difficulty" : 1.5*DIFFICULTY_MULTIPLIER
                              },
                              "documentation": {
                                "total_vote_weight": 0,
                                "max_vote": 20,
                                "min_vote": 5,
                                "difficulty" : 1.5*DIFFICULTY_MULTIPLIER
                              },
                              "tutorials": {
                                "total_vote_weight": 0,
                                "max_vote": 15,
                                "min_vote": 7,
                                "difficulty" : 1.9*DIFFICULTY_MULTIPLIER
                              },
                              "video-tutorials": {
                                "total_vote_weight": 0,
                                "max_vote": 15,
                                "min_vote": 8,
                                "difficulty" : 1.7*DIFFICULTY_MULTIPLIER
                              },
                              "copywriting": {
                                "total_vote_weight": 0,
                                "max_vote": 15,
                                "min_vote": 5,
                                "difficulty" : 1.55*DIFFICULTY_MULTIPLIER
                              },
                              "blog": {
                                "total_vote_weight": 0,
                                "max_vote": 5,
                                "min_vote": 2,
                                "difficulty" : 1*DIFFICULTY_MULTIPLIER
                              },
                              "tasks-requests": {
                                "total_vote_weight": 0,
                                "max_vote": 6,
                                "min_vote": 3,
                                "difficulty" : 1.1*DIFFICULTY_MULTIPLIER
                              },
                            };

                            var total_weighted_length=0;

                            for (var elt in categories_pool)
                            {
                              categories_pool[elt].weighted_length=posts.filter(post => post.json_metadata.type === elt).length*categories_pool[elt].difficulty;
                              total_weighted_length+=categories_pool[elt].weighted_length;
                            }

                            for (var elt in categories_pool)
                            {
                              if(elt!=='tasks-requests')
                                (categories_pool[elt] as any).assigned_pool =(posts.filter(post => post.json_metadata.type === elt).length / total_weighted_length * 100) *categories_pool[elt].difficulty* MAX_USABLE_POOL / 100;
                              else
                                (categories_pool[elt] as any).assigned_pool =(posts.filter(post => post.json_metadata.type.indexOf('task-') > -1).length / posts.length * 100) *categories_pool[elt].difficulty* MAX_USABLE_POOL / 100;
                            }

                            console.log(categories_pool);
                            console.log("LENGTH", posts.length)
                            posts.forEach((post, allPostsIndex) => {

                              steemAPI.getAccounts([post.author], (err, accounts) => {
                                console.log("INDEX", post_index);
                                if (!err) {
                                  if (accounts && accounts.length === 1) {
                                    const account = accounts[0];

                                    console.log("ACCOUNT", account);

                                    steemAPI.getFollowCount(account.name, function (err, followers) {
                                      if(!err) {
                                        console.log("ERR", err);
                                        console.log("FOLLOWERS", followers);

                                        const contributionsQuery = {
                                          'json_metadata.moderator.reviewed': true,
                                          id: {$ne: post.id},
                                          author: post.author,
                                        };

                                        Post
                                            .countAll({query: contributionsQuery})
                                            .then(contributionsCount => {

                                              const achievements: string[] = [];
                                              const categoryStats = categories[post.json_metadata.type];
                                              const averageRewards = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                              const reputation = formatter.reputation(account.reputation);
                                              const votes = post.active_votes.filter(vote => bots.indexOf(vote.voter) <= 0);
                                              const getUpvotes = activeVotes => activeVotes.filter(vote => vote.percent > 0);
                                              const upVotes = getUpvotes(votes);
                                              let totalGenerated = 0;
                                              let totalWeightPercentage = 0;

                                              upVotes.forEach((upVote, upVoteIndex) => {
                                                const totalPayout = parseFloat(post.pending_payout_value)
                                                    + parseFloat(post.total_payout_value)
                                                    + parseFloat(post.curator_payout_value);

                                                const voteRshares = votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
                                                const ratio = totalPayout / voteRshares;
                                                const voteValue = upVote.rshares * ratio;
                                                const upvotePercentageOnTotal = (voteValue / totalPayout) * 100;

                                                totalGenerated = totalGenerated + voteValue;
                                                // fallback mechanism for big accounts never voting at their 100%. Using instead the impact on their vote on the amount of rewards
                                                totalWeightPercentage = totalWeightPercentage + (upvotePercentageOnTotal > upVote.percent ? upvotePercentageOnTotal : upVote.percent);
                                              });
                                              const upVotesLength = upVotes.length == 0 ? 1 : upVotes.length;
                                              const averageWeightPercentage = totalWeightPercentage / upVotesLength / 100;
                                              const rankConsensus = averageWeightPercentage * upVotes.length / 100;
                                              let finalScore = rankConsensus;

                                              if (finalScore > 55) {
                                                achievements.push('WOW WOW WOW People loved what you did here. GREAT JOB!');
                                              }

                                              // help the user grow the followers
                                              if (followers.follower_count < 500) {
                                                finalScore = finalScore + 20;
                                                achievements.push('You have less than 500 followers. Just gave you a gift to help you succeed!');
                                              }
                                              if (totalGenerated > averageRewards) {
                                                finalScore = finalScore + 20;
                                                achievements.push('You are generating more rewards than average for this category. Super!;)');
                                              }
                                              if (contributionsCount === 0) {
                                                // this is the first contribution of the user accepted in the Utopian feed
                                                // give the user a little gift
                                                finalScore = finalScore + 15;
                                                achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                              }
                                              // number of contributions in total
                                              if (contributionsCount > 0) {
                                                finalScore = finalScore + 5;

                                                if (contributionsCount >= 15) {
                                                  // git for being productive
                                                  finalScore = finalScore + 5;
                                                }
                                                if (contributionsCount >= 40) {
                                                  // git for being productive
                                                  finalScore = finalScore + 5;
                                                }
                                                if (contributionsCount >= 60) {
                                                  // git for being productive
                                                  finalScore = finalScore + 5;
                                                }
                                                if (contributionsCount >= 120) {
                                                  // git for being productive
                                                  finalScore = finalScore + 5;
                                                }
                                                achievements.push('Seems like you contribute quite often. AMAZING!');
                                              }

                                              if (reputation >= 25) finalScore = finalScore + 2.5;
                                              if (reputation >= 50) finalScore = finalScore + 2.5;
                                              if (reputation >= 65) finalScore = finalScore + 2.5;
                                              if (reputation >= 70) finalScore = finalScore + 2.5;

                                              post.finalScore = finalScore >= 100 ? 100 : Math.round(finalScore);
                                              post.achievements = achievements;
                                              post.category = post.json_metadata.type.indexOf('task-') > -1 ? 'tasks-requests' : post.json_metadata.type;

                                              if (post.json_metadata.type.indexOf('task-') > -1) {
                                                categories_pool['tasks-requests'].total_vote_weight = categories_pool['tasks-requests'].total_vote_weight + finalScore;
                                              } else {
                                                categories_pool[post.json_metadata.type].total_vote_weight = categories_pool[post.json_metadata.type].total_vote_weight + finalScore;
                                              }

                                              scoredPosts.push(post);

                                              if (post_index + 1 === posts.length) {
                                                proceedVoting(scoredPosts, categories_pool, stats);
                                              }
                                              post_index++;
                                            });
                                      } else {
                                        post_index++;
                                      }
                                    });
                                  }
                                }
                              });
                            });
                          });
                    });
              });
            });
      });
});

import Project from '../models/project.model';
import User from '../models/user.model';
import userCtrl from '../controllers/user.controller';
import Sponsor from '../models/sponsor.model';
import * as R from 'ramda';
const steemconnect = require('sc2-sdk');
import steemAPI from '../steemAPI';
import * as request from 'superagent';
import config from '../../config/config';

function get(req, res, next) {
    const { platform, externalId } = req.params;
    const external_id = parseInt(externalId);

    Project.get(platform, external_id)
        .then(project => res.json({
            name: project.name,
            platform: project.platform,
            external_id: project.external_id,
            steem_account: {
                account: project.steem_account.account,
            },
            sponsorship: {
                ...project.sponsorship
            },
            sponsors: [
                ...project.sponsors
            ],
        }))
        .catch(e => next(e));
}


function createBeneficiarySponsor (account, project, callback) {
    Sponsor.get(account.name).then((beneficiarySponsor) => {
        if (!beneficiarySponsor) {
            const newBeneficiarySponsor = new Sponsor({
                account: account.name,
                vesting_shares: 0,
                percentage_total_vesting_shares: 0,
                total_paid_rewards: 0,
                should_receive_rewards: 0,
                opted_out: false,
                is_witness: false,
                projects: [{
                    external_id: project.external_id,
                    platform: project.platform,
                    steem_account: project.steem_account.account,
                }],
            });
            newBeneficiarySponsor.save()
                .then(() => callback(true))
                .catch(e => callback(false));
        } else {
            if (!R.find(R.propEq('steem_account', project.steem_account.account))(beneficiarySponsor.projects)) {
                beneficiarySponsor.projects = [
                    ...beneficiarySponsor.projects,
                    {
                        external_id: project.external_id,
                        platform: project.platform,
                        steem_account: project.steem_account.account,
                    }
                ];
                beneficiarySponsor.save()
                    .then(() => callback(true))
                    .catch(e => callback(false));
            } else {
                callback(true);
            }
        }
    });
}

function createSponsor(req, res, next) {
    const { platform, externalId } = req.params;
    const external_id = parseInt(externalId);
    const sponsor = req.body.sponsor.replace('@', '');

    steemAPI.getAccounts([sponsor], (err, accounts) => {
        if (!err) {
            if (accounts && accounts.length === 1) {
                const account = accounts[0];
                Project.get(platform, external_id).then(project => {
                    const isSponsor = R.find(R.propEq('account', account.name))(project.sponsors);
                    if(!isSponsor) {
                        const newSponsor = {
                            account: account.name,
                        };
                        project.sponsors = [
                            ...project.sponsors,
                            newSponsor
                        ];
                        project.save()
                            .then(savedProject => {
                                createBeneficiarySponsor(account, project, (beneficiarySponsor) => {
                                    if (beneficiarySponsor) {
                                        res.status(200).json(newSponsor);
                                    } else {
                                        res.status(500).json({
                                            message: 'Cannot save the sponsor. Please contact an administrator.'
                                        });
                                    }
                                });
                            })
                            .catch(e => {
                                res.status(500).json({
                                    message: 'Cannot save the project. Please contact an administrator.'
                                });
                                next(e);
                            });
                    } else {
                        createBeneficiarySponsor(account, project, (beneficiarySponsor) => {
                            if (beneficiarySponsor) {
                                res.status(200).json(isSponsor);
                            } else {
                                res.status(500).json({
                                    message: 'Cannot save the sponsor. Please contact an administrator.'
                                });
                            }
                        });
                    }
                });
            } else {
                res.status(404).json({
                    message: 'Cannot find this account. Please make sure you wrote it correctly'
                });
            }
        } else {
            res.status(500).json({
                message: 'Something went wrong. Please try again later!'
            });
        }
    });
}

function create(req, res, next) {
    const owner = req.body.owner;
    const platform = req.body.platform;
    const external_id = req.body.external_id;
    const project_name = req.body.project_name;
    steemconnect.setBaseURL(config.steemconnectHost);
    steemconnect.setAccessToken(res.locals.user.sc2.token);
    steemconnect.me().then((resp) => {
        if (resp && resp.user) {
            const user = resp.user;
            if (user === owner) {
                User.get(user).then(userData => {
                    if (userData && userData.github) {
                        userCtrl.getGithubRepos(userData, (projects) => {
                            if (projects.length) {
                                const isProjectMaintainer = R.find(R.propEq("id", external_id))(projects);
                                if (isProjectMaintainer) {
                                    const newAccountName = `${project_name}.utp`;
                                    return Project.get(platform, external_id)
                                        .then(project => {
                                            project.name = project_name;
                                            project.sponsorship.rejected.status = false;
                                            project.sponsorship.rejected.message = "";
                                            project.steem_account.account = newAccountName;
                                            project.save().then(() => {
                                                res.json({
                                                    project_name: newAccountName
                                                });
                                            }).catch((err) => res.status(500).json({error_message: err}))
                                        })
                                        .catch(e => {
                                            if(e.status === 404) {
                                                const project = new Project({
                                                    name: project_name,
                                                    platform,
                                                    external_id,
                                                    sponsorship: {
                                                        enabled: false,
                                                        rejected: {
                                                            status: false,
                                                            message: ""
                                                        }
                                                    },
                                                    steem_account: {
                                                        account: newAccountName,
                                                        refresh_token: "",
                                                    },
                                                    sponsors: [],
                                                });
                                                project.save().then(() => {
                                                    res.json({
                                                        project_name: newAccountName
                                                    });
                                                }).catch((err) => res.status(500).json({error_message: err}));
                                            } else {
                                                res.status(500).json({error_message: e});
                                            }
                                        });
                                }
                            }
                            res.status(401);
                        });
                    }
                }).catch(() => res.status(401))

            } else {
                res.status(401);
            }
        } else {
            res.status(401);
        }
    });
}

function voteWithSponsors(req, res, next) {
    const platform = req.params.platform;
    const external_id = parseInt(req.params.externalId);
    const vote = req.body.vote;
    const author = req.body.author;
    const permlink = req.body.permlink;
    steemconnect.setBaseURL(config.steemconnectHost);
    steemconnect.setAccessToken(res.locals.user.sc2.token);
    steemconnect.me().then((resp) => {
        if (resp && resp.user) {
            const user = resp.user;
            if (user) {
                User.get(user).then(userData => {
                    if (userData && userData.github) {
                        userCtrl.getGithubRepos(userData, (projects) => {
                            if (projects.length) {
                                const isProjectMaintainer = R.find(R.propEq("id", external_id))(projects);
                                if (isProjectMaintainer) {
                                    Project.get(platform, external_id)
                                        .then(project => {
                                            if (project.sponsorship.enabled === true) {
                                                const voter = project.steem_account.account;
                                                const refresh_token = project.steem_account.refresh_token;
                                                const steemconnectBase = config.steemconnectHost;
                                                request.get(`${steemconnectBase}/api/oauth2/token?scope=offline,vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance`)
                                                    .query({ refresh_token, client_secret: process.env.UTOPIAN_STEEMCONNECT_SECRET })
                                                    .then(function (tokenRes) {
                                                        const token = tokenRes.body;
                                                        const voterAccessToken = token.access_token;
                                                        if (voterAccessToken) {
                                                            steemconnect.setAccessToken(voterAccessToken);
                                                            steemconnect
                                                                .vote(voter, author, permlink, vote)
                                                                .then((voteRes) => {
                                                                    if (voteRes) {
                                                                        res.status(200).json({
                                                                            message: 'Vote broadcasted'
                                                                        });
                                                                    } else {
                                                                        res.status(500).json({
                                                                            error_message: voteRes
                                                                        });
                                                                    }
                                                                })
                                                                .catch(e => res.status(500).json({
                                                                    error_message: e
                                                                }));
                                                        } else {
                                                            res.status(401);
                                                        }
                                                    }).catch(e => console.log(e))
                                            } else {
                                                res.status(401);
                                            }
                                        }).catch(e => res.status(500));
                                }
                            } else {
                                res.status(401);
                            }
                        });
                    }
                }).catch(() => res.status(401))

            } else {
                res.status(401);
            }
        } else {
            res.status(401);
        }
    });
}

export default { create, createSponsor, voteWithSponsors, get };

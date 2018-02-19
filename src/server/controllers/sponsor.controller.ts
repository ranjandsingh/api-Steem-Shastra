import Sponsor from '../models/sponsor.model';
import steemAPI from '../steemAPI';

function list(req, res, next) {
  Sponsor.list()
    .then(sponsors => res.json({
      total: sponsors.length,
      results: sponsors
    }))
    .catch(e => next(e));
}

function create(req, res, next) {
  const sponsor = req.body.sponsor.replace('@', '');

  steemAPI.getAccounts([sponsor], (err, accounts) => {
    if (!err) {
      if (accounts && accounts.length === 1) {
        const account = accounts[0];
        Sponsor.get(account.name).then(isSponsor =>{
          if(!isSponsor) {
            const newSponsor = new Sponsor({
              account: account.name,
              vesting_shares: 0,
              percentage_total_vesting_shares: 0,
              total_paid_rewards: 0,
              total_paid_rewards_steem: 0,
              should_receive_rewards: 0,
              opted_out: false,
              is_witness: false,
              projects: [],
            });

            newSponsor.save()
              .then(savedSponsor => res.json(savedSponsor))
              .catch(e => {
                res.status(500).json({
                  message: 'Cannot save the sponsor. Please try again later.'
                });
                next(e);
              });
          } else {
            res.status(200).json(isSponsor);
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

export default { create, list };

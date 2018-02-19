import Stats from '../models/stats.model';

function list(req, res, next) {
  Stats.get()
    .then(stats => res.json({
      stats
    }))
    .catch(e => next(e));
}

export default { list };

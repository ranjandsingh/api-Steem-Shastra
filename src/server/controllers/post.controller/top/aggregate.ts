export function aggregateMatch(startDate: Date|undefined, endDate: Date) {
  const matcher: any = {
    $match: {
      'json_metadata.repository.full_name': {
        $nin: [
          null,
          'utopian-io/utopian.io',
          'utopian-io/api.utopian.io'
        ]
      },
      'created': {
        $lt: endDate.toISOString()
      },
      'json_metadata.moderator.flagged': { $ne: true }
    }
  };
  if (startDate) {
    matcher.$match.created.$gte = startDate.toISOString();
  }
  return matcher;
}

export function aggregateGroup() {
  let group: any = {
    _id: '$json_metadata.repository.full_name',
    count: { $sum: 1 },
    posts: {
      $addToSet: {
        created: '$created',
        pending_payout_value: '$pending_payout_value',
        total_payout_value: '$total_payout_value'
      }
    }
  };

  return [
    { $group: group },
    { $sort: { count: -1 } }
  ];
}

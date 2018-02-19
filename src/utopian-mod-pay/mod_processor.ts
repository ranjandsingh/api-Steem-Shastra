import Moderator from '../server/models/moderator.model';
import { CategoryValue, formatCat } from './util';
import Post from '../server/models/post.model';
import * as util from 'util';

export interface CommentOpts {
  parentAuthor: string;
  parentPermlink: string;
  permlink: string;
  title: string;
}

export class ModeratorStats {

  rewards = 0;
  maxRewardsReached = false;

  constructor(readonly moderator: any, /* moderator model */
              readonly categories: { [key: string]: CategoryValue },
              readonly totalReviewed: number,
              readonly totalFlagged: number,
              readonly comment: string) {
  }

  getCommentOps(opts: CommentOpts, includeOpts = true): any[] {
    const ops: any[] = [
      [
        'comment',
        {
          parent_author: opts.parentAuthor,
          parent_permlink: opts.parentPermlink,
          author: this.moderator.account,
          permlink: opts.permlink,
          title: opts.title,
          body: this.getComment(),
          json_metadata: JSON.stringify({}),
        }
      ]
    ];
    if (includeOpts) {
      ops.push([
        'comment_options',
        {
          author: this.moderator.account,
          permlink: opts.permlink,
          allow_curation_rewards: false,
          allow_votes: true,
          percent_steem_dollars: 10000,
          max_accepted_payout: '1000000.000 SBD',
          extensions: [[0, {
            beneficiaries: [
              {
                account: 'utopian.pay',
                weight: 2500
              }
            ]
          }]]
        }
      ])
    }
    return ops;
  }

  getComment() {
    const rewards = this.rewards.toFixed(2);
    const exceeded = this.maxRewardsReached ?
'With my hard work, I have reached the maximum 130 point limit for this week!' : '';
    return util.format(this.comment, rewards, exceeded);
  }

  static async get(mod: any): Promise<ModeratorStats|undefined> {
    const posts: any[] = await Post.find({
      'json_metadata.moderator.account': mod.account,
      'created': {
        $gte: new Date(Date.now() - (1000 * 60 * 60 * 24 * 7)).toISOString()
      }
    });

    const total = posts.length;
    let totalReviewed = 0;
    let totalFlagged = 0;
    if (!total) {
      return;
    }

    let comment =
`
## Points

I earned a total of %s points for this week. %s

## Position

${!mod.referrer && !mod.supermoderator ? 'I am a Utopian moderator.': ''}\
${mod.referrer && !mod.supermoderator ? 'I am a Utopian moderator supervised by @' + mod.referrer + '.' : ''}\
${mod.supermoderator ? 'I am a Utopian supervisor.' : ''}\

## Activity

In total for this week, I have moderated ${total} \
post${total === 1 ? '' : 's'} on Utopian. Overall, I moderated a total of \
${mod.total_moderated} posts.
`;

    const cats = processModCategories(posts);
    for (const key of Object.keys(cats)) {
      const val = cats[key];
      const count = val.reviewed + val.flagged;

      totalReviewed += val.reviewed;
      totalFlagged += val.flagged;

      comment +=
  `
  ### ${formatCat(key)} Category
  - ${val.reviewed} post${val.reviewed === 1 ? '' : 's'} reviewed
  - ${val.flagged} post${val.flagged === 1 ? '' : 's'} flagged
  `;
    }

    return new ModeratorStats(mod, cats, totalReviewed, totalFlagged, comment);
  }

  static async list(): Promise<ModeratorStats[]> {
    const moderators: any[] = await Moderator.list();
    const mods: ModeratorStats[] = [];
    for (const mod of moderators) {
      const stats = await ModeratorStats.get(mod);
      if (stats) {
        mods.push(stats);
      }
    }
    return mods;
  }
}

function processModCategories(posts: any[]): { [key: string]: CategoryValue } {
  const cats: { [key: string]: CategoryValue } = {};
  for (const post of posts) {
    const type = post.json_metadata.type;
    if (!cats[type]) {
      cats[type] = {
        reviewed: 0,
        flagged: 0
      };
    }
    const data = post.json_metadata.moderator;
    if (data.reviewed) {
      cats[type].reviewed++;
    } else if (data.flagged) {
      cats[type].flagged++;
    }
  }
  return cats;
}

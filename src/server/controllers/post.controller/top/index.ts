import { aggregateMatch, aggregateGroup } from './aggregate';
import config from '../../../../config/config';
import Post from '../../../models/post.model';
import { getUpdatedPost } from '../update';
import * as HttpStatus from 'http-status';
import * as request from 'superagent';
import * as crypto from 'crypto';

export enum TopSortBy {
  CONTRIBUTIONS = 'contributions',
  REWARDS = 'rewards'
}

export enum RetrieveBy {
  PROJECTS = 'projects',
  CONTRIBUTIONS = 'contributions'
}

export interface TopQueryParams {
  limit: number;
  start_date: Date;
  end_date: Date;
  sort_by: TopSortBy;
  retrieve_by: RetrieveBy;
  only_new: boolean;
}

export function processQueryParams(req, res, next): void {
  let {
    limit = 5,
    start_date = new Date(0),
    end_date = new Date(),
    sort_by = TopSortBy.CONTRIBUTIONS,
    retrieve_by = RetrieveBy.PROJECTS,
    only_new = false
  } = req.query;

  try {
    if (typeof(start_date) === 'string') start_date = new Date(start_date);
    if (typeof(end_date) === 'string') end_date = new Date(end_date);
    limit = Number(limit);
    only_new = getBoolean(only_new);

    if (isNaN(limit)) {
      res.json({
        error: 'limit is invalid'
      });
      return;
    }
  } catch (e) {
    next(e);
    return;
  }

  const query: TopQueryParams = {
    limit,
    start_date,
    end_date,
    sort_by,
    retrieve_by,
    only_new
  };
  req.query = query;
  next();
}

export async function top(req, res, next) {
  const params: TopQueryParams = req.query;
  try {
    const aggregateQuery: any[] = [
      aggregateMatch(params.only_new ? undefined : params.start_date, params.end_date)
    ];

    if (params.retrieve_by === RetrieveBy.PROJECTS) {
      aggregateQuery.push(...aggregateGroup());
    }

    const data: any[] = await Post.aggregate(aggregateQuery);
    if (params.retrieve_by === RetrieveBy.PROJECTS) {
      for (let i = data.length - 1; i >= 0; --i) {
        const repo = data[i];
        let blacklist = false;
        let rewards = 0;
        for (const post of repo['posts']) {
          if (params.only_new && (new Date(post.created).getTime()) < params.start_date.getTime()) {
            blacklist = true;
            break;
          }
          rewards += postRewards(post);
        }
        if (blacklist) {
          data.splice(i, 1);
          continue;
        }
        repo['rewards'] = rewards;
        repo['posts'] = undefined;
      }
    } else if (params.retrieve_by === RetrieveBy.CONTRIBUTIONS) {
      for (let i = data.length - 1; i >= 0; --i) {
        const post = data[i];
        if (params.only_new
            && (new Date(post.created).getTime()) < params.start_date.getTime()) {
          data.splice(i, 1);
          continue;
        }
        post.rewards = postRewards(post);
        post.utopian_url = `https://utopian.io${post.url}`;
      }
      if (params.sort_by === TopSortBy.CONTRIBUTIONS) {
        data.sort((a: any, b: any) => b.active_votes.length - a.active_votes.length);
      }
    }

    if (params.sort_by === TopSortBy.REWARDS) {
      data.sort((a: any, b: any) => b.rewards - a.rewards);
    }

    if (data.length > params.limit) data.length = params.limit;
    if (params.retrieve_by === RetrieveBy.PROJECTS) {
      for (const repo of data) {
        const gh = await githubRepo(repo['_id']);
        repo['github'] = await githubRepo(repo['_id']);
        repo['project_url'] = `https://utopian.io/project/${repo['_id']}/github/${gh['id']}/all`;
      }
    }

    res.json(data);
  } catch (e) {
    console.log('Failed to retrieve top data', e);
    res.json({
      error: 'Failed to retrieve top data'
    });
  }
}

async function githubRepo(fullName: string): Promise<any> {
  try {
    const res = (await request.get(`https://api.github.com/repos/${fullName}`, {
      deadline: 5000
    }).query({
      client_id: config.credentials.githubClientId,
      client_secret: config.credentials.githubSecret
    })).body;
    return {
      id: res.id,
      name: res.name,
      html_url: res.html_url,
      description: res.description,
      homepage: res.homepage,
      language: res.language,
      license: res.license
    };
  } catch (e) {
    console.log('Failed to retrieve project', fullName, e);
    return {
      error: e.message
    };
  }
}

function postRewards(post: any): number {
  const pending = parseFloat(post.pending_payout_value.split(' ')[0]);
  const paid = parseFloat(post.total_payout_value.split(' ')[0]);
  post.pending_payout_value = undefined;
  post.total_payout_value = undefined;
  return pending + paid;
}

function getBoolean(val?: string|boolean): boolean {
  return val === true || val === 'true';
}

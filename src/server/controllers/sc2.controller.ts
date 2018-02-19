import {
  validateNewPost,
  updatePost
} from '../controllers/post.controller/update';
import Post, { PostSchemaDoc } from '../models/post.model';
import { getGithubRepo } from '../helpers/github';
import Session from '../models/session.model';
import * as HttpStatus from 'http-status';
import { getContent } from '../steemAPI';
import * as express from 'express';
import * as sc2 from '../sc2';

export async function profile(req: express.Request,
                              res: express.Response,
                              next: express.NextFunction) {
  try {
    const json = await sc2.send('/me', {
      user: res.locals.user
    });
    if (!json) {
      return res.sendStatus(HttpStatus.UNAUTHORIZED);
    }

    return res.json(json);
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req: express.Request,
                                    res: express.Response,
                                    next: express.NextFunction) {
  try {
    const json = await sc2.send('/me', {
      user: res.locals.user,
      method: 'PUT',
      data: req.body
    });
    return res.json(json);
  } catch (e) {
    next(e);
  }
}

export async function broadcast(req: express.Request,
                                res: express.Response,
                                next: express.NextFunction) {
  try {
    if (req.body.operations) {
      const ops: any[][] = req.body.operations;
      for (const op of ops) {
        if (op[0] !== 'comment') {
          continue;
        }
        const data = op[1];
        if (!data.json_metadata || data.parent_author) {
          continue;
        }
        if (res.locals.user.banned) {
          // User is banned from creating posts on Utopian
          return res.sendStatus(HttpStatus.FORBIDDEN);
        }
        const meta = JSON.parse(data.json_metadata);
        if (meta.repository && meta.repository.full_name) {
          let repo = await getGithubRepo(meta.repository.full_name);
          meta.repository = {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            fork: repo.fork,
            owner: repo.owner ? {
              login: repo.owner.login
            } : undefined
          };
        }
        if (!(await validateNewPost(data, false))) {
          return res.sendStatus(HttpStatus.BAD_REQUEST);
        }
        data.json_metadata = JSON.stringify(meta);
      }
    }

    const json = await sc2.send('/broadcast', {
      user: res.locals.user,
      data: req.body
    });
    for (const op of json.result.operations) {
      if (op[0] !== 'comment') {
        continue;
      } else if (op[1].parent_author) {
        continue;
      }

      let post: any = {};
      let attempts = 0;
      while (!(post.author && post.permlink) && (++attempts < 100)) {
        try {
          post = await getContent(op[1].author, op[1].permlink);
        } catch (e) {
          console.log('Failed to get content of new post', e);
        }
        if (!(post.author && post.permlink)) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      let dbPost = await Post.findOne({
        author: post.author,
        permlink: post.permlink
      });
      if (dbPost) {
        dbPost = updatePost(dbPost, post);
      } else {
        dbPost = new Post({
          ...post,
          json_metadata: JSON.parse(post.json_metadata),
        });
      }
      await (dbPost as PostSchemaDoc).save();
    }
    return res.json(json);
  } catch (e) {
    next(e);
  }
}

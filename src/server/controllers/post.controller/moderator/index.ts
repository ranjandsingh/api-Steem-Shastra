import {aggregateMatch} from './aggregate';
import Post from '../../../models/post.model';


export enum PostStatus {
    ANY = 'any',
    REVIEWED = 'reviewed',
    PENDING = 'pending',
    FLAGGED = 'flagged'
}

export interface ModeratorQueryParams {
    limit: number;
    skip: number;
    start_date: Date;
    end_date: Date;
    moderator: String;
    post_status: PostStatus;
}

export function processModeratorQueryParams(req, res, next): void {
    let {
        limit = 5,
        skip = 0,
        start_date = new Date(0),
        end_date = new Date(),
        moderator = 'any',
        post_status = PostStatus.ANY
    } = req.query;

    try {
        if (typeof(start_date) === 'string') start_date = new Date(start_date);
        if (typeof(end_date) === 'string') end_date = new Date(end_date);
        limit = Number(limit);
        skip = Number(skip);

        if (isNaN(limit)) {
            res.json({
                error: 'limit is invalid'
            });
            return;
        }

        if (isNaN(skip)) {
            res.json({
                error: 'skip is invalid'
            });
            return;
        }

    } catch (e) {
        next(e);
        return;
    }

    const query: ModeratorQueryParams = {
        limit,
        skip,
        start_date,
        end_date,
        post_status,
        moderator
    };
    req.query = query;
    next();
}

export async function moderator(req, res, next) {
    const params: ModeratorQueryParams = req.query;

    try {
        const aggregateQuery: any[] = [
            aggregateMatch(params.start_date, params.end_date, params.moderator, params.post_status),
            { $sort: { created: -1 } },
            { $skip: params.skip },
            { $limit: params.limit }
        ];

        const data: any[] = await Post.aggregate(aggregateQuery);

        res.json({
            total: data.length,
            results: data
        });
    } catch (e) {
        console.log('Failed to retrieve moderators data', e);
        res.json({
            error: 'Failed to retrieve moderators data'
        });
    }
}

function getBoolean(val?: string | boolean): boolean {
    return val === true || val === 'true';
}

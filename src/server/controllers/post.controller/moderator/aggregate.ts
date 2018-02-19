import {PostStatus} from "./index";

export function aggregateMatch(startDate: Date | undefined, endDate: Date, moderator: String, status: PostStatus) {
    const matcher: any = {
        $match: {
            'json_metadata.moderator.time': {
                $lt: endDate.toISOString()
            },
        }
    };

    if (startDate) {
        matcher.$match['json_metadata.moderator.time'].$gte = startDate.toISOString();
    }

    if (moderator) {
        matcher.$match['json_metadata.moderator.account'] = moderator;
    }

    switch (status) {
        case PostStatus.ANY:
            if (!moderator) 
                matcher.$match['json_metadata.moderator.account'] = {  $ne: null };
            break;
        case PostStatus.REVIEWED:
            matcher.$match['json_metadata.moderator.reviewed'] = true;
            break;
        case PostStatus.FLAGGED:
            matcher.$match['json_metadata.moderator.flagged'] = true;
            break;
        case PostStatus.PENDING:
            matcher.$match['json_metadata.moderator.pending'] = true;
            break;
    }
    return matcher;
}

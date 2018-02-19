import Moderator from "../models/moderator.model";
import Sponsor from '../models/sponsor.model';
import APIError from '../helpers/APIError';
import * as HttpStatus from 'http-status';

function list(req, res, next) {
  const {type} = req.params;
  let {limit = 6} = req.query;
  let host = req.protocol + '://' + req.get('host');

  if (type === 'moderators') {
    Moderator.top().then(moderators => {
      res.header("Content-Type","text/plain");
      return res.send(buildTable("moderator",moderators.slice(0,limit), host))
    }).catch(e => next(e));
  } else if (type === "sponsors") {
    Sponsor.list().then(sponsors => {
      res.header("Content-Type","text/plain");
      return res.send(buildTable("sponsors",sponsors.slice(0,limit), host))
    }).catch(e => next(e));
  } else {
    throw new APIError('Unknown type', HttpStatus.BAD_REQUEST, true);
  }
}

function getModeratorRow (moderator, host) {

  return '<td><center><img src="'+host+'/api/users/' + moderator.account + '/avatar?round=true&size=50" style="border-radius:50%;"><br /><a target="_blank" href="//utopian.io/@' + moderator.account + '">@' + moderator.account + '</a></center></td>'
}

function getSponsorRow (sponsor, host) {
  let row = '<td><center><img src="'+host+'/api/users/' + sponsor.account + '/avatar?round=true&size=50" style="border-radius:50%;"><br /><a target="_blank" href="//utopian.io/@' + sponsor.account + '">@' + sponsor.account + '</a>'
  if (sponsor.is_witness) {
    row = row + ' - <a target="_blank" href="//v2.steemconnect.com/sign/account-witness-vote?witness=' + sponsor.account + '&approve=1">Vote Witness</a>'
  }
  row = row + '</center></td>'
  return row
}

function buildTable (mode, data, host) {
  let table = '<table><tr>'

  if (mode === 'moderator') {
    for (let i = 0; i < data.length; i++) {
      if (i % 2 === 0) {
        table = table + '</tr><tr>'
      }
      table = table + getModeratorRow(data[i], host)
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      if (i % 2 === 0) {
        table = table + '</tr><tr>'
      }
      table = table + getSponsorRow(data[i], host)
    }
  }

  if (table.substr(table.length - 5) !== '</tr>') {
    table = table + '</tr>'
  }

  table = table + '</table>'

  return table
}


export default {list};

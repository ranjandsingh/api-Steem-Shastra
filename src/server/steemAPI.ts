import * as steem from 'steem';
import config from '../config/config';

steem.api.setOptions({ url: config.steemNode });

export function getContent(author: string, permlink: string): Promise<any> {
  return new Promise((resolve, reject) => {
    steem.api.getContent(author, permlink, (e, p) => {
      if (e) return reject(e);
      resolve(p);
    });
  });
}

export function getDiscussionsByBlog(query: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    steem.api.getDiscussionsByBlog(query, (e, props) => {
      if (e) return reject(e);
      resolve(props);
    })
  });
}

export function getDynamicGlobalProperties(): Promise<any> {
  return new Promise((resolve, reject) => {
    steem.api.getDynamicGlobalProperties((e, props) => {
      if (e) return reject(e);
      resolve(props);
    })
  });
}

export function getAccounts(...accounts: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    steem.api.getAccounts(accounts, (e, accs) => {
      if (e) return reject(e);
      resolve(accs);
    });
  });
}

export function getCurrentMedianHistoryPrice(): Promise<any> {
  return new Promise((resolve, reject) => {
    steem.api.getCurrentMedianHistoryPrice((e, price) => {
      if (e) return reject(e);
      resolve(price);
    });
  });
}

export function getRewardFund(): Promise<any> {
  return new Promise((resolve, reject) => {
    steem.api.getRewardFund('post', (e, fund) => {
      if (e) return reject(e);
      resolve(fund);
    });
  });
}

export const formatter = steem.formatter;
export const broadcast = steem.broadcast;

export default steem.api;

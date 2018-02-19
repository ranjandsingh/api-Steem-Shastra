import {
  getCurrentMedianHistoryPrice,
  getDynamicGlobalProperties,
  getRewardFund,
  getAccounts
} from '../server/steemAPI';
import { Decimal } from 'decimal.js';
import * as assert from 'assert';

export class Account {

  constructor(private accData: any) {
  }

  public async estimatePayout(weight: number): Promise<number> {
    await this.refreshCache();
    weight = Math.abs(weight);

    const votingPower = this.getRecoveredPower();
    const effectiveShares = this.getEffectiveShares();

    const rewardFund = await getRewardFund();
    const fundPerShare = new Decimal(rewardFund.reward_balance.split(' ')[0])
                              .div(rewardFund.recent_claims);

    // vote_power_reserve_rate * STEEMIT_VOTE_REGENERATION_SECONDS / (60*60*24)
    const props = await getDynamicGlobalProperties();
    const maxVoteDenom = props.vote_power_reserve_rate * 5;

    // (used_power + max_vote_denom - 1) / max_vote_denom;
    let usedPower = new Decimal(votingPower).mul(weight).div(10000);
    usedPower = usedPower.add(maxVoteDenom).sub(1).div(maxVoteDenom);

    const median = new Decimal((await getCurrentMedianHistoryPrice()).base.split(' ')[0]);
    const rshares = new Decimal(effectiveShares).mul(usedPower).mul(100).round();
    return fundPerShare.mul(rshares).mul(median).mul(100).round().div(100).toNumber();
  }

  public async estimateWeight(payout: number): Promise<number> {
    const fullPayout = await this.estimatePayout(10000);
    assert(fullPayout >= payout, 'maximum current payout is '
                                  + fullPayout + ' but wanted ' + payout);
    return new Decimal(payout).div(fullPayout).mul(10000).round().toNumber();
  }

  public static async get(account: string): Promise<Account> {
    const acc = (await getAccounts(account))[0];
    assert(acc, 'account not found');
    return new Account(acc);
  }

  public getRecoveredPower(): Decimal {
    let power = new Decimal(this.accData.voting_power);
    {
      const lastVote = new Date(this.accData.last_vote_time + 'Z').getTime() / 1000;
      const now = Date.now() / 1000;
      power = power.add(new Decimal(now - lastVote).mul(0.023148148));
    }
    return power.gt(10000) ? new Decimal(10000) : power;
  }

  public getEffectiveShares(): Decimal {
    const shares = new Decimal(this.accData.vesting_shares.split(' ')[0]);
    const delegated = new Decimal(this.accData.delegated_vesting_shares.split(' ')[0]);
    const received = new Decimal(this.accData.received_vesting_shares.split(' ')[0]);
    return shares.sub(delegated).add(received);
  }

  private async refreshCache() {
    this.accData = (await getAccounts(this.accData.name))[0];
  }
}

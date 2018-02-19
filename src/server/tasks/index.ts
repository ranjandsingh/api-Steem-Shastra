import {runTask as sessionTask} from './sessions';

export async function start() {
  setInterval(async () => {
    try {
      await sessionTask();
    } catch (e) {
      console.log('Unexpected error running `sessions` task', e);
    }
  }, 1000 * 60 * 60);
}

import config from '../../config/config';
import * as request from 'superagent';

export async function getGithubRepo(name: string) {
  name = name.toLowerCase();
  return (await request.get(`https://api.github.com/repos/${name}`, {
    deadline: 5000
  }).query({
    client_id: config.credentials.githubClientId,
    client_secret: config.credentials.githubSecret
  })).body;
}

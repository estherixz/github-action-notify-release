'use strict'
const github = require('@actions/github')
const { isSomeCommitStale } = require('./time-utils.js')

async function getLatestRelease(token) {
  try {
    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo

    const { data } = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    })
    return data
  } catch (error) {
    // no release found
  }
}

async function getUnreleasedCommits(token, latestReleaseDate, notifyDate) {
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const { data: unreleasedCommits } = await octokit.request(
    `GET /repos/{owner}/{repo}/commits`,
    {
      owner,
      repo,
      since: latestReleaseDate,
    }
  )
  console.log('unreleasedCommits: ', JSON.stringify(unreleasedCommits, null, 4))
  return isSomeCommitStale(unreleasedCommits, notifyDate)
    ? unreleasedCommits
    : []
}

module.exports = {
  getLatestRelease,
  getUnreleasedCommits,
}

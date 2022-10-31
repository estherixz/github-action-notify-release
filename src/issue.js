'use strict'
const github = require('@actions/github')
const { logInfo } = require('./log')

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
const handlebars = require('handlebars')

const ISSUE_LABEL = 'notify-release'
const ISSUE_TITLE = 'Release pending!'
const STATE_OPEN = 'open'
const STATE_CLOSED = 'closed'
const SNOOZE_ISSUE_TITLE = 'Reminder: Release pending!'

function registerHandlebarHelpers(config) {
  const { commitMessageLines } = config
  handlebars.registerHelper('commitMessage', function (content) {
    if (!commitMessageLines || commitMessageLines < 0) {
      return content
    }
    return content.split('\n').slice(0, commitMessageLines).join('\n').trim()
  })
  handlebars.registerHelper('substring', function (content, characters) {
    return (content || '').substring(0, characters)
  })
}

async function renderIssueBody(data) {
  const templateFilePath = path.resolve(__dirname, 'issue.template.hbs')
  const templateStringBuffer = await readFile(templateFilePath)
  const template = handlebars.compile(templateStringBuffer.toString())
  return template(data)
}

async function createIssue(token, issueBody, title = ISSUE_TITLE) {
  const octokit = github.getOctokit(token)

  return octokit.rest.issues.create({
    ...github.context.repo,
    title,
    body: issueBody,
    labels: [ISSUE_LABEL],
  })
}

async function getLastOpenPendingIssue(token) {
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const pendingIssues = await octokit.request(
    `GET /repos/{owner}/{repo}/issues`,
    {
      owner,
      repo,
      creator: 'app/github-actions',
      state: STATE_OPEN,
      sort: 'created',
      direction: 'desc',
      labels: ISSUE_LABEL,
    }
  )

  return pendingIssues.data.length ? pendingIssues.data[0] : null
}

async function updateLastOpenPendingIssue(token, issueBody, issueNo) {
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const updatedIssue = await octokit.request(
    `PATCH /repos/{owner}/{repo}/issues/${issueNo}`,
    {
      owner,
      repo,
      title: ISSUE_TITLE,
      body: issueBody,
    }
  )

  return updatedIssue.data.length ? updatedIssue.data[0] : null
}

async function createOrUpdateIssue(
  token,
  unreleasedCommits,
  pendingIssue,
  latestRelease,
  commitMessageLines,
  title
) {
  registerHandlebarHelpers({
    commitMessageLines,
  })
  const issueBody = await renderIssueBody({
    commits: unreleasedCommits,
    latestRelease,
  })
  if (pendingIssue) {
    await updateLastOpenPendingIssue(token, issueBody, pendingIssue.number)
    logInfo(`Issue ${pendingIssue.number} has been updated`)
  } else {
    const issueNo = await createIssue(token, issueBody, title)
    logInfo(`New issue has been created. Issue No. - ${issueNo}`)
  }
}

async function closeIssue(token, issueNo) {
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  await octokit.request(`PATCH /repos/{owner}/{repo}/issues/${issueNo}`, {
    owner,
    repo,
    state: STATE_CLOSED,
  })
  logInfo(`Closed issue no. - ${issueNo}`)
}

async function getLastClosedNotifyIssue(token, latestReleaseDate, staleDays) {
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  const closedNotPlannedIssues = await octokit.request(
    `GET /repos/{owner}/{repo}/issues`,
    {
      owner,
      repo,
      creator: 'app/github-actions',
      state: STATE_CLOSED,
      sort: 'created',
      state_reason: 'not_planned',
      direction: 'desc',
      labels: ISSUE_LABEL,
      since: latestReleaseDate,
    }
  )

  if (!closedNotPlannedIssues.data.length) return

  const notifyCloseDate = new Date(
    closedNotPlannedIssues.data[0].closed_at
  ).getTime()

  const staleDate = new Date().getTime() - staleDays * 24 * 60 * 60 * 1000
  if (notifyCloseDate < staleDate) {
    return closedNotPlannedIssues.data[0]
  }
}

module.exports = {
  createIssue,
  getLastOpenPendingIssue,
  updateLastOpenPendingIssue,
  createOrUpdateIssue,
  closeIssue,
  getLastClosedNotifyIssue,
  SNOOZE_ISSUE_TITLE,
}

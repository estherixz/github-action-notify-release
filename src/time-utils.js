'use strict'
const ms = require('ms')
const { logWarning, logInfo } = require('./log')

function notifyAfterToMs(input) {
  const stringToMs = ms(input)

  if (isNaN(stringToMs)) {
    throw new Error('Invalid time value')
  }

  return Date.now() - stringToMs
}

/** @deprecated */
function staleDaysToStr(days) {
  return `${days} day${days > 1 ? 's' : ''}`
}

function isSomeCommitStale(commits, notifyDate) {
  return commits.some((commit) => {
    return isStale(commit.commit.committer.date, notifyDate)
  })
}

function isStale(date, notifyDate) {
  return new Date(date).getTime() < notifyDate
}

function parseNotifyAfter(notifyAfter, staleDays) {
  logInfo(`notify-after: ${notifyAfter}`)

  if (!notifyAfter && !staleDays) {
    return '7 days'
  }

  if (notifyAfter) {
    return isNaN(Number(notifyAfter)) ? notifyAfter : `${notifyAfter} ms`
  }

  logWarning(
    'stale-days option is deprecated and will be removed in the next major release'
  )

  return isNaN(Number(staleDays)) ? staleDays : staleDaysToStr(staleDays)
}

function getNotifyDate(input) {
  const stringToMs = ms(input)

  if (isNaN(stringToMs)) {
    throw new Error('Invalid time value')
  }

  return new Date(Date.now() + stringToMs)
}

module.exports = {
  isSomeCommitStale,
  isStale,
  parseNotifyAfter,
  notifyAfterToMs,
  getNotifyDate,
  staleDaysToStr,
}

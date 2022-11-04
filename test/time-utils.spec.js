'use strict'

const {
  staleDaysToMs,
  isCommitStale,
  isStale,
  daysToMs,
} = require('../src/time-utils.js')

const {
  allCommitsData: allCommits,
  closedNotifyIssuesNeverStale,
  closedNotifyIssues,
} = require('./testData')

test('convert stale days correctly', () => {
  const now = new Date()
  const spy = jest.spyOn(global, 'Date').mockImplementation(() => now)

  const sevenDaysAgo = staleDaysToMs(7)
  expect(sevenDaysAgo).toEqual(now.getTime() - daysToMs(7))

  const defaultStaleDate = () => staleDaysToMs()
  expect(defaultStaleDate).toThrow()

  const oneHourAgo = staleDaysToMs('1 hour')
  expect(oneHourAgo).toEqual(now.getTime() - 60 * 60 * 1000)
  spy.mockRestore()
})

test('there are commits before stale date', () => {
  const noStaleCommit = isCommitStale(
    allCommits.data,
    new Date('2000-04-26').getTime()
  )
  expect(noStaleCommit).toBe(false)

  expect(isCommitStale([], Date.now())).toBe(false)

  const stale = isCommitStale(allCommits.data, new Date().getTime())

  expect(stale).toBe(true)
})

test('there are closed notify before stale date', () => {
  const noStaleIssues = isStale(
    closedNotifyIssuesNeverStale,
    new Date('2000-04-26').getTime()
  )

  expect(noStaleIssues).toBe(false)

  const stale = isStale(closedNotifyIssues[0].closed_at, Date.now())

  expect(stale).toBe(true)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { pageMetadata } from '../pageMetadata.js'
import {
  siteNavigation,
  siteOverviewParagraphs,
  staticPageContentForRoute,
} from '../staticPageContent.js'

test('every indexable route has substantial static fallback content', () => {
  Object.keys(pageMetadata).forEach((route) => {
    const content = staticPageContentForRoute(route)
    const wordCount = [...content.paragraphs, ...siteOverviewParagraphs]
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .length

    assert.ok(content.heading, `${route} needs a static H1`)
    assert.ok(wordCount >= 130, `${route} static copy is only ${wordCount} words`)
  })
})

test('site navigation links every primary route', () => {
  const navigationRoutes = new Set(siteNavigation.map(([route]) => route))

  Object.keys(pageMetadata).forEach((route) => {
    if (!route.startsWith('/articles/')) {
      assert.equal(navigationRoutes.has(route), true, `${route} is missing from site navigation`)
    }
  })
})

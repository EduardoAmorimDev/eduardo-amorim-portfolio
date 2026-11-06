import { expect, test } from './fixtures'

// why: the user, 2026-11-06: the console showed GET /favicon.ico 404;
// browsers request it on their own, so the one icon lives at that path.
test('the default /favicon.ico answers with an icon', async ({ request }) => {
  const response = await request.get('/favicon.ico')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('icon')
})

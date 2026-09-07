# Dispatch browser tests

Run from the repository root:

```sh
pnpm exec playwright install chromium
pnpm exec playwright test --config e2e/dispatch.config.ts
```

The dedicated config starts Vite on `127.0.0.1:4175` with a fictional Supabase
endpoint and a dummy publishable key. Tests inject a fictional admin session,
intercept all backend responses and writes, block external HTTP requests and
WebSockets, and disable service workers. Production credentials and data are
never needed. The application's real authentication and subscription guards run
against these fixtures unchanged.

The test clock is 8 September 2026, 10:30 in Stockholm. Desktop and mobile
screenshots are written to `test-results/dispatch`; failures also retain traces.
An existing Chromium executable can be selected using
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

For an interactive inspection of the same fictional data, run
`node e2e/preview-dispatch.ts` with Node 24+ and connect a browser automation tool
to CDP port `9227`. This occupies port `4175`, so stop it before running tests.
The preview uses a temporary browser profile and closes with Ctrl-C.

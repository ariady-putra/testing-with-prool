# Testing with Prool

Example on how to run E2E tests in a mock environment using [Prool](https://github.com/wevm/prool).

## Setup

```bash
pnpm i
```

For a more indepth tutorial, checkout the docs at: https://docs.pimlico.io/guides/how-to/testing/prool

## Run tests

Set fork url at `.env` (optional)
```env
FORK_RPC_URL=...
```

```bash
pnpm test
```

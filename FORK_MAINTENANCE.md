# Async23 fork maintenance

This fork follows official `ChromeDevTools/chrome-devtools-mcp` release tags
and carries one behavioral difference: visible-browser users may pass
`--no-emulate-focused-pages`.

## Policy

- Each patched release uses a versioned branch such as `alfheim/v1.6.0`.
- `.alfheim/upstream-release` records the exact official base tag.
- The upstream default remains unchanged: focused-page emulation is enabled.
- Publishing is manual and requires native macOS fullscreen verification.
- An incompatible upstream change must fail the update instead of silently
  dropping the patch.

## Preparing a new upstream release

1. Fetch the new official release tag in the local upstream clone.
2. Create a new worktree and `alfheim/vX.Y.Z` branch from that tag.
3. Cherry-pick the fork-only commits from the previous patched release.
4. Update `.alfheim/upstream-release`.
5. Run `npm ci`, `npm run format`, and `npm run test`.
6. Verify native macOS fullscreen against the visible Chrome Debug instance.
7. Push the versioned branch and wait for CI.
8. Make the new branch the fork default, then manually run the release workflow.

If upstream ships `--no-emulate-focused-pages`, remove this patch and return
clients to the official package.

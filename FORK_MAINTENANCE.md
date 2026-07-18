# Async23 fork maintenance

This fork follows official `ChromeDevTools/chrome-devtools-mcp` release tags
and publishes the patched package as `@async23/chrome-devtools-mcp`.

The fork currently carries these user-visible changes:

- Visible-browser users may pass `--no-emulate-focused-pages`.
- Oversized full-page screenshots are resized or compressed before they are
  returned to the MCP client.

## Policy

- Each patched release uses a versioned branch such as `alfheim/v1.6.0`.
- `.alfheim/upstream-release` records the exact official base tag.
- The upstream default remains unchanged: focused-page emulation is enabled.
- A release tag and its npm package must be built from the same clean commit.
- npm versions are immutable; never reuse a published version for a later
  revision.
- Publishing is manual and requires native macOS fullscreen, package, and
  screenshot verification.
- An incompatible upstream change must fail the update instead of silently
  dropping the patch.

## Preparing a new upstream release

1. Fetch the new official release tag in the local upstream clone.
2. Create a new worktree and `alfheim/vX.Y.Z` branch from that tag.
3. Cherry-pick the fork-only commits from the previous patched release.
4. Update `.alfheim/upstream-release`.
5. Update the package version, package references, and fork documentation.
6. Run `npm ci`, `npm run format`, `npm run test`, `npm run bundle`, and
   `npm run verify-npm-package`.
7. Verify native macOS fullscreen and oversized screenshots against the visible
   Chrome Debug instance.
8. Commit the complete release state, push the versioned branch, and wait for
   CI.
9. Publish `@async23/chrome-devtools-mcp` and create the GitHub Release from
   that same commit.

When upstream ships an equivalent fork change, remove that patch independently.
Return clients to the official package only after all fork-only behavior is
available upstream.

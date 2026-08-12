---
name: ship-release
description: Prep and publish a nostr-zap npm release (version bump, build, SRI README update, tag, npm publish, push). Use when the user asks to ship, release, publish, or cut a new version of nostr-zap.
---

# Ship nostr-zap release

Checklist-driven release for this npm package. Do not skip steps. Stop and ask if anything is unclear or blocked.

## Preconditions

- Clean `main`, up to date with `origin/main`
- Intended changes already merged
- Confirm the new semver with the user before editing files:
  - patch: bug fixes / hardening
  - minor: new features, backward compatible
  - major: breaking changes
- `npm whoami` must succeed before `npm publish`. If not logged in, pause and ask the user to run `npm login` (interactive; agent cannot complete it).

## Workflow

Copy and track:

```
Release Progress:
- [ ] 1. Confirm version
- [ ] 2. Bump package version
- [ ] 3. Build
- [ ] 4. Update README CDN + SRI
- [ ] 5. Commit version bump
- [ ] 6. Tag
- [ ] 7. npm publish
- [ ] 8. Push commit + tag
- [ ] 9. Verify
```

### 1. Confirm version

- Read current version from `package.json`
- Summarize commits since the latest `v*` tag (`git log vX.Y.Z..HEAD --oneline`)
- Propose patch / minor / major and get explicit user OK

### 2. Bump package version

Update version in both:

- `package.json` → `"version"`
- `package-lock.json` → top-level `"version"` and `packages[""].version`

Do not change dependency versions.

### 3. Build

```bash
npm run build
```

Confirm `dist/main.js` exists and was regenerated.

### 4. Update README CDN + SRI

README pins jsDelivr **`dist/main.js`** (not `main.min.js`) with an `integrity` hash. See `.cursor/BUGBOT.md`.

1. Compute SRI from the **local** build:

```bash
openssl dgst -sha384 -binary dist/main.js | openssl base64 -A
```

2. In `README.md`, update the script tag:

- `src` version: `https://cdn.jsdelivr.net/npm/nostr-zap@VERSION/dist/main.js`
- `integrity`: `sha384-<base64 from step 1>`
- keep `crossorigin="anonymous"`

Do this **before** publish so the committed docs match the tarball.

### 5. Commit version bump

Stage: `package.json`, `package-lock.json`, `README.md` (and `dist/` only if it is tracked).

Commit message is **only the semver**, matching history:

```bash
git commit -m "$(cat <<'EOF'
X.Y.Z

EOF
)"
```

Only commit when the user asked to ship/release (this skill counts as that ask).

### 6. Tag

Annotated tag on the release commit:

```bash
git tag -a vX.Y.Z -m "X.Y.Z"
```

### 7. npm publish

```bash
npm whoami   # must succeed
npm publish
```

Requires network. If auth fails, stop; do not push the tag until publish succeeds (or ask the user whether to push anyway).

### 8. Push commit + tag

```bash
git push origin main
git push origin vX.Y.Z
```

### 9. Verify

- `npm view nostr-zap version` → new version
- jsDelivr URL loads (may lag briefly):  
  `https://cdn.jsdelivr.net/npm/nostr-zap@X.Y.Z/dist/main.js`
- Report: version, npm URL, tag, and that README SRI was updated

## Do not

- Force-push tags or rewrite release history
- Publish with a dirty unrelated working tree
- Pin or document `main.min.js` with `integrity`
- Skip the SRI update when bumping the README version
- Create a GitHub Release unless the user asks

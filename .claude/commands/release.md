# Release Command

Execute release workflow for wt package.

## Usage

```
/release [version] [--skip-tests] [--skip-npm]
```

## Arguments

- `version`: Semantic version number (e.g., 1.2.2, 1.3.0, 2.0.0)
  - If not provided, will prompt for version type (patch/minor/major)
- `--skip-tests`: Skip test execution (not recommended)
- `--skip-npm`: Skip npm publish step

## Release Workflow

You are executing a release workflow for the @ry-itto/wt npm package. Follow these steps carefully:

### 1. Pre-Release Validation

- [ ] Verify current branch is `main`
- [ ] Verify working directory is clean (no uncommitted changes)
- [ ] Verify all tests pass: `npm test`
- [ ] Check if version number is valid semver format

### 2. Version Update

**Current version**: Read from package.json

**New version**: $1 (or prompt user to select: patch/minor/major)

- [ ] Update `package.json` version field
- [ ] Update `package-lock.json` (run `npm install` to sync)

### 3. CHANGELOG Update

- [ ] Read current CHANGELOG.md
- [ ] Move all items from `## [Unreleased]` section to new `## [${NEW_VERSION}] - ${DATE}` section
- [ ] Keep the `## [Unreleased]` section empty for future changes
- [ ] Ensure date format: YYYY-MM-DD

**CHANGELOG Format:**
```markdown
## [Unreleased]

## [${NEW_VERSION}] - ${TODAY}

### Added
- (items from Unreleased)

### Changed
- (items from Unreleased)

### Fixed
- (items from Unreleased)

### Security
- (items from Unreleased)
```

### 4. Build and Test

- [ ] Run clean build: `npm run clean && npm run build`
- [ ] Run full test suite: `npm test` (unless --skip-tests)
- [ ] Verify build artifacts in `dist/` directory

### 5. Git Operations

- [ ] Stage changes: `git add package.json package-lock.json CHANGELOG.md`
- [ ] Create commit: `git commit -m "chore(release): v${NEW_VERSION}"`
- [ ] Create git tag: `git tag -a v${NEW_VERSION} -m "Release v${NEW_VERSION}"`
- [ ] Push changes: `git push origin main`
- [ ] Push tag: `git push origin v${NEW_VERSION}`

### 6. GitHub Release

- [ ] Extract release notes from CHANGELOG.md for the new version
- [ ] Create GitHub release using `gh release create`:

```bash
gh release create v${NEW_VERSION} \
  --title "v${NEW_VERSION}" \
  --notes "${RELEASE_NOTES}"
```

### 7. npm Publish (Optional)

If `--skip-npm` is NOT specified:

- [ ] Verify npm login: `npm whoami`
- [ ] Publish to npm: `npm publish --access public`
- [ ] Verify package on npm: https://www.npmjs.com/package/@ry-itto/wt

### 8. Post-Release

- [ ] Verify GitHub release: https://github.com/ry-itto/wt/releases
- [ ] Verify npm package (if published): https://www.npmjs.com/package/@ry-itto/wt
- [ ] Create summary message with release links

## Error Handling

If any step fails:
1. Stop the release process immediately
2. Report the error to the user
3. Provide rollback instructions if needed:
   - Delete local tag: `git tag -d v${VERSION}`
   - Delete remote tag: `git push origin :refs/tags/v${VERSION}`
   - Reset commit: `git reset --hard HEAD~1`

## Success Message

On successful release, display:

```
✅ Release v${NEW_VERSION} completed successfully!

📦 Package: https://www.npmjs.com/package/@ry-itto/wt/v/${NEW_VERSION}
🏷️  GitHub Release: https://github.com/ry-itto/wt/releases/tag/v${NEW_VERSION}

Next steps:
- Announce the release on social media
- Update documentation if needed
```

## Notes

- Always run from the project root directory
- Ensure you have npm publish permissions for @ry-itto/wt
- Ensure GitHub CLI (gh) is installed and authenticated
- This command uses semver versioning
- Date format in CHANGELOG: YYYY-MM-DD (e.g., 2025-10-08)

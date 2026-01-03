# Project Implementation Guide

## Part 1: Version Bump and Changelog Update

### Objective
Update the project version and maintain proper changelog documentation.

### Tasks

1. **Determine Version Bump**
   - Read the current version from the project files
   - Analyze the changes being implemented to determine the appropriate semantic version bump:
     - **MAJOR** (x.0.0): Breaking changes, incompatible API changes
     - **MINOR** (0.x.0): New features, backwards-compatible functionality
     - **PATCH** (0.0.x): Bug fixes, backwards-compatible fixes
   - Apply the appropriate bump to the current version
   - Update version in relevant files (package.json, version files, etc.)

2. **Changelog Entry**
   - Write a short to medium keepachangelog message describing the change
   - Do NOT mention the stage, phase, or part in the message
   - Follow keepachangelog format standards

3. **Update Documentation**
   - Update `changelog.md` with:
     - The new version number you calculated
     - Keepachangelog style message
   - Update the project tracking file (if present) and check off the appropriate sections
     - This could be TEST.md, TODO.md, ROADMAP.md, or similar
     - If no tracking file exists, skip this step

4. **Git Commit**
   - Commit changes using the changelog message as the commit message
   - Do NOT sign as Claude Code
   - Use standard git commit (no signature flags)

### Implementation Notes
- Follow semantic versioning guidelines (see below)
- Ensure keepachangelog format is maintained
- Verify all checkboxes in project tracking files are properly updated (if such files exist)

### Semantic Versioning Decision Guide

**How to determine which version number to bump:**

1. **Read Current Version First**
   - Check package.json, version files, or other version sources
   - Note the current version (e.g., 0.0.20)

2. **Analyze the Changes**
   - Review what's being implemented in this part/phase
   - Consider the impact on existing functionality

3. **Apply the Rule:**
   - **MAJOR version (x.0.0)** - Increment when you make incompatible API changes
     - Examples: Removing features, changing function signatures, breaking existing integrations
   - **MINOR version (0.x.0)** - Increment when you add functionality in a backwards-compatible manner
     - Examples: New features, new endpoints, additional capabilities
   - **PATCH version (0.0.x)** - Increment when you make backwards-compatible bug fixes
     - Examples: Bug fixes, performance improvements, documentation updates

4. **Pre-1.0.0 Special Case**
   - For versions 0.y.z, the API is not considered stable
   - MINOR version (0.x.0) can include breaking changes
   - PATCH version (0.0.x) is typically for bug fixes and minor additions

5. **Calculate New Version**
   - If current is 0.0.20 and adding a new feature → bump to 0.0.21 (patch) or 0.1.0 (minor)
   - If current is 0.0.20 and fixing a bug → bump to 0.0.21 (patch)
   - If current is 0.5.3 and adding a feature → bump to 0.6.0 (minor) or 0.5.4 (patch in pre-1.0)

### Keepachangelog Format Reference
```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
- New feature description

### Changed
- Modified functionality description

### Fixed
- Bug fix description
```

Where X.Y.Z is the new version number you calculated.

### Git Commit Command Structure
```bash
git add .
git commit -m "Your changelog message here"
```

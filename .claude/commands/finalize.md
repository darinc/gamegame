Execute the complete version bump and commit workflow after completing any implementation task.

**CRITICAL REQUIREMENTS:**
- Write SHORT TO MEDIUM changelog entries (2-5 bullet points MAXIMUM)
- Do NOT mention stage, phase, or part numbers
- Do NOT include detailed coverage statistics or test counts
- Do NOT sign commits as Claude Code
- Do NOT add Co-Authored-By lines
- Do NOT include emoji or "Generated with Claude Code" attribution

**Steps to execute:**

1. **Determine Version Bump**
   - Read the current version from package.json or relevant version file
   - Analyze the changes just implemented
   - Determine the appropriate semantic version bump:
     - MAJOR (x.0.0): Breaking changes, incompatible API changes
     - MINOR (0.x.0): New features, backwards-compatible functionality
     - PATCH (0.0.x): Bug fixes, backwards-compatible fixes
   - For pre-1.0.0 versions: MINOR can include breaking changes, PATCH for fixes
   - Calculate and update the new version number in all relevant files

2. **Write Changelog Entry**
   - Create a SHORT TO MEDIUM keepachangelog entry (2-5 bullet points MAX)
   - Use keepachangelog categories: Added, Changed, Fixed, Removed
   - Keep descriptions concise and high-level
   - Format: `## [X.Y.Z] - YYYY-MM-DD` (use calculated version and current date)

3. **Update Tracking Files**
   - Update the project tracking file that was being worked from (TEST.md, TODO.md, REFACTOR.md, etc.)
   - Check off completed sections using [x]
   - Update any progress indicators
   - If no tracking file was used, skip this step

4. **Git Commit**
   - Stage all changed files: `git add .`
   - Create commit using the changelog entry as the commit message
   - Use format: `git commit -m "Your changelog message"`
   - Keep commit message simple, clear, and in present tense

Execute all steps now.


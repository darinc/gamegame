Manually specify which semantic version number to bump.

**Usage:** `/bump [major|minor|patch]`

**Argument provided:** $ARGUMENTS

Based on the argument "$ARGUMENTS", bump the version accordingly:
- If "major": Increment MAJOR version (x.0.0), reset minor and patch to 0
- If "minor": Increment MINOR version (0.x.0), reset patch to 0
- If "patch": Increment PATCH version (0.0.x)

Read the current version from package.json or relevant version file, apply the specified bump, and update all relevant files.

Do NOT write changelog or commit. Only update the version number.


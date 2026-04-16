<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# scripts

## Purpose
Build and packaging utilities for the project.

## Key Files

| File | Description |
|------|-------------|
| `package-extension.js` | Extension packaging script — currently a placeholder that writes a placeholder text file to `public/extension.zip` instead of creating a real zip bundle |

## For AI Agents

### Working In This Directory
- `npm run package` invokes `package-extension.js`
- The script does NOT produce a real zip; it needs to be replaced with actual bundling logic for production use
- Output goes to `public/extension.zip`

### Common Patterns
- Node.js scripts using `fs` for file operations

## Dependencies

### Internal
- Reads from `extension/` directory (once real packaging is implemented)
- Writes to `public/extension.zip`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->

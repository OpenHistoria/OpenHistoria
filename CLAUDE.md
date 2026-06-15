# Repository Instructions

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commit Message Convention

The `Post to X` GitHub Action reads the latest commit message to create the
tweet. To set specific tweet copy, include a `Tweet:` block in the commit body:

```text
feat: add scenario editor

Tweet: The scenario editor is now live. Build alternate history timelines and
share the turning points that shaped them.
```

If there is no `Tweet:` block, the workflow uses the commit title. Keep the
tweet text public-facing and short enough to fit on X with the commit URL
appended.

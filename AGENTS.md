<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commit Message Convention

The `Post to X` GitHub Action only runs for pushes to `master`. It posts only
when the latest commit message includes a `Tweet:` block. When a commit should
publish specific tweet copy, add the block to the commit body:

```text
feat: add scenario editor

Tweet: The scenario editor is now live. Build alternate history timelines and
share the turning points that shaped them.
```

If the commit body does not include `Tweet:`, the workflow skips posting. Keep
the tweet text ready for public posting and short enough to fit on X with the
commit URL appended.

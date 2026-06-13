#!/usr/bin/env node
// Posts every image in a folder to a Discord channel via an incoming webhook.
// Usage: node post-to-discord.mjs <dir>   (env: DISCORD_WEBHOOK_URL)
// Runs on Node 20+ using global fetch / FormData / Blob, no dependencies.

import { readdir, readFile } from "node:fs/promises"
import { basename, extname, join } from "node:path"

const dir = process.argv[2] ?? "screenshots"
const webhook = process.env.DISCORD_WEBHOOK_URL
if (!webhook) {
  console.error("DISCORD_WEBHOOK_URL is not set.")
  process.exit(1)
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"])

let files
try {
  files = (await readdir(dir))
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort()
} catch (err) {
  console.error(`Could not read ${dir}: ${err.message}`)
  process.exit(1)
}

if (files.length === 0) {
  console.error(`No images found in ${dir}; nothing to post.`)
  process.exit(1)
}

console.log(`Posting ${files.length} image(s) from ${dir} to Discord...`)

// Discord accepts up to 10 attachments per webhook message.
const BATCH = 10
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH)
  const form = new FormData()
  const content =
    i === 0
      ? `Open Historia: ${files.length} screenshot(s) from a live game run.`
      : ""
  form.set("payload_json", JSON.stringify({ content }))
  let n = 0
  for (const file of batch) {
    const buf = await readFile(join(dir, file))
    form.append(`files[${n}]`, new Blob([buf]), basename(file))
    n += 1
  }
  const res = await fetch(webhook, { method: "POST", body: form })
  if (!res.ok) {
    console.error(
      `Discord webhook failed: ${res.status} ${res.statusText}\n${await res.text()}`
    )
    process.exit(1)
  }
  console.log(`Posted batch ${Math.floor(i / BATCH) + 1} (${batch.length}).`)
}

console.log("Done.")

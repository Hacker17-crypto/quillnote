// Restore the exact original icon from its text-safe source backup.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const source = path.join(__dirname, '../build/icon.png.base64')
const icon = Buffer.from(fs.readFileSync(source, 'utf8').trim(), 'base64')
const expected = fs.readFileSync(path.join(__dirname, '../build/icon.sha256'), 'utf8').trim()
if (crypto.createHash('sha256').update(icon).digest('hex') !== expected) {
  throw new Error('The icon backup failed its checksum check')
}
fs.writeFileSync(path.join(__dirname, '../build/icon.png'), icon)
console.log('Original app icon restored and checksum verified.')

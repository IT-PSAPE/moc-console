import { generateKeyPairSync } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [destination, subject] = process.argv.slice(2)
if (!destination || !subject) throw new Error('Usage: node apps/api/scripts/generate-web-push-keys.ts <new-env-file> <mailto:contact@example.com>')
const contact = new URL(subject)
if (!['mailto:', 'https:'].includes(contact.protocol) || !contact.pathname || /[\r\n]/.test(subject)) throw new Error('VAPID subject must be a mailto: or HTTPS contact URL')

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const publicJwk = publicKey.export({ format: 'jwk' })
const privateJwk = privateKey.export({ format: 'jwk' })
if (!publicJwk.x || !publicJwk.y || !privateJwk.d) throw new Error('Unable to export VAPID keys')
const encodedPublicKey = Buffer.concat([Buffer.from([4]), Buffer.from(publicJwk.x, 'base64url'), Buffer.from(publicJwk.y, 'base64url')]).toString('base64url')
const output = `WEB_PUSH_VAPID_PUBLIC_KEY=${encodedPublicKey}\nWEB_PUSH_VAPID_PRIVATE_KEY=${privateJwk.d}\nWEB_PUSH_VAPID_SUBJECT=${subject}\n`
writeFileSync(resolve(destination), output, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
console.info(`Wrote Console push keys to ${resolve(destination)}`)

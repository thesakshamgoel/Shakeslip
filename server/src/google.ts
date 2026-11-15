import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from './env.ts'

/* Verifies a Firebase Auth ID token (signed by Google) without any service-account secret:
   the signature is checked against Google's public keys, and the project, issuer and expiry are checked too. */
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

export type GoogleIdentity = { email: string; name: string }

export async function verifyGoogleToken(idToken: string): Promise<GoogleIdentity | null> {
  const project = env.FIREBASE_PROJECT_ID
  if (!project) return null
  try {
    const { payload } = await jwtVerify(idToken, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project })
    const fb = payload.firebase as { sign_in_provider?: string } | undefined
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
    if (!email || payload.email_verified !== true || fb?.sign_in_provider !== 'google.com') return null
    return { email, name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 80) : email.split('@')[0] }
  } catch { return null }
}

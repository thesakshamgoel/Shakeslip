/* Google sign-in through Firebase Auth. The web config below is public by design (it identifies the project, it is not a secret);
   access is controlled by the authorised domains in the Firebase console. Loaded on demand so it never slows the first page. */
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
export const googleReady = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)

async function sdk() {
  const [{ initializeApp, getApps }, authMod] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  return { ...authMod, auth: authMod.getAuth(getApps()[0] ?? initializeApp(cfg)) }
}
const closedByUser = (e: unknown) => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes((e as { code?: string }).code ?? '')

export type GoogleUser = { name: string; email: string; photo: string }

/* Preview build only (no server): Firebase keeps the person signed in on this device.
   Calls back with the user, or null when signed out. Returns a function that stops watching. */
export async function watchGoogleUser(cb: (u: GoogleUser | null) => void): Promise<() => void> {
  const { auth, onAuthStateChanged } = await sdk()
  return onAuthStateChanged(auth, (u) => cb(u ? { name: u.displayName ?? u.email ?? 'Google user', email: u.email ?? '', photo: u.photoURL ?? '' } : null))
}
export async function googleSignIn(): Promise<void> {
  const { auth, GoogleAuthProvider, signInWithPopup } = await sdk()
  try { await signInWithPopup(auth, new GoogleAuthProvider()) } catch (e) { if (!closedByUser(e)) throw e }
}
export async function googleSignOut(): Promise<void> {
  const { auth, signOut } = await sdk()
  await signOut(auth)
}

/* Opens the Google popup and returns a Firebase ID token for our server to verify. Returns null if the person closes the popup. */
export async function googleIdToken(): Promise<string | null> {
  const { auth, GoogleAuthProvider, signInWithPopup, signOut } = await sdk()
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider())
    const token = await cred.user.getIdToken()
    await signOut(auth)
    return token
  } catch (e) {
    if (closedByUser(e)) return null
    throw e
  }
}

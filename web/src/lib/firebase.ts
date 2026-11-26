/* Google sign-in through Firebase Auth. The web config below is public by design (it identifies the project, it is not a secret);
   access is controlled by the authorised domains in the Firebase console. Loaded on demand so it never slows the first page. */
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
export const googleReady = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)

/* Opens the Google popup and returns a Firebase ID token for our server to verify. Returns null if the person closes the popup. */
export async function googleIdToken(): Promise<string | null> {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] ?? initializeApp(cfg)
  const auth = getAuth(app)
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider())
    const token = await cred.user.getIdToken()
    await signOut(auth)
    return token
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null
    throw e
  }
}

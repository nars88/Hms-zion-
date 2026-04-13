import { redirect } from 'next/navigation'

// Login UI lives at `/` (src/app/page.tsx).
// This route ensures `/login` never 404s and always forwards to the correct page.
export default function LoginRedirectPage() {
  redirect('/')
}


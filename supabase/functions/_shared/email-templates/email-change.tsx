/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText } from './brand-layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail?: string
  newEmail?: string
  email?: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, email, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthBrandLayout
    preview="Thibitisha mabadiliko ya email yako"
    heading="Thibitisha email yako mpya"
    intro={`Tumepokea ombi la kubadilisha email ya akaunti yako kutoka ${oldEmail ?? email ?? 'email ya zamani'} kwenda ${newEmail ?? email ?? 'email mpya'}. Bonyeza kitufe hapa chini kuthibitisha mabadiliko.`}
    ctaUrl={confirmationUrl}
    ctaLabel="Thibitisha Mabadiliko"
    expiryNote="Kiungo hiki kinaisha baada ya saa 24."
  >
    <Text style={inlineText}>
      Kama haukuomba mabadiliko haya, ipuuze email hii na nenosiri lako litabaki salama.
    </Text>
  </AuthBrandLayout>
)

export default EmailChangeEmail

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText } from './brand-layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthBrandLayout
    preview="Thibitisha email yako kuanza Kiduka"
    heading="Karibu Kiduka 👋"
    intro={`Asante kwa kujiandikisha kwa Kiduka — mfumo kamili wa biashara Tanzania. Bonyeza kitufe hapa chini kuthibitisha email yako (${recipient}) na kuanza kutumia akaunti yako.`}
    ctaUrl={confirmationUrl}
    ctaLabel="Thibitisha Email"
    expiryNote="Kiungo hiki kinaisha baada ya saa 24."
  >
    <Text style={inlineText}>
      Ukimaliza kuthibitisha, utaweza kufungua dashboard yako, kusajili bidhaa, na kuanza kuuza mara moja.
    </Text>
  </AuthBrandLayout>
)

export default SignupEmail

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText, codeBox } from './brand-layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthBrandLayout
    preview="Msimbo wako wa uthibitisho wa Kiduka"
    heading="Msimbo wako wa uthibitisho"
    intro="Tumia msimbo huu ili kukamilisha hatua iliyoombwa kwenye Kiduka:"
    expiryNote="Msimbo huu unaisha baada ya dakika 10."
  >
    <Text style={codeBox}>{token}</Text>
    <Text style={inlineText}>
      Kama haukuomba msimbo huu, mtu mwingine anaweza kuwa anajaribu kufikia akaunti yako — badilisha nenosiri lako mara moja.
    </Text>
  </AuthBrandLayout>
)

export default ReauthenticationEmail

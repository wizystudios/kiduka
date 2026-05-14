/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText } from './brand-layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <AuthBrandLayout
    preview="Umealikwa kujiunga na Kiduka"
    heading="Umealikwa Kiduka 🎉"
    intro="Umealikwa kujiunga na timu ya biashara kwenye Kiduka. Bonyeza kitufe hapa chini kukubali mwaliko na kuweka nenosiri lako."
    ctaUrl={confirmationUrl}
    ctaLabel="Kubali Mwaliko"
    expiryNote="Mwaliko huu unaisha baada ya siku 7."
  >
    <Text style={inlineText}>
      Baada ya kukubali, utaweza kuingia mara moja na kuanza kutumia mfumo.
    </Text>
  </AuthBrandLayout>
)

export default InviteEmail

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText } from './brand-layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AuthBrandLayout
    preview="Kiungo chako cha kuingia Kiduka"
    heading="Ingia Kiduka kwa kiungo kimoja"
    intro="Bonyeza kitufe hapa chini ili kuingia moja kwa moja kwenye akaunti yako ya Kiduka — bila kuhitaji nenosiri."
    ctaUrl={confirmationUrl}
    ctaLabel="Ingia Sasa"
    expiryNote="Kiungo hiki kinaisha baada ya saa 1 na kinaweza kutumika mara moja tu."
  >
    <Text style={inlineText}>
      Kama haukuomba kiungo hiki, unaweza kuipuuza email hii kwa usalama.
    </Text>
  </AuthBrandLayout>
)

export default MagicLinkEmail

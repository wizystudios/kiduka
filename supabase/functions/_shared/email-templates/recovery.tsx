/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { AuthBrandLayout, inlineText } from './brand-layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AuthBrandLayout
    preview="Rekebisha nenosiri lako la Kiduka"
    heading="Rekebisha nenosiri lako"
    intro="Tumepokea ombi la kubadilisha nenosiri la akaunti yako ya Kiduka. Bonyeza kitufe hapa chini kuchagua nenosiri jipya."
    ctaUrl={confirmationUrl}
    ctaLabel="Weka Nenosiri Jipya"
    expiryNote="Kiungo hiki kinaisha baada ya saa 1."
  >
    <Text style={inlineText}>
      Kama haukuomba kubadili nenosiri, ipuuze email hii — nenosiri lako halitabadilika.
    </Text>
  </AuthBrandLayout>
)

export default RecoveryEmail

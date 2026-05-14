/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as ownerLoginAlert } from './owner-login-alert.tsx'
import { template as ownerSettingsChanged } from './owner-settings-changed.tsx'
import { template as ownerSubscriptionRequest } from './owner-subscription-request.tsx'
import { template as ownerLargeTransaction } from './owner-large-transaction.tsx'
import { template as ownerLowStock } from './owner-low-stock.tsx'
import { template as ownerNewDebt } from './owner-new-debt.tsx'
import { template as ownerNewSokoniOrder } from './owner-new-sokoni-order.tsx'
import { template as customerOrderConfirmation } from './customer-order-confirmation.tsx'
import { template as customerOrderStatus } from './customer-order-status.tsx'
import { template as customerOrderReceipt } from './customer-order-receipt.tsx'
import { template as customerReviewThanks } from './customer-review-thanks.tsx'
import { template as customerReturnUpdate } from './customer-return-update.tsx'
import { template as ownerComplianceReminder } from './owner-compliance-reminder.tsx'
import { template as ownerPaymentSuccess } from './owner-payment-success.tsx'
import { template as ownerPaymentFailed } from './owner-payment-failed.tsx'
import { template as ownerSubscriptionReminder } from './owner-subscription-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'owner-login-alert': ownerLoginAlert,
  'owner-settings-changed': ownerSettingsChanged,
  'owner-subscription-request': ownerSubscriptionRequest,
  'owner-large-transaction': ownerLargeTransaction,
  'owner-low-stock': ownerLowStock,
  'owner-new-debt': ownerNewDebt,
  'owner-new-sokoni-order': ownerNewSokoniOrder,
  'owner-compliance-reminder': ownerComplianceReminder,
  'owner-payment-success': ownerPaymentSuccess,
  'owner-payment-failed': ownerPaymentFailed,
  'owner-subscription-reminder': ownerSubscriptionReminder,
  'customer-order-confirmation': customerOrderConfirmation,
  'customer-order-status': customerOrderStatus,
  'customer-order-receipt': customerOrderReceipt,
  'customer-review-thanks': customerReviewThanks,
  'customer-return-update': customerReturnUpdate,
}

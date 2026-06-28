# Receipt Validation Flow

All in-app purchase receipts are validated by the TeachLink backend before local subscription state is updated. Client-side validation is not performed at any point.

## Why server-side validation is required

The platform SDKs (StoreKit on iOS, Google Play Billing on Android) return a receipt or purchase token to the client. Without server-side verification, an attacker can:

- **Replay a valid receipt** from a real purchase across multiple accounts
- **Tamper with the purchase response** (via a proxy or patched binary) to inject a successful status
- **Use tools like Freedom (Android) or iAP Cracker (iOS)** to return fake successful purchases that the app cannot distinguish from real ones at the JS layer

Server validation is the only authoritative check. Apple's `/verifyReceipt` endpoint and Google's Play Developer API both have access to the full purchase history and can detect replay, revocation, and fraud.

## Flow diagram

```
User taps "Subscribe"
       │
       ▼
IAP.requestSubscription()   ←── opens native payment sheet
       │
       ▼ (purchase approved by platform)
purchaseUpdatedListener fires with { transactionReceipt }
       │
       ├─ receiptValidationPending === true? → skip (duplicate guard)
       │
       ▼
setReceiptValidationPending(true)
       │
       ▼
POST /api/payments/validate-receipt
  { receipt, platform, productId }
       │
  ┌────┴────────────────────────────────────┐
  │ network error?                          │
  │  retry with exponential back-off        │
  │  attempt 1 → 2 → 3 → 4 (1s, 2s, 4s)   │
  └────┬────────────────────────────────────┘
       │
  ┌────┴──────────────────────────┐
  │ server responds               │
  ├─ valid: true  ────────────────┤
  │   finishTransaction()         │
  │   setSubscriptionTier(tier)   │
  │   AsyncStorage.setItem(tier)  │
  ├─ valid: false ────────────────┤
  │   log rejection error         │
  │   do NOT finishTransaction    │
  ├─ network error after 4 tries ─┤
  │   log network error           │
  │   do NOT finishTransaction    │
  └───────────────────────────────┘
       │
       ▼
setReceiptValidationPending(false)
```

## Key guarantees

| Property | Implementation |
|---|---|
| No client-only acceptance | `validateReceipt` throws on any error; the fallback mock has been removed |
| No double-processing | `receiptValidationPending` flag checked at listener entry |
| Network resilience | Up to 3 retries with exponential back-off (1 s, 2 s, 4 s); non-network errors (4xx / 5xx) are not retried |
| Idempotent server side | The server identifies receipts by `transactionId`; re-submission of the same receipt returns the same result |
| State only updated on confirmation | `setSubscriptionTier` and `finishTransaction` are called only inside the `result.valid === true` branch |

## API contract

### Request

```
POST /api/payments/validate-receipt
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "receipt":   "<base64 receipt (iOS) or purchase token (Android)>",
  "platform":  "ios" | "android",
  "productId": "com.teachlink.subscription.pro.monthly"   // optional
}
```

### Success response

```json
{
  "valid": true,
  "tier": "pro",
  "expiry": "2027-01-15T00:00:00.000Z",
  "productId": "com.teachlink.subscription.pro.monthly"
}
```

### Rejected receipt response

```json
{
  "valid": false,
  "error": "Receipt has already been redeemed"
}
```

The server must return HTTP 200 in both cases. A non-200 response is treated as a server error and triggers the retry path (if network-level) or immediate failure (if 4xx / 5xx).

## Restore Purchases

`restorePurchases()` iterates available purchases from the platform and calls `validateReceipt` for each. Receipts where `valid: false` are silently skipped. Receipts that fail with a network error after all retries cause the whole restore to throw — the user should be shown an error and prompted to retry.

## Subscription state after validation

`subscriptionTier` in `useAppStore` is the source of truth for UI gating. It is set by `_setTier()` only after the server returns `valid: true`. On logout, `subscriptionTier` resets to `'free'`. The tier is also mirrored to `AsyncStorage` for cold-start reads before the store hydrates.

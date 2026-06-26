# Form Value Caching

Client-side caching for reusable form fields (name, email, address, preferences) so users spend less time re-entering the same information across screens.

## Features

- **Persistent cache** — Values stored in AsyncStorage under `@teachlink/form-cache/v1`
- **Shared field keys** — One schema reused by profile edit, registration, and `MobileFormInput`
- **Suggestions** — Non-intrusive chip below focused inputs when a different cached value exists
- **Autofill on empty fields** — `useFormCache` fills only fields that are currently empty
- **Privacy control** — **Settings → Privacy → Clear Cached Form Data** removes all cached values
- **TTL** — Entries expire after **90 days**; expired keys are pruned on read/write

## Cached field keys

| Key                                         | Typical use            |
| ------------------------------------------- | ---------------------- |
| `fullName`                                  | Profile, registration  |
| `email`                                     | Profile, registration  |
| `bio`                                       | Profile                |
| `location`                                  | Profile, address forms |
| `website`                                   | Profile                |
| `phone`                                     | Contact forms          |
| `addressLine1` / `addressLine2`             | Shipping, billing      |
| `city` / `state` / `postalCode` / `country` | Address blocks         |
| `company`                                   | Organization fields    |

## Lifecycle

1. **Write** — On input blur (via `cacheKey` on `MobileFormInput`) or batch `cacheFormValues` after successful form save
2. **Read** — On form open (`applyPrefillToFields`) or input focus (suggestion chip)
3. **Expire** — `updatedAt` + `FORM_CACHE_TTL_MS`; pruned automatically
4. **Clear** — User action in settings or `clearFormCache()` in code/tests

## Implementation map

| Module                                      | Role                                 |
| ------------------------------------------- | ------------------------------------ |
| `src/services/formCache.ts`                 | Storage, TTL, suggestions            |
| `src/hooks/useFormCache.ts`                 | React hook for multi-field forms     |
| `src/components/mobile/MobileFormInput.tsx` | Per-field cache + suggestion UI      |
| `src/pages/mobile/MobileLogin.tsx`          | Cached email prefill in sign-in flow |
| `src/components/mobile/MobileProfile.tsx`   | Profile edit prefill + persist       |
| `src/pages/mobile/MobileRegister.tsx`       | Registration prefill + persist       |
| `src/components/mobile/MobileSettings.tsx`  | Clear cache control                  |

## Testing

```bash
npm run test -- tests/services/formCache.test.ts
npm run test -- tests/hooks/useFormCache.test.ts
```

Manual: edit profile → save → open registration or profile again → confirm suggestions/prefill; clear cache in settings → confirm fields no longer suggest.

## Related issues

- #401 — Form prefilling with cached values
- #5, #91, #132 — Broader UX / forms / persistence workstreams

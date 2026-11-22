# BN_STONE Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Public Read Isolation**: Unauthenticated visitors may read `/products/{productId}` **only** when `resource.data.published == true`. Hidden products (`published == false`) are strictly inaccessible to non-admins for both `get` and `list`.
2. **Admin-Only Mutations**: Only verified admin accounts (`isBootstrapAdmin()` or an existing `/admins/{uid}` document with verified email) may create, update, or delete `/products/{productId}` or modify `/settings/store`.
3. **Immutable Audit Fields**: `createdBy` and `createdAt` on `/products/{productId}` are immutable after creation, and timestamps (`createdAt`, `updatedAt`) must strictly equal `request.time`.
4. **Schema Strictness & Size Bounds**: Every write validates exact allowed keys (`hasAll` + `hasOnly`), field types, allowed categories (`helmets`, `gloves`, `jackets`, `accessories`), non-negative finite prices, and bounded string lengths matching `firebase-blueprint.json`.
5. **No Self-Escalation**: Non-owners cannot create or modify `/admins/{uid}` documents or inject unknown fields.
6. **Public Storefront Settings**: `/settings/store` holds only public non-PII store config (`whatsappPhone`, `currency`, `storeName`, `updatedAt`) and rejects arbitrary setting IDs.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Product Create**: Anonymous visitor attempts `create` on `/products/prod_1`.
2. **Non-Admin Signed-In Product Create**: Random verified Google user attempts `create` on `/products/prod_2`.
3. **Unverified Email Admin Spoof**: Token with owner email but `email_verified == false` attempts `create` on `/products/prod_3`.
4. **Hidden Product Read by Public**: Anonymous visitor attempts `get` on a product where `published == false`.
5. **Unfiltered Product List by Public**: Anonymous visitor attempts `list` on `/products` without `where('published', '==', true)`.
6. **Shadow Field Injection on Create**: Admin attempts `create` on `/products/prod_4` with extra field `featuredRank: 999`.
7. **Shadow Field Injection on Update**: Admin attempts `update` on `/products/prod_4` adding ghost key `isPromoted: true`.
8. **Immutable Field Tampering**: Admin attempts `update` on `/products/prod_4` changing `createdAt` or `createdBy`.
9. **Client Timestamp Forgery**: Admin attempts `create` with client-supplied `createdAt` != `request.time`.
10. **Invalid Category / Value Poisoning**: Admin attempts `create` or `update` with `category: 'cars'` or `price: -50` or `name` > 140 chars.
11. **Path Variable ID Poisoning**: Request targeting `/products/../../../evil` or 200-char document ID.
12. **Privilege Escalation on `/admins`**: Non-bootstrap user attempts `create` on `/admins/{ownUid}` with `{ role: 'admin' }`.

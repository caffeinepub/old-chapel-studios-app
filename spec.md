# Old Chapel Studios App

## Current State
The app is a secure, invite-only, Internet Identity-based community platform for a music studio. It has a working frontend with onboarding, login, admin bootstrap flow, group chats, availability grid, calendar, files, polls, and settings. The backend has all required methods including `bootstrapAdmin`, but the live canister on the network is not running the latest code -- the `bootstrapAdmin` method is consistently rejected with IC0536 (method not found) despite being correctly defined in `main.mo`.

## Requested Changes (Diff)

### Add
- Nothing new; this is a full rebuild to force a fresh canister deployment

### Modify
- Full backend regeneration via `generate_motoko_code` to produce a clean canister with all methods properly compiled and deployed
- Frontend preserved as-is (no UI changes required)

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend Motoko code with all required methods: `bootstrapAdmin`, `isAdminAssigned`, `isCallerRegistered`, `registerWithInviteCode`, `getCallerUserProfile`, `saveCallerUserProfile`, `generateInviteCode`, `getInviteCodes`, `isCallerApproved`, `isCallerAdmin`, `listApprovals`, `setApproval`, `getUserProfile`, `getCallerUserRole`, `assignCallerUserRole`
2. Keep all existing frontend code unchanged
3. Deploy -- fresh canister will have all methods correctly exported

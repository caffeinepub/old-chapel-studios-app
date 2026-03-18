# Old Chapel Studios App

## Current State
The app is fully featured with chat, rooms, availability, events, user management, and admin controls. The backend canister (x5aw4-ryaaa-aaaag-axmna-cai) keeps running out of cycles and stopping. When this happens, any call to `isCallerRegistered` fails with a rejection error that currently surfaces on the login page without user interaction.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Full backend rebuild to get a fresh canister with new cycles
- Improve error handling in App.tsx so that a stopped canister error on the login/checking screen shows a user-friendly message ("Server temporarily unavailable — please try again shortly") rather than the raw rejection error

### Remove
- Old stopped canister

## Implementation Plan
1. Regenerate Motoko backend (preserves all existing features)
2. Update App.tsx to detect the IC0508 canister-stopped error specifically and show a gentle, user-friendly message instead of the raw technical error

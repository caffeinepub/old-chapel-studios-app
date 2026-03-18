# Old Chapel Studios App

## Current State
Full-stack app with Motoko backend and React frontend. The backend canister (x5aw4-ryaaa-aaaag-axmna-cai) has repeatedly stopped due to cycle exhaustion. A full rebuild is needed to get a fresh canister with new cycle allocation.

All existing features must be preserved:
- Hardcoded admin principal: ulyt5-slv4a-xrfbx-seije-74i6r-4nkkh-ydqng-hgdb2-r3tlc-tkvp4-hae
- User registration and login (Internet Identity)
- Group chat with emoji reactions and user profiles
- Room management (Room 1, 2, 3) with admin-only controls
- Admin user management (view, ban/unban, delete members)
- Admin message moderation (delete any message)
- Events/calendar with admin-only deletion
- Room availability with admin-only changes
- Free time slots per room (admin only)

## Requested Changes (Diff)

### Add
- Nothing new — this is a full backend rebuild to get a fresh canister

### Modify
- Rebuild backend from scratch (same code, new canister)

### Remove
- Nothing

## Implementation Plan
1. Regenerate the Motoko backend with all existing methods
2. Deploy frontend pointing to new canister

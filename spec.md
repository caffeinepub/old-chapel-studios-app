# Old Chapel Studios App

## Current State
The backend has a `registerWithInviteCode` function with a hardcoded "999" bootstrap code that, when used before any admin is assigned, grants the caller admin status. The frontend onboarding always requires an invite code for new users.

## Requested Changes (Diff)

### Add
- Backend: `isAdminAssigned()` query — returns true if an admin already exists
- Backend: `bootstrapAdmin(displayName, avatarUrl)` — registers caller as admin, only works when no admin exists yet (fails otherwise)
- Frontend: after login, if user is unregistered, check `isAdminAssigned()`. If false, skip invite code and show a "Set Up as Admin" profile screen. If true, show normal invite code screen.

### Modify
- Backend: remove the "999" code path from `registerWithInviteCode`
- Frontend: OnboardingScreen — add logic to distinguish bootstrap-admin profile setup vs normal member profile setup

### Remove
- The hardcoded "999" bootstrap code entirely

## Implementation Plan
1. Update `main.mo`: add `isAdminAssigned` query, add `bootstrapAdmin` function, remove "999" branch from `registerWithInviteCode`
2. Update `OnboardingScreen.tsx`: after login + not registered, call `isAdminAssigned()`. If false, go to a "bootstrap" profile-setup screen that calls `bootstrapAdmin`. If true, go to invite screen as before.

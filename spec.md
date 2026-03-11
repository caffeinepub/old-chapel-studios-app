# Old Chapel Studios App

## Current State
- OnboardingScreen has invite code pre-filled with "999" and admin name pre-filled with "Lucas"
- Email field exists in both admin-setup and request-to-join screens
- No avatar/profile picture upload on join
- Backend `registerWithInviteCode` does not exist — client-side only code validation
- Returning users are checked via `isCallerApproved()` which traps for unregistered users
- No reliable persistence of user registration tied to Internet Identity principal

## Requested Changes (Diff)

### Add
- `autoComplete="off"` on all login/onboarding input fields to prevent browser autofill
- Mandatory display name input on first join (for all users, not just admin)
- Optional profile picture upload on first join
- Backend `registerWithInviteCode(code, displayName, avatarUrl)` function that validates the invite code, grants the correct role (#admin for bootstrap code "999" when no admin exists, #user otherwise), marks code as used, saves the user profile, and sets approval status to #approved — all in one atomic call
- Backend `isCallerRegistered()` query to check if a principal already has an account (for seamless returning login)
- A unified "profile-setup" screen shared by first-admin and regular invite-code users

### Modify
- Remove pre-filled invite code value ("999") — input starts blank
- Remove pre-filled admin display name ("Lucas") — input starts blank
- Remove all email fields from onboarding screens (Internet Identity handles identity; email not needed)
- App.tsx auth check: use `isCallerRegistered()` to confirm returning users go straight to app without re-entering invite code
- Invite code validation moves from client-side to backend (`registerWithInviteCode`)

### Remove
- `FIRST_ADMIN_EMAIL` constant and all references to `lucas@oldchapelleeds.org`
- Separate "admin-setup" screen — merged into shared profile-setup flow
- Email input fields in request-to-join form

## Implementation Plan
1. Add `isCallerRegistered()` query and `registerWithInviteCode()` shared mutation to `main.mo`
2. Update `OnboardingScreen.tsx`: remove pre-fills, remove email fields, add autoComplete="off", add avatar upload, unify profile-setup screen, call backend `registerWithInviteCode` on submit
3. Update `App.tsx` auth flow to use `isCallerRegistered()` for returning user detection

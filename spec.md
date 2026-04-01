# Old Chapel Studios App

## Current State
The Band page has a fully wired backend with stable variables for bands, invites, gigs, and tasks. All Motoko methods exist and are declared in the IDL. The BandPage frontend calls these methods. However, several actions (remove member, invite member, toggle task, delete task, delete gig) only update local React state optimistically without re-fetching from the backend, and there is no periodic polling to sync data for all band members in real time.

## Requested Changes (Diff)

### Add
- Periodic polling (every 10 seconds) for band data while user is on the Band page and in a band, so all members see updates in real time
- Full backend re-fetch after every mutating action (invite sent, member removed, gig added/edited/deleted, task added/toggled/deleted) to ensure UI reflects true backend state

### Modify
- `handleRemoveMember`: after success, re-fetch members from backend instead of only updating local state
- `handleInviteMember`: after success, confirm by re-fetching band data
- `handleToggleTask`: after success, re-fetch full task list to ensure correct persisted state
- `handleDeleteTask`: after success, re-fetch full task list
- `handleDeleteGig`: after success, re-fetch full gig list
- `loadBandData`: wrap `getGigs`/`getTasks`/`getBandMembers` errors gracefully so a single failure doesn't break the whole load

### Remove
- Nothing removed

## Implementation Plan
1. Add a `useEffect` with `setInterval` (10s) that calls `loadBandData` while `pageState === 'in-band'`
2. Replace optimistic-only local state updates with backend re-fetches after each mutating action
3. Ensure error handling is graceful on load (catch individual sub-fetches)

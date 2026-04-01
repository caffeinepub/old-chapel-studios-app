# Old Chapel Studios App

## Current State
Community posts on the HomePage are stored only in local React state — they disappear on navigation/logout and are not visible to other members.

## Requested Changes (Diff)

### Add
- `CommunityPost` type in the Motoko backend with fields: id, authorPrincipal, authorName, title, content, hashtags, isAnnouncement, timestamp
- `createCommunityPost` backend method (authenticated users)
- `getCommunityPosts` backend query
- `deleteCommunityPost` backend method (admin only)
- Wire the three new methods in IDL declarations, backend.d.ts, and backend.ts
- HomePage loads posts from backend on mount, creates/deletes via backend

### Modify
- `HomePage.tsx`: replace local-state post creation/deletion with backend calls
- `declarations/backend.did.js` and `backend.did.d.ts`: add CommunityPost IDL
- `backend.d.ts`: add CommunityPost type and interface methods
- `backend.ts`: add Backend class methods for community posts

### Remove
- Nothing removed

## Implementation Plan
1. Add CommunityPost type + 3 methods to main.mo
2. Update IDL declarations (backend.did.js, backend.did.d.ts)
3. Update backend.d.ts interface
4. Update backend.ts Backend class
5. Update HomePage.tsx to use backend for posts

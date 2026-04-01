# Old Chapel Studios App

## Current State
Community posts exist with backend persistence, author display name, admin deletion. No reactions or comments on posts yet.

## Requested Changes (Diff)

### Add
- `addPostReaction(postId, emoji)` backend method -- toggles a reaction on/off per user per emoji per post
- `getPostReactions(postId)` backend query -- returns array of (emoji, [Principal])
- `addPostComment(postId, content)` backend method -- saves a comment with author display name, timestamp
- `getPostComments(postId)` backend query -- returns comments for a post in chronological order
- `deletePostComment(commentId)` backend method -- admin-only delete
- Frontend: emoji reaction bar on each post (👍 ❤️ 🔥 😂 😮), grouped with count, toggleable
- Frontend: comment section below each post, expandable, with text input and submit

### Modify
- backend.did.d.ts and backend.did.js to include new types and methods
- Community posts UI to show reactions and comments

### Remove
- Nothing

## Implementation Plan
1. Add PostReaction and PostComment types + stable maps to main.mo
2. Implement addPostReaction, getPostReactions, addPostComment, getPostComments, deletePostComment
3. Regenerate frontend bindings
4. Update CommunityPage/posts component to show reaction bar and comment section

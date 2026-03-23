# Old Chapel Studios App

## Current State
Files are uploaded to blob storage and tracked only in React component state (`useState`). When the user logs out or refreshes, uploaded files disappear because no file metadata is persisted to the backend.

## Requested Changes (Diff)

### Add
- Backend `FileRecord` type storing: id, name, fileType, size, blobHash, downloadUrl, folderId, uploadDate, uploaderPrincipal
- Backend method `saveFileRecord(name, fileType, size, blobHash, downloadUrl, folderId)` — saves metadata for a file
- Backend method `getFileRecords()` — returns all file records visible to the caller (their own files)
- Backend method `deleteFileRecord(id)` — deletes a file record by ID (only the uploader or admin can delete)
- Frontend: on successful upload, call `saveFileRecord` to persist metadata
- Frontend: on page load, call `getFileRecords()` and populate folders with persisted file data
- Frontend: on file delete, call `deleteFileRecord(id)` to remove from backend

### Modify
- `FilesPage.tsx`: replace local-state-only file management with backend-persisted file records; load files from backend on mount; save to backend after upload; delete from backend when deleted

### Remove
- Nothing removed

## Implementation Plan
1. Add `FileRecord` type and three methods (`saveFileRecord`, `getFileRecords`, `deleteFileRecord`) to `src/backend/main.mo`
2. Regenerate backend bindings
3. Update `FilesPage.tsx` to load file records from backend on mount, save on upload, delete on backend delete

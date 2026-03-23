/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type AppUserRole = { 'client' : null } |
  { 'musician' : null } |
  { 'admin' : null } |
  { 'staff' : null };
export type ApprovalStatus = { 'pending' : null } |
  { 'approved' : null } |
  { 'rejected' : null };
export interface FileRecord {
  'id' : bigint,
  'name' : string,
  'fileType' : string,
  'size' : string,
  'blobHash' : string,
  'downloadUrl' : string,
  'folderId' : string,
  'uploadDate' : string,
  'uploaderPrincipal' : Principal,
}
export interface FreeTimeSlot {
  'id' : bigint,
  'timeStart' : string,
  'note' : string,
  'room' : string,
  'dayLabel' : string,
  'timeEnd' : string,
}
export interface InviteCode {
  'created' : Time,
  'code' : string,
  'used' : boolean,
}
export interface Message {
  'id' : bigint,
  'content' : string,
  'channelId' : string,
  'authorName' : string,
  'timestamp' : bigint,
  'authorPrincipal' : Principal,
}
export interface Poll {
  'id' : bigint,
  'title' : string,
  'creator' : Principal,
  'votes' : Array<Principal>,
  'createdAt' : Time,
  'multiSelect' : boolean,
  'isActive' : boolean,
  'anonymous' : boolean,
  'options' : Array<PollOption>,
}
export interface PollOption { 'voteCount' : bigint, 'text' : string }
export interface RSVP {
  'name' : string,
  'inviteCode' : string,
  'timestamp' : Time,
  'attending' : boolean,
}
export interface RoomSlot {
  'hourStart' : bigint,
  'dayOfWeek' : bigint,
  'room' : string,
  'available' : boolean,
  'hourEnd' : bigint,
}
export interface StudioEvent {
  'id' : bigint,
  'startTime' : bigint,
  'title' : string,
  'endTime' : bigint,
  'createdBy' : Principal,
  'room' : [] | [string],
  'description' : string,
}
export type Time = bigint;
export interface UserApprovalInfo {
  'status' : ApprovalStatus,
  'principal' : Principal,
}
export interface UserProfile {
  'status' : UserStatus,
  'shareContact' : boolean,
  'displayName' : string,
  'joinedAt' : bigint,
  'role' : AppUserRole,
  'email' : [] | [string],
  'avatarUrl' : [] | [string],
  'phone' : [] | [string],
}
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export type UserStatus = { 'active' : null } |
  { 'banned' : null } |
  { 'suspended' : null };
export interface _CaffeineStorageCreateCertificateResult {
  'method' : string,
  'blob_hash' : string,
}
export interface _CaffeineStorageRefillInformation {
  'proposed_top_up_amount' : [] | [bigint],
}
export interface _CaffeineStorageRefillResult {
  'success' : [] | [boolean],
  'topped_up_amount' : [] | [bigint],
}
export interface _SERVICE {
  '_caffeineStorageBlobIsLive' : ActorMethod<[Uint8Array], boolean>,
  '_caffeineStorageBlobsToDelete' : ActorMethod<[], Array<Uint8Array>>,
  '_caffeineStorageConfirmBlobDeletion' : ActorMethod<[Array<Uint8Array>], undefined>,
  '_caffeineStorageCreateCertificate' : ActorMethod<[string], _CaffeineStorageCreateCertificateResult>,
  '_caffeineStorageRefillCashier' : ActorMethod<[[] | [_CaffeineStorageRefillInformation]], _CaffeineStorageRefillResult>,
  '_caffeineStorageUpdateGatewayPrincipals' : ActorMethod<[], undefined>,
  '_initializeAccessControlWithSecret' : ActorMethod<[string], undefined>,
  'addFreeTimeSlot' : ActorMethod<[string, string, string, string, string], bigint>,
  'addReaction' : ActorMethod<[bigint, string], undefined>,
  'adminDeleteMessage' : ActorMethod<[bigint], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'banUser' : ActorMethod<[Principal], string>,
  'checkIfCallerIsAdmin' : ActorMethod<[], boolean>,
  'createEvent' : ActorMethod<[string, string, bigint, bigint, [] | [string]], bigint>,
  'createPoll' : ActorMethod<[string, Array<string>, boolean, boolean], bigint>,
  'deleteEvent' : ActorMethod<[bigint], undefined>,
  'deleteFileRecord' : ActorMethod<[bigint], undefined>,
  'deleteMessage' : ActorMethod<[bigint], undefined>,
  'deletePoll' : ActorMethod<[bigint], undefined>,
  'generateInviteCode' : ActorMethod<[], string>,
  'getAllPolls' : ActorMethod<[], Array<Poll>>,
  'getAllRSVPs' : ActorMethod<[], Array<RSVP>>,
  'getAllUsers' : ActorMethod<[], Array<[Principal, UserProfile]>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getEvents' : ActorMethod<[], Array<StudioEvent>>,
  'getFileRecords' : ActorMethod<[], Array<FileRecord>>,
  'getFreeTimeSlots' : ActorMethod<[], Array<FreeTimeSlot>>,
  'getInviteCodes' : ActorMethod<[], Array<InviteCode>>,
  'getMessages' : ActorMethod<[string], Array<Message>>,
  'getPoll' : ActorMethod<[bigint], [] | [Poll]>,
  'getPollResults' : ActorMethod<[bigint], [] | [{ 'results' : Array<bigint>, 'hasVoted' : boolean, 'options' : Array<PollOption> }]>,
  'getReactions' : ActorMethod<[bigint], Array<[string, Array<Principal>]>>,
  'getRoomAvailability' : ActorMethod<[], Array<RoomSlot>>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getUserVotes' : ActorMethod<[bigint], Array<bigint>>,
  'hasVotedInPoll' : ActorMethod<[bigint], boolean>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'isCallerApproved' : ActorMethod<[], boolean>,
  'isCallerRegistered' : ActorMethod<[], boolean>,
  'listApprovals' : ActorMethod<[], Array<UserApprovalInfo>>,
  'postMessage' : ActorMethod<[string, string], bigint>,
  'register' : ActorMethod<[string, [] | [string]], undefined>,
  'removeFreeTimeSlot' : ActorMethod<[bigint], undefined>,
  'removeUser' : ActorMethod<[Principal], string>,
  'requestApproval' : ActorMethod<[], undefined>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'saveFileRecord' : ActorMethod<[string, string, string, string, string, string, string], bigint>,
  'setApproval' : ActorMethod<[Principal, ApprovalStatus], undefined>,
  'setRoomAvailability' : ActorMethod<[Array<RoomSlot>], undefined>,
  'submitRSVP' : ActorMethod<[string, boolean, string], undefined>,
  'unbanUser' : ActorMethod<[Principal], string>,
  'vote' : ActorMethod<[bigint, Array<bigint>], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

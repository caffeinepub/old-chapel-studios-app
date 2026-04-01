import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface StudioEvent {
    id: bigint;
    startTime: bigint;
    title: string;
    endTime: bigint;
    createdBy: Principal;
    room?: string;
    description: string;
}
export interface Poll {
    id: bigint;
    title: string;
    creator: Principal;
    votes: Array<Principal>;
    createdAt: Time;
    multiSelect: boolean;
    isActive: boolean;
    anonymous: boolean;
    options: Array<PollOption>;
}
export interface InviteCode {
    created: Time;
    code: string;
    used: boolean;
}
export interface RoomSlot {
    hourStart: bigint;
    dayOfWeek: bigint;
    room: string;
    available: boolean;
    hourEnd: bigint;
}
export interface RSVP {
    name: string;
    inviteCode: string;
    timestamp: Time;
    attending: boolean;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface CommunityPost {
    id: bigint;
    title: string;
    content: string;
    hashtags: Array<string>;
    authorName: string;
    isAnnouncement: boolean;
    timestamp: bigint;
    authorPrincipal: Principal;
}
export interface FreeTimeSlot {
    id: bigint;
    timeStart: string;
    note: string;
    room: string;
    dayLabel: string;
    timeEnd: string;
}
export interface PostComment {
    id: bigint;
    content: string;
    authorName: string;
    timestamp: bigint;
    authorPrincipal: Principal;
    postId: bigint;
}
export interface PollOption {
    voteCount: bigint;
    text: string;
}
export interface Message {
    id: bigint;
    content: string;
    channelId: string;
    authorName: string;
    timestamp: bigint;
    authorPrincipal: Principal;
}
export interface FileRecord {
    id: bigint;
    name: string;
    size: string;
    downloadUrl: string;
    fileType: string;
    blobHash: string;
    uploaderPrincipal: Principal;
    folderId: string;
    uploadDate: string;
}
export interface UserProfile {
    status: UserStatus;
    shareContact: boolean;
    displayName: string;
    joinedAt: bigint;
    role: AppUserRole;
    email?: string;
    avatarUrl?: string;
    phone?: string;
}
export enum AppUserRole {
    client = "client",
    musician = "musician",
    admin = "admin",
    staff = "staff"
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserStatus {
    active = "active",
    banned = "banned",
    suspended = "suspended"
}
export interface backendInterface {
    addFreeTimeSlot(room: string, dayLabel: string, timeStart: string, timeEnd: string, note: string): Promise<bigint>;
    addPostComment(postId: bigint, content: string): Promise<bigint>;
    addPostReaction(postId: bigint, emoji: string): Promise<void>;
    addReaction(messageId: bigint, emoji: string): Promise<void>;
    adminDeleteMessage(messageId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    banUser(user: Principal): Promise<string>;
    checkIfCallerIsAdmin(): Promise<boolean>;
    createCommunityPost(title: string, content: string, hashtags: Array<string>, isAnnouncement: boolean): Promise<bigint>;
    createEvent(title: string, description: string, startTime: bigint, endTime: bigint, room: string | null): Promise<bigint>;
    createPoll(title: string, options: Array<string>, multiSelect: boolean, anonymous: boolean): Promise<bigint>;
    deleteCommunityPost(id: bigint): Promise<void>;
    deleteEvent(id: bigint): Promise<void>;
    deleteFileRecord(id: bigint): Promise<void>;
    deleteMessage(messageId: bigint): Promise<void>;
    deletePoll(pollId: bigint): Promise<void>;
    deletePostComment(commentId: bigint): Promise<void>;
    generateInviteCode(): Promise<string>;
    getAllPolls(): Promise<Array<Poll>>;
    getAllRSVPs(): Promise<Array<RSVP>>;
    getAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommunityPosts(): Promise<Array<CommunityPost>>;
    getEvents(): Promise<Array<StudioEvent>>;
    getFileRecords(): Promise<Array<FileRecord>>;
    getFreeTimeSlots(): Promise<Array<FreeTimeSlot>>;
    getInviteCodes(): Promise<Array<InviteCode>>;
    getMessages(channelId: string): Promise<Array<Message>>;
    getPoll(pollId: bigint): Promise<Poll | null>;
    getPollResults(pollId: bigint): Promise<{
        results: Array<bigint>;
        hasVoted: boolean;
        options: Array<PollOption>;
    } | null>;
    getPostComments(postId: bigint): Promise<Array<PostComment>>;
    getPostReactions(postId: bigint): Promise<Array<[string, Array<Principal>]>>;
    getReactions(messageId: bigint): Promise<Array<[string, Array<Principal>]>>;
    getRoomAvailability(): Promise<Array<RoomSlot>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserVotes(pollId: bigint): Promise<Array<bigint>>;
    hasVotedInPoll(pollId: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isCallerRegistered(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    postMessage(channelId: string, content: string): Promise<bigint>;
    register(displayName: string, avatarUrl: string | null): Promise<void>;
    removeFreeTimeSlot(id: bigint): Promise<void>;
    removeUser(user: Principal): Promise<string>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveFileRecord(name: string, fileType: string, size: string, blobHash: string, downloadUrl: string, folderId: string, uploadDate: string): Promise<bigint>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setRoomAvailability(slots: Array<RoomSlot>): Promise<void>;
    submitRSVP(name: string, attending: boolean, inviteCode: string): Promise<void>;
    unbanUser(user: Principal): Promise<string>;
    vote(pollId: bigint, optionIndices: Array<bigint>): Promise<void>;
}

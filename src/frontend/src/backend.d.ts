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
export interface Message {
    id: bigint;
    content: string;
    channelId: string;
    authorName: string;
    timestamp: bigint;
    authorPrincipal: Principal;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    banMember(user: Principal): Promise<void>;
    bootstrapAdmin(displayName: string, avatarUrl: string | null): Promise<void>;
    createEvent(title: string, description: string, startTime: bigint, endTime: bigint, room: string | null): Promise<bigint>;
    deleteEvent(id: bigint): Promise<void>;
    deleteMessage(messageId: bigint): Promise<void>;
    generateInviteCode(): Promise<string>;
    getAllMembers(): Promise<Array<[Principal, UserProfile]>>;
    getAllRSVPs(): Promise<Array<RSVP>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEvents(): Promise<Array<StudioEvent>>;
    getInviteCodes(): Promise<Array<InviteCode>>;
    getMessages(channelId: string): Promise<Array<Message>>;
    getRoomAvailability(): Promise<Array<RoomSlot>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isAdminAssigned(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isCallerRegistered(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    postMessage(channelId: string, content: string): Promise<bigint>;
    registerWithInviteCode(code: string, displayName: string, avatarUrl: string | null): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setRoomAvailability(slots: Array<RoomSlot>): Promise<void>;
    submitRSVP(name: string, attending: boolean, inviteCode: string): Promise<void>;
    updateMemberRole(user: Principal, newRole: AppUserRole): Promise<void>;
}

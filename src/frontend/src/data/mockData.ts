// ============================================================
// Old Chapel Studios App — Mock / Sample Data
// ============================================================

export type UserRole = "admin" | "staff" | "musician" | "client";

export interface MockUser {
  id: string;
  displayName: string;
  role: UserRole;
  avatarInitials: string;
  avatarColor: string;
  email: string;
  joinedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string;
  hashtags: string[];
  pinned: boolean;
  isAnnouncement: boolean;
  timestamp: string;
  reactions: Record<string, number>;
  commentCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  recurring?: string;
  rsvp: { yes: number; no: number; maybe: number };
  creatorId: string;
  color: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isLocked: boolean;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  reactions: Record<string, number>;
  isPinned?: boolean;
}

export interface FileFolder {
  id: string;
  name: string;
  emoji: string;
  fileCount: number;
  files: FileItem[];
}

export interface FileItem {
  id: string;
  name: string;
  type: "audio" | "video" | "image" | "pdf" | "doc";
  size: string;
  uploaderId: string;
  uploadDate: string;
}

export interface Poll {
  id: string;
  title: string;
  creatorId: string;
  createdAt: string;
  status: "active" | "closed";
  multiSelect: boolean;
  anonymous: boolean;
  options: PollOption[];
  userVote?: number[];
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface GearItem {
  id: string;
  name: string;
  category: string;
  status: "available" | "in-use" | "maintenance";
  notes: string;
}

export interface AvailabilitySlot {
  status: "available" | "booked" | "partial" | "closed";
  note?: string;
}

// ============================================================
// Users
// ============================================================

export const MOCK_USERS: MockUser[] = [
  {
    id: "user-1",
    displayName: "Alice Admin",
    role: "admin",
    avatarInitials: "AA",
    avatarColor: "#FF4500",
    email: "alice@oldchapelstudios.co.uk",
    joinedAt: "2024-01-15",
  },
  {
    id: "user-2",
    displayName: "Bob Sound",
    role: "staff",
    avatarInitials: "BS",
    avatarColor: "#3B82F6",
    email: "bob@oldchapelstudios.co.uk",
    joinedAt: "2024-01-20",
  },
  {
    id: "user-3",
    displayName: "Maya Bass",
    role: "musician",
    avatarInitials: "MB",
    avatarColor: "#22C55E",
    email: "maya@example.com",
    joinedAt: "2024-02-05",
  },
  {
    id: "user-4",
    displayName: "Dave Client",
    role: "client",
    avatarInitials: "DC",
    avatarColor: "#8B5CF6",
    email: "dave@example.com",
    joinedAt: "2024-02-10",
  },
  {
    id: "user-5",
    displayName: "Priya Drums",
    role: "musician",
    avatarInitials: "PD",
    avatarColor: "#EC4899",
    email: "priya@example.com",
    joinedAt: "2024-02-18",
  },
  {
    id: "user-6",
    displayName: "Sam Engineer",
    role: "staff",
    avatarInitials: "SE",
    avatarColor: "#06B6D4",
    email: "sam@oldchapelstudios.co.uk",
    joinedAt: "2024-03-01",
  },
];

export const CURRENT_USER: MockUser = MOCK_USERS[0]; // Alice Admin by default

// ============================================================
// Posts / Feed
// ============================================================

export const INITIAL_POSTS: Post[] = [
  {
    id: "post-1",
    authorId: "user-1",
    title: "Welcome to Old Chapel Studios App! 🎉",
    content:
      "We're thrilled to launch our private community hub. Share your demos, coordinate sessions, and stay connected with everyone at Old Chapel. This is our home — enjoy it!",
    hashtags: ["Welcome", "OldChapelStudios", "CommunityHub"],
    pinned: true,
    isAnnouncement: true,
    timestamp: "2024-03-01T09:00:00Z",
    reactions: { "👍": 12, "❤️": 8, "🎵": 6, "🔥": 4 },
    commentCount: 7,
  },
  {
    id: "post-2",
    authorId: "user-2",
    title: "New PA System Delivered! 🎛️",
    content:
      "QSC K12.2 active speakers are now fully installed and set up in Room 1. Sound quality is incredible — come try them out! Full setup guide pinned in Gear & Repairs chat.",
    hashtags: ["GearUpdate", "Room1", "QSC"],
    pinned: false,
    isAnnouncement: false,
    timestamp: "2024-03-04T14:30:00Z",
    reactions: { "👍": 9, "❤️": 3, "🎵": 7, "🔥": 5 },
    commentCount: 4,
  },
  {
    id: "post-3",
    authorId: "user-3",
    title: "Demo Feedback Wanted 🎸",
    content:
      "Just recorded a rough demo in Room 2 — we tracked 4 songs in about 3 hours! Really happy with the drum sound especially. Anyone want to give feedback? I'll post the files to the Demos folder.",
    hashtags: ["Demo", "FeedbackWelcome", "Room2"],
    pinned: false,
    isAnnouncement: false,
    timestamp: "2024-03-05T11:15:00Z",
    reactions: { "👍": 5, "❤️": 4, "🎵": 11, "🔥": 2 },
    commentCount: 9,
  },
  {
    id: "post-4",
    authorId: "user-4",
    title: "Great Session Last Tuesday 🙌",
    content:
      "Really appreciate the team's help setting everything up. The acoustics in Room 1 are perfect for what we needed. Already booked again for next month!",
    hashtags: ["ClientLove", "Room1", "ThankYou"],
    pinned: false,
    isAnnouncement: false,
    timestamp: "2024-03-05T16:45:00Z",
    reactions: { "👍": 8, "❤️": 6, "🎵": 1, "🔥": 0 },
    commentCount: 3,
  },
  {
    id: "post-5",
    authorId: "user-5",
    title: "Looking for a Bass Player 🎶",
    content:
      "Our band is rehearsing Saturdays 2–6pm and we're one member down. Influenced by Radiohead, Portishead, Massive Attack. If you're interested, drop a message in Band Chats!",
    hashtags: ["BandNeeded", "Bass", "Rehearsal"],
    pinned: false,
    isAnnouncement: false,
    timestamp: "2024-03-06T09:30:00Z",
    reactions: { "👍": 4, "❤️": 2, "🎵": 8, "🔥": 3 },
    commentCount: 5,
  },
];

// ============================================================
// Availability Grid (rooms × days)
// ============================================================

export type RoomName = "Room 1 Rehearsal" | "Room 2 Recording" | "Control Room";
export const ROOMS: RoomName[] = [
  "Room 1 Rehearsal",
  "Room 2 Recording",
  "Control Room",
];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const INITIAL_AVAILABILITY: Record<RoomName, AvailabilitySlot[]> = {
  "Room 1 Rehearsal": [
    { status: "available" },
    { status: "available" },
    { status: "partial", note: "PM booked" },
    { status: "available" },
    { status: "available" },
    { status: "booked", note: "Full day" },
    { status: "available" },
  ],
  "Room 2 Recording": [
    { status: "available" },
    { status: "partial", note: "AM session" },
    { status: "booked", note: "Full day" },
    { status: "available" },
    { status: "partial", note: "PM recording" },
    { status: "booked", note: "Full day" },
    { status: "closed" },
  ],
  "Control Room": [
    { status: "closed" },
    { status: "available" },
    { status: "available" },
    { status: "partial", note: "Mixing session" },
    { status: "available" },
    { status: "available" },
    { status: "available" },
  ],
};

// ============================================================
// Calendar Events
// ============================================================

function getDateOffset(dayOffset: number, hour = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Open Mic Night 🎤",
    description:
      "Monthly open mic night! Sign up to perform or just come and enjoy. All genres welcome. Bar open from 6:30pm.",
    startDate: getDateOffset(4, 19),
    endDate: getDateOffset(4, 22),
    allDay: false,
    creatorId: "user-1",
    rsvp: { yes: 14, no: 2, maybe: 6 },
    color: "#FF4500",
  },
  {
    id: "event-2",
    title: "Room 2 Maintenance Day 🔧",
    description:
      "Scheduled maintenance on recording equipment. Room 2 will be unavailable all day. Room 1 and Control Room open as normal.",
    startDate: getDateOffset(7, 9),
    endDate: getDateOffset(7, 17),
    allDay: true,
    recurring: "monthly",
    creatorId: "user-2",
    rsvp: { yes: 3, no: 0, maybe: 0 },
    color: "#FFA500",
  },
  {
    id: "event-3",
    title: "Group Jam Session 🎸",
    description:
      "Informal jam session open to all members. Bring your instrument, we'll provide backline. Great for meeting other musicians!",
    startDate: getDateOffset(5, 14),
    endDate: getDateOffset(5, 18),
    allDay: false,
    creatorId: "user-3",
    rsvp: { yes: 8, no: 1, maybe: 5 },
    color: "#22C55E",
  },
  {
    id: "event-4",
    title: "Client Recording Session 🎙️",
    description:
      "Full day recording session booked by a client. Engineer: Bob Sound. Setup from 9am, sessions 10am–2pm.",
    startDate: getDateOffset(9, 10),
    endDate: getDateOffset(9, 14),
    allDay: false,
    creatorId: "user-4",
    rsvp: { yes: 2, no: 0, maybe: 0 },
    color: "#3B82F6",
  },
  {
    id: "event-5",
    title: "Band Showcase Evening 🌟",
    description:
      "Three bands performing to an invited audience. Tickets available to members. Dress code: smart casual.",
    startDate: getDateOffset(12, 18),
    endDate: getDateOffset(12, 22),
    allDay: false,
    creatorId: "user-1",
    rsvp: { yes: 22, no: 3, maybe: 8 },
    color: "#EC4899",
  },
];

// ============================================================
// Chats
// ============================================================

export const INITIAL_CHAT_GROUPS: ChatGroup[] = [
  {
    id: "chat-1",
    name: "Old Chapel Community",
    description: "Main group — visible to all members",
    emoji: "🏛️",
    isLocked: false,
    lastMessage: "Dave: Really enjoying the new space!",
    lastTimestamp: "10:34 AM",
    unreadCount: 3,
    messages: [
      {
        id: "msg-1",
        authorId: "user-1",
        content:
          "Morning everyone! Room 1 is free all day Thursday if anyone needs it 🎸",
        timestamp: "09:15 AM",
        reactions: { "👍": 4, "🎵": 2 },
        isPinned: true,
      },
      {
        id: "msg-2",
        authorId: "user-2",
        content: "Cheers Alice! I'll book it for the afternoon setup.",
        timestamp: "09:22 AM",
        reactions: { "👍": 2 },
      },
      {
        id: "msg-3",
        authorId: "user-3",
        content:
          "Does anyone have experience with the new monitors? Trying to dial in the mix.",
        timestamp: "09:48 AM",
        reactions: {},
      },
      {
        id: "msg-4",
        authorId: "user-4",
        content: "Really enjoying the new space, thanks for setting this up!",
        timestamp: "10:34 AM",
        reactions: { "❤️": 5 },
      },
    ],
  },
  {
    id: "chat-2",
    name: "Band Chats",
    description: "Coordinate rehearsals and gigs",
    emoji: "🎸",
    isLocked: false,
    lastMessage: "Priya: Saturday 2pm works for us!",
    lastTimestamp: "Yesterday",
    unreadCount: 1,
    messages: [
      {
        id: "msg-5",
        authorId: "user-5",
        content: "Saturday 2pm works for us!",
        timestamp: "Yesterday",
        reactions: { "👍": 3 },
      },
    ],
  },
  {
    id: "chat-3",
    name: "Gear & Repairs",
    description: "Equipment updates, maintenance logs",
    emoji: "🔧",
    isLocked: false,
    lastMessage: "Bob: PA system is now fully calibrated.",
    lastTimestamp: "Tuesday",
    unreadCount: 0,
    messages: [
      {
        id: "msg-6",
        authorId: "user-2",
        content:
          "PA system is now fully calibrated. User guide uploaded to Files > Gear Info.",
        timestamp: "Tuesday",
        reactions: { "👍": 6 },
      },
    ],
  },
  {
    id: "chat-4",
    name: "Session Feedback",
    description: "Post-session feedback and reviews",
    emoji: "🎧",
    isLocked: false,
    lastMessage: "Maya: Room 2 sounded amazing yesterday.",
    lastTimestamp: "Monday",
    unreadCount: 0,
    messages: [
      {
        id: "msg-7",
        authorId: "user-3",
        content:
          "Room 2 sounded amazing yesterday. Really happy with the drum tracking.",
        timestamp: "Monday",
        reactions: { "🔥": 4, "❤️": 2 },
      },
    ],
  },
  {
    id: "chat-5",
    name: "Staff Only",
    description: "Internal staff communications",
    emoji: "🔒",
    isLocked: true,
    lastMessage: "Alice: Cleaning crew Thursday 8am.",
    lastTimestamp: "Wednesday",
    unreadCount: 0,
    messages: [
      {
        id: "msg-8",
        authorId: "user-1",
        content:
          "Cleaning crew Thursday 8am. Please make sure rooms are clear by 7:45.",
        timestamp: "Wednesday",
        reactions: { "👍": 2 },
      },
    ],
  },
];

// ============================================================
// Files
// ============================================================

export const INITIAL_FILE_FOLDERS: FileFolder[] = [
  {
    id: "folder-1",
    name: "Demos & Recordings",
    emoji: "🎵",
    fileCount: 3,
    files: [
      {
        id: "file-1",
        name: "Room2_Demo_March2024.mp3",
        type: "audio",
        size: "8.4 MB",
        uploaderId: "user-3",
        uploadDate: "5 Mar 2024",
      },
      {
        id: "file-2",
        name: "OpenMic_Feb_Highlights.mp3",
        type: "audio",
        size: "14.2 MB",
        uploaderId: "user-2",
        uploadDate: "28 Feb 2024",
      },
      {
        id: "file-3",
        name: "BandShowcase_Setlist.pdf",
        type: "pdf",
        size: "0.4 MB",
        uploaderId: "user-1",
        uploadDate: "1 Mar 2024",
      },
    ],
  },
  {
    id: "folder-2",
    name: "Gear Info",
    emoji: "🎛️",
    fileCount: 5,
    files: [
      {
        id: "file-4",
        name: "PA_System_Manual_QSC_K12.2.pdf",
        type: "pdf",
        size: "3.2 MB",
        uploaderId: "user-2",
        uploadDate: "3 Mar 2024",
      },
      {
        id: "file-5",
        name: "Focusrite_Scarlett_Setup.pdf",
        type: "pdf",
        size: "1.8 MB",
        uploaderId: "user-6",
        uploadDate: "15 Feb 2024",
      },
      {
        id: "file-6",
        name: "Studio_Equipment_Inventory.pdf",
        type: "pdf",
        size: "0.9 MB",
        uploaderId: "user-1",
        uploadDate: "10 Feb 2024",
      },
      {
        id: "file-7",
        name: "Drum_Kit_Tuning_Guide.pdf",
        type: "pdf",
        size: "0.6 MB",
        uploaderId: "user-2",
        uploadDate: "8 Feb 2024",
      },
      {
        id: "file-8",
        name: "Marshall_JCM800_Manual.pdf",
        type: "pdf",
        size: "5.1 MB",
        uploaderId: "user-6",
        uploadDate: "5 Jan 2024",
      },
    ],
  },
  {
    id: "folder-3",
    name: "Marketing",
    emoji: "📸",
    fileCount: 2,
    files: [
      {
        id: "file-9",
        name: "Studio_Photo_Room1.jpg",
        type: "image",
        size: "4.8 MB",
        uploaderId: "user-1",
        uploadDate: "20 Feb 2024",
      },
      {
        id: "file-10",
        name: "OldChapel_Logo_Pack.zip",
        type: "doc",
        size: "2.1 MB",
        uploaderId: "user-1",
        uploadDate: "15 Jan 2024",
      },
    ],
  },
  {
    id: "folder-4",
    name: "Contracts & Admin",
    emoji: "📋",
    fileCount: 2,
    files: [
      {
        id: "file-11",
        name: "Studio_Hire_Agreement_Template.pdf",
        type: "pdf",
        size: "0.3 MB",
        uploaderId: "user-1",
        uploadDate: "12 Jan 2024",
      },
      {
        id: "file-12",
        name: "Health_Safety_Policy.pdf",
        type: "pdf",
        size: "0.5 MB",
        uploaderId: "user-1",
        uploadDate: "10 Jan 2024",
      },
    ],
  },
];

// ============================================================
// Polls
// ============================================================

export const INITIAL_POLLS: Poll[] = [
  {
    id: "poll-1",
    title: "Best night for Open Mic?",
    creatorId: "user-1",
    createdAt: "3 Mar 2024",
    status: "active",
    multiSelect: false,
    anonymous: false,
    options: [
      { id: 1, text: "Friday", votes: 14 },
      { id: 2, text: "Saturday", votes: 9 },
      { id: 3, text: "Sunday", votes: 5 },
      { id: 4, text: "Wednesday", votes: 3 },
    ],
    userVote: undefined,
  },
  {
    id: "poll-2",
    title: "New equipment priority?",
    creatorId: "user-2",
    createdAt: "28 Feb 2024",
    status: "active",
    multiSelect: true,
    anonymous: true,
    options: [
      { id: 1, text: "New guitar amps", votes: 8 },
      { id: 2, text: "Better drum mics", votes: 12 },
      { id: 3, text: "Upgraded monitors", votes: 15 },
      { id: 4, text: "More cables & stands", votes: 6 },
    ],
    userVote: undefined,
  },
  {
    id: "poll-3",
    title: "March Jam Session time?",
    creatorId: "user-3",
    createdAt: "15 Feb 2024",
    status: "closed",
    multiSelect: false,
    anonymous: false,
    options: [
      { id: 1, text: "Saturday 2pm", votes: 18 },
      { id: 2, text: "Sunday 1pm", votes: 7 },
      { id: 3, text: "Saturday 6pm", votes: 4 },
      { id: 4, text: "Sunday 4pm", votes: 2 },
    ],
    userVote: [1],
  },
];

// ============================================================
// Gear List
// ============================================================

export const INITIAL_GEAR: GearItem[] = [
  {
    id: "gear-1",
    name: "QSC K12.2 PA System (x2)",
    category: "PA / Speakers",
    status: "available",
    notes: "Room 1. Just installed.",
  },
  {
    id: "gear-2",
    name: "Marshall JCM800 Amp",
    category: "Amplifiers",
    status: "available",
    notes: "Room 1. Classic rock tone.",
  },
  {
    id: "gear-3",
    name: "Pearl Export Drum Kit",
    category: "Drums",
    status: "available",
    notes: "Room 1. Freshly tuned.",
  },
  {
    id: "gear-4",
    name: "Focusrite Scarlett 18i20",
    category: "Recording",
    status: "in-use",
    notes: "Control Room. In use during client session.",
  },
  {
    id: "gear-5",
    name: "Yamaha HS8 Studio Monitors",
    category: "Monitors",
    status: "available",
    notes: "Control Room.",
  },
  {
    id: "gear-6",
    name: "Shure SM57 Mic (x4)",
    category: "Microphones",
    status: "available",
    notes: "General use.",
  },
  {
    id: "gear-7",
    name: "DI Box (x3)",
    category: "DI / Routing",
    status: "available",
    notes: "Various locations.",
  },
  {
    id: "gear-8",
    name: "Fender Precision Bass",
    category: "Instruments",
    status: "maintenance",
    notes: "Getting new strings and setup.",
  },
];

// ============================================================
// Invite Codes (mock)
// ============================================================

export interface MockInviteCode {
  code: string;
  created: string;
  used: boolean;
  expiresAt?: string;
}

export const INITIAL_INVITE_CODES: MockInviteCode[] = [
  {
    code: "OCS-WELCOME-2024",
    created: "1 Mar 2024",
    used: true,
    expiresAt: "31 Mar 2024",
  },
  {
    code: "OCS-BAND-KFZX9",
    created: "4 Mar 2024",
    used: false,
    expiresAt: "31 Mar 2024",
  },
  {
    code: "OCS-CLIENT-7YQP2",
    created: "5 Mar 2024",
    used: false,
    expiresAt: "31 Mar 2024",
  },
];

// ============================================================
// Join Requests (mock)
// ============================================================

export interface JoinRequest {
  id: string;
  displayName: string;
  email: string;
  reason: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
}

export const INITIAL_JOIN_REQUESTS: JoinRequest[] = [
  {
    id: "req-1",
    displayName: "Jamie Guitar",
    email: "jamie@example.com",
    reason: "Band member",
    requestedAt: "5 Mar 2024",
    status: "pending",
  },
  {
    id: "req-2",
    displayName: "Rhys Recording",
    email: "rhys@example.com",
    reason: "Client",
    requestedAt: "6 Mar 2024",
    status: "pending",
  },
];

// ============================================================
// Helpers
// ============================================================

export function getUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-600 text-white",
  staff: "bg-blue-600 text-white",
  musician: "bg-green-600 text-white",
  client: "bg-gray-600 text-white",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  staff: "Staff",
  musician: "Musician",
  client: "Client",
};

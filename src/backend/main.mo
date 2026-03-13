import Blob "mo:core/Blob";
import Time "mo:core/Time";
import List "mo:core/List";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import UserApproval "user-approval/approval";
import InviteLinksModule "invite-links/invite-links-module";

actor {
  // Components
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let inviteState = InviteLinksModule.initState();
  let approvalState = UserApproval.initState(accessControlState);

  // ====== Users ======
  public type AppUserRole = {
    #admin;
    #staff;
    #musician;
    #client;
  };

  public type UserStatus = {
    #active;
    #suspended;
    #banned;
  };

  public type UserProfile = {
    displayName : Text;
    avatarUrl : ?Text;
    role : AppUserRole;
    status : UserStatus;
    joinedAt : Int;
    shareContact : Bool;
    email : ?Text;
    phone : ?Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Check if the caller already has a registered account (for returning login)
  public query ({ caller }) func isCallerRegistered() : async Bool {
    if (caller.isAnonymous()) { return false };
    let map = accessControlState.userRoles;
    switch (map.get(caller)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Check if an admin has already been bootstrapped
  public query func isAdminAssigned() : async Bool {
    accessControlState.adminAssigned;
  };

  // Bootstrap the first admin — only works before any admin exists
  public shared ({ caller }) func bootstrapAdmin(displayName : Text, avatarUrl : ?Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot register");
    };
    if (accessControlState.adminAssigned) {
      Runtime.trap("An admin already exists");
    };
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) { Runtime.trap("Already registered") };
      case (null) {};
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    UserApproval.setApproval(approvalState, caller, #approved);
    let profile : UserProfile = {
      displayName = displayName;
      avatarUrl = avatarUrl;
      role = #admin;
      status = #active;
      joinedAt = Time.now();
      shareContact = false;
      email = null;
      phone = null;
    };
    userProfiles.add(caller, profile);
  };

  // Register a new user with an invite code — validates code, saves profile, grants access
  public shared ({ caller }) func registerWithInviteCode(code : Text, displayName : Text, avatarUrl : ?Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot register");
    };
    // Prevent double-registration
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) { Runtime.trap("Already registered") };
      case (null) {};
    };

    // Normal invite code flow
    switch (inviteState.inviteCodes.get(code)) {
      case (null) { Runtime.trap("Invalid invite code") };
      case (?invite) {
        if (invite.used) { Runtime.trap("Invite code already used") };
        // Mark code as used
        inviteState.inviteCodes.add(code, { invite with used = true });
        // Grant user role and approve
        accessControlState.userRoles.add(caller, #user);
        UserApproval.setApproval(approvalState, caller, #approved);
        let profile : UserProfile = {
          displayName = displayName;
          avatarUrl = avatarUrl;
          role = #musician;
          status = #active;
          joinedAt = Time.now();
          shareContact = false;
          email = null;
          phone = null;
        };
        userProfiles.add(caller, profile);
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    // Return the profile, but respect privacy settings for contact info
    switch (userProfiles.get(user)) {
      case (null) { null };
      case (?profile) {
        // If caller is admin or viewing own profile, return full profile
        if (AccessControl.isAdmin(accessControlState, caller) or caller == user) {
          ?profile;
        } else {
          // Otherwise, hide contact info if shareContact is false
          if (profile.shareContact) {
            ?profile;
          } else {
            ?{
              profile with
              email = null;
              phone = null;
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Get existing profile to preserve protected fields
    switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("Profile not found");
      };
      case (?existingProfile) {
        // Users cannot modify their own role or status - only admins can
        let updatedProfile : UserProfile = {
          displayName = profile.displayName;
          avatarUrl = profile.avatarUrl;
          role = existingProfile.role; // Preserve existing role
          status = existingProfile.status; // Preserve existing status
          joinedAt = existingProfile.joinedAt; // Preserve join date
          shareContact = profile.shareContact;
          email = profile.email;
          phone = profile.phone;
        };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  // System-provided functions

  public shared ({ caller }) func generateInviteCode() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can generate invite codes");
    };
    let blob = Blob.fromArray([0x0]);
    let code = InviteLinksModule.generateUUID(blob);
    InviteLinksModule.generateInviteCode(inviteState, code);
    code;
  };

  public shared func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (accessControlState.userRoles.get(caller)) {
      case (null) { false };
      case (?_) {
        AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
      };
    };
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // ====== Messaging ======
  public type Message = {
    id : Nat;
    channelId : Text;
    authorPrincipal : Principal;
    authorName : Text;
    content : Text;
    timestamp : Int;
  };

  var nextMessageId : Nat = 0;
  let messages = Map.empty<Nat, Message>();
  let channelMessages = Map.empty<Text, [Nat]>();

  public shared ({ caller }) func postMessage(channelId : Text, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    // Look up caller's profile for authorName
    let authorName = switch (userProfiles.get(caller)) {
      case (null) { "Unknown" };
      case (?profile) { profile.displayName };
    };

    let messageId = nextMessageId;
    nextMessageId += 1;

    let message : Message = {
      id = messageId;
      channelId = channelId;
      authorPrincipal = caller;
      authorName = authorName;
      content = content;
      timestamp = Time.now();
    };

    messages.add(messageId, message);

    // Add to channel index
    let channelMsgs = switch (channelMessages.get(channelId)) {
      case (null) { [] };
      case (?array) { array };
    };

    let updatedChannelMsgs = channelMsgs.concat([messageId]);
    channelMessages.add(channelId, updatedChannelMsgs);

    messageId;
  };

  public query ({ caller }) func getMessages(channelId : Text) : async [Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    let messageIds = switch (channelMessages.get(channelId)) {
      case (null) { [] };
      case (?array) { array };
    };

    let result = messageIds.map(
      func(id) {
        switch (messages.get(id)) {
          case (null) { Runtime.trap("Unexpected missing message") };
          case (?message) { message };
        };
      }
    );

    result.reverse();
  };

  public shared ({ caller }) func deleteMessage(messageId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };

    switch (messages.get(messageId)) {
      case (null) {
        Runtime.trap("Message not found");
      };
      case (?message) {
        // Only author or admin can delete
        if (message.authorPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the author or admin can delete this message");
        };
        messages.remove(messageId);
      };
    };
  };

  // ====== Events ======
  public type StudioEvent = {
    id : Nat;
    title : Text;
    description : Text;
    startTime : Int;
    endTime : Int;
    room : ?Text;
    createdBy : Principal;
  };

  var nextEventId : Nat = 0;
  let events = Map.empty<Nat, StudioEvent>();

  public shared ({ caller }) func createEvent(
    title : Text,
    description : Text,
    startTime : Int,
    endTime : Int,
    room : ?Text,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create events");
    };

    let eventId = nextEventId;
    nextEventId += 1;

    let event : StudioEvent = {
      id = eventId;
      title = title;
      description = description;
      startTime = startTime;
      endTime = endTime;
      room = room;
      createdBy = caller;
    };

    events.add(eventId, event);
    eventId;
  };

  public query ({ caller }) func getEvents() : async [StudioEvent] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view events");
    };

    events.values().toArray();
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete events");
    };

    events.remove(id);
  };

  // ====== Room Availability ======
  public type RoomSlot = {
    room : Text;
    dayOfWeek : Nat;
    hourStart : Nat;
    hourEnd : Nat;
    available : Bool;
  };

  var roomSlots : [RoomSlot] = [];

  public shared ({ caller }) func setRoomAvailability(slots : [RoomSlot]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can set room availability");
    };

    roomSlots := slots;
  };

  public query func getRoomAvailability() : async [RoomSlot] {
    roomSlots;
  };

  // ====== Member Management ======
  public query ({ caller }) func getAllMembers() : async [(Principal, UserProfile)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view all members");
    };

    userProfiles.entries().toArray();
  };

  public shared ({ caller }) func banMember(user : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can ban members");
    };

    switch (userProfiles.get(user)) {
      case (null) {
        Runtime.trap("User profile not found");
      };
      case (?profile) {
        let updatedProfile : UserProfile = {
          profile with status = #banned;
        };
        userProfiles.add(user, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func updateMemberRole(user : Principal, newRole : AppUserRole) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update member roles");
    };

    switch (userProfiles.get(user)) {
      case (null) {
        Runtime.trap("User profile not found");
      };
      case (?profile) {
        let updatedProfile : UserProfile = {
          profile with role = newRole;
        };
        userProfiles.add(user, updatedProfile);
      };
    };
  };
};

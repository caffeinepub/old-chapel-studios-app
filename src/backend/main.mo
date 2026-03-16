import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Bool "mo:core/Bool";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import UserApproval "user-approval/approval";
import InviteLinksModule "invite-links/invite-links-module";


// Specify the data migration function in with-clause

actor {
  // Keep component state vars for stable variable compatibility
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let inviteState = InviteLinksModule.initState();
  let approvalState = UserApproval.initState(accessControlState);

  // ====== Components Delegation ======

  // Invite links
  public shared ({ caller }) func generateInviteCode() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can generate invite codes");
    };
    InviteLinksModule.generateInviteCode(inviteState, "random");
    "random";
  };

  public shared func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  // User Approval
  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // ====== App ======

  // Users
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

  // Anyone approved is considered registered
  public query ({ caller }) func isCallerRegistered() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #user) or AccessControl.hasPermission(accessControlState, caller, #admin);
  };

  // Open approval — just checks if registered and not banned
  public query ({ caller }) func isCallerApproved() : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?profile) {
        switch (profile.status) {
          case (#banned) { false };
          case (_) { true };
        };
      };
    };
  };

  public shared ({ caller }) func register(displayName : Text, avatarUrl : ?Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot register");
    };
    switch (userProfiles.get(caller)) {
      case (?_) { return };
      case (null) {};
    };
    let role : AppUserRole = #musician;
    let profile : UserProfile = {
      displayName = displayName;
      avatarUrl = avatarUrl;
      role = role;
      status = #active;
      joinedAt = Time.now();
      shareContact = false;
      email = null;
      phone = null;
    };
    userProfiles.add(caller, profile);
    accessControlState.userRoles.add(caller, #user);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) { return null };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot save profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?existing) {
        let updated : UserProfile = {
          displayName = profile.displayName;
          avatarUrl = profile.avatarUrl;
          role = existing.role;
          status = existing.status;
          joinedAt = existing.joinedAt;
          shareContact = profile.shareContact;
          email = profile.email;
          phone = profile.phone;
        };
        userProfiles.add(caller, updated);
      };
    };
  };

  // Admin User Management
  public query ({ caller }) func getAllUsers() : async [((Principal, UserProfile))] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    userProfiles.toArray();
  };

  public shared ({ caller }) func removeUser(user : Principal) : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (userProfiles.get(user)) {
      case (null) {
        "ERROR: Principal is not a registered user";
      };
      case (?_) {
        userProfiles.remove(user);
        "SUCCESS: User removed successfully";
      };
    };
  };

  public shared ({ caller }) func banUser(user : Principal) : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (userProfiles.get(user)) {
      case (null) {
        "ERROR: Principal is not a registered user";
      };
      case (?existing) {
        let updated : UserProfile = {
          displayName = existing.displayName;
          avatarUrl = existing.avatarUrl;
          role = existing.role;
          status = #banned;
          joinedAt = existing.joinedAt;
          shareContact = existing.shareContact;
          email = existing.email;
          phone = existing.phone;
        };
        userProfiles.add(user, updated);
        "SUCCESS: User banned successfully";
      };
    };
  };

  public shared ({ caller }) func unbanUser(user : Principal) : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (userProfiles.get(user)) {
      case (null) {
        "ERROR: Principal is not a registered user";
      };
      case (?existing) {
        let updated : UserProfile = {
          displayName = existing.displayName;
          avatarUrl = existing.avatarUrl;
          role = existing.role;
          status = #active;
          joinedAt = existing.joinedAt;
          shareContact = existing.shareContact;
          email = existing.email;
          phone = existing.phone;
        };
        userProfiles.add(user, updated);
        "SUCCESS: User unbanned successfully";
      };
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?profile) {
        let messageId = nextMessageId;
        nextMessageId += 1;
        let message : Message = {
          id = messageId;
          channelId = channelId;
          authorPrincipal = caller;
          authorName = profile.displayName;
          content = content;
          timestamp = Time.now();
        };
        messages.add(messageId, message);
        let channelMsgs = switch (channelMessages.get(channelId)) {
          case (null) { [] };
          case (?array) { array };
        };
        channelMessages.add(channelId, channelMsgs.concat([messageId]));
        messageId;
      };
    };
  };

  public query ({ caller }) func getMessages(channelId : Text) : async [Message] {
    let messageIds = switch (channelMessages.get(channelId)) {
      case (null) { [] };
      case (?array) { array };
    };
    let result = messageIds.map(
      func(id) {
        switch (messages.get(id)) {
          case (null) { Runtime.trap("Missing message") };
          case (?m) { m };
        };
      }
    );
    result.reverse();
  };

  public shared ({ caller }) func deleteMessage(messageId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        if (message.authorPrincipal != caller) {
          Runtime.trap("Only the author can delete this message");
        };
        messages.remove(messageId);
      };
    };
  };

  // Admin-only: delete any message for content moderation
  public shared ({ caller }) func adminDeleteMessage(messageId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin access required");
    };
    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?_) { messages.remove(messageId) };
    };
  };

  // ====== Reactions ======
  let messageReactions = Map.empty<Nat, Map.Map<Text, [Principal]>>();

  public shared ({ caller }) func addReaction(messageId : Nat, emoji : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?_) {
        let emojiMap = switch (messageReactions.get(messageId)) {
          case (null) { Map.empty<Text, [Principal]>() };
          case (?m) { m };
        };
        let existing = switch (emojiMap.get(emoji)) {
          case (null) { [] };
          case (?arr) { arr };
        };
        let alreadyReacted = existing.filter(func(p : Principal) : Bool { p == caller }).size() > 0;
        let updated = if (alreadyReacted) {
          existing.filter(func(p : Principal) : Bool { p != caller });
        } else {
          existing.concat([caller]);
        };
        emojiMap.add(emoji, updated);
        messageReactions.add(messageId, emojiMap);
      };
    };
  };

  public query func getReactions(messageId : Nat) : async [(Text, [Principal])] {
    switch (messageReactions.get(messageId)) {
      case (null) { [] };
      case (?emojiMap) {
        emojiMap.entries().toArray();
      };
    };
  };

  // ====== Public Profile Lookup ======
  public query func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?_) {
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
    };
  };

  public query ({ caller }) func getEvents() : async [StudioEvent] {
    events.values().toArray();
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    switch (events.get(id)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        if (event.createdBy != caller) {
          Runtime.trap("Only the creator can delete this event");
        };
        events.remove(id);
      };
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) { Runtime.trap("Not registered") };
    roomSlots := slots;
  };

  public query func getRoomAvailability() : async [RoomSlot] {
    roomSlots;
  };
};

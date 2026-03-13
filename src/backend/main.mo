import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import UserApproval "user-approval/approval";
import InviteLinksModule "invite-links/invite-links-module";

actor {
  // Keep component state vars for stable variable compatibility
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

  // Anyone registered is considered approved
  public query ({ caller }) func isCallerRegistered() : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (userProfiles.get(caller)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Open approval — just checks if registered
  public query ({ caller }) func isCallerApproved() : async Bool {
    if (caller.isAnonymous()) { return false };
    switch (userProfiles.get(caller)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Open registration — no invite code needed
  public shared ({ caller }) func register(displayName : Text, avatarUrl : ?Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot register");
    };
    switch (userProfiles.get(caller)) {
      case (?_) { return }; // Already registered, no-op
      case (null) {};
    };
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
    if (caller.isAnonymous()) { Runtime.trap("Not registered") };
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
    if (caller.isAnonymous()) { return [] };
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
    if (caller.isAnonymous()) { Runtime.trap("Not registered") };
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
    if (caller.isAnonymous()) { Runtime.trap("Not registered") };
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
    if (caller.isAnonymous()) { return [] };
    events.values().toArray();
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async () {
    if (caller.isAnonymous()) { Runtime.trap("Not registered") };
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
    if (caller.isAnonymous()) { Runtime.trap("Not registered") };
    roomSlots := slots;
  };

  public query func getRoomAvailability() : async [RoomSlot] {
    roomSlots;
  };
};

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
import InviteLinksModule "invite-links/invite-links-module";
import UserApproval "user-approval/approval";

import Iter "mo:core/Iter";

actor {
  // Constant for admin principal
  let ADMIN_PRINCIPAL : Text = "ulyt5-slv4a-xrfbx-seije-74i6r-4nkkh-ydqng-hgdb2-r3tlc-tkvp4-hae";

  // Keep component state vars for stable variable compatibility
  let accessControlState = AccessControl.initState();
  let inviteState = InviteLinksModule.initState();
  let approvalState = UserApproval.initState(accessControlState);

  include MixinAuthorization(accessControlState);
  include MixinStorage();

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

  stable var userProfiles = Map.empty<Principal, UserProfile>();

  // Helper function to check if user is registered and not banned
  func isUserActiveAndRegistered(caller : Principal) : Bool {
    if (caller.toText() == ADMIN_PRINCIPAL) { return true };
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

  // Anyone approved is considered registered
  public query ({ caller }) func isCallerRegistered() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #user) or AccessControl.hasPermission(accessControlState, caller, #admin);
  };

  // Check if caller is the hardcoded admin
  public query ({ caller }) func checkIfCallerIsAdmin() : async Bool {
    caller.toText() == ADMIN_PRINCIPAL;
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
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    userProfiles.toArray();
  };

  public shared ({ caller }) func removeUser(user : Principal) : async Text {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    // Admins cannot be deleted
    if (user.toText() == ADMIN_PRINCIPAL) {
      Runtime.trap("ERROR: Cannot remove admin users");
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
    if (caller.toText() != ADMIN_PRINCIPAL) {
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
    if (caller.toText() != ADMIN_PRINCIPAL) {
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

  // ====== Polls ======
  public type PollOption = {
    text : Text;
    voteCount : Nat;
  };

  public type Poll = {
    id : Nat;
    creator : Principal;
    title : Text;
    options : [PollOption];
    multiSelect : Bool;
    anonymous : Bool;
    createdAt : Time.Time;
    isActive : Bool;
    votes : [Principal];
  };

  stable var nextPollId : Nat = 0;
  stable var polls = Map.empty<Nat, Poll>();
  stable var userVotes = Map.empty<Nat, Map.Map<Principal, [Nat]>>();

  public shared ({ caller }) func createPoll(
    title : Text,
    options : [Text],
    multiSelect : Bool,
    anonymous : Bool,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create polls");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?_) {
        if (options.size() < 2) {
          Runtime.trap("A poll must have at least two options");
        };
        let pollId = nextPollId;
        nextPollId += 1;
        let pollOptions = options.map(
          func(text) {
            { text; voteCount = 0 };
          }
        );
        let poll : Poll = {
          id = pollId;
          creator = caller;
          title = title;
          options = pollOptions;
          multiSelect = multiSelect;
          anonymous = anonymous;
          createdAt = Time.now();
          isActive = true;
          votes = [];
        };
        polls.add(pollId, poll);
        userVotes.add(pollId, Map.empty<Principal, [Nat]>());
        pollId;
      };
    };
  };

  public query ({ caller }) func getPoll(pollId : Nat) : async ?Poll {
    polls.get(pollId);
  };

  public query ({ caller }) func getAllPolls() : async [Poll] {
    polls.values().toArray();
  };

  public shared ({ caller }) func vote(pollId : Nat, optionIndices : [Nat]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can vote");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?_) {
        switch (polls.get(pollId)) {
          case (null) { Runtime.trap("Poll not found") };
          case (?poll) {
            if (not poll.isActive) {
              Runtime.trap("Poll is not active");
            };
            if (optionIndices.size() == 0) {
              Runtime.trap("You must select at least one option");
            };
            let pollOptionsSize = poll.options.size();
            if (optionIndices.any(func(i) { i >= pollOptionsSize })) {
              Runtime.trap("Invalid option index");
            };
            if (not poll.multiSelect and optionIndices.size() > 1) {
              Runtime.trap("This poll does not allow multiple selections");
            };
            let pollUserVotes = switch (userVotes.get(pollId)) {
              case (null) { Runtime.trap("Poll not found") };
              case (?vu) { vu };
            };
            switch (pollUserVotes.get(caller)) {
              case (?_) { Runtime.trap("You have already voted in this poll") };
              case (null) {};
            };
            let updatedOptions = Array.tabulate(
              pollOptionsSize,
              func(i) {
                if (optionIndices.any(func(idx) { idx == i })) {
                  {
                    text = poll.options[i].text;
                    voteCount = poll.options[i].voteCount + 1;
                  };
                } else {
                  poll.options[i];
                };
              },
            );
            let updatedPoll : Poll = {
              id = poll.id;
              creator = poll.creator;
              title = poll.title;
              options = updatedOptions;
              multiSelect = poll.multiSelect;
              anonymous = poll.anonymous;
              createdAt = poll.createdAt;
              isActive = poll.isActive;
              votes = poll.votes.concat([caller]);
            };
            polls.add(pollId, updatedPoll);
            pollUserVotes.add(caller, optionIndices);
          };
        };
      };
    };
  };

  public shared ({ caller }) func deletePoll(pollId : Nat) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can delete polls");
    };
    switch (polls.get(pollId)) {
      case (null) { Runtime.trap("Poll not found") };
      case (?_) {
        polls.remove(pollId);
        userVotes.remove(pollId);
      };
    };
  };

  public query ({ caller }) func getPollResults(pollId : Nat) : async ?{
    results : [Nat];
    hasVoted : Bool;
    options : [PollOption];
  } {
    switch (polls.get(pollId)) {
      case (null) { null };
      case (?poll) {
        (
          switch (userVotes.get(pollId)) {
            case (null) { null };
            case (?userVotesMap) {
              if (userVotesMap.containsKey(caller)) { 
                ?{
                  results = poll.options.map(func(o) { o.voteCount });
                  hasVoted = true;
                  options = poll.options;
                } 
              } else {
                if (poll.isActive and poll.anonymous) { 
                  ?{
                    results = poll.options.map(func(o) { o.voteCount });
                    hasVoted = false;
                    options = poll.options;
                  } 
                } else { 
                  ?{
                    results = poll.options.map(func(o) { o.voteCount });
                    hasVoted = false;
                    options = poll.options;
                  };
                };
              };
            };
          }
        );
      };
    };
  };

  public query ({ caller }) func hasVotedInPoll(pollId : Nat) : async Bool {
    switch (userVotes.get(pollId)) {
      case (null) { false };
      case (?vmap) { vmap.containsKey(caller) };
    };
  };

  public query ({ caller }) func getUserVotes(pollId : Nat) : async [Nat] {
    switch (userVotes.get(pollId)) {
      case (null) { [] };
      case (?userVotesMap) {
        switch (userVotesMap.get(caller)) {
          case (null) { [] };
          case (?votes) { votes };
        };
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

  stable var nextMessageId : Nat = 0;
  stable var messages = Map.empty<Nat, Message>();
  stable var channelMessages = Map.empty<Text, [Nat]>();

  public shared ({ caller }) func postMessage(channelId : Text, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?message) {
        if (message.authorPrincipal != caller) {
          Runtime.trap("Unauthorized: Only the author can delete this message");
        };
        messages.remove(messageId);
      };
    };
  };

  // Admin-only: delete any message for content moderation
  public shared ({ caller }) func adminDeleteMessage(messageId : Nat) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?_) { messages.remove(messageId) };
    };
  };

  // ====== Reactions ======
  stable var messageReactions = Map.empty<Nat, Map.Map<Text, [Principal]>>();

  public shared ({ caller }) func addReaction(messageId : Nat, emoji : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add reactions");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
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

  stable var nextEventId : Nat = 0;
  stable var events = Map.empty<Nat, StudioEvent>();

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
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
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
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can delete events");
    };
    switch (events.get(id)) {
      case (null) { Runtime.trap("Event not found") };
      case (?_) {
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

  stable var roomSlots : [RoomSlot] = [];

  public shared ({ caller }) func setRoomAvailability(slots : [RoomSlot]) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can set room availability");
    };
    roomSlots := slots;
  };

  public query func getRoomAvailability() : async [RoomSlot] {
    roomSlots;
  };

  // ====== Free Time Slots ======
  public type FreeTimeSlot = {
    id : Nat;
    room : Text;
    dayLabel : Text;
    timeStart : Text;
    timeEnd : Text;
    note : Text;
  };

  stable var nextFreeSlotId : Nat = 0;
  stable var freeTimeSlots = Map.empty<Nat, FreeTimeSlot>();

  public shared ({ caller }) func addFreeTimeSlot(
    room : Text,
    dayLabel : Text,
    timeStart : Text,
    timeEnd : Text,
    note : Text,
  ) : async Nat {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can add time slots");
    };
    let slotId = nextFreeSlotId;
    nextFreeSlotId += 1;
    let slot : FreeTimeSlot = {
      id = slotId;
      room = room;
      dayLabel = dayLabel;
      timeStart = timeStart;
      timeEnd = timeEnd;
      note = note;
    };
    freeTimeSlots.add(slotId, slot);
    slotId;
  };

  public shared ({ caller }) func removeFreeTimeSlot(id : Nat) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can remove time slots");
    };
    freeTimeSlots.remove(id);
  };

  public query func getFreeTimeSlots() : async [FreeTimeSlot] {
    freeTimeSlots.values().toArray();
  };

  // ====== File Records ======
  public type FileRecord = {
    id : Nat;
    name : Text;
    fileType : Text;
    size : Text;
    blobHash : Text;
    downloadUrl : Text;
    folderId : Text;
    uploadDate : Text;
    uploaderPrincipal : Principal;
  };

  stable var nextFileRecordId : Nat = 0;
  stable var fileRecords = Map.empty<Nat, FileRecord>();

  public shared ({ caller }) func saveFileRecord(
    name : Text,
    fileType : Text,
    size : Text,
    blobHash : Text,
    downloadUrl : Text,
    folderId : Text,
    uploadDate : Text,
  ) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot save file records");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    let recordId = nextFileRecordId;
    nextFileRecordId += 1;
    let record : FileRecord = {
      id = recordId;
      name = name;
      fileType = fileType;
      size = size;
      blobHash = blobHash;
      downloadUrl = downloadUrl;
      folderId = folderId;
      uploadDate = uploadDate;
      uploaderPrincipal = caller;
    };
    fileRecords.add(recordId, record);
    recordId;
  };

  public query func getFileRecords() : async [FileRecord] {
    fileRecords.values().toArray();
  };

  public shared ({ caller }) func deleteFileRecord(id : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot delete file records");
    };
    switch (fileRecords.get(id)) {
      case (null) { Runtime.trap("File record not found") };
      case (?record) {
        if (record.uploaderPrincipal != caller and caller.toText() != ADMIN_PRINCIPAL) {
          Runtime.trap("Unauthorized: Only the uploader or admin can delete this file");
        };
        fileRecords.remove(id);
      };
    };
  };

  // ========== New Functions for Invite Links and User Approval ==========
  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  public func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  public shared ({ caller }) func generateInviteCode() : async Text {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can generate invite codes");
    };
    let code = InviteLinksModule.generateUUID(Blob.empty());
    InviteLinksModule.generateInviteCode(inviteState, code);
    code;
  };

  // ====== Community Posts ======
  public type CommunityPost = {
    id : Nat;
    authorPrincipal : Principal;
    authorName : Text;
    title : Text;
    content : Text;
    hashtags : [Text];
    isAnnouncement : Bool;
    timestamp : Int;
  };

  stable var nextPostId : Nat = 0;
  stable var communityPosts = Map.empty<Nat, CommunityPost>();

  public shared ({ caller }) func createCommunityPost(
    title : Text,
    content : Text,
    hashtags : [Text],
    isAnnouncement : Bool,
  ) : async Nat {
    if (caller.isAnonymous()) { Runtime.trap("Anonymous callers cannot post") };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    let authorName = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?profile) { profile.displayName };
    };
    let postId = nextPostId;
    nextPostId += 1;
    let post : CommunityPost = {
      id = postId;
      authorPrincipal = caller;
      authorName = authorName;
      title = title;
      content = content;
      hashtags = hashtags;
      isAnnouncement = isAnnouncement;
      timestamp = Time.now();
    };
    communityPosts.add(postId, post);
    postId;
  };

  public query func getCommunityPosts() : async [CommunityPost] {
    let arr = communityPosts.values().toArray();
    arr.reverse();
  };

  public shared ({ caller }) func deleteCommunityPost(id : Nat) : async () {
    if (caller.toText() != ADMIN_PRINCIPAL) {
      Runtime.trap("Unauthorized: Only admins can delete posts");
    };
    switch (communityPosts.get(id)) {
      case (null) { Runtime.trap("Post not found") };
      case (?_) { communityPosts.remove(id) };
    };
  };

  // ====== Post Reactions & Comments ======
  public type PostComment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    authorName : Text;
    content : Text;
    timestamp : Int;
  };

  stable var postReactions = Map.empty<Nat, Map.Map<Text, [Principal]>>();
  stable var nextCommentId : Nat = 0;
  stable var postComments = Map.empty<Nat, PostComment>();
  stable var postCommentIndex = Map.empty<Nat, [Nat]>();

  public shared ({ caller }) func addPostReaction(postId : Nat, emoji : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add post reactions");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?_) {
        let emojiMap = switch (postReactions.get(postId)) {
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
        postReactions.add(postId, emojiMap);
      };
    };
  };

  public query func getPostReactions(postId : Nat) : async [(Text, [Principal])] {
    switch (postReactions.get(postId)) {
      case (null) { [] };
      case (?emojiMap) {
        emojiMap.entries().toArray();
      };
    };
  };

  public shared ({ caller }) func addPostComment(postId : Nat, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add post comments");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    let authorName = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Not registered") };
      case (?profile) { profile.displayName };
    };
    let commentId = nextCommentId;
    nextCommentId += 1;
    let comment : PostComment = {
      id = commentId;
      postId = postId;
      authorPrincipal = caller;
      authorName = authorName;
      content = content;
      timestamp = Time.now();
    };
    postComments.add(commentId, comment);
    let currentIndex = switch (postCommentIndex.get(postId)) {
      case (null) { [] };
      case (?array) { array };
    };
    postCommentIndex.add(postId, currentIndex.concat([commentId]));
    commentId;
  };

  public query func getPostComments(postId : Nat) : async [PostComment] {
    let commentIds = switch (postCommentIndex.get(postId)) {
      case (null) { [] };
      case (?array) { array };
    };
    let result = commentIds.map(
      func(id) {
        switch (postComments.get(id)) {
          case (null) { Runtime.trap("Missing comment") };
          case (?c) { c };
        };
      }
    );
    result.reverse();
  };

  public shared ({ caller }) func deletePostComment(commentId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: User is banned or not registered");
    };
    switch (postComments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        // Allow comment author or admin to delete
        if (comment.authorPrincipal != caller and caller.toText() != ADMIN_PRINCIPAL) {
          Runtime.trap("Unauthorized: Only the comment author or admin can delete this comment");
        };
        postComments.remove(commentId);
        // Remove comment from index
        let currentIndex = switch (postCommentIndex.get(comment.postId)) {
          case (null) { [] };
          case (?array) { array };
        };
        let updatedIndex = currentIndex.filter(func(id) { id != commentId });
        postCommentIndex.add(comment.postId, updatedIndex);
      };
    };
  };

  // ========== Band Feature ==========

  // Band Data Types
  public type Band = {
    id : Nat;
    name : Text;
    leaderId : Principal;
    members : [Principal];
    createdAt : Int;
  };

  public type BandInvite = {
    inviteeId : Principal;
    bandId : Nat;
    inviterName : Text;
    bandName : Text;
    sentAt : Int;
  };

  public type Gig = {
    id : Nat;
    bandId : Nat;
    name : Text;
    date : Text;
    time : Text;
    venue : Text;
    notes : Text;
    createdAt : Int;
  };

  public type BandTask = {
    id : Nat;
    bandId : Nat;
    title : Text;
    description : Text;
    completed : Bool;
    creatorId : Principal;
    createdAt : Int;
  };

  // Stable band data structures
  stable var nextBandId : Nat = 0;
  stable var nextGigId : Nat = 0;
  stable var nextTaskId : Nat = 0;
  stable var bands = Map.empty<Nat, Band>();
  stable var bandInvites = Map.empty<Principal, BandInvite>();
  stable var bandGigs = Map.empty<Nat, Gig>();
  stable var bandTasks = Map.empty<Nat, BandTask>();

  // Create Band
  public shared ({ caller }) func createBand(name : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create bands");
    };
    if (not isUserActiveAndRegistered(caller)) {
      Runtime.trap("Unauthorized: Only active and approved users can create bands");
    };

    // Check if caller already has a band
    let hasExistingBand = bands.values().any(
      func(band) { band.leaderId == caller or band.members.any(func(m) { m == caller }) }
    );
    if (hasExistingBand) {
      Runtime.trap("You are already part of a band");
    };

    let bandId = nextBandId;
    nextBandId += 1;

    let newBand : Band = {
      id = bandId;
      name;
      leaderId = caller;
      members = [caller];
      createdAt = Time.now();
    };
    bands.add(bandId, newBand);
    bandId;
  };

  // Get current user's band
  public query ({ caller }) func getBand() : async ?Band {
    if (caller.isAnonymous()) { return null };
    bands.values().find(
      func(band) { band.leaderId == caller or band.members.any(func(m) { m == caller }) }
    );
  };

  // Disband band (leader only)
  public shared ({ caller }) func disbandBand() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can disband bands");
    };

    let band = switch (bands.values().find(func(b) { b.leaderId == caller })) {
      case (null) { Runtime.trap("You are not the leader of any band") };
      case (?b) { b };
    };

    // Remove band
    bands.remove(band.id);

    // Remove related gigs and tasks
    let bandId = band.id;
    let filteredGigs = bandGigs.filter(func(_, gig) { gig.bandId != bandId });
    bandGigs := filteredGigs;

    let filteredTasks = bandTasks.filter(func(_, task) { task.bandId != bandId });
    bandTasks := filteredTasks;

    // Remove all invites for this band
    let filteredInvites = bandInvites.filter(func(_, invite) { invite.bandId != bandId });
    bandInvites := filteredInvites;
  };

  // Invite new member (leader only)
  public shared ({ caller }) func inviteMember(inviteePrincipal : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can invite members");
    };

    let band = switch (bands.values().find(func(b) { b.leaderId == caller })) {
      case (null) { Runtime.trap("You are not the leader of any band") };
      case (?b) { b };
    };

    // Check if invitee is already in band
    if (band.members.any(func(m) { m == inviteePrincipal })) {
      Runtime.trap("User is already a member of the band");
    };

    // Check if invitee has pending invite
    if (bandInvites.containsKey(inviteePrincipal)) {
      Runtime.trap("User already has a pending invite");
    };

    // Check if invitee is registered and not banned
    switch (userProfiles.get(inviteePrincipal)) {
      case (null) {
        Runtime.trap("User is not registered");
      };
      case (?profile) {
        switch (profile.status) {
          case (#banned) { Runtime.trap("User is banned") };
          case (_) {};
        };
      };
    };

    // Store invite
    let invite : BandInvite = {
      inviteeId = inviteePrincipal;
      bandId = band.id;
      inviterName = band.name;
      bandName = band.name;
      sentAt = Time.now();
    };
    bandInvites.add(inviteePrincipal, invite);
  };

  // Get pending invite for caller
  public query ({ caller }) func getPendingInvite() : async ?BandInvite {
    if (caller.isAnonymous()) { return null };
    bandInvites.get(caller);
  };

  // Accept invite and join band
  public shared ({ caller }) func acceptInvite() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can accept invites");
    };

    // Verify invite exists
    let invite = switch (bandInvites.get(caller)) {
      case (null) { Runtime.trap("No pending invite found") };
      case (?inv) { inv };
    };

    // Ensure band still exists
    let band = switch (bands.get(invite.bandId)) {
      case (null) { Runtime.trap("Band does not exist") };
      case (?b) { b };
    };

    // Add member to band
    let updatedBand : Band = {
      id = band.id;
      name = band.name;
      leaderId = band.leaderId;
      members = band.members.concat([caller]);
      createdAt = band.createdAt;
    };
    bands.add(band.id, updatedBand);
    bandInvites.remove(caller); // Remove the invite
  };

  // Decline invite (caller's pending)
  public shared ({ caller }) func declineInvite() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can decline invites");
    };
    if (not bandInvites.containsKey(caller)) {
      Runtime.trap("No pending invite found");
    };
    bandInvites.remove(caller);
  };

  // Remove member from band (leader does operation)
  public shared ({ caller }) func removeMember(member : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can remove members");
    };
    let band = switch (bands.values().find(func(b) { b.leaderId == caller })) {
      case (null) { Runtime.trap("You are not the leader of any band") };
      case (?b) { b };
    };

    // Cannot remove leader through this method
    if (member == band.leaderId) {
      Runtime.trap("Cannot remove band leader. Only band members can be removed");
    };

    // Verify member exists
    if (not band.members.any(func(m) { m == member })) {
      Runtime.trap("User is not a member of the band");
    };

    // Remove member from band
    let updatedMembers = band.members.filter(func(m) { m != member });
    let updatedBand : Band = {
      id = band.id;
      name = band.name;
      leaderId = band.leaderId;
      members = updatedMembers;
      createdAt = band.createdAt;
    };
    bands.add(band.id, updatedBand);
  };

  // Search registered users by display name
  public query ({ caller }) func searchMembers(searchTerm : Text) : async [(Principal, Text)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can search members");
    };
    if (searchTerm.size() == 0) { return [] };
    userProfiles.entries().filter(
      func((p, profile)) { profile.displayName.toLower().contains(#text(searchTerm.toLower())) }
    ).map(
      func((p, profile)) { (p, profile.displayName) }
    ).toArray();
  };

  // Add gig (band member only)
  public shared ({ caller }) func addGig(
    name : Text,
    date : Text,
    time : Text,
    venue : Text,
    notes : Text,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add gigs");
    };

    let band = switch (bands.values().find(func(b) { b.leaderId == caller or b.members.any(func(m) { m == caller }) })) {
      case (null) { Runtime.trap("You are not a member of any band") };
      case (?b) { b };
    };

    let gigId = nextGigId;
    nextGigId += 1;

    let newGig : Gig = {
      id = gigId;
      bandId = band.id;
      name;
      date;
      time;
      venue;
      notes;
      createdAt = Time.now();
    };

    bandGigs.add(gigId, newGig);
    gigId;
  };

  // Edit gig (only by band leader)
  public shared ({ caller }) func editGig(
    gigId : Nat,
    name : Text,
    date : Text,
    time : Text,
    venue : Text,
    notes : Text,
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can edit gigs");
    };

    let original = switch (bandGigs.get(gigId)) {
      case (null) { Runtime.trap("Gig not found") };
      case (?g) { g };
    };

    // Only band leader can edit
    let band = switch (bands.get(original.bandId)) {
      case (null) { Runtime.trap("Band not found") };
      case (?b) { b };
    };

    if (band.leaderId != caller) {
      Runtime.trap("Only the band leader can edit gigs");
    };

    let updated : Gig = {
      id = gigId;
      bandId = original.bandId;
      name;
      date;
      time;
      venue;
      notes;
      createdAt = Time.now();
    };
    bandGigs.add(gigId, updated);
  };

  // Delete gig (band leader only)
  public shared ({ caller }) func deleteGig(gigId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete gigs");
    };

    let gig = switch (bandGigs.get(gigId)) {
      case (null) { Runtime.trap("Gig not found") };
      case (?g) { g };
    };

    let band = switch (bands.get(gig.bandId)) {
      case (null) { Runtime.trap("Band not found") };
      case (?b) { b };
    };

    // Only band leader can delete
    if (band.leaderId != caller) {
      Runtime.trap("Only the band leader can delete gigs");
    };

    bandGigs.remove(gigId);
  };

  // Get all gigs for current user's band
  public query ({ caller }) func getGigs() : async [Gig] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view gigs");
    };
    let band = switch (bands.values().find(func(b) { b.leaderId == caller or b.members.any(func(m) { m == caller }) })) {
      case (null) { Runtime.trap("You are not a member of any band") };
      case (?b) { b };
    };
    bandGigs.values().filter(
      func(gig) { gig.bandId == band.id }
    ).toArray();
  };

  // Add task (band member, with creator principal)
  public shared ({ caller }) func addTask(title : Text, description : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add tasks");
    };

    let band = switch (bands.values().find(func(b) { b.leaderId == caller or b.members.any(func(m) { m == caller }) })) {
      case (null) { Runtime.trap("You are not a member of any band") };
      case (?b) { b };
    };

    let taskId = nextTaskId;
    nextTaskId += 1;

    let newTask : BandTask = {
      id = taskId;
      bandId = band.id;
      title;
      description;
      completed = false;
      creatorId = caller;
      createdAt = Time.now();
    };

    bandTasks.add(taskId, newTask);
    taskId;
  };

  // Toggle task completion (band member only)
  public shared ({ caller }) func completeTask(taskId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can complete tasks");
    };

    let task = switch (bandTasks.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?t) { t };
    };

    // Get band for creator
    let band = switch (bands.get(task.bandId)) {
      case (null) { Runtime.trap("Band not found") };
      case (?b) { b };
    };

    if (not (band.leaderId == caller or band.members.any(func(m) { m == caller }))) {
      Runtime.trap("Only band members can complete tasks");
    };

    // Update task completion status
    let updated : BandTask = {
      id = task.id;
      bandId = task.bandId;
      title = task.title;
      description = task.description;
      completed = not task.completed;
      creatorId = task.creatorId;
      createdAt = Time.now();
    };

    bandTasks.add(task.id, updated);
  };

  // Delete task (band leader can delete any; member can delete own)
  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete tasks");
    };

    let task = switch (bandTasks.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?t) { t };
    };

    // Get band for creator
    let band = switch (bands.get(task.bandId)) {
      case (null) { Runtime.trap("Band not found") };
      case (?b) { b };
    };

    // Band leader can delete anything
    if (band.leaderId != caller) {
      // Otherwise, only creator can delete own
      if (task.creatorId != caller) {
        Runtime.trap("Only the band leader or task creator can delete this task");
      };
    };

    // Remove task from band
    bandTasks.remove(taskId);
  };

  // Get all tasks for current user's band
  public query ({ caller }) func getTasks() : async [BandTask] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    let band = switch (bands.values().find(func(b) { b.leaderId == caller or b.members.any(func(m) { m == caller }) })) {
      case (null) { Runtime.trap("You are not a member of any band") };
      case (?b) { b };
    };
    bandTasks.values().filter(
      func(task) { task.bandId == band.id }
    ).toArray();
  };

  // Rename band (leader only)
  public shared ({ caller }) func renameBand(name : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can rename bands");
    };

    let band = switch (bands.values().find(func(b) { b.leaderId == caller })) {
      case (null) { Runtime.trap("You are not the leader of any band") };
      case (?b) { b };
    };

    // Update band name
    let updated : Band = {
      id = band.id;
      name;
      leaderId = band.leaderId;
      members = band.members;
      createdAt = band.createdAt;
    };
    bands.add(band.id, updated);
  };

  // Fetch band members for current user (with principal/name pairs)
  public query ({ caller }) func getBandMembers() : async [(Principal, Text)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view band members");
    };
    let band = switch (bands.values().find(func(b) { b.leaderId == caller or b.members.any(func(m) { m == caller }) })) {
      case (null) { Runtime.trap("You are not a member of any band") };
      case (?b) { b };
    };

    band.members.map(
      func(p) {
        let displayName = switch (userProfiles.get(p)) {
          case (null) { "Unknown User" };
          case (?profile) { profile.displayName };
        };
        (p, displayName);
      }
    );
  };
};

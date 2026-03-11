import Blob "mo:core/Blob";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import InviteLinksModule "invite-links/invite-links-module";
import UserApproval "user-approval/approval";

actor {
  // Prefab state
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
    switch (accessControlState.userRoles.get(caller)) {
      case (?_) { true };
      case (null) { false };
    };
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

    // Bootstrap admin: code "999", only works before any admin is assigned
    if (code == "999" and not accessControlState.adminAssigned) {
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
      return;
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
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
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
};

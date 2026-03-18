// No migration needed yet, keep for future updates.
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    userProfiles : Map.Map<Principal, {
      displayName : Text;
      avatarUrl : ?Text;
      role : { #admin; #staff; #musician; #client };
      status : { #active; #suspended; #banned };
      joinedAt : Int;
      shareContact : Bool;
      email : ?Text;
      phone : ?Text;
    }>;
    messages : Map.Map<Nat, {
      id : Nat;
      channelId : Text;
      authorPrincipal : Principal;
      authorName : Text;
      content : Text;
      timestamp : Int;
    }>;
    events : Map.Map<Nat, {
      id : Nat;
      title : Text;
      description : Text;
      startTime : Int;
      endTime : Int;
      room : ?Text;
      createdBy : Principal;
    }>;
    freeTimeSlots : Map.Map<Nat, {
      id : Nat;
      room : Text;
      dayLabel : Text;
      timeStart : Text;
      timeEnd : Text;
      note : Text;
    }>;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, {
      displayName : Text;
      avatarUrl : ?Text;
      role : { #admin; #staff; #musician; #client };
      status : { #active; #suspended; #banned };
      joinedAt : Int;
      shareContact : Bool;
      email : ?Text;
      phone : ?Text;
    }>;
    messages : Map.Map<Nat, {
      id : Nat;
      channelId : Text;
      authorPrincipal : Principal;
      authorName : Text;
      content : Text;
      timestamp : Int;
    }>;
    events : Map.Map<Nat, {
      id : Nat;
      title : Text;
      description : Text;
      startTime : Int;
      endTime : Int;
      room : ?Text;
      createdBy : Principal;
    }>;
    freeTimeSlots : Map.Map<Nat, {
      id : Nat;
      room : Text;
      dayLabel : Text;
      timeStart : Text;
      timeEnd : Text;
      note : Text;
    }>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};

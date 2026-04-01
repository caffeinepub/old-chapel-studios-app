import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldActor = {}; // Old actor did not have the new fields.

  type PostComment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    authorName : Text;
    content : Text;
    timestamp : Int;
  };

  type NewActor = {
    postReactions : Map.Map<Nat, Map.Map<Text, [Principal]>>;
    nextCommentId : Nat;
    postComments : Map.Map<Nat, PostComment>;
    postCommentIndex : Map.Map<Nat, [Nat]>;
  };

  public func run(old : OldActor) : NewActor {
    let postReactions = Map.empty<Nat, Map.Map<Text, [Principal]>>();
    let nextCommentId = 0;
    let postComments = Map.empty<Nat, PostComment>();
    let postCommentIndex = Map.empty<Nat, [Nat]>();

    {
      postReactions;
      nextCommentId;
      postComments;
      postCommentIndex;
    };
  };
};

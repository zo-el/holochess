'use strict';

// ==============================================================================
// EXPOSED Functions: visible to the UI, can be called via localhost, web browser, or socket
// ===============================================================================

// global const
var APP_ID = App.DNA.Hash;
var ME     = App.Key.Hash;

var GAME_STATE_NULL               = 1 << 0;
var GAME_STATE_CHALLENGE_PENDING  = 1 << 1;
var GAME_STATE_ACTIVE             = 1 << 2;
var GAME_STATE_FINISHED_WHITE_WIN = 1 << 3;
var GAME_STATE_FINISHED_BLACK_WIN = 1 << 4;
var GAME_STATE_FINISHED_DRAW      = 1 << 5;

//
function getMyHash()
{
    return ME;
}

// The definition of the function you intend to expose
function getAppProperty(name)
{            
  if (name == "App_Agent_Hash")   { return App.Agent.Hash; }
  if (name == "App_Agent_String") { return App.Agent.String; }
  if (name == "App_Key_Hash")     { return App.Key.Hash; }
  if (name == "App_DNA_Hash")     { return App.DNA.Hash; }
  return "Error: No App Property with name: " + name;
}


// HANDLES / AGENT
// ==============================================================================

/**
 *  set the handle of this node
 *  TODO check handle validity (alphanum?)
 */
function setHandle(handle)
{
  // // get old handle (if any)
  // var oldHandle = getAnchor(ME + ":handle");

  // // if there was one, remove old handle from directory by index
  // if (oldHandle != null)
  // {
  //   removeFromListAnchor("userDirectory", undefined, undefined, oldHandle);
  // }
  // // set handle
  // setAnchor(ME + ":handle", handle);

  // // Add the new handle to the directory
  // addToListAnchor("userDirectory", ME, undefined, handle);

  // return makeAnchorHash(handle);
}


// returns all the handles in the directory
function getHandles()
{
  // var rtn = getFromListAnchor("userDirectory");
  // handles = [];
  // for(var x = 0; x < rtn.length; x++)
  // {
  //   handles.push({ handle: rtn[x].index, hash: rtn[x].value });
  // }
  // handles.sort(function (a, b)
  // {
  //     if (a.handle < b.handle)
  //       return -1;
  //     if (a.handle > b.handle)
  //        return 1;
  //     return 0;
  // });
  // return handles;
}

// returns the current handle of this node
function getMyHandle()
{
  return getHandle(ME);
}

// returns the handle of an agent
function getHandle(userHash)
{
  //return getAnchor(userHash + ":handle");
}

// gets the AgentID (userAddress) based on handle
function getAgent(handle)
{
   //return getFromListAnchor("userDirectory", handle);
}


// holochess
// ==============================================================================

// Create a Challenge Entry
function commitChallenge(opponent, challengerPlaysWhite, isGamePublic)
{
  // Build and commit challenge entry to my source chain
  var challenge =
  {
    challenger          : ME,
    opponent            : opponent,
    challengerPlaysWhite: challengerPlaysWhite,
    isGamePublic        : isGamePublic
  };
  
  var challengeHashkey = commit('challenge', challenge);

  debug("new challenge: "+ challengeHashkey + "\n\t challenger: " + ME + "\n\t opponent:" + opponent);

  // On the DHT, put a link on my hashkey, and my opponents hashkey, to the new challenge.
  commit("challenge_links", {Links:[{Base:ME,Link:challengeHashkey,Tag:"challengeInitiated"}]});
  commit("challenge_links", {Links:[{Base:opponent,Link:challengeHashkey,Tag:"challengeReceived"}]});
  return challengeHashkey;
}

// Create a Challenge Entry
function commitMove(gameHashkey, san)
{
  // Build and commit move entry to my source chain  
  var move = { gameHash: gameHashkey, san: san };
  var moveHashkey = commit('move', entry);

  debug("new move on game: "+ gameHashkey + "\n\t san: " + san + "  (" + moveHashkey + ")");

  // On the DHT, put a link on the challenge's hashkey to the new move.
  commit("move_links", {Links:[{Base:gameHashkey,Link:moveHashkey,Tag:"move"}]});
  return moveHashkey;
}


// return array of all moves of a game, in SAN strings
function getMoves(gameHashkey)
{
  // getLinks from DHT
  var moves = getLoadedLinks(base, "move");
  debug("getMoves of game: " + gameHashkey + "\n\t moves found: " + moves.length);

  // Sort by timestamp
  moves.sort(function (a, b) {return b.timeStamp - a.timeStamp;} );

  // Convert to SAN string array
  var sanMoves = [];  
  for(var i = 0; i < moves.length; i++)
  {
    var move = moves[i];
    sanMoves.push(move.san);
    debug("\t " + i + ". " + move.san);
  }
  return sanMoves;
}


// return list of hash of games that corresponds to query
//// function getGamesBy(stateMask, challenger, opponent)
function getMyGames()
{
  debug("getGames of game: " + gameHashkey + "\n\t moves found: " + moves.length);

  // getLinks from DHT
  var challengeLinks = getUnloadedLinks(ME);
  debug("\t count: " + challengeLinks.length);
  
  return challengeLinks;
}


// ==============================================================================
// HELPERS: unexposed functions
// ==============================================================================

// return two node id's in alphabetical order
function orderNodeIds(challenger, opponent) 
{
  return (challenger < opponent ? challenger + "|" + opponent : opponent + "|" + challenger);
}

// helper function to determine if value returned from holochain function is an error
function isErr(result) 
{
  return ((typeof result === 'object') && result.name == "HolochainError");
}


// helper function to do getLinks call, handle the no-link error case, and copy the returned entry values into a nicer array
function getLoadedLinks(base, tag) 
{
  // get the tag from the base in the DHT
  var links = getLinks(base, tag,{Load:true});
  if (isErr(links)) {
      links = [];
  } else {
      links = links;
  }
  var links_filled = [];
  for (var i=0;i <links.length;i++) {
      var link = {H:links[i].Hash};
      link[tag] = links[i].Entry;
      links_filled.push(link);
  }
  return links_filled;
}

// helper function to call getLinks, handle the no links entry error, and build a simpler links array.
function getUnloadedLinks(base,tag) 
{
  // get the tag from the base in the DHT
  var links = getLinks(base, tag,{Load:false});
  if (isErr(links)) {
      links = [];
  }
   else {
      links = links;
  }
  debug("Links:"+JSON.stringify(links));
  var links_filled = [];
  for (var i=0;i <links.length;i++)
  {
      links_filled.push(links[i].Hash);
  }
  return links_filled;
}

// ==============================================================================
// CALLBACKS: Called by back-end system, instead of front-end app or UI
// ===============================================================================

// GENESIS - Called only when your source chain is generated:'hc gen chain <name>'
// ===============================================================================

/**
 * Called only when your source chain is generated
 * @return {boolean} success
 */
function genesis()
{
  setHandle(App.Agent.String);
  return true;
}

// -----------------------------------------------------------------
//  validation functions for every DHT entry change
// -----------------------------------------------------------------

/**
 * Validate Challenge Entry
 * Challenger and Opponent must be different
 * @return {boolean} success
 */
function validateChallenge(entry, header, pkg, sources)
{
  if(entry.challenger === entry.opponent)
  {
    debug("Challenge not valid because challenger and opponent are same.");
    return false;
  }
  return validate('challenge', entry, header, pkg, sources);
}


/**
 * Called only when your source chain is generated
 * @return {boolean} success
 */
function validateMove(entry, header, pkg, sources)
{
  // FIXME check game exists
  // FIXME check SAN string
  // FIXME check chess move
  return validate('move', entry, header, pkg, sources);
}

// Dispatcher
function validateCommit(entryName, entry, header, pkg, sources)
{
  switch (entryName)
  {
    case 'challenge':
      return validateChallenge(entry, header, pkg, sources);
    case 'move':
      return validateMove(entry, header, pkg, sources);      
    case 'handle':
    case 'game_result':
    case 'challenge_links':
    case 'handle_links':
    case 'directory_links':
      return true;
    default:
      // invalid entry name
      return false
  }
}

function validatePut(entryName, entry, header, pkg, sources)
{
  switch (entryName)
  {
    case 'challenge':
      return validateChallenge(entry, header, pkg, sources);
    case 'move':
      return validateMove(entry, header, pkg, sources); 
      case 'handle':
      case 'game_result':
      case 'challenge_links':
      case 'handle_links':
      case 'directory_links':
        return true;      
    default:
      // invalid entry name
      return false
  }
}

// TODO: Add 'challenge accepted' flag
function validateMod(entryName, entry, header, replaces, pkg, sources)
{
  switch (entryName)
  {
    case 'challenge':
    case 'move':
    case 'handle':
    case 'game_result':
    case 'challenge_links':
    case 'handle_links':
    case 'directory_links':  
      return false;
    default:
      // invalid entry name
      return false;
  }
}

// TODO: Possibility to remove challenge if it has not been accepted
function validateDel(entryName,hash, pkg, sources)
{
  switch (entryName)
  {
    case 'challenge':
    case 'move':
    case 'handle':
    case 'game_result':
    case 'challenge_links':
    case 'handle_links':
    case 'directory_links':
      return false;
    default:
      // invalid entry name
      return false;
  }
}


function validatePutPkg(entry_type) {return null}
function validateModPkg(entry_type) { return null}
function validateDelPkg(entry_type) { return null}
function validateLinkPkg(entry_type) { return null}
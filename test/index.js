// This test file uses the tape testing framework.
// To learn more, go here: https://github.com/substack/tape
const { Config, Scenario } = require("@holochain/holochain-nodejs")
Scenario.setTape(require("tape"))

const dnaPath = "./dist/game-matchmaking.dna.json"
const agentAlice = Config.agent("alice")
const agentBob = Config.agent("bob")
const dna = Config.dna(dnaPath)
const instanceAlice = Config.instance(agentAlice, dna)
const instanceBob = Config.instance(agentBob, dna)
const scenario = new Scenario([instanceAlice, instanceBob])

scenario.runTape("Alice can create a proposal and retrieve it", async (t, { alice }) => {
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.callSync("main", "create_proposal", {message : "sup"})
  console.log(addr)
  t.deepEqual(addr.Ok.length, 46)

  // if a function takes no arguments we must still pass an empty object
  const proposals = await alice.callSync("main", "get_proposals", {})
  console.log(proposals)
  t.deepEqual(proposals.Ok.length, 1)
})

// It is possible to write scenarios with multiple agents!
scenario.runTape("Bob can see the proposal created by Alice", async (t, { alice, bob }) => {
  const addr = await alice.callSync("main", "create_proposal", {message : "sup"})
  console.log(addr)
  t.deepEqual(addr.Ok.length, 46)

  const proposals = await bob.callSync("main", "get_proposals", {})
  console.log(proposals)
  t.deepEqual(proposals.Ok.length, 1)
})

// It is possible to write scenarios with multiple agents!
scenario.runTape("Bob can accept Alices proposal, create a game and Alice can see the game", async (t, { alice, bob }) => {
  const addr = await alice.callSync("main", "create_proposal", {message : "sup"})
  console.log(addr)
  t.equal(addr.Ok.length, 46)

  const proposals = await bob.callSync("main", "get_proposals", {})
  console.log(proposals)
  t.equal(proposals.Ok.length, 1)

  const acceptance = await bob.callSync("main", "accept_proposal", { proposal: proposals.Ok[0], created_at: 0 })
  console.log(acceptance)
  t.notEqual(acceptance.Ok, undefined) // check it returned Ok

  const games = await bob.callSync("main", "check_responses", { proposal_addr: addr.Ok })
  console.log(games)
  t.deepEqual(
  	games.Ok, 
  	[{
  		player_1: bob.agentId,
  		player_2: alice.agentId,
  		created_at: 0,
  	}]
  )
})

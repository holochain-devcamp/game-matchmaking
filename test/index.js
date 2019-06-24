const path = require('path')
const tape = require('tape')

const { Diorama, tapeExecutor, backwardCompatibilityMiddleware } = require('@holochain/diorama')

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error('got unhandledRejection:', error);
});

const dnaPath = path.join(__dirname, "../dist/game-matchmaking.dna.json")
const dna = Diorama.dna(dnaPath, 'game-matchmaking')

const diorama = new Diorama({
  instances: {
    alice: dna,
    bob: dna,
  },
  bridges: [],
  debugLog: false,
  executor: tapeExecutor(require('tape')),
  middleware: backwardCompatibilityMiddleware,
})

diorama.registerScenario("Alice can create a proposal and retrieve it", async (s, t, { alice }) => {
  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.callSync("main", "create_proposal", {message : "sup"})
  console.log(addr)
  t.deepEqual(addr.Ok.length, 46, 'proposal was added successfully')

  // if a function takes no arguments we must still pass an empty object
  const proposals = await alice.callSync("main", "get_proposals", {})
  console.log(proposals)
  t.deepEqual(proposals.Ok.length, 1, 'alice can see own proposal')
})

// It is possible to write scenarios with multiple agents!
diorama.registerScenario("Bob can see the proposal created by Alice", async (s, t, { alice, bob }) => {
  const addr = await alice.callSync("main", "create_proposal", {message : "sup"})
  console.log(addr)
  t.deepEqual(addr.Ok.length, 46, 'proposal was added successfully')

  const proposals = await bob.callSync("main", "get_proposals", {})
  console.log(proposals)
  t.deepEqual(proposals.Ok.length, 1, 'bob can see proposal')
})

diorama.run()

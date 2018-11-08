# What is HdWallet?

It's a class containing the keys and methods that need keys to be used within the Swarm City DApp.

# How to use HdWallet

## Initialize

First, it has to be instantiated. The constructor needs:

- source entropy: by passing the property mnemonic. The mnemonic is a 12 words seed following the bip39 standard. If `mnemonic` is not set, a random seed phrase will be randomly generated.
- transport: it will be used to communicate with the server. Can be a websocket connection, a whisper channel, or internal events. `transport` must be an object with the normal event methods `transport.on` and `transport.emit` methods.
- name: currently used within tests to identify the sender.

```javascript
hdWallet = new HdWallet({
  mnemonic,
  transport: transport(),
  name: "Alice"
});
```

## Item flow

NOTE: async methods involve transport (server communication)

### Create item

First, the seeker will create an item and generate it's itemHash. Now the hash contains sufficient information for the seeker to be able to recover the keys from it. When calling `createItem()`, the item chat and keypair keys will be stored internally, but only the itemHash is returned.

```javascript
itemHash = hdWalletSeeker.createItem();
```

### Provider replies

The provider must attach a publicKey with the reply. This publicKey is derived from the itemHash, which must be passed as and argument

```javascript
const accessKeyProvider = hdWalletProvider.requestAccess(itemHash);
```

### Seeker gives access to the provider

When the provider is selected / or the provider funds the deal, the seeker can give access to the item keys to the provider, in order to chat. The provider's access publicKey must be known. The seeker will encrypt the itemSeed with the provider's publicKey and post it in the server.

```javascript
await hdWalletSeeker.giveAccess(itemHash, accessKeyProvider);
```

### Provider claims access to the chat

The provider must retrieve the data stored in the server in order to gain access to the chat. The credentials are decrypted and stored internally in the class.

```javascript
await hdWalletProvider.getAccess(itemHash);
```

### Chat start

Either the provider or the seeker can engange in the chat. They can post messages,

```javascript
await hdWalletSeeker.sendMessage(itemHash, "Hello provider");
```

subscribe to the chat,

```javascript
hdWalletProvider.joinChat(itemHash, message => {
  doSomethingWithTheMessage(message);
});
```

or retrieve the conversation if they where absent

```javascript
const retrievedMessages = await hdWalletProvider.getMessages(itemHash);
```

# What is HdWallet?

It's a class containing the keys and methods that need keys to be used within the Swarm City DApp.

# How to use HdWallet

## Initialize

First, it has to be instantiated. The constructor needs:

- transport: it will be used to communicate with the server. Can be a websocket connection, a whisper channel, or internal events. `transport` must be an object with the normal event methods `transport.on` and `transport.emit` methods.

```javascript
hdWallet = new HdWallet({
  transport: transport()
});
```

## Item flow

NOTE: async methods involve transport (server communication)

### Create item

First, the seeker will create an item and generate it's itemHash. Now the hash contains sufficient information for the seeker to be able to recover the keys from it. When calling `createItem()`, the item chat and keypair keys will be stored internally, but only the itemHash is returned.

```javascript
itemHash = hdWallet.createItem(privateKey);
// itemHash = 0x394a93cdebef560305e56b9529946dcddaa0abcb6bac480555a5bc9a66d9547d
// 32 bytes hex string prepended by 0x
```

### Provider replies

The provider must attach a publicKey with the reply. This publicKey is derived from the itemHash, which must be passed as and argument

```javascript
const accessKey = hdWallet.requestAccess(privateKey, itemHash);
// accessKey = 0x9eef05739c646353e552e4578acb4db6180144dfcb89b60bbed847bafb334544
// 32 bytes hex string prepended by 0x
```

### Seeker gives access to the provider

When the provider is selected / or the provider funds the deal, the seeker can give access to the item keys to the provider, in order to chat. The provider's access publicKey must be known. The seeker will encrypt the itemSeed with the provider's publicKey and post it in the server.

```javascript
await hdWallet.giveAccess(privateKey, itemHash, accessKeyProvider);
```

### Chat start

To engange in a chat, first they have to join it. The `joinChat` method retrieve the keys and sets up a subscription to the chat, automatically decrypting messages. It is also the way to get the entire conversation when joining. All existing messages will be sent on every change.

```javascript
await hdWallet.joinChat(privateKey, itemHash, callback)

// The callback is called everytime a new message is sent and at the moment of joining the chat
function callback(messages) {
  doSomethingWithTheMessage(messages);
});
```

Messages are objects with this structure:

```
[ { text: 'Hello Bob, I\'m Alice.',
    user: 'Alice',
    timestamp: 1541830721753 },
  { text: 'So nice to meet you',
    user: 'Bob',
    timestamp: 1541830721863 } ]
```

Once the user has joined the chat, send messages:

```javascript
await hdWallet.sendMessage(itemHash, text, user);
```

The user property is supposed to be used to identify users. It can be a username or their address, to be less changable.

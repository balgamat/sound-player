const { SoundPlayer } = require("./index.js");

const filenames = process.argv.slice(2);
let a = true;

const channels = filenames.map(f => {
  const channel = new SoundPlayer({onClose: () => {console.log('Ended')}});
  channel.play({ filename: f });
  return channel;
});

setTimeout(() => channels[0].play({ filename: filenames[0], volume: 10 }), 10000);


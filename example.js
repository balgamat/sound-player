const { SoundPlayer } = require("./index.js");

const filenames = process.argv.slice(2);
let a = true;

const channels = filenames.map(f => {
  const channel = new SoundPlayer({device: 'hw1,0',onFinished: () => {console.log('Ended')}});
  channel.play({ filename: f });
  return channel;
});

setTimeout(() => channels[0].play({ filename: filenames[0] }), 2000);


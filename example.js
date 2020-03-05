const { SoundPlayer } = require("./index.js");

const filenames = process.argv.slice(2);
let a = true;

const sp =  new SoundPlayer({});

const channels = filenames.map((f, i) => {
  sp.play({ filename: f, ch: i.toString() });
});


setTimeout(() => sp.stop(1), 1000);
setTimeout(() => sp.stop(0), 3000);
setTimeout(() => sp.play({ filename: filenames[0], volume: 100, channel: 0}), 4000);


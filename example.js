const { SoundPlayer } = require("./index.js");

const filenames = process.argv.slice(2);
let a = true;

const sp = new SoundPlayer({ device: 0 });

const channels = filenames.map((f, i) => {
  sp.play({ filename: f, channel: i.toString(), loop: true });
});

setTimeout(() => sp.stop({ channel: 1 }), 2000);
setTimeout(() => sp.stop({ channel: 0 }), 4000);

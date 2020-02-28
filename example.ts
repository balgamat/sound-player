import { SoundPlayer } from "./index";

const filenames = process.argv.slice(2);
let a = true;

filenames.map(f => {
  const channel = new SoundPlayer({onClose: () => {console.log('Ended')}});
  channel.play({ filename: f });
});


import * as fs from "fs";
// @ts-ignore
import { Decoder, STEREO } from "lame";
const portAudio = require("naudiodon");
const volumeControl = require("pcm-volume");
import { Input as Channel, Mixer } from "audio-mixer";

class SoundPlayer {
  public readonly device?: number;
  private readonly onFinished: () => void;
  private readonly onError: () => void;
  private readonly _speaker: any;
  private _mixer: any;
  private _channels: any = {};

  constructor({
    device = -1,
    onFinished = () => {},
    onError = () => {}
  }: ISoundPlayer = {}) {
    this.device = device;
    this.onFinished = onFinished;
    this.onError = onError;
    this._mixer = new Mixer({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100,
      // @ts-ignore
      clearInterval: 100
    });
    this._speaker = new portAudio.AudioIO({
      outOptions: {
        channelCount: 2,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: 44100,
        deviceId: this.device, // Use -1 or omit the deviceId to select the default device
        closeOnError: false // Close the stream if an audio error is detected, if set false then just log the error
      }
    });
    this._mixer.pipe(this._speaker);
    this._speaker.start();
  }

  private createChannel = () => {
    const decoder = new Decoder({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100,
      bitRate: 256,
      outSampleRate: 44100,
      mode: STEREO
    });

    const output = new Channel({
      volume: 100
    });

    return [decoder, output];
  };

  play = ({ filename, volume = 100, channel = 0, loop = false }: IPlay) => {
    const [i, o] = this.createChannel();
    const c = fs
      .createReadStream(filename)
      .pipe(i)
      .pipe(o);
    c.setVolume(volume);
    c.on("unpipe", () => console.log("unpiped"));
    this._mixer.addInput(c);
    this._channels[channel] = { i, o };
  };

  static getDevices() {
    return portAudio
      .getDevices()
      .filter((d: any) => d.maxOutputChannels > 0)
      .map((d: any) => ({ id: d.id, name: d.name }));
  }

  stop = ({ channel = 0 }: { channel: number }) => {
    try {
      console.log("Stopping...", this._mixer.inputs.length);
      if (this._channels[channel]) {
        // @ts-ignore
        this._channels[channel].i.unpipe();
        // @ts-ignore
        this._channels[channel].o.end();
        this._mixer.removeInput(this._channels[channel].o);
      }
      console.log("Stopped...", this._mixer.inputs.length);
    } catch (e) {
      console.log(e);
    }
  };

  close = () => {
    this._speaker.quit();
  };
}

export { SoundPlayer };

export interface IPlay {
  filename: string;
  volume?: number;
  channel?: number;
  loop?: boolean;
}

export interface IChannel {
  decoder: Decoder;
  output: Channel;
  file: fs.ReadStream;
}

export interface ISoundPlayer {
  device?: number;
  onFinished?: () => void;
  onError?: (data?: any) => void;
}

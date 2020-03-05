import { execSync } from "child_process";
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
  private _channels: Record<number, Channel> = {};

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
      sampleRate: 44100
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

  private createChannel = ({
    volume,
    filename
  }: Pick<IPlay, "volume" | "filename">) =>
    new Promise<Channel>((resolve, reject) => {
      const decoder = new Decoder({
        channels: 2,
        bitDepth: 16,
        sampleRate: 44100,
        bitRate: 256,
        outSampleRate: 44100,
        mode: STEREO
      });
      const file = fs.createReadStream(filename);
      const pcmStream = file.pipe(decoder);

      decoder.on("format", (f: any) => {
        const output = new Channel({
          volume,
          sampleRate: f.sampleRate,
          channels: f.channels,
          bitDepth: f.bitDepth
        });
        pcmStream.pipe(output);

        resolve(output);
      });
    });

  play = ({ filename, volume = 100, channel = 0 }: IPlay) => {
    this.createChannel({ filename, volume }).then(c => {
      this._mixer.addInput(c);
      this._channels[channel] = c;
    });
  };

  static getDevices() {
    return portAudio.getDevices()
      .filter((d: any) => d.maxOutputChannels > 0)
      .map((d: any) => ({ id: d.id, name: d.name }));
  }

  stop = ({ channel = 0 }: { channel: number }) => {
    try {
      console.log("Stopping...");
      this._channels[channel].setVolume(0);
      this._channels[channel].clear();
      this._mixer.removeInput(this._channels[channel]);
    } catch (e) {
      console.log(e);
    }
  };

  close = () => {
    Object.keys(this._channels).map(channel =>
      this._channels[parseInt(channel)].end()
    );
    this._speaker.quit();
  };
}

export { SoundPlayer };

export interface IPlay {
  filename: string;
  volume?: number;
  channel?: number;
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

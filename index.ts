import { execSync } from "child_process";
import * as fs from "fs";
// @ts-ignore
import { Decoder, STEREO } from "lame";
const Speaker = require("speaker");
const volumeControl = require("pcm-volume");

class SoundPlayer {
  public readonly device?: ISoundDevice | null;
  private _volume: any;
  private _volumeValue: number = 100;
  private _speaker: any;
  private _decoder: Decoder;
  private readonly onClose: () => void;
  private readonly onError: () => void;

  constructor({
    device = null,
    onClose = () => {},
    onError = () => {}
  }: ISoundPlayer = {}) {
    this.device = device;
    this.onClose = onClose;
    this.onError = onError;
    this._speaker = new Speaker({
      // @ts-ignore
      device: device?.address
    });
    this._decoder = new Decoder({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100,
      bitRate: 128,
      outSampleRate: 22050,
      mode: STEREO
    });
    this._volume = new volumeControl();
  }

  static getDevices() {
    try {
      return execSync("cat /proc/asound/pcm")
        .toString()
        .split("\n")
        .reduce((acc: ISoundDevice[], line: string) => {
          const [rawAddress, name] = line.split(": ");
          const addr =
            rawAddress &&
            rawAddress
              .split("-")
              .map(i => parseInt(i))
              .join(",");
          return addr
            ? [...acc, { address: `hw:${addr}`, name: `${name} [${addr}]` }]
            : acc;
        }, []);
    } catch {
      return [];
    }
  }

  play({ filename, volume = 100 }: IPlay) {
    this._speaker = new Speaker({
      // @ts-ignore
      device: this.device?.address || null
    });
    this._decoder = new Decoder({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100,
      bitRate: 128,
      outSampleRate: 22050,
      mode: STEREO
    });
    // @ts-ignore
    this._volume = new volumeControl();

    try {
      const fileStream = fs.createReadStream(filename);
      this._decoder.pipe(this._volume);
      this._volume.pipe(this._speaker);
      fileStream.pipe(this._decoder);
      this._speaker.on("flush", () => {
        console.log(`${filename} ended.`);
        this._speaker.close();
      });
      this.volume = volume;
    } catch {}
  }

  stop() {
    try {
      this._speaker.close();
    } catch {}
  }

  public get volume() {
    return this._volumeValue * 100;
  }

  public set volume(value) {
    this._volumeValue = Math.min(Math.max(value, 0), 100) / 100;
    this._volume.setVolume(this._volumeValue);
  }
}

export { SoundPlayer };

export interface IPlay {
  filename: string;
  volume?: number;
}

export interface ISoundDevice {
  address: string;
  name: string;
}

export interface ISoundPlayer {
  device?: ISoundDevice | null;
  onClose?: () => void;
  onError?: (data?: any) => void;
}

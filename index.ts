import { execSync } from "child_process";
import * as fs from "fs";
// @ts-ignore
import { Decoder, STEREO } from "lame";
const Speaker = require("speaker");
const volumeControl = require("pcm-volume");

process.on("unhandledRejection", () => {});
process.on("warning", () => {});

class SoundPlayer {
  public readonly device?: string | null;
  private _volume: any;
  private _volumeValue: number = 100;
  private _speaker: any;
  private _decoder: Decoder;
  private _fs: fs.ReadStream | null;
  private readonly onFinished: () => void;
  private readonly onError: (e: any) => void;

  constructor({
    device = null,
    onFinished = () => {},
    onError = (_) => {}
  }: ISoundPlayer = {}) {
    this.device = device;
    this.onFinished = onFinished;
    this.onError = onError;
    this._speaker = new Speaker({
      // @ts-ignore
      device
    });
    console.log(`Using device: ${device}`);
    this._fs = null;
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

  play({ filename, volume = 100, loop = false }: IPlay) {
    try {
      this._speaker.close();
    } catch (e) { this.onError(e) }

    try {
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

      const fileStream = fs.createReadStream(filename);
      fileStream.pipe(this._decoder);
      this._decoder.on('format', (f: any) => {
        this._speaker = new Speaker({
          // @ts-ignore
          device: this.device?.address || null,
          sampleRate: f.sampleRate,
          channels: f.channels,
          bitDepth: f.bitDepth
        });

        this._speaker.on("flush", () => {
          this.onFinished();
          this._speaker.close();
          !!loop && this.play({filename, volume, loop});
        });
        this.volume = volume;

        this._decoder.pipe(this._volume);
        this._volume.pipe(this._speaker);
      });
    } catch (e) { this.onError(e) }
  }

  stop() {
    try {
      this._speaker.close();
    } catch (e) { this.onError(e) }
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
  loop?: boolean;
}

export interface ISoundPlayer {
  device?: string | null;
  onFinished?: () => void;
  onError?: (data?: any) => void;
}

export interface ISoundDevice {
  address: string;
  name: string;
}

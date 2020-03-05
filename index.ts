import { execSync } from "child_process";
import * as fs from "fs";
// @ts-ignore
import { Decoder, STEREO } from "lame";
const portAudio = require('naudiodon');
const volumeControl = require("pcm-volume");

process.on('unhandledRejection', () => {});

class SoundPlayer {
  public readonly device?: number;
  private _volume: any;
  private _volumeValue: number = 100;
  private _speaker: any;
  private _decoder: Decoder;
  private _file?: fs.ReadStream;
  private readonly onClose: () => void;
  private readonly onError: () => void;

  constructor({
    device = -1,
    onClose = () => {},
    onError = () => {}
  }: ISoundPlayer = {}) {
    this.device = device;
    this.onClose = onClose;
    this.onError = onError;
    this.createOutput();
  }

  createOutput() {
    this._speaker = new portAudio.AudioIO({
      outOptions: {
        channelCount: 2,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: 48000,
        deviceId: this.device, // Use -1 or omit the deviceId to select the default device
        closeOnError: false // Close the stream if an audio error is detected, if set false then just log the error
      }
    });
    this._decoder = new Decoder({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100,
      bitRate: 256,
      outSampleRate: 48000,
      mode: STEREO
    });
    this._volume = new volumeControl();
  }

  static getDevices() {
    return portAudio.getDevices();
  }

  play({ filename, volume = 100 }: IPlay) {
    try {
      this.stop();
    } catch {}

    try {
      this.createOutput();
      // @ts-ignore
      this._file = fs.createReadStream(filename);
      this._volume.pipe(this._speaker);
      this._decoder.pipe(this._volume);
      this._file.pipe(this._decoder);
      this.volume = volume;
      this._speaker.start();
    } catch {}
  }

  stop() {
    try {
      this.volume = 0;
      this._speaker.cork();
      this._speaker.quit();
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

export interface ISoundPlayer {
  device?: number;
  onClose?: () => void;
  onError?: (data?: any) => void;
}

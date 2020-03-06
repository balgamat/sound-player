import { ChildProcessWithoutNullStreams, execSync, spawn } from "child_process";
import { EventEmitter } from "events";
import { Writable } from "stream";
const es = require("event-stream"),
  through = require("through");

export interface ISoundDevice {
  id: string;
  name: string;
}

export interface IPlayerParams {
  device?: ISoundDevice;
  noFrames?: boolean;
}

export class SoundPlayer extends EventEmitter {
  private _gpcb: any[] = [];
  private _s: any;
  private controlStream: Writable;
  private mpg123: ChildProcessWithoutNullStreams;
  public bitrate: any;
  public channels: any;
  public file: any;
  public length: any;
  public mpeg: any;
  public sampleRate: any;
  public samples: any;
  public track: any;

  constructor({ device, noFrames }: IPlayerParams = {}) {
    super();

    const args = ["-R"];
    !!device && args.push("-a" + device.id);
    console.log(args);

    this.mpg123 = spawn("mpg123", args);
    this.controlStream = this.mpg123.stdin;
    if (noFrames) this._cmd("SILENCE");

    this.mpg123.stdout.pipe(es.split()).pipe(
      through((data: any) => {
        console.log("data", data);
        const line = data.split(" ").shift();
        console.log("line", line);
        const type = line.split(" ").shift();
        switch (type) {
          case "@P":
            const event = ["end", "pause", "resume"][+line.split(" ")];
            this.emit(event);
            if (event == "end" && this._s != 1) {
              this.track = this.file = null;
            }
            break;
          case "@E":
            const err = new Error(line);
            // @ts-ignore
            err.type = "mpg-player";
            if (line.indexOf("No stream opened") != -1) {
              for (let i = 0, l = this._gpcb.length; i < l; i++)
                this._gpcb[i](0, 0, 0);
              this._gpcb = [];
            }
            this.emit("error", err);
            this.close();
            break;
          case "@F":
            this.emit("frame", line);
            break;
          case "@J":
            this.emit("jump");
            break;
          case "@V":
            let per = line[0];
            per = per.substring(0, per.length - 1);
            this.emit("volume", per);
            break;
          case "@S":
            if (this._s == 1) {
              this.mpeg = Number(line[0]);
              this.sampleRate = line[2];
              this.channels = Number(line[4]);
              this.bitrate = Number(line[10]);
              this._s = 2;
              this._cmd("SAMPLE");
            }
            break;
          case "@SAMPLE":
            if (this._s == 2) {
              this.samples = line[1];
              this.length =
                Math.round((this.samples / this.sampleRate) * 10) / 10;
              this._s = 0;
              this.emit("format");
            }
            const s = line[0],
              l = line[1],
              p = s / l;
            for (let i = 0, l = this._gpcb.length; i < l; i++)
              this._gpcb[i](p, s, l);
            this._gpcb = [];
            break;
        }
      })
    );
  }

  public _cmd = (...args: any[]) => {
    this.controlStream.write(args.join(" ") + "\n");
    return this;
  };

  public close = () => {
    this.mpg123.kill();
  };

  public getProgress = (callback: any) => {
    this._gpcb.push(callback);
    return this._cmd("SAMPLE");
  };

  public pause = () => {
    return this._cmd("P");
  };

  public pitch = (value: number) => {
    const normalizedValue = Math.min(Math.max(value, -0.75), 0.1);
    return this._cmd("PITCH", normalizedValue);
  };

  public play = (path: string) => {
    this.track = path.substr(path.lastIndexOf("/") + 1);
    this.file = path;
    this._s = 1;
    return this._cmd("L", path);
  };

  public seek = (value: number) => {
    const normalizedValue = Math.min(Math.max(value, 0), 1);
    return this._cmd("K", Math.floor(normalizedValue * this.samples));
  };

  public stop = () => {
    return this._cmd("S");
  };

  public volume = (value: number) => {
    const normalizedValue = Math.min(Math.max(value, 0), 100);
    return this._cmd("V", normalizedValue);
  };

  public static getDevices = (): ISoundDevice[] => {
    try {
      return process.platform === "linux"
        ? execSync("cat /proc/asound/pcm")
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
                ? [...acc, { id: `hw:${addr}`, name: `${name} [${addr}]` }]
                : acc;
            }, [])
        : [];
    } catch {
      return [];
    }
  };
}

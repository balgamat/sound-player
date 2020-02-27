import { execSync } from "child_process";

export interface SoundDevice {
  address: string;
  name: string;
}

const getDevices = () => {
  try {
    return execSync("cat /proc/asound/pcm")
      .toString()
      .split("\n")
      .reduce((acc: SoundDevice[], line: string) => {
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
};



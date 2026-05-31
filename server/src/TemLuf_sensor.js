import * as i2c from "i2c-bus";

const delay = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const readSensorTL = async () => {
  const bus = i2c.openSync(1);
  const DEVICE_ADDR = 0x44;

  const buffer = Buffer.alloc(6);
  const wbuffer = Buffer.alloc(1);

  wbuffer.writeUint8(0xfd, 0);

  bus.i2cWriteSync(DEVICE_ADDR, 1, wbuffer);
  await delay(150);
  bus.i2cReadSync(DEVICE_ADDR, 6, buffer);

  bus.closeSync();

  const tempRaw = buffer.readUInt16BE(0);
  const tC = -45 + (175 * tempRaw) / (Math.pow(2, 16) - 1);

  const rhRaw = buffer.readUInt16BE(3);
  const rhPct = -6 + (125 * rhRaw) / (Math.pow(2, 16) - 1);

  return {
    tC: Number(tC.toFixed(2)),
    rhPct: Number(rhPct.toFixed(2)),
  };
};

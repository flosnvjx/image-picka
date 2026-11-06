import {makeZip} from "client-zip"
import {defer} from "./defer.js";

const EXT = "zip";

export function getZipPacker() {
  const chunks = [];
  let pendingPipe = null;
  let itemReady = defer();
  let zipReady = defer();
  return {
    prepare,
    pack,
    save,
    waitResponse: true,
    singleThread: true,
  }

  async function prepare() {
    const zipStream = makeZip(async function*() {
      let item;
      while ((item = await itemReady.promise)) {
        yield item;
        zipReady.resolve();
        zipReady = defer();
      }
    }());
    pendingPipe = (async () => {
      const reader = zipStream.getReader();
      for (;;) {
        const {value, done} = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();
  }

  async function pack({blob, filename}) {
    itemReady.resolve({
      name: filename,
      input: blob,
    });
    itemReady = defer();
    await zipReady.promise;
  }

  async function save() {
    itemReady.resolve(null); // signal end of items
    await pendingPipe;
    return {
      blob: new Blob(chunks),
      downloadName: `image-picka-${new Date().toISOString()}.${EXT}`
    };
  }
}


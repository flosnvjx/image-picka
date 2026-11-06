import {createTarPacker} from "modern-tar";

export function getTarPacker() {
  const {readable, controller} = createTarPacker();
  const chunks = [];
  let pendingPipe = null;
  return {
    prepare,
    pack,
    save,
    waitResponse: true,
    singleThread: true,
  }

  async function prepare() {
    pendingPipe = (async () => {
      const reader = readable.getReader();
      for (;;) {
        const {value, done} = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();
  }

  async function pack({blob, filename}) {
    const fileStream = controller.add({
      name: filename,
      size: blob.size,
      type: 'file',
    })
    await blob.stream().pipeTo(fileStream);
  }

  async function save() {
    controller.finalize();
    await pendingPipe;
    return {
      blob: new Blob(chunks),
      downloadName: `image-picka-${new Date().toISOString()}.tar`
    };
  }
}


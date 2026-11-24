import { respond, type Request } from './engine';

let data: Parameters<typeof respond>[0] = null;

self.onmessage = (e: MessageEvent<Request>) => {
  const out = respond(data, e.data);
  data = out.data;
  if (out.reply) {
    self.postMessage(out.reply);
  }
};

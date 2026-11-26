import { serve } from './engine';

const answer = serve((reply) => self.postMessage(reply));

self.onmessage = (e: MessageEvent<Parameters<typeof answer>[0]>) => answer(e.data);

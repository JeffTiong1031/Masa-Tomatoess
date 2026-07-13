let timerId: NodeJS.Timeout | null = null;

self.onmessage = (e: MessageEvent) => {
  const { command } = e.data;

  if (command === 'START') {
    if (timerId !== null) {
      clearInterval(timerId);
    }
    // Start ticking every 1 second
    timerId = setInterval(() => {
      self.postMessage('TICK');
    }, 1000);
  } else if (command === 'STOP') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};

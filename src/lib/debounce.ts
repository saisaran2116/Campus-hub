// Closures retain one timer per caller. Timer callbacks run on the event loop
// after the current stack and queued Promise microtasks have completed.
export function debounce(callback: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    run() {
      clearTimeout(timer);
      timer = setTimeout(callback, delay);
    },
    cancel() {
      clearTimeout(timer);
      timer = undefined;
    },
  };
}

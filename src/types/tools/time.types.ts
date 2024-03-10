export interface Time {
  ns: number;
  s: number;
  ms: number;
}

export interface Timer {
  startTime: Time;
  stop: () => Time;
}

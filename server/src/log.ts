/**
 * Tiny structured logger.
 *
 * Rationale: every string field is clipped to 80 characters before it is written, so a
 * document excerpt, a question, or an error message can never leak a whole notice into logs.
 */

const MAX_LOGGED_CHARS = 80;

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
}

export interface LogSink {
  out: (line: string) => void;
  err: (line: string) => void;
}

/** Clips a string to the logging budget, marking the cut with an ellipsis. */
export function clipForLog(value: string): string {
  return value.length <= MAX_LOGGED_CHARS ? value : `${value.slice(0, MAX_LOGGED_CHARS - 1)}…`;
}

function clipFields(fields: LogFields): LogFields {
  const clipped: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    clipped[key] = typeof value === 'string' ? clipForLog(value) : value;
  }
  return clipped;
}

const stdSink: LogSink = {
  out: (line) => {
    process.stdout.write(`${line}\n`);
  },
  err: (line) => {
    process.stderr.write(`${line}\n`);
  },
};

/** Builds a logger that writes one JSON line per event to the given sinks. */
export function createLogger(sink: LogSink = stdSink): Logger {
  const format = (level: string, event: string, fields: LogFields): string =>
    JSON.stringify({ level, event, ...clipFields(fields), at: new Date().toISOString() });
  return {
    info: (event, fields = {}) => {
      sink.out(format('info', event, fields));
    },
    warn: (event, fields = {}) => {
      sink.err(format('warn', event, fields));
    },
  };
}

/** Logger that discards everything; used by tests to keep output quiet. */
export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
};

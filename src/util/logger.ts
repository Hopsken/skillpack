import pc from 'picocolors';
import ora, { type Ora } from 'ora';

export const log = {
  info: (msg: string) => console.log(pc.blue('ℹ'), msg),
  success: (msg: string) => console.log(pc.green('✓'), msg),
  warn: (msg: string) => console.log(pc.yellow('⚠'), msg),
  error: (msg: string) => console.error(pc.red('✗'), msg),
  dim: (msg: string) => console.log(pc.dim(msg)),
};

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start();
}

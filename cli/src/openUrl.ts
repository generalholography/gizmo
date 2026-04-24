import { spawn } from 'node:child_process';
import process from 'node:process';

export async function openUrl(url: string): Promise<{ command: string; args: string[] }> {
  const platform = process.platform;
  let command = 'xdg-open';
  let args = [url];

  if (platform === 'darwin') {
    command = 'open';
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return { command, args };
}

import { emitKeypressEvents, type Key } from 'node:readline';
import { stdin, stdout } from 'node:process';

export async function terminalPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY)
    throw new Error('Run this command in an interactive terminal to enter the password privately.');
  emitKeypressEvents(stdin);
  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      stdin.removeListener('keypress', onKey);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\n');
    };
    function onKey(character: string, key: Key) {
      if (key.ctrl && key.name === 'c') {
        finish();
        reject(new Error('Cancelled'));
      } else if (key.name === 'return' || key.name === 'enter') {
        finish();
        resolve(value);
      } else if (key.name === 'backspace' || key.name === 'delete') {
        value = Array.from(value).slice(0, -1).join('');
      } else if (character && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(character)) {
        value += character;
      }
    }
    stdin.on('keypress', onKey);
  });
}

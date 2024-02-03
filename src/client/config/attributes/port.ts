import { toNumber } from '../../../tools/convert';
import { checkPortUsed, range } from '../../../tools/utils';
import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'port';
export const defaultValue = 9002;
export const validate: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const tryPorts: number[] = [];
  const rawPort = checker.get();
  if (rawPort === undefined) {
    tryPorts.push(defaultValue);
  }
  else if (typeof rawPort === 'number') {
    tryPorts.push(rawPort);
  }
  else if (typeof rawPort === 'string') {
    const portsRegexp = /(?<start>\d+)-(?<end>\d+)/u;
    if (portsRegexp.test(rawPort)) {
      const match = rawPort.match(portsRegexp)!;
      const { start, end } = match.groups!;
      const startPort = Number(start);
      const endPort = Number(end);
      tryPorts.push(...range(startPort, endPort));
    }
    else {
      const port = toNumber(rawPort, -1);
      if (port === -1) {
        checker.throwFormatError('${first}-${last}');
        return Promise.resolve();
      }

      tryPorts.push(port);
      checker.warning('When specifying a single port, it must be a number, not a string.');
    }
  }

  for await (const tryPort of tryPorts) {
    const isPortUsed = await checkPortUsed(tryPort);
    if (isPortUsed) {
      continue;
    }

    checker.markValidated(tryPort);
    break;
  }
  return Promise.resolve();
};

import chalk from 'chalk';
import ms from 'ms';
import Client from '../../util/client';
import { emoji, prependEmoji } from '../../util/emoji';
import { isAPIError } from '../../util/errors-ts';
import confirm from '../../util/input/confirm';
import { getCommandName } from '../../util/pkg-name';
import { ProjectRmTelemetryClient } from '../../util/telemetry/commands/project/rm';
import output from '../../output-manager';

const e = encodeURIComponent;

export default async function rm(client: Client, args: string[]) {
  const telemetryClient = new ProjectRmTelemetryClient({
    opts: {
      store: client.telemetryEventStore,
    },
  });

  if (args.length !== 1) {
    output.error(
      `Invalid number of arguments. Usage: ${chalk.cyan(
        `${getCommandName('project rm <name>')}`
      )}`
    );
    return 1;
  }

  const name = args[0];
  telemetryClient.trackCliArgumentName(name);

  const start = Date.now();

  const yes = await readConfirmation(client, name);

  if (!yes) {
    output.log('User abort');
    return 0;
  }

  try {
    await client.fetch(`/v2/projects/${e(name)}`, {
      method: 'DELETE',
    });
  } catch (err: unknown) {
    if (isAPIError(err) && err.status === 404) {
      output.error('No such project exists');
      return 1;
    }
    if (isAPIError(err) && err.status === 403) {
      output.error(err.message);
      return 1;
    }
  }
  const elapsed = ms(Date.now() - start);
  output.log(
    `${chalk.cyan('Success!')} Project ${chalk.bold(name)} removed ${chalk.gray(
      `[${elapsed}]`
    )}`
  );
  return 0;
}

async function readConfirmation(
  client: Client,
  projectName: string
): Promise<boolean> {
  output.print(
    prependEmoji(
      `The project ${chalk.bold(projectName)} will be removed permanently.\n` +
        `It will also delete everything under the project including deployments.\n`,
      emoji('warning')
    )
  );

  return await confirm(client, `${chalk.bold.red('Are you sure?')}`, false);
}

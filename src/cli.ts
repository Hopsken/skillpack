import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { installCommand } from './commands/install.js';

const program = new Command()
  .name('skillpack')
  .description('Package manager for agent skills')
  .version('0.1.0');

program
  .command('init')
  .description('Create skillpack.json')
  .action(initCommand);

program
  .command('add')
  .description('Add skill(s) to manifest, resolve, lock, and install')
  .argument('<specifiers...>', 'Skill specifiers (owner/repo#skill@version)')
  .option('-g, --global', 'Install to global skills directory')
  .action(addCommand);

program
  .command('install')
  .alias('i')
  .description('Install all skills from lock file')
  .option('--frozen', 'Fail if any skill needs re-resolving (CI mode)')
  .option('-g, --global', 'Install to global skills directory')
  .action(installCommand);

program.parse();

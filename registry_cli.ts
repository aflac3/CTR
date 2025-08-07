// CTR/registry_cli.ts

import { Command } from 'commander';
import { issueEDAI } from './edai_issuer';

const program = new Command();

program
  .name('ctr-registry')
  .description('CLI for Civic Trust Registry operations')
  .version('1.0.0');

program
  .command('edai')
  .description('Issue an EDAI from an existing attestation')
  .argument('<index>', 'Attestation index to issue EDAI from')
  .action(async (i) => {
    const issued = issueEDAI(parseInt(i));
    console.log('EDAI issued:', issued.id);
  });

program.parse(process.argv);

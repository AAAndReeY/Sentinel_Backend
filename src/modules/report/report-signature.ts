import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const signature = readFileSync(join(__dirname, 'assets', 'firma-jefe.png'));
export const approvedSignature = 'data:image/png;base64,' + signature.toString('base64');

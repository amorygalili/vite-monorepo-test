import { greetFromC, packageCVersion } from '@myorg/c';

export function greetFromB(name: string): string {
  const cGreeting = greetFromC(name);
  return `Hello from package B! (using C v${packageCVersion})\n${cGreeting}`;
}

export const packageBVersion = '0.0.1';


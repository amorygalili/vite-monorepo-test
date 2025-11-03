import { greetFromB, packageBVersion } from '@myorg/b';

export function greetFromA(name: string): string {
  const bGreeting = greetFromB(name);
  return `Hello from package A!!FFDFD! (using B v${packageBVersion})\n${bGreeting}`;
}

export const packageAVersion = '0.0.1';

// Example usage
console.log(greetFromA('Developer'));


/* eslint-disable prettier/prettier */
const cache: Record<string, unknown> = {};

export async function getABI(name: string): Promise<Record<string, unknown>> {
  if (cache[name]) return cache[name] as Record<string, unknown>;
  const abi = (await import(`./contracts/${name}.json`)) as Record<string, unknown>;
  cache[name] = abi;
  return abi;
}

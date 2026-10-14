export function shuffled<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const max = 0x100000000 - (0x100000000 % (i + 1));
    let n: number;
    do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= max);
    const j = n % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

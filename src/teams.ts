export type TeamId = 0 | 1;
export const TEAMS = [
  { name: 'Nykvarns IF', shortName: 'NYKVARNS', shirt: 0x252932, shorts: 0x20242c, socks: 0x292d34, accent: '#e4e7e8', keeper: 0xc69a46 },
  { name: 'Nyköping FBC', shortName: 'NYKÖPING', shirt: 0x258653, shorts: 0x20272b, socks: 0xe6e7dd, accent: '#76d498', keeper: 0x406ca2 },
] as const;
export const attackDirection = (team: TeamId): -1 | 1 => team === 0 ? -1 : 1;

// Påhittade spelarnamn. Nummer 10 i Nykvarn heter Lundsgård efter Teos önskemål.
export const ROSTERS = [
  [{ number: 1, surname: 'Bergström' }, { number: 10, surname: 'Lundsgård' }, { number: 7, surname: 'Andersson' }, { number: 12, surname: 'Lindberg' }, { number: 19, surname: 'Karlsson' }],
  [{ number: 1, surname: 'Sjöberg' }, { number: 8, surname: 'Nilsson' }, { number: 9, surname: 'Johansson' }, { number: 11, surname: 'Ekström' }, { number: 17, surname: 'Berg' }],
] as const;
export const playerSurname = (team: TeamId, number: number) => ROSTERS[team].find(player => player.number === number)?.surname ?? 'Spelare';

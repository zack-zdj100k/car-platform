import { anonymousIdentity, isRobot } from './visitor';

describe('isRobot', () => {
  const browsers = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36',
  ];

  const robots = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'facebookexternalhit/1.1',
    'curl/8.7.1',
    'UptimeRobot/2.0',
    'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0',
  ];

  it.each(browsers)('counts a real browser as a person: %s', (agent) => {
    expect(isRobot(agent)).toBe(false);
  });

  it.each(robots)('recognises a robot: %s', (agent) => {
    expect(isRobot(agent)).toBe(true);
  });

  it('counts an unknown agent as a person, not a robot', () => {
    // Losing a real customer from the figures is worse than admitting a robot.
    expect(isRobot(undefined)).toBe(false);
    expect(isRobot('')).toBe(false);
  });
});

describe('anonymousIdentity', () => {
  const salt = 'test-salt';

  it('prefers the visitor cookie', () => {
    expect(anonymousIdentity({ cookieId: 'abc-123', ip: '1.2.3.4', salt })).toBe('abc-123');
  });

  it('gives the same visitor the same identity across requests', () => {
    const first = anonymousIdentity({ ip: '1.2.3.4', userAgent: 'Safari', salt });
    const second = anonymousIdentity({ ip: '1.2.3.4', userAgent: 'Safari', salt });
    expect(first).toBe(second);
  });

  it('tells two visitors apart', () => {
    const one = anonymousIdentity({ ip: '1.2.3.4', userAgent: 'Safari', salt });
    const two = anonymousIdentity({ ip: '5.6.7.8', userAgent: 'Safari', salt });
    expect(one).not.toBe(two);
  });

  it('never stores the address itself', () => {
    const identity = anonymousIdentity({ ip: '196.20.30.40', userAgent: 'Safari', salt });
    expect(identity).not.toContain('196.20.30.40');
    expect(identity).toMatch(/^[0-9a-f]{32}$/);
  });

  it('has no identity for a visitor with neither cookie nor address', () => {
    expect(anonymousIdentity({ salt })).toBeNull();
  });
});

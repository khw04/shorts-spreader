describe('useWebSocket hook module', () => {
  it('exports a default function', async () => {
    const mod = await import('../../src/hooks/useWebSocket.js');
    expect(typeof mod.default).toBe('function');
  });

  it('default export is named useWebSocket', async () => {
    const mod = await import('../../src/hooks/useWebSocket.js');
    expect(mod.default.name).toBe('useWebSocket');
  });
});

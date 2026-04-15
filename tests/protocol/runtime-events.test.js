const { buildStatsUpdatePayload } = require('../../src/lib/state');
const {
  buildHitEventPayload,
  buildHitPayload,
  buildSpreadEventPayload
} = require('../../src/lib/server-runtime');
const { validateOutboundMessage } = require('../../src/lib/protocol');

describe('runtime outbound events stay aligned with protocol validators', () => {
  it('builds valid spread_event, hit_event, hit, and stats_update payloads', () => {
    const spreadEntry = {
      spreadId: 'spread-1',
      spreaderName: 'Spreader',
      shortsTitle: 'Demo Shorts',
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      victimClientIds: ['victim-a'],
      createdAt: '2026-04-13T12:44:14.000Z'
    };
    const hitEntry = {
      spreadId: 'spread-1',
      victimClientId: 'victim-a',
      victimName: 'Victim A',
      replacedTagType: 'img',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      timestamp: '2026-04-13T12:45:14.000Z'
    };

    expect(validateOutboundMessage({
      type: 'spread_event',
      payload: buildSpreadEventPayload(spreadEntry)
    })).toEqual({
      ok: true,
      value: {
        type: 'spread_event',
        payload: {
          spreadId: 'spread-1',
          spreaderName: 'Spreader',
          shortsTitle: 'Demo Shorts',
          victimCount: 1,
          timestamp: '2026-04-13T12:44:14.000Z'
        }
      }
    });

    expect(validateOutboundMessage({
      type: 'hit_event',
      payload: buildHitEventPayload(hitEntry)
    }).ok).toBe(true);

    expect(validateOutboundMessage({
      type: 'hit',
      payload: buildHitPayload(spreadEntry)
    })).toEqual({
      ok: true,
      value: {
        type: 'hit',
        payload: {
          spreadId: 'spread-1',
          spreaderName: 'Spreader',
          shortsTitle: 'Demo Shorts',
          shortsId: 'abc123'
        }
      }
    });

    expect(validateOutboundMessage({
      type: 'stats_update',
      payload: buildStatsUpdatePayload()
    }).ok).toBe(true);
  });
});

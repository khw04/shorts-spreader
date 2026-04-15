function getEligibility(url) {
  try {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isEligible: false,
        ineligibleReason: 'unsupported_protocol'
      };
    }

    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsedUrl.hostname)) {
      return {
        isEligible: false,
        ineligibleReason: 'youtube_tab'
      };
    }

    return {
      isEligible: true,
      ineligibleReason: null
    };
  } catch {
    return {
      isEligible: false,
      ineligibleReason: 'invalid_url'
    };
  }
}

function buildActiveTabSnapshot() {
  const pageUrl = window.location.href;
  const eligibility = getEligibility(pageUrl);

  return {
    pageUrl,
    pageTitle: document.title || 'Untitled page',
    siteDomain: window.location.hostname || 'unknown',
    isEligible: eligibility.isEligible,
    ineligibleReason: eligibility.ineligibleReason
  };
}

function sendActiveTabSnapshot() {
  chrome.runtime.sendMessage({
    type: 'active_tab_snapshot',
    payload: buildActiveTabSnapshot()
  }, () => {
    void chrome.runtime.lastError;
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'request_active_tab_snapshot') {
    sendActiveTabSnapshot();
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'deliver_hit') {
    console.log('Shorts Spreader received hit payload.', message.payload);
    sendResponse({ ok: true, delivered: true });
    return false;
  }

  return false;
});

window.addEventListener('focus', sendActiveTabSnapshot);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    sendActiveTabSnapshot();
  }
});

sendActiveTabSnapshot();

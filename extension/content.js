function getEligibility(url) {
  try {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isEligible: false,
        ineligibleReason: 'unsupported_protocol'
      };
    }

    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsedUrl.hostname) && parsedUrl.pathname.startsWith('/shorts/')) {
      return {
        isEligible: false,
        ineligibleReason: 'youtube_shorts_tab'
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
    pageTitle: document.title || '제목 없는 페이지',
    siteDomain: window.location.hostname || 'unknown',
    isEligible: eligibility.isEligible,
    ineligibleReason: eligibility.ineligibleReason
  };
}

function safeSendRuntimeMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      void chrome.runtime.lastError;
      callback?.(response);
    });
    return true;
  } catch {
    return false;
  }
}

function sendActiveTabSnapshot() {
  safeSendRuntimeMessage({
    type: 'active_tab_snapshot',
    payload: buildActiveTabSnapshot()
  });
}

function isYouTubeShortsPage() {
  try {
    const parsedUrl = new URL(window.location.href);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsedUrl.hostname) && parsedUrl.pathname.startsWith('/shorts/');
  } catch {
    return false;
  }
}

function getCurrentShortsPayload() {
  const shortsUrl = window.location.href;
  const title = (document.title || 'YouTube Shorts').replace(/\s*-\s*YouTube\s*$/, '').trim();

  return {
    shortsUrl,
    shortsTitle: title || 'YouTube Shorts'
  };
}

function showSpreadButtonStatus(message, isError = false) {
  const status = document.getElementById('shorts-spreader-spread-status');

  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.error = isError ? 'true' : 'false';
}

function createSpreadButton() {
  if (document.getElementById('shorts-spreader-spread-button')) {
    return;
  }

  const root = document.createElement('div');
  root.id = 'shorts-spreader-spread-root';

  const button = document.createElement('button');
  button.id = 'shorts-spreader-spread-button';
  button.type = 'button';
  button.textContent = '살포하기';

  const status = document.createElement('p');
  status.id = 'shorts-spreader-spread-status';
  status.textContent = '현재 쇼츠를 다른 참여자에게 살포합니다.';

  button.addEventListener('click', () => {
    button.disabled = true;
    showSpreadButtonStatus('살포 요청 전송 중...');

    const dispatched = safeSendRuntimeMessage({
      type: 'content_trigger_spread',
      payload: getCurrentShortsPayload()
    }, (response) => {
      button.disabled = false;

      if (!response?.ok) {
        showSpreadButtonStatus(response?.error || '살포 요청 실패', true);
        return;
      }

      showSpreadButtonStatus(response?.message || '살포 요청 완료');
    });

    if (!dispatched) {
      button.disabled = false;
      showSpreadButtonStatus('확장이 다시 로드되어 페이지 새로고침이 필요합니다.', true);
    }
  });

  root.appendChild(button);
  root.appendChild(status);
  document.body.appendChild(root);
}

function ensureSpreadButtonForShorts() {
  if (isYouTubeShortsPage()) {
    createSpreadButton();
    return;
  }

  document.getElementById('shorts-spreader-spread-root')?.remove();
}

function buildShortsAssets(shortsId) {
  const safeShortsId = typeof shortsId === 'string' ? shortsId.trim() : '';

  if (!safeShortsId) {
    return {
      shortsUrl: 'https://www.youtube.com/shorts/',
      thumbnailUrl: '',
      embedUrl: ''
    };
  }

  return {
    shortsUrl: `https://www.youtube.com/shorts/${encodeURIComponent(safeShortsId)}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(safeShortsId)}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(safeShortsId)}?autoplay=1&loop=1&playlist=${encodeURIComponent(safeShortsId)}`
  };
}

function pickReplaceTarget() {
  const candidates = [];

  document.querySelectorAll('img:not([data-shorts-spreader-delivered])').forEach((img) => {
    if (img.offsetWidth > 30 && img.offsetHeight > 30) {
      candidates.push({ element: img, replacedTagType: 'img' });
    }
  });

  document.querySelectorAll('video').forEach((video) => {
    candidates.push({ element: video, replacedTagType: 'video' });
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function removeExistingOverlay() {
  const existing = document.getElementById('shorts-spreader-hit-overlay');

  if (existing) {
    existing.remove();
  }
}

function attachOverlay(payload, shortsAssets) {
  removeExistingOverlay();

  const overlay = document.createElement('aside');
  overlay.id = 'shorts-spreader-hit-overlay';
  overlay.setAttribute('role', 'status');
  overlay.style.position = 'fixed';
  overlay.style.right = '16px';
  overlay.style.bottom = '16px';
  overlay.style.zIndex = '2147483647';
  overlay.style.padding = '0';
  overlay.style.width = '240px';
  overlay.style.borderRadius = '12px';
  overlay.style.background = 'rgba(18, 12, 9, 0.95)';
  overlay.style.color = '#fff3df';
  overlay.style.fontFamily = "Georgia, 'Times New Roman', serif";
  overlay.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.4)';
  overlay.style.border = '1px solid rgba(255, 206, 143, 0.45)';
  overlay.style.overflow = 'hidden';

  if (shortsAssets.embedUrl) {
    const muted = payload?.hitMuted === true;
    const muteParam = muted ? '&mute=1' : '';
    const iframe = document.createElement('iframe');
    iframe.src = shortsAssets.embedUrl + muteParam;
    iframe.style.width = '240px';
    iframe.style.height = '427px';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.borderRadius = '12px 12px 0 0';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    overlay.appendChild(iframe);
  }

  const info = document.createElement('div');
  info.style.padding = '8px 10px';

  const message = document.createElement('span');
  message.style.display = 'block';
  message.style.fontSize = '11px';
  message.style.lineHeight = '1.3';
  message.textContent = `${payload?.spreaderName || '누군가'}이(가) ${payload?.shortsTitle || '쇼츠'}를 살포했습니다.`;
  info.appendChild(message);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '6px';
  closeBtn.style.right = '6px';
  closeBtn.style.background = 'rgba(0,0,0,0.6)';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.width = '22px';
  closeBtn.style.height = '22px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '12px';
  closeBtn.style.lineHeight = '22px';
  closeBtn.style.textAlign = 'center';
  closeBtn.style.zIndex = '1';
  closeBtn.addEventListener('click', () => overlay.remove());

  overlay.appendChild(info);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
}

function applyReplaceToImage(image, shortsAssets) {
  if (!shortsAssets.thumbnailUrl) {
    return false;
  }

  image.dataset.shortsSpreaderOriginalSrc = image.currentSrc || image.src || '';
  image.src = shortsAssets.thumbnailUrl;
  image.alt = '전달된 쇼츠 썸네일';
  image.dataset.shortsSpreaderDelivered = 'true';
  return true;
}

function applyHitPayload(payload) {
  const target = pickReplaceTarget();
  const shortsAssets = buildShortsAssets(payload?.shortsId);

  if (!target) {
    attachOverlay(payload, shortsAssets);
    return {
      ok: true,
      delivered: true,
      replacedTagType: 'img',
      deliveryMode: 'overlay',
      pageUrl: window.location.href,
      siteDomain: window.location.hostname || 'unknown'
    };
  }

  let deliveryMode = 'overlay';

  if (target.replacedTagType === 'img') {
    const replaced = applyReplaceToImage(target.element, shortsAssets);
    deliveryMode = replaced ? 'replace' : 'overlay';
  }

  if (target.replacedTagType === 'video') {
    deliveryMode = 'overlay';
  }

  attachOverlay(payload, shortsAssets);

  return {
    ok: true,
    delivered: true,
    replacedTagType: target.replacedTagType,
    deliveryMode,
    pageUrl: window.location.href,
    siteDomain: window.location.hostname || 'unknown'
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'request_active_tab_snapshot') {
    sendActiveTabSnapshot();
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'deliver_hit') {
    sendResponse(applyHitPayload(message.payload));
    return false;
  }

  return false;
});

window.addEventListener('focus', sendActiveTabSnapshot);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    sendActiveTabSnapshot();
    ensureSpreadButtonForShorts();
  }
});
window.addEventListener('yt-navigate-finish', ensureSpreadButtonForShorts);
window.addEventListener('popstate', ensureSpreadButtonForShorts);

sendActiveTabSnapshot();
ensureSpreadButtonForShorts();

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

  const overlay = document.createElement('div');
  overlay.id = 'shorts-spreader-hit-overlay';
  overlay.setAttribute('role', 'status');
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 2147483647',
    'background: rgba(0, 0, 0, 0.7)',
    'backdrop-filter: blur(4px)',
    '-webkit-backdrop-filter: blur(4px)',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'opacity: 0',
    'transition: opacity 0.3s ease',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
  ].join(';');

  const modal = document.createElement('div');
  modal.style.cssText = [
    'position: relative',
    'width: 360px',
    'max-width: 90vw',
    'background: #1a1a2e',
    'border-radius: 16px',
    'padding: 16px',
    'box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5)',
    'border: 1px solid rgba(255, 255, 255, 0.1)',
    'transform: scale(0.95)',
    'transition: transform 0.3s ease'
  ].join(';');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.style.cssText = [
    'position: absolute',
    'top: -12px',
    'right: -12px',
    'width: 32px',
    'height: 32px',
    'background: #ff3b30',
    'color: #ffffff',
    'border: none',
    'border-radius: 50%',
    'font-size: 16px',
    'font-weight: 700',
    'cursor: pointer',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'box-shadow: 0 4px 12px rgba(255, 59, 48, 0.4)',
    'transition: transform 0.2s ease',
    'z-index: 1'
  ].join(';');
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.transform = 'scale(1.1)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.transform = 'scale(1)'; });
  closeBtn.addEventListener('click', () => overlay.remove());

  if (shortsAssets.embedUrl) {
    const muted = payload?.hitMuted === true;
    const muteParam = muted ? '&mute=1' : '';
    const iframe = document.createElement('iframe');
    iframe.src = shortsAssets.embedUrl + muteParam;
    iframe.style.cssText = [
      'width: 100%',
      'aspect-ratio: 9 / 16',
      'border: none',
      'border-radius: 8px',
      'display: block'
    ].join(';');
    iframe.allow = 'autoplay; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    modal.appendChild(iframe);
  }

  const label = document.createElement('div');
  label.style.cssText = [
    'text-align: center',
    'margin-top: 12px',
    'color: #ffffff',
    'font-size: 14px',
    'line-height: 1.4'
  ].join(';');
  const spreaderName = payload?.spreaderName || '누군가';
  const shortsTitle = payload?.shortsTitle || '쇼츠';
  label.innerHTML = `<strong style="color:#ff9500">${spreaderName}</strong>이(가) 살포한 쇼츠<br><span style="color:#888;font-size:12px">${shortsTitle}</span>`;

  modal.appendChild(closeBtn);
  modal.appendChild(label);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
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

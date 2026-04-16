const { derivePopupViewModel } = self.ShortsSpreaderPopupState;

const connectionPill = document.getElementById('connection-pill');
const statusCopy = document.getElementById('status-copy');
const socketMeta = document.getElementById('socket-meta');
const httpMeta = document.getElementById('http-meta');
const nicknameInput = document.getElementById('nickname-input');
const saveNicknameButton = document.getElementById('save-nickname-button');
const spreadCount = document.getElementById('spread-count');
const hitCount = document.getElementById('hit-count');
const dashboardButton = document.getElementById('dashboard-button');
const muteCheckbox = document.getElementById('mute-checkbox');
const muteLabel = document.getElementById('mute-label');

let latestState = null;

chrome.storage.local.get(['hitMuted'], (result) => {
  const muted = result.hitMuted === true;
  muteCheckbox.checked = !muted;
  muteLabel.textContent = muted ? '꺼짐' : '켜짐';
});

muteCheckbox?.addEventListener('change', () => {
  const muted = !muteCheckbox.checked;
  chrome.storage.local.set({ hitMuted: muted });
  muteLabel.textContent = muted ? '꺼짐' : '켜짐';
});

function render(state) {
  latestState = state;
  const viewModel = derivePopupViewModel(state || {});

  connectionPill.textContent = viewModel.connectionLabel;
  connectionPill.classList.toggle('connected', viewModel.connectionTone === 'connected');
  connectionPill.classList.toggle('disconnected', viewModel.connectionTone !== 'connected');
  statusCopy.textContent = viewModel.isConnected
    ? '실시간 카운터가 웹소켓으로 수신되고 있습니다.'
    : '웹소켓에 연결되지 않았습니다. 재연결 후 카운터가 갱신됩니다.';
  socketMeta.textContent = viewModel.lastError
    ? `소켓: ${viewModel.websocketActiveUrl || viewModel.websocketUrl} | ${viewModel.lastError}`
    : `소켓: ${viewModel.websocketActiveUrl || viewModel.websocketUrl}`;
  httpMeta.textContent = `HTTP: ${viewModel.httpProbeUrl || '없음'} | ${viewModel.httpProbeStatus || '대기'}`;
  nicknameInput.value = viewModel.nickname;
  spreadCount.textContent = String(viewModel.totalSpreads);
  hitCount.textContent = String(viewModel.totalHits);
  dashboardButton.dataset.url = viewModel.dashboardUrl;
}

function requestState() {
  chrome.runtime.sendMessage({ type: 'popup_get_state' }, (response) => {
    if (chrome.runtime.lastError) {
      statusCopy.textContent = chrome.runtime.lastError.message;
      return;
    }

    render(response);
  });
}

saveNicknameButton?.addEventListener('click', () => {
  saveNicknameButton.disabled = true;
  chrome.runtime.sendMessage({
    type: 'popup_set_nickname',
    nickname: nicknameInput.value
  }, (response) => {
    saveNicknameButton.disabled = false;

    if (chrome.runtime.lastError) {
      statusCopy.textContent = chrome.runtime.lastError.message;
      return;
    }

    render(response || latestState);
  });
});

dashboardButton?.addEventListener('click', () => {
  const dashboardUrl = dashboardButton.dataset.url;

  if (!dashboardUrl) {
    return;
  }

  chrome.tabs.create({ url: dashboardUrl });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'background_state_changed') {
    render(message.payload);
  }
});

requestState();

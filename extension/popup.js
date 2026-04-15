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
const spreadButton = document.getElementById('spread-button');
const spreadStatus = document.getElementById('spread-status');

let latestState = null;

function render(state) {
  latestState = state;
  const viewModel = derivePopupViewModel(state || {});

  connectionPill.textContent = viewModel.connectionLabel;
  connectionPill.classList.toggle('connected', viewModel.connectionTone === 'connected');
  connectionPill.classList.toggle('disconnected', viewModel.connectionTone !== 'connected');
  statusCopy.textContent = viewModel.isConnected
    ? 'Live counters are coming from the websocket session in the background worker.'
    : 'The websocket is unavailable right now. Counts will refresh after reconnect.';
  socketMeta.textContent = viewModel.lastError
    ? `Socket: ${viewModel.websocketActiveUrl || viewModel.websocketUrl} | ${viewModel.lastError}`
    : `Socket: ${viewModel.websocketActiveUrl || viewModel.websocketUrl}`;
  httpMeta.textContent = `HTTP: ${viewModel.httpProbeUrl || 'n/a'} | ${viewModel.httpProbeStatus || 'idle'}`;
  nicknameInput.value = viewModel.nickname;
  spreadCount.textContent = String(viewModel.totalSpreads);
  hitCount.textContent = String(viewModel.totalHits);
  dashboardButton.dataset.url = viewModel.dashboardUrl;
  spreadButton.disabled = !viewModel.isConnected;
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

spreadButton?.addEventListener('click', () => {
  spreadButton.disabled = true;
  spreadStatus.textContent = 'Checking the active tab and sending the spread request...';

  chrome.runtime.sendMessage({
    type: 'popup_trigger_spread'
  }, (response) => {
    spreadButton.disabled = false;

    if (chrome.runtime.lastError) {
      spreadStatus.textContent = chrome.runtime.lastError.message;
      return;
    }

    if (!response?.ok) {
      spreadStatus.textContent = response?.error || 'Spread request failed.';
      return;
    }

    spreadStatus.textContent = response.message || 'Spread request sent.';
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'background_state_changed') {
    render(message.payload);
  }
});

requestState();

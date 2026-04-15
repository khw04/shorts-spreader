const { derivePopupViewModel } = self.ShortsSpreaderPopupState;

const connectionPill = document.getElementById('connection-pill');
const statusCopy = document.getElementById('status-copy');
const nicknameInput = document.getElementById('nickname-input');
const saveNicknameButton = document.getElementById('save-nickname-button');
const spreadCount = document.getElementById('spread-count');
const hitCount = document.getElementById('hit-count');
const dashboardButton = document.getElementById('dashboard-button');

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

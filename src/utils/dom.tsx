export function updateStatus(message: string, isError = false) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.className = `visible ${isError ? 'error' : 'success'}`;
    setTimeout(() => status.className = '', 3000);
  }
}

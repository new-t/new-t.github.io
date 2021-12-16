export function load_attentions() {
  window.saved_attentions = JSON.parse(localStorage['saved_attentions'] || '[]');
}

export function save_attentions() {
  localStorage['saved_attentions'] = JSON.stringify(window.saved_attentions);
}

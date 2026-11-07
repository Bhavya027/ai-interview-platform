// Shared helpers used by every page
const App = {
  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (err) {
      return null;
    }
  },

  saveLogin(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  },

  requireLogin() {
    if (!this.getToken()) {
      window.location.href = '/index.html';
    }
  },

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch('/api' + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && token) {
      this.logout();
      return;
    }
    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  },

  formatDate(value) {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  },

  // Creates an element and sets its text safely
  make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  },

  toast(text, isError) {
    let el = document.getElementById('toast');
    if (!el) {
      el = this.make('div', 'toast');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  },

  // The score, circled in red pen
  gradeEl(score) {
    const ns = 'http://www.w3.org/2000/svg';
    const box = this.make('div', 'grade draw');

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 132 88');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M20 46 C14 20 56 8 90 13 C122 18 128 54 90 70 C54 84 10 72 12 42 C14 24 38 12 64 10');
    svg.appendChild(path);
    box.appendChild(svg);

    const hasScore = score !== null && score !== undefined;
    const num = this.make('span', 'grade-num', hasScore ? String(score) : '-');
    if (hasScore) num.appendChild(this.make('small', null, '/10'));
    box.appendChild(num);
    return box;
  },

  noteEl(title, items, kind) {
    if (!items || !items.length) return null;
    const box = this.make('div', 'note' + (kind ? ' ' + kind : ''));
    box.appendChild(this.make('h4', null, title));
    const ul = this.make('ul');
    items.forEach((item) => ul.appendChild(this.make('li', null, item)));
    box.appendChild(ul);
    return box;
  },

  // The full AI review: grade, summary, what worked, what to fix
  reviewEl(feedback, score) {
    const wrap = this.make('div', 'review');
    wrap.appendChild(this.gradeEl(score));

    const body = this.make('div');
    body.appendChild(this.make('p', 'review-summary', feedback.summary));

    const notes = this.make('div', 'notes');
    [
      this.noteEl('What worked', feedback.strengths, ''),
      this.noteEl('What to fix', feedback.improvements, 'fix')
    ].forEach((n) => n && notes.appendChild(n));
    if (notes.children.length) body.appendChild(notes);

    wrap.appendChild(body);
    return wrap;
  }
};
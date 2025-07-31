const api = async (path, opts) => {
  const res = await fetch(location.origin + '/api/' + path, opts);
  if (!res.ok) throw await res.json();
  return res.json();
};

(async () => {
  if (location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) {
    const loginBtn = document.getElementById('loginBtn');
    const userInput = document.getElementById('user');
    const pinInput = document.getElementById('pin');
    const list = document.getElementById('userList');

    const loadUsers = async () => {
      const d = await api('users');
      list.innerHTML = '';
      JSON.parse(JSON.stringify(d.users)).forEach(u => {
        const b = document.createElement('button');
        b.textContent = u;
        b.onclick = () => {
          localStorage.setItem('toUser', u);
          window.location = 'chat.html';
        };
        list.appendChild(b);
      });
    };

    loginBtn.onclick = async () => {
      const uname = userInput.value.trim(), pin = pinInput.value.trim();
      if (!uname || !/^\d{6}$/.test(pin)) return alert('أدخل اسم وPIN صحيح');
      try { await api('signup', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:uname,pin})}); }
      catch(e){}
      await api('login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:uname,pin})});
      localStorage.setItem('me', uname);
      await loadUsers();
    };

    loadUsers();
  } else {
    const me = localStorage.getItem('me'), other = localStorage.getItem('toUser');
    if (!me || !other) { location = 'index.html'; return; }
    document.getElementById('chat-with').textContent = `المحادثة مع ${other}`;
    const chatDiv = document.getElementById('chat');
    const loadMsgs = async () => {
      const d = await api(`messages?u1=${me}&u2=${other}`);
      chatDiv.innerHTML = '';
      d.messages.forEach(m => {
        const dv = document.createElement('div');
        dv.className = 'msg '+(m.from_user === me ? 'me':'you');
        const b = document.createElement('div'); b.className='bubble';
        if (m.type==='text') b.textContent = m.content;
        else if (m.type==='image') b.innerHTML = `<img src="${m.content}" style="max-width:200px">`;
        else if (m.type==='video') b.innerHTML = `<video src="${m.content}" controls style="max-width:200px"></video>`;
        dv.appendChild(b);
        const t = document.createElement('div'); t.className='time';
        t.textContent = new Date(m.timestamp).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
        dv.appendChild(t);
        chatDiv.appendChild(dv);
        chatDiv.scrollTop = chatDiv.scrollHeight;
      });
    };

    document.getElementById('sendBtn').onclick = async () => {
      const text = document.getElementById('text').value.trim();
      const file = document.getElementById('file').files[0];
      const fd = new FormData();
      fd.append('from', me);
      fd.append('to', other);
      if (file) { fd.append('file', file); fd.append('type', file.type.startsWith('image/')?'image':'video'); }
      else { fd.append('type','text'); fd.append('text', text); }
      await api('send', {method:'POST', body: fd});
      document.getElementById('text').value = '';
      document.getElementById('file').value = '';
      await loadMsgs();
    };

    await loadMsgs();
  }
})();
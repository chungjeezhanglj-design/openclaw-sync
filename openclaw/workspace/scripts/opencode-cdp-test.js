const ws = new (require('/opt/homebrew/lib/node_modules/openclaw/node_modules/ws'))('ws://127.0.0.1:9111/devtools/page/7903EC8351BA32CF43804CB035EFA0C8');
let id = 1;
const pending = {};
ws.on('message', d => {
  const msg = JSON.parse(d.toString());
  if (msg.id && pending[msg.id]) {
    pending[msg.id](msg);
    delete pending[msg.id];
  }
});
function send(method, params) {
  return new Promise(resolve => {
    pending[id] = resolve;
    ws.send(JSON.stringify({id:id++,method,params}));
  });
}
ws.on('open', async () => {
  try {
    // Click input to focus
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("[aria-label=随便问点什么...]")?.click()',
      returnByValue: false
    });
    await new Promise(r => setTimeout(r, 200));
    
    // Insert text
    await send('Runtime.evaluate', {
      expression: 'document.execCommand("insertText", false, "你好，OpenCode！简单回复一下")',
      returnByValue: false
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Check if send button is enabled
    const r1 = await send('Runtime.evaluate', {
      expression: 'document.querySelector("[aria-label=发送]")?.disabled',
      returnByValue: true
    });
    console.log('Send button disabled:', r1.result.result.value);
    
    // Click send
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("[aria-label=发送]")?.click()',
      returnByValue: false
    });
    
    // Wait for response
    await new Promise(r => setTimeout(r, 5000));
    
    // Get accessibility tree - look for the latest messages
    const r2 = await send('Accessibility.getFullAXTree', {});
    const nodes = r2.result?.nodes || [];
    // Find StaticText nodes with actual content (recent messages)
    const texts = nodes.filter(n => {
      const role = typeof n.role === 'object' ? n.role.value : n.role;
      const name = typeof n.name === 'object' ? n.name.value : n.name;
      return role === 'StaticText' && name && name.length > 5 && name.length < 300;
    }).slice(-15);
    
    console.log('=== Recent messages ===');
    texts.forEach(n => {
      const name = typeof n.name === 'object' ? n.name.value : n.name;
      console.log('-', name.slice(0, 120));
    });
    
  } finally {
    ws.close();
  }
});
ws.on('error', e => console.error(e.message));
setTimeout(() => { ws.terminate(); process.exit(1); }, 20000);

// ad-server/sse.js
const clients = new Set();

function eventsHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.(); // if compression middleware present

  // Keep-alive ping every 25s
  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);

  clients.add(res);
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });

  // Initial hello
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
}

function broadcast(event, payload) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(chunk);
}

module.exports = { eventsHandler, broadcast };

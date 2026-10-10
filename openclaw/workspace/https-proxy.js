#!/usr/bin/env node
// HTTPS reverse proxy for OpenClaw Control UI
// Listens on 192.168.1.102:18790 and proxies to localhost:18789

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LISTEN_HOST = '192.168.1.102';
const LISTEN_PORT = 18790;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 18789;

// Generate self-signed cert if not exists
const certDir = '/Users/zhanglj/openclaw/workspace';
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

function ensureCert() {
  if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    const { execSync } = require('child_process');
    console.log('Generating self-signed certificate...');
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/CN=${LISTEN_HOST}"`, { stdio: 'inherit' });
    console.log('Certificate generated.');
  }
}

ensureCert();

const cert = fs.readFileSync(certFile);
const key = fs.readFileSync(keyFile);

const options = { key, cert };

function handleRequest(clientReq, clientRes) {
  const proxyReq = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `localhost:${TARGET_PORT}` }
  }, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  clientReq.pipe(proxyReq);
  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    clientRes.writeHead(502);
    clientRes.end('Proxy error: ' + e.message);
  });
}

const server = https.createServer(options, handleRequest);

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`HTTPS proxy listening on https://${LISTEN_HOST}:${LISTEN_PORT}/`);
  console.log(`Forwarding to http://${TARGET_HOST}:${TARGET_PORT}/`);
  console.log(`Open in browser: https://${LISTEN_HOST}:${LISTEN_PORT}/`);
  console.log('Note: Accept the self-signed certificate warning in your browser.');
});

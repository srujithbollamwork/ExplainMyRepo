const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end(`Error: ${err.code}`);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content, 'utf-8');
    });
});

const PORT = 5173;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running at http://localhost:${PORT}/`);
});

server.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
});

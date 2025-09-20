import * as http from 'http'; import * as fs from 'fs'; import * as path from 'path';
const server = http.createServer((req, res) => {
  const filePath = req.url === '/' ? '/dist/index.html' : '/dist' + (req.url || '');
  const full = path.join(__dirname, filePath);
  if (fs.existsSync(full)) {
    const ext = path.extname(full);
    const types:any = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(fs.readFileSync(full));
  } else { res.writeHead(404); res.end('Not Found'); }
});
server.listen(4200, () => console.log('Dashboard at http://localhost:4200'));

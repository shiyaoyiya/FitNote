// scripts/serve-demo.js
// 本地模拟 GitHub Pages 子路径部署，预览 H5 demo 构建产物
// 用法：node scripts/serve-demo.js [端口] [子路径前缀]
// 默认：http://localhost:8123/FitNote/
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = Number(process.argv[2] || 8123)
const PREFIX = process.argv[3] || '/FitNote'
const ROOT = path.resolve(__dirname, '../dist/build/h5')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0])
  // 去掉子路径前缀（模拟 GitHub Pages 项目页部署）
  if (urlPath.startsWith(PREFIX)) {
    urlPath = urlPath.slice(PREFIX.length) || '/'
  }
  if (urlPath === '/') urlPath = '/index.html'

  const filePath = path.join(ROOT, urlPath)
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 回退：hash 路由下通常用不到，保留兜底
      if (!path.extname(urlPath)) {
        fs.readFile(path.join(ROOT, 'index.html'), (e2, html) => {
          if (e2) { res.writeHead(404); return res.end('Not Found') }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(html)
        })
      } else {
        res.writeHead(404)
        res.end('Not Found: ' + urlPath)
      }
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' })
    res.end(data)
  })
}).listen(PORT, () => {
  console.log(`H5 demo preview: http://localhost:${PORT}${PREFIX}/`)
})

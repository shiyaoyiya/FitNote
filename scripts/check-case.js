// scripts/check-case.js —— 扫描源码 import 路径与磁盘文件的大小写一致性
// 用途：GitHub Actions（Linux）文件系统大小写敏感，Windows 本地不敏感，
// 若 import 路径与真实文件名大小写不一致，本地编译通过但云端失败。
// 运行：node scripts/check-case.js
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SKIP_DIRS = new Set(['node_modules', 'dist', 'unpackage', 'admin-web', 'server', 'docs', 'tests', 'scripts', '.github', '.git', 'data', 'cloudfunctions', 'static', 'assets'])
const EXT = new Set(['.vue', '.js', '.ts'])

const problems = []
let checked = 0

// 收集文件
function collect(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) collect(p, out)
    else if (EXT.has(path.extname(name))) out.push(p)
  }
  return out
}

// 在磁盘上精确匹配（大小写敏感）查找文件；返回 null 表示不存在
function findCaseSensitive(fromDir, relPath) {
  const parts = relPath.split('/').filter(Boolean)
  let cur = fromDir
  for (const part of parts) {
    let entries
    try { entries = fs.readdirSync(cur) } catch { return null }
    const hit = entries.find((e) => e === part)
    if (!hit) return null
    cur = path.join(cur, hit)
  }
  return cur
}

const importRe = /(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g

for (const file of collect(ROOT)) {
  let src
  try { src = fs.readFileSync(file, 'utf8') } catch { continue }
  let m
  while ((m = importRe.exec(src)) !== null) {
    const raw = m[1]
    // 跳过 npm 包、绝对 URL、css 引用
    if (raw.startsWith('.') || raw.startsWith('@/') || raw.startsWith('@/static')) {
      let target
      if (raw.startsWith('@/')) {
        target = path.join(ROOT, raw.slice(2))
      } else {
        target = path.resolve(path.dirname(file), raw)
      }
      // 规范化后判断是否存在；若不存在或大小写不匹配则记录
      const resolved = findCaseSensitive(path.parse(target).root + (path.parse(target).dir.startsWith('/') ? '' : ''), path.relative(path.parse(target).root || path.parse(target).dir.split(path.sep)[0] + path.sep, target).replace(/\\/g, '/'))
      // 简化：直接用 fs.existsSync 判定（Windows 不敏感），再大小写精确核对
      const norm = path.normalize(target)
      const exists = fs.existsSync(norm)
      checked++
      if (!exists) {
        problems.push(`${path.relative(ROOT, file)}: 引用不存在 -> ${raw}`)
        continue
      }
      // 大小写精确核对：解析到真实路径后比较
      const real = findCaseSensitive(ROOT, path.relative(ROOT, norm).replace(/\\/g, '/'))
      if (!real) {
        problems.push(`${path.relative(ROOT, file)}: 大小写不匹配 -> ${raw}`)
      }
    }
  }
}

console.log(`检查 ${checked} 条路径引用`)
if (problems.length === 0) {
  console.log('✅ 全部大小写一致')
} else {
  console.log(`❌ 发现 ${problems.length} 个问题:`)
  problems.forEach((p) => console.log('  ' + p))
}

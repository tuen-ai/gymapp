/**
 * 資料管線：由 hasaneyldrm/exercises-dataset 生成繁體中文精簡版動作資料。
 *
 * 步驟：
 *  1. 讀取原始 exercises.json（本機 cache 或由 GitHub raw 下載）
 *  2. 簡體中文教學文字 → OpenCC s2twp 轉繁體（台灣用語）
 *  3. 動作英文名稱 → 詞彙表（glossary.json）最長優先詞組翻譯 + 人手修正（name-overrides.json）
 *  4. 部位／器材／肌群枚舉 → enum-maps.json
 *  5. 輸出 public/data/exercises.json（媒體用 jsDelivr CDN 路徑）
 *
 * 用法：node scripts/build-data.mjs [--report]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as OpenCC from 'opencc-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RAW_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json'
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/'
const CACHE = path.join(ROOT, 'scripts', '.cache-exercises.json')
const OUT = path.join(ROOT, 'public', 'data', 'exercises.json')

const glossary = JSON.parse(fs.readFileSync(path.join(__dirname, 'glossary.json'), 'utf8'))
const enumMaps = JSON.parse(fs.readFileSync(path.join(__dirname, 'enum-maps.json'), 'utf8'))
const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, 'name-overrides.json'), 'utf8'))

const s2twp = OpenCC.Converter({ from: 'cn', to: 'twp' })

async function loadRaw() {
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  console.log('下載原始資料集…')
  const res = await fetch(RAW_URL)
  if (!res.ok) throw new Error(`下載失敗：HTTP ${res.status}`)
  const data = await res.json()
  fs.writeFileSync(CACHE, JSON.stringify(data))
  return data
}

// ---------- 名稱翻譯引擎 ----------

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// 詞組按 token 數量由多到少排序，逐位置最長優先配對
const phraseEntries = Object.entries(glossary.phrases)
  .filter(([k]) => !k.startsWith('_'))
  .map(([k, v]) => ({ tokens: k.split(/\s+/), zh: v }))
  .sort((a, b) => b.tokens.length - a.tokens.length)
const maxPhraseLen = Math.max(...phraseEntries.map((p) => p.tokens.length))
const phraseMap = new Map(phraseEntries.map((p) => [p.tokens.join(' '), p.zh]))

const unresolved = new Map() // 未翻譯 token → 出現次數

// 冠詞／虛詞直接剝除
const DROP = new Set(['the', 'a', 'an', 'of', '-'])
// 連接詞：後面成個餘下部分翻譯完再包做後綴
const CONNECTOR = { on: (rest) => `（${rest}上）`, with: (rest) => `（配${rest}）` }
const GLUE = { to: '至', and: '＋', from: '由', into: '接', or: '／' }

function translateTokens(tokens) {
  const out = []
  const suffixes = []
  let i = 0
  while (i < tokens.length) {
    let matched = false
    for (let len = Math.min(maxPhraseLen, tokens.length - i); len >= 1; len--) {
      const key = tokens.slice(i, i + len).join(' ')
      const zh = phraseMap.get(key)
      if (zh !== undefined) {
        out.push({ zh })
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      const tok = tokens[i]
      if (DROP.has(tok)) {
        i += 1
        continue
      }
      if (CONNECTOR[tok] && i + 1 < tokens.length) {
        // 連接詞後面嘅冠詞先剝除
        while (i + 1 < tokens.length && DROP.has(tokens[i + 1])) tokens.splice(i + 1, 1)
        if (i + 1 >= tokens.length) {
          i += 1
          continue
        }
        // 只食連接詞後面最長匹配嘅一個詞組（器材／位置），其餘照常翻譯
        let len = Math.min(maxPhraseLen, tokens.length - i - 1)
        let objZh = null
        for (; len >= 1; len--) {
          const key = tokens.slice(i + 1, i + 1 + len).join(' ')
          if (phraseMap.has(key)) {
            objZh = phraseMap.get(key)
            break
          }
        }
        if (objZh === null) {
          len = 1
          objZh = tokens[i + 1]
        }
        // 句首（例如括號內 "with towel"）直接做主體，唔再包括號
        if (out.length === 0 && i + 1 + len >= tokens.length) {
          return tok === 'on' ? `${objZh}上` : `配${objZh}`
        }
        suffixes.push(CONNECTOR[tok](objZh))
        i += 1 + len
        continue
      }
      if (GLUE[tok]) {
        out.push({ zh: GLUE[tok] })
        i += 1
        continue
      }
      unresolved.set(tok, (unresolved.get(tok) ?? 0) + 1)
      out.push({ en: tok })
      i += 1
    }
  }
  return joinChunks(out) + suffixes.join('')
}

// 中文塊直接黐埋，英文塊前後保留空格
function joinChunks(out) {
  let result = ''
  for (let j = 0; j < out.length; j++) {
    const cur = out[j]
    if (cur.zh !== undefined) result += cur.zh
    else {
      if (j > 0) result += ' '
      result += cur.en
      if (j + 1 < out.length && out[j + 1].zh !== undefined) result += ' '
    }
  }
  return result.trim()
}

function translateName(rawName) {
  let name = rawName.toLowerCase().replace(/в°/g, '°').replace(/,/g, ' ').trim()
  if (overrides[name]) return overrides[name]

  let suffix = ''
  // 版本號 v. 2 → 二式
  name = name.replace(/\bv\.\s*(\d+)\b/g, (_, n) => {
    suffix += CN_NUM[Number(n)] ? `（${CN_NUM[Number(n)]}式）` : `（${n}式）`
    return ''
  })
  // 括號部分逐個翻譯
  name = name.replace(/\(([^)]*)\)/g, (_, inner) => {
    const key = `(${inner})`
    const mapped = glossary.suffixes[key]
    if (mapped) {
      suffix += mapped
      return ''
    }
    const translated = translateTokens(inner.trim().split(/\s+/))
    suffix += `（${translated}）`
    return ''
  })

  const tokens = name.trim().split(/\s+/).filter(Boolean)
  const main = translateTokens(tokens)
  return (main + suffix).trim()
}

// ---------- 主流程 ----------

const muscleZh = (m) => enumMaps.muscle[m] ?? m

async function main() {
  const raw = await loadRaw()
  console.log(`原始動作數：${raw.length}`)

  const out = raw.map((x) => {
    const stepsZh = (x.instruction_steps?.zh ?? []).map((s) => s2twp(s))
    const steps = stepsZh.length > 0 ? stepsZh : [s2twp(x.instructions?.zh ?? '')]
    return {
      id: x.id,
      name: translateName(x.name),
      nameEn: x.name.replace(/в°/g, '°'),
      category: x.category,
      categoryZh: enumMaps.category[x.category] ?? x.category,
      equipment: x.equipment,
      equipmentZh: enumMaps.equipment[x.equipment] ?? x.equipment,
      target: x.target,
      targetZh: muscleZh(x.target),
      secondary: (x.secondary_muscles ?? []).map(muscleZh),
      steps,
      image: CDN_BASE + x.image,
      gif: CDN_BASE + x.gif_url,
    }
  })

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out))
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0)
  console.log(`已輸出 ${OUT}（${kb} KB，${out.length} 個動作）`)

  // 翻譯覆蓋率報告
  const partial = out.filter((x) => /[a-z]{3,}/i.test(x.name))
  console.log(`名稱含未翻譯英文嘅動作：${partial.length}/${out.length}`)
  if (process.argv.includes('--report')) {
    const sorted = [...unresolved.entries()].sort((a, b) => b[1] - a[1])
    console.log('\n未翻譯 token（次數）：')
    for (const [tok, n] of sorted) console.log(`  ${tok}  ×${n}`)
    console.log('\n名稱翻譯唔完整嘅例子：')
    for (const x of partial.slice(0, 60)) console.log(`  ${x.nameEn}  →  ${x.name}`)
  }
}

main()

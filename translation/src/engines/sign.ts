/**
 * 火山引擎 V4 签名（HMAC-SHA256）
 * 纯 TS 实现 SHA-256 / HMAC，不依赖 crypto.subtle（兼容非 HTTPS 页面）
 */

// ----------------------------------------------------------------------
// SHA-256（纯 JS 实现）
// ----------------------------------------------------------------------

/** SHA-256 轮常量 */
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** 循环右移 */
function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** SHA-256 摘要（大端序输出 32 字节） */
function sha256Bytes(data: Uint8Array): Uint8Array {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = data.length;
  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len * 8) >>> 0;

  // 填充：追加 0x80 + 补零到 56 mod 64 + 8 字节位长
  const padded = new Uint8Array(((len + 8) >> 6 << 6) + 64);
  padded.set(data);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLenHi);
  view.setUint32(padded.length - 4, bitLenLo);

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array<number>(64);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3];
    let e = h[4], f = h[5], g = h[6], hh = h[7];

    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

// ----------------------------------------------------------------------
// HMAC-SHA256
// ----------------------------------------------------------------------

/** 字节数组拼接 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

/** HMAC-SHA256 摘要 */
function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) k = sha256Bytes(k);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = (k[i] ?? 0) ^ 0x36;
    opad[i] = (k[i] ?? 0) ^ 0x5c;
  }
  const inner = sha256Bytes(concatBytes(ipad, message));
  return sha256Bytes(concatBytes(opad, inner));
}

// ----------------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------------

const encoder = new TextEncoder();

/** UTF-8 编码 */
function utf8(str: string): Uint8Array {
  return encoder.encode(str);
}

/** 字节转小写十六进制 */
function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/** sha256 十六进制（用于 X-Content-Sha256 头） */
export function sha256Hex(str: string): string {
  return toHex(sha256Bytes(utf8(str)));
}

/** HMAC-SHA256 十六进制（导出供验证/测试使用） */
export function hmacSha256Hex(key: string, message: string): string {
  return toHex(hmacSha256(utf8(key), utf8(message)));
}

// ----------------------------------------------------------------------
// 火山引擎 V4 签名
// ----------------------------------------------------------------------

export interface VolcanoSignParams {
  /** AccessKey ID */
  accessKey: string;
  /** Secret Access Key */
  secretKey: string;
  /** HTTP 方法，如 POST */
  method: string;
  /** 请求域名，如 translate.volcengineapi.com */
  host: string;
  /** 请求路径，如 / */
  path: string;
  /** 查询参数（Action/Version 等），签名时按 key 排序 */
  query: Record<string, string>;
  /** 请求体 JSON 字符串 */
  body: string;
  /** 地域，如 cn-north-1 */
  region: string;
  /** 服务名，如 translate */
  service: string;
  /** 签名时间（可注入以便测试，默认当前时间） */
  date?: Date;
}

/** 签名结果：需要随请求发送的头部 */
export interface VolcanoSignedHeaders {
  Authorization: string;
  'X-Date': string;
  'X-Content-Sha256': string;
  'Content-Type': string;
}

/**
 * 生成火山引擎 V4 签名请求头
 * 签名覆盖方法/URI/查询串/请求头/请求体，服务端同规则重算比对
 */
export function signVolcanoRequest(params: VolcanoSignParams): VolcanoSignedHeaders {
  const { accessKey, secretKey, method, host, path, query, body, region, service } = params;
  const date = params.date ?? new Date();

  // 1. 时间：X-Date 精确到秒的 UTC ISO8601
  const xDate = formatXDate(date);
  const shortDate = xDate.slice(0, 8);

  // 2. 请求体哈希
  const payloadHash = sha256Hex(body);

  // 3. 规范化查询串：按 key 排序 + URL 编码
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');

  // 4. 规范化请求头（小写名，按名排序）
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    host,
    'x-content-sha256': payloadHash,
    'x-date': xDate,
  };
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');

  // 5. 规范化请求（CanonicalRequest）
  const canonicalRequest =
    `${method}\n${path}\n${canonicalQuery}\n` +
    `${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // 6. stringToSign
  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign =
    `HMAC-SHA256\n${xDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  // 7. 派生签名密钥链：HMAC(SecretKey, date) → region → service → "request"
  const kDate = hmacSha256(utf8(secretKey), utf8(shortDate));
  const kRegion = hmacSha256(kDate, utf8(region));
  const kService = hmacSha256(kRegion, utf8(service));
  const signingKey = hmacSha256(kService, utf8('request'));

  // 8. 最终签名 + Authorization 头
  const signature = toHex(hmacSha256(signingKey, utf8(stringToSign)));
  const authorization =
    `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    'X-Date': xDate,
    'X-Content-Sha256': payloadHash,
    'Content-Type': 'application/json',
  };
}

/** 格式化为 YYYYMMDD'T'HHMMSS'Z'（UTC） */
function formatXDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

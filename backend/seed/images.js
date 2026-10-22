// Renders clearly-labelled SAMPLE documents and payment slips as JPEG data URLs.
// Pure JS (Jimp) – no native dependencies. These are generated placeholders, not
// real government documents or real bank transactions.
const Jimp = require('jimp');

let F = null;
async function fonts() {
  if (F) return F;
  F = {
    s: await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK),
    m: await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK),
    l: await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK),
    sw: await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE),
    mw: await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
  };
  return F;
}
const rect = (img, x, y, w, h, color) => img.composite(new Jimp(w, h, color), x, y);
const toUrl = async (img) => { img.quality(72); return img.getBase64Async(Jimp.MIME_JPEG); };

async function watermark(img, text = 'SAMPLE') {
  const f = await fonts();
  const layer = new Jimp(img.bitmap.width, img.bitmap.height, 0x00000000);
  const w = Jimp.measureText(f.l, text);
  layer.print(f.l, Math.round((img.bitmap.width - w) / 2), Math.round(img.bitmap.height / 2 - 32), text);
  layer.rotate(-25, false).opacity(0.13);
  const x = Math.round((img.bitmap.width - layer.bitmap.width) / 2);
  const y = Math.round((img.bitmap.height - layer.bitmap.height) / 2);
  img.composite(layer, x, y);
}

const rs = (n) => 'Rs. ' + Number(n).toLocaleString('en-US');
const pad = (n) => String(n).padStart(2, '0');
const fmtDT = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtD = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

// ── Payment slip ─────────────────────────────────────────
async function paymentSlip({ method, amount, from, to, month, property, paidAt, ref }) {
  const f = await fonts();
  const W = 560, H = 780;
  const img = new Jimp(W, H, 0xFFFFFFFF);
  const palette = { 'Bank Transfer': 0x1E3A8AFF, 'JazzCash': 0xB91C1CFF, 'EasyPaisa': 0x15803DFF, 'Cheque': 0x6B21A8FF, 'Other': 0x374151FF };
  const title = {
    'Bank Transfer': 'FUND TRANSFER RECEIPT', 'JazzCash': 'MOBILE WALLET RECEIPT',
    'EasyPaisa': 'MOBILE WALLET RECEIPT', 'Cheque': 'CHEQUE DEPOSIT SLIP', 'Other': 'PAYMENT RECEIPT'
  }[method] || 'PAYMENT RECEIPT';
  rect(img, 0, 0, W, 96, palette[method] || palette.Other);
  img.print(f.mw, 28, 18, title);
  img.print(f.sw, 28, 62, method === 'Bank Transfer' ? 'Online banking - Raast / IBFT' : method + ' - Wallet transfer');
  rect(img, 28, 124, W - 56, 52, 0xDCFCE7FF);
  img.print(f.m, 44, 130, 'TRANSACTION SUCCESSFUL');
  img.print(f.s, 28, 204, 'AMOUNT TRANSFERRED');
  img.print(f.l, 28, 226, rs(amount));
  rect(img, 28, 316, W - 56, 2, 0xE5E7EBFF);
  const rows = [
    ['From (Sender)', from], ['To (Receiver)', to],
    ['Purpose', `House rent - ${month}`], ['Property', property],
    ['Date & Time', fmtDT(paidAt)], ['Reference No.', ref], ['Fee', 'Rs. 0'],
  ];
  let y = 336;
  for (const [k, v] of rows) {
    img.print(f.s, 28, y, k);
    img.print(f.s, 210, y, String(v), W - 238);
    y += k === 'Property' || k === 'Purpose' ? 56 : 44;
    rect(img, 28, y - 12, W - 56, 1, 0xF3F4F6FF);
  }
  img.print(f.s, 28, H - 74, 'Sample slip generated for system demonstration.', W - 56);
  img.print(f.s, 28, H - 50, 'Not a real bank transaction.', W - 56);
  await watermark(img);
  return toUrl(img);
}

// ── Identity document (generic layout, not an official design) ──
async function idDocument(p) {
  const f = await fonts();
  const W = 860, H = 620;
  const img = new Jimp(W, H, 0xF5F7FAFF);
  rect(img, 0, 0, W, 78, 0x14532DFF);
  img.print(f.mw, 28, 20, 'IDENTITY DOCUMENT  -  SAMPLE');
  rect(img, 28, 112, 190, 240, 0xD1D5DBFF);
  img.print(f.s, 98, 222, 'PHOTO');
  const rows = [['Name', p.name], ["Father's Name", p.father], ['Gender', p.gender], ['Date of Birth', p.dob], ['Document No.', p.cnic], ['Date of Issue', p.issued], ['Date of Expiry', p.expiry]];
  let y = 108;
  for (const [k, v] of rows) { img.print(f.s, 250, y, k.toUpperCase()); img.print(f.m, 250, y + 18, String(v)); y += 62; }
  img.print(f.s, 28, H - 40, 'Fictional person - generated sample, not a valid identity document.');
  await watermark(img);
  return toUrl(img);
}

async function letter(heading, bodyLines, p, refPrefix) {
  const f = await fonts();
  const W = 640, H = 840;
  const img = new Jimp(W, H, 0xFFFFFFFF);
  rect(img, 0, 0, W, 92, 0x1F2937FF);
  img.print(f.mw, 28, 26, heading);
  img.print(f.s, 28, 118, `Ref No: ${refPrefix}/${p.ref}`);
  img.print(f.s, W - 210, 118, `Date: ${p.issued}`);
  let y = 180;
  for (const line of bodyLines(p)) { img.print(f.s, 40, y, line, W - 80); y += line.length > 70 ? 66 : 38; }
  rect(img, W - 240, H - 150, 200, 2, 0x111827FF);
  img.print(f.s, W - 240, H - 140, 'Authorised Signatory');
  img.print(f.s, 40, H - 56, 'Fictional person - generated sample, not an official document.', W - 80);
  await watermark(img);
  return toUrl(img);
}

const policeCertificate = (p) => letter('CHARACTER CERTIFICATE - SAMPLE', (q) => [
  'To whom it may concern,',
  `This is to certify that ${q.name}, ${q.gender === 'Female' ? 'daughter' : 'son'} of ${q.father}, holder of document no. ${q.cnic}, resident of ${q.address}, was verified from the records of the police station concerned.`,
  'No criminal record or pending case was found against the above named person as of the date of issue.',
  'This certificate is issued on request for tenancy verification purposes only.',
], p, 'PCC');

const birthCertificate = (p) => letter('BIRTH CERTIFICATE - SAMPLE', (q) => [
  'Certificate of registration of birth',
  `Name of child: ${q.name}`, `Father's name: ${q.father}`, `Date of birth: ${q.dob}`, `Place of birth: ${q.city}`, `Gender: ${q.gender}`,
  'Registered with the union council records. This is an extract issued for verification purposes.',
], p, 'BC');

module.exports = { paymentSlip, idDocument, policeCertificate, birthCertificate, fmtD };

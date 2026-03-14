/* ── State ─────────────────────────────────────────────── */
let userName = '';
let signatureDataURL = '';
let signatureMode = 'draw'; // 'draw' | 'upload'

/* ── Date helpers ──────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function formatDate(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const today = new Date();
const todayStr = formatDate(today);

/* ── DOM refs ──────────────────────────────────────────── */
const nameInput        = document.getElementById('name-input');
const slot1            = document.getElementById('slot-1');
const slot2            = document.getElementById('slot-2');
const letterDate       = document.getElementById('letter-date');
const sigPreviewLetter = document.getElementById('sig-preview-letter');
const sigNameDisplay   = document.getElementById('sig-name-display');
const sigDateDisplay   = document.getElementById('sig-date-display');

const tabDraw          = document.getElementById('tab-draw');
const tabUpload        = document.getElementById('tab-upload');
const panelDraw        = document.getElementById('panel-draw');
const panelUpload      = document.getElementById('panel-upload');

const canvas           = document.getElementById('sig-canvas');
const ctx              = canvas.getContext('2d');
const clearBtn         = document.getElementById('clear-btn');

const sigUpload        = document.getElementById('sig-upload');
const uploadLabelArea  = document.getElementById('upload-label-area');
const uploadPreviewWrap= document.getElementById('upload-preview-wrap');
const uploadPreviewImg = document.getElementById('upload-preview-img');
const removeUploadBtn  = document.getElementById('remove-upload-btn');

const submitBtn        = document.getElementById('submit-btn');
const actionNotice     = document.getElementById('action-notice');

/* ── Init ──────────────────────────────────────────────── */
letterDate.textContent = `Date: ${todayStr}`;
sigDateDisplay.textContent = todayStr;

/* ── Name input ────────────────────────────────────────── */
nameInput.addEventListener('input', () => {
  userName = nameInput.value.trim();
  const display = userName || '';
  slot1.textContent = display;
  slot2.textContent = display;
  sigNameDisplay.textContent = display;
  checkReady();
});

/* ── Tab switching ─────────────────────────────────────── */
tabDraw.addEventListener('click', () => switchTab('draw'));
tabUpload.addEventListener('click', () => switchTab('upload'));

function switchTab(mode) {
  signatureMode = mode;
  if (mode === 'draw') {
    tabDraw.classList.add('active');
    tabDraw.setAttribute('aria-selected', 'true');
    tabUpload.classList.remove('active');
    tabUpload.setAttribute('aria-selected', 'false');
    panelDraw.classList.remove('hidden');
    panelUpload.classList.add('hidden');
    // restore draw sig if canvas has content
    signatureDataURL = canvasIsBlank() ? '' : canvas.toDataURL('image/png');
  } else {
    tabUpload.classList.add('active');
    tabUpload.setAttribute('aria-selected', 'true');
    tabDraw.classList.remove('active');
    tabDraw.setAttribute('aria-selected', 'false');
    panelUpload.classList.remove('hidden');
    panelDraw.classList.add('hidden');
    // restore upload sig if image exists
    signatureDataURL = uploadPreviewImg.src && !uploadPreviewWrap.classList.contains('hidden')
      ? uploadPreviewImg.src
      : '';
  }
  updateLetterSig();
  checkReady();
}

/* ── Canvas drawing ────────────────────────────────────── */
let drawing = false;
let lastX = 0, lastY = 0;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if (e.touches) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x; lastY = pos.y;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1a18';
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  lastX = pos.x; lastY = pos.y;
});

function endDraw() {
  if (!drawing) return;
  drawing = false;
  if (!canvasIsBlank()) {
    signatureDataURL = canvas.toDataURL('image/png');
    updateLetterSig();
    checkReady();
  }
}

canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);
canvas.addEventListener('pointercancel', endDraw);

function canvasIsBlank() {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false;
  }
  return true;
}

clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  signatureDataURL = '';
  updateLetterSig();
  checkReady();
});

/* ── Image upload ──────────────────────────────────────── */
sigUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataURL = ev.target.result;
    uploadPreviewImg.src = dataURL;
    uploadPreviewWrap.classList.remove('hidden');
    uploadLabelArea.classList.add('hidden');
    signatureDataURL = dataURL;
    updateLetterSig();
    checkReady();
  };
  reader.readAsDataURL(file);
});

removeUploadBtn.addEventListener('click', () => {
  sigUpload.value = '';
  uploadPreviewImg.src = '';
  uploadPreviewWrap.classList.add('hidden');
  uploadLabelArea.classList.remove('hidden');
  signatureDataURL = '';
  updateLetterSig();
  checkReady();
});

/* ── Live letter signature preview ────────────────────── */
function updateLetterSig() {
  // Clear old image if any
  const existingImg = sigPreviewLetter.querySelector('img');
  if (existingImg) existingImg.remove();

  const hint = sigPreviewLetter.querySelector('.sig-empty-hint');

  if (signatureDataURL) {
    const img = document.createElement('img');
    img.src = signatureDataURL;
    img.alt = 'Signature';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    if (hint) hint.style.display = 'none';
    sigPreviewLetter.appendChild(img);
  } else {
    if (hint) hint.style.display = '';
  }
}

/* ── Ready check ───────────────────────────────────────── */
function checkReady() {
  const ready = userName.length > 0 && signatureDataURL.length > 0;
  submitBtn.disabled = !ready;
}

/* ── PDF generation ────────────────────────────────────── */
submitBtn.addEventListener('click', generateAndSend);

function generateAndSend() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const marginL = 22;
  const marginR = 22;
  const pageW = 210;
  const contentW = pageW - marginL - marginR;
  const lineH = 6.5;

  doc.setFont('Times', 'normal');

  let y = 22;

  // Date
  doc.setFontSize(11);
  doc.text(`Date: ${todayStr}`, marginL, y);
  y += lineH * 2;

  // Recipient 1
  doc.text('Lisa Kersavage, Executive Director', marginL, y); y += lineH;
  doc.text('New York City Landmarks Preservation Commission', marginL, y); y += lineH;
  doc.text('253 Broadway, 11th Floor', marginL, y); y += lineH;
  doc.text('New York, NY 10007', marginL, y); y += lineH * 1.5;

  // Recipient 2
  doc.text('Dr. Margaret Herman, Director of Research,', marginL, y); y += lineH;
  doc.text('New York City Landmarks Preservation Commission', marginL, y); y += lineH;
  doc.text('253 Broadway, 11th Floor', marginL, y); y += lineH;
  doc.text('New York, NY 10007', marginL, y); y += lineH * 1.5;

  // RE line
  doc.setFont('Times', 'bold');
  doc.text('RE: Letter of Support for Joseph Fallert Brewery Complex RFE', marginL, y);
  doc.setFont('Times', 'normal');
  y += lineH * 1.5;

  // Salutation
  doc.text('Dear Ms. Kersavage and Dr. Herman,', marginL, y);
  y += lineH * 1.5;

  // Helper: wrapped paragraph
  function addParagraph(text) {
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, marginL, y);
    y += lines.length * lineH + lineH * 0.6;
  }

  // Paragraph 1
  addParagraph(
    `${userName} wishes to express support with the community to designate the Joseph Fallert Brewery Complex (the main factory 56 Meserole Street and the office building on 346 Lorimer Street) as an individual New York City Landmark. This multi-building industrial complex stands as one of the last surviving examples of the Brewer's Row on Meserole Street. It represents an irreplaceable record of the area's German immigrant heritage, industrial evolution and the robust Gilded Age commercial architecture of North Brooklyn.`
  );

  // Paragraph 2
  addParagraph(
    `Built between 1878 and 1910 through multiple construction phases by John Platte and the architectural firm of F. Wunder and Koch & Wagner, the complex has been described as a red-brick castle distinguished by ornate corbelled brickwork, arched windows and door openings, and a prominent masonry turret that remains visible from the surrounding streets. These features are all characteristic of a late nineteenth century industrial Romanesque and Germanic Rundenbogenstil architecture, favored by German immigrant craftsmen and brewery owners in the area.`
  );

  // Paragraph 3
  addParagraph(
    `Brooklyn was once home to many breweries that have become increasingly rare, as the majority have been demolished or heavily altered. The Complex retains its exterior massing, masonry, arched openings, turret and general character. By 1894, The Brewing Company's output skyrocketed from 3000 barrels of lager to 64,000 using a method of artificial refrigeration and bottling works. Even after Prohibition, the Company transitioned to post brewery operations such as sodas, a warehouse (1920s) and a furniture store (1930s).`
  );

  // Paragraph 4
  addParagraph(
    `As of this month, the new owner of the Complex has applied for a demolition permit, with the intention to clear the site for residential development. Once demolished, this structure cannot be recovered. The complex has tremendous potential for adaptive reuse as the previous owner filed plans to convert the space into a mixed-use building while retaining its historic character.`
  );

  // Paragraph 5
  addParagraph(
    `${userName} requests the LPC to designate the Joseph Fallert Brewery Complex as an Individual Landmark and that the Commission move promptly to evaluate this property given the active demolition permit application currently on file.`
  );

  y += lineH * 0.5;

  // Closing
  doc.text('Sincerely,', marginL, y);
  y += lineH * 1.5;

  // Signature image
  const sigImgH = 22; // mm
  const sigImgW = 55; // mm
  try {
    doc.addImage(signatureDataURL, 'PNG', marginL, y, sigImgW, sigImgH);
  } catch (err) {
    // If image fails (e.g. cross-origin), skip gracefully
    console.warn('Signature image could not be embedded:', err);
  }
  y += sigImgH + 1;

  // Signature line
  doc.setDrawColor(80, 80, 80);
  doc.line(marginL, y, marginL + sigImgW, y);
  y += lineH;

  // Name + date
  doc.setFontSize(10);
  doc.text(userName, marginL, y);
  doc.text(todayStr, marginL + sigImgW + 6, y);

  // Save
  doc.save('letter-of-support-fallert-brewery.pdf');

  // Show notice
  actionNotice.textContent = '✓ PDF downloaded — please attach it to the email draft that opens.';
  actionNotice.classList.remove('hidden');

  // Open mailto
  const subject = encodeURIComponent('Letter of Support for Joseph Fallert Brewery');
  const body = encodeURIComponent(
    `Dear Ms. Kersavage and Dr. Herman,\n\nPlease find attached my Letter of Support for the Joseph Fallert Brewery Complex Individual Landmark designation.\n\nSincerely,\n${userName}`
  );
  setTimeout(() => {
    window.location.href = `mailto:RFE@lpc.nyc.gov?subject=${subject}&body=${body}`;
  }, 400);
}

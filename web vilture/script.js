// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBYhrX6wf3XmT6qQdYsexSW98QQmlCxpeI",
  authDomain: "web-p8855.firebaseapp.com",
  projectId: "web-p8855",
  storageBucket: "web-p8855.firebasestorage.app",
  messagingSenderId: "1045044667480",
  appId: "1:1045044667480:web:869454f4116d7ac668962d",
  measurementId: "G-4B4FD3BRBP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const storage = firebase.storage();
let allFiles = [];
let currentCategory = 'All';
let confirmationResultGlobal;

// --- AUTHENTICATION LOGIC ---

function toggleAuthMode(mode) {
    document.getElementById('email-auth-ui').style.display = mode === 'email' ? 'block' : 'none';
    document.getElementById('phone-auth-ui').style.display = mode === 'phone' ? 'block' : 'none';
}

// Email Auth
async function loginEmail() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(err) { alert(err.message); }
}

async function signUpEmail() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try { await auth.createUserWithEmailAndPassword(e, p); alert("Account Created!"); } catch(err) { alert(err.message); }
}

// Phone Auth
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });

async function sendOTP() {
    const num = "+91" + document.getElementById('phoneNumber').value;
    try {
        confirmationResultGlobal = await auth.signInWithPhoneNumber(num, window.recaptchaVerifier);
        document.getElementById('number-step').style.display = 'none';
        document.getElementById('otp-step').style.display = 'block';
    } catch(err) { alert(err.message); }
}

async function verifyOTP() {
    const code = document.getElementById('verificationCode').value;
    try { await confirmationResultGlobal.confirm(code); } catch(err) { alert("Wrong OTP!"); }
}

function logout() { auth.signOut(); }

// --- FILE STORAGE LOGIC ---

function uploadFile() {
    const file = document.getElementById('filePicker').files[0];
    if(!file) return alert("Select a file");
    
    const ref = storage.ref(`users/${auth.currentUser.uid}/${file.name}`);
    const task = ref.put(file);
    
    document.getElementById('progWrap').style.display = 'block';
    task.on('state_changed', 
        s => { document.getElementById('pBar').style.width = (s.bytesTransferred/s.totalBytes)*100 + '%'; },
        e => alert(e.message),
        () => { document.getElementById('progWrap').style.display='none'; fetchFiles(); }
    );
}

async function fetchFiles() {
    const res = await storage.ref(`users/${auth.currentUser.uid}/`).listAll();
    const promises = res.items.map(async (item) => {
        const url = await item.getDownloadURL();
        const meta = await item.getMetadata();
        return { name: item.name, url, type: meta.contentType, path: item.fullPath, size: meta.size };
    });
    allFiles = await Promise.all(promises);
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('file-grid');
    grid.innerHTML = '';
    const filtered = allFiles.filter(f => (currentCategory === 'All' || f.type.includes(currentCategory)));
    
    filtered.forEach(file => {
        const isImg = file.type.includes('image');
        const col = document.createElement('div');
        col.className = "col-6 col-md-3";
        col.innerHTML = `
            <div class="file-card position-relative">
                <input type="checkbox" class="selection-check" value="${file.path}" onchange="updateDelBtn()">
                ${isImg ? `<img src="${file.url}" class="preview-img glightbox" data-gallery="vault">` : 
                `<div class="preview-img d-flex align-items-center justify-content-center fs-1">${getIcon(file.type)}</div>`}
                <div class="p-2">
                    <p class="small mb-2 text-truncate fw-bold">${file.name}</p>
                    <button onclick="openMedia('${file.url}', '${file.type}')" class="btn btn-sm btn-outline-primary w-100">View</button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
    GLightbox({ selector: '.glightbox' });
}

function getIcon(type) {
    if(type.includes('video')) return '🎬';
    if(type.includes('pdf')) return '📕';
    if(type.includes('audio')) return '🎵';
    return '📄';
}

function openMedia(url, type) {
    const content = document.getElementById('media-content');
    content.innerHTML = '';
    if(type.includes('video')) content.innerHTML = `<video src="${url}" controls autoplay></video>`;
    else if(type.includes('pdf')) content.innerHTML = `<iframe src="${url}" width="100%" height="500px"></iframe>`;
    else if(type.includes('audio')) content.innerHTML = `<audio src="${url}" controls autoplay class="w-100"></audio>`;
    else window.open(url, '_blank');
    document.getElementById('viewer-modal').style.display = 'flex';
}

function closeViewer() { 
    document.getElementById('viewer-modal').style.display = 'none'; 
    document.getElementById('media-content').innerHTML = '';
}

function setCategory(cat, el) {
    currentCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderGrid();
}

function updateDelBtn() {
    const count = document.querySelectorAll('.selection-check:checked').length;
    document.getElementById('delBtn').style.display = count > 0 ? 'block' : 'none';
}

async function bulkDelete() {
    if(!confirm("Delete selected?")) return;
    const selected = document.querySelectorAll('.selection-check:checked');
    for(let item of selected) { await storage.ref(item.value).delete(); }
    fetchFiles();
}

// Auth Observer
auth.onAuthStateChanged(user => {
    document.getElementById('auth-section').style.display = user ? 'none' : 'block';
    document.getElementById('dashboard-section').style.display = user ? 'block' : 'none';
    if(user) fetchFiles();
});

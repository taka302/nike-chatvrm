// ========================================
// 🎨 Nike ChatVRM Enhanced - 完全版
// ========================================

let OPENAI_API_KEY = '';
let PEXELS_API_KEY = '';
let VOICEVOX_URL = 'http://localhost:50021';
let conversationHistory = [];
let chartInstances = {};

// 📸 画像関連
let uploadedImages = [];

// 🎮 VRM関連
let scene, camera, renderer, currentVRM, clock;
let isVRMLoaded = false;

// 🎤 音声関連
let recognition = null;
let isRecording = false;
let currentAudio = null;

// 📝 ページ読み込み時の初期化
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Nike ChatVRM Enhanced 起動');
    loadAPIKeys();
    setupEventListeners();
    initVRMViewer();
    initSpeechRecognition();
    initImageUpload();
    displayWelcomeMessage();
});

// 🔑 APIキーの読み込み
function loadAPIKeys() {
    OPENAI_API_KEY = localStorage.getItem('openai_api_key') || '';
    PEXELS_API_KEY = localStorage.getItem('pexels_api_key') || '';
    VOICEVOX_URL = localStorage.getItem('voicevox_url') || 'http://localhost:50021';
    console.log('🔑 APIキー読み込み完了');
}

// 🎯 イベントリスナーのセットアップ
function setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const stopVoiceBtn = document.getElementById('stop-voice-btn');
    const imageBtn = document.getElementById('image-btn');
    const userInput = document.getElementById('user-input');
    const settingsBtn = document.getElementById('settings-btn');
    const characterSelect = document.getElementById('character-select');
    const vrmFileInput = document.getElementById('vrm-file-input');

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }

    if (voiceBtn) {
        voiceBtn.addEventListener('click', startVoiceInput);
    }

    if (stopVoiceBtn) {
        stopVoiceBtn.addEventListener('click', stopVoiceInput);
    }

    if (imageBtn) {
        imageBtn.addEventListener('click', () => {
            document.getElementById('image-file-input').click();
        });
    }

    if (characterSelect) {
        characterSelect.addEventListener('change', changeCharacter);
    }

    if (vrmFileInput) {
        vrmFileInput.addEventListener('change', loadVRMFile);
    }

    console.log('✅ イベントリスナー設定完了');
}

// 📸 画像アップロード機能の初期化
function initImageUpload() {
    const dropZone = document.getElementById('drop-zone');
    const imageFileInput = document.getElementById('image-file-input');
    const clearImagesBtn = document.getElementById('clear-images-btn');

    if (dropZone) {
        dropZone.addEventListener('click', () => {
            imageFileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            
            if (files.length > 0) {
                handleImageFiles(files);
            }
        });
    }

    if (imageFileInput) {
        imageFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleImageFiles(files);
            e.target.value = '';
        });
    }

    if (clearImagesBtn) {
        clearImagesBtn.addEventListener('click', clearAllImages);
    }

    console.log('✅ 画像アップロード機能初期化完了');
}

async function handleImageFiles(files) {
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        try {
            const base64 = await fileToBase64(file);
            const imageData = {
                name: file.name,
                base64: base64,
                type: file.type
            };
            
            uploadedImages.push(imageData);
            displayImagePreview(imageData, uploadedImages.length - 1);
            
        } catch (error) {
            console.error('画像読み込みエラー:', error);
            alert('⚠️ 画像の読み込みに失敗しました: ' + file.name);
        }
    }

    if (uploadedImages.length > 0) {
        document.getElementById('image-preview-area').style.display = 'block';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function displayImagePreview(imageData, index) {
    const previewGrid = document.getElementById('image-preview-grid');
    
    const previewItem = document.createElement('div');
    previewItem.className = 'image-preview-item';
    previewItem.innerHTML = `
        <img src="${imageData.base64}" alt="${imageData.name}">
        <button class="remove-image-btn" data-index="${index}">🗑️</button>
        <span class="image-name">${imageData.name}</span>
    `;
    
    previewItem.querySelector('.remove-image-btn').addEventListener('click', () => {
        removeImage(index);
    });
    
    previewGrid.appendChild(previewItem);
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    
    const previewGrid = document.getElementById('image-preview-grid');
    previewGrid.innerHTML = '';
    
    uploadedImages.forEach((img, i) => {
        displayImagePreview(img, i);
    });
    
    if (uploadedImages.length === 0) {
        document.getElementById('image-preview-area').style.display = 'none';
    }
}

function clearAllImages() {
    uploadedImages = [];
    document.getElementById('image-preview-grid').innerHTML = '';
    document.getElementById('image-preview-area').style.display = 'none';
}

// 🎮 VRMビューアーの初期化（修正版）
function initVRMViewer() {
    const canvas = document.getElementById('vrm-canvas');
    if (!canvas) {
        console.error('VRMキャンバスが見つかりません');
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0ff);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 20);
    camera.position.set(0, 1.4, 2.5);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true, 
        alpha: false 
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (renderer.outputEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    clock = new THREE.Clock();

    loadDefaultModel();

    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    animate();

    console.log('✅ VRMビューアー初期化完了');
}

// デフォルトモデル（修正版）
function loadDefaultModel() {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3`


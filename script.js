// ========================================
// 🎨 Nike ChatVRM Enhanced - 完全版
// ========================================

let OPENAI_API_KEY = '';
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
    
    // THREE.js r150+対応（修正版）
    if (renderer.outputColorSpace !== undefined) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (renderer.outputEncoding !== undefined) {
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

    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x667eea,
        metalness: 0.3,
        roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.2;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8899ff,
        metalness: 0.3,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    group.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.05, 1.68, 0.12);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.05, 1.68, 0.12);
    group.add(rightEye);

    const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b9d });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 1.8;
    group.add(antenna);

    const antennaBallGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const antennaBallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff6b9d,
        emissive: 0xff6b9d,
        emissiveIntensity: 0.5
    });
    const antennaBall = new THREE.Mesh(antennaBallGeometry, antennaBallMaterial);
    antennaBall.position.y = 1.88;
    group.add(antennaBall);

    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x667eea });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.25, 1.2, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.25, 1.2, 0);
    group.add(rightArm);

    group.userData.animate = (time) => {
        group.rotation.y = Math.sin(time * 0.5) * 0.2;
        if (antennaBall) {
            antennaBall.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        }
    };

    scene.add(group);
    currentVRM = { scene: group, update: () => {} };

    console.log('✅ デフォルトモデル読み込み完了');
}

async function loadVRMFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        await loadVRM(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
}

// VRM読み込み（修正版 - ローダー読み込み待機）
async function loadVRM(arrayBuffer) {
    // VRMローダーの読み込みを待機
    if (!window.GLTFLoader || !window.VRMLoaderPlugin) {
        console.log('⏳ VRMローダー読み込み待機中...');
        await new Promise((resolve) => {
            window.addEventListener('vrm-loaders-ready', resolve, { once: true });
        });
    }

    try {
        console.log('🎮 VRM読み込み開始');

        if (currentVRM && currentVRM.scene) {
            scene.remove(currentVRM.scene);
            currentVRM = null;
        }

        const loader = new window.GLTFLoader();
        loader.register((parser) => {
            return new window.VRMLoaderPlugin(parser);
        });

        console.log('🎮 VRMファイルを解析中...');

        loader.parse(
            arrayBuffer, 
            '', 
            (gltf) => {
                console.log('🎮 GLTF解析完了', gltf);

                const vrm = gltf.userData.vrm;
                
                if (!vrm) {
                    console.error('VRMデータが見つかりません', gltf);
                    alert('⚠️ このファイルは有効なVRMファイルではありません。');
                    return;
                }

                console.log('🎮 VRMデータ取得成功', vrm);

                currentVRM = vrm;
                scene.add(vrm.scene);
                
                const box = new THREE.Box3().setFromObject(vrm.scene);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxSize = Math.max(size.x, size.y, size.z);
                const distance = maxSize * 2;
                
                camera.position.set(center.x, center.y + size.y * 0.3, center.z + distance);
                camera.lookAt(center);
                
                isVRMLoaded = true;
                console.log('✅ VRMモデル読み込み成功');
                
                alert('✅ VRMモデルを読み込みました！');
            }, 
            (error) => {
                console.error('❌ VRM解析エラー:', error);
                alert('⚠️ VRMファイルの解析に失敗しました。\n\nエラー: ' + error.message);
            }
        );

    } catch (error) {
        console.error('❌ VRM読み込みエラー:', error);
        alert('⚠️ VRMファイルの読み込みに失敗しました。\n\nエラー: ' + error.message + '\n\nVRoid Studio 1.0以降で作成したVRMファイルを使用してください。');
    }
}

// アニメーションループ（修正版）
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (currentVRM) {
        // VRMモデルの更新
        if (currentVRM.update) {
            currentVRM.update(deltaTime);
        }
        
        // カスタムアニメーション（既存のコード）
        if (currentVRM.scene && currentVRM.scene.userData.animate) {
            currentVRM.scene.userData.animate(elapsedTime);
        }
        
        // 自動的に左右に揺れるアニメーション
        if (currentVRM.scene) {
            currentVRM.scene.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1;
        }
    }

    renderer.render(scene, camera);
}

// 🎤 音声認識の初期化
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('user-input').value = transcript;
            sendMessage();
            stopVoiceInput();
        };

        recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            stopVoiceInput();
            alert('⚠️ 音声認識エラー: ' + event.error);
        };

        recognition.onend = () => {
            stopVoiceInput();
        };

        console.log('✅ 音声認識初期化完了');
    }
}

function startVoiceInput() {
    if (!recognition) {
        alert('⚠️ このブラウザは音声認識に対応していません');
        return;
    }

    if (isRecording) {
        stopVoiceInput();
        return;
    }

    isRecording = true;
    document.getElementById('voice-btn').style.display = 'none';
    document.getElementById('stop-voice-btn').style.display = 'block';
    document.getElementById('user-input').placeholder = '🎤 話してください...';

    recognition.start();
    console.log('🎤 音声入力開始');
}

function stopVoiceInput() {
    if (recognition && isRecording) {
        recognition.stop();
    }
    isRecording = false;
    document.getElementById('voice-btn').style.display = 'block';
    document.getElementById('stop-voice-btn').style.display = 'none';
    document.getElementById('user-input').placeholder = 'メッセージを入力...';
    console.log('⏹️ 音声入力停止');
}

function changeCharacter(event) {
    const character = event.target.value;
    const characterName = document.getElementById('character-name');

    switch(character) {
        case 'nike':
            characterName.textContent = 'ニケちゃん';
            localStorage.setItem('current_character', 'nike');
            break;
        case 'friendly':
            characterName.textContent = 'フレンドリー';
            localStorage.setItem('current_character', 'friendly');
            break;
        case 'professional':
            characterName.textContent = 'プロフェッショナル';
            localStorage.setItem('current_character', 'professional');
            break;
    }
}

// 💬 ウェルカムメッセージ
function displayWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = `
        <div class="message ai-message">
            <p><strong>👋 こんにちは！私はニケちゃんです！</strong></p>
            <p>質問に<strong>図やイラスト、グラフ付き</strong>で答えます！📊📈🎨</p>
            
            <div class="welcome-examples">
                <p><strong>💡 試してみてください：</strong></p>
                <ul>
                    <li>📐 「100-30を図で説明して」</li>
                    <li>📊 「営業プロセスをフローチャートで」</li>
                    <li>📸 <strong>「画像を追加して、この写真について教えて」</strong></li>
                    <li>🖼️ <strong>「この図の説明をして」</strong></li>
                    <li>📝 <strong>「この文章を読み取って要約して」</strong></li>
                </ul>
            </div>
            
            <div class="welcome-features">
                <p><strong>🎮 主な機能：</strong></p>
                <ul>
                    <li>📷 画像をアップロードして質問できます</li>
                    <li>📂 ドラッグ&ドロップで複数画像追加</li>
                    <li>🎤 音声入力で話しかけられます</li>
                    <li>🔊 VOICEVOX音声出力</li>
                    <li>📊 フローチャート・グラフ自動生成</li>
                    <li>🎮 VRMモデル読み込み（オプション）</li>
                </ul>
            </div>
            
            <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                💡 右上の「⚙️ 設定」からAPIキーを設定してください
            </p>
        </div>
    `;
}

// 📤 メッセージ送信
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message && uploadedImages.length === 0) {
        alert('⚠️ メッセージまたは画像を入力してください');
        return;
    }
    
    if (!OPENAI_API_KEY) {
        alert('⚠️ OpenAI APIキーを設定してください！');
        openSettings();
        return;
    }

    displayUserMessage(message, uploadedImages);
    userInput.value = '';
    
    await getAIResponse(message, uploadedImages);
    clearAllImages();
}

function displayUserMessage(text, images) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    
    if (text) {
        const textPara = document.createElement('p');
        textPara.textContent = text;
        messageDiv.appendChild(textPara);
    }
    
    if (images && images.length > 0) {
        const imageGrid = document.createElement('div');
        imageGrid.className = 'message-images';
        
        images.forEach(img => {
            const imgElement = document.createElement('img');
            imgElement.src = img.base64;
            imgElement.alt = img.name;
            imgElement.className = 'message-image';
            imageGrid.appendChild(imgElement);
        });
        
        messageDiv.appendChild(imageGrid);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayMessage(text, type) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const textPara = document.createElement('p');
    textPara.textContent = text;
    messageDiv.appendChild(textPara);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 🤖 AI応答を取得（画像対応）
async function getAIResponse(userMessage, images = []) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message loading';
    loadingDiv.innerHTML = '<p>🤔 考え中...</p>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const systemPrompt = `あなたは優秀な家庭教師であり営業コンサルタントの「ニケちゃん」です。
複雑な内容を分かりやすく説明し、視覚的な図解を含めて答えてください。

【画像が送信された場合】
- 画像の内容を詳しく説明
- 図表やグラフがあれば解説
- 文字が含まれていれば読み取って説明

【図解の使い方】
- フローチャート: \`\`\`mermaid で囲む
- グラフ: \`\`\`chart で囲む

【回答のルール】
- 親しみやすく分かりやすい説明
- 絵文字を適度に使用
- 必要に応じて図解を含める`;

        const messageContent = [];
        
        if (userMessage) {
            messageContent.push({
                type: 'text',
                text: userMessage
            });
        }
        
        if (images && images.length > 0) {
            images.forEach(img => {
                messageContent.push({
                    type: 'image_url',
                    image_url: {
                        url: img.base64
                    }
                });
            });
        }

        conversationHistory.push({
            role: 'user',
            content: messageContent
        });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory
                ],
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`APIエラー: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;

        conversationHistory.push({
            role: 'assistant',
            content: aiMessage
        });

        chatMessages.removeChild(loadingDiv);

        await displayAIMessageWithVisuals(aiMessage);
        await speakText(aiMessage);

    } catch (error) {
        console.error('❌ エラー:', error);
        if (loadingDiv && loadingDiv.parentNode) {
            chatMessages.removeChild(loadingDiv);
        }
        displayMessage(`⚠️ エラーが発生しました: ${error.message}`, 'ai');
    }
}

// 🎨 AI応答を図解付きで表示（修正版 - Mermaid v10対応 + HTMLタグ混入防止 + YouTube埋め込み）
async function displayAIMessageWithVisuals(content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    let processedContent = content;

    // 1️⃣ YouTubeリンクを埋め込みに変換
    const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g;
    processedContent = processedContent.replace(youtubeRegex, (match, p1, p2, videoId) => {
        return `<div class="youtube-embed">
            <iframe 
                width="100%" 
                height="315" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>`;
    });

    // 2️⃣ Mermaid図を抽出・保護
    const mermaidBlocks = [];
    let mermaidIndex = 0;
    // 2️⃣ Mermaid図を抽出・保護
    const mermaidBlocks = [];
    let mermaidIndex = 0;
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

    processedContent = processedContent.replace(mermaidRegex, (match, diagram) => {
        const placeholder = `__MERMAID_${mermaidIndex}__`;
        mermaidBlocks.push({
            id: `mermaid-${Date.now()}-${mermaidIndex}`,
            content: diagram.trim()
        });
        mermaidIndex++;
        return placeholder;
    });

    // 3️⃣ チャート図を抽出・保護
    const chartBlocks = [];
    let chartIndex = 0;
    const chartRegex = /```chart\n([\s\S]*?)```/g;

    processedContent = processedContent.replace(chartRegex, (match, data) => {
        const placeholder = `__CHART_${chartIndex}__`;
        chartBlocks.push({
            id: `chart-${Date.now()}-${chartIndex}`,
            data: data
        });
        chartIndex++;
        return placeholder;
    });

    // 4️⃣ 通常のテキストをHTML化（Markdown処理）
    processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    // 5️⃣ Mermaidブロックを戻す（HTMLタグが混入しない）
    mermaidBlocks.forEach((block, index) => {
        const mermaidHtml = `<pre class="mermaid" id="${block.id}">${block.content}</pre>`;
        processedContent = processedContent.replace(`__MERMAID_${index}__`, mermaidHtml);
    });

    // 6️⃣ チャートブロックを戻す
    chartBlocks.forEach((block, index) => {
        const chartHtml = `<div class="chart-container"><canvas id="${block.id}" class="chart-canvas"></canvas></div>`;
        processedContent = processedContent.replace(`__CHART_${index}__`, chartHtml);
    });

    messageDiv.innerHTML = processedContent;
    chatMessages.appendChild(messageDiv);

    // 7️⃣ Mermaid描画（クリーンなコード）
    if (mermaidBlocks.length > 0) {
        try {
            await mermaid.run({
                querySelector: '.mermaid'
            });
            console.log('✅ Mermaid描画成功');
        } catch (error) {
            console.error('❌ Mermaidエラー:', error);
            messageDiv.querySelectorAll('.mermaid').forEach(el => {
                el.innerHTML = `<div style="color: red; padding: 10px; background: #fee;">
                    ⚠️ 図解エラー: ${error.message}
                </div>`;
            });
        }
    }

    // 8️⃣ チャート描画
    chartBlocks.forEach(block => {
        renderChart(block.id, block.data);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 📈 Chart.js描画
function renderChart(canvasId, chartDataString) {
    setTimeout(() => {
        try {
            const lines = chartDataString.trim().split('\n');
            let type = 'bar';
            let labels = [];
            let data = [];
            let title = 'グラフ';

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('type:')) {
                    type = trimmedLine.split(':')[1].trim();
                } else if (trimmedLine.startsWith('labels:')) {
                    labels = JSON.parse(trimmedLine.substring(trimmedLine.indexOf('[')));
                } else if (trimmedLine.startsWith('data:')) {
                    data = JSON.parse(trimmedLine.substring(trimmedLine.indexOf('[')));
                } else if (trimmedLine.startsWith('title:')) {
                    title = trimmedLine.split('title:')[1].trim();
                }
            });

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            if (chartInstances[canvasId]) {
                chartInstances[canvasId].destroy();
            }

            const ctx = canvas.getContext('2d');
            
            const colors = [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)'
            ];

            chartInstances[canvasId] = new Chart(ctx, {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: title,
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderColor: colors.slice(0, data.length).map(c => c.replace('0.8', '1')),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: {
                            display: true,
                            text: title,
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: type !== 'pie' && type !== 'doughnut' ? {
                        y: { beginAtZero: true }
                    } : {}
                }
            });
        } catch (error) {
            console.error('チャート描画エラー:', error);
        }
    }, 200);
}

// 🔊 音声出力
async function speakText(text) {
    const voiceMode = localStorage.getItem('voice_mode') || 'voicevox';
    if (voiceMode === 'off') return;

    const cleanText = text.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, '');

    if (voiceMode === 'voicevox') {
        await speakWithVOICEVOX(cleanText);
    } else if (voiceMode === 'browser') {
        speakWithBrowser(cleanText);
    }
}

async function speakWithVOICEVOX(text) {
    try {
        const speaker = localStorage.getItem('voicevox_character') || '3';
        
        const queryResponse = await fetch(`${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
            method: 'POST'
        });
        
        if (!queryResponse.ok) {
            throw new Error('VOICEVOXが起動していません');
        }
        
        const audioQuery = await queryResponse.json();
        
        const synthesisResponse = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speaker}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioQuery)
        });
        
        const audioBlob = await synthesisResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (currentAudio) {
            currentAudio.pause();
        }
        
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        
        console.log('🔊 VOICEVOX音声再生');
    } catch (error) {
        console.error('VOICEVOX エラー:', error);
        speakWithBrowser(text);
    }
}

function speakWithBrowser(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

function openSettings() {
    const existingModal = document.getElementById('settings-modal');
    if (existingModal) existingModal.remove();

    const currentOpenAI = localStorage.getItem('openai_api_key') || '';
    const currentVOICEVOX = localStorage.getItem('voicevox_url') || 'http://localhost:50021';
    const currentCharacter = localStorage.getItem('current_character') || 'nike';
    const currentVoiceMode = localStorage.getItem('voice_mode') || 'voicevox';
    const currentVoicevoxChar = localStorage.getItem('voicevox_character') || '3';

    const settingsHTML = `
        <div class="settings-modal" id="settings-modal">
            <div class="settings-content">
                <h2>⚙️ 設定</h2>
                
                <!-- API設定 -->
                <div class="settings-group">
                    <label>🤖 ChatGPT APIキー：</label>
                    <input type="password" id="openai-key" value="${currentOpenAI}" placeholder="sk-...">
                    <small>画像読み取りにはGPT-4o APIキーが必要です</small>
                </div>
                
                <!-- VRMファイル読み込み -->
                <div class="settings-group">
                    <label>📂 VRMファイル：</label>
                    <input type="file" id="vrm-file-input-settings" accept=".vrm">
                    <small>VRoid Studio 1.0以降で作成したVRMファイルを読み込めます</small>
                </div>
                
                <!-- キャラクター選択 -->
                <div class="settings-group">
                    <label>🎭 キャラクター選択：</label>
                    <select id="character-select-settings">
                        <option value="nike" ${currentCharacter === 'nike' ? 'selected' : ''}>ニケちゃん</option>
                        <option value="friendly" ${currentCharacter === 'friendly' ? 'selected' : ''}>フレンドリー</option>
                        <option value="professional" ${currentCharacter === 'professional' ? 'selected' : ''}>プロフェッショナル</option>
                    </select>
                </div>
                
                <!-- 音声設定 -->
                <div class="settings-group">
                    <label>🔊 音声出力：</label>
                    <select id="voice-select-settings">
                        <option value="voicevox" ${currentVoiceMode === 'voicevox' ? 'selected' : ''}>VOICEVOX（高品質）</option>
                        <option value="browser" ${currentVoiceMode === 'browser' ? 'selected' : ''}>ブラウザ標準</option>
                        <option value="off" ${currentVoiceMode === 'off' ? 'selected' : ''}>オフ</option>
                    </select>
                </div>
                
                <div class="settings-group">
                    <label>🎭 VOICEVOXキャラクター：</label>
                    <select id="voicevox-character-settings">
                        <option value="3" ${currentVoicevoxChar === '3' ? 'selected' : ''}>ずんだもん（ノーマル）</option>
                        <option value="1" ${currentVoicevoxChar === '1' ? 'selected' : ''}>四国めたん（ノーマル）</option>
                        <option value="8" ${currentVoicevoxChar === '8' ? 'selected' : ''}>春日部つむぎ（ノーマル）</option>
                    </select>
                </div>
                
                <div class="settings-group">
                    <label>🔊 VOICEVOX URL：</label>
                    <input type="text" id="voicevox-url-settings" value="${currentVOICEVOX}" placeholder="http://localhost:50021">
                </div>
                
                <div class="settings-buttons">
                    <button id="save-settings" class="btn-primary">💾 保存</button>
                    <button id="close-settings" class="btn-secondary">❌ 閉じる</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);

    // イベントリスナーを追加
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').remove();
    });

    // VRMファイル読み込み
    document.getElementById('vrm-file-input-settings').addEventListener('change', loadVRMFile);

    // キャラクター選択
    document.getElementById('character-select-settings').addEventListener('change', (e) => {
        changeCharacter(e);
    });
}

function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const voiceMode = document.getElementById('voice-select-settings').value;
    const voicevoxChar = document.getElementById('voicevox-character-settings').value;
    const voicevoxUrl = document.getElementById('voicevox-url-settings').value.trim();

    if (!openaiKey) {
        alert('⚠️ ChatGPT APIキーは必須です！');
        return;
    }

    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('voice_mode', voiceMode);
    localStorage.setItem('voicevox_character', voicevoxChar);
    localStorage.setItem('voicevox_url', voicevoxUrl);

    OPENAI_API_KEY = openaiKey;
    VOICEVOX_URL = voicevoxUrl;

    alert('✅ 設定を保存しました！');
    document.getElementById('settings-modal').remove();
}

console.log('✅ script.js 読み込み完了');

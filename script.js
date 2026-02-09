// ========================================
// 🎨 Nike ChatVRM Enhanced - VRM対応版
// ========================================

let OPENAI_API_KEY = '';
let PEXELS_API_KEY = '';
let VOICEVOX_URL = 'http://localhost:50021';
let conversationHistory = [];
let chartInstances = {};

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

    if (characterSelect) {
        characterSelect.addEventListener('change', changeCharacter);
    }

    if (vrmFileInput) {
        vrmFileInput.addEventListener('change', loadVRMFile);
    }

    console.log('✅ イベントリスナー設定完了');
}

// 🎮 VRMビューアーの初期化
function initVRMViewer() {
    const canvas = document.getElementById('vrm-canvas');
    if (!canvas) return;

    // Three.jsシーンの初期化
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // カメラ
    camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 20);
    camera.position.set(0, 1.4, 2);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // ライト
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // クロック
    clock = new THREE.Clock();

    // デフォルトVRMモデルを読み込み（なければキューブを表示）
    loadDefaultModel();

    // アニメーションループ
    animate();

    console.log('✅ VRMビューアー初期化完了');
}

// 🎮 デフォルトモデル読み込み
function loadDefaultModel() {
    // デフォルトのキューブを表示（VRMがない場合）
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x667eea });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1.4;
    scene.add(cube);
}

// 🎮 VRMファイル読み込み
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

// 🎮 VRM読み込み処理
async function loadVRM(arrayBuffer) {
    try {
        // 既存のVRMを削除
        if (currentVRM) {
            scene.remove(currentVRM.scene);
            currentVRM = null;
        }

        // GLTFLoaderにVRMLoaderPluginを登録
        const loader = new window.GLTFLoader();
        loader.register((parser) => {
            return new window.VRMLoaderPlugin(parser);
        });

        // VRMを読み込み
        loader.parse(arrayBuffer, '', (gltf) => {
            const vrm = gltf.userData.vrm;
            
            if (vrm) {
                currentVRM = vrm;
                scene.add(vrm.scene);
                
                // カメラ位置調整
                const box = new THREE.Box3().setFromObject(vrm.scene);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                camera.position.set(center.x, center.y + size.y * 0.3, center.z + size.y * 1.5);
                camera.lookAt(center);
                
                isVRMLoaded = true;
                console.log('✅ VRMモデル読み込み成功');
                
                alert('✅ VRMモデルを読み込みました！');
            }
        }, (error) => {
            console.error('❌ VRM読み込みエラー:', error);
            alert('⚠️ VRMファイルの読み込みに失敗しました');
        });
    } catch (error) {
        console.error('❌ VRM読み込みエラー:', error);
        alert('⚠️ VRMファイルの読み込みに失敗しました');
    }
}

// 🎮 アニメーションループ
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // VRMの更新
    if (currentVRM) {
        currentVRM.update(deltaTime);
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
    } else {
        console.warn('⚠️ このブラウザは音声認識に対応していません');
    }
}

// 🎤 音声入力開始
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

// 🎤 音声入力停止
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

// 🎭 キャラクター変更
function changeCharacter(event) {
    const character = event.target.value;
    const characterName = document.getElementById('character-name');

    switch(character) {
        case 'nike':
            characterName.textContent = 'ニケちゃん';
            document.getElementById('voicevox-character').value = '3'; // ずんだもん
            break;
        case 'friendly':
            characterName.textContent = 'フレンドリー';
            document.getElementById('voicevox-character').value = '1'; // 四国めたん
            break;
        case 'professional':
            characterName.textContent = 'プロフェッショナル';
            document.getElementById('voicevox-character').value = '8'; // 春日部つむぎ
            break;
    }

    console.log('🎭 キャラクター変更:', character);
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
                    <li>📈 「売上データをグラフで表示」</li>
                    <li>🔬 「光合成の仕組みを図解して」</li>
                    <li>🎤 「音声入力ボタンで話しかけられます」</li>
                </ul>
            </div>
            
            <div class="welcome-features">
                <p><strong>🎮 VRM機能：</strong></p>
                <ul>
                    <li>📂 左側の「VRMファイルを読み込む」から自分のVRoidモデルを読み込めます</li>
                    <li>🎭 VRMモデルはVRoid Studioで作成できます</li>
                    <li>🔊 VOICEVOXで音声が出力されます（要VOICEVOX起動）</li>
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
    
    if (!message) {
        alert('⚠️ メッセージを入力してください');
        return;
    }
    
    if (!OPENAI_API_KEY) {
        alert('⚠️ OpenAI APIキーを設定してください！\n右上の「⚙️ 設定」ボタンから設定できます。');
        openSettings();
        return;
    }

    // ユーザーメッセージを表示
    displayMessage(message, 'user');
    userInput.value = '';

    // AIの応答を取得
    await getAIResponse(message);
}

// 💬 メッセージを表示
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

// 🤖 AI応答を取得
async function getAIResponse(userMessage) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // ローディング表示
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message loading';
    loadingDiv.innerHTML = '<p>🤔 考え中...</p>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 会話履歴に追加
    conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    try {
        const systemPrompt = `あなたは優秀な家庭教師であり営業コンサルタントの「ニケちゃん」です。
複雑な内容を分かりやすく説明し、視覚的な図解を含めて答えてください。

【図解の使い方】
- フローチャート: \`\`\`mermaid で囲む
- グラフ: \`\`\`chart で囲む
- 必ず見やすい図解を含める

【回答のルール】
- 親しみやすく、分かりやすい説明
- 適切な絵文字を使用
- 図解は必ず正しい構文で記述`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory
                ],
                temperature: 0.7,
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

        // 📊 AI応答を図解付きで表示
        await displayAIMessageWithVisuals(aiMessage);

        // 🔊 音声出力
        await speakText(aiMessage);

        // 🖼️ 関連画像を取得
        if (PEXELS_API_KEY) {
            await fetchRelatedMedia(userMessage);
        }

    } catch (error) {
        console.error('❌ エラー:', error);
        if (loadingDiv && loadingDiv.parentNode) {
            chatMessages.removeChild(loadingDiv);
        }
        displayMessage(`⚠️ エラーが発生しました: ${error.message}`, 'ai');
    }
}

// 🎨 AI応答を図解付きで表示
async function displayAIMessageWithVisuals(content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    let processedContent = content;

    // Mermaid図解を検出
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let mermaidIndex = 0;

    processedContent = processedContent.replace(mermaidRegex, (match, diagram) => {
        const diagramId = `mermaid-${Date.now()}-${mermaidIndex++}`;
        return `<div class="mermaid-diagram" id="${diagramId}">${diagram.trim()}</div>`;
    });

    // Chart.jsグラフを検出
    const chartRegex = /```chart\n([\s\S]*?)```/g;
    let chartIndex = 0;
    const chartData = [];

    processedContent = processedContent.replace(chartRegex, (match, data) => {
        const chartId = `chart-${Date.now()}-${chartIndex++}`;
        chartData.push({ id: chartId, data: data });
        return `<div class="chart-container"><canvas id="${chartId}" class="chart-canvas"></canvas></div>`;
    });

    // Markdown風の整形
    processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    messageDiv.innerHTML = processedContent;
    chatMessages.appendChild(messageDiv);

    // Mermaidレンダリング
    if (processedContent.includes('mermaid-diagram')) {
        try {
            await mermaid.run({
                nodes: messageDiv.querySelectorAll('.mermaid-diagram')
            });
        } catch (error) {
            console.error('Mermaidエラー:', error);
        }
    }

    // Chart.js描画
    chartData.forEach(item => {
        renderChart(item.id, item.data);
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
    const voiceMode = document.getElementById('voice-select').value;
    
    if (voiceMode === 'off') return;

    // HTMLタグを除去
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, '');

    if (voiceMode === 'voicevox') {
        await speakWithVOICEVOX(cleanText);
    } else if (voiceMode === 'browser') {
        speakWithBrowser(cleanText);
    }
}

// 🔊 VOICEVOX音声出力
async function speakWithVOICEVOX(text) {
    try {
        const speaker = document.getElementById('voicevox-character').value;
        
        // 音声クエリ作成
        const queryResponse = await fetch(`${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
            method: 'POST'
        });
        
        if (!queryResponse.ok) {
            throw new Error('VOICEVOXが起動していません');
        }
        
        const audioQuery = await queryResponse.json();
        
        // 音声合成
        const synthesisResponse = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speaker}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioQuery)
        });
        
        const audioBlob = await synthesisResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 音声再生
        if (currentAudio) {
            currentAudio.pause();
        }
        
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        
        console.log('🔊 VOICEVOX音声再生');
    } catch (error) {
        console.error('VOICEVOX エラー:', error);
        console.log('ブラウザ標準音声にフォールバック');
        speakWithBrowser(text);
    }
}

// 🔊 ブラウザ標準音声出力
function speakWithBrowser(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
        console.log('🔊 ブラウザ音声再生');
    }
}

// 🖼️ 関連画像取得
async function fetchRelatedMedia(query) {
    if (!PEXELS_API_KEY) return;

    try {
        const keywords = query.split(/[、。\s]+/).filter(w => w.length > 1);
        const searchQuery = keywords[0] || query;

        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=4&locale=ja-JP`,
            { headers: { 'Authorization': PEXELS_API_KEY } }
        );

        const data = await response.json();
        displayMediaResults(data.photos || []);
    } catch (error) {
        console.error('画像取得エラー:', error);
    }
}

// 🖼️ メディア結果表示
function displayMediaResults(photos) {
    const mediaContainer = document.getElementById('media-grid');
    if (!mediaContainer) return;

    mediaContainer.innerHTML = '';

    if (photos.length === 0) {
        mediaContainer.innerHTML = '<p style="text-align: center; color: #888;">関連画像が見つかりませんでした</p>';
        return;
    }

    photos.forEach(photo => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        mediaItem.innerHTML = `
            <img src="${photo.src.medium}" alt="${photo.alt || '画像'}" loading="lazy">
            <p class="media-caption">${photo.alt || '関連画像'}</p>
        `;
        mediaContainer.appendChild(mediaItem);
    });
}

// ⚙️ 設定画面
function openSettings() {
    const existingModal = document.getElementById('settings-modal');
    if (existingModal) existingModal.remove();

    const currentOpenAI = localStorage.getItem('openai_api_key') || '';
    const currentPexels = localStorage.getItem('pexels_api_key') || '';
    const currentVOICEVOX = localStorage.getItem('voicevox_url') || 'http://localhost:50021';

    const settingsHTML = `
        <div class="settings-modal" id="settings-modal">
            <div class="settings-content">
                <h2>⚙️ API設定</h2>
                
                <div class="settings-group">
                    <label>🤖 ChatGPT APIキー：</label>
                    <input type="password" id="openai-key" value="${currentOpenAI}" placeholder="sk-...">
                </div>
                
                <div class="settings-group">
                    <label>📸 Pexels APIキー：</label>
                    <input type="text" id="pexels-key" value="${currentPexels}" placeholder="Pexels API Key">
                </div>
                
                <div class="settings-group">
                    <label>🔊 VOICEVOX URL：</label>
                    <input type="text" id="voicevox-url" value="${currentVOICEVOX}" placeholder="http://localhost:50021">
                    <small>VOICEVOXを起動してから使用してください</small>
                </div>
                
                <div class="settings-buttons">
                    <button id="save-settings" class="btn-primary">💾 保存</button>
                    <button id="close-settings" class="btn-secondary">❌ 閉じる</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);

    document.getElementById('save-settings').addEventListener('click', () => {
        const openaiKey = document.getElementById('openai-key').value.trim();
        const pexelsKey = document.getElementById('pexels-key').value.trim();
        const voicevoxUrl = document.getElementById('voicevox-url').value.trim();

        if (!openaiKey) {
            alert('⚠️ ChatGPT APIキーは必須です！');
            return;
        }

        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('pexels_api_key', pexelsKey);
        localStorage.setItem('voicevox_url', voicevoxUrl);

        OPENAI_API_KEY = openaiKey;
        PEXELS_API_KEY = pexelsKey;
        VOICEVOX_URL = voicevoxUrl;

        alert('✅ 設定を保存しました！');
        document.getElementById('settings-modal').remove();
    });

    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').remove();
    });
}

console.log('✅ script.js 読み込み完了');

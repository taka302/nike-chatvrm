// グローバル変数
let apiKeys = {
    openai: '',
    pexels: ''
};

let currentCharacter = 'friendly';
let recognition = null;

// キャラクター設定
const characters = {
    friendly: {
        name: 'フレンドリーちゃん',
        image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
        systemPrompt: 'あなたは明るくフレンドリーなアシスタントです。絵文字を使って楽しく会話してください。'
    },
    professional: {
        name: 'プロフェッショナル先生',
        image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
        systemPrompt: 'あなたは礼儀正しく専門的なアシスタントです���丁寧で分かりやすい説明を心がけてください。'
    },
    cute: {
        name: 'かわいこちゃん',
        image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
        systemPrompt: 'あなたは可愛らしく優しいアシスタントです。「〜だよ♪」「〜なの！」など可愛い口調で話してください。'
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateCharacter();
    setupVoiceInput();
});

// 設定の読み込み
function loadSettings() {
    const savedOpenAI = localStorage.getItem('openai_key');
    const savedPexels = localStorage.getItem('pexels_key');
    
    if (savedOpenAI) {
        apiKeys.openai = savedOpenAI;
        document.getElementById('openai-key').value = savedOpenAI;
    }
    
    if (savedPexels) {
        apiKeys.pexels = savedPexels;
        document.getElementById('pexels-key').value = savedPexels;
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // 送信ボタン
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Enterキーで送信
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // キャラクター変更
    document.getElementById('character-select').addEventListener('change', (e) => {
        currentCharacter = e.target.value;
        updateCharacter();
    });
    
    // 設定モーダル
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementsByClassName('close')[0];
    const saveBtn = document.getElementById('save-settings');
    
    settingsBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    saveBtn.onclick = saveSettings;
    
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
    };
    
    // 音声入力ボタン
    document.getElementById('voice-input-btn').addEventListener('click', toggleVoiceInput);
}

// キャラクター更新
function updateCharacter() {
    const char = characters[currentCharacter];
    document.getElementById('character-image').src = char.image;
    document.getElementById('character-name').textContent = char.name;
}

// 設定保存
function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value;
    const pexelsKey = document.getElementById('pexels-key').value;
    
    if (openaiKey) {
        apiKeys.openai = openaiKey;
        localStorage.setItem('openai_key', openaiKey);
    }
    
    if (pexelsKey) {
        apiKeys.pexels = pexelsKey;
        localStorage.setItem('pexels_key', pexelsKey);
    }
    
    alert('設定を保存しました！');
    document.getElementById('settings-modal').style.display = 'none';
}

// メッセージ送信
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!apiKeys.openai) {
        alert('設定からChatGPT APIキーを入力してください！');
        return;
    }
    
    // ユーザーメッセージを表示
    addMessage(message, 'user');
    input.value = '';
    
    try {
        // ChatGPT APIを呼び出し
        const response = await callChatGPT(message);
        
        // AIの返答を表示
        addMessage(response, 'ai');
        
        // VOICEVOXで読み上げ（オプション）
        speakWithVoicevox(response);
        
        // 関連メディアを検索・表示
        await searchAndDisplayMedia(message);
        
    } catch (error) {
        console.error('エラー:', error);
        addMessage('エラーが発生しました: ' + error.message, 'ai');
    }
}

// チャットにメッセージを追加
function addMessage(text, type) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ChatGPT API呼び出し
async function callChatGPT(userMessage) {
    const char = characters[currentCharacter];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.openai}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: char.systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error('ChatGPT APIエラー: ' + response.statusText);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Pexelsで画像・動画を検索
async function searchAndDisplayMedia(query) {
    if (!apiKeys.pexels) {
        console.log('Pexels APIキーが設定されていません');
        return;
    }
    
    const mediaDisplay = document.getElementById('media-display');
    mediaDisplay.innerHTML = '<p>メディアを検索中...</p>';
    
    try {
        // キーワード抽出（簡易版）
        const keywords = extractKeywords(query);
        
        // 画像検索
        const imageResponse = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=3`, {
            headers: {
                'Authorization': apiKeys.pexels
            }
        });
        
        // 動画検索
        const videoResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=2`, {
            headers: {
                'Authorization': apiKeys.pexels
            }
        });
        
        const imageData = await imageResponse.json();
        const videoData = await videoResponse.json();
        
        // メディアを表示
        mediaDisplay.innerHTML = '';
        
        // 画像を表示
        if (imageData.photos && imageData.photos.length > 0) {
            imageData.photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'media-item';
                item.innerHTML = `
                    <img src="${photo.src.medium}" alt="${photo.alt}">
                    <div class="media-caption">📷 ${photo.alt || 'Pexelsより'}</div>
                `;
                mediaDisplay.appendChild(item);
            });
        }
        
        // 動画を表示
        if (videoData.videos && videoData.videos.length > 0) {
            videoData.videos.forEach(video => {
                const item = document.createElement('div');
                item.className = 'media-item';
                item.innerHTML = `
                    <video controls>
                        <source src="${video.video_files[0].link}" type="video/mp4">
                    </video>
                    <div class="media-caption">🎥 ${video.user.name}より</div>
                `;
                mediaDisplay.appendChild(item);
            });
        }
        
        if (mediaDisplay.innerHTML === '') {
            mediaDisplay.innerHTML = '<p>関連メディアが見つかりませんでした</p>';
        }
        
    } catch (error) {
        console.error('メディア検索エラー:', error);
        mediaDisplay.innerHTML = '<p>メディアの取得に失敗しました</p>';
    }
}

// キーワード抽出（簡易版）
function extractKeywords(text) {
    // 簡単なキーワード抽出（実際はもっと高度な処理が必要）
    const stopWords = ['は', 'が', 'を', 'に', 'へ', 'と', 'の', 'で', 'や', '���', 'ください', 'です', 'ます', 'した'];
    const words = text.split(/\s+/);
    const filtered = words.filter(word => !stopWords.includes(word) && word.length > 1);
    return filtered.join(' ') || text;
}

// VOICEVOXで音声読み上げ
async function speakWithVoicevox(text) {
    try {
        // VOICEVOXがローカルで動いている場合（ポート50021）
        const response = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=1`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            console.log('VOICEVOX未起動、または接続できません');
            return;
        }
        
        const query = await response.json();
        
        const audioResponse = await fetch('http://localhost:50021/synthesis?speaker=1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query)
        });
        
        const audioBlob = await audioResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        
    } catch (error) {
        console.log('VOICEVOX読み上げスキップ:', error.message);
    }
}

// 音声入力の設定
function setupVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('このブラウザは音声認識に対応していません');
        document.getElementById('voice-input-btn').disabled = true;
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
        document.getElementById('voice-input-btn').textContent = '🎤 音声入力';
    };
    
    recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        document.getElementById('voice-input-btn').textContent = '🎤 音声入力';
    };
    
    recognition.onend = () => {
        document.getElementById('voice-input-btn').textContent = '🎤 音声入力';
    };
}

// 音声入力のオン/オフ
function toggleVoiceInput() {
    if (!recognition) {
        alert('音声認識が利用できません');
        return;
    }
    
    if (document.getElementById('voice-input-btn').textContent.includes('停止')) {
        recognition.stop();
        document.getElementById('voice-input-btn').textContent = '🎤 音声入力';
    } else {
        recognition.start();
        document.getElementById('voice-input-btn').textContent = '⏹️ 停止';
    }
}

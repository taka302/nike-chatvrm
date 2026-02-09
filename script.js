// ========================================
// 🎨 Nike ChatVRM Enhanced - 図解機能付き
// ========================================

let OPENAI_API_KEY = '';
let PEXELS_API_KEY = '';
let conversationHistory = [];
let chartInstances = {}; // Chart.jsインスタンス管理

// 📝 ページ読み込み時の初期化
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Nike ChatVRM Enhanced 起動');
    loadAPIKeys();
    setupEventListeners();
    displayWelcomeMessage();
});

// 🔑 APIキーの読み込み
function loadAPIKeys() {
    OPENAI_API_KEY = localStorage.getItem('openai_api_key') || '';
    PEXELS_API_KEY = localStorage.getItem('pexels_api_key') || '';
    console.log('🔑 APIキー読み込み完了');
}

// 🎯 イベントリスナーのセットアップ
function setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
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
        voiceBtn.addEventListener('click', () => {
            alert('🎤 音声入力機能は今後実装予定です！');
        });
    }

    console.log('✅ イベントリスナー設定完了');
}

// 💬 ウェルカムメッセージ
function displayWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = `
        <div class="message ai-message">
            <p><strong>👋 こんにちは！私はかわいこちゃんです！</strong></p>
            <p>質問に<strong>図やイラスト、グラフ付き</strong>で答えます！📊📈🎨</p>
            
            <div class="welcome-examples">
                <p><strong>💡 試してみてください：</strong></p>
                <ul>
                    <li>📐 「100-30を図で説明して」</li>
                    <li>📊 「営業プロセスをフローチャートで」</li>
                    <li>📈 「売上データをグラフで表示」</li>
                    <li>🔬 「光合成の仕組みを図解して」</li>
                    <li>📅 「プロジェクトスケジュールをタイムラインで」</li>
                    <li>🧠 「マーケティング戦略をマインドマップで」</li>
                </ul>
            </div>
            
            <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                💡 まだAPIキーを設定していない場合は、右上の「⚙️ 設定」から設定してください
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
        // 🎨 図解生成用のシステムプロンプト
        const systemPrompt = `あなたは優秀な家庭教師であり営業コンサルタントです。
複雑な内容を分かりやすく説明し、必ず視覚的な図解を含めて答えてください。

【図解の種類と使い方】

1️⃣ **フローチャート（手順・プロセス）**
\`\`\`mermaid
graph TD
    A[開始] --> B[ステップ1]
    B --> C[ステップ2]
    C --> D[完了]
\`\`\`

2️⃣ **円グラフ（割合・比率）**
\`\`\`mermaid
pie title 売上構成比
    "商品A" : 45
    "商品B" : 30
    "商品C" : 25
\`\`\`

3️⃣ **タイムライン（歴史・スケジュール）**
\`\`\`mermaid
timeline
    title プロジェクトスケジュール
    2024-01 : 企画
    2024-02 : 開発
    2024-03 : リリース
\`\`\`

4️⃣ **マインドマップ（概念整理）**
\`\`\`mermaid
mindmap
  root((中心概念))
    分岐1
      詳細1
      詳細2
    分岐2
      詳細3
\`\`\`

5️⃣ **関係図（つながり）**
\`\`\`mermaid
graph LR
    A[親概念] --> B[子概念1]
    A --> C[子概念2]
    B --> D[詳細]
\`\`\`

6️⃣ **棒グラフデータ**
\`\`\`chart
type: bar
labels: ["1月", "2月", "3月"]
data: [100, 150, 200]
title: 月別売上
\`\`\`

7️⃣ **折れ線グラフ**
\`\`\`chart
type: line
labels: ["1月", "2月", "3月", "4月"]
data: [10, 25, 18, 35]
title: 成長推移
\`\`\`

8️⃣ **円グラフ**
\`\`\`chart
type: pie
labels: ["A", "B", "C"]
data: [30, 50, 20]
title: 割合
\`\`\`

【重要なルール】
✅ 必ず説明の後に適切な図解を1つ以上含める
✅ 図解は \`\`\`mermaid または \`\`\`chart で囲む
✅ 複雑な内容は複数の図解を使用
✅ 数字の計算は具体的な図で説明
✅ 見やすく分かりやすい図を心がける

質問内容に応じて、最適な図解を選んで説明してください。`;

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

        // 会話履歴に追加
        conversationHistory.push({
            role: 'assistant',
            content: aiMessage
        });

        // ローディングを削除
        chatMessages.removeChild(loadingDiv);

        // 📊 AI応答を図解付きで表示
        await displayAIMessageWithVisuals(aiMessage);

        // 🖼️ 関連画像を取得
        if (PEXELS_API_KEY) {
            await fetchRelatedMedia(userMessage);
        }

    } catch (error) {
        console.error('❌ エラー:', error);
        if (loadingDiv && loadingDiv.parentNode) {
            chatMessages.removeChild(loadingDiv);
        }
        displayMessage(`⚠️ エラーが発生しました: ${error.message}\n\nAPIキーを確認してください。`, 'ai');
    }
}

// 🎨 AI応答を図解付きで表示
async function displayAIMessageWithVisuals(content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    let processedContent = content;

    // 📊 Mermaid図解を検出して処理
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let mermaidIndex = 0;

    processedContent = processedContent.replace(mermaidRegex, (match, diagram) => {
        const diagramId = `mermaid-${Date.now()}-${mermaidIndex++}`;
        return `<div class="mermaid-diagram" id="${diagramId}">${diagram.trim()}</div>`;
    });

    // 📈 Chart.js用のグラフデータを検出
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

    // 📊 Mermaidを再レンダリング
    if (processedContent.includes('mermaid-diagram')) {
        try {
            await mermaid.run({
                nodes: messageDiv.querySelectorAll('.mermaid-diagram')
            });
        } catch (error) {
            console.error('Mermaidレンダリングエラー:', error);
        }
    }

    // 📈 Chart.jsでグラフを描画
    chartData.forEach(item => {
        renderChart(item.id, item.data);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 📈 Chart.jsでグラフを描画
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
            if (!canvas) {
                console.error('Canvas not found:', canvasId);
                return;
            }

            // 既存のチャートを破棄
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
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    },
                    scales: type !== 'pie' && type !== 'doughnut' ? {
                        y: {
                            beginAtZero: true
                        }
                    } : {}
                }
            });

            console.log('✅ チャート描画成功:', canvasId);
        } catch (error) {
            console.error('❌ チャート描画エラー:', error);
        }
    }, 200);
}

// 🖼️ 関連画像を取得
async function fetchRelatedMedia(query) {
    if (!PEXELS_API_KEY) return;

    try {
        // キーワード抽出（簡易版）
        const keywords = query.split(/[、。\s]+/).filter(w => w.length > 1);
        const searchQuery = keywords[0] || query;

        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=4&locale=ja-JP`,
            {
                headers: {
                    'Authorization': PEXELS_API_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error('Pexels APIエラー');
        }

        const data = await response.json();
        displayMediaResults(data.photos || []);
    } catch (error) {
        console.error('🖼️ 画像取得エラー:', error);
    }
}

// 🖼️ メディア結果を表示
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

// ⚙️ 設定画面を開く
function openSettings() {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('settings-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const currentOpenAI = localStorage.getItem('openai_api_key') || '';
    const currentPexels = localStorage.getItem('pexels_api_key') || '';

    const settingsHTML = `
        <div class="settings-modal" id="settings-modal">
            <div class="settings-content">
                <h2>⚙️ API設定</h2>
                
                <div class="settings-group">
                    <label>🤖 ChatGPT APIキー：</label>
                    <input type="password" id="openai-key" value="${currentOpenAI}" placeholder="sk-...">
                    <small>OpenAI APIキーを入力してください</small>
                </div>
                
                <div class="settings-group">
                    <label>📸 Pexels APIキー：</label>
                    <input type="text" id="pexels-key" value="${currentPexels}" placeholder="Pexels API Key">
                    <small>Pexels APIキーを入力してください（任意）</small>
                </div>
                
                <div class="settings-buttons">
                    <button id="save-settings" class="btn-primary">💾 保存</button>
                    <button id="close-settings" class="btn-secondary">❌ 閉じる</button>
                </div>
                
                <div class="settings-help">
                    <p><strong>💡 APIキーの取得方法：</strong></p>
                    <ul>
                        <li><strong>ChatGPT:</strong> <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></li>
                        <li><strong>Pexels:</strong> <a href="https://www.pexels.com/api/" target="_blank">pexels.com/api</a></li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);

    // 保存ボタン
    document.getElementById('save-settings').addEventListener('click', () => {
        const openaiKey = document.getElementById('openai-key').value.trim();
        const pexelsKey = document.getElementById('pexels-key').value.trim();

        if (!openaiKey) {
            alert('⚠️ ChatGPT APIキーは必須です！');
            return;
        }

        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('pexels_api_key', pexelsKey);

        OPENAI_API_KEY = openaiKey;
        PEXELS_API_KEY = pexelsKey;

        alert('✅ 設定を保存しました！');
        document.getElementById('settings-modal').remove();
    });

    // 閉じるボタン
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').remove();
    });

    // 背景クリックで閉じる
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            document.getElementById('settings-modal').remove();
        }
    });
}

console.log('✅ script.js 読み込み完了');

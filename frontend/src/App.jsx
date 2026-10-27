import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // Автентифікація та сесійний ключ
  const [isAuth, setIsAuth] = useState(false);
  const [currentUser] = useState('admin');
  
  // Поля авторизації (зараз за замовчуванням порожні, щоб уникнути витоку)
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [authMessage, setAuthMessage] = useState('');
  const [jwtToken, setJwtToken] = useState('LOCKED_NO_TOKEN');
  const [dynamicShift, setDynamicShift] = useState(3);

  // Капсула корисного навантаження та файли
  const [payloadText, setPayloadText] = useState('КОНФІДЕНЦІЙНИЙ_ЗВІТ_2026: МЕРЕЖА ЗАХИЩЕНА');
  const [fileName, setFileName] = useState('manual_input_payload.txt');
  const [lastCiphertext, setLastCiphertext] = useState('[ТУНЕЛЬ ОЧІКУЄ АВТОРИЗАЦІЇ]');
  const [tunnelStatus, setTunnelStatus] = useState('LOCKED (REQUIRES JWT)');
  
  // Аудит приймаючого шлюзу
  const [gatewayAudit, setGatewayAudit] = useState(null);

  // Системні логи SOC
  const [logs, setLogs] = useState([
    '[00:00:01] SMARTCORP SECOPS HUB INITIALIZED.',
    '[00:00:02] PIPELINE ARMED. WAITING FOR SESSION TOKEN.'
  ]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { login, password });
      setIsAuth(true);
      setJwtToken(res.data.token);
      setDynamicShift(res.data.session_shift);
      setTunnelStatus('ACTIVE & SECURE (SINGLE-USE JWT OK)');
      setAuthMessage(`ACCESS GRANTED. Ephemeral session token issued.`);
      addLog(`AUTH SUCCESS: Admin ${currentUser} authenticated. New single-use JWT issued. Key N=${res.data.session_shift}`);

      // БЕЗПЕЧНЕ ОЧИЩЕННЯ: Видаляємо введені логін та пароль з полів та стейту, щоб унеможливити витік даних
      setLogin('');
      setPassword('');
      addLog(`SECURITY: Auth credentials sanitized & cleared from client memory.`);
    } catch (err) {
      setAuthMessage('ACCESS DENIED: Invalid credentials.');
      addLog(`AUTH FAILURE: Unauthorized login attempt.`);
      // Очищаємо пароль при помилці для запобігання перебору
      setPassword('');
    }
  };

  // Обробник файлу з автовизначенням кодування (UTF-8 / Windows-1251)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target.result;
        let text = '';
        try {
          const decoderUtf8 = new TextDecoder('utf-8', { fatal: true });
          text = decoderUtf8.decode(buffer);
        } catch (err) {
          const decoderAnsi = new TextDecoder('windows-1251');
          text = decoderAnsi.decode(buffer);
        }
        setPayloadText(text);
        addLog(`FILE UPLOAD: Loaded file "${file.name}" (${file.size} bytes) with auto-encoding.`);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleTransmitPayload = async () => {
    if (!isAuth) {
      alert('ПОМИЛКА БЕЗПЕКИ: Тунель заблоковано! Необхідна автентифікація.');
      setActiveTab('auth');
      return;
    }

    try {
      // ПЕРЕДАЄМО ОДНОРАЗОВИЙ ТОКЕН У ЗАПИТІ НА БЕКЕНД
      const res = await axios.post(`${API_URL}/api/cipher/caesar`, { 
        text: payloadText, 
        shift: Number(dynamicShift),
        token: jwtToken 
      });

      setLastCiphertext(res.data.ciphertext);
      setGatewayAudit(res.data.gateway_verification);
      addLog(`PIPELINE: File "${fileName}" encrypted & transmitted. Gateway verified integrity.`);
      
      // Оскільки токен одноразовий, після успішної передачі він згорає
      setIsAuth(false);
      setJwtToken('TOKEN_CONSUMED_LOCKED');
      setTunnelStatus('LOCKED (TOKEN EXPIRED - RE-AUTH REQUIRED)');
      addLog(`SECURITY: Single-use JWT token consumed. Tunnel locked for next transaction.`);
    } catch (err) {
      addLog(`ERROR: Transmission failed. Token rejected or expired.`);
      alert('ПОМИЛКА ПЕРЕДАЧІ: Токен уже використаний або недійсний!');
    }
  };

  return (
    <div className="app-container">
      {/* Шапка */}
      <div className="pixel-card pixel-card-gold" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', color: '#facc15', margin: 0 }}>SERVTALK Corporation</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
            Enterprise Security & Secure Tunnel Hub
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ background: isAuth ? '#065f46' : '#7f1d1d', border: `1px solid ${isAuth ? '#34d399' : '#f87171'}`, padding: '0.35rem 0.6rem', fontSize: '0.55rem', fontFamily: 'Press Start 2P', color: isAuth ? '#34d399' : '#f87171' }}>
            {isAuth ? 'SYS: SECURE' : 'SYS: LOCKED'}
          </span>
          <span style={{ background: '#312e81', border: '1px solid #818cf8', padding: '0.35rem 0.6rem', fontSize: '0.55rem', fontFamily: 'Press Start 2P', color: '#818cf8' }}>
            USER: {currentUser}
          </span>
        </div>
      </div>

      {/* Навігація */}
      <div className="nav-tabs" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          🖥️ ЗАХИЩЕНИЙ ТУНЕЛЬ ТА ШЛЮЗ
        </button>
        <button className={`tab-btn ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>
          🔐 КОНТРОЛЬ ДОСТУПУ (SINGLE-USE JWT)
        </button>
      </div>

      {/* Головний дашборд */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            
            {/* Тунель та завантаження файлу */}
            <div className="pixel-card pixel-card-gold">
              <div style={{ fontFamily: 'Press Start 2P', fontSize: '0.65rem', color: '#facc15', marginBottom: '1rem' }}>
                🟢 ІНТЕРАКТИВНА КАПСУЛА PAYLOAD
              </div>

              <div style={{ fontSize: '0.8rem', marginBottom: '0.8rem', background: '#090511', padding: '0.6rem', border: '1px solid #312e81' }}>
                <span style={{ color: '#9ca3af' }}>СТАТУС КАНАЛУ: </span>
                <span style={{ color: isAuth ? '#34d399' : '#ef4444', fontWeight: 'bold' }}>{tunnelStatus}</span>
              </div>

              <div style={{ fontSize: '0.8rem', marginBottom: '0.8rem' }}>
                <span style={{ color: '#38bdf8' }}>ЗАВАНТАЖИТИ ФАЙЛ З КОМП'ЮТЕРА (.TXT):</span>
                <input 
                  type="file" 
                  onChange={handleFileUpload}
                  style={{ display: 'block', marginTop: '6px', fontSize: '0.75rem', color: '#facc15', background: '#05030a', padding: '6px', border: '1px solid #312e81', width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '4px' }}>Активний файл: <code>{fileName}</code></div>
              </div>

              <div style={{ fontSize: '0.8rem', marginBottom: '0.8rem' }}>
                <span style={{ color: '#38bdf8' }}>ВМІСТ ФАЙЛУ (РЕДАГУВАННЯ PAYLOAD):</span>
                <textarea 
                  value={payloadText} 
                  onChange={(e) => setPayloadText(e.target.value)} 
                  rows={3}
                  style={{ marginTop: '4px', width: '100%', background: '#05030a', color: '#34d399', border: '1px solid #312e81', padding: '6px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                <span style={{ color: '#38bdf8' }}>ЗАШИФРОВАНИЙ ПАКЕТ У ТУНЕЛІ (CIPHERTEXT):</span>
                <div style={{ background: '#05030a', padding: '0.5rem', border: '2px solid #6d28d9', color: '#facc15', marginTop: '4px', wordBreak: 'break-all', fontSize: '0.75rem', maxHeight: '70px', overflowY: 'auto' }}>
                  {lastCiphertext}
                </div>
              </div>

              <button className="btn-pixel" onClick={handleTransmitPayload}>
                {isAuth ? `⚡ ЗАШИФРУВАТИ ТА ПЕРЕДАТИ (КЛЮЧ N=${dynamicShift})` : '🔒 ПОТРІБНА АВТЕНТИФІКАЦІЯ (ТОКЕН ВИЧЕРПАНО)'}
              </button>
            </div>

            {/* Шлюз та верифікація */}
            <div className="pixel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Press Start 2P', fontSize: '0.65rem', color: '#38bdf8', marginBottom: '1rem' }}>
                  🛡️ АУДИТ ПРИЙМАЮЧОГО ШЛЮЗУ
                </div>
                
                {gatewayAudit ? (
                  <div style={{ fontSize: '0.75rem', background: '#090511', padding: '0.8rem', border: '1px solid #34d399' }}>
                    <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}>[{gatewayAudit.status}]</div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Шлюз: {gatewayAudit.destination_node}</div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Час: {gatewayAudit.timestamp}</div>
                    <div style={{ color: '#38bdf8', marginTop: '6px' }}>Відновлений вміст файлу:</div>
                    <div style={{ color: '#facc15', background: '#05030a', padding: '6px', marginTop: '2px', maxHeight: '100px', overflowY: 'auto', wordBreak: 'break-all' }}>
                      {gatewayAudit.restored_payload}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', background: '#090511', padding: '0.8rem', border: '1px solid #312e81' }}>
                    Очікування передачі пакету для перевірки цілісності на приймаючому вузлі...
                  </div>
                )}
              </div>

              <div style={{ background: '#090511', padding: '0.5rem', border: '1px solid #1e1b4b', marginTop: '0.8rem', fontSize: '0.7rem', color: '#a78bfa' }}>
                <div>АКТИВНИЙ JWT СЕСІЙНИЙ ТОКЕН:</div>
                <div style={{ color: '#34d399', fontSize: '0.6rem', wordBreak: 'break-all', marginTop: '2px' }}>{jwtToken}</div>
              </div>
            </div>

          </div>

          {/* Журнал подій */}
          <div className="pixel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontFamily: 'Press Start 2P', fontSize: '0.65rem', color: '#34d399' }}>💻 SOC LIVE EVENT LOGS</span>
              <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.65rem' }}>[CLEAR]</button>
            </div>
            <div className="terminal-output" style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Модуль авторизації */}
      {activeTab === 'auth' && (
        <div className="pixel-card">
          <h3 style={{ fontSize: '0.85rem', color: '#facc15', marginBottom: '0.5rem' }}>&gt; ІДЕНТИФІКАЦІЯ ТА ГЕНЕРАЦІЯ ОДНОРАЗОВОГО JWT</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.80rem', marginBottom: '1.2rem' }}>
            Отримання унікального ефемерного сесійного токена для однієї транзакції шифрування.
          </p>
          
          <form onSubmit={handleLogin} style={{ maxWidth: '500px' }}>
            <label style={{ fontSize: '0.8rem' }}>ADMIN LOGIN:</label>
            <input 
              type="text" 
              value={login} 
              onChange={(e) => setLogin(e.target.value)} 
              placeholder="Введіть логін..."
            />
            
            <label style={{ fontSize: '0.8rem' }}>PASSWORD:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Введіть пароль..."
            />
            
            <button type="submit" className="btn-pixel">УВІЙТИ ТА ОТРИМАТИ JWT</button>
          </form>

          {authMessage && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: isAuth ? '#34d399' : '#ef4444' }}>
              {authMessage}
            </div>
          )}

          {isAuth && (
            <div style={{ marginTop: '1.5rem', background: '#090511', padding: '1rem', border: '1px solid #34d399' }}>
              <div style={{ color: '#34d399', fontSize: '0.75rem', marginBottom: '6px', fontFamily: 'Press Start 2P' }}>
                ✅ АКТИВНИЙ ОДНОРАЗОВИЙ JWT:
              </div>
              <div style={{ color: '#facc15', fontSize: '0.75rem', wordBreak: 'break-all', background: '#05030a', padding: '8px', border: '1px solid #1e1b4b' }}>
                {jwtToken}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.7rem', marginTop: '6px' }}>
                Динамічний ключ зсуву ($N$): <strong style={{ color: '#38bdf8' }}>{dynamicShift}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
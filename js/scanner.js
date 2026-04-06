/**
 * 条形码/二维码扫描模块
 * 使用 quagga2 库（专门处理1D条形码，也支持QR码）
 */

let quaggaInstance = null;
let lastDetectedCode = null;
let lastDetectedTime = 0;

/**
 * 动态加载 quagga2
 */
function loadQuagga() {
  return new Promise((resolve, reject) => {
    if (window.Quagga) {
      console.log('Quagga 已缓存');
      resolve(window.Quagga);
      return;
    }

    console.log('正在加载 Quagga2...');
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
    script.onload = () => {
      console.log('Quagga2 加载成功');
      resolve(window.Quagga);
    };
    script.onerror = (e) => {
      console.error('Quagga2 加载失败', e);
      reject(new Error('加载扫描库失败'));
    };
    document.head.appendChild(script);
  });
}

/**
 * 初始化扫描器
 */
async function initScanner(elementId, onScanSuccess, onScanError) {
  const Quagga = await loadQuagga();
  console.log('Quagga 版本:', Quagga.VERSION || 'unknown');

  return new Promise((resolve, reject) => {
    console.log('正在初始化扫描器...');

    // 简化配置，先测试基本功能
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.getElementById(elementId),
        constraints: {
          facingMode: "environment"
        }
      },
      decoder: {
        readers: [
          "ean_reader",
          "code_128_reader"
        ]
      },
      locate: true
    }, (err) => {
      if (err) {
        console.error('Quagga init 错误:', err);
        reject(err);
        return;
      }

      console.log('Quagga 初始化成功，开始扫描');

      Quagga.onDetected((result) => {
        if (!result || !result.codeResult || !result.codeResult.code) return;

        const code = result.codeResult.code;
        const now = Date.now();

        console.log('检测到条码:', code);

        // 防抖
        if (code === lastDetectedCode && now - lastDetectedTime < 2000) return;

        lastDetectedCode = code;
        lastDetectedTime = now;

        playBeep();
        showScanFeedback(code);

        setTimeout(() => {
          stopScanner();
          if (onScanSuccess) onScanSuccess(code, result);
        }, 500);
      });

      Quagga.onError((err) => {
        console.log('Quagga 错误:', err);
        if (onScanError) onScanError(err);
      });

      Quagga.start();
      quaggaInstance = Quagga;
      resolve(Quagga);
    });
  });
}

/**
 * 发出提示音
 */
function playBeep() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('提示音播放失败:', e);
  }
}

/**
 * 显示扫描反馈
 */
function showScanFeedback(code) {
  const old = document.querySelector('.scan-feedback');
  if (old) old.remove();

  const feedback = document.createElement('div');
  feedback.className = 'scan-feedback';
  feedback.innerHTML = `
    <div style="background: #16a34a; color: white; padding: 1rem 1.5rem; border-radius: 8px; font-size: 1.25rem; font-weight: bold; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      识别成功
      <div style="font-size: 0.875rem; font-weight: normal; margin-top: 0.5rem; opacity: 0.9;">${escapeHtml(code)}</div>
    </div>
  `;
  feedback.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
  `;
  document.head.appendChild(style);

  document.body.appendChild(feedback);

  setTimeout(() => {
    if (feedback.parentNode) feedback.remove();
  }, 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 停止扫描
 */
function stopScanner() {
  if (quaggaInstance) {
    try {
      quaggaInstance.stop();
      quaggaInstance = null;
      lastDetectedCode = null;
    } catch (e) {
      console.error('停止扫描失败:', e);
    }
  }
}

/**
 * 检查摄像头权限
 */
async function checkCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (e) {
    return false;
  }
}

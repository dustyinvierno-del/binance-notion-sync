// api/balance-sync.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = {
      success: true,
      message: '잔고 동기화 API가 정상 작동 중입니다!',
      timestamp: new Date().toISOString(),
      data: {
        totalBalance: '테스트 중...',
        lastSync: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Balance API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

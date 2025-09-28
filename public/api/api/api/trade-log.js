// api/trade-log.js
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
      message: '거래 로그 API가 정상 작동 중입니다!',
      timestamp: new Date().toISOString(),
      data: {
        recentTrades: '테스트 중...',
        totalTrades: 0
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Trade Log API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// api/binance-sync.js
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 환경변수 확인
    const binanceApiKey = process.env.BINANCE_API_KEY;
    const binanceSecretKey = process.env.BINANCE_SECRET_KEY;
    const notionToken = process.env.NOTION_TOKEN;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!binanceApiKey || !binanceSecretKey || !notionToken || !notionDatabaseId) {
      return res.status(400).json({
        success: false,
        error: '환경변수가 설정되지 않았습니다.',
        missing: {
          binanceApiKey: !binanceApiKey,
          binanceSecretKey: !binanceSecretKey,
          notionToken: !notionToken,
          notionDatabaseId: !notionDatabaseId
        }
      });
    }

    // 현재는 테스트 응답
    const response = {
      success: true,
      message: '바이낸스 동기화 API가 정상 작동 중입니다!',
      timestamp: new Date().toISOString(),
      config: {
        binanceApiConfigured: !!binanceApiKey,
        notionConfigured: !!notionToken,
        databaseConfigured: !!notionDatabaseId
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

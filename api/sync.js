import axios from "axios";
import crypto from "crypto";

// 환경변수에서 읽어오기
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const TRADES_DB_ID = process.env.NOTION_TRADES_DB_ID;
const BALANCE_DB_ID = process.env.NOTION_BALANCE_DB_ID;

// 노션 API 설정
const notion = axios.create({
  baseURL: "https://api.notion.com/v1",
  headers: {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
  }
});

// 바이낸스 API 서명 함수
function sign(query) {
  return crypto.createHmac("sha256", BINANCE_API_SECRET).update(query).digest("hex");
}

// 바이낸스 API 호출 함수
async function binanceGet(path, params = {}) {
  try {
    const ts = Date.now();
    const query = new URLSearchParams({ timestamp: ts.toString(), ...params }).toString();
    const signature = sign(query);
    const url = `https://fapi.binance.com${path}?${query}&signature=${signature}`;
    
    const res = await axios.get(url, { 
      headers: { "X-MBX-APIKEY": BINANCE_API_KEY } 
    });
    return res.data;
  } catch (error) {
    console.error(`바이낸스 API 에러: ${error.message}`);
    throw error;
  }
}

// UTC를 KST로 변환
function toKST(utcMs) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(utcMs + kstOffsetMs).toISOString();
}

// 거래 데이터를 노션 형식으로 변환
function mapTradeToNotionProps(trade) {
  const symbol = trade.symbol || "UNKNOWN";
  const closeTime = trade.time || Date.now();
  const realized = Number(trade.income || 0);
  const side = realized >= 0 ? "Long" : "Short";

  return {
    "티커": { title: [{ text: { content: symbol } }] },
    "체결 시간": { date: { start: toKST(closeTime) } },
    "포지션": { select: { name: side } },
    "수량": { number: Number(trade.qty || 0) },
    "진입가": { number: null },
    "청산가": { number: null },
    "실현손익": { number: realized },
    "수익률%": { number: null },
    "결과": { select: { name: realized > 0 ? "Win" : realized < 0 ? "Loss" : "BE" } },
    "거래소": { multi_select: [{ name: "Binance" }] },
    "전략": { select: { name: "Other" } },
    "수수료": { number: null },
    "레버리지": { number: null },
    "실거래": { checkbox: true },
    "메모": { rich_text: [{ text: { content: "API 자동 수집" } }] },
    "수수료율%": { number: 0.1 }
  };
}

// 거래 데이터 업서트
async function upsertTrade(pageProps, uniqueKey) {
  try {
    const search = await notion.post(`/databases/${TRADES_DB_ID}/query`, {
      filter: {
        property: "메모",
        rich_text: { contains: uniqueKey }
      }
    });

    if (search.data.results.length > 0) {
      const pageId = search.data.results[0].id;
      await notion.patch(`/pages/${pageId}`, { properties: pageProps });
      console.log(`거래 업데이트: ${uniqueKey}`);
    } else {
      pageProps["메모"].rich_text[0].text.content += ` [${uniqueKey}]`;
      await notion.post("/pages", {
        parent: { database_id: TRADES_DB_ID },
        properties: pageProps
      });
      console.log(`새 거래 추가: ${uniqueKey}`);
    }
  } catch (error) {
    console.error(`거래 업서트 에러: ${error.message}`);
  }
}

// 잔고 업데이트
async function updateBalance(usdt) {
  try {
    const now = new Date();
    const dateISO = now.toISOString();
    
    const props = {
      "자산명": { title: [{ text: { content: "Binance USDT" } }] },
      "통화": { select: { name: "USDT" } },
      "현재 잔고": { number: usdt },
      "기준일": { date: { start: dateISO } },
      "메모": { rich_text: [{ text: { content: "자동 스냅샷" } }] }
    };

    await notion.post("/pages", {
      parent: { database_id: BALANCE_DB_ID },
      properties: props
    });
    
    console.log(`잔고 업데이트: ${usdt} USDT`);
  } catch (error) {
    console.error(`잔고 업데이트 에러: ${error.message}`);
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log("🚀 바이낸스 → 노션 동기화 시작");

    const balances = await binanceGet("/fapi/v2/balance");
    const usdtBal = balances.find(b => b.asset === "USDT");
    const usdt = usdtBal ? Number(usdtBal.balance) : 0;
    await updateBalance(usdt);

    const income = await binanceGet("/fapi/v1/income", { 
      incomeType: "REALIZED_PNL",
      limit: 50 
    });

    for (const trade of income) {
      const props = mapTradeToNotionProps(trade);
      const uniqueKey = `${trade.symbol}-${trade.time}`;
      await upsertTrade(props, uniqueKey);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("✅ 동기화 완료!");
    
  } catch (error) {
    console.error("❌ 동기화 실패:", error.message);
  }
}

// Vercel Function으로 내보내기
export default async function handler(req, res) {
  try {
    await main();
    res.status(200).json({ message: "동기화 완료!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// api/generate-report.js

export default async function handler(request, response) {
  // 1. 사용자가 보낸 채팅 내용을 받습니다.
  const { messages } = await request.json();

  // 2. Vercel 서버의 안전한 금고에서 API 키를 꺼냅니다.
  //    이 키는 외부에는 절대 노출되지 않습니다.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다.' });
  }

  // 3. Google AI 서버에 보낼 요청 내용을 준비합니다.
  const prompt = `당신은 유능한 AI 퍼스널 트레이너 어시스턴트입니다. 다음은 회원과 코치 간의 PT 채팅 내용입니다. 이 대화를 분석하여 다음 JSON 형식에 맞춰서 내용을 요약하고 생성해주세요. 모든 답변은 한국어로 작성해주세요. 채팅 내용: --- ${messages} ---`;
  const schema = {
    type: "OBJECT",
    properties: {
      diagnosis: { type: "STRING", description: "현재 회원의 상태를 진단한 내용입니다." },
      solution: { type: "STRING", description: "진단에 따른 해결 방안입니다." },
      routine: { type: "ARRAY", items: { type: "STRING" }, description: "추천 운동 루틴 목록입니다. 각 항목은 '운동이름: 설명' 형식이어야 합니다." },
      diet: { type: "STRING", description: "추천 식단입니다." }
    },
    required: ["diagnosis", "solution", "routine", "diet"]
  };
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema }
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    // 4. Google AI 서버에 대신 요청을 보냅니다.
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`Google AI API 오류: ${errorText}`);
    }

    const result = await fetchResponse.json();
    
    // 5. 받은 결과를 다시 사용자에게 전달합니다.
    response.status(200).json(result);

  } catch (error) {
    console.error('서버 함수 오류:', error);
    response.status(500).json({ error: error.message });
  }
}

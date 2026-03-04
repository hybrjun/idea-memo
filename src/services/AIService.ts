import Anthropic from '@anthropic-ai/sdk';
import type { AISettings, AIStreamChunk, AISuggestion } from '../types/ai';
import type { Memo } from '../types/memo';
import type { Tag } from '../types/tag';
import { MAX_SUGGESTION_CANDIDATES } from '../constants/ai';

class AIServiceClass {
  private getClient(apiKey: string): Anthropic {
    return new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  /** Anthropic APIエラーを日本語のわかりやすいメッセージに変換 */
  private parseAPIError(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);

    // JSONが含まれていれば中のmessageを抽出
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const body = JSON.parse(jsonMatch[0]);
        const apiMsg: string = body?.error?.message ?? '';
        if (apiMsg.includes('credit balance is too low') || apiMsg.includes('Plans & Billing')) {
          return 'クレジット残高が不足しています。Anthropicの管理画面でクレジットを追加してください。';
        }
        if (apiMsg.includes('invalid x-api-key') || apiMsg.includes('authentication')) {
          return 'APIキーが無効です。設定画面で正しいAPIキーを入力してください。';
        }
        if (apiMsg) return `APIエラー: ${apiMsg}`;
      } catch {
        // JSONパース失敗は無視してフォールバック
      }
    }

    if (raw.includes('401')) return 'APIキーが無効または期限切れです。設定画面を確認してください。';
    if (raw.includes('429')) return 'リクエストが多すぎます。しばらく待ってから再試行してください。';
    if (raw.includes('529') || raw.includes('overloaded')) return 'APIが混み合っています。しばらく待ってから再試行してください。';
    if (raw.includes('fetch') || raw.includes('network')) return 'ネットワークエラーが発生しました。接続を確認してください。';

    return `AI接続エラー: ${raw}`;
  }

  async* suggestConnections(
    newMemo: Memo,
    candidateMemos: Memo[],
    settings: AISettings
  ): AsyncGenerator<AIStreamChunk> {
    if (!settings.enabled || !settings.apiKey) {
      yield { type: 'done' };
      return;
    }

    const client = this.getClient(settings.apiKey);
    const candidates = candidateMemos.slice(0, MAX_SUGGESTION_CANDIDATES);
    const prompt = this.buildConnectionPrompt(newMemo, candidates);

    try {
      const stream = client.messages.stream({
        model: settings.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'text', text: event.delta.text };
        }
      }
      yield { type: 'done' };
    } catch (e) {
      yield { type: 'error', error: this.parseAPIError(e) };
    }
  }

  async summarizeTheme(memos: Memo[], settings: AISettings): Promise<string> {
    if (!settings.enabled || !settings.apiKey || memos.length === 0) return '';

    const client = this.getClient(settings.apiKey);
    const prompt = this.buildThemeSummaryPrompt(memos);

    try {
      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (e) {
      throw new Error(this.parseAPIError(e));
    }
  }

  /**
   * 抽出済みキーワードを既存タグと照合し、同義語・類義語を自動で正規化する。
   * APIキー未設定またはエラー時はキーワードをそのまま返す。
   */
  async normalizeKeywords(
    keywords: string[],
    existingTags: Tag[],
    settings: AISettings
  ): Promise<string[]> {
    if (!settings.enabled || !settings.apiKey || keywords.length === 0) {
      return keywords;
    }

    // 既存タグがなければ正規化不要
    if (existingTags.length === 0) return keywords;

    // 既存タグのテキスト一覧（重複除去）
    const existingTexts = [...new Set(existingTags.map((t) => t.text))];

    const prompt = `以下の「新しいキーワード」を「既存タグ」と照合し、同義語・類義語・表記ゆれがあれば既存タグの表記に統一してください。

既存タグ: ${existingTexts.join('、')}

新しいキーワード: ${keywords.join('、')}

ルール:
- 同じ意味・概念なら既存タグの表記を使う（例: 記録→メモ、アプリケーション→アプリ）
- 既存タグに近いものがなければ新しいキーワードをそのまま使う
- 出力は必ずJSON形式のみ（説明文不要）

{"result": ["正規化後のキーワード1", "正規化後のキーワード2", ...]}`;

    try {
      const client = this.getClient(settings.apiKey);
      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return keywords;

      const parsed = JSON.parse(match[0]);
      const result = parsed.result;
      if (Array.isArray(result) && result.every((v) => typeof v === 'string')) {
        return [...new Set(result as string[])];
      }
      return keywords;
    } catch (e) {
      console.warn('[AIService] タグ正規化スキップ:', this.parseAPIError(e));
      return keywords; // エラー時はそのまま使う
    }
  }

  parseSuggestions(jsonText: string): AISuggestion[] {
    try {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      return (parsed.suggestions ?? []) as AISuggestion[];
    } catch {
      return [];
    }
  }

  private buildConnectionPrompt(newMemo: Memo, candidates: Memo[]): string {
    const candidateList = candidates
      .map((m, i) => `[${i + 1}] ID:${m.id}\nアイデア: ${m.idea}\n問題・きっかけ: ${m.trigger || 'なし'}`)
      .join('\n\n');

    return `あなたはアイデア管理の専門家です。新しいアイデアと過去のアイデアの間に有益なつながりを見つけてください。

## 新しいアイデア
アイデア: ${newMemo.idea}
問題・きっかけ: ${newMemo.trigger || 'なし'}

## 過去のアイデア候補
${candidateList}

## タスク
上記の過去のアイデアの中から、新しいアイデアと強く関連するものを最大3件選び、なぜ関連するかを簡潔に日本語で説明してください。

以下のJSON形式で回答してください:
{
  "suggestions": [
    { "memoId": "...", "reasoning": "関連理由を1〜2文で", "score": 0.0〜1.0 }
  ]
}`;
  }

  private buildThemeSummaryPrompt(memos: Memo[]): string {
    const memoList = memos
      .map((m) => `- ${m.idea}（きっかけ: ${m.trigger || 'なし'}）`)
      .join('\n');

    return `以下の関連アイデアに共通するテーマや本質的な課題を、3〜5文の日本語で要約してください。

## アイデア一覧
${memoList}

要約は「これらのアイデアに共通するのは...」で始めてください。`;
  }
}

export const aiService = new AIServiceClass();

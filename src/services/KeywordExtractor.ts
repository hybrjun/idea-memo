import kuromoji from 'kuromoji';
import { KUROMOJI_DICT_PATH, STOP_WORDS } from '../constants/kuromoji';

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

// 名詞の中で保持するサブカテゴリ
const ALLOWED_NOUN_TYPES = new Set(['一般', '固有名詞', 'サ変接続', '形容動詞語幹']);

function isUsefulToken(token: kuromoji.IpadicFeatures): boolean {
  const pos = token.pos;
  const detail1 = token.pos_detail_1;

  if (pos === '名詞') {
    // 一般名詞・固有名詞・サ変接続（記録・管理など）・形容動詞語幹のみ
    // 非自立（中・こと・もの）・代名詞・数・接尾などを除外
    if (!ALLOWED_NOUN_TYPES.has(detail1)) return false;
  } else if (pos === '動詞') {
    // 非自立動詞（いる・ある・くる・ちゃう）を除外
    if (detail1 !== '自立') return false;
  } else {
    // 名詞・動詞以外はすべて除外
    // 形容詞（欲しい・多い・良い）は感情表現が多くタグ向きでない
    return false;
  }

  // 1文字語を除外（ほぼノイズ）
  if (token.surface_form.length < 2) return false;

  // 数字のみを除外
  if (/^\d+$/.test(token.surface_form)) return false;

  // ストップワードを除外（basic_form で正規化して比較）
  const form = token.basic_form && token.basic_form !== '*'
    ? token.basic_form
    : token.surface_form;
  if (STOP_WORDS.has(form)) return false;

  return true;
}

class KeywordExtractorService {
  private tokenizer: Tokenizer | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.tokenizer) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: KUROMOJI_DICT_PATH }).build((err, tokenizer) => {
        if (err) reject(err);
        else {
          this.tokenizer = tokenizer;
          resolve();
        }
      });
    });
    return this.initPromise;
  }

  async extract(text: string, maxKeywords = 10): Promise<string[]> {
    if (!text.trim()) return [];
    await this.ensureInitialized();
    if (!this.tokenizer) return [];

    const tokens = this.tokenizer.tokenize(text);

    const freq = new Map<string, number>();
    for (const token of tokens) {
      if (!isUsefulToken(token)) continue;

      // 動詞は基本形に正規化（走った→走る）
      const word = token.pos === '動詞' && token.basic_form && token.basic_form !== '*'
        ? token.basic_form
        : token.surface_form;

      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  async extractFromMemo(idea: string, trigger: string): Promise<string[]> {
    const combined = [idea, trigger].filter(Boolean).join('。');
    return this.extract(combined);
  }

  get isInitialized(): boolean {
    return this.tokenizer !== null;
  }
}

export const keywordExtractor = new KeywordExtractorService();

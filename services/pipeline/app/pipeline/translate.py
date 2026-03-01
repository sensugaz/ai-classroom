"""NLLB-200 translation — multilingual, high-quality, 200+ languages."""

import logging

logger = logging.getLogger(__name__)

# NLLB-200 uses BCP-47 style language codes
_LANG_TO_NLLB = {
    "th": "tha_Thai",
    "en": "eng_Latn",
    "zh": "zho_Hans",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "es": "spa_Latn",
    "fr": "fra_Latn",
    "de": "deu_Latn",
    "vi": "vie_Latn",
    "id": "ind_Latn",
    "ms": "msa_Latn",
    "my": "mya_Mymr",
    "lo": "lao_Laoo",
    "km": "khm_Khmr",
}


class TranslateProcessor:
    def __init__(self, model_name: str = "facebook/nllb-200-distilled-600M", device: str = "cuda"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.tokenizer = None

    def load(self):
        """Load NLLB-200 model."""
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        import torch

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        ).to(self.device)
        self.model.eval()
        logger.info("NLLB-200 %s loaded on %s", self.model_name, self.device)

    def translate(self, text: str, source_lang: str = "th", target_lang: str = "en") -> str:
        """Translate between any supported language pair."""
        if not text.strip():
            return ""

        if self.model is None:
            raise RuntimeError("Translation model not loaded")

        # Skip if same language
        if source_lang == target_lang:
            return text

        src_code = _LANG_TO_NLLB.get(source_lang)
        tgt_code = _LANG_TO_NLLB.get(target_lang)
        if not src_code or not tgt_code:
            logger.error("Unsupported language pair: %s → %s", source_lang, target_lang)
            return text

        import torch

        # Set source language for tokenizer
        self.tokenizer.src_lang = src_code
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True).to(self.device)

        # Get target language token id
        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_code)

        # Limit output proportional to input
        input_len = inputs["input_ids"].shape[1]
        max_tokens = max(20, int(input_len * 3))

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                num_beams=4,
                max_new_tokens=max_tokens,
                repetition_penalty=1.2,
                no_repeat_ngram_size=3,
                length_penalty=0.8,
            )

        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.debug("Translate [%s→%s]: %s → %s", source_lang, target_lang, text, result)
        return result

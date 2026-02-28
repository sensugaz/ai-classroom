"""Translation processor — Google Translate (primary) with NLLB-200 fallback."""

import logging

logger = logging.getLogger(__name__)


class TranslateProcessor:
    def __init__(self, model_name: str = "facebook/nllb-200-distilled-600M", device: str = "cuda"):
        self.model_name = model_name
        self.device = device
        self._google = None
        self._nllb_model = None
        self._nllb_tokenizer = None
        self._use_google = True

    def load(self):
        """Load Google Translate (primary) + NLLB-200 fallback."""
        # Try Google Translate first
        try:
            from deep_translator import GoogleTranslator
            # Quick test
            result = GoogleTranslator(source="th", target="en").translate("สวัสดี")
            if result:
                self._use_google = True
                logger.info("✅ Translate: Google Translate connected")
            else:
                raise RuntimeError("Empty result")
        except Exception as e:
            logger.warning("⚠️ Google Translate unavailable (%s), loading NLLB-200 fallback...", e)
            self._use_google = False
            self._load_nllb()

    def _load_nllb(self):
        """Load NLLB-200 as fallback."""
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        import torch

        self._nllb_tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self._nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        ).to(self.device)
        self._nllb_model.eval()
        logger.info("✅ Translate: NLLB-200 %s loaded on %s (fallback)", self.model_name, self.device)

    def translate(self, text: str, source_lang: str = "th", target_lang: str = "en") -> str:
        """Translate between any supported language pair."""
        if not text.strip():
            return ""
        if source_lang == target_lang:
            return text

        if self._use_google:
            return self._translate_google(text, source_lang, target_lang)
        else:
            return self._translate_nllb(text, source_lang, target_lang)

    def _translate_google(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate using Google Translate."""
        try:
            from deep_translator import GoogleTranslator
            result = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
            logger.debug("Translate [Google %s→%s]: %s → %s", source_lang, target_lang, text, result)
            return result or text
        except Exception as e:
            logger.error("Google Translate error: %s, trying NLLB fallback", e)
            # Load NLLB on-demand if not loaded
            if self._nllb_model is None:
                self._load_nllb()
            return self._translate_nllb(text, source_lang, target_lang)

    # NLLB language codes
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
    }

    def _translate_nllb(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate using NLLB-200 (fallback)."""
        if self._nllb_model is None:
            raise RuntimeError("No translation model available")

        src_code = self._LANG_TO_NLLB.get(source_lang)
        tgt_code = self._LANG_TO_NLLB.get(target_lang)
        if not src_code or not tgt_code:
            logger.error("Unsupported language pair: %s → %s", source_lang, target_lang)
            return text

        import torch

        self._nllb_tokenizer.src_lang = src_code
        inputs = self._nllb_tokenizer(text, return_tensors="pt", padding=True, truncation=True).to(self.device)
        tgt_lang_id = self._nllb_tokenizer.convert_tokens_to_ids(tgt_code)
        input_len = inputs["input_ids"].shape[1]
        max_tokens = max(20, int(input_len * 3))

        with torch.no_grad():
            outputs = self._nllb_model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                num_beams=4,
                max_new_tokens=max_tokens,
                repetition_penalty=1.2,
                no_repeat_ngram_size=3,
                length_penalty=0.8,
            )

        result = self._nllb_tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.debug("Translate [NLLB %s→%s]: %s → %s", source_lang, target_lang, text, result)
        return result

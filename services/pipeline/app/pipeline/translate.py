"""NLLB-200 translation - runs on GPU (~200ms)."""

import logging

logger = logging.getLogger(__name__)

# NLLB language code mapping
LANG_CODES = {
    "th": "tha_Thai",
    "en": "eng_Latn",
    "zh": "zho_Hans",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "vi": "vie_Latn",
    "my": "mya_Mymr",
    "lo": "lao_Laoo",
    "km": "khm_Khmr",
    "es": "spa_Latn",
    "fr": "fra_Latn",
}


class TranslateProcessor:
    def __init__(self, model_name: str = "facebook/nllb-200-3.3B", device: str = "cuda"):
        self.model_name = model_name
        self.device = device
        self.translator = None
        self.tokenizer = None

    def load(self):
        """Load NLLB model via CTranslate2 for optimized inference."""
        try:
            import ctranslate2
            from transformers import AutoTokenizer

            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            # Try CTranslate2 converted model first
            ct2_model_path = self.model_name.replace("/", "--") + "-ct2"
            try:
                self.translator = ctranslate2.Translator(
                    ct2_model_path,
                    device=self.device,
                    compute_type="float16" if self.device == "cuda" else "int8",
                )
                logger.info("NLLB loaded via CTranslate2 on %s", self.device)
            except Exception:
                # Fall back to transformers pipeline
                self._load_transformers()
        except Exception:
            self._load_transformers()

    def _load_transformers(self):
        """Fallback: load via transformers."""
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        import torch

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        device_map = self.device if self.device == "cuda" else "cpu"
        self._hf_model = AutoModelForSeq2SeqLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        ).to(device_map)
        self.translator = None  # Mark as using HF fallback
        logger.info("NLLB loaded via transformers on %s", self.device)

    def translate(self, text: str, source_lang: str = "th", target_lang: str = "en") -> str:
        """Translate text between languages."""
        if not text.strip():
            return ""

        src_code = LANG_CODES.get(source_lang, f"{source_lang}_Latn")
        tgt_code = LANG_CODES.get(target_lang, f"{target_lang}_Latn")

        # Use actual tokenizer to count input tokens (accurate for Thai/CJK)
        self.tokenizer.src_lang = src_code
        input_ids = self.tokenizer(text, return_tensors=None)["input_ids"]
        input_token_count = len(input_ids)
        # Output should be at most 2x input tokens, minimum 6
        self._max_length = max(input_token_count * 2, 6)
        logger.debug("Input: %r (%d tokens) → max_length=%d", text, input_token_count, self._max_length)

        if self.translator is not None:
            result = self._translate_ct2(text, src_code, tgt_code)
        else:
            result = self._translate_hf(text, src_code, tgt_code)

        # Post-process: detect and truncate hallucination
        result = self._remove_repetition(result)
        # Trim: output words should not exceed 2x input tokens
        result = self._trim_excess(result, input_token_count)
        return result

    @staticmethod
    def _remove_repetition(text: str) -> str:
        """Remove repeated phrases that indicate hallucination."""
        words = text.split()
        if len(words) <= 4:
            return text

        # Check for repeated n-grams (2-5 words)
        for n in range(2, 6):
            if len(words) < n * 2:
                continue
            for i in range(len(words) - n):
                phrase = words[i:i + n]
                # Count how many times this phrase repeats consecutively
                repeats = 1
                j = i + n
                while j + n <= len(words) and words[j:j + n] == phrase:
                    repeats += 1
                    j += n
                if repeats >= 3:
                    # Hallucination detected — keep only first occurrence
                    logger.warning("Hallucination detected: '%s' repeated %dx, truncating",
                                   " ".join(phrase), repeats)
                    return " ".join(words[:i + n])
        return text

    @staticmethod
    def _trim_excess(text: str, input_token_count: int) -> str:
        """Trim output if it's way longer than expected (sign of hallucination)."""
        words = text.split()
        max_words = max(input_token_count * 2, 5)
        if len(words) > max_words:
            # Cut at last sentence boundary within limit
            trimmed = " ".join(words[:max_words])
            for sep in [".", "!", "?"]:
                idx = trimmed.rfind(sep)
                if idx > len(trimmed) // 3:
                    return trimmed[:idx + 1]
            return trimmed
        return text

    def _translate_ct2(self, text: str, src_code: str, tgt_code: str) -> str:
        """Translate using CTranslate2."""
        self.tokenizer.src_lang = src_code
        tokens = self.tokenizer(text, return_tensors=None)["input_ids"]
        token_strs = self.tokenizer.convert_ids_to_tokens(tokens)

        results = self.translator.translate_batch(
            [token_strs],
            target_prefix=[[tgt_code]],
            beam_size=2,
            max_decoding_length=min(self._max_length, 64),
            repetition_penalty=1.5,
        )

        output_tokens = results[0].hypotheses[0][1:]  # Skip target lang token
        result = self.tokenizer.decode(
            self.tokenizer.convert_tokens_to_ids(output_tokens),
            skip_special_tokens=True,
        )
        logger.debug("Translate [%s→%s]: %s → %s", src_code, tgt_code, text, result)
        return result

    def _translate_hf(self, text: str, src_code: str, tgt_code: str) -> str:
        """Translate using HuggingFace transformers."""
        import torch

        self.tokenizer.src_lang = src_code
        inputs = self.tokenizer(text, return_tensors="pt").to(self._hf_model.device)

        tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_code)
        with torch.no_grad():
            outputs = self._hf_model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_new_tokens=min(self._max_length, 64),
                num_beams=2,
                repetition_penalty=1.5,
                no_repeat_ngram_size=3,
            )

        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.debug("Translate [%s→%s]: %s → %s", src_code, tgt_code, text, result)
        return result
